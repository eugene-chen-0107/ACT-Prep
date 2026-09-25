import 'server-only';
import { Resend } from 'resend';

let resend: Resend | undefined;

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is required to send password reset emails.');
  resend ??= new Resend(apiKey);
  return resend;
}

async function sendAccountEmail({ to, name, url, subject, action, description }: { to: string; name: string; url: string; subject: string; action: string; description: string }) {
  const from = process.env.AUTH_EMAIL_FROM;
  if (!from) throw new Error('AUTH_EMAIL_FROM must be configured with a verified sending address.');

  const safeName = name.replace(/[<>"'&]/g, '');
  const safeUrl = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const { error } = await getResend().emails.send({
    from,
    to: [to],
    subject,
    text: `Hi ${safeName},\n\n${description}\n${url}\n\nIf you did not request this, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#183a31"><p>Hi ${safeName},</p><p>${description}</p><p><a href="${safeUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#183a31;color:#fff;text-decoration:none">${action}</a></p><p style="font-size:13px;color:#68766d">If you did not request this, you can ignore this email.</p></div>`,
  });
  if (error) throw new Error(`Account email delivery failed (${error.name}).`);
}

export async function sendPasswordResetEmail({ to, name, url }: { to: string; name: string; url: string }) {
  if (process.env.NODE_ENV === 'test') {
    const { captureAuthEmail } = await import('./auth-email-test');
    captureAuthEmail({ kind: 'password-reset', to, url });
    return;
  }
  return sendAccountEmail({ to, name, url, subject: 'Reset your Northstar ACT password', action: 'Reset password', description: 'Use this one-time link to reset your Northstar ACT password. It expires in one hour.' });
}

export async function sendVerificationEmail({ to, name, url }: { to: string; name: string; url: string }) {
  if (process.env.NODE_ENV === 'test') {
    const { captureAuthEmail } = await import('./auth-email-test');
    captureAuthEmail({ kind: 'verification', to, url });
    return;
  }
  return sendAccountEmail({ to, name, url, subject: 'Verify your Northstar ACT email', action: 'Verify email address', description: 'Verify your email address to secure your Northstar ACT account. This link expires in one hour.' });
}
