'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui';

export default function LogoutPage() {
  const router = useRouter();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void authClient.signOut().then((result) => {
      if (active && result.error) setError(true);
      else if (active) { router.replace('/login'); router.refresh(); }
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [router, attempt]);

  return <section className="auth-card auth-logout-state" role="status">{error ? <><p>We couldn’t sign you out just yet.</p><Button type="button" onClick={() => { setError(false); setAttempt((value) => value + 1); }}>Try again</Button><Button type="button" variant="secondary" onClick={() => router.replace('/login')}>Back to login</Button></> : <><LoaderCircle size={20} className="auth-spinner" /><p>Signing you out securely…</p></>}</section>;
}
