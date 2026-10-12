import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { getDb } from '@/db';
import { diagnosticAssessments, diagnosticResponses, questionAttempts, sections, testAttempts as testAttemptTable, topics } from '@/db/schema';
import { getAuth } from '@/lib/auth';
import type { PerformanceAttempt } from './performance-analysis';
import { buildProgressAnalytics } from './progress-analytics';

export async function getMyProgressAnalytics() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error('Authentication required.');
  const userId = session.user.id;
  const db = getDb();
  const [savedAttempts, diagnostics, tests, topicRows] = await Promise.all([
    db.select({ questionId: questionAttempts.questionId, attemptedAt: questionAttempts.attemptedAt, section: questionAttempts.section,
      topic: questionAttempts.topic, subtopic: questionAttempts.subtopic, difficulty: questionAttempts.difficulty,
      isCorrect: questionAttempts.isCorrect, timeSpentSeconds: questionAttempts.timeSpentSeconds, questionSnapshot: questionAttempts.questionSnapshot,
      testAttemptId: questionAttempts.testAttemptId,
    }).from(questionAttempts).where(eq(questionAttempts.userId, userId)).orderBy(asc(questionAttempts.attemptedAt)),
    db.select({ id: diagnosticAssessments.id, report: diagnosticAssessments.report, completedAt: diagnosticAssessments.completedAt }).from(diagnosticAssessments)
      .where(and(eq(diagnosticAssessments.userId, userId), eq(diagnosticAssessments.status, 'completed'))).orderBy(asc(diagnosticAssessments.completedAt)),
    db.select({ id: testAttemptTable.id, title: testAttemptTable.testTitleSnapshot, scaledScore: testAttemptTable.scaledScore, sectionScores: testAttemptTable.sectionScores, completedAt: testAttemptTable.completedAt })
      .from(testAttemptTable).where(and(eq(testAttemptTable.userId, userId), eq(testAttemptTable.status, 'completed'))).orderBy(asc(testAttemptTable.completedAt)),
    db.select({ sectionName: sections.name, sectionId: sections.id, topicName: topics.name, topicId: topics.id })
      .from(topics).innerJoin(sections, eq(topics.sectionId, sections.id)).where(eq(topics.isActive, true)),
  ]);
  const responses = diagnostics.length ? await db.select({
    assessmentId: diagnosticResponses.assessmentId, questionId: diagnosticResponses.questionId,
    attemptedAt: diagnosticResponses.attemptedAt, section: diagnosticResponses.section,
    topic: diagnosticResponses.topic, subtopic: diagnosticResponses.subtopic, difficulty: diagnosticResponses.difficulty,
    isCorrect: diagnosticResponses.isCorrect, timeSpentSeconds: diagnosticResponses.timeSpentSeconds,
  }).from(diagnosticResponses).where(eq(diagnosticResponses.userId, userId)).orderBy(asc(diagnosticResponses.attemptedAt)) : [];
  const now = new Date();
  const reportScores = diagnostics.flatMap((assessment) => {
    const report = assessment.report as { estimatedPerformance?: Array<{ section: string; estimatedScore: number | null }> } | null;
    const scores = report?.estimatedPerformance?.flatMap(({ estimatedScore }) => estimatedScore === null ? [] : [estimatedScore]) ?? [];
    return scores.length && assessment.completedAt ? [{
      date: assessment.completedAt, score: Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length),
      source: 'diagnostic' as const, label: 'Diagnostic estimate',
    }] : [];
  });
  const diagnosticAttempts: PerformanceAttempt[] = responses.map((response) => ({
    questionId: response.questionId, attemptedAt: response.attemptedAt, section: response.section,
    topic: response.topic, subtopic: response.subtopic, difficulty: response.difficulty,
    isCorrect: response.isCorrect, timeSpentSeconds: response.timeSpentSeconds,
    questionSnapshot: { prompt: '' },
  }));
  const topicPracticeLinks = Object.fromEntries(topicRows.map((topic) => [
    `${topic.sectionName}\u0000${topic.topicName}`,
    `/practice?sectionId=${encodeURIComponent(topic.sectionId)}&topicId=${encodeURIComponent(topic.topicId)}&limit=10`,
  ]));
  const completedTestIds = new Set(tests.map(({ id }) => id));
  const practiceAttempts = savedAttempts.filter(({ testAttemptId }) => testAttemptId === null);
  const linkedTestAttempts = savedAttempts.filter(({ testAttemptId }) => testAttemptId !== null && completedTestIds.has(testAttemptId));
  const analytics = buildProgressAnalytics({
    practiceAttempts: practiceAttempts as PerformanceAttempt[],
    testAttempts: linkedTestAttempts as PerformanceAttempt[],
    diagnosticAttempts,
    diagnosticScores: reportScores,
    diagnosticSectionScores: diagnostics.flatMap((assessment) => {
      const report = assessment.report as { estimatedPerformance?: Array<{ section: string; estimatedScore: number | null }> } | null;
      return report?.estimatedPerformance?.flatMap(({ section, estimatedScore }) => estimatedScore === null || !assessment.completedAt ? [] : [{
        date: assessment.completedAt, section, score: estimatedScore, label: 'Diagnostic estimate',
      }]) ?? [];
    }),
    practiceTestScores: tests.flatMap((test) => test.scaledScore === null || !test.completedAt ? [] : [{
      date: test.completedAt, score: test.scaledScore, source: 'practice test' as const, label: test.title,
    }]),
    practiceTestSectionScores: tests.flatMap((test) => Object.entries(test.sectionScores ?? {}).flatMap(([section, rawScore]) => {
      const score = typeof rawScore === 'number' ? rawScore : Number(rawScore);
      return !test.completedAt || !Number.isFinite(score) ? [] : [{
        date: test.completedAt, section, score, label: test.title,
      }];
    })),
    topicPracticeLinks,
    now,
  });
  return analytics;
}

export type StudentProgressAnalytics = Awaited<ReturnType<typeof getMyProgressAnalytics>>;