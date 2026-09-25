'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, LogOut, Mail, UserRound } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

function FormNotice({ tone, children }: { tone: 'error' | 'success' | 'info'; children: React.ReactNode }) {
  return <div className={`auth-notice auth-notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>;
}

function PasswordField({ id, label = 'Password', autoComplete }: { id: string; label?: string; autoComplete: string }) {
  const [visible, setVisible] = useState(false);
  return <div className="auth-field"><label htmlFor={id}>{label}</label><span className="auth-input-wrap"><LockKeyhole size={15} /><input id={id} name={id} type={visible ? 'text' : 'password'} autoComplete={autoComplete} required minLength={12} maxLength={128} /><button type="button" className="auth-password-toggle" onClick={() => setVisible((value) => !value)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={15} /> : <Eye size={15} />}</button></span><small>Use at least 12 characters.</small></div>;
}

function AuthSubmit({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return <button className="auth-submit" type="submit" disabled={loading}>{loading ? <><LoaderCircle size={16} className="auth-spinner" /> Please wait…</> : <>{children}<ArrowRight size={15} /></>}</button>;
}

export function SignUpForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setLoading(true);
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const password = String(form.get('password') ?? '');
    const confirm = String(form.get('confirmPassword') ?? '');
    if (password !== confirm) { setError('Those passwords do not match.'); setLoading(false); return; }
    try {
      const result = await authClient.signUp.email({ name, email, password, callbackURL: '/dashboard' });
      if (result.error) setError('We could not create that account. Check your details or try signing in.');
      else setCreated(true);
    } catch { setError('We could not create your account right now. Please try again.'); }
    finally { setLoading(false); }
  }
  if (created) return <div className="auth-form"><FormNotice tone="success">Your account is ready. Verify your email to activate it and continue to your study space.</FormNotice><Link className="auth-submit auth-submit-link" href="/login">Continue to login <ArrowRight size={15} /></Link></div>;
  return <form className="auth-form" onSubmit={submit}>
    {error && <FormNotice tone="error">{error}</FormNotice>}
    <label className="auth-field" htmlFor="signup-name"><span>Your name</span><span className="auth-input-wrap"><UserRound size={15} /><input id="signup-name" name="name" type="text" autoComplete="name" minLength={2} maxLength={80} required /></span></label>
    <label className="auth-field" htmlFor="signup-email"><span>Email address</span><span className="auth-input-wrap"><Mail size={15} /><input id="signup-email" name="email" type="email" autoComplete="email" maxLength={254} required /></span></label>
    <PasswordField id="password" autoComplete="new-password" />
    <label className="auth-field" htmlFor="signup-confirmPassword"><span>Confirm password</span><span className="auth-input-wrap"><LockKeyhole size={15} /><input id="signup-confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></span></label>
    <AuthSubmit loading={loading}>Create account</AuthSubmit>
    <p className="auth-legal">By continuing, you agree to use Northstar ACT respectfully and keep your account secure.</p>
  </form>;
}

export function LoginForm({ nextPath = '/dashboard' }: { nextPath?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setLoading(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const password = String(form.get('password') ?? '');
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) setError('Email or password is incorrect, or your email is not verified. Check your inbox or try again.');
      else {
        const destination = new URL(nextPath, window.location.origin);
        router.replace(destination.origin === window.location.origin ? `${destination.pathname}${destination.search}${destination.hash}` : '/dashboard');
      }
    } catch { setError('We could not sign you in right now. Please try again.'); }
    finally { setLoading(false); }
  }
  return <form className="auth-form" onSubmit={submit}>
    {error && <FormNotice tone="error">{error}</FormNotice>}
    <label className="auth-field" htmlFor="login-email"><span>Email address</span><span className="auth-input-wrap"><Mail size={15} /><input id="login-email" name="email" type="email" autoComplete="email" maxLength={254} required /></span></label>
    <PasswordField id="password" autoComplete="current-password" />
    <div className="auth-forgot-row"><Link href="/forgot-password">Forgot password?</Link></div>
    <AuthSubmit loading={loading}>Log in</AuthSubmit>
  </form>;
}

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await authClient.requestPasswordReset({
        email: String(form.get('email') ?? '').trim().toLowerCase(),
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (result.error) setError('We could not process that request. Please try again shortly.');
      else setSent(true);
    } catch { setError('We could not process that request. Please try again shortly.'); }
    finally { setLoading(false); }
  }
  if (sent) return <div className="auth-form"><FormNotice tone="success">If an account matches that email, a password-reset link is on its way. Check your inbox and spam folder.</FormNotice><Link className="auth-submit auth-submit-link" href="/login"><ArrowLeft size={15} /> Back to login</Link></div>;
  return <form className="auth-form" onSubmit={submit}>
    {error && <FormNotice tone="error">{error}</FormNotice>}
    <label className="auth-field" htmlFor="reset-email"><span>Email address</span><span className="auth-input-wrap"><Mail size={15} /><input id="reset-email" name="email" type="email" autoComplete="email" maxLength={254} required /></span></label>
    <AuthSubmit loading={loading}>Send reset link</AuthSubmit>
  </form>;
}

export function VerifyEmailForm({ initialEmail = '' }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(''); setSent(false);
    try {
      const result = await authClient.sendVerificationEmail({ email: email.trim().toLowerCase(), callbackURL: '/dashboard' });
      if (result.error) setError('We could not send a verification email. Please try again later.');
      else setSent(true);
    } catch { setError('We could not send a verification email. Please try again later.'); }
    finally { setLoading(false); }
  }
  return <form className="auth-form" onSubmit={resend}>
    {sent && <FormNotice tone="success">If that account still needs verification, a new link is on its way.</FormNotice>}
    {error && <FormNotice tone="error">{error}</FormNotice>}
    <label className="auth-field" htmlFor="verification-email"><span>Email address</span><span className="auth-input-wrap"><Mail size={15} /><input id="verification-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required /></span></label>
    <AuthSubmit loading={loading}>Resend verification email</AuthSubmit>
  </form>;
}

export function ResetPasswordForm({ token, invalidToken = false }: { token?: string; invalidToken?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (!token) { setError('This reset link is missing or no longer valid. Request a new link to continue.'); return; }
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    const confirm = String(form.get('confirmPassword') ?? '');
    if (password !== confirm) { setError('Those passwords do not match.'); setLoading(false); return; }
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) setError('This reset link is invalid or expired. Request a new link to continue.');
      else setComplete(true);
    } catch { setError('This reset link is invalid or expired. Request a new link to continue.'); }
    finally { setLoading(false); }
  }
  if (complete) return <div className="auth-form"><FormNotice tone="success">Your password has been updated. You can now sign in with your new password.</FormNotice><button className="auth-submit" type="button" onClick={() => router.replace('/login')}>Continue to login <ArrowRight size={15} /></button></div>;
  return <form className="auth-form" onSubmit={submit}>
    {(error || invalidToken) && <FormNotice tone="error">{error || 'This reset link is invalid or expired. Request a new link to continue.'}</FormNotice>}
    {!invalidToken && <><PasswordField id="password" label="New password" autoComplete="new-password" /><label className="auth-field" htmlFor="reset-confirmPassword"><span>Confirm new password</span><span className="auth-input-wrap"><LockKeyhole size={15} /><input id="reset-confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></span></label><AuthSubmit loading={loading}>Update password</AuthSubmit></>}
    <p className="auth-foot-link"><Link href="/forgot-password">Request another reset link</Link></p>
  </form>;
}

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice(''); setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await authClient.updateUser({ name: String(form.get('name') ?? '').trim() });
      if (result.error) setError('Your profile could not be updated. Please try again.');
      else { setNotice('Your profile has been updated.'); window.location.reload(); }
    } catch { setError('Your profile could not be updated. Please try again.'); }
    finally { setLoading(false); }
  }
  return <form className="auth-form auth-profile-form" onSubmit={submit}>
    {error && <FormNotice tone="error">{error}</FormNotice>}{notice && <FormNotice tone="success">{notice}</FormNotice>}
    <label className="auth-field" htmlFor="profile-name"><span>Your name</span><span className="auth-input-wrap"><UserRound size={15} /><input id="profile-name" name="name" type="text" autoComplete="name" minLength={2} maxLength={80} defaultValue={name} required /></span></label>
    <label className="auth-field" htmlFor="profile-email"><span>Email address</span><span className="auth-input-wrap auth-input-readonly"><Mail size={15} /><input id="profile-email" type="email" value={email} readOnly aria-describedby="email-profile-hint" /></span><small id="email-profile-hint">Contact support to change your sign-in email.</small></label>
    <AuthSubmit loading={loading}>Save profile</AuthSubmit>
  </form>;
}

export function SignOutButton({ className = '', menuItem = false }: { className?: string; menuItem?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  async function signOut() {
    setLoading(true); setError(false);
    try {
      const result = await authClient.signOut();
      if (result.error) { setError(true); return; }
      router.replace('/login');
      router.refresh();
    } catch { setError(true); }
    finally { setLoading(false); }
  }
  return <button type="button" role={menuItem ? 'menuitem' : undefined} className={className} onClick={signOut} disabled={loading}>{loading ? <LoaderCircle size={15} className="auth-spinner" /> : <LogOut size={15} />} {loading ? 'Signing out…' : error ? 'Log out failed — retry' : 'Log out'}</button>;
}
