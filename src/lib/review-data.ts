import 'server-only';
import { headers } from 'next/headers';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/db';
import { questionAttempts, reviewFlags } from '@/db/schema';
import type { ReviewFlagSnapshot } from '@/db/schema';
import { getAuth } from '@/lib/auth';
import { questionProvider } from '@/lib/question-providers';
import { buildReviewData } from './spaced-review';

export async function getReviewOwner() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error('Authentication required.');
  return session.user.id;
}

export async function getMyReviewData() {
  const userId = await getReviewOwner();
  const db = getDb();
  const [attempts, flags] = await Promise.all([
    db.select({
      attemptId: questionAttempts.id,
      questionId: questionAttempts.questionId,
      attemptedAt: questionAttempts.attemptedAt,
      section: questionAttempts.section,
      topic: questionAttempts.topic,
      subtopic: questionAttempts.subtopic,
      selectedAnswer: questionAttempts.selectedAnswer,
      correctAnswer: questionAttempts.correctAnswer,
      isCorrect: questionAttempts.isCorrect,
      questionSnapshot: questionAttempts.questionSnapshot,
    }).from(questionAttempts).where(eq(questionAttempts.userId, userId)).orderBy(desc(questionAttempts.attemptedAt), desc(questionAttempts.id)),
    db.select({
      questionId: reviewFlags.questionId,
      flaggedAt: reviewFlags.flaggedAt,
      question: reviewFlags.questionSnapshot,
      section: reviewFlags.section,
      topic: reviewFlags.topic,
      subtopic: reviewFlags.subtopic,
    }).from(reviewFlags).where(eq(reviewFlags.userId, userId)).orderBy(desc(reviewFlags.flaggedAt)),
  ]);
  return buildReviewData({ attempts, flags: flags.map((flag) => ({
    questionId: flag.questionId,
    flaggedAt: flag.flaggedAt,      question: { prompt: flag.question.prompt, passage: flag.question.passage, options: flag.question.options, explanation: flag.question.explanation, correctAnswer: flag.question.correctAnswer, section: flag.section, topic: flag.topic ?? flag.section, subtopic: flag.subtopic },
  })) });
}

export async function getMyFlaggedQuestionIds(questionIds: string[]) {
  const userId = await getReviewOwner();
  if (!questionIds.length) return [];
  const flags = await getDb().select({ questionId: reviewFlags.questionId }).from(reviewFlags)
    .where(and(eq(reviewFlags.userId, userId), inArray(reviewFlags.questionId, questionIds)));
  return flags.map(({ questionId }) => questionId);
}

export async function saveMyQuestionFlag(questionId: string) {
  const userId = await getReviewOwner();
  const question = await questionProvider.getQuestionById(questionId);
  if (!question) throw new Error('Question not found.');
  const db = getDb();
  await db.insert(reviewFlags).values({
    userId,
    questionId: question.id,
    section: question.section,
    topic: question.topic,
    subtopic: question.subtopic,
    questionSnapshot: {
      prompt: question.question,
      passage: question.passage,
      options: question.choices,
      explanation: question.explanation,
      correctAnswer: question.correctAnswer,
    } satisfies ReviewFlagSnapshot,
    flaggedAt: new Date(),
  }).onConflictDoUpdate({
    target: [reviewFlags.userId, reviewFlags.questionId],
    set: {
      section: question.section,
      topic: question.topic,
      subtopic: question.subtopic,
      questionSnapshot: {
        prompt: question.question,
        passage: question.passage,
        options: question.choices,
        explanation: question.explanation,
        correctAnswer: question.correctAnswer,
      } satisfies ReviewFlagSnapshot,
      flaggedAt: new Date(),
    },
  });
}

export async function removeMyQuestionFlag(questionId: string) {
  const userId = await getReviewOwner();
  await getDb().delete(reviewFlags).where(and(eq(reviewFlags.userId, userId), eq(reviewFlags.questionId, questionId)));
}
