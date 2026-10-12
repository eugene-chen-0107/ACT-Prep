import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildReviewData, scheduleNextReview, type ReviewAttempt } from './spaced-review';

const now = new Date('2026-10-01T12:00:00.000Z');
function attempt(overrides: Partial<ReviewAttempt> & Pick<ReviewAttempt, 'questionId' | 'attemptedAt' | 'isCorrect'>): ReviewAttempt {
  return {
    section: 'Math', topic: 'Algebra', subtopic: 'Linear equations', selectedAnswer: 'A', correctAnswer: 'B',
    questionSnapshot: { prompt: `Prompt ${overrides.questionId}`, options: [{ id: 'A', text: 'Wrong' }, { id: 'B', text: 'Right' }], explanation: 'Because.' },
    ...overrides,
  };
}

describe('spaced review', () => {
  it('schedules a miss for tomorrow and extends intervals after correct streaks', () => {
    const missed = attempt({ questionId: 'q', attemptedAt: now, isCorrect: false });
    const firstCorrect = attempt({ questionId: 'q', attemptedAt: now, isCorrect: true, attemptId: 'a' });
    const secondCorrect = attempt({ questionId: 'q', attemptedAt: '2026-10-02T12:00:00Z', isCorrect: true, attemptId: 'b' });
    const thirdCorrect = attempt({ questionId: 'q', attemptedAt: '2026-10-03T12:00:00Z', isCorrect: true, attemptId: 'c' });
    assert.equal(scheduleNextReview(missed, [missed]), '2026-10-02T12:00:00.000Z');
    assert.equal(scheduleNextReview(firstCorrect, [firstCorrect]), '2026-10-04T12:00:00.000Z');
    assert.equal(scheduleNextReview(secondCorrect, [firstCorrect, secondCorrect]), '2026-10-09T12:00:00.000Z');
    assert.equal(scheduleNextReview(thirdCorrect, [firstCorrect, secondCorrect, thirdCorrect]), '2026-10-17T12:00:00.000Z');
    const recovered = attempt({ questionId: 'q', attemptedAt: now, isCorrect: true, attemptId: 'b' });
    const olderMiss = attempt({ questionId: 'q', attemptedAt: '2026-09-30T12:00:00Z', isCorrect: false, attemptId: 'a' });
    assert.equal(scheduleNextReview(recovered, [olderMiss, recovered]), '2026-10-04T12:00:00.000Z');
  });

  it('assembles recent misses, repeated mistakes, due items, weak skills, and snapshot answers', () => {
    const recentMiss = attempt({ questionId: 'miss', attemptedAt: '2026-10-01T10:00:00Z', isCorrect: false, selectedAnswer: 'A', attemptId: 'a' });
    const oldMiss = attempt({ questionId: 'repeat', attemptedAt: '2026-09-28T10:00:00Z', isCorrect: false, selectedAnswer: 'A', attemptId: 'a' });
    const repeatAgain = attempt({ questionId: 'repeat', attemptedAt: '2026-09-29T10:00:00Z', isCorrect: false, selectedAnswer: 'C', attemptId: 'b' });
    const wrongSkill = attempt({ questionId: 'skill-1', attemptedAt: '2026-09-28T12:00:00Z', isCorrect: false, topic: 'Geometry', attemptId: 'a' });
    const rightSkill = attempt({ questionId: 'skill-2', attemptedAt: '2026-09-29T12:00:00Z', isCorrect: true, topic: 'Geometry', attemptId: 'b' });
    const result = buildReviewData({
      now,
      attempts: [recentMiss, oldMiss, repeatAgain, wrongSkill, rightSkill],
      flags: [{ questionId: 'flagged-only', flaggedAt: '2026-09-30T09:00:00Z', question: { prompt: 'Flag-only', passage: null, options: [], explanation: 'Review me.', section: 'Reading', topic: 'Inference', subtopic: null } }],
    });
    assert.deepEqual(result.recentlyMissed.map(({ questionId }) => questionId), ['miss', 'repeat', 'skill-1']);
    assert.deepEqual(result.repeatedMistakes.map(({ questionId }) => questionId), ['repeat']);
    assert.deepEqual(result.dueForReview.map(({ questionId }) => questionId), ['repeat', 'skill-1']);
    assert.equal(result.repeatedMistakes[0].selectedAnswer, 'C');
    assert.equal(result.repeatedMistakes[0].correctAnswer, 'B');
    assert.equal(result.repeatedMistakes[0].previousAttempts[0].selectedAnswer, 'A');
    assert.equal(result.repeatedMistakes[0].options[1].text, 'Right');
    assert.equal(result.repeatedMistakes[0].explanation, 'Because.');
    assert.equal(result.weakestSkills[0].topic, 'Algebra');
    assert.equal(result.weakestSkills[0].accuracy, 0);
    assert.equal(result.flaggedQuestions[0].prompt, 'Flag-only');
    assert.equal(result.totalAttempts, 5);
  });

  it('returns no categories for invalid dates and keeps intervals deterministic', () => {
    const invalid = attempt({ questionId: 'bad', attemptedAt: 'not a date', isCorrect: false });
    const result = buildReviewData({ attempts: [invalid], flags: [], now });
    assert.equal(result.totalAttempts, 1);
    assert.equal(result.recentlyMissed.length, 0);
    assert.equal(result.dueForReview.length, 0);
    assert.equal(scheduleNextReview(invalid, [invalid]), null);
  });
});
