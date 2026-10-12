import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import { getAuth } from '@/lib/auth';
import { getMySmartPracticePlan } from '@/lib/smart-practice-data';
import { SMART_CUSTOM_MAX_MINUTES, SMART_CUSTOM_MINUTES, toStudentSmartPracticePlan } from '@/lib/smart-practice-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  minutes: z.coerce.number().int().min(SMART_CUSTOM_MINUTES).max(SMART_CUSTOM_MAX_MINUTES),
  section: z.string().trim().min(1).max(64).optional(),
  topic: z.string().trim().min(1).max(128).optional(),
}).strict();

export async function GET(request: Request) {
  const current = await getAuth().api.getSession({ headers: await headers() });
  if (!current?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    minutes: url.searchParams.get('minutes'),
    section: url.searchParams.get('section') ?? undefined,
    topic: url.searchParams.get('topic') ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: 'Choose a session length from 1 to 120 minutes.' }, { status: 400 });
  try {
    const plan = await getMySmartPracticePlan(parsed.data.minutes, { section: parsed.data.section, topic: parsed.data.topic });
    return NextResponse.json({ plan: toStudentSmartPracticePlan(plan) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required.') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Could not create Smart Practice plan.');
    return NextResponse.json({ error: 'Smart Practice could not create a session. Please try again.' }, { status: 500 });
  }
}
