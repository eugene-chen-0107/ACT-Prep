import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import { getAuth } from '@/lib/auth';
import { hasTrustedOrigin } from '@/lib/request-security';
import { getMyTestAttempt, listPracticeTests, mutateMyTestAttempt, PracticeTestRequestError, startMyTestAttempt } from '@/lib/practice-test-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const actionSchema = z.object({
  attemptId: z.string().trim().min(1).max(128),
  action: z.enum(['begin', 'answer', 'navigate', 'flag', 'continue', 'expire', 'finishSection', 'submit']),
  questionId: z.string().trim().min(1).max(128).optional(),
  selectedAnswer: z.string().trim().min(1).max(32).nullable().optional(),
  questionIndex: z.number().int().nonnegative().optional(),
  flagged: z.boolean().optional(),
}).strict();
async function authorized(request?: Request) {
  if (request && !hasTrustedOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session?.user ? null : NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
function handleError(error: unknown) {
  if (error instanceof PracticeTestRequestError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error('Practice test request failed.');
  return NextResponse.json({ error: 'Practice test could not be processed.' }, { status: 500 });
}
export async function GET(request: Request) {
  const denied = await authorized();
  if (denied) return denied;
  const { searchParams } = new URL(request.url);
  try {
    const attemptId = searchParams.get('attemptId');
    if (attemptId) return NextResponse.json(await getMyTestAttempt(attemptId), { headers: { 'Cache-Control': 'private, no-store' } });
    return NextResponse.json(await listPracticeTests(), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  const denied = await authorized(request);
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const startSchema = z.object({ testId: z.string().trim().min(1).max(128) }).strict();
  const start = startSchema.safeParse(body);
  if (start.success) {
    try { return NextResponse.json(await startMyTestAttempt(start.data.testId), { status: 201, headers: { 'Cache-Control': 'private, no-store' } }); }
    catch (error) { return handleError(error); }
  }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid test request.' }, { status: 400 });
  try { return NextResponse.json(await mutateMyTestAttempt(parsed.data), { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch (error) { return handleError(error); }
}
