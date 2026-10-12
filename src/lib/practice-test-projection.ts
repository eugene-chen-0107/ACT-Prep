import type { StudentPracticeQuestion } from './practice-flow';
import type { TestQuestionSnapshot } from './practice-test-engine';

export function publicTestQuestion(question: TestQuestionSnapshot): StudentPracticeQuestion {
  const studentQuestion = { ...question } as Record<string, unknown>;
  delete studentQuestion.correctAnswer;
  delete studentQuestion.explanation;
  return studentQuestion as StudentPracticeQuestion;
}
