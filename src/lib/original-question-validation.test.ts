import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { OriginalGeneratedQuestion, QuestionGenerationInput } from './ai-question-generation';
import { validateOriginalQuestion, type SemanticQuestionReview } from './original-question-validation';

const input: QuestionGenerationInput = {
  section: 'Math', topic: 'Algebra', subtopic: 'Linear equations', difficulty: 'easy',
  questionType: 'multiple_choice', targetSkill: 'Solve one-step equations',
  estimatedTimeSeconds: 45, studentWeakness: 'Often adds instead of dividing.',
};
const goodReview: SemanticQuestionReview = {
  exactlyOneCorrectAnswer: true,
  correctAnswerSolves: true,
  allChoicesValid: true,
  noContradictions: true,
  noAmbiguousWording: true,
  noAnswerLeakage: true,
  correctTopic: true,
  appropriateDifficulty: true,
  explanationCorrect: true,
  original: true,
  notes: [],
};

function question(overrides: Partial<OriginalGeneratedQuestion> = {}): OriginalGeneratedQuestion {
  return {
    id: 'ai_test', externalId: null, section: 'Math', topic: 'Algebra', subtopic: 'Linear equations',
    difficulty: 'easy', questionType: 'multiple_choice',
    question: 'A box holds 4 equal groups of pencils, 28 pencils altogether. How many pencils are in each group?',
    passage: null,
    choices: [{ id: 'A', text: '6' }, { id: 'B', text: '7' }, { id: 'C', text: '24' }, { id: 'D', text: '32' }],
    correctAnswer: 'B', explanation: 'Let x be pencils per group. 4x = 28, so x = 28 / 4 = 7.',
    source: 'ai_generated', provider: 'fixture', estimatedTimeSeconds: 45, tags: [],
    createdAt: '2026-10-10T00:00:00.000Z', updatedAt: '2026-10-10T00:00:00.000Z',
    targetSkill: input.targetSkill, concept: 'Equal groups',
    incorrectAnswerExplanations: [
      { choiceId: 'A', explanation: '6 does not satisfy 4x = 28.' },
      { choiceId: 'C', explanation: '24 does not satisfy 4x = 28.' },
      { choiceId: 'D', explanation: '32 does not satisfy 4x = 28.' },
    ],
    officialStatus: 'not_official',
    ...overrides,
  };
}

const semanticReviewer = (override: Partial<SemanticQuestionReview> = {}) => ({
  async review() { return { ...goodReview, ...override }; },
});

describe('original question validation', () => {
  it('approves a well-formed, semantically correct question with deterministic math verification', async () => {
    const result = await validateOriginalQuestion(input, question(), semanticReviewer());
    assert.equal(result.passed, true, result.errors.join('\n'));
    assert.equal(result.checks.find(({ name }) => name === 'deterministic_math')?.status, 'passed');
    assert.ok(result.checks.some(({ name }) => name === 'correct_answer_solves'));
  });

  it('rejects invalid labels, duplicate options, missing correct answer, and leaked answers', async () => {
    const broken = question({
      question: 'The correct answer is B. A box holds 4 equal groups of 28 pencils. How many per group?',
      choices: [{ id: 'A', text: '7' }, { id: 'A', text: '7' }, { id: 'C', text: '24' }, { id: 'D', text: '' }],
      correctAnswer: 'B',
    });
    const result = await validateOriginalQuestion(input, broken, semanticReviewer({ allChoicesValid: false }));
    assert.equal(result.passed, false);
    assert.ok(result.errors.some((error) => error.includes('formatting')));
    assert.ok(result.errors.some((error) => error.includes('exactly_one_correct_answer')));
    assert.ok(result.errors.some((error) => error.includes('no_answer_leakage')));
  });

  it('rejects mathematically wrong marked answers and explanations', async () => {
    const broken = question({
      correctAnswer: 'A',
      explanation: 'Since 4x = 28, x = 6.',
    });
    const result = await validateOriginalQuestion(input, broken, semanticReviewer({ correctAnswerSolves: false, explanationCorrect: false }));
    assert.equal(result.passed, false);
    assert.ok(result.errors.some((error) => error.includes('deterministic_math')));
    assert.ok(result.errors.some((error) => error.includes('correct_answer_solves')));
  });

  it('rejects contradiction, ambiguous wording, wrong topic/difficulty, and non-original review', async () => {
    const result = await validateOriginalQuestion(input, question(), semanticReviewer({
      noContradictions: false,
      noAmbiguousWording: false,
      correctTopic: false,
      appropriateDifficulty: false,
      original: false,
    }));
    assert.equal(result.passed, false);
    for (const check of ['no_contradictions', 'unambiguous_wording', 'correct_topic', 'appropriate_difficulty', 'originality_semantic']) {
      assert.ok(result.errors.some((error) => error.includes(check)), `Expected failure for ${check}`);
    }
  });

  it('fails closed when no independent semantic reviewer is configured', async () => {
    const result = await validateOriginalQuestion(input, question(), null);
    assert.equal(result.passed, false);
    assert.ok(result.errors.some((error) => error.includes('semantic_review')));
  });

  it('rejects a known duplicate normalized question fingerprint', async () => {
    const fingerprint = 'a box holds 4 equal groups of pencils 28 pencils altogether how many pencils are in each group 6 7 24 32';
    const result = await validateOriginalQuestion(input, question(), semanticReviewer(), { existingFingerprints: new Set([fingerprint]) });
    assert.equal(result.passed, false);
    assert.ok(result.errors.some((error) => error.includes('duplicates an existing generated question')));
  });
});
