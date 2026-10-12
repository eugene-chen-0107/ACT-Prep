import { NextResponse } from 'next/server';
import { getMyProgressAnalytics } from '@/lib/progress-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const analytics = await getMyProgressAnalytics();
    return NextResponse.json({ analytics }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required.') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Could not load student progress analytics.');
    return NextResponse.json({ error: 'Could not load progress analytics.' }, { status: 500 });
  }
}
