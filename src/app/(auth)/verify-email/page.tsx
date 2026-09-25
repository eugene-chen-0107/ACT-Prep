import Link from 'next/link';
import { VerifyEmailForm } from '@/components/auth-forms';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (session?.user) redirect('/dashboard');
  const { email = '' } = await searchParams;
  return <section className="auth-card"><span className="auth-kicker">ONE QUICK CHECK</span><h1>Check your<br />inbox.</h1><p className="auth-intro">Verify your email to finish creating your Northstar ACT account. The link expires in one hour.</p><VerifyEmailForm initialEmail={email} /><p className="auth-switch">Already verified? <Link href="/login">Log in</Link></p></section>;
}
