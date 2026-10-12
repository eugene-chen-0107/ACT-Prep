import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AIQuestionProvider } from './ai-question-provider';
import { LicensedApiQuestionProvider } from './licensed-api-question-provider';
import { LocalQuestionProvider, MemoryLocalQuestionReader, type LocalQuestionRecord } from './local-question-provider';
import { QuestionProviderRegistry } from './question-provider-registry';
import { QuestionProviderUnavailableError, unifiedQuestionSchema } from './question-provider';

const record: LocalQuestionRecord = {
  id: 'sample-math-1',
  section: 'Math',
  sectionId: 'math',
  topic: 'Algebra',
  topicId: 'math-algebra',
  subtopic: 'Linear equations',
  subtopicId: 'math-linear-equations',
  createdAt: '2026-09-24T00:00:00.000Z',
  updatedAt: '2026-09-24T00:00:00.000Z',
  difficulty: 'easy',
  questionType: 'multiple_choice',
  question: 'If 2x = 10, what is x?',
  choices: [{ id: 'A', text: '2' }, { id: 'B', text: '5' }, { id: 'C', text: '8' }, { id: 'D', text: '12' }],
  correctAnswer: 'B',
  explanation: 'Divide both sides by 2 to get x = 5.',
  source: 'demo',
  sourceMetadata: { original: true },
  estimatedTimeSeconds: 45,
  tags: ['algebra', 'equations'],
};

function canonicalFixture(source: 'original' | 'curated' | 'ai_generated' | 'licensed_api' = 'curated') {
  return {
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
    source,
    provider: 'fixture-provider',
    estimatedTimeSeconds: record.estimatedTimeSeconds,
    tags: record.tags,
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
  };
}

describe('question providers', () => {
  it('normalizes local demo records into the unified original-question contract', async () => {
    const local = new LocalQuestionProvider(new MemoryLocalQuestionReader([record]));
    const [question] = await local.getQuestions({ sectionId: 'math', topicId: 'math-algebra', subtopicId: 'math-linear-equations', tags: ['algebra'] });

    assert.equal(local.available, true);
    assert.deepEqual(local.sources, ['original', 'curated']);
    assert.equal(question.id, 'sample-math-1');
    assert.equal(question.section, 'Math');
    assert.equal(question.question, record.question);
    assert.deepEqual(question.choices, record.choices);
    assert.equal(question.correctAnswer, 'B');
    assert.equal(question.source, 'original');
    assert.equal(question.provider, 'local-question-bank');
    assert.equal(question.externalId, null);
    assert.equal(question.passage, null);
    assert.equal(question.createdAt, record.createdAt);
    assert.equal(question.estimatedTimeSeconds, 45);
    assert.equal(await local.getQuestionById('missing'), null);
  });

  it('routes catalog queries through the registry and excludes AI by default', async () => {
    const local = new LocalQuestionProvider(new MemoryLocalQuestionReader([record]));
    let aiCalls = 0;
    const ai = new AIQuestionProvider({ generate: async () => { aiCalls += 1; return []; } });
    const registry = new QuestionProviderRegistry([local, ai, new LicensedApiQuestionProvider()]);

    const questions = await registry.getQuestions();
    assert.equal(questions.length, 1);
    assert.equal(aiCalls, 0);
    assert.deepEqual(registry.sources, ['original', 'curated', 'ai_generated', 'licensed_api']);

    const generated = await registry.getQuestions({ source: 'ai_generated' });
    assert.equal(aiCalls, 1);
    assert.deepEqual(generated, []);
  });

  it('requires explicit integrations for AI and licensed content and never scrapes', async () => {
    const ai = new AIQuestionProvider();
    const licensed = new LicensedApiQuestionProvider();
    assert.equal(ai.available, false);
    assert.equal(licensed.available, false);
    await assert.rejects(ai.getQuestions(), QuestionProviderUnavailableError);
    await assert.rejects(licensed.getQuestions(), QuestionProviderUnavailableError);
    assert.match(new LicensedApiQuestionProvider().name, /licensed/);
  });

  it('forces adapter results to retain their declared source', async () => {
    const canonicalQuestion = canonicalFixture();
    const ai = new AIQuestionProvider({ generate: async () => [canonicalQuestion] });
    assert.equal((await ai.getQuestions())[0].source, 'ai_generated');

    const licensed = new LicensedApiQuestionProvider({
      listQuestions: async () => [],
      getQuestion: async () => canonicalQuestion,
    });
    assert.equal((await licensed.getQuestionById(record.id))?.source, 'licensed_api');
  });

  it('rejects malformed canonical questions before they reach consumers', () => {
    const duplicateChoices = canonicalFixture();
    duplicateChoices.choices = [...record.choices, { id: 'A', text: 'duplicate ID' }];
    assert.equal(unifiedQuestionSchema.safeParse(duplicateChoices).success, false);

    const missingAnswer = { ...canonicalFixture(), correctAnswer: 'E' };
    assert.equal(unifiedQuestionSchema.safeParse(missingAnswer).success, false);
  });
});
