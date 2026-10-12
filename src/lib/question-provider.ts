import { z } from 'zod';
import type { QuestionDifficulty, QuestionSource, QuestionType } from '@/db/schema';

export const questionChoiceSchema = z.object({ id: z.string().trim().min(1), text: z.string().trim().min(1) }).strict();

/** Trusted canonical record. Student-facing APIs should project out the answer key. */
export const unifiedQuestionSchema = z.object({
  id: z.string().min(1),
  externalId: z.string().nullable(),
  section: z.string().min(1),
  sectionId: z.string().optional(),
  topic: z.string().min(1),
  topicId: z.string().optional(),
  subtopic: z.string().nullable(),
  subtopicId: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  questionType: z.enum(['multiple_choice', 'passage_based', 'data_interpretation', 'experiment_analysis']),
  question: z.string().trim().min(1),
  passage: z.string().nullable(),
  choices: z.array(questionChoiceSchema).min(2),
  correctAnswer: z.string().min(1),
  explanation: z.string().trim().min(1),
  source: z.enum(['original', 'curated', 'ai_generated', 'licensed_api']),
  provider: z.string().min(1),
  estimatedTimeSeconds: z.number().int().positive(),
  tags: z.array(z.string()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).strict().superRefine((question, context) => {
  const choiceIds = new Set(question.choices.map(({ id }) => id));
  if (choiceIds.size !== question.choices.length) {
    context.addIssue({ code: 'custom', message: 'Choice IDs must be unique.', path: ['choices'] });
  }
  if (!choiceIds.has(question.correctAnswer)) {
    context.addIssue({ code: 'custom', message: 'Correct answer must identify one of the choices.', path: ['correctAnswer'] });
  }
});

export type UnifiedQuestion = z.infer<typeof unifiedQuestionSchema>;
export type QuestionChoice = z.infer<typeof questionChoiceSchema>;
export type { QuestionDifficulty, QuestionSource, QuestionType };

export type QuestionProviderQuery = {
  section?: string;
  sectionId?: string;
  topic?: string;
  topicId?: string;
  subtopic?: string;
  subtopicId?: string;
  difficulty?: QuestionDifficulty;
  source?: QuestionSource;
  tags?: string[];
  limit?: number;
  /** Set by the authenticated server route; never accept this field from a request body. */
  requesterId?: string;
};

export interface QuestionProvider {
  readonly name: string;
  readonly sources: readonly QuestionSource[];
  readonly available: boolean;
  getQuestions(query?: QuestionProviderQuery): Promise<UnifiedQuestion[]>;
  getQuestionById(id: string): Promise<UnifiedQuestion | null>;
}

export class QuestionProviderUnavailableError extends Error {
  constructor(providerName: string) {
    super(`Question provider "${providerName}" is not configured.`);
    this.name = 'QuestionProviderUnavailableError';
  }
}

export function filterQuestions(questions: UnifiedQuestion[], query: QuestionProviderQuery = {}) {
  const filtered = questions.filter((question) =>
    (!query.section || question.section === query.section) &&
    (!query.sectionId || question.sectionId === query.sectionId) &&
    (!query.topic || question.topic === query.topic) &&
    (!query.topicId || question.topicId === query.topicId) &&
    (!query.subtopic || question.subtopic === query.subtopic) &&
    (!query.subtopicId || question.subtopicId === query.subtopicId) &&
    (!query.difficulty || question.difficulty === query.difficulty) &&
    (!query.source || question.source === query.source) &&
    (!query.tags?.length || query.tags.every((tag) => question.tags.includes(tag))),
  );
  return typeof query.limit === 'number' ? filtered.slice(0, Math.max(0, query.limit)) : filtered;
}

export function normalizeQuestionSource(source: string, sourceMetadata: Record<string, unknown> = {}): QuestionSource {
  if (source === 'original' || source === 'curated' || source === 'ai_generated' || source === 'licensed_api') {
    return source;
  }
  // Older demo seeds used `demo`; those items were original and remain supported.
  if (source === 'demo' || sourceMetadata.original === true) return 'original';
  return 'curated';
}
