import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import { getAuth } from '@/lib/auth';
import { hasTrustedOrigin } from '@/lib/request-security';
import { completeMyDiagnostic, DiagnosticRequestError, startMyDiagnostic, submitMyDiagnosticResponse } from '@/lib/diagnostic-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const responseSchema = z.object({
  assessmentId: z.string().trim().min(1).max(128),
  questionId: z.string().trim().min(1).max(128),
  selectedAnswer: z.string().trim().min(1).max(32),
  timeSpentSeconds: z.number().int().min(0).max(24 * 60 * 60),
}).strict();
const completeSchema = z.object({ assessmentId: z.string().trim().min(1).max(128) }).strict();

async function authorized(request?: Request) {
  if (request && !hasTrustedOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session?.user ? null : NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function errorResponse(error: unknown) {
  if (error instanceof DiagnosticRequestError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error('Diagnostic assessment request failed.');
  return NextResponse.json({ error: 'Diagnostic assessment could not be processed.' }, { status: 500 });
}

export async function GET() {
  const denied = await authorized();
  if (denied) return denied;
  try {
    return NextResponse.json(await startMyDiagnostic(), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  const denied = await authorized(request);
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid diagnostic response.' }, { status: 400 });
  try {
    return NextResponse.json(await submitMyDiagnosticResponse(parsed.data), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error); }
}

export async function PUT(request: Request) {
  const denied = await authorized(request);
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid diagnostic completion request.' }, { status: 400 });
  try {
    return NextResponse.json({ report: await completeMyDiagnostic(parsed.data.assessmentId) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error); }
}
