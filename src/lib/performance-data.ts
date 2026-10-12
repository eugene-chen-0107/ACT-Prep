import 'server-only';
import { headers } from 'next/headers';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { getAuth } from '@/lib/auth';
import { questionAttempts } from '@/db/schema';
import { analyzeQuestionAttemptPerformance } from './performance-analysis';

export async function getMyPerformanceAnalysis() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error('Authentication required.');

  const attempts = await getDb().select({
    questionId: questionAttempts.questionId,
    attemptedAt: questionAttempts.attemptedAt,
    section: questionAttempts.section,
    topic: questionAttempts.topic,
    subtopic: questionAttempts.subtopic,
    difficulty: questionAttempts.difficulty,
    isCorrect: questionAttempts.isCorrect,
    timeSpentSeconds: questionAttempts.timeSpentSeconds,
    questionSnapshot: questionAttempts.questionSnapshot,
  }).from(questionAttempts)
    .where(eq(questionAttempts.userId, session.user.id))
    .orderBy(desc(questionAttempts.attemptedAt));

  return analyzeQuestionAttemptPerformance(attempts);
}
