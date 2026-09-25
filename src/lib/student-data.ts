import 'server-only';
import { headers } from 'next/headers';
import { and, desc, eq } from 'drizzle-orm';
import { getAuth } from './auth';
import { getDb } from '@/db';
import { achievements, questionAttempts, studentPreferences, studentProgress, studyPlans } from '@/db/schema';

async function requireStudentId() {
  const current = await getAuth().api.getSession({ headers: await headers() });
  if (!current?.user?.id) throw new Error('Authentication required.');
  return current.user.id;
}

export async function getMyProfile() {
  const current = await getAuth().api.getSession({ headers: await headers() });
  if (!current?.user) throw new Error('Authentication required.');
  return current.user;
}

export async function listMyAttempts(limit = 50) {
  const userId = await requireStudentId();
  return getDb().select().from(questionAttempts).where(eq(questionAttempts.userId, userId)).orderBy(desc(questionAttempts.attemptedAt)).limit(Math.min(Math.max(limit, 1), 100));
}

export async function listMyProgress() {
  const userId = await requireStudentId();
  return getDb().select().from(studentProgress).where(eq(studentProgress.userId, userId));
}

export async function updateMyStudyPlan(planId: string, input: {
  title?: string;
  targetScore?: number | null;
  targetDate?: Date | null;
  schedule?: Record<string, unknown>;
  isActive?: boolean;
}) {
  const userId = await requireStudentId();
  const [plan] = await getDb().update(studyPlans).set({ ...input, updatedAt: new Date() })
    .where(and(eq(studyPlans.id, planId), eq(studyPlans.userId, userId))).returning();
  return plan ?? null;
}

export async function listMyStudyPlans() {
  const userId = await requireStudentId();
  return getDb().select().from(studyPlans).where(eq(studyPlans.userId, userId)).orderBy(desc(studyPlans.updatedAt));
}

export async function getMyPreferences() {
  const userId = await requireStudentId();
  const [preferences] = await getDb().select().from(studentPreferences).where(eq(studentPreferences.userId, userId)).limit(1);
  return preferences ?? null;
}

export async function updateMyPreferences(input: {
  weeklyGoalMinutes?: number;
  preferredStudyDays?: string[];
  reminderEnabled?: boolean;
}) {
  const userId = await requireStudentId();
  const db = getDb();
  const values = {
    weeklyGoalMinutes: input.weeklyGoalMinutes,
    preferredStudyDays: input.preferredStudyDays,
    reminderEnabled: input.reminderEnabled,
    updatedAt: new Date(),
  };
  await db.insert(studentPreferences).values({ userId, ...values })
    .onConflictDoUpdate({ target: studentPreferences.userId, set: values });
  return getMyPreferences();
}

export async function listMyAchievements() {
  const userId = await requireStudentId();
  return getDb().select().from(achievements).where(eq(achievements.userId, userId)).orderBy(desc(achievements.earnedAt));
}
