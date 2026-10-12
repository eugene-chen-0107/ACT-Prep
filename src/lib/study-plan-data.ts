import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { getDb } from '@/db';
import { diagnosticAssessments, profiles, questionAttempts, sections, studyPlanTasks, studyPlans, topics } from '@/db/schema';
import { getAuth } from '@/lib/auth';
import { analyzeQuestionAttemptPerformance } from './performance-analysis';
import { DEFAULT_STUDY_PLAN_SKILLS, deriveStudyPlanSkills, generateWeeklyStudyPlan, summarizeStudyPlanProgress, type GeneratedWeeklyPlan, type StudyPlanSkill } from './study-plan-engine';

export class StudyPlanRequestError extends Error {
  constructor(message: string, readonly status = 400) { super(message); this.name = 'StudyPlanRequestError'; }
}
async function ownerId() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) throw new StudyPlanRequestError('Unauthorized', 401);
  return session.user.id;
}

async function currentPerformance(userId: string) {
  const db = getDb();
  const [attempts, diagnosticRows, profileRows] = await Promise.all([
    db.select({ questionId: questionAttempts.questionId, attemptedAt: questionAttempts.attemptedAt, section: questionAttempts.section,
      topic: questionAttempts.topic, subtopic: questionAttempts.subtopic, difficulty: questionAttempts.difficulty,
      isCorrect: questionAttempts.isCorrect, timeSpentSeconds: questionAttempts.timeSpentSeconds, questionSnapshot: questionAttempts.questionSnapshot,
    }).from(questionAttempts).where(eq(questionAttempts.userId, userId)).orderBy(desc(questionAttempts.attemptedAt)),
    db.select({ report: diagnosticAssessments.report }).from(diagnosticAssessments)
      .where(and(eq(diagnosticAssessments.userId, userId), eq(diagnosticAssessments.status, 'completed')))
      .orderBy(desc(diagnosticAssessments.completedAt)).limit(1),
    db.select({ targetScore: profiles.targetScore }).from(profiles).where(eq(profiles.userId, userId)).limit(1),
  ]);
  const analysis = analyzeQuestionAttemptPerformance(attempts);
  const report = diagnosticRows[0]?.report as { priorityTopics?: Array<{ section: string; topic: string; accuracy: number; attempts: number }>; estimatedPerformance?: Array<{ section: string; estimatedScore: number | null }> } | null;
  const diagnosticPerformance = Object.fromEntries((report?.estimatedPerformance ?? []).flatMap((item) => item.estimatedScore === null ? [] : [[item.section, item.estimatedScore]]));
  const currentScores = Object.fromEntries(analysis.sections.flatMap((metric) => metric.masteryEstimate === null ? [] : [[metric.label, metric.masteryEstimate]]));
  return {
    analysis,
    diagnosticReport: report,
    diagnosticPerformance,
    currentPerformance: Object.keys(currentScores).length ? currentScores : diagnosticPerformance,
    targetScore: profileRows[0]?.targetScore ?? 24,
    skills: deriveStudyPlanSkills(analysis, report ?? undefined),
  };
}

function performanceFingerprint(performance: { currentPerformance: Record<string, number>; diagnosticPerformance: Record<string, number>; skills: readonly StudyPlanSkill[] }) {
  return JSON.stringify({
    current: Object.entries(performance.currentPerformance).sort(([left], [right]) => left.localeCompare(right)),
    diagnostic: Object.entries(performance.diagnosticPerformance).sort(([left], [right]) => left.localeCompare(right)),
    skills: performance.skills.map(({ section, topic, accuracy, attempts, source }) => [section, topic, accuracy, attempts, source])
      .sort(([leftSection, leftTopic], [rightSection, rightTopic]) => String(leftSection).localeCompare(String(rightSection)) || String(leftTopic).localeCompare(String(rightTopic))),
  });
}

async function resolveTopicIds(skills: readonly StudyPlanSkill[]) {
  const db = getDb();
  const found = await Promise.all(skills.map(async (skill) => {
    const [match] = await db.select({ sectionId: sections.id, topicId: topics.id })
      .from(topics).innerJoin(sections, eq(topics.sectionId, sections.id))
      .where(and(eq(sections.name, skill.section), eq(topics.name, skill.topic))).limit(1);
    return match ? { ...skill, sectionId: match.sectionId, topicId: match.topicId } : null;
  }));
  return found.filter((item): item is NonNullable<typeof item> => item !== null);
}

export async function createMyAdaptiveStudyPlan(input: {
  targetScore: number; testDate: string; daysAvailable: string[]; minutesPerDay: number; currentPerformance?: Record<string, number>;
}): Promise<{ planId: string; schedule: GeneratedWeeklyPlan }> {
  const userId = await ownerId();
  const performance = await currentPerformance(userId);
  const schedule = generateWeeklyStudyPlan({
    ...input, currentPerformance: performance.currentPerformance, selfReportedPerformance: input.currentPerformance,
    diagnosticPerformance: performance.diagnosticPerformance,
    skills: performance.skills.length ? performance.skills : DEFAULT_STUDY_PLAN_SKILLS,
  });
  const fingerprint = performanceFingerprint({ ...performance, skills: performance.skills.length ? performance.skills : DEFAULT_STUDY_PLAN_SKILLS });
  const db = getDb();
  const id = randomUUID();
  const [plan] = await db.insert(studyPlans).values({
    id, userId, title: `Adaptive ACT plan · target ${input.targetScore}`, targetScore: input.targetScore,
    targetDate: new Date(input.testDate), schedule: { ...schedule, performanceFingerprint: fingerprint }, isActive: true,
  }).returning();
  const taxonomy = await resolveTopicIds(performance.skills);
  const topicIds = new Map(taxonomy.map((skill) => [`${skill.section}\u0000${skill.topic}`, skill.topicId]));
  await db.insert(studyPlanTasks).values(schedule.tasks.map((task, index) => ({
    id: randomUUID(), studyPlanId: id, title: task.title, description: task.description,
    sectionId: taxonomy.find((skill) => skill.section === task.section)?.sectionId ?? null,
    topicId: topicIds.get(`${task.section}\u0000${task.topic}`) ?? null,
    taskDate: new Date(`${task.date}T12:00:00.000Z`), estimatedMinutes: task.minutes, sortOrder: index,
    status: 'pending', priority: task.priority, source: task.source,
  })));
  return { planId: plan.id, schedule };
}

export async function getMyAdaptiveStudyPlan(): Promise<Awaited<ReturnType<typeof loadMyAdaptiveStudyPlan>>> {
  const userId = await ownerId();
  const db = getDb();
  const [plan] = await db.select().from(studyPlans).where(and(eq(studyPlans.userId, userId), eq(studyPlans.isActive, true)))
    .orderBy(desc(studyPlans.updatedAt)).limit(1);
  if (!plan) return null;
  const performance = await currentPerformance(userId);
  const schedule = plan.schedule as { performanceFingerprint?: string };
  const currentFingerprint = performanceFingerprint({
    ...performance,
    skills: performance.skills.length ? performance.skills : DEFAULT_STUDY_PLAN_SKILLS,
  });
  if (schedule.performanceFingerprint !== currentFingerprint) {
    await adaptMyAdaptiveStudyPlan(plan.id);
    return loadMyAdaptiveStudyPlan(userId);
  }
  return loadMyAdaptiveStudyPlan(userId);
}

async function loadMyAdaptiveStudyPlan(userId: string) {
  const db = getDb();
  const [plan] = await db.select().from(studyPlans).where(and(eq(studyPlans.userId, userId), eq(studyPlans.isActive, true)))
    .orderBy(desc(studyPlans.updatedAt)).limit(1);
  if (!plan) return null;
  const tasks = await db.select({
    id: studyPlanTasks.id, studyPlanId: studyPlanTasks.studyPlanId, title: studyPlanTasks.title, description: studyPlanTasks.description,
    section: sections.name, topic: topics.name, taskDate: studyPlanTasks.taskDate, estimatedMinutes: studyPlanTasks.estimatedMinutes,
    status: studyPlanTasks.status, completedAt: studyPlanTasks.completedAt, priority: studyPlanTasks.priority, source: studyPlanTasks.source,
  }).from(studyPlanTasks).leftJoin(sections, eq(studyPlanTasks.sectionId, sections.id)).leftJoin(topics, eq(studyPlanTasks.topicId, topics.id))
    .where(eq(studyPlanTasks.studyPlanId, plan.id)).orderBy(asc(studyPlanTasks.taskDate), asc(studyPlanTasks.sortOrder));
  const progress = summarizeStudyPlanProgress(tasks, new Date());
  return { plan, tasks, progress } as const;
}

export async function updateMyStudyTask(taskId: string, input: { status?: 'pending' | 'in_progress' | 'completed' | 'skipped'; taskDate?: string }) {
  const userId = await ownerId();
  const db = getDb();
  const [task] = await db.select({ id: studyPlanTasks.id, planId: studyPlans.id })
    .from(studyPlanTasks).innerJoin(studyPlans, eq(studyPlanTasks.studyPlanId, studyPlans.id))
    .where(and(eq(studyPlanTasks.id, taskId), eq(studyPlans.userId, userId), eq(studyPlans.isActive, true))).limit(1);
  if (!task) throw new StudyPlanRequestError('Study plan task not found.', 404);
  const [updated] = await db.update(studyPlanTasks).set({
    status: input.status,
    taskDate: input.taskDate ? new Date(`${input.taskDate}T12:00:00.000Z`) : undefined,
    completedAt: input.status === 'completed' ? new Date() : input.status ? null : undefined,
  }).where(and(eq(studyPlanTasks.id, taskId), eq(studyPlanTasks.studyPlanId, task.planId))).returning();
  return updated;
}

export async function adaptMyAdaptiveStudyPlan(planId?: string): Promise<Awaited<ReturnType<typeof loadMyAdaptiveStudyPlan>>> {
  const userId = await ownerId();
  const db = getDb();
  const [plan] = await db.select().from(studyPlans).where(and(
    eq(studyPlans.userId, userId), eq(studyPlans.isActive, true), ...(planId ? [eq(studyPlans.id, planId)] : []),
  )).orderBy(desc(studyPlans.updatedAt)).limit(1);
  if (!plan) throw new StudyPlanRequestError('Create a study plan before adapting it.', 404);
  const performance = await currentPerformance(userId);
  const skills = performance.skills.length ? performance.skills : DEFAULT_STUDY_PLAN_SKILLS;
  const tasks = await db.select({
    id: studyPlanTasks.id, studyPlanId: studyPlanTasks.studyPlanId, title: studyPlanTasks.title, description: studyPlanTasks.description,
    sectionId: studyPlanTasks.sectionId, topicId: studyPlanTasks.topicId, taskDate: studyPlanTasks.taskDate,
    estimatedMinutes: studyPlanTasks.estimatedMinutes, sortOrder: studyPlanTasks.sortOrder, status: studyPlanTasks.status,
    priority: studyPlanTasks.priority, source: studyPlanTasks.source, completedAt: studyPlanTasks.completedAt,
    createdAt: studyPlanTasks.createdAt, section: sections.name, topic: topics.name,
  }).from(studyPlanTasks).leftJoin(sections, eq(studyPlanTasks.sectionId, sections.id))
    .leftJoin(topics, eq(studyPlanTasks.topicId, topics.id))
    .where(eq(studyPlanTasks.studyPlanId, plan.id)).orderBy(asc(studyPlanTasks.taskDate), asc(studyPlanTasks.sortOrder));
  const currentScores = Object.values(performance.currentPerformance).filter((score) => Number.isFinite(score) && score > 0);
  const lowest = currentScores.length ? Math.min(...currentScores) : 18;
  const targetGap = Math.max(0, (plan.targetScore ?? 24) - lowest);
  const storedSchedule = plan.schedule as { minutesPerDay?: number; daysAvailable?: string[] };
  const minutesPerDay = storedSchedule.minutesPerDay ?? 60;
  const { adaptPendingStudyTasks } = await import('./study-plan-engine');
  const adapted = adaptPendingStudyTasks(tasks.map((task) => ({
    ...task,
    topic: task.title === 'Mixed Review' ? 'Mixed Review' : task.topic,
  })), skills, targetGap, minutesPerDay);
  const topicIds = await resolveTopicIds(skills);
  const topicMap = new Map(topicIds.map((skill) => [`${skill.section}\u0000${skill.topic}`, skill.topicId]));
  await Promise.all(adapted.map((task) => task.status === 'completed' || task.status === 'skipped' || task.topic === 'Mixed Review' ? Promise.resolve() :
    db.update(studyPlanTasks).set({
      title: `${task.section} — ${task.topic}`,
      sectionId: topicIds.find((skill) => skill.section === task.section)?.sectionId ?? null,
      topicId: topicMap.get(`${task.section}\u0000${task.topic}`) ?? null,
      estimatedMinutes: task.estimatedMinutes ?? undefined,
      priority: task.priority ?? 0,
      source: task.source ?? 'baseline',
    }).where(eq(studyPlanTasks.id, task.id))));
  const nextSchedule = {
    ...storedSchedule,
    performanceFingerprint: performanceFingerprint({ ...performance, skills }),
  };
  await db.update(studyPlans).set({ schedule: nextSchedule, updatedAt: new Date() }).where(eq(studyPlans.id, plan.id));
  return loadMyAdaptiveStudyPlan(userId);
}
