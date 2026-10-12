import 'server-only';
import { headers } from 'next/headers';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db';
import { getAuth } from '@/lib/auth';
import { practiceSessions, profiles, questionAttempts, sections, studentPreferences, studyPlans, testAttempts, topics } from '@/db/schema';
import { buildDashboardMetrics } from './dashboard-metrics';

export async function getStudentDashboard() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error('Authentication required.');
  const userId = session.user.id;
  const db = getDb();

  const [attempts, sectionRows, topicRows, profileRows, preferenceRows, activePlans, activeSessions, completedTests] = await Promise.all([
    db.select({
      questionId: questionAttempts.questionId,
      attemptedAt: questionAttempts.attemptedAt,
      section: questionAttempts.section,
      topic: questionAttempts.topic,
      subtopic: questionAttempts.subtopic,
      isCorrect: questionAttempts.isCorrect,
      timeSpentSeconds: questionAttempts.timeSpentSeconds,
      questionSnapshot: questionAttempts.questionSnapshot,
    }).from(questionAttempts)
      .where(eq(questionAttempts.userId, userId))
      .orderBy(desc(questionAttempts.attemptedAt)),
    db.select({ id: sections.id, name: sections.name })
      .from(sections).where(eq(sections.isActive, true)).orderBy(asc(sections.sortOrder)),
    db.select({ id: topics.id, sectionId: sections.id, sectionName: sections.name, name: topics.name })
      .from(topics).innerJoin(sections, eq(topics.sectionId, sections.id))
      .where(and(eq(topics.isActive, true), eq(sections.isActive, true), isNull(topics.parentTopicId)))
      .orderBy(asc(sections.sortOrder), asc(topics.sortOrder)),
    db.select({ targetScore: profiles.targetScore, timeZone: profiles.timezone })
      .from(profiles).where(eq(profiles.userId, userId)).limit(1),
    db.select({ weeklyGoalMinutes: studentPreferences.weeklyGoalMinutes })
      .from(studentPreferences).where(eq(studentPreferences.userId, userId)).limit(1),
    db.select({ targetScore: studyPlans.targetScore })
      .from(studyPlans).where(and(eq(studyPlans.userId, userId), eq(studyPlans.isActive, true)))
      .orderBy(desc(studyPlans.updatedAt)).limit(1),
    db.select({ id: practiceSessions.id })
      .from(practiceSessions).where(and(eq(practiceSessions.userId, userId), eq(practiceSessions.status, 'in_progress')))
      .orderBy(desc(practiceSessions.startedAt)).limit(1),
    db.select({ scaledScore: testAttempts.scaledScore })
      .from(testAttempts).where(and(eq(testAttempts.userId, userId), eq(testAttempts.status, 'completed')))
      .orderBy(desc(testAttempts.completedAt)).limit(1),
  ]);

  const profile = profileRows[0];
  const preference = preferenceRows[0];
  const targetScore = profile?.targetScore ?? activePlans[0]?.targetScore ?? null;
  const metrics = buildDashboardMetrics({
    now: new Date(),
    timeZone: profile?.timeZone ?? 'UTC',
    attempts,
    sections: sectionRows,
    topics: topicRows,
    targetScore,
    latestTestScore: completedTests[0]?.scaledScore ?? null,
    weeklyGoalMinutes: preference?.weeklyGoalMinutes ?? null,
    activePracticeSessionId: activeSessions[0]?.id ?? null,
  });

  return { studentName: session.user.name, ...metrics };
}
