import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { accrueQuestionTime, advanceTestSection, createTestAttemptState, remainingSectionSeconds, startTestSection, summarizeTest, type TestQuestionSnapshot, type TestSectionSnapshot } from './practice-test-engine';

const sections: TestSectionSnapshot[] = [
  { sectionId: 'math', sectionName: 'Math', durationSeconds: 60, instructions: 'Solve carefully.', questionIds: ['q1', 'q2'] },
  { sectionId: 'reading', sectionName: 'Reading', durationSeconds: 90, instructions: 'Use evidence.', questionIds: ['q3'] },
];
const questions = [
  { id: 'q1', sectionId: 'math', correctAnswer: 'B', explanation: 'Substitute to verify the answer.' },
  { id: 'q2', sectionId: 'math', correctAnswer: 'A', explanation: 'Use the given equation.' },
  { id: 'q3', sectionId: 'reading', correctAnswer: 'C', explanation: 'Choose the evidence-based option.' },
] as TestQuestionSnapshot[];

describe('configurable practice test engine', () => {
  it('uses persisted server deadlines, rounds remaining time up, and never extends on refresh', () => {
    const started = startTestSection(createTestAttemptState(), sections, new Date('2026-10-01T12:00:00Z'));
    assert.equal(started.sectionDeadlineAt, '2026-10-01T12:01:00.000Z');
    assert.equal(remainingSectionSeconds(started, new Date('2026-10-01T12:00:00.001Z')), 60);
    assert.equal(remainingSectionSeconds(started, new Date('2026-10-01T12:00:59.500Z')), 1);
    assert.equal(remainingSectionSeconds(started, new Date('2026-10-01T12:01:00Z')), 0);
  });

  it('accounts question time only up to the active section deadline', () => {
    const started = startTestSection(createTestAttemptState(), sections, new Date('2026-10-01T12:00:00Z'));
    const accrued = accrueQuestionTime(started, sections, new Date('2026-10-01T12:00:12.900Z'));
    assert.equal(accrued.questionTimes.q1, 12);
    assert.equal(accrued.questionEnteredAt, '2026-10-01T12:00:12.900Z');
    const overdue = accrueQuestionTime(started, sections, new Date('2026-10-01T12:02:00Z'));
    assert.equal(overdue.questionTimes.q1, 60);
  });

  it('advances using the next configured section duration, then completes after the final section', () => {
    const started = startTestSection(createTestAttemptState(), sections, new Date('2026-10-01T12:00:00Z'));
    const transitioned = { ...started, phase: 'section_transition' as const };
    const next = advanceTestSection(transitioned, sections, new Date('2026-10-01T12:02:00Z'));
    assert.equal(next.activeSectionIndex, 1);
    assert.equal(next.sectionDeadlineAt, '2026-10-01T12:03:30.000Z');
    const finalTransition = advanceTestSection({ ...next, phase: 'section_transition' }, sections, new Date('2026-10-01T12:03:30Z'));
    assert.equal(finalTransition.phase, 'section_transition');
    assert.equal(finalTransition.sectionDeadlineAt, null);
  });

  it('scores strictly from trusted keys, treating unanswered items as incorrect', () => {
    const result = summarizeTest(questions, { q1: 'B', q2: null }, sections);
    assert.deepEqual(result, { totalQuestions: 3, answeredQuestions: 1, correct: 1, rawScore: 1, accuracy: 33, sectionScores: { Math: { correct: 1, total: 2, accuracy: 50 }, Reading: { correct: 0, total: 1, accuracy: 0 } }, answerReview: [
      { questionId: 'q1', sectionId: 'math', selectedAnswer: 'B', correctAnswer: 'B', isCorrect: true, explanation: 'Substitute to verify the answer.' },
      { questionId: 'q2', sectionId: 'math', selectedAnswer: null, correctAnswer: 'A', isCorrect: false, explanation: 'Use the given equation.' },
      { questionId: 'q3', sectionId: 'reading', selectedAnswer: null, correctAnswer: 'C', isCorrect: false, explanation: 'Choose the evidence-based option.' },
    ] });
  });
});
