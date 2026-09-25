import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getAuth } from '@/lib/auth';
import { hasTrustedOrigin } from '@/lib/request-security';
import { z } from 'zod';
import { getMyPreferences, updateMyPreferences } from '@/lib/student-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const preferencesSchema = z.object({
  weeklyGoalMinutes: z.number().int().min(15).max(3000).optional(),
  preferredStudyDays: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).max(7).optional(),
  reminderEnabled: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one preference.');

export async function GET() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ preferences: await getMyPreferences() }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function PATCH(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = preferencesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid preferences.' }, { status: 400 });
  return NextResponse.json({ preferences: await updateMyPreferences(parsed.data) }, { headers: { 'Cache-Control': 'private, no-store' } });
}
