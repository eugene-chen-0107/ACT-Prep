import { analyzeQuestionAttemptPerformance, type PerformanceAnalysis, type PerformanceAttempt } from './performance-analysis';

export type ScoreHistoryInput = { date: Date | string; score: number; source: 'diagnostic' | 'practice test'; label: string };
export type ProgressAnalyticsInput = {
  practiceAttempts: readonly PerformanceAttempt[];
  diagnosticAttempts: readonly PerformanceAttempt[];
  testAttempts?: readonly PerformanceAttempt[];
  diagnosticScores: readonly ScoreHistoryInput[];
  diagnosticSectionScores?: readonly { date: Date | string; section: string; score: number; label: string }[];
  practiceTestSectionScores?: readonly { date: Date | string; section: string; score: number; label: string }[];
  practiceTestScores: readonly ScoreHistoryInput[];
  topicPracticeLinks?: Readonly<Record<string, string>>;
  now?: Date;
};
export type ProgressChange = {
  section: string;
  topic: string;
  previousAccuracy: number;
  recentAccuracy: number;
  previousAttempts: number;
  recentAttempts: number;
  change: number;
};

function eligibleScoreDate(date: Date | string, now: Date) {
  const value = new Date(date);
  return Number.isFinite(value.getTime()) && value.getTime() <= now.getTime();
}

function validAttempts(attempts: readonly PerformanceAttempt[]) {
  return [...attempts].filter((attempt) => Number.isFinite(new Date(attempt.attemptedAt).getTime()))
    .sort((left, right) => new Date(left.attemptedAt).getTime() - new Date(right.attemptedAt).getTime());
}

function compareCohorts(attempts: readonly PerformanceAttempt[]) {
  if (attempts.length < 6) return null;
  const countPerCohort = Math.min(10, Math.floor(attempts.length / 2));
  const previous = attempts.slice(-(countPerCohort * 2), -countPerCohort);
  const recent = attempts.slice(-countPerCohort);
  const accuracy = (cohort: readonly PerformanceAttempt[]) => Math.round(cohort.filter(({ isCorrect }) => isCorrect).length / cohort.length * 100);
  return {
    previousAccuracy: accuracy(previous), recentAccuracy: accuracy(recent),
    previousAttempts: previous.length, recentAttempts: recent.length,
    change: accuracy(recent) - accuracy(previous),
  };
}

function weeklyAccuracy(attempts: readonly PerformanceAttempt[], now: Date) {
  const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const currentMonday = new Date(utcToday);
  currentMonday.setUTCDate(currentMonday.getUTCDate() - ((currentMonday.getUTCDay() + 6) % 7));
  const weeks = new Map<string, PerformanceAttempt[]>();
  for (const attempt of attempts) {
    const date = new Date(attempt.attemptedAt);
    const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    const group = weeks.get(key) ?? [];
    group.push(attempt);
    weeks.set(key, group);
  }
  return [...weeks.entries()]
    .filter(([week]) => week <= currentMonday.toISOString().slice(0, 10))
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-12)
    .map(([week, group]) => ({
      week,
      label: new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${week}T12:00:00Z`)),
      accuracy: Math.round(group.filter(({ isCorrect }) => isCorrect).length / group.length * 100),
      attempts: group.length,
    }));
}

export function buildProgressAnalytics(input: ProgressAnalyticsInput) {
  const practiceAttempts = validAttempts(input.practiceAttempts);
  const testAttempts = validAttempts(input.testAttempts ?? []);
  const diagnosticAttempts = validAttempts(input.diagnosticAttempts);
  const now = input.now ?? new Date();
  const allAttempts = validAttempts([...practiceAttempts, ...testAttempts, ...diagnosticAttempts]).filter((attempt) => new Date(attempt.attemptedAt).getTime() <= now.getTime());
  const eligiblePracticeAttempts = practiceAttempts.filter((attempt) => new Date(attempt.attemptedAt).getTime() <= now.getTime());
  const eligibleTestAttempts = testAttempts.filter((attempt) => new Date(attempt.attemptedAt).getTime() <= now.getTime());
  const eligibleDiagnosticAttempts = diagnosticAttempts.filter((attempt) => new Date(attempt.attemptedAt).getTime() <= now.getTime());
  const analysis: PerformanceAnalysis = analyzeQuestionAttemptPerformance(allAttempts, now);
  const historicalAttempts = validAttempts([...practiceAttempts, ...testAttempts, ...diagnosticAttempts]);
  const sectionNames = new Set([
    ...analysis.sections.map(({ label }) => label),
    ...(input.diagnosticSectionScores ?? []).filter(({ date }) => eligibleScoreDate(date, now)).map(({ section }) => section),
    ...(input.practiceTestSectionScores ?? []).filter(({ date }) => eligibleScoreDate(date, now)).map(({ section }) => section),
  ]);
  const sectionProgress = [...sectionNames].sort().map((name) => {
    const metric = analysis.sections.find((section) => section.label === name);
    const cohort = compareCohorts(historicalAttempts.filter((attempt) => attempt.section === name));
    return {
      section: name, attempts: metric?.attempts ?? 0, accuracy: metric?.accuracy ?? null,
      previousAccuracy: cohort?.previousAccuracy ?? null, recentAccuracy: cohort?.recentAccuracy ?? metric?.accuracy ?? null,
      change: cohort?.change ?? null, previousAttempts: cohort?.previousAttempts ?? 0,
      recentAttempts: cohort?.recentAttempts ?? metric?.attempts ?? 0,
    };
  });
  const topicMastery = analysis.topics.map((topic) => {
    const cohort = compareCohorts(historicalAttempts.filter((attempt) => attempt.section === topic.section && attempt.topic === topic.label));
    return {
      section: topic.section ?? 'Section', topic: topic.label, attempts: topic.attempts,
      accuracy: topic.accuracy, mastery: topic.masteryEstimate, masteryStatus: topic.masteryStatus,
      previousAccuracy: cohort?.previousAccuracy ?? null, recentAccuracy: cohort?.recentAccuracy ?? topic.accuracy,
      change: cohort?.change ?? null, previousAttempts: cohort?.previousAttempts ?? 0,
      recentAttempts: cohort?.recentAttempts ?? topic.attempts,
      practiceHref: input.topicPracticeLinks?.[`${topic.section}\u0000${topic.label}`] ?? '/practice',
    };
  }).sort((left, right) => (left.accuracy ?? 0) - (right.accuracy ?? 0) || right.attempts - left.attempts || left.topic.localeCompare(right.topic));

  const scoreHistory = [...input.diagnosticScores, ...input.practiceTestScores]
    .filter(({ date, score }) => eligibleScoreDate(date, now) && Number.isFinite(score) && score >= 1 && score <= 36)
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
    .map((point) => ({ ...point, date: new Date(point.date).toISOString() }));
  const sectionScoreHistory = [...(input.diagnosticSectionScores ?? []).map((point) => ({ ...point, source: 'Diagnostic' })),
    ...(input.practiceTestSectionScores ?? []).map((point) => ({ ...point, source: 'Practice test' }))]
    .filter(({ date, score }) => eligibleScoreDate(date, now) && Number.isFinite(score) && score >= 1 && score <= 36)
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
    .map((point) => ({ ...point, date: new Date(point.date).toISOString() }));
  const latestScore = scoreHistory.at(-1) ?? null;
  const earliestScore = scoreHistory[0] ?? null;
  const scoreChange = earliestScore && latestScore && scoreHistory.length > 1
    ? latestScore.score - earliestScore.score : null;

  const changes: ProgressChange[] = topicMastery.flatMap((topic) => topic.change === null ? [] : [{
    section: topic.section, topic: topic.topic,
    previousAccuracy: topic.previousAccuracy!, recentAccuracy: topic.recentAccuracy!,
    previousAttempts: topic.previousAttempts, recentAttempts: topic.recentAttempts, change: topic.change,
  }]).sort((left, right) => Math.abs(right.change) - Math.abs(left.change) || left.topic.localeCompare(right.topic));
  const improved = changes.filter(({ change }) => change > 0).sort((left, right) => right.change - left.change);
  const declined = changes.filter(({ change }) => change < 0).sort((left, right) => left.change - right.change);
  const weaknesses = topicMastery.filter(({ accuracy, attempts }) => accuracy !== null && accuracy < 70 && attempts >= 2).slice(0, 5);
  const nextPractice = weaknesses.slice(0, 3).map((topic) => ({
    ...topic,
    reason: topic.change !== null && topic.change < 0
      ? `Accuracy fell ${Math.abs(topic.change)} points across the two most recent ${topic.previousAttempts}- and ${topic.recentAttempts}-answer groups.`
      : `${topic.accuracy}% accuracy across ${topic.attempts} recorded answers leaves room to strengthen this skill.`,
  }));

  const skillAttempts = validAttempts([...practiceAttempts, ...testAttempts, ...diagnosticAttempts])
    .filter((attempt) => new Date(attempt.attemptedAt).getTime() <= now.getTime());
  const uniqueQuestionIds = new Set(skillAttempts.map(({ questionId }) => questionId));
  const recentAttempts = skillAttempts.slice(-10);
  const recentPerformance = {
    attempts: recentAttempts.length,
    correct: recentAttempts.filter(({ isCorrect }) => isCorrect).length,
    accuracy: recentAttempts.length ? Math.round(recentAttempts.filter(({ isCorrect }) => isCorrect).length / recentAttempts.length * 100) : null,
    from: recentAttempts[0]?.attemptedAt ? new Date(recentAttempts[0].attemptedAt).toISOString() : null,
    to: recentAttempts.at(-1)?.attemptedAt ? new Date(recentAttempts.at(-1)!.attemptedAt).toISOString() : null,
  };
  const weeklyAccuracyTrend = weeklyAccuracy(eligiblePracticeAttempts, now);

  return {
    analysis: analyzeQuestionAttemptPerformance(skillAttempts, now),
    scoreHistory,
    sectionScoreHistory,
    scoreChange,
    latestScore,
    sectionProgress,
    topicMastery,
    accuracyTrend: weeklyAccuracyTrend,
    changes,
    improved,
    declined,
    weaknesses,
    nextPractice,
    summary: {
      questionsAnswered: skillAttempts.length,
      uniqueQuestions: uniqueQuestionIds.size,
    practiceQuestions: eligiblePracticeAttempts.length,
    testQuestions: eligibleTestAttempts.length,
    diagnosticQuestions: eligibleDiagnosticAttempts.length,
    practiceTimeSeconds: eligiblePracticeAttempts.reduce((sum, attempt) => sum + Math.max(0, attempt.timeSpentSeconds), 0),
    testTimeSeconds: eligibleTestAttempts.reduce((sum, attempt) => sum + Math.max(0, attempt.timeSpentSeconds), 0),
    diagnosticTimeSeconds: eligibleDiagnosticAttempts.reduce((sum, attempt) => sum + Math.max(0, attempt.timeSpentSeconds), 0),
    totalTrackedTimeSeconds: eligiblePracticeAttempts.reduce((sum, attempt) => sum + Math.max(0, attempt.timeSpentSeconds), 0)
      + eligibleTestAttempts.reduce((sum, attempt) => sum + Math.max(0, attempt.timeSpentSeconds), 0)
      + eligibleDiagnosticAttempts.reduce((sum, attempt) => sum + Math.max(0, attempt.timeSpentSeconds), 0),
    },
    recentPerformance,
    hasPracticeData: skillAttempts.length > 0 || scoreHistory.length > 0,
  };
}
