import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeQuestionAttemptPerformance } from './performance-analysis';
import type { PerformanceAttempt } from './performance-analysis';

const analyzedAt = new Date('2026-10-01T12:00:00.000Z');

function makeAttempt(input: Partial<PerformanceAttempt> & Pick<PerformanceAttempt, 'questionId' | 'attemptedAt' | 'isCorrect'>): PerformanceAttempt {
  return {
    section: 'Math',
    topic: 'Algebra',
    subtopic: 'Quadratics',
    difficulty: 'medium',
    timeSpentSeconds: 60,
    questionSnapshot: { prompt: `Prompt for ${input.questionId}`, questionType: 'multiple_choice' },
    ...input,
  };
}

describe('performance analysis', () => {
  it('calculates overall, section, topic, subtopic, difficulty, and question-type metrics', () => {
    const analysis = analyzeQuestionAttemptPerformance([
      makeAttempt({ questionId: 'q1', attemptedAt: '2026-09-30T12:00:00Z', isCorrect: true, timeSpentSeconds: 40 }),
      makeAttempt({ questionId: 'q2', attemptedAt: '2026-10-01T12:00:00Z', isCorrect: false, timeSpentSeconds: 80 }),
      makeAttempt({ questionId: 'q3', attemptedAt: '2026-10-01T11:00:00Z', isCorrect: true, section: 'English', topic: 'Conventions', subtopic: null, difficulty: 'easy', questionSnapshot: { questionType: 'passage_based' }, timeSpentSeconds: 100 }),
    ], analyzedAt);

    assert.equal(analysis.totalAttempts, 3);
    assert.equal(analysis.overall.accuracy, 67);
    assert.equal(analysis.overall.recentAccuracy, 67);
    assert.equal(analysis.overall.averageTimeSeconds, 73);
    assert.equal(analysis.overall.lastPracticed, '2026-10-01T12:00:00.000Z');
    assert.deepEqual(analysis.sections.map((metric) => [metric.label, metric.accuracy]), [['English', 100], ['Math', 50]]);
    assert.equal(analysis.topics.find(({ label }) => label === 'Algebra')?.accuracy, 50);
    assert.equal(analysis.subtopics.find(({ label }) => label === 'Quadratics')?.attempts, 2);
    assert.deepEqual(analysis.difficulties.map(({ label }) => label), ['easy', 'medium']);
    assert.equal(analysis.questionTypes.find(({ label }) => label === 'passage_based')?.accuracy, 100);
    assert.equal(analysis.methodology.recentWindow, 10);
    assert.equal(analysis.analyzedAt, analyzedAt.toISOString());
  });

  it('blends recent and historical accuracy for mastery after the minimum sample', () => {
    const attempts = Array.from({ length: 10 }, (_, index) => makeAttempt({
      questionId: `q-${index}`,
      attemptedAt: new Date(analyzedAt.getTime() - index * 60_000),
      isCorrect: index < 5,
    }));
    const analysis = analyzeQuestionAttemptPerformance(attempts, analyzedAt);
    assert.equal(analysis.overall.accuracy, 50);
    assert.equal(analysis.overall.recentAccuracy, 50);
    assert.equal(analysis.overall.masteryEstimate, 50);
    assert.equal(analysis.overall.masteryStatus, 'estimated');

    const recentImprovement = [
      ...Array.from({ length: 5 }, (_, index) => makeAttempt({ questionId: `old-${index}`, attemptedAt: `2026-09-${20 + index}T12:00:00Z`, isCorrect: false })),
      ...Array.from({ length: 12 }, (_, index) => makeAttempt({ questionId: `new-${index}`, attemptedAt: new Date(analyzedAt.getTime() - index * 60_000), isCorrect: true })),
    ];
    const improved = analyzeQuestionAttemptPerformance(recentImprovement, analyzedAt).overall;
    assert.equal(improved.historicalAccuracy, 71);
    assert.equal(improved.recentAccuracy, 100);
    assert.equal(improved.masteryEstimate, 91);
  });

  it('keeps mastery unavailable until five attempts and reports repeated questions missed more than once', () => {
    const analysis = analyzeQuestionAttemptPerformance([
      makeAttempt({ questionId: 'repeat', attemptedAt: '2026-10-01T12:00:00Z', isCorrect: false }),
      makeAttempt({ questionId: 'repeat', attemptedAt: '2026-09-30T12:00:00Z', isCorrect: false }),
      makeAttempt({ questionId: 'one-off', attemptedAt: '2026-09-29T12:00:00Z', isCorrect: false }),
      makeAttempt({ questionId: 'right', attemptedAt: '2026-09-28T12:00:00Z', isCorrect: true }),
    ], analyzedAt);

    assert.equal(analysis.overall.masteryEstimate, null);
    assert.equal(analysis.overall.masteryStatus, 'building_data');
    assert.equal(analysis.overall.repeatedMistakes, 1);
    assert.deepEqual(analysis.repeatedMistakes, [{
      questionId: 'repeat',
      section: 'Math',
      topic: 'Algebra',
      prompt: 'Prompt for repeat',
      incorrectAttempts: 2,
      lastMistakeAt: '2026-10-01T12:00:00.000Z',
    }]);
  });

  it('handles absent and malformed attempt dimensions without producing NaN metrics', () => {
    const analysis = analyzeQuestionAttemptPerformance([
      makeAttempt({ questionId: 'unknown', attemptedAt: 'not-a-date', isCorrect: false }),
      makeAttempt({ questionId: 'no-topic', attemptedAt: '2026-10-01T12:00:00Z', isCorrect: true, topic: null, subtopic: null, difficulty: null, questionSnapshot: null }),
    ], analyzedAt);

    assert.equal(analysis.totalAttempts, 1);
    assert.equal(analysis.overall.averageTimeSeconds, 60);
    assert.equal(analysis.topics.length, 0);
    assert.equal(analysis.subtopics.length, 0);
    assert.equal(analysis.difficulties.length, 0);
    assert.equal(analysis.questionTypes.length, 0);
    assert.equal(analysis.overall.accuracy, 100);
  });
});
