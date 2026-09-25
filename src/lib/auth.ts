import 'server-only';
import { after } from 'next/server';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { getDb } from '@/db';
import * as schema from '@/db/schema';
import { sendPasswordResetEmail, sendVerificationEmail } from './auth-email';

let authInstance: ReturnType<typeof createAuth> | undefined;

function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('BETTER_AUTH_SECRET must be configured with a random value of at least 32 characters.');
  }

  const baseURL = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!baseURL) throw new Error('BETTER_AUTH_URL must be explicitly configured.');

  return betterAuth({
    appName: 'Northstar ACT',
    baseURL,
    secret,
    trustedOrigins: [baseURL],
    database: drizzleAdapter(getDb(), {
      provider: 'pg',
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      requireEmailVerification: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        // In a test, await the injected email adapter so the reset link can be asserted.
        if (process.env.NODE_ENV === 'test') {
          await sendPasswordResetEmail({ to: user.email, name: user.name, url });
          return;
        }
        // Avoid revealing account existence through reset-request response timing.
        // Next's after() keeps delivery alive after a serverless response completes.
        after(async () => {
          try {
            await sendPasswordResetEmail({ to: user.email, name: user.name, url });
          } catch (error) {
            console.error('Password reset email delivery failed.', error instanceof Error ? error.message : 'unknown error');
          }
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ user, url }) => {
        if (process.env.NODE_ENV === 'test') {
          await sendVerificationEmail({ to: user.email, name: user.name, url });
          return;
        }
        after(async () => {
          try {
            await sendVerificationEmail({ to: user.email, name: user.name, url });
          } catch (error) {
            console.error('Account verification email delivery failed.', error instanceof Error ? error.message : 'unknown error');
          }
        });
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (newUser) => ({ data: { ...newUser, email: newUser.email.trim().toLowerCase() } }),
        },
      },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      modelName: 'rateLimit',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 60, max: 3 },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === 'production',
      database: { generateId: 'uuid' },
    },
  });
}

export function getAuth() {
  authInstance ??= createAuth();
  return authInstance;
}
