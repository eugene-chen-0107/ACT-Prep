import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (testDatabaseUrl) process.env.DATABASE_URL = testDatabaseUrl;
const hasDatabase = Boolean(testDatabaseUrl && process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_SECRET.length >= 32);
process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';
process.env.BETTER_AUTH_SECRET ??= 'northstar-test-secret-not-for-production-0123456789';

let auth: Awaited<ReturnType<typeof import('../src/lib/auth').getAuth>>;
let clearAuthEmails: typeof import('../src/lib/auth-email-test').clearAuthEmails;
let takeAuthEmail: typeof import('../src/lib/auth-email-test').takeAuthEmail;
const origin = process.env.BETTER_AUTH_URL!;
const testEmail = `northstar-auth-${Date.now()}@example.test`;
const initialPassword = 'Initial-test-password-928!';
const resetPassword = 'Replacement-test-password-374!';

async function request(path: string, init: RequestInit = {}) {
  assert.ok(auth, 'auth is initialized only for configured database tests');
  return auth.handler(new Request(new URL(`/api/auth${path}`, origin), {
    ...init,
    headers: {
      origin,
      'content-type': 'application/json',
      ...init.headers,
    },
  }));
}

function sessionCookie(response: Response) {
  const headersWithCookies = response.headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = headersWithCookies.getSetCookie?.() ?? [response.headers.get('set-cookie') ?? ''];
  return setCookies.map((value) => value.split(';')[0]).filter((value) => /(?:^|[.-])session_token=/.test(value)).join('; ');
}

describe('Better Auth email/password integration', { skip: !hasDatabase }, () => {
  before(async () => {
    const authModule = await import('../src/lib/auth');
    const emailTestModule = await import('../src/lib/auth-email-test');
    auth = authModule.getAuth();
    clearAuthEmails = emailTestModule.clearAuthEmails;
    takeAuthEmail = emailTestModule.takeAuthEmail;
    clearAuthEmails();
  });
  after(async () => {
    clearAuthEmails();
    const { closeDb } = await import('../src/db');
    await closeDb();
  });

  it('creates unique accounts, verifies email, logs in/out, protects session data, rejects bad credentials, and resets password once', async () => {
    const anonymousSession = await auth.api.getSession({ headers: new Headers() });
    assert.equal(anonymousSession, null, 'anonymous requests have no authenticated session');

    const signup = await request('/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({ name: 'ACT Student', email: testEmail.toUpperCase(), password: initialPassword }),
    });
    assert.equal(signup.status, 200, await signup.clone().text());
    const verificationEmail = takeAuthEmail('verification', testEmail);
    assert.ok(verificationEmail, 'sign-up sends a verification email');
    const verificationUrl = new URL(verificationEmail.url);
    const verificationToken = verificationUrl.searchParams.get('token');
    assert.ok(verificationToken, 'verification link contains a one-time token');
    const verification = await auth.handler(new Request(verificationUrl, { headers: { origin } }));
    assert.ok([302, 303, 307].includes(verification.status), 'verification link redirects after verifying');

    const duplicate = await request('/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({ name: 'Duplicate', email: testEmail.toLowerCase(), password: initialPassword }),
    });
    assert.equal(duplicate.status, 200, 'duplicate signup uses the enumeration-safe response');
    assert.equal(sessionCookie(duplicate), '', 'duplicate signup does not create a session');
    const [{ getDb }, { user }, { sql }] = await Promise.all([
      import('../src/db'),
      import('../src/db/schema'),
      import('drizzle-orm'),
    ]);
    const matchingUsers = await getDb().select({ id: user.id }).from(user)
      .where(sql`lower(${user.email}) = ${testEmail}`);
    assert.equal(matchingUsers.length, 1, 'email uniqueness prevents a second account');

    const invalidLogin = await request('/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, password: 'incorrect-password-000' }),
    });
    assert.ok(invalidLogin.status >= 400, 'invalid credentials are rejected');

    const login = await request('/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, password: initialPassword }),
    });
    assert.equal(login.status, 200, await login.clone().text());
    const cookie = sessionCookie(login);
    assert.ok(cookie, 'login creates a session cookie');

    const session = await request('/get-session', { headers: { cookie } });
    assert.equal(session.status, 200);
    const sessionBody = await session.json() as { user?: { email?: string } };
    assert.equal(sessionBody.user?.email, testEmail);

    const loggedOut = await request('/sign-out', { method: 'POST', headers: { cookie }, body: '{}' });
    assert.equal(loggedOut.status, 200, await loggedOut.clone().text());
    const afterLogout = await request('/get-session', { headers: { cookie } });
    assert.equal(await afterLogout.json(), null, 'logout revokes the database session');

    const resetRequest = await request('/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, redirectTo: `${origin}/reset-password` }),
    });
    assert.equal(resetRequest.status, 200, await resetRequest.clone().text());
    const resetEmail = takeAuthEmail('password-reset', testEmail);
    assert.ok(resetEmail, 'password reset sends email');
    const resetUrl = new URL(resetEmail.url);
    const resetPathParts = resetUrl.pathname.split('/').filter(Boolean);
    const resetToken = resetPathParts[resetPathParts.length - 1];
    assert.ok(resetToken, 'password reset link contains a token in its path');
    const resetPageUrl = new URL(resetUrl.searchParams.get('callbackURL') ?? `${origin}/reset-password`);
    resetPageUrl.searchParams.set('token', resetToken);
    assert.equal(resetPageUrl.origin, new URL(origin).origin, 'password reset callback stays on the trusted origin');
    assert.equal(resetPageUrl.pathname, '/reset-password');
    assert.equal(resetPageUrl.searchParams.get('token'), resetToken);

    const reset = await request('/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: resetToken, newPassword: resetPassword }),
    });
    assert.equal(reset.status, 200, await reset.clone().text());

    const replay = await request('/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: resetToken, newPassword: 'Another-password-839!' }),
    });
    assert.ok(replay.status >= 400, 'reset token cannot be reused');

    const oldPasswordLogin = await request('/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, password: initialPassword }),
    });
    assert.ok(oldPasswordLogin.status >= 400, 'old password no longer works');

    const newPasswordLogin = await request('/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, password: resetPassword }),
    });
    assert.equal(newPasswordLogin.status, 200, await newPasswordLogin.clone().text());
    const newCookie = sessionCookie(newPasswordLogin);
    assert.ok(newCookie, 'new password creates a fresh session');
    await request('/sign-out', { method: 'POST', headers: { cookie: newCookie }, body: '{}' });
  });
});
