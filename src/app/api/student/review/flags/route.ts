import { NextResponse } from 'next/server';
import { z } from 'zod';
import { headers } from 'next/headers';
import { getAuth } from '@/lib/auth';
import { getMyFlaggedQuestionIds, removeMyQuestionFlag, saveMyQuestionFlag } from '@/lib/review-data';
import { hasTrustedOrigin } from '@/lib/request-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const mutationSchema = z.object({ questionId: z.string().trim().min(1).max(128) }).strict();

function forbiddenOrInvalidOrigin(request: Request) {
  return !hasTrustedOrigin(request) ? NextResponse.json({ error: 'Forbidden' }, { status: 403 }) : null;
}

function handleError(error: unknown) {
  if (error instanceof Error && error.message === 'Authentication required.') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (error instanceof Error && error.message === 'Question not found.') return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
  console.error('Could not update student review flags.');
  return NextResponse.json({ error: 'Could not update flags. Please try again.' }, { status: 500 });
}

export async function GET(request: Request) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const ids = url.searchParams.getAll('id');
  if (ids.length > 100 || ids.some((id) => id.length > 128) || new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: 'Invalid question ID list.' }, { status: 400 });
  }
  try {
    return NextResponse.json({ flaggedIds: await getMyFlaggedQuestionIds(ids) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  const originError = forbiddenOrInvalidOrigin(request);
  if (originError) return originError;
  const parsed = mutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid question flag.' }, { status: 400 });
  try {
    await saveMyQuestionFlag(parsed.data.questionId);
    return NextResponse.json({ saved: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request) {
  const originError = forbiddenOrInvalidOrigin(request);
  if (originError) return originError;
  const parsed = mutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid question flag.' }, { status: 400 });
  try {
    await removeMyQuestionFlag(parsed.data.questionId);
    return NextResponse.json({ removed: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return handleError(error);
  }
}
