import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { publicTestQuestion } from './practice-test-projection';
import type { TestQuestionSnapshot } from './practice-test-engine';

const trustedQuestion = {
  id: 'original-q1', externalId: null, section: 'Math', sectionId: 'math', topic: 'Algebra', topicId: 'algebra',
  subtopic: 'Equations', subtopicId: 'equations', difficulty: 'easy', questionType: 'multiple_choice',
  question: 'If 2x = 8, what is x?', passage: null, choices: [{ id: 'A', text: '2' }, { id: 'B', text: '4' }],
  correctAnswer: 'B', explanation: 'Divide both sides by 2.', source: 'original', provider: 'local-question-bank',
  estimatedTimeSeconds: 30, tags: ['algebra'], createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z',
} as TestQuestionSnapshot;

describe('practice test question privacy', () => {
  it('removes the answer key and explanation from all student-facing question projections', () => {
    const question = publicTestQuestion(trustedQuestion);
    assert.equal(question.id, trustedQuestion.id);
    assert.deepEqual(question.choices, trustedQuestion.choices);
    assert.equal('correctAnswer' in question, false);
    assert.equal('explanation' in question, false);
  });
});
