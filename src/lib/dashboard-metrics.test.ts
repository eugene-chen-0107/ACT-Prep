import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboardMetrics, type DashboardAttempt } from './dashboard-metrics';

const now = new Date('2026-10-01T18:00:00.000Z');
const sections = [
  { id: 'english', name: 'English' },
  { id: 'math', name: 'Math' },
  { id: 'reading', name: 'Reading' },
  { id: 'science', name: 'Science' },
];
const topics = [
  { id: 'quadratics', sectionId: 'math', sectionName: 'Math', name: 'Quadratic Equations' },
];

function attempt(input: Partial<DashboardAttempt> & Pick<DashboardAttempt, 'attemptedAt' | 'isCorrect'>): DashboardAttempt {
  return {
    questionId: 'q-1',
    section: 'Math',
    topic: 'Quadratic Equations',
    subtopic: null,
    timeSpentSeconds: 60,
    questionSnapshot: { prompt: 'Solve for x.', estimatedTimeSeconds: 60 },
    ...input,
  };
}

function build(attempts: DashboardAttempt[]) {
  return buildDashboardMetrics({
    now,
    timeZone: 'UTC',
    attempts,
    sections,
    topics,
    targetScore: 30,
    latestTestScore: null,
    weeklyGoalMinutes: 140,
    activePracticeSessionId: null,
  });
}

describe('dashboard metrics', () => {
  it('recommends the weakest real topic and routes into filtered practice', () => {
    const metrics = build([
      attempt({ questionId: 'wrong', attemptedAt: now, isCorrect: false }),
      attempt({ questionId: 'right', attemptedAt: now, isCorrect: true }),
      attempt({ questionId: 'also-wrong', attemptedAt: now, isCorrect: false }),
    ]);

    assert.deepEqual(metrics.recommendation, {
      section: 'Math',
      topic: 'Quadratic Equations',
      attempts: 3,
      accuracy: 33,
      href: '/practice?sectionId=math&topicId=quadratics&limit=10',
      estimatedMinutes: 10,
      questionCount: 10,
    });
    assert.equal(metrics.sectionPerformance.find(({ name }) => name === 'Math')?.accuracy, 33);
    assert.equal(metrics.recentMistakes.length, 2);
    assert.equal(metrics.estimatedScore, null);
  });

  it('leaves the estimate unavailable, calculates daily goal/streak, and compares week accuracy', () => {
    const metrics = build([
      attempt({ attemptedAt: '2026-10-01T17:00:00.000Z', isCorrect: true, timeSpentSeconds: 120 }),
      attempt({ attemptedAt: '2026-10-01T15:00:00.000Z', isCorrect: false, timeSpentSeconds: 120 }),
      attempt({ attemptedAt: '2026-09-30T15:00:00.000Z', isCorrect: true }),
      attempt({ attemptedAt: '2026-09-25T15:00:00.000Z', isCorrect: true }),
      attempt({ attemptedAt: '2026-09-24T15:00:00.000Z', isCorrect: false }),
    ]);

    assert.equal(metrics.estimatedScore, null);
    assert.equal(metrics.targetScore, 30);
    assert.equal(metrics.today.minutes, 4);
    assert.equal(metrics.today.goalMinutes, 20);
    assert.equal(metrics.today.goalProgress, 20);
    assert.equal(metrics.streak, 2);
    assert.equal(metrics.thisWeekAttempts, 4);
    assert.equal(metrics.accuracyChange, 75);
    assert.equal(metrics.activity.at(-1)?.questions, 2);
  });

  it('shows actual latest-test progress toward the configured target without estimating from practice accuracy', () => {
    const metrics = buildDashboardMetrics({
      now,
      timeZone: 'UTC',
      attempts: [attempt({ attemptedAt: now, isCorrect: false })],
      sections,
      topics,
      targetScore: 30,
      latestTestScore: 24,
      weeklyGoalMinutes: 120,
      activePracticeSessionId: null,
    });
    assert.equal(metrics.estimatedScore, null);
    assert.equal(metrics.latestTestScore, 24);
    assert.equal(metrics.targetProgress, 79);
  });

  it('uses yesterday as the active streak when there has been no practice today', () => {
    const metrics = build([
      attempt({ attemptedAt: '2026-09-30T15:00:00.000Z', isCorrect: true }),
      attempt({ attemptedAt: '2026-09-29T15:00:00.000Z', isCorrect: false }),
    ]);
    assert.equal(metrics.streak, 2);
    assert.equal(metrics.today.minutes, 0);
    assert.equal(metrics.recommendation?.accuracy, 50);
  });

  it('returns clean empty states when the student has no attempts or configured goal', () => {
    const metrics = buildDashboardMetrics({
      now,
      timeZone: 'Invalid/Zone',
      attempts: [],
      sections,
      topics: [],
      targetScore: null,
      latestTestScore: null,
      weeklyGoalMinutes: null,
      activePracticeSessionId: null,
    });
    assert.equal(metrics.recommendation, null);
    assert.equal(metrics.targetScore, null);
    assert.equal(metrics.today.goalMinutes, 18);
    assert.equal(metrics.streak, 0);
    assert.equal(metrics.hasStudyToContinue, false);
    assert.equal(metrics.sectionPerformance.every(({ accuracy }) => accuracy === null), true);
  });
});
