import Link from 'next/link';
import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/auth-forms';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Reset your password — Northstar ACT',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const params = await searchParams;
  const invalidToken = Boolean(params.error && params.error.toUpperCase().includes('INVALID'));
  return <section className="auth-card"><span className="auth-kicker">SECURE PASSWORD RESET</span><h1>Choose a new<br />password.</h1><p className="auth-intro">Use at least 12 characters. Reset links are single-use and expire automatically.</p><ResetPasswordForm token={params.token} invalidToken={invalidToken} /><p className="auth-switch"><Link href="/login">Back to login</Link></p></section>;
}
