import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { UnifiedQuestion } from './question-provider';
import { buildDiagnosticReport, DIAGNOSTIC_MAX_QUESTIONS, sampleDiagnosticQuestions, type DiagnosticResponse } from './diagnostic-assessment';

function question(section: string, topic: string, difficulty: 'easy' | 'medium' | 'hard', id: string): UnifiedQuestion {
  return {
    id, externalId: null, section, sectionId: section.toLowerCase(), topic, topicId: topic.toLowerCase(), subtopic: null,
    difficulty,
    questionType: 'multiple_choice',
    question: `Original practice prompt ${id}?`,
    passage: null,
    choices: [{ id: 'A', text: 'one' }, { id: 'B', text: 'two' }, { id: 'C', text: 'three' }, { id: 'D', text: 'four' }],
    correctAnswer: 'A', explanation: 'A is correct.', source: 'original', provider: 'fixture', estimatedTimeSeconds: 60,
    tags: [], createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

const bank = ['English', 'Math', 'Reading', 'Science'].flatMap((section) =>
  Array.from({ length: 3 }, (_, topicIndex) => ['easy', 'medium', 'hard'].map((difficulty, level) =>
    question(section, `${section} Skill ${topicIndex + 1}`, difficulty as 'easy' | 'medium' | 'hard', `${section}-${topicIndex}-${level}`),
  )).flat(),
);

describe('diagnostic assessment', () => {
  it('samples 12 unique questions with coverage across all four sections and difficulty levels', () => {
    const sampled = sampleDiagnosticQuestions(bank);
    assert.equal(sampled.length, DIAGNOSTIC_MAX_QUESTIONS);
    assert.equal(new Set(sampled.map(({ id }) => id)).size, sampled.length);
    for (const section of ['English', 'Math', 'Reading', 'Science']) {
      const sectionQuestions = sampled.filter((item) => item.section === section);
      assert.equal(sectionQuestions.length, 3);
      assert.ok(sectionQuestions.some(({ difficulty }) => difficulty === 'easy'));
      assert.ok(sectionQuestions.some(({ difficulty }) => difficulty === 'medium'));
      assert.ok(sectionQuestions.some(({ difficulty }) => difficulty === 'hard'));
    }
  });

  it('does not start a diagnostic when any required ACT section is absent', () => {
    const withoutScience = bank.filter((item) => item.section !== 'Science');
    const sampled = sampleDiagnosticQuestions(withoutScience);
    assert.notEqual(sampled.length, DIAGNOSTIC_MAX_QUESTIONS);
    assert.equal(new Set(sampled.map(({ section }) => section)).size, 3);
  });

  it('reports explicitly estimated section performance, strong/weak topics, pacing, and priority topics', () => {
    const responses: DiagnosticResponse[] = [];
    for (const section of ['English', 'Math', 'Reading', 'Science']) {
      for (let i = 0; i < 4; i += 1) responses.push({
        questionId: `${section}-${i}`, isCorrect: section !== 'Math' || i === 0,
        timeSpentSeconds: section === 'Reading' ? 120 : 60, section,
        topic: section === 'Math' ? 'Quadratics' : 'Comprehension', subtopic: null,
        difficulty: 'medium', questionType: 'multiple_choice', estimatedTimeSeconds: 60,
      });
    }
    const report = buildDiagnosticReport(responses, new Date('2026-10-10T12:00:00Z'));
    assert.equal(report.isOfficialScore, false);
    assert.match(report.label, /not an official ACT score/i);
    assert.deepEqual(report.estimatedPerformance.map(({ section }) => section), ['English', 'Math', 'Reading', 'Science']);
    assert.ok(report.estimatedPerformance.find(({ section }) => section === 'Math')!.estimatedScore! < report.estimatedPerformance.find(({ section }) => section === 'English')!.estimatedScore!);
    assert.ok(report.weakSkills.some(({ topic }) => topic === 'Quadratics'));
    assert.ok(report.strongSkills.some(({ topic }) => topic === 'Comprehension'));
    assert.ok(report.priorityTopics[0].topic === 'Quadratics');
    assert.equal(report.pacing.averageSecondsPerQuestion, 75);
    assert.equal(report.pacing.paceRatio, 1.25);
  });
});
