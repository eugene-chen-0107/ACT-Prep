import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getAuth } from '@/lib/auth';
import { SignUpForm } from '@/components/auth-forms';

export const dynamic = 'force-dynamic';

export default async function SignUpPage() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (session?.user) redirect('/dashboard');
  return <section className="auth-card"><span className="auth-kicker">YOUR NEXT CHAPTER</span><h1>Let’s make a<br />plan for progress.</h1><p className="auth-intro">Create your free account and make your practice count.</p><SignUpForm /><p className="auth-switch">Already have an account? <Link href="/login">Log in</Link></p></section>;
}
