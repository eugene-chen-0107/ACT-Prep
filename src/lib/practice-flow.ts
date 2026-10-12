import { z } from 'zod';
import type { UnifiedQuestion } from './question-provider';
import { normalizeQuestionSource } from './question-provider';
import type { StudentExplanation } from './ai-explanation';

export type StudentPracticeQuestion = Omit<UnifiedQuestion, 'correctAnswer' | 'explanation'>;

/** Keep the answer key and explanation exclusively on the server until an attempt is saved. */
export function toStudentPracticeQuestion(question: UnifiedQuestion): StudentPracticeQuestion {
  return {
    id: question.id,
    externalId: question.externalId,
    section: question.section,
    sectionId: question.sectionId,
    topic: question.topic,
    topicId: question.topicId,
    subtopic: question.subtopic,
    subtopicId: question.subtopicId,
    difficulty: question.difficulty,
    questionType: question.questionType,
    question: question.question,
    passage: question.passage,
    choices: question.choices,
    source: question.source,
    provider: question.provider,
    estimatedTimeSeconds: question.estimatedTimeSeconds,
    tags: question.tags,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
  };
}

export const practiceSubmissionSchema = z.object({
  questionId: z.string().trim().min(1).max(128),
  selectedAnswer: z.string().trim().min(1).max(32),
  timeSpentSeconds: z.number().int().min(0).max(24 * 60 * 60),
}).strict();

export type PracticeAttemptToSave = {
  id: string;
  userId: string;
  questionId: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  section: string;
  topic: string;
  subtopic: string | null;
  difficulty: UnifiedQuestion['difficulty'];
  questionSnapshot: {
    prompt: string;
    passage: string | null;
    options: UnifiedQuestion['choices'];
    explanation: string;
    questionType: UnifiedQuestion['questionType'];
    estimatedTimeSeconds: number;
    tags: string[];
    source: UnifiedQuestion['source'];
  };
};

export type SavedPracticeAttempt = { id: string; attemptedAt: Date | string };

export class InvalidPracticeSubmissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPracticeSubmissionError';
  }
}

export class PracticeQuestionNotFoundError extends Error {
  constructor() {
    super('Question not found.');
    this.name = 'PracticeQuestionNotFoundError';
  }
}

export type PracticeAnswerFeedback = {
  attemptId: string;
  attemptedAt: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
  keyConcept: string;
  actStrategy: string;
  aiExplanation: StudentExplanation | null;
};

const actStrategies: Record<string, string> = {
  English: 'Read the whole sentence for context. Check grammar and meaning, then choose the clearest option that is still correct.',
  Math: 'Translate the prompt into a mathematical step, solve carefully, then substitute your answer to check it.',
  Reading: 'Return to the passage and prove your choice with a specific detail. Eliminate answers that go beyond the evidence.',
  Science: 'Identify what changes, what is measured, and what stays constant. Compare only the data that answers the question.',
};

export async function submitPracticeAnswer(
  input: unknown,
  dependencies: {
    userId: string;
    getQuestionById: (id: string) => Promise<UnifiedQuestion | null>;
    saveAttempt: (attempt: PracticeAttemptToSave) => Promise<SavedPracticeAttempt>;
    explain?: (input: unknown) => Promise<StudentExplanation>;
    createId?: () => string;
  },
): Promise<PracticeAnswerFeedback> {
  const parsed = practiceSubmissionSchema.safeParse(input);
  if (!parsed.success) throw new InvalidPracticeSubmissionError('Invalid practice answer.');

  const question = await dependencies.getQuestionById(parsed.data.questionId);
  if (!question) throw new PracticeQuestionNotFoundError();
  if (!question.choices.some(({ id }) => id === parsed.data.selectedAnswer)) {
    throw new InvalidPracticeSubmissionError('Selected answer is not one of the available choices.');
  }

  const isCorrect = parsed.data.selectedAnswer === question.correctAnswer;
  const savedAttempt = await dependencies.saveAttempt({
    id: (dependencies.createId ?? (() => crypto.randomUUID()))(),
    userId: dependencies.userId,
    questionId: question.id,
    selectedAnswer: parsed.data.selectedAnswer,
    correctAnswer: question.correctAnswer,
    isCorrect,
    timeSpentSeconds: parsed.data.timeSpentSeconds,
    section: question.section,
    topic: question.topic,
    subtopic: question.subtopic,
    difficulty: question.difficulty,
    questionSnapshot: {
      prompt: question.question,
      passage: question.passage,
      options: question.choices,
      explanation: question.explanation,
      questionType: question.questionType,
      estimatedTimeSeconds: question.estimatedTimeSeconds,
      tags: question.tags,
      source: normalizeQuestionSource(question.source),
    },
  });

  const strategy = actStrategies[question.section] ?? 'Read the prompt carefully, identify what it asks, and verify your answer against the available evidence.';
  const aiExplanation = dependencies.explain ? await dependencies.explain({
    questionId: question.id,
    section: question.section,
    topic: question.topic,
    questionType: question.questionType,
    question: question.question,
    passage: question.passage,
    choices: question.choices,
    correctAnswer: question.correctAnswer,
    selectedAnswer: parsed.data.selectedAnswer,
    canonicalExplanation: question.explanation,
  }) : null;
  return {
    attemptId: savedAttempt.id,
    attemptedAt: new Date(savedAttempt.attemptedAt).toISOString(),
    selectedAnswer: parsed.data.selectedAnswer,
    correctAnswer: question.correctAnswer,
    isCorrect,
    explanation: aiExplanation?.stepByStep.join('\n') ?? question.explanation,
    keyConcept: aiExplanation?.keyConcept ?? question.subtopic ?? question.topic,
    actStrategy: aiExplanation?.actStrategy ?? strategy,
    aiExplanation,
  };
}
