import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildProgressAnalytics } from './progress-analytics';
import type { PerformanceAttempt } from './performance-analysis';
import { deriveStudyPlanSkills } from './study-plan-engine';

function attempt(index: number, correct: boolean, topic = 'Quadratics', section = 'Math', date = new Date(Date.UTC(2026, 2, 2 + index))): PerformanceAttempt {
  return {
    questionId: `q-${index}-${section}-${topic}`, attemptedAt: date, section, topic, subtopic: topic,
    difficulty: 'medium', isCorrect: correct, timeSpentSeconds: 50 + index,
    questionSnapshot: { prompt: 'Question' },
  };
}

describe('student progress analytics', () => {
  it('reports measurable topic improvement from separated answer cohorts', () => {
    const previous = [false, true, false, true, false, true, false, true, false, true].map((value, index) => attempt(index, value));
    const recent = [true, true, true, true, true, true, true, false, true, true].map((value, index) => attempt(index + 10, value));
    const report = buildProgressAnalytics({
      practiceAttempts: [...previous, ...recent], diagnosticAttempts: [], diagnosticScores: [], practiceTestScores: [], now: new Date('2026-04-01T12:00:00Z'),
    });
    assert.deepEqual(report.changes[0], {
      section: 'Math', topic: 'Quadratics', previousAccuracy: 50, recentAccuracy: 90,
      previousAttempts: 10, recentAttempts: 10, change: 40,
    });
    assert.match(report.improved[0].topic, /Quadratics/);
    assert.equal(report.summary.questionsAnswered, 20);
    assert.equal(report.summary.uniqueQuestions, 20);
    assert.equal(report.summary.practiceTimeSeconds, 1190);
    assert.equal(report.summary.testQuestions, 0);
    assert.equal(report.summary.testTimeSeconds, 0);
    assert.equal(report.topicMastery[0].mastery, 84);
    assert.equal(report.accuracyTrend.reduce((sum, point) => sum + point.attempts, 0), 20);
    const planSkills = deriveStudyPlanSkills(report.analysis);
    assert.ok(planSkills.find(({ topic }) => topic === 'Quadratics')!.accuracy >= 70);
    assert.equal(report.nextPractice.length, 0);
  });

  it('separates scored test progression from weekly practice accuracy and calculates next steps from weaker topics', () => {
    const diagnostic = [false, false, true].map((value, index) => attempt(index, value, 'Functions'));
    const practice = [false, false, false, true, false, false].map((value, index) => attempt(index + 4, value, 'Functions'));
    const report = buildProgressAnalytics({
      practiceAttempts: practice.slice(0, 3),
      testAttempts: practice.slice(3),
      diagnosticAttempts: diagnostic,
      diagnosticScores: [
        { date: '2026-03-03T12:00:00Z', score: 21, source: 'diagnostic', label: 'Diagnostic estimate' },
      ],
      practiceTestScores: [
        { date: '2026-03-15T12:00:00Z', score: 24, source: 'practice test', label: 'Practice test 1' },
      ],
      diagnosticSectionScores: [{ date: '2026-03-03T12:00:00Z', section: 'Math', score: 20, label: 'Diagnostic estimate' }],
      practiceTestSectionScores: [{ date: '2026-03-15T12:00:00Z', section: 'Math', score: 23, label: 'Practice test 1' }],
      now: new Date('2026-03-20T12:00:00Z'),
    });
    assert.deepEqual(report.scoreHistory.map(({ score }) => score), [21, 24]);
    assert.equal(report.scoreChange, 3);
    assert.deepEqual(report.sectionScoreHistory.map(({ score }) => score), [20, 23]);
    assert.equal(report.summary.diagnosticQuestions, 3);
    assert.equal(report.summary.practiceQuestions, 3);
    assert.equal(report.summary.testQuestions, 3);
    assert.equal(report.summary.diagnosticTimeSeconds, 153);
    assert.equal(report.summary.practiceTimeSeconds, 165);
    assert.equal(report.summary.testTimeSeconds, 174);
    assert.equal(report.summary.totalTrackedTimeSeconds, 492);
    assert.equal(report.nextPractice[0].topic, 'Functions');
    assert.match(report.nextPractice[0].reason, /accuracy/);
    assert.ok(report.accuracyTrend.every(({ week }) => week <= '2026-03-16'));
    assert.equal(report.sectionScoreHistory[0].section, 'Math');
  });

  it('does not infer changes from thin samples, future scores, or absent data', () => {
    const report = buildProgressAnalytics({
      practiceAttempts: [attempt(0, false, 'Geometry'), attempt(1, true, 'Geometry')], diagnosticAttempts: [], diagnosticScores: [],
      practiceTestScores: [{ date: '2027-01-01', score: 35, source: 'practice test', label: 'Future' }, { date: 'bad-date', score: 20, source: 'practice test', label: 'Invalid' }],
      now: new Date('2026-06-01T12:00:00Z'),
    });
    assert.equal(report.changes.length, 0);
    assert.equal(report.improved.length, 0);
    assert.equal(report.declined.length, 0);
    assert.equal(report.scoreHistory.length, 0);
    assert.equal(report.latestScore, null);
    assert.equal(report.nextPractice.length, 1);
    assert.equal(report.accuracyTrend.reduce((sum, point) => sum + point.attempts, 0), 2);
    assert.equal(report.summary.questionsAnswered, 2);
    assert.equal(report.hasPracticeData, true);
    const empty = buildProgressAnalytics({ practiceAttempts: [], diagnosticAttempts: [], diagnosticScores: [], practiceTestScores: [], now: new Date('2026-06-01T12:00:00Z') });
    assert.equal(empty.hasPracticeData, false);
    assert.equal(empty.recentPerformance.accuracy, null);
    assert.equal(empty.accuracyTrend.length, 0);
  });
});
