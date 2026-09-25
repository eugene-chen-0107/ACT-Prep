import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { getAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) redirect(`/login?next=${encodeURIComponent('/dashboard')}`);
  return <AppShell student={{ name: session.user.name, email: session.user.email }}>{children}</AppShell>;
}
