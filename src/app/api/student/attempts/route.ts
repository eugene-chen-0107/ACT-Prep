import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getAuth } from '@/lib/auth';
import { listMyAttempts } from '@/lib/student-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const limit = Number(new URL(request.url).searchParams.get('limit') ?? 50);
  return NextResponse.json({ attempts: await listMyAttempts(Number.isFinite(limit) ? limit : 50) }, { headers: { 'Cache-Control': 'private, no-store' } });
}
