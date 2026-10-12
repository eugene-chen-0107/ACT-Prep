import type { UnifiedQuestion } from './question-provider';

export const DIAGNOSTIC_SECTIONS = ['English', 'Math', 'Reading', 'Science'] as const;
export const DIAGNOSTIC_QUESTIONS_PER_SECTION = 3;
export const DIAGNOSTIC_MAX_QUESTIONS = DIAGNOSTIC_SECTIONS.length * DIAGNOSTIC_QUESTIONS_PER_SECTION;

export type DiagnosticResponse = {
  questionId: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  section: string;
  topic: string;
  subtopic: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  questionType: string;
  estimatedTimeSeconds: number;
};

export type DiagnosticReport = {
  label: 'Diagnostic estimate — not an official ACT score';
  isOfficialScore: false;
  estimatedPerformance: Array<{ section: typeof DIAGNOSTIC_SECTIONS[number]; estimatedScore: number | null; accuracy: number | null; correct: number; total: number }>;
  strongSkills: Array<{ section: string; topic: string; accuracy: number; attempts: number }>;
  weakSkills: Array<{ section: string; topic: string; accuracy: number; attempts: number }>;
  pacing: { averageSecondsPerQuestion: number; averageExpectedSeconds: number; paceRatio: number | null; observation: string };
  priorityTopics: Array<{ section: string; topic: string; accuracy: number; attempts: number }>;
  completedAt: string;
};

/** Deterministic coverage sampler: rotates sections, topics, and target difficulty levels. */
export function sampleDiagnosticQuestions(questions: readonly UnifiedQuestion[]) {
  const bySection = new Map<string, UnifiedQuestion[]>();
  for (const section of DIAGNOSTIC_SECTIONS) {
    bySection.set(section, questions.filter((question) => question.section === section).sort((a, b) => a.topic.localeCompare(b.topic) || a.id.localeCompare(b.id)));
  }
  const selected: UnifiedQuestion[] = [];
  const selectedIds = new Set<string>();
  for (let round = 0; round < DIAGNOSTIC_QUESTIONS_PER_SECTION; round += 1) {
    for (const section of DIAGNOSTIC_SECTIONS) {
      const candidates = bySection.get(section) ?? [];
      if (!candidates.length) continue;
      const targetDifficulty = (['easy', 'medium', 'hard'] as const)[round % 3];
      const topics = [...new Set(candidates.map(({ topic }) => topic))];
      const topic = topics[round % topics.length];
      const candidate = candidates.find((question) => !selectedIds.has(question.id) && question.topic === topic && question.difficulty === targetDifficulty)
        ?? candidates.find((question) => !selectedIds.has(question.id) && question.topic === topic)
        ?? candidates.find((question) => !selectedIds.has(question.id));
      if (candidate) {
        selected.push(candidate);
        selectedIds.add(candidate.id);
      }
    }
  }
  return selected;
}

function accuracy(correct: number, total: number) {
  return total ? Math.round(correct / total * 100) : null;
}

function estimatedActScore(correct: number, total: number) {
  if (!total) return null;
  // Broad, intentionally approximate diagnostic scale; not an official ACT conversion table.
  return Math.max(10, Math.min(36, 10 + Math.round((correct / total) * 26)));
}

export function buildDiagnosticReport(responses: readonly DiagnosticResponse[], completedAt = new Date()): DiagnosticReport {
  const estimatedPerformance = DIAGNOSTIC_SECTIONS.map((section) => {
    const sectionResponses = responses.filter((response) => response.section === section);
    const correct = sectionResponses.filter((response) => response.isCorrect).length;
    return { section, estimatedScore: estimatedActScore(correct, sectionResponses.length), accuracy: accuracy(correct, sectionResponses.length), correct, total: sectionResponses.length };
  });
  const topics = new Map<string, { section: string; topic: string; correct: number; attempts: number }>();
  for (const response of responses) {
    const key = `${response.section}\u0000${response.topic}`;
    const item = topics.get(key) ?? { section: response.section, topic: response.topic, correct: 0, attempts: 0 };
    item.attempts += 1;
    if (response.isCorrect) item.correct += 1;
    topics.set(key, item);
  }
  const topicMetrics = [...topics.values()].map((item) => ({
    section: item.section,
    topic: item.topic,
    accuracy: accuracy(item.correct, item.attempts) ?? 0,
    attempts: item.attempts,
  }));
  const strongSkills = topicMetrics.filter(({ attempts, accuracy: score }) => attempts >= 1 && score >= 75)
    .sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts || a.topic.localeCompare(b.topic));
  const weakSkills = topicMetrics.filter(({ attempts, accuracy: score }) => attempts >= 1 && score < 60)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts || a.topic.localeCompare(b.topic));
  const priorityTopics = [...topicMetrics].sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts || a.topic.localeCompare(b.topic)).slice(0, 5);
  const averageSecondsPerQuestion = responses.length ? Math.round(responses.reduce((total, response) => total + response.timeSpentSeconds, 0) / responses.length) : 0;
  const averageExpectedSeconds = responses.length ? Math.round(responses.reduce((total, response) => total + response.estimatedTimeSeconds, 0) / responses.length) : 0;
  const paceRatio = averageExpectedSeconds > 0 ? Math.round(averageSecondsPerQuestion / averageExpectedSeconds * 100) / 100 : null;
  const observation = paceRatio === null ? 'There is not enough timing data to assess pacing.'
    : paceRatio > 1.25 ? 'You took longer than estimated on average; practice efficient setup and time checks.'
      : paceRatio < 0.75 ? 'You moved quickly; leave time to verify answers and passage evidence.'
        : 'Your average pace was close to the estimated time per question.';
  return {
    label: 'Diagnostic estimate — not an official ACT score',
    isOfficialScore: false,
    estimatedPerformance,
    strongSkills,
    weakSkills,
    pacing: { averageSecondsPerQuestion, averageExpectedSeconds, paceRatio, observation },
    priorityTopics,
    completedAt: completedAt.toISOString(),
  };
}
