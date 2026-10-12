import { NextResponse } from 'next/server';
import { getMyReviewData } from '@/lib/review-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const review = await getMyReviewData();
    return NextResponse.json({ review }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required.') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Could not load student review data.');
    return NextResponse.json({ error: 'Could not load Review.' }, { status: 500 });
  }
}
