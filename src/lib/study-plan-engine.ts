import type { PerformanceAnalysis } from './performance-analysis';

export const STUDY_PLAN_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export type StudyPlanSkill = { section: string; topic: string; accuracy: number; attempts: number; source: 'performance' | 'diagnostic' | 'baseline' };
export type StudyPlanInput = {
  targetScore: number;
  currentPerformance: Record<string, number>;
  diagnosticPerformance?: Record<string, number>;
  testDate: Date | string;
  daysAvailable: string[];
  minutesPerDay: number;
  skills: StudyPlanSkill[];
  selfReportedPerformance?: Record<string, number>;
};
export type GeneratedStudyTask = {
  day: typeof STUDY_PLAN_DAYS[number]; date: string; section: string; topic: string; minutes: number;
  title: string; description: string; priority: number; source: StudyPlanSkill['source'];
};
export type GeneratedWeeklyPlan = {
  startDate: string; targetScore: number; daysAvailable: string[]; minutesPerDay: number;
  tasks: GeneratedStudyTask[]; totalMinutes: number; adaptsToPerformance: true;
};

export function getStudyWeekStart(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

export function getNextStudyWeekStart(now: Date, availableDays: readonly string[] = STUDY_PLAN_DAYS) {
  const start = getStudyWeekStart(now);
  const todayIndex = (now.getDay() + 6) % 7;
  const hasRemainingDay = availableDays.some((day) => STUDY_PLAN_DAYS.indexOf(day as typeof STUDY_PLAN_DAYS[number]) > todayIndex);
  if (!hasRemainingDay) start.setDate(start.getDate() + 7);
  return start;
}

export const DEFAULT_STUDY_PLAN_SKILLS: StudyPlanSkill[] = [
  { section: 'Math', topic: 'Algebra', accuracy: 50, attempts: 0, source: 'baseline' },
  { section: 'English', topic: 'Punctuation', accuracy: 50, attempts: 0, source: 'baseline' },
  { section: 'Reading', topic: 'Main Ideas', accuracy: 50, attempts: 0, source: 'baseline' },
  { section: 'Science', topic: 'Data Interpretation', accuracy: 50, attempts: 0, source: 'baseline' },
];

function dateForWeekday(start: Date, day: typeof STUDY_PLAN_DAYS[number]) {
  const date = new Date(start);
  date.setDate(start.getDate() + STUDY_PLAN_DAYS.indexOf(day));
  return date;
}

function toLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function priority(skill: StudyPlanSkill, targetGap: number) {
  const lowSampleBonus = skill.attempts < 3 ? 6 : 0;
  const sourceBonus = skill.source === 'diagnostic' && skill.attempts < 3 ? 8 : 0;
  return Math.max(0, 100 - skill.accuracy) * 0.72 + Math.max(0, targetGap) * 0.18 + lowSampleBonus + sourceBonus;
}

export function deriveStudyPlanSkills(
  analysis: Pick<PerformanceAnalysis, 'topics'>,
  diagnostic?: { priorityTopics?: Array<{ section: string; topic: string; accuracy: number; attempts: number }> },
): StudyPlanSkill[] {
  const map = new Map<string, StudyPlanSkill>();
  // Diagnostic measures are the starting baseline. Live practice replaces a diagnostic
  // entry for that skill as soon as a student has recorded practice attempts.
  for (const topic of diagnostic?.priorityTopics ?? []) {
    map.set(`${topic.section}\u0000${topic.topic}`, { ...topic, source: 'diagnostic' });
  }
  for (const metric of analysis.topics) {
    const section = metric.section ?? 'Other';
    map.set(`${section}\u0000${metric.label}`, {
      section, topic: metric.label, accuracy: metric.recentAccuracy ?? metric.accuracy ?? 50,
      attempts: metric.attempts, source: 'performance',
    });
  }
  return [...map.values()];
}

export function generateWeeklyStudyPlan(input: StudyPlanInput, now = new Date()): GeneratedWeeklyPlan {
  const targetDate = new Date(`${String(input.testDate).slice(0, 10)}T12:00:00`);
  if (!Number.isFinite(targetDate.getTime())) throw new Error('A valid test date is required.');
  if (toLocalDateString(targetDate) <= toLocalDateString(now)) throw new Error('Test date must be in the future.');
  if (!Number.isInteger(input.targetScore) || input.targetScore < 1 || input.targetScore > 36) throw new Error('Target score must be between 1 and 36.');
  if (!Number.isInteger(input.minutesPerDay) || input.minutesPerDay < 5 || input.minutesPerDay > 240) throw new Error('Minutes per day must be between 5 and 240.');
  const days = [...new Set(input.daysAvailable)].filter((day): day is typeof STUDY_PLAN_DAYS[number] => STUDY_PLAN_DAYS.includes(day as typeof STUDY_PLAN_DAYS[number]))
    .sort((a, b) => STUDY_PLAN_DAYS.indexOf(a) - STUDY_PLAN_DAYS.indexOf(b));
  if (!days.length) throw new Error('Choose at least one available study day.');

  const reportedScores = Object.values(input.selfReportedPerformance ?? {}).filter((score) => Number.isFinite(score) && score >= 1 && score <= 36);
  const currentScores = reportedScores.length
    ? reportedScores
    : Object.values(input.currentPerformance).filter((score) => Number.isFinite(score) && score >= 1 && score <= 36);
  const diagnosticScores = Object.values(input.diagnosticPerformance ?? {}).filter((score) => Number.isFinite(score) && score >= 1 && score <= 36);
  const currentScore = currentScores.length ? currentScores.reduce((sum, score) => sum + score, 0) / currentScores.length
    : diagnosticScores.length ? diagnosticScores.reduce((sum, score) => sum + score, 0) / diagnosticScores.length : 18;
  const targetGap = Math.max(0, input.targetScore - currentScore);
  const ranked = [...(input.skills.length ? input.skills : DEFAULT_STUDY_PLAN_SKILLS)]
    .sort((a, b) => priority(b, targetGap) - priority(a, targetGap) || a.section.localeCompare(b.section) || a.topic.localeCompare(b.topic));
  const recurringReview = { section: 'Mixed Review', topic: 'Mixed Review', accuracy: 50, attempts: 0, source: 'baseline' as const };
  const daysUntilTest = Math.ceil((targetDate.getTime() - now.getTime()) / 86_400_000);
  const urgency = daysUntilTest >= 0 && daysUntilTest <= 21 ? 1.15 : 1;
  const weekStart = getNextStudyWeekStart(now, days);
  const availableSlots = days.filter((day) => {
    const plannedDate = dateForWeekday(weekStart, day);
    return toLocalDateString(plannedDate) > toLocalDateString(now);
  });
  const scheduledDays = availableSlots.length ? availableSlots : [...days];

  const tasks = scheduledDays.map((day, index) => {
    const isReviewDay = days.length >= 3 && index === days.length - 1;
    const skill = isReviewDay ? recurringReview : ranked[index % Math.max(1, ranked.length)] ?? recurringReview;
    const minutes = Math.max(5, Math.min(input.minutesPerDay, Math.round(input.minutesPerDay * (isReviewDay ? 1.15 : urgency))));
    const score = skill.topic === 'Mixed Review' ? 0 : Math.round(priority(skill, targetGap));
    return {
      day, date: toLocalDateString(dateForWeekday(weekStart, day)), section: skill.section,
      topic: skill.topic, minutes,
      title: skill.topic === 'Mixed Review' ? 'Mixed Review' : `${skill.section} — ${skill.topic}`,
      description: skill.topic === 'Mixed Review'
        ? 'Revisit recent errors and rotate through the skills you practiced this week.'
        : skill.source === 'performance' && skill.accuracy >= 75
          ? 'Maintain this improving skill with a short retrieval and review session.'
          : skill.accuracy < 60
            ? 'Prioritize guided practice, then review what made missed answers difficult.'
            : 'Practice this skill and check your progress again as new results come in.',
      priority: score, source: skill.source,
    };
  });

  return {
    startDate: toLocalDateString(weekStart), targetScore: input.targetScore,
    daysAvailable: days, minutesPerDay: input.minutesPerDay, tasks,
    totalMinutes: tasks.reduce((sum, task) => sum + task.minutes, 0), adaptsToPerformance: true,
  };
}

export function adaptPendingStudyTasks<T extends { status: string; section: string | null; topic: string | null; priority?: number; source?: string; estimatedMinutes?: number | null }>(
  tasks: readonly T[], skills: readonly StudyPlanSkill[], targetGap: number, minutesPerDay = 240,
): T[] {
  const ranked = [...skills].sort((a, b) => priority(b, targetGap) - priority(a, targetGap) || a.section.localeCompare(b.section) || a.topic.localeCompare(b.topic));
  let cursor = 0;
  return tasks.map((task) => {
    if (task.status !== 'pending' && task.status !== 'in_progress') return task;
    if (task.topic === 'Mixed Review') return task;
    const skill = ranked[cursor++ % Math.max(1, ranked.length)];
    return skill ? {
      ...task, section: skill.section, topic: skill.topic, priority: Math.round(priority(skill, targetGap)), source: skill.source,
      estimatedMinutes: skill.accuracy < 60
        ? minutesPerDay
        : Math.max(5, Math.round(minutesPerDay * 0.6)),
    } : task;
  });
}

export function summarizeStudyPlanProgress(
  tasks: readonly { status: string; taskDate: Date | string | null; estimatedMinutes: number | null }[], date = new Date(),
) {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const weekStart = getStudyWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const inRange = (task: typeof tasks[number], start: Date, end: Date) => {
    if (!task.taskDate) return false;
    const time = new Date(task.taskDate).getTime();
    return Number.isFinite(time) && time >= start.getTime() && time < end.getTime();
  };
  const daily = tasks.filter((task) => inRange(task, dayStart, dayEnd) && task.status !== 'skipped');
  const weekly = tasks.filter((task) => inRange(task, weekStart, weekEnd) && task.status !== 'skipped');
  const done = (items: typeof tasks) => items.filter(({ status }) => status === 'completed').length;
  const minutes = (items: typeof tasks) => items.reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0);
  return {
    daily: { total: daily.length, completed: done(daily), minutes: minutes(daily) },
    weekly: { total: weekly.length, completed: done(weekly), minutes: minutes(weekly) },
  };
}
