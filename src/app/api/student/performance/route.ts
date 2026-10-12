import { NextResponse } from 'next/server';
import { getMyPerformanceAnalysis } from '@/lib/performance-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const analysis = await getMyPerformanceAnalysis();
    return NextResponse.json({ analysis }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required.') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Could not load student performance analysis.');
    return NextResponse.json({ error: 'Could not load performance analysis.' }, { status: 500 });
  }
}
