import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuth } from '@/lib/auth';
import { listMyStudyPlans } from '@/lib/student-data';
import { createMyAdaptiveStudyPlan, getMyAdaptiveStudyPlan, StudyPlanRequestError } from '@/lib/study-plan-data';
import { STUDY_PLAN_DAYS } from '@/lib/study-plan-engine';
import { hasTrustedOrigin } from '@/lib/request-security';
import { headers } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createPlanSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  targetScore: z.number().int().min(1).max(36),
  currentPerformance: z.record(z.string(), z.number().min(1).max(36)).optional(),
  testDate: z.iso.date(),
  daysAvailable: z.array(z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])).min(1).max(7),
  minutesPerDay: z.number().int().min(5).max(240),
}).strict();

function handleError(error: unknown) {
  if (error instanceof StudyPlanRequestError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error('Could not process study plan request.');
  return NextResponse.json({ error: 'Could not process study plan request.' }, { status: 500 });
}

export async function GET() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const adaptivePlan = await getMyAdaptiveStudyPlan();
    return NextResponse.json({ studyPlan: adaptivePlan, studyPlans: await listMyStudyPlans() }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return handleError(error); }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = createPlanSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Provide your target, test date, available weekdays, and minutes per day.' }, { status: 400 });
  try {
    const result = await createMyAdaptiveStudyPlan({ ...parsed.data, daysAvailable: [...new Set(parsed.data.daysAvailable)].sort((a, b) => STUDY_PLAN_DAYS.indexOf(a) - STUDY_PLAN_DAYS.indexOf(b)) });
    return NextResponse.json(result, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return handleError(error); }
}
