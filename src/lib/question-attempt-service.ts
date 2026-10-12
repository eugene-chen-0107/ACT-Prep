import 'server-only';
import { headers } from 'next/headers';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { getAuth } from '@/lib/auth';
import { practiceSessions, questionAttempts, testAttempts } from '@/db/schema';
import { questionProvider } from '@/lib/question-providers';
import type { UnifiedQuestion } from '@/lib/question-provider';
import { normalizeQuestionSource } from '@/lib/question-provider';

function toAttemptQuestion(question: UnifiedQuestion) {
  return {
    id: question.id,
    prompt: question.question,
    options: question.choices,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    difficulty: question.difficulty,
    questionType: question.questionType,
    estimatedTimeSeconds: question.estimatedTimeSeconds,
    tags: question.tags,
    subtopic: question.subtopic,
    topic: question.topic,
    section: question.section,
    source: question.source,
  };
}

const recordAttemptInput = z.object({
  questionId: z.string().trim().min(1).max(128),
  selectedAnswer: z.string().trim().min(1).max(32).nullable(),
  timeSpentSeconds: z.number().int().min(0).max(24 * 60 * 60),
  practiceSessionId: z.string().trim().min(1).max(128).optional(),
  testAttemptId: z.string().trim().min(1).max(128).optional(),
}).strict();

/**
 * Record a student's answer using only trusted question data. Ownership is
 * always resolved from the server session; neither user IDs, correct answers,
 * taxonomy, nor correctness values are accepted from the caller.
 */
export async function recordQuestionAttempt(input: unknown) {
  const parsed = recordAttemptInput.safeParse(input);
  if (!parsed.success) throw new Error('Invalid question attempt.');

  const currentSession = await getAuth().api.getSession({ headers: await headers() });
  const userId = currentSession?.user?.id;
  if (!userId) throw new Error('Authentication required.');

  const providedQuestion = await questionProvider.getQuestionById(parsed.data.questionId);
  if (!providedQuestion) throw new Error('Question not found.');
  const question = toAttemptQuestion(providedQuestion);
  const db = getDb();
  if (parsed.data.selectedAnswer !== null && !question.options.some(({ id }) => id === parsed.data.selectedAnswer)) {
    throw new Error('Selected answer is not one of the available choices.');
  }

  if (parsed.data.practiceSessionId) {
    const [ownedPracticeSession] = await db.select({ id: practiceSessions.id })
      .from(practiceSessions)
      .where(and(eq(practiceSessions.id, parsed.data.practiceSessionId), eq(practiceSessions.userId, userId)))
      .limit(1);
    if (!ownedPracticeSession) throw new Error('Practice session not found.');
  }
  if (parsed.data.testAttemptId) {
    const [ownedTestAttempt] = await db.select({ id: testAttempts.id })
      .from(testAttempts)
      .where(and(eq(testAttempts.id, parsed.data.testAttemptId), eq(testAttempts.userId, userId)))
      .limit(1);
    if (!ownedTestAttempt) throw new Error('Test attempt not found.');
  }

  const isCorrect = parsed.data.selectedAnswer !== null && parsed.data.selectedAnswer === question.correctAnswer;
  const [attempt] = await db.insert(questionAttempts).values({
    id: crypto.randomUUID(),
    userId,
    questionId: question.id,
    practiceSessionId: parsed.data.practiceSessionId ?? null,
    testAttemptId: parsed.data.testAttemptId ?? null,
    selectedAnswer: parsed.data.selectedAnswer,
    correctAnswer: question.correctAnswer,
    isCorrect,
    timeSpentSeconds: parsed.data.timeSpentSeconds,
    section: question.section,
    topic: question.topic,
    subtopic: question.subtopic,
    difficulty: question.difficulty,
    questionSnapshot: {
      prompt: question.prompt,
      options: question.options,
      explanation: question.explanation,
      questionType: question.questionType,
      estimatedTimeSeconds: question.estimatedTimeSeconds,
      tags: question.tags,
      source: normalizeQuestionSource(question.source),
    },
  }).returning({
    id: questionAttempts.id,
    selectedAnswer: questionAttempts.selectedAnswer,
    isCorrect: questionAttempts.isCorrect,
    timeSpentSeconds: questionAttempts.timeSpentSeconds,
    attemptedAt: questionAttempts.attemptedAt,
    section: questionAttempts.section,
    topic: questionAttempts.topic,
    subtopic: questionAttempts.subtopic,
    difficulty: questionAttempts.difficulty,
  });

  return attempt;
}
