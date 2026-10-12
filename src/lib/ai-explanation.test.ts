import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createAIExplanationService,
  explanationCacheKey,
  type ExplanationCache,
  type ExplanationRequest,
  type GeneratedExplanation,
} from './ai-explanation';

const request: ExplanationRequest = {
  questionId: 'math-1', section: 'Math', topic: 'Algebra', questionType: 'multiple_choice',
  question: 'If 2x = 10, what is x?', passage: null,
  choices: [{ id: 'A', text: '2' }, { id: 'B', text: '5' }, { id: 'C', text: '8' }, { id: 'D', text: '12' }],
  correctAnswer: 'B', selectedAnswer: 'A', canonicalExplanation: 'Divide both sides by 2 to get x = 5.',
};

function generated(overrides: Partial<GeneratedExplanation> = {}): GeneratedExplanation {
  return {
    stepByStep: ['Divide both sides by 2.', '10 / 2 = 5.'],
    whySelectedAnswerWasIncorrect: 'Choice A is not the value of x after division.',
    keyConcept: 'Solving a linear equation',
    actStrategy: 'Undo multiplication using division, then check.',
    shortcut: 'Recognize half of 10.',
    takeaway: 'Isolate the variable by undoing operations.',
    calculationChecks: [{ left: 10, operator: '/', right: 2, result: 5 }],
    ...overrides,
  };
}

function memoryCache(): ExplanationCache & { values: Map<string, GeneratedExplanation> } {
  const values = new Map<string, GeneratedExplanation>();
  return {
    values,
    async get(key) { return values.get(key) ?? null; },
    async set(key, _provider, _model, value) { values.set(key, value); },
  };
}

describe('AI explanation service', () => {
  it('uses structured trusted input and never lets the provider choose the authoritative answer', async () => {
    let providerInput: ExplanationRequest | undefined;
    const service = createAIExplanationService({
      provider: { name: 'test', model: 'test-v1', async generate(input) { providerInput = input; return generated(); } },
      cache: memoryCache(),
    });
    const result = await service(request);
    assert.deepEqual(providerInput, request);
    assert.equal(result.correctAnswerId, 'B');
    assert.equal(result.correctAnswerText, 'B. 5');
    assert.equal(result.generatedByAI, true);
    assert.equal(result.calculationChecksVerified, 1);
  });

  it('caches identical structured requests and separates cache keys by answer and model', async () => {
    const cache = memoryCache();
    let calls = 0;
    const service = createAIExplanationService({
      provider: { name: 'test', model: 'v1', async generate() { calls += 1; return generated(); } },
      cache,
    });
    await service(request);
    await service(request);
    assert.equal(calls, 1);
    assert.equal(cache.values.size, 1);
    assert.notEqual(explanationCacheKey('test', 'v1', request), explanationCacheKey('test', 'v1', { ...request, selectedAnswer: 'C' }));
    assert.notEqual(explanationCacheKey('test', 'v1', request), explanationCacheKey('test', 'v2', request));
  });

  it('coalesces concurrent identical requests across service instances', async () => {
    let calls = 0;
    let resolveGeneration!: (value: unknown) => void;
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => { markStarted = resolve; });
    const generation = new Promise<unknown>((resolve) => { resolveGeneration = resolve; });
    const provider = {
      name: 'concurrent-test',
      model: 'v1',
      async generate() {
        calls += 1;
        markStarted();
        return generation;
      },
    };
    const firstService = createAIExplanationService({ provider, cache: memoryCache() });
    const secondService = createAIExplanationService({ provider, cache: memoryCache() });
    const first = firstService(request);
    const second = secondService({ ...request, questionId: 'same-content-different-id' });

    await started;
    resolveGeneration(generated());
    const [firstResult, secondResult] = await Promise.all([first, second]);

    assert.equal(calls, 1);
    assert.equal(firstResult.generatedByAI, true);
    assert.equal(secondResult.generatedByAI, true);
    assert.equal(firstResult.correctAnswerId, 'B');
    assert.equal(secondResult.correctAnswerId, 'B');
  });

  it('falls back to the trusted canonical explanation if a math check is wrong or omitted', async () => {
    for (const payload of [
      generated({ calculationChecks: [{ left: 10, operator: '/', right: 2, result: 6 }] }),
      generated({ calculationChecks: [] }),
    ]) {
      const service = createAIExplanationService({
        provider: { name: 'test', model: 'v1', async generate() { return payload; } },
        cache: memoryCache(),
      });
      const result = await service(request);
      assert.equal(result.generatedByAI, false);
      assert.deepEqual(result.stepByStep, [request.canonicalExplanation]);
      assert.equal(result.correctAnswerId, 'B');
    }
  });

  it('reuses equivalent content across catalog IDs while keeping answer-specific explanations separate', () => {
    assert.equal(explanationCacheKey('test', 'v1', request), explanationCacheKey('test', 'v1', { ...request, questionId: 'another-catalog-id' }));
    assert.notEqual(explanationCacheKey('test', 'v1', request), explanationCacheKey('test', 'v1', { ...request, selectedAnswer: 'C' }));
  });

  it('checks explicit numeric equations against the independent arithmetic results', async () => {
    const invalidClaim = generated({ stepByStep: ['Subtract 4 from 9: 9 - 4 = 6.'], calculationChecks: [{ left: 9, operator: '-', right: 4, result: 5 }] });
    const service = createAIExplanationService({
      provider: { name: 'test', model: 'v1', async generate() { return invalidClaim; } },
      cache: memoryCache(),
    });
    const result = await service(request);
    assert.equal(result.generatedByAI, false);
    assert.deepEqual(result.stepByStep, [request.canonicalExplanation]);
  });

  it('returns a helpful correct-answer notice and canonical fallback when AI is unavailable', async () => {
    const correctRequest = { ...request, selectedAnswer: 'B' };
    const service = createAIExplanationService({ provider: null, cache: memoryCache() });
    const result = await service(correctRequest);
    assert.equal(result.generatedByAI, false);
    assert.equal(result.whySelectedAnswerWasIncorrect, 'Your selected answer is correct.');
    assert.equal(result.correctAnswerId, 'B');
  });

  it('refuses malformed or answer-mismatched inputs before provider use', async () => {
    let calls = 0;
    const service = createAIExplanationService({
      provider: { name: 'test', model: 'v1', async generate() { calls += 1; return generated(); } },
      cache: memoryCache(),
    });
    await assert.rejects(service({ ...request, correctAnswer: 'Z' }));
    assert.equal(calls, 0);
  });
});
