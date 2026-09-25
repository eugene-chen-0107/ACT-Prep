import 'server-only';

export function hasTrustedOrigin(request: Request) {
  const requestOrigin = request.headers.get('origin');
  const appUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!requestOrigin || !appUrl) return false;
  try {
    return new URL(requestOrigin).origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}
