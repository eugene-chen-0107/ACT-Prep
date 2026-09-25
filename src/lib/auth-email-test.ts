import 'server-only';

export type CapturedAuthEmail = { kind: 'verification' | 'password-reset'; to: string; url: string };
const capturedEmails: CapturedAuthEmail[] = [];

export function captureAuthEmail(email: CapturedAuthEmail) {
  capturedEmails.push(email);
}

export function takeAuthEmail(kind: CapturedAuthEmail['kind'], to: string) {
  const index = capturedEmails.findIndex((email) => email.kind === kind && email.to === to);
  if (index < 0) return undefined;
  return capturedEmails.splice(index, 1)[0];
}

export function clearAuthEmails() {
  capturedEmails.length = 0;
}
