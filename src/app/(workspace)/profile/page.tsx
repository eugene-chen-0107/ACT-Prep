import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { ProfileForm } from '@/components/auth-forms';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/login?next=%2Fprofile');
  return (
    <section className="profile-page">
      <span className="app-placeholder-kicker">ACCOUNT · PERSONAL INFORMATION</span>
      <h2>Your profile</h2>
      <p className="app-placeholder-lede">Manage the basic details connected to your Northstar ACT account.</p>
      <div className="profile-card">
        <div className="profile-card-heading"><span className="profile-avatar">{session.user.name.slice(0, 1).toUpperCase()}</span><div><h3>Profile details</h3><p>Only you can access this information.</p></div></div>
        <ProfileForm name={session.user.name} email={session.user.email} />
      </div>
    </section>
  );
}
