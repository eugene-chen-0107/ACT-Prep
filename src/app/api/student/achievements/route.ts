import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getAuth } from '@/lib/auth';
import { listMyAchievements } from '@/lib/student-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ achievements: await listMyAchievements() }, { headers: { 'Cache-Control': 'private, no-store' } });
}
