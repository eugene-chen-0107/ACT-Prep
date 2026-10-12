import 'server-only';
import { headers } from 'next/headers';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { getAuth } from '@/lib/auth';
import { profiles, questionAttempts, testAttempts } from '@/db/schema';
import { analyzeQuestionAttemptPerformance } from './performance-analysis';
import { questionProvider } from './question-providers';
import { createSmartPracticePlan, type SmartPracticePlan } from './smart-practice-engine';

export async function getMySmartPracticePlan(durationMinutes: number, target?: { section?: string; topic?: string }): Promise<SmartPracticePlan> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error('Authentication required.');
  const userId = session.user.id;
  const db = getDb();

  const [attempts, profileRows, completedTests] = await Promise.all([
    db.select({
      questionId: questionAttempts.questionId,
      attemptedAt: questionAttempts.attemptedAt,
      section: questionAttempts.section,
      topic: questionAttempts.topic,
      subtopic: questionAttempts.subtopic,
      difficulty: questionAttempts.difficulty,
      isCorrect: questionAttempts.isCorrect,
      timeSpentSeconds: questionAttempts.timeSpentSeconds,
      selectedAnswer: questionAttempts.selectedAnswer,
      questionSnapshot: questionAttempts.questionSnapshot,
    }).from(questionAttempts)
      .where(eq(questionAttempts.userId, userId))
      .orderBy(desc(questionAttempts.attemptedAt)),
    db.select({ targetScore: profiles.targetScore, targetTestDate: profiles.targetTestDate })
      .from(profiles).where(eq(profiles.userId, userId)).limit(1),
    db.select({ scaledScore: testAttempts.scaledScore })
      .from(testAttempts).where(and(eq(testAttempts.userId, userId), eq(testAttempts.status, 'completed')))
      .orderBy(desc(testAttempts.completedAt)).limit(1),
  ]);

  const profile = profileRows[0];
  const performance = analyzeQuestionAttemptPerformance(attempts);
  const questions = await questionProvider.getQuestions({ section: target?.section, topic: target?.topic, limit: 500 });
  return createSmartPracticePlan({
    now: new Date(),
    durationMinutes,
    attempts,
    analysis: performance,
    questions,
    targetScore: profile?.targetScore ?? null,
    latestTestScore: completedTests[0]?.scaledScore ?? null,
    targetTestDate: profile?.targetTestDate ?? null,
  });
}
