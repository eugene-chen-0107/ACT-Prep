import { z } from 'zod';
import type { StudentPracticeQuestion } from './practice-flow';

export const testSectionConfigurationSchema = z.object({
  sectionId: z.string().min(1),
  durationSeconds: z.number().int().positive(),
  instructions: z.string().trim().min(1),
}).strict();
export type TestSectionConfiguration = z.infer<typeof testSectionConfigurationSchema>;
export type TestQuestionSnapshot = StudentPracticeQuestion & { correctAnswer: string; explanation: string };
export type TestSectionSnapshot = TestSectionConfiguration & {
  sectionName: string;
  questionIds: string[];
};
export type TestAttemptState = {
  phase: 'overview' | 'instructions' | 'in_progress' | 'section_transition' | 'completed';
  activeSectionIndex: number;
  activeQuestionIndex: number;
  sectionStartedAt: string | null;
  sectionDeadlineAt: string | null;
  questionEnteredAt: string | null;
  questionTimes: Record<string, number>;
};

export function createTestAttemptState(): TestAttemptState {
  return { phase: 'overview', activeSectionIndex: 0, activeQuestionIndex: 0, sectionStartedAt: null, sectionDeadlineAt: null, questionEnteredAt: null, questionTimes: {} };
}

export function startTestSection(state: TestAttemptState, sections: readonly TestSectionSnapshot[], now: Date = new Date()): TestAttemptState {
  const section = sections[state.activeSectionIndex];
  if (!section) throw new Error('Test section does not exist.');
  const startedAt = now.toISOString();
  return {
    ...state,
    phase: 'in_progress',
    sectionStartedAt: startedAt,
    sectionDeadlineAt: new Date(now.getTime() + section.durationSeconds * 1000).toISOString(),
    questionEnteredAt: now.toISOString(),
  };
}

export function remainingSectionSeconds(state: TestAttemptState, now: Date = new Date()) {
  if (state.phase !== 'in_progress' || !state.sectionDeadlineAt) return 0;
  return Math.max(0, Math.ceil((new Date(state.sectionDeadlineAt).getTime() - now.getTime()) / 1000));
}

export function advanceTestSection(state: TestAttemptState, sections: readonly TestSectionSnapshot[], now: Date = new Date()): TestAttemptState {
  if (state.phase !== 'in_progress' && state.phase !== 'section_transition') throw new Error('Test is not ready to advance.');
  if (state.activeSectionIndex + 1 >= sections.length) return { ...state, phase: 'section_transition', sectionStartedAt: null, sectionDeadlineAt: null, questionEnteredAt: null };
  const next = { ...state, activeSectionIndex: state.activeSectionIndex + 1, activeQuestionIndex: 0, phase: 'in_progress' as const };
  return startTestSection(next, sections, now);
}

export function accrueQuestionTime(state: TestAttemptState, sections: readonly TestSectionSnapshot[], now: Date = new Date()): TestAttemptState {
  if (state.phase !== 'in_progress' || !state.questionEnteredAt) return state;
  const section = sections[state.activeSectionIndex];
  const questionId = section?.questionIds[state.activeQuestionIndex];
  if (!questionId) return { ...state, questionEnteredAt: now.toISOString() };
  const deadline = state.sectionDeadlineAt ? new Date(state.sectionDeadlineAt).getTime() : now.getTime();
  const elapsed = Math.max(0, Math.floor((Math.min(now.getTime(), deadline) - new Date(state.questionEnteredAt).getTime()) / 1000));
  return { ...state, questionEnteredAt: now.toISOString(), questionTimes: { ...state.questionTimes, [questionId]: (state.questionTimes[questionId] ?? 0) + elapsed } };
}

export function summarizeTest(questions: readonly TestQuestionSnapshot[], answers: Readonly<Record<string, string | null>>, sections: readonly TestSectionSnapshot[]) {
  const sectionScores = Object.fromEntries(sections.map((section) => {
    const items = questions.filter((question) => question.sectionId === section.sectionId);
    const correct = items.filter((question) => answers[question.id] === question.correctAnswer).length;
    return [section.sectionName, { correct, total: items.length, accuracy: items.length ? Math.round(correct / items.length * 100) : 0 }];
  }));
  const correct = questions.filter((question) => answers[question.id] === question.correctAnswer).length;
  return {
    totalQuestions: questions.length,
    answeredQuestions: questions.filter(({ id }) => answers[id] != null).length,
    correct, rawScore: correct,
    accuracy: questions.length ? Math.round(correct / questions.length * 100) : 0,
    sectionScores,
    answerReview: questions.map((question) => ({
      questionId: question.id, sectionId: question.sectionId,
      selectedAnswer: answers[question.id] ?? null, correctAnswer: question.correctAnswer,
      isCorrect: answers[question.id] === question.correctAnswer,
      explanation: question.explanation,
    })),
  };
}
