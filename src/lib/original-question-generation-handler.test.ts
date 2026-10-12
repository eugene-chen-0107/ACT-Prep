import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QuestionGenerationUnavailableError, type QuestionGenerationInput } from './ai-question-generation';
import { createOriginalQuestionGenerationHandler } from './original-question-generation-handler';

const input = {
  section: 'Math',
  topic: 'Algebra',
  subtopic: 'Linear equations',
  difficulty: 'easy',
  questionType: 'multiple_choice',
  targetSkill: 'Solve one-step equations',
  estimatedTimeSeconds: 45,
  studentWeakness: 'Sometimes adds instead of dividing.',
};
const generated = {
  id: 'ai_123',
  section: 'Math',
  topic: 'Algebra',
  subtopic: 'Linear equations',
  difficulty: 'easy',
  questionType: 'multiple_choice',
  question: 'A student has 24 tiles arranged equally in 6 rows. How many tiles are in each row?',
  passage: null,
  choices: [{ id: 'A', text: '4' }, { id: 'B', text: '18' }, { id: 'C', text: '30' }, { id: 'D', text: '144' }],
  correctAnswer: 'A',
  explanation: 'Divide 24 by 6 to find 4 tiles per row.',
  incorrectAnswerExplanations: [
    { choiceId: 'B', explanation: 'This subtracts 6 from 24.' },
    { choiceId: 'C', explanation: 'This adds 6 and 24.' },
    { choiceId: 'D', explanation: 'This multiplies 24 by 6.' },
  ],
  concept: 'Equal groups',
  estimatedTimeSeconds: 45,
  source: 'ai_generated',
  provider: 'fixture',
  officialStatus: 'not_official',
};

function post(body: unknown) {
  return new Request('https://example.test/api/student/practice/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('original question-generation handler', () => {
  it('returns a private structured ai_generated, non-official question after authentication', async () => {
    let received: unknown;
    const handle = createOriginalQuestionGenerationHandler({
      hasTrustedOrigin: () => true,
      isAuthenticated: async () => true,
      generate: async (value) => { received = value; return generated; },
    });

    const response = await handle(post(input));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(received, input);
    assert.equal((await response.json()).source, 'ai_generated');
    assert.equal(generated.officialStatus, 'not_official');
  });

  it('requires a trusted origin and authenticated student', async () => {
    const handle = createOriginalQuestionGenerationHandler({
      hasTrustedOrigin: () => false,
      isAuthenticated: async () => false,
      generate: async () => generated,
    });
    assert.equal((await handle(post(input))).status, 403);

    const authenticatedOnly = createOriginalQuestionGenerationHandler({
      hasTrustedOrigin: () => true,
      isAuthenticated: async () => false,
      generate: async () => generated,
    });
    assert.equal((await authenticatedOnly(post(input))).status, 401);
  });

  it('regenerates rejected content with validation feedback and returns only AVAILABLE content', async () => {
    let generatedCount = 0;
    const handle = createOriginalQuestionGenerationHandler({
      hasTrustedOrigin: () => true,
      isAuthenticated: async () => true,
      generate: async (value) => {
        generatedCount += 1;
        if (generatedCount > 1) assert.match((value as QuestionGenerationInput).studentWeakness, /correct answer/i);
        return { ...generated, id: `ai_${generatedCount}` };
      },
      validate: async (_value, candidate) => generatedCount === 1
        ? { lifecycle: 'REGENERATE', question: null, validation: { errors: ['correct answer is wrong'] } }
        : { lifecycle: 'AVAILABLE', question: candidate, validation: { errors: [] } },
    });
    const response = await handle(post(input));
    assert.equal(response.status, 200);
    assert.equal(generatedCount, 2);
    assert.equal((await response.json()).id, 'ai_2');
  });

  it('never returns a rejected question if regeneration still fails validation', async () => {
    const handle = createOriginalQuestionGenerationHandler({
      hasTrustedOrigin: () => true,
      isAuthenticated: async () => true,
      generate: async () => generated,
      validate: async () => ({ lifecycle: 'REGENERATE', question: null, validation: { errors: ['ambiguous wording'] } }),
      maxRegenerations: 1,
    });
    const response = await handle(post(input));
    assert.equal(response.status, 422);
    assert.equal((await response.json()).lifecycle, 'REGENERATE');
  });

  it('rejects invalid inputs and reports unconfigured generation safely', async () => {
    const handle = createOriginalQuestionGenerationHandler({
      hasTrustedOrigin: () => true,
      isAuthenticated: async () => true,
      generate: async () => { throw new QuestionGenerationUnavailableError(); },
    });
    assert.equal((await handle(post({ ...input, estimatedTimeSeconds: 0 }))).status, 400);
    assert.equal((await handle(post(input))).status, 503);
  });
});
