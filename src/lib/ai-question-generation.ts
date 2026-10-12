import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { unifiedQuestionSchema, type QuestionDifficulty, type QuestionType, type UnifiedQuestion } from './question-provider';

export const questionGenerationInputSchema = z.object({
  section: z.enum(['English', 'Math', 'Reading', 'Science']),
  topic: z.string().trim().min(1).max(160),
  subtopic: z.string().trim().max(160).nullable(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  questionType: z.enum(['multiple_choice', 'passage_based', 'data_interpretation', 'experiment_analysis']),
  targetSkill: z.string().trim().min(1).max(240),
  estimatedTimeSeconds: z.number().int().min(10).max(600),
  studentWeakness: z.string().trim().min(1).max(2000),
}).strict();

const generatedContentSchema = z.object({
  question: z.string().trim().min(10).max(12000),
  passage: z.string().trim().max(16000).nullable(),
  choices: z.array(z.object({ id: z.enum(['A', 'B', 'C', 'D']), text: z.string().trim().min(1).max(2000) }).strict()).length(4),
  correctAnswer: z.enum(['A', 'B', 'C', 'D']),
  explanation: z.string().trim().min(1).max(6000),
  incorrectAnswerExplanations: z.array(z.object({
    choiceId: z.enum(['A', 'B', 'C', 'D']),
    explanation: z.string().trim().min(1).max(2000),
  }).strict()).length(3),
  concept: z.string().trim().min(1).max(300),
}).strict().superRefine((content, context) => {
  const choiceIds = content.choices.map(({ id }) => id);
  if (new Set(choiceIds).size !== 4 || !['A', 'B', 'C', 'D'].every((id) => choiceIds.includes(id as typeof choiceIds[number]))) {
    context.addIssue({ code: 'custom', message: 'Question choices must have unique A–D identifiers.', path: ['choices'] });
  }
  const incorrectIds = content.incorrectAnswerExplanations.map(({ choiceId }) => choiceId);
  const expectedIncorrectIds = choiceIds.filter((id) => id !== content.correctAnswer);
  if (new Set(incorrectIds).size !== incorrectIds.length || expectedIncorrectIds.some((id) => !incorrectIds.includes(id))) {
    context.addIssue({ code: 'custom', message: 'Provide one incorrect-answer explanation for each distractor.', path: ['incorrectAnswerExplanations'] });
  }
});

export type QuestionGenerationInput = z.infer<typeof questionGenerationInputSchema>;
export type OriginalQuestionContent = z.infer<typeof generatedContentSchema>;
export type OriginalGeneratedQuestion = UnifiedQuestion & {
  targetSkill: string;
  concept: string;
  incorrectAnswerExplanations: OriginalQuestionContent['incorrectAnswerExplanations'];
  officialStatus: 'not_official';
};

export interface OriginalQuestionGenerator {
  readonly name: string;
  readonly model: string;
  generate(input: QuestionGenerationInput): Promise<unknown>;
}

export class QuestionGenerationUnavailableError extends Error {
  constructor() {
    super('Original question generation is not configured.');
    this.name = 'QuestionGenerationUnavailableError';
  }
}

export function createOriginalQuestionGenerationService(dependencies: {
  provider: OriginalQuestionGenerator | null;
  createId?: () => string;
  now?: () => Date;
}) {
  return async function generate(inputValue: unknown): Promise<OriginalGeneratedQuestion> {
    const input = questionGenerationInputSchema.parse(inputValue);
    const provider = dependencies.provider;
    if (!provider) throw new QuestionGenerationUnavailableError();

    const content = generatedContentSchema.parse(await provider.generate(input));
    if (['passage_based', 'data_interpretation', 'experiment_analysis'].includes(input.questionType) && !content.passage) {
      throw new Error('This question type requires a passage or data context.');
    }
    const generatedText = [
      content.question,
      content.passage ?? '',
      ...content.choices.map(({ text }) => text),
      content.explanation,
      ...content.incorrectAnswerExplanations.map(({ explanation }) => explanation),
      content.concept,
    ].join('\n');
    if (/\b(?:official|authentic|real)\s+(?:ACT\s+)?(?:exam\s+)?question\b/i.test(generatedText)) {
      throw new Error('Generated questions must not be presented as official ACT questions.');
    }

    const timestamp = (dependencies.now ?? (() => new Date()))().toISOString();
    const canonical = unifiedQuestionSchema.parse({
      id: `ai_${(dependencies.createId ?? randomUUID)()}`,
      externalId: null,
      section: input.section,
      topic: input.topic,
      subtopic: input.subtopic,
      difficulty: input.difficulty as QuestionDifficulty,
      questionType: input.questionType as QuestionType,
      question: content.question,
      passage: content.passage,
      choices: content.choices,
      correctAnswer: content.correctAnswer,
      explanation: content.explanation,
      source: 'ai_generated',
      provider: provider.name,
      estimatedTimeSeconds: input.estimatedTimeSeconds,
      tags: [`target-skill:${input.targetSkill}`],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    return {
      ...canonical,
      passage: content.passage,
      targetSkill: input.targetSkill,
      concept: content.concept,
      incorrectAnswerExplanations: content.incorrectAnswerExplanations,
      officialStatus: 'not_official',
    };
  };
}
