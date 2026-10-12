import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getDb } from '@/db';
import { questionAttempts } from '@/db/schema';
import { getAuth } from '@/lib/auth';
import { hasTrustedOrigin } from '@/lib/request-security';
import { questionProvider } from '@/lib/question-providers';
import { GrokExplanationProvider } from '@/lib/grok-explanation-provider';
import { postgresExplanationCache } from '@/lib/ai-explanation-cache';
import { createAIExplanationService } from '@/lib/ai-explanation';
import {
  InvalidPracticeSubmissionError,
  PracticeQuestionNotFoundError,
  submitPracticeAnswer,
} from '@/lib/practice-flow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  try {
    const feedback = await submitPracticeAnswer(body, {
      userId: session.user.id,
      getQuestionById: (id) => questionProvider.getQuestionById(id),
      explain: createAIExplanationService({
        provider: (() => { const provider = new GrokExplanationProvider(); return provider.available ? provider : null; })(),
        cache: postgresExplanationCache,
      }),
      saveAttempt: async (attempt) => {
        const [saved] = await getDb().insert(questionAttempts).values(attempt).returning({
          id: questionAttempts.id,
          attemptedAt: questionAttempts.attemptedAt,
        });
        return saved;
      },
    });
    return NextResponse.json({ feedback }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof InvalidPracticeSubmissionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof PracticeQuestionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('Could not submit practice answer.');
    return NextResponse.json({ error: 'Could not save your answer. Please try again.' }, { status: 500 });
  }
}
