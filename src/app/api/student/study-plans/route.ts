import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuth } from '@/lib/auth';
import { getDb } from '@/db';
import { studyPlans } from '@/db/schema';
import { listMyStudyPlans } from '@/lib/student-data';
import { hasTrustedOrigin } from '@/lib/request-security';
import { headers } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createPlanSchema = z.object({
  title: z.string().trim().min(1).max(120),
  targetScore: z.number().int().min(1).max(36).optional(),
  targetDate: z.iso.datetime().optional(),
  schedule: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ studyPlans: await listMyStudyPlans() }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = createPlanSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid study plan.' }, { status: 400 });
  const [plan] = await getDb().insert(studyPlans).values({
    id: randomUUID(),
    userId: session.user.id,
    title: parsed.data.title,
    targetScore: parsed.data.targetScore ?? null,
    targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
    schedule: parsed.data.schedule ?? {},
  }).returning();
  return NextResponse.json({ studyPlan: plan }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
}
