import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { getAuth } from '@/lib/auth';
import { getDb } from '@/db';
import { studyPlans } from '@/db/schema';
import { hasTrustedOrigin } from '@/lib/request-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const updatePlanSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  targetScore: z.number().int().min(1).max(36).nullable().optional(),
  targetDate: z.iso.datetime().nullable().optional(),
  schedule: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
}).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = updatePlanSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid study plan.' }, { status: 400 });
  const { planId } = await params;
  const input = parsed.data;
  const [plan] = await getDb().update(studyPlans).set({
    ...input,
    targetDate: input.targetDate === undefined ? undefined : input.targetDate === null ? null : new Date(input.targetDate),
    updatedAt: new Date(),
  }).where(and(eq(studyPlans.id, planId), eq(studyPlans.userId, session.user.id))).returning();
  if (!plan) return NextResponse.json({ error: 'Study plan not found.' }, { status: 404 });
  return NextResponse.json({ studyPlan: plan }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { planId } = await params;
  const [deleted] = await getDb().delete(studyPlans).where(and(eq(studyPlans.id, planId), eq(studyPlans.userId, session.user.id))).returning({ id: studyPlans.id });
  if (!deleted) return NextResponse.json({ error: 'Study plan not found.' }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
