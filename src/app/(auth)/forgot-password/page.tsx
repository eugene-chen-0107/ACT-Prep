import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { ForgotPasswordForm } from '@/components/auth-forms';

export const dynamic = 'force-dynamic';

export default async function ForgotPasswordPage() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (session?.user) redirect('/profile');
  return <section className="auth-card"><span className="auth-kicker">ACCOUNT RECOVERY</span><h1>Let’s get you<br />back on track.</h1><p className="auth-intro">Enter your account email. If there’s an account for it, we’ll send a secure password-reset link.</p><ForgotPasswordForm /><p className="auth-switch"><Link href="/login">Back to login</Link></p></section>;
}
