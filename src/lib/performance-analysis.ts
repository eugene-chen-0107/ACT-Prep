export const PERFORMANCE_RECENT_WINDOW = 10;
export const MASTERY_MIN_ATTEMPTS = 5;
export const MASTERY_RECENT_WEIGHT = 0.7;
export const MASTERY_HISTORICAL_WEIGHT = 1 - MASTERY_RECENT_WEIGHT;

export type PerformanceAttempt = {
  questionId: string;
  attemptedAt: Date | string;
  section: string;
  topic: string | null;
  subtopic: string | null;
  difficulty: string | null;
  isCorrect: boolean;
  timeSpentSeconds: number;
  questionSnapshot: {
    prompt?: string;
    questionType?: string;
  } | null;
};

export type PerformanceDimension = 'overall' | 'section' | 'topic' | 'subtopic' | 'difficulty' | 'questionType';

export type PerformanceMetric = {
  key: string;
  label: string;
  dimension: PerformanceDimension;
  section?: string;
  topic?: string;
  attempts: number;
  correct: number;
  accuracy: number | null;
  recentAttempts: number;
  recentAccuracy: number | null;
  historicalAccuracy: number | null;
  averageTimeSeconds: number;
  repeatedMistakes: number;
  lastPracticed: string;
  masteryEstimate: number | null;
  masteryStatus: 'building_data' | 'estimated';
};

export type RepeatedQuestionMistake = {
  questionId: string;
  section: string;
  topic: string | null;
  prompt: string;
  incorrectAttempts: number;
  lastMistakeAt: string;
};

export type PerformanceAnalysis = {
  overall: PerformanceMetric;
  sections: PerformanceMetric[];
  topics: PerformanceMetric[];
  subtopics: PerformanceMetric[];
  difficulties: PerformanceMetric[];
  questionTypes: PerformanceMetric[];
  repeatedMistakes: RepeatedQuestionMistake[];
  totalAttempts: number;
  analyzedAt: string;
  methodology: {
    recentWindow: number;
    masteryMinimumAttempts: number;
    recentWeight: number;
    historicalWeight: number;
  };
};

type DatedAttempt = { attempt: PerformanceAttempt; time: number; iso: string };
type Group = { key: string; label: string; section?: string; topic?: string; attempts: DatedAttempt[] };

function percent(correct: number, attempts: number): number | null {
  return attempts ? Math.round((correct / attempts) * 100) : null;
}

function groupAttempts(
  attempts: DatedAttempt[],
  dimension: PerformanceDimension,
  getValue: (attempt: PerformanceAttempt) => { key: string; label: string; section?: string; topic?: string } | null,
): Group[] {
  const groups = new Map<string, Group>();
  for (const dated of attempts) {
    const value = getValue(dated.attempt);
    if (!value) continue;
    let group = groups.get(value.key);
    if (!group) {
      group = { ...value, dimension, attempts: [] } as Group;
      groups.set(value.key, group);
    }
    group.attempts.push(dated);
  }
  return [...groups.values()];
}

function metric(group: Group, dimension: PerformanceDimension): PerformanceMetric {
  const allAttempts = [...group.attempts].sort((a, b) => b.time - a.time);
  const recent = allAttempts.slice(0, PERFORMANCE_RECENT_WINDOW);
  const correct = allAttempts.filter(({ attempt }) => attempt.isCorrect).length;
  const recentCorrect = recent.filter(({ attempt }) => attempt.isCorrect).length;
  const recentAccuracy = percent(recentCorrect, recent.length);
  const historicalAccuracy = percent(correct, allAttempts.length);
  const incorrectByQuestion = new Map<string, number>();
  for (const { attempt } of allAttempts) {
    if (!attempt.isCorrect) incorrectByQuestion.set(attempt.questionId, (incorrectByQuestion.get(attempt.questionId) ?? 0) + 1);
  }
  const masteryEstimate = allAttempts.length >= MASTERY_MIN_ATTEMPTS && recentAccuracy !== null && historicalAccuracy !== null
    ? Math.round(recentAccuracy * MASTERY_RECENT_WEIGHT + historicalAccuracy * MASTERY_HISTORICAL_WEIGHT)
    : null;

  return {
    key: group.key,
    label: group.label,
    dimension,
    ...(group.section ? { section: group.section } : {}),
    ...(group.topic ? { topic: group.topic } : {}),
    attempts: allAttempts.length,
    correct,
    accuracy: historicalAccuracy,
    recentAttempts: recent.length,
    recentAccuracy,
    historicalAccuracy,
    averageTimeSeconds: allAttempts.length ? Math.round(allAttempts.reduce((sum, { attempt }) => sum + attempt.timeSpentSeconds, 0) / allAttempts.length) : 0,
    repeatedMistakes: [...incorrectByQuestion.values()].filter((count) => count > 1).length,
    lastPracticed: allAttempts[0]?.iso ?? '',
    masteryEstimate,
    masteryStatus: masteryEstimate === null ? 'building_data' : 'estimated',
  };
}

function sortedMetrics(groups: Group[], dimension: PerformanceDimension) {
  return groups
    .map((group) => metric(group, dimension))
    .sort((left, right) => left.label.localeCompare(right.label) || (left.topic ?? '').localeCompare(right.topic ?? ''));
}

export function analyzeQuestionAttemptPerformance(
  sourceAttempts: readonly PerformanceAttempt[],
  analyzedAt = new Date(),
): PerformanceAnalysis {
  const dated: DatedAttempt[] = sourceAttempts
    .map((attempt) => {
      const timestamp = new Date(attempt.attemptedAt);
      const time = timestamp.getTime();
      return Number.isFinite(time) ? { attempt, time, iso: timestamp.toISOString() } : null;
    })
    .filter((attempt): attempt is DatedAttempt => attempt !== null)
    .sort((left, right) => right.time - left.time);

  const overallGroup: Group = { key: 'overall', label: 'Overall', attempts: dated };
  const sections = sortedMetrics(groupAttempts(dated, 'section', (attempt) => ({ key: attempt.section, label: attempt.section })), 'section');
  const topics = sortedMetrics(groupAttempts(dated, 'topic', (attempt) => attempt.topic
    ? { key: `${attempt.section}\u0000${attempt.topic}`, label: attempt.topic, section: attempt.section }
    : null), 'topic');
  const subtopics = sortedMetrics(groupAttempts(dated, 'subtopic', (attempt) => attempt.topic && attempt.subtopic
    ? { key: `${attempt.section}\u0000${attempt.topic}\u0000${attempt.subtopic}`, label: attempt.subtopic, section: attempt.section, topic: attempt.topic }
    : null), 'subtopic');
  const difficulties = sortedMetrics(groupAttempts(dated, 'difficulty', (attempt) => attempt.difficulty
    ? { key: attempt.difficulty, label: attempt.difficulty }
    : null), 'difficulty');
  const questionTypes = sortedMetrics(groupAttempts(dated, 'questionType', (attempt) => attempt.questionSnapshot?.questionType
    ? { key: attempt.questionSnapshot.questionType, label: attempt.questionSnapshot.questionType }
    : null), 'questionType');

  const mistakesByQuestion = new Map<string, RepeatedQuestionMistake>();
  for (const { attempt, iso } of dated) {
    if (attempt.isCorrect) continue;
    const current = mistakesByQuestion.get(attempt.questionId);
    if (current) {
      current.incorrectAttempts += 1;
      if (iso > current.lastMistakeAt) current.lastMistakeAt = iso;
    } else {
      mistakesByQuestion.set(attempt.questionId, {
        questionId: attempt.questionId,
        section: attempt.section,
        topic: attempt.topic,
        prompt: attempt.questionSnapshot?.prompt ?? 'Question text unavailable',
        incorrectAttempts: 1,
        lastMistakeAt: iso,
      });
    }
  }
  const repeatedMistakes = [...mistakesByQuestion.values()]
    .filter(({ incorrectAttempts }) => incorrectAttempts > 1)
    .sort((left, right) => right.incorrectAttempts - left.incorrectAttempts || right.lastMistakeAt.localeCompare(left.lastMistakeAt));

  return {
    overall: metric(overallGroup, 'overall'),
    sections,
    topics,
    subtopics,
    difficulties,
    questionTypes,
    repeatedMistakes,
    totalAttempts: dated.length,
    analyzedAt: analyzedAt.toISOString(),
    methodology: {
      recentWindow: PERFORMANCE_RECENT_WINDOW,
      masteryMinimumAttempts: MASTERY_MIN_ATTEMPTS,
      recentWeight: MASTERY_RECENT_WEIGHT,
      historicalWeight: MASTERY_HISTORICAL_WEIGHT,
    },
  };
}
