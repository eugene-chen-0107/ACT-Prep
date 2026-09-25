import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getAuth } from '@/lib/auth';
import { Compass } from 'lucide-react';
import { LoginForm } from '@/components/auth-forms';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (session?.user) redirect('/dashboard');
  const { next } = await searchParams;
  const safeNext = next?.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
  return <section className="auth-card"><div className="auth-card-mark"><span className="auth-brand-mark"><Compass size={19} /></span></div><span className="auth-kicker">WELCOME BACK</span><h1>Pick up where<br />you left off.</h1><p className="auth-intro">Sign in to continue your ACT preparation.</p><LoginForm nextPath={safeNext} /><p className="auth-switch">New to Northstar? <Link href="/signup">Create an account</Link></p></section>;
}

