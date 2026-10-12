import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import { getAuth } from '@/lib/auth';
import { questionProvider } from '@/lib/question-providers';
import { toStudentPracticeQuestion } from '@/lib/practice-flow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  sectionId: z.string().trim().min(1).max(64).optional(),
  topicId: z.string().trim().min(1).max(128).optional(),
  ids: z.string().trim().min(1).max(20000).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
}).strict();

export async function GET(request: Request) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    sectionId: url.searchParams.get('sectionId') ?? undefined,
    topicId: url.searchParams.get('topicId') ?? undefined,
    ids: url.searchParams.get('ids') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: 'Invalid practice filters.' }, { status: 400 });

  const ids = parsed.data.ids?.split(',').filter(Boolean);
  if (ids && (ids.length > 100 || ids.some((id) => id.length > 128) || new Set(ids).size !== ids.length)) {
    return NextResponse.json({ error: 'Invalid Smart Practice question list.' }, { status: 400 });
  }
  const questions = await questionProvider.getQuestions({
    sectionId: parsed.data.sectionId,
    topicId: parsed.data.topicId,
    limit: ids ? 500 : parsed.data.limit ?? 100,
  });
  const byId = new Map(questions.map((question) => [question.id, question]));
  const selectedQuestions = ids ? ids.flatMap((id) => {
    const question = byId.get(id);
    return question ? [question] : [];
  }) : questions;
  return NextResponse.json(
    { questions: selectedQuestions.map(toStudentPracticeQuestion) },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
