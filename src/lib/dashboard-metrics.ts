export type DashboardAttempt = {
  questionId: string;
  attemptedAt: Date | string;
  section: string;
  topic: string | null;
  subtopic: string | null;
  isCorrect: boolean;
  timeSpentSeconds: number;
  questionSnapshot: { prompt?: string; estimatedTimeSeconds?: number } | null;
};

export type DashboardSection = { id: string; name: string };
export type DashboardTopic = { id: string; sectionId: string; sectionName: string; name: string };

export type DashboardMetrics = ReturnType<typeof buildDashboardMetrics>;

function dateKey(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function shiftDateKey(key: string, days: number) {
  const date = new Date(`${key}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function accuracy(attempts: DashboardAttempt[]) {
  return attempts.length ? Math.round((attempts.filter((attempt) => attempt.isCorrect).length / attempts.length) * 100) : null;
}

function practiceHref(sectionId?: string, topicId?: string) {
  const params = new URLSearchParams();
  if (sectionId) params.set('sectionId', sectionId);
  if (topicId) params.set('topicId', topicId);
  params.set('limit', '10');
  const query = params.toString();
  return query ? `/practice?${query}` : '/practice';
}

export function buildDashboardMetrics(input: {
  now: Date;
  timeZone: string;
  attempts: DashboardAttempt[];
  sections: DashboardSection[];
  topics: DashboardTopic[];
  targetScore: number | null;
  latestTestScore?: number | null;
  weeklyGoalMinutes: number | null;
  activePracticeSessionId: string | null;
}) {
  const safeTimeZone = (() => {
    try { new Intl.DateTimeFormat('en', { timeZone: input.timeZone }); return input.timeZone; }
    catch { return 'UTC'; }
  })();
  const todayKey = dateKey(input.now, safeTimeZone);
  const datedAttempts = input.attempts
    .map((attempt) => ({ attempt, timestamp: new Date(attempt.attemptedAt) }))
    .filter(({ timestamp }) => !Number.isNaN(timestamp.getTime()))
    .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime());
  const recentAttempts = datedAttempts.map(({ attempt }) => attempt);
  const todayAttempts = datedAttempts.filter(({ timestamp }) => dateKey(timestamp, safeTimeZone) === todayKey);
  const todaySeconds = todayAttempts.reduce((sum, { attempt }) => sum + attempt.timeSpentSeconds, 0);

  const attemptedDays = new Set(datedAttempts.map(({ timestamp }) => dateKey(timestamp, safeTimeZone)));
  let streak = 0;
  let streakStart = todayKey;
  if (!attemptedDays.has(todayKey) && attemptedDays.has(shiftDateKey(todayKey, -1))) {
    streakStart = shiftDateKey(todayKey, -1);
  }
  while (attemptedDays.has(streakStart)) {
    streak += 1;
    streakStart = shiftDateKey(streakStart, -1);
  }

  const activity = Array.from({ length: 7 }, (_, index) => {
    const key = shiftDateKey(todayKey, index - 6);
    const dayAttempts = datedAttempts.filter(({ timestamp }) => dateKey(timestamp, safeTimeZone) === key);
    const labelDate = new Date(`${key}T12:00:00.000Z`);
    return {
      date: key,
      label: new Intl.DateTimeFormat('en', { timeZone: 'UTC', weekday: 'short' }).format(labelDate),
      minutes: Math.round(dayAttempts.reduce((sum, { attempt }) => sum + attempt.timeSpentSeconds, 0) / 60),
      questions: dayAttempts.length,
    };
  });

  const bySection = new Map<string, DashboardAttempt[]>();
  for (const attempt of recentAttempts) {
    const group = bySection.get(attempt.section) ?? [];
    group.push(attempt);
    bySection.set(attempt.section, group);
  }
  const sectionPerformance = input.sections.map((section) => {
    const group = bySection.get(section.name) ?? [];
    return { ...section, attempts: group.length, accuracy: accuracy(group) };
  });

  const topicGroups = new Map<string, { section: string; topic: string; attempts: DashboardAttempt[] }>();
  for (const attempt of recentAttempts) {
    if (!attempt.topic) continue;
    const key = `${attempt.section}\u0000${attempt.topic}`;
    const group = topicGroups.get(key) ?? { section: attempt.section, topic: attempt.topic, attempts: [] };
    group.attempts.push(attempt);
    topicGroups.set(key, group);
  }
  const topicPerformance = [...topicGroups.values()].map((group) => {
    const catalogTopic = input.topics.find((topic) => topic.sectionName === group.section && topic.name === group.topic);
    const recentTopicAttempts = group.attempts.slice(0, 10);
    return {
      section: group.section,
      topic: group.topic,
      attempts: recentTopicAttempts.length,
      accuracy: accuracy(recentTopicAttempts) ?? 0,
      href: practiceHref(catalogTopic?.sectionId, catalogTopic?.id),
    };
  }).sort((left, right) => left.accuracy - right.accuracy || right.attempts - left.attempts);

  const weakestTopic = topicPerformance[0] ?? null;
  const recommendation = weakestTopic
    ? (() => {
        const sample = recentAttempts
          .filter((attempt) => attempt.section === weakestTopic.section && attempt.topic === weakestTopic.topic)
          .slice(0, 10);
        const averageSeconds = sample.reduce((sum, attempt) => sum + (attempt.questionSnapshot?.estimatedTimeSeconds ?? 60), 0) / sample.length;
        return { ...weakestTopic, estimatedMinutes: Math.max(1, Math.ceil(averageSeconds * 10 / 60)), questionCount: 10 };
      })()
    : null;
  const recentMistakes = datedAttempts
    .filter(({ attempt }) => !attempt.isCorrect)
    .slice(0, 3)
    .map(({ attempt }) => ({
      questionId: attempt.questionId,
      prompt: attempt.questionSnapshot?.prompt ?? 'Question text unavailable',
      section: attempt.section,
      topic: attempt.topic,
      href: practiceHref(input.sections.find((section) => section.name === attempt.section)?.id,
        input.topics.find((topic) => topic.sectionName === attempt.section && topic.name === attempt.topic)?.id),
    }));

  const currentWeekStart = shiftDateKey(todayKey, -6);
  const previousWeekStart = shiftDateKey(todayKey, -13);
  const previousWeekEnd = shiftDateKey(todayKey, -7);
  const thisWeek = datedAttempts.filter(({ timestamp }) => {
    const key = dateKey(timestamp, safeTimeZone);
    return key >= currentWeekStart && key <= todayKey;
  }).map(({ attempt }) => attempt);
  const previousWeek = datedAttempts.filter(({ timestamp }) => {
    const key = dateKey(timestamp, safeTimeZone);
    return key >= previousWeekStart && key <= previousWeekEnd;
  }).map(({ attempt }) => attempt);
  const thisWeekAccuracy = accuracy(thisWeek);
  const previousWeekAccuracy = accuracy(previousWeek);
  const accuracyChange = thisWeekAccuracy !== null && previousWeekAccuracy !== null
    ? thisWeekAccuracy - previousWeekAccuracy
    : null;

  const latestAttempt = datedAttempts[0]?.attempt;
  const latestTopic = latestAttempt?.topic
    ? input.topics.find((topic) => topic.sectionName === latestAttempt.section && topic.name === latestAttempt.topic)
    : undefined;
  const latestSection = latestAttempt
    ? input.sections.find((section) => section.name === latestAttempt.section)
    : undefined;
  const continueHref = input.activePracticeSessionId
    ? '/practice'
    : latestAttempt ? practiceHref(latestSection?.id, latestTopic?.id) : '/practice';
  const weeklyGoalMinutes = input.weeklyGoalMinutes ?? 120;
  const dailyGoalMinutes = Math.ceil(weeklyGoalMinutes / 7);

  return {
    targetScore: input.targetScore,
    estimatedScore: null as number | null,
    latestTestScore: input.latestTestScore ?? null,
    targetProgress: input.targetScore && input.latestTestScore
      ? Math.max(0, Math.min(100, Math.round(((input.latestTestScore - 1) / (input.targetScore - 1)) * 100)))
      : null,
    today: {
      minutes: Math.floor(todaySeconds / 60),
      goalMinutes: dailyGoalMinutes,
      goalProgress: dailyGoalMinutes ? Math.min(100, Math.round((todaySeconds / 60 / dailyGoalMinutes) * 100)) : null,
    },
    streak,
    activity,
    sectionPerformance,
    topicPerformance,
    recommendation,
    recentMistakes,
    continueHref,
    hasStudyToContinue: Boolean(input.activePracticeSessionId || latestAttempt),
    accuracyChange,
    thisWeekAttempts: thisWeek.length,
  };
}
