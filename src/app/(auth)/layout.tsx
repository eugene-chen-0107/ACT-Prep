import Link from 'next/link';
import { ArrowLeft, Compass, ShieldCheck } from 'lucide-react';

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="auth-page">
      <div className="auth-topbar"><Link href="/" className="auth-brand"><span className="auth-brand-mark"><Compass size={18} /></span><span>northstar<span>.act</span></span></Link><Link href="/" className="auth-back-link"><ArrowLeft size={14} /> Back to Northstar</Link></div>
      <div className="auth-content">{children}</div>
      <footer className="auth-footer"><ShieldCheck size={13} /><span>Your account and study data stay private.</span></footer>
    </main>
  );
}
