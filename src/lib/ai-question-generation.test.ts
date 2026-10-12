import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createOriginalQuestionGenerationService,
  QuestionGenerationUnavailableError,
  type OriginalQuestionContent,
  type QuestionGenerationInput,
} from './ai-question-generation';

const input: QuestionGenerationInput = {
  section: 'Math',
  topic: 'Algebra',
  subtopic: 'Linear equations',
  difficulty: 'easy',
  questionType: 'multiple_choice',
  targetSkill: 'Isolate a variable using inverse operations',
  estimatedTimeSeconds: 45,
  studentWeakness: 'Often subtracts instead of dividing after isolating a product.',
};

function content(overrides: Partial<OriginalQuestionContent> = {}): OriginalQuestionContent {
  return {
    question: 'A club packs 4 identical boxes with 28 markers total. How many markers are in each box?',
    passage: null,
    choices: [
      { id: 'A', text: '6' },
      { id: 'B', text: '7' },
      { id: 'C', text: '24' },
      { id: 'D', text: '32' },
    ],
    correctAnswer: 'B',
    explanation: 'Let x be the markers per box. Since 4x = 28, divide both sides by 4 to get x = 7.',
    incorrectAnswerExplanations: [
      { choiceId: 'A', explanation: 'This does not satisfy 4x = 28.' },
      { choiceId: 'C', explanation: 'This multiplies 4 by 6 but does not use the total correctly.' },
      { choiceId: 'D', explanation: 'This adds 4 and 28 rather than dividing.' },
    ],
    concept: 'Solving a one-step multiplication equation',
    ...overrides,
  };
}

describe('original AI question generation', () => {
  it('passes structured weakness targeting and returns a canonical ai_generated record', async () => {
    let received: QuestionGenerationInput | undefined;
    const generate = createOriginalQuestionGenerationService({
      provider: { name: 'fixture-model', model: 'v1', async generate(value) { received = value; return content(); } },
      createId: () => 'generated-id',
      now: () => new Date('2026-10-08T12:00:00Z'),
    });

    const result = await generate(input);
    assert.deepEqual(received, input);
    assert.equal(result.id, 'ai_generated-id');
    assert.equal(result.section, input.section);
    assert.equal(result.topic, input.topic);
    assert.equal(result.subtopic, input.subtopic);
    assert.equal(result.difficulty, input.difficulty);
    assert.equal(result.questionType, input.questionType);
    assert.equal(result.estimatedTimeSeconds, input.estimatedTimeSeconds);
    assert.deepEqual(result.choices, content().choices);
    assert.equal(result.correctAnswer, 'B');
    assert.equal(result.explanation, content().explanation);
    assert.deepEqual(result.incorrectAnswerExplanations.map(({ choiceId }) => choiceId), ['A', 'C', 'D']);
    assert.equal(result.concept, content().concept);
    assert.equal(result.targetSkill, input.targetSkill);
    assert.deepEqual(result.tags, [`target-skill:${input.targetSkill}`]);
    assert.equal(result.source, 'ai_generated');
    assert.equal(result.provider, 'fixture-model');
    assert.equal(result.officialStatus, 'not_official');
    assert.equal(result.createdAt, '2026-10-08T12:00:00.000Z');
  });

  it('requires original data context for passage and experiment-style questions', async () => {
    const generate = createOriginalQuestionGenerationService({
      provider: { name: 'fixture', model: 'v1', async generate() { return content(); } },
    });
    await assert.rejects(generate({ ...input, questionType: 'passage_based' }), /requires a passage or data context/);
    await assert.rejects(generate({ ...input, questionType: 'data_interpretation' }), /requires a passage or data context/);
  });

  it('rejects malformed choices and missing distractor explanations', async () => {
    const generateWith = (result: unknown) => createOriginalQuestionGenerationService({
      provider: { name: 'fixture', model: 'v1', async generate() { return result; } },
    })(input);
    await assert.rejects(generateWith({ ...content(), choices: [{ id: 'A', text: 'Only one' }] }));
    await assert.rejects(generateWith({ ...content(), incorrectAnswerExplanations: [] }));
  });

  it('rejects content claiming to be an official ACT question', async () => {
    const generate = createOriginalQuestionGenerationService({
      provider: { name: 'fixture', model: 'v1', async generate() { return content({ question: 'This is an official ACT question from a real exam.' }); } },
    });
    await assert.rejects(generate(input), /must not be presented as official/);
  });

  it('rejects official-question claims in choices and generated context, not only the prompt', async () => {
    const generate = createOriginalQuestionGenerationService({
      provider: {
        name: 'fixture',
        model: 'v1',
        async generate() {
          const result = content();
          result.choices[2] = { id: 'C', text: 'This is an authentic ACT question from an exam.' };
          return result;
        },
      },
    });
    await assert.rejects(generate(input), /must not be presented as official/);
  });

  it('validates generation inputs and reports unconfigured providers explicitly', async () => {
    const unavailable = createOriginalQuestionGenerationService({ provider: null });
    await assert.rejects(unavailable(input), QuestionGenerationUnavailableError);
    const configured = createOriginalQuestionGenerationService({
      provider: { name: 'fixture', model: 'v1', async generate() { return content(); } },
    });
    await assert.rejects(configured({ ...input, estimatedTimeSeconds: 0 }));
    await assert.rejects(configured({ ...input, extra: 'untrusted provider setting' }));
  });
});
