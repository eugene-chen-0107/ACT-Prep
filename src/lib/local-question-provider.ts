import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { questions, sections, topics } from '@/db/schema';
import type { QuestionDifficulty, QuestionSource, QuestionType } from '@/db/schema';
import {
  filterQuestions,
  normalizeQuestionSource,
  unifiedQuestionSchema,
  type QuestionProvider,
  type QuestionProviderQuery,
  type UnifiedQuestion,
} from './question-provider';

export type LocalQuestionRecord = {
  id: string;
  section: string;
  sectionId: string;
  topic: string;
  topicId: string;
  subtopic: string | null;
  subtopicId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  difficulty: QuestionDifficulty;
  questionType: QuestionType;
  question: string;
  choices: Array<{ id: string; text: string }>;
  correctAnswer: string;
  explanation: string;
  source: string;
  sourceMetadata: Record<string, unknown>;
  estimatedTimeSeconds: number;
  tags: string[];
};

export interface LocalQuestionReader {
  list(query?: QuestionProviderQuery): Promise<LocalQuestionRecord[]>;
  getById(id: string): Promise<LocalQuestionRecord | null>;
}

/** Drizzle-backed catalog reader; only published question-bank records are served. */
export class DrizzleLocalQuestionReader implements LocalQuestionReader {
  async list(query: QuestionProviderQuery = {}) {
    const conditions = [eq(questions.status, 'published')];
    if (query.source === 'original') {
      conditions.push(or(eq(questions.source, 'original'), and(eq(questions.source, 'demo'), sql`${questions.sourceMetadata}->>'original' = 'true'`))!);
    } else if (query.source) {
      if (query.source !== 'curated') return [];
      conditions.push(eq(questions.source, 'curated'));
    } else {
      conditions.push(or(inArray(questions.source, ['original', 'curated']), and(eq(questions.source, 'demo'), sql`${questions.sourceMetadata}->>'original' = 'true'`))!);
    }
    if (query.section) conditions.push(eq(sections.name, query.section));
    if (query.sectionId) conditions.push(eq(questions.sectionId, query.sectionId));
    if (query.topic) conditions.push(eq(topics.name, query.topic));
    if (query.topicId) conditions.push(eq(questions.topicId, query.topicId));
    if (query.subtopic) conditions.push(eq(questions.subtopic, query.subtopic));
    if (query.subtopicId) conditions.push(eq(questions.subtopicId, query.subtopicId));
    if (query.difficulty) conditions.push(eq(questions.difficulty, query.difficulty));
    if (query.tags?.length) conditions.push(sql`${questions.tags} @> ${JSON.stringify(query.tags)}::jsonb`);

    const { getDb } = await import('@/db');
    const rows = await getDb()
      .select({
        id: questions.id,
        createdAt: questions.createdAt,
        updatedAt: questions.updatedAt,
        section: sections.name,
        sectionId: questions.sectionId,
        topic: topics.name,
        topicId: questions.topicId,
        subtopic: questions.subtopic,
        subtopicId: questions.subtopicId,
        difficulty: questions.difficulty,
        questionType: questions.questionType,
        question: questions.prompt,
        choices: questions.options,
        correctAnswer: questions.correctAnswer,
        explanation: questions.explanation,
        source: questions.source,
        sourceMetadata: questions.sourceMetadata,
        estimatedTimeSeconds: questions.estimatedTimeSeconds,
        tags: questions.tags,
      })
      .from(questions)
      .innerJoin(sections, eq(questions.sectionId, sections.id))
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .where(and(...conditions))
      .limit(Math.min(Math.max(query.limit ?? 100, 1), 500));
    return rows as LocalQuestionRecord[];
  }

  async getById(id: string) {
    const { getDb } = await import('@/db');
    const [row] = await getDb()
      .select({
        id: questions.id,
        createdAt: questions.createdAt,
        updatedAt: questions.updatedAt,
        section: sections.name,
        sectionId: questions.sectionId,
        topic: topics.name,
        topicId: questions.topicId,
        subtopic: questions.subtopic,
        subtopicId: questions.subtopicId,
        difficulty: questions.difficulty,
        questionType: questions.questionType,
        question: questions.prompt,
        choices: questions.options,
        correctAnswer: questions.correctAnswer,
        explanation: questions.explanation,
        source: questions.source,
        sourceMetadata: questions.sourceMetadata,
        estimatedTimeSeconds: questions.estimatedTimeSeconds,
        tags: questions.tags,
      })
      .from(questions)
      .innerJoin(sections, eq(questions.sectionId, sections.id))
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .where(and(
        eq(questions.id, id),
        eq(questions.status, 'published'),
        or(inArray(questions.source, ['original', 'curated']), and(eq(questions.source, 'demo'), sql`${questions.sourceMetadata}->>'original' = 'true'`))!,
      ))
      .limit(1);
    return (row as LocalQuestionRecord | undefined) ?? null;
  }
}

export function toUnifiedQuestion(record: LocalQuestionRecord): UnifiedQuestion {
  return unifiedQuestionSchema.parse({
    id: record.id,
    externalId: null,
    section: record.section,
    sectionId: record.sectionId,
    topic: record.topic,
    topicId: record.topicId,
    subtopic: record.subtopic,
    subtopicId: record.subtopicId ?? undefined,
    difficulty: record.difficulty,
    questionType: record.questionType,
    question: record.question,
    passage: null,
    choices: record.choices,
    correctAnswer: record.correctAnswer,
    explanation: record.explanation,
    source: normalizeQuestionSource(record.source, record.sourceMetadata),
    provider: 'local-question-bank',
    estimatedTimeSeconds: record.estimatedTimeSeconds,
    tags: record.tags,
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
  });
}

/** Local database provider; consumers depend on QuestionProvider, not PostgreSQL. */
export class LocalQuestionProvider implements QuestionProvider {
  readonly name = 'local-question-bank';
  readonly sources: readonly QuestionSource[] = ['original', 'curated'];
  readonly available = true;

  constructor(private readonly reader: LocalQuestionReader = new DrizzleLocalQuestionReader()) {}

  async getQuestions(query: QuestionProviderQuery = {}) {
    const rows = await this.reader.list(query);
    return filterQuestions(rows.map(toUnifiedQuestion), query);
  }

  async getQuestionById(id: string) {
    const row = await this.reader.getById(id);
    return row ? toUnifiedQuestion(row) : null;
  }
}

/** In-memory catalog reader for provider unit tests and local fixtures. */
export class MemoryLocalQuestionReader implements LocalQuestionReader {
  constructor(private readonly records: LocalQuestionRecord[]) {}

  async list(query: QuestionProviderQuery = {}) {
    const normalizedSource = query.source;
    const rows = this.records.filter((record) => {
      const source = normalizeQuestionSource(record.source, record.sourceMetadata);
      return (!query.section || record.section === query.section) &&
        (!query.sectionId || record.sectionId === query.sectionId) &&
        (!query.topic || record.topic === query.topic) &&
        (!query.topicId || record.topicId === query.topicId) &&
        (!query.subtopic || record.subtopic === query.subtopic) &&
        (!query.subtopicId || record.subtopicId === query.subtopicId) &&
        (!query.difficulty || record.difficulty === query.difficulty) &&
        (!normalizedSource || source === normalizedSource) &&
        (!query.tags?.length || query.tags.every((tag) => record.tags.includes(tag)));
    });
    return typeof query.limit === 'number' ? rows.slice(0, Math.max(0, query.limit)) : rows;
  }

  async getById(id: string) {
    return this.records.find((record) => record.id === id) ?? null;
  }
}
