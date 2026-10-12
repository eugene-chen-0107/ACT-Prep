export const REVIEW_INTERVALS_DAYS = { missed: 1, firstCorrect: 3, secondCorrect: 7, established: 14 } as const;
export const RECENT_MISS_WINDOW_DAYS = 7;

export type ReviewAttempt = {
  attemptId?: string;
  questionId: string;
  attemptedAt: Date | string;
  section: string;
  topic: string | null;
  subtopic: string | null;
  selectedAnswer: string | null;
  correctAnswer: string | null;
  isCorrect: boolean;
  questionSnapshot: {
    prompt?: string;
    passage?: string | null;
    options?: Array<{ id: string; text: string }>;
    explanation?: string;
  } | null;
};

export type ReviewQuestion = {
  questionId: string;
  prompt: string;
  passage: string | null;
  options: Array<{ id: string; text: string }>;
  explanation: string;
  section: string;
  topic: string;
  subtopic: string | null;
  selectedAnswer: string | null;
  correctAnswer: string | null;
  attemptedAt: string | null;
  flaggedAt: string | null;
  attemptCount: number;
  incorrectAttempts: number;
  previousAttempts: Array<{ selectedAnswer: string | null; correctAnswer: string | null; isCorrect: boolean; attemptedAt: string }>;
  nextReviewAt: string | null;
};

export type ReviewSkill = {
  section: string;
  topic: string;
  attempts: number;
  correct: number;
  accuracy: number;
  questions: ReviewQuestion[];
};

export type ReviewData = {
  recentlyMissed: ReviewQuestion[];
  repeatedMistakes: ReviewQuestion[];
  weakestSkills: ReviewSkill[];
  flaggedQuestions: ReviewQuestion[];
  dueForReview: ReviewQuestion[];
  totalAttempts: number;
};

export type ReviewFlag = {
  questionId: string;
  flaggedAt: Date | string;
  question?: {
    prompt: string;
    passage: string | null;
    options: Array<{ id: string; text: string }>;
    explanation: string;
    correctAnswer?: string;
    section: string;
    topic: string;
    subtopic: string | null;
  };
};

function validTime(value: Date | string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export function scheduleNextReview(latestAttempt: ReviewAttempt, attempts: readonly ReviewAttempt[]) {
  const latestTime = validTime(latestAttempt.attemptedAt);
  if (latestTime === null) return null;
  const ordered = attempts.filter((attempt) => attempt.questionId === latestAttempt.questionId);
  if (!ordered.includes(latestAttempt)) ordered.push(latestAttempt);
  ordered.sort((a, b) => (validTime(b.attemptedAt) ?? 0) - (validTime(a.attemptedAt) ?? 0) || (b.attemptId ?? '').localeCompare(a.attemptId ?? '') || (a === latestAttempt ? -1 : b === latestAttempt ? 1 : 0));
  let correctStreak = 0;
  for (const attempt of ordered) {
    if (!attempt.isCorrect) break;
    correctStreak += 1;
  }
  const interval = !latestAttempt.isCorrect ? REVIEW_INTERVALS_DAYS.missed
    : correctStreak === 1 ? REVIEW_INTERVALS_DAYS.firstCorrect
      : correctStreak === 2 ? REVIEW_INTERVALS_DAYS.secondCorrect : REVIEW_INTERVALS_DAYS.established;
  return new Date(latestTime + interval * 86_400_000).toISOString();
}

export function buildReviewData(input: { attempts: readonly ReviewAttempt[]; flags: readonly ReviewFlag[]; now?: Date }): ReviewData {
  const now = input.now ?? new Date();
  const attemptsByQuestion = new Map<string, ReviewAttempt[]>();
  for (const attempt of input.attempts) {
    if (validTime(attempt.attemptedAt) === null) continue;
    const group = attemptsByQuestion.get(attempt.questionId) ?? [];
    group.push(attempt);
    attemptsByQuestion.set(attempt.questionId, group);
  }

  const questions = new Map<string, ReviewQuestion>();
  for (const [questionId, group] of attemptsByQuestion) {
    const ordered = [...group].sort((a, b) => (validTime(a.attemptedAt) ?? 0) - (validTime(b.attemptedAt) ?? 0) || (a.attemptId ?? '').localeCompare(b.attemptId ?? ''));
    const latest = ordered.at(-1)!;
    const snapshot = [...ordered].reverse().find(({ questionSnapshot }) => questionSnapshot?.prompt)?.questionSnapshot;
    const nextReviewAt = scheduleNextReview(latest, ordered);
    questions.set(questionId, {
      questionId,
      prompt: snapshot?.prompt || 'Question text unavailable',
      passage: snapshot?.passage ?? null,
      options: snapshot?.options ?? [],
      explanation: snapshot?.explanation ?? 'Explanation unavailable.',
      section: latest.section,
      topic: latest.topic ?? latest.section,
      subtopic: latest.subtopic,
      selectedAnswer: latest.selectedAnswer,
      correctAnswer: latest.correctAnswer,
      attemptedAt: new Date(latest.attemptedAt).toISOString(),
      flaggedAt: null,
      attemptCount: ordered.length,
      incorrectAttempts: ordered.filter(({ isCorrect }) => !isCorrect).length,
      previousAttempts: ordered.slice(0, -1).reverse().map((attempt) => ({
        selectedAnswer: attempt.selectedAnswer,
        correctAnswer: attempt.correctAnswer,
        isCorrect: attempt.isCorrect,
        attemptedAt: new Date(attempt.attemptedAt).toISOString(),
      })),
      nextReviewAt,
    });
  }

  const sortedQuestions = [...questions.values()].sort((a, b) => (b.attemptedAt ?? '').localeCompare(a.attemptedAt ?? '') || a.questionId.localeCompare(b.questionId));
  const recentlyMissed = sortedQuestions.filter((question) => {
    const latest = [...(attemptsByQuestion.get(question.questionId) ?? [])]
      .sort((a, b) => (validTime(b.attemptedAt) ?? 0) - (validTime(a.attemptedAt) ?? 0) || (b.attemptId ?? '').localeCompare(a.attemptId ?? ''))[0];
    const age = latest ? now.getTime() - (validTime(latest.attemptedAt) ?? now.getTime()) : Infinity;
    return latest?.isCorrect === false && age >= 0 && age <= RECENT_MISS_WINDOW_DAYS * 86_400_000;
  });
  const repeatedMistakes = sortedQuestions.filter(({ incorrectAttempts }) => incorrectAttempts >= 2);
  const dueForReview = sortedQuestions.filter(({ nextReviewAt }) => nextReviewAt !== null && new Date(nextReviewAt).getTime() <= now.getTime());

  const skillGroups = new Map<string, { section: string; topic: string; attempts: ReviewAttempt[] }>();
  for (const attempt of input.attempts) {
    if (!attempt.topic || validTime(attempt.attemptedAt) === null) continue;
    const key = `${attempt.section}\u0000${attempt.topic}`;
    const skill = skillGroups.get(key) ?? { section: attempt.section, topic: attempt.topic, attempts: [] };
    skill.attempts.push(attempt);
    skillGroups.set(key, skill);
  }
  const weakestSkills = [...skillGroups.values()]
    .filter((skill) => skill.attempts.length >= 2)
    .map((skill) => {
      const correct = skill.attempts.filter(({ isCorrect }) => isCorrect).length;
      const questionIds = new Set(skill.attempts.map(({ questionId }) => questionId));
      return {
        section: skill.section,
        topic: skill.topic,
        attempts: skill.attempts.length,
        correct,
        accuracy: Math.round((correct / skill.attempts.length) * 100),
        questions: [...questionIds].map((id) => questions.get(id)).filter((question): question is ReviewQuestion => Boolean(question)),
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts || a.section.localeCompare(b.section) || a.topic.localeCompare(b.topic))
    .slice(0, 5);

  const flaggedQuestions = input.flags.map((flag) => {
    const existing = questions.get(flag.questionId);
    if (existing) return { ...existing, flaggedAt: new Date(flag.flaggedAt).toISOString() };
    const question = flag.question;
    return {
      questionId: flag.questionId,
      prompt: question?.prompt ?? 'Question text unavailable',
      passage: question?.passage ?? null,
      options: question?.options ?? [],
      explanation: 'Submit an answer in Practice to unlock the explanation.',
      section: question?.section ?? 'Unknown',
      topic: question?.topic ?? question?.section ?? 'Unknown',
      subtopic: question?.subtopic ?? null,
      selectedAnswer: null,
      correctAnswer: null,
      attemptedAt: null,
      flaggedAt: new Date(flag.flaggedAt).toISOString(),
      attemptCount: 0,
      incorrectAttempts: 0,
      previousAttempts: [],
      nextReviewAt: null,
    } satisfies ReviewQuestion;
  }).sort((a, b) => (b.flaggedAt ?? '').localeCompare(a.flaggedAt ?? ''));

  return { recentlyMissed, repeatedMistakes, weakestSkills, flaggedQuestions, dueForReview, totalAttempts: input.attempts.length };
}
