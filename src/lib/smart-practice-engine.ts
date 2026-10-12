import type { PerformanceAnalysis, PerformanceAttempt } from './performance-analysis';
import type { UnifiedQuestion } from './question-provider';
import { toStudentPracticeQuestion, type StudentPracticeQuestion } from './practice-flow';

export const SMART_SESSION_PRESETS = [5, 10, 20, 30] as const;
export const SMART_CUSTOM_MINUTES = 1;
export const SMART_CUSTOM_MAX_MINUTES = 120;
export const SMART_MAX_QUESTIONS_PER_SESSION = 100;
const RECENT_TOPIC_COOLDOWN_DAYS = 1;
const RECENT_QUESTION_WINDOW_DAYS = 14;

type SmartAttempt = PerformanceAttempt & { selectedAnswer?: string | null };

export type SmartPracticeContext = {
  now: Date;
  durationMinutes: number;
  attempts: readonly SmartAttempt[];
  analysis: PerformanceAnalysis;
  questions: readonly UnifiedQuestion[];
  targetScore: number | null;
  latestTestScore: number | null;
  targetTestDate: Date | string | null;
};

export type SmartPracticeRecommendation = {
  question: UnifiedQuestion;
  recommendationScore: number;
  reason: string;
  balance: {
    weakness: number;
    recentMistakes: number;
    spacedReview: number;
    responseTime: number;
    goalUrgency: number;
    variety: number;
    difficulty: number;
  };
};

export type SmartPracticePlan = {
  durationMinutes: number;
  estimatedQuestionCount: number;
  estimatedMinutes: number;
  recommendations: SmartPracticeRecommendation[];
  summary: string;
};

export type StudentSmartPracticePlan = Omit<SmartPracticePlan, 'recommendations'> & {
  recommendations: Array<Omit<SmartPracticeRecommendation, 'question'> & { question: StudentPracticeQuestion }>;
};

/** Answer keys and explanations stay server-side until the usual submit endpoint returns feedback. */
export function toStudentSmartPracticePlan(plan: SmartPracticePlan): StudentSmartPracticePlan {
  return {
    ...plan,
    recommendations: plan.recommendations.map(({ question, ...recommendation }) => ({
      ...recommendation,
      question: toStudentPracticeQuestion(question),
    })),
  };
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function topicKey(section: string, topic: string) {
  return `${section}\u0000${topic}`;
}

function daysSince(value: Date | string | null | undefined, now: Date) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, (now.getTime() - time) / 86_400_000);
}

function daysUntil(value: Date | string | null | undefined, now: Date) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  return (time - now.getTime()) / 86_400_000;
}

function metricFor(analysis: PerformanceAnalysis, section: string, topic: string) {
  return analysis.topics.find((metric) => metric.section === section && metric.label === topic);
}

function attemptsForTopic(attempts: readonly SmartAttempt[], section: string, topic: string) {
  return attempts.filter((attempt) => attempt.section === section && attempt.topic === topic)
    .sort((left, right) => new Date(right.attemptedAt).getTime() - new Date(left.attemptedAt).getTime());
}

function topicWeakness(analysis: PerformanceAnalysis, section: string, topic: string) {
  const metric = metricFor(analysis, section, topic);
  if (!metric || metric.accuracy === null) return 55;
  const recent = metric.recentAccuracy ?? metric.accuracy;
  return clamp((100 - metric.accuracy) * 0.45 + (100 - recent) * 0.55);
}

function mistakePriority(attempts: readonly SmartAttempt[], section: string, topic: string, now: Date) {
  const mistakes = attempts.filter((attempt) => attempt.section === section && attempt.topic === topic && !attempt.isCorrect);
  if (!mistakes.length) return 0;
  return clamp(mistakes.reduce((total, attempt) => {
    const age = daysSince(attempt.attemptedAt, now) ?? 30;
    const recency = age <= 1 ? 1 : age <= 3 ? 0.8 : age <= 7 ? 0.5 : age <= 14 ? 0.25 : 0.05;
    return total + recency * (attempts.filter((item) => item.questionId === attempt.questionId && !item.isCorrect).length > 1 ? 1.3 : 1);
  }, 0) * 28);
}

function spacingPriority(lastPracticed: string | null, now: Date) {
  const age = daysSince(lastPracticed, now);
  if (age === null) return 72;
  if (age < RECENT_TOPIC_COOLDOWN_DAYS) return 8;
  if (age < 2) return 35;
  if (age < 4) return 75;
  if (age < 8) return 90;
  return 68;
}

function responseTimePriority(topicAttempts: readonly SmartAttempt[], candidateSeconds: number) {
  if (!topicAttempts.length) return 40;
  const average = topicAttempts.reduce((sum, attempt) => sum + attempt.timeSpentSeconds, 0) / topicAttempts.length;
  const expected = Math.max(1, candidateSeconds);
  const ratio = average / expected;
  if (ratio >= 1.6) return 100;
  if (ratio >= 1.3) return 80;
  if (ratio >= 1.1) return 62;
  if (ratio <= 0.65) return 24;
  if (ratio <= 0.8) return 35;
  return 50;
}

function goalUrgency(context: SmartPracticeContext) {
  const days = daysUntil(context.targetTestDate, context.now);
  if (days === null || !Number.isFinite(days) || days <= 0) return 0;
  const deadlinePressure = days <= 7 ? 100 : days <= 30 ? 75 : days <= 60 ? 45 : 20;
  if (context.targetScore === null || context.latestTestScore === null) return Math.round(deadlinePressure * 0.2);
  const scoreGap = clamp(((context.targetScore - context.latestTestScore) / Math.max(context.targetScore - 1, 1)) * 100);
  return Math.round(deadlinePressure * (0.4 + scoreGap / 100 * 0.6));
}

function difficultyLevel(difficulty: UnifiedQuestion['difficulty']) {
  return difficulty === 'easy' ? 0 : difficulty === 'medium' ? 1 : 2;
}

function targetDifficulty(context: SmartPracticeContext, section: string, topic: string, topicSelections: number) {
  const metric = metricFor(context.analysis, section, topic);
  const accuracy = metric?.recentAccuracy ?? metric?.accuracy ?? 50;
  if (accuracy < 55) return topicSelections === 0 ? 0 : 1;
  if (accuracy < 78) return topicSelections >= 3 ? 2 : 1;
  return topicSelections % 2 === 0 ? 2 : 1;
}

function difficultyPriority(question: UnifiedQuestion, target: number) {
  return clamp(100 - Math.abs(difficultyLevel(question.difficulty) - target) * 48);
}

function baseTopicScore(context: SmartPracticeContext, section: string, topic: string, candidateSeconds: number, goal: number) {
  const metric = metricFor(context.analysis, section, topic);
  const topicAttempts = attemptsForTopic(context.attempts, section, topic);
  const weakness = topicWeakness(context.analysis, section, topic);
  const mistakes = mistakePriority(context.attempts, section, topic, context.now);
  const spacedReview = spacingPriority(metric?.lastPracticed ?? null, context.now);
  const responseTime = responseTimePriority(topicAttempts, candidateSeconds);
  const goalUrgencyScore = Math.round(goal * (0.5 + weakness / 200));
  // Fixed weights make the result explainable and fully deterministic.
  const weighted = weakness * 0.34 + mistakes * 0.22 + spacedReview * 0.17 + responseTime * 0.12 + goalUrgencyScore * 0.15;
  return { score: weighted, weakness, mistakes, spacedReview, responseTime, goalUrgency: goalUrgencyScore, topicAttempts, metric };
}

function repeatedQuestionPenalty(attempts: readonly SmartAttempt[], questionId: string, now: Date) {
  const last = attempts.filter((attempt) => attempt.questionId === questionId)
    .map((attempt) => daysSince(attempt.attemptedAt, now))
    .filter((age): age is number => age !== null)
    .sort((left, right) => left - right)[0];
  if (last === undefined) return 0;
  if (last <= 1) return 75;
  if (last <= 3) return 55;
  if (last <= 7) return 30;
  if (last <= RECENT_QUESTION_WINDOW_DAYS) return 12;
  return 0;
}

function recentTopicPenalty(attempts: readonly SmartAttempt[], section: string, topic: string, now: Date) {
  const latest = attemptsForTopic(attempts, section, topic)[0];
  const age = daysSince(latest?.attemptedAt, now);
  return age !== null && age < RECENT_TOPIC_COOLDOWN_DAYS ? 35 : 0;
}

function varied(question: UnifiedQuestion, recommendations: readonly SmartPracticeRecommendation[]) {
  const recent = recommendations.slice(-3);
  const sameTypeCount = recent.filter(({ question: prior }) => prior.questionType === question.questionType).length;
  const sectionCount = recommendations.filter(({ question: prior }) => prior.section === question.section).length;
  return (sameTypeCount === 0 ? 16 : sameTypeCount === 1 ? 5 : -16) - sectionCount * 9;
}

function isStrongSkill(context: SmartPracticeContext, section: string, topic: string) {
  const metric = metricFor(context.analysis, section, topic);
  return Boolean(metric && metric.attempts >= 5 && (metric.masteryEstimate ?? metric.accuracy ?? 0) >= 80);
}

function makeReason(balance: SmartPracticeRecommendation['balance'], strongReview: boolean) {
  if (strongReview) return 'A brief spaced review keeps a strength fresh.';
  if (balance.recentMistakes >= 55) return 'Reinforces a recent mistake before it fades.';
  if (balance.weakness >= 58) return 'Targets a skill where your recent accuracy can improve.';
  if (balance.spacedReview >= 75) return 'Returns to this skill after a useful review interval.';
  if (balance.responseTime >= 75) return 'Builds fluency on a question type taking you longer.';
  return 'Adds a varied question to keep your practice balanced.';
}

export function validateSmartDuration(minutes: number) {
  return Number.isInteger(minutes) && minutes >= SMART_CUSTOM_MINUTES && minutes <= SMART_CUSTOM_MAX_MINUTES;
}

export function createSmartPracticePlan(context: SmartPracticeContext): SmartPracticePlan {
  if (!validateSmartDuration(context.durationMinutes)) throw new Error('Session length must be between 1 and 120 whole minutes.');
  const available = [...context.questions].sort((left, right) => left.id.localeCompare(right.id));
  if (!available.length) return {
    durationMinutes: context.durationMinutes,
    estimatedQuestionCount: 0,
    estimatedMinutes: 0,
    recommendations: [],
    summary: 'No published questions are available for Smart Practice yet.',
  };

  const typicalSeconds = Math.max(1, available.map(({ estimatedTimeSeconds }) => estimatedTimeSeconds).sort((a, b) => a - b)[Math.floor((available.length - 1) / 2)]);
  const requestedCount = Math.max(1, Math.ceil(context.durationMinutes * 60 / typicalSeconds));
  const targetCount = Math.min(requestedCount, available.length, SMART_MAX_QUESTIONS_PER_SESSION);
  const goal = goalUrgency(context);
  const strongestSkill = [...context.analysis.topics]
    .filter((metric) => metric.attempts >= 5 && (metric.masteryEstimate ?? metric.accuracy ?? 0) >= 80)
    .sort((left, right) => (right.masteryEstimate ?? right.accuracy ?? 0) - (left.masteryEstimate ?? left.accuracy ?? 0) || left.key.localeCompare(right.key))[0];
  const strongReviewQuestionIds = strongestSkill
    ? available.filter((question) => question.section === strongestSkill.section && question.topic === strongestSkill.label).map(({ id }) => id)
    : [];
  const chosen: SmartPracticeRecommendation[] = [];
  const selectedCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();

  while (chosen.length < targetCount) {
    const strongReviewSlot = (chosen.length + 1) % 5 === 0;
    let best: SmartPracticeRecommendation | null = null;
    let bestStrongReview = false;

    const remaining = available.filter((question) => !chosen.some(({ question: picked }) => picked.id === question.id));
    const strongCandidates = strongReviewSlot && chosen.some(({ question }) => !strongReviewQuestionIds.includes(question.id))
      ? remaining.filter((question) => isStrongSkill(context, question.section, question.topic))
      : [];
    const candidates = strongCandidates.length ? strongCandidates : remaining;

    for (const question of candidates) {
      const key = topicKey(question.section, question.topic);
      const topicSelections = selectedCounts.get(key) ?? 0;
      const base = baseTopicScore(context, question.section, question.topic, question.estimatedTimeSeconds, goal);
      const strongReview = strongReviewSlot && isStrongSkill(context, question.section, question.topic);
      const repeated = repeatedQuestionPenalty(context.attempts, question.id, context.now);
      const recentTopic = recentTopicPenalty(context.attempts, question.section, question.topic, context.now);
      const typeRepeats = typeCounts.get(question.questionType) ?? 0;
      const variety = varied(question, chosen) - topicSelections * 14 - typeRepeats * 4 - recentTopic;
      const targetLevel = targetDifficulty(context, question.section, question.topic, topicSelections);
      const difficulty = difficultyPriority(question, targetLevel);
      const strongReviewBonus = strongReview ? (topicSelections === 0 ? 38 : -8) : 0;
      const goalBoost = base.goalUrgency * 0.45;
      const score = base.score + variety * 0.8 + difficulty * 0.12 - repeated * 0.55 + strongReviewBonus + goalBoost;
      const balance = {
        weakness: Math.round(base.weakness),
        recentMistakes: Math.round(base.mistakes),
        spacedReview: Math.round(base.spacedReview),
        responseTime: Math.round(base.responseTime),
        goalUrgency: Math.round(base.goalUrgency),
        variety: Math.round(variety),
        difficulty: Math.round(difficulty),
      };
      const candidate = {
        question,
        recommendationScore: Math.round(score * 100) / 100,
        reason: makeReason(balance, strongReview),
        balance,
      };
      if (!best || candidate.recommendationScore > best.recommendationScore ||
          (candidate.recommendationScore === best.recommendationScore && candidate.question.id < best.question.id)) {
        best = candidate;
        bestStrongReview = strongReview;
      }
    }

    if (!best) break;
    // For periodic strong-skill review, only use the slot when a strong skill was actually selected.
    if (strongReviewSlot && !bestStrongReview) {
      best = { ...best, reason: makeReason(best.balance, false) };
    }
    chosen.push(best);
    const key = topicKey(best.question.section, best.question.topic);
    selectedCounts.set(key, (selectedCounts.get(key) ?? 0) + 1);
    typeCounts.set(best.question.questionType, (typeCounts.get(best.question.questionType) ?? 0) + 1);
  }

  const estimatedSeconds = chosen.reduce((sum, item) => sum + item.question.estimatedTimeSeconds, 0);
  return {
    durationMinutes: context.durationMinutes,
    estimatedQuestionCount: chosen.length,
    estimatedMinutes: Math.max(1, Math.round(estimatedSeconds / 60)),
    recommendations: chosen,
    summary: context.analysis.totalAttempts
      ? 'Selected from your saved practice: reinforce weak skills, revisit due topics, and keep question types and difficulty varied.'
      : 'A balanced starter set across available sections and question types—your recommendations will personalize after you practice.',
  };
}
