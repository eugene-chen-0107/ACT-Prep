import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeQuestionAttemptPerformance, type PerformanceAttempt } from './performance-analysis';
import { createSmartPracticePlan, toStudentSmartPracticePlan, validateSmartDuration } from './smart-practice-engine';
import type { UnifiedQuestion } from './question-provider';

const now = new Date('2026-10-01T12:00:00.000Z');
const taxonomy = [
  { section: 'Math', topic: 'Algebra', sectionId: 'math', topicId: 'algebra' },
  { section: 'Math', topic: 'Geometry', sectionId: 'math', topicId: 'geometry' },
  { section: 'Math', topic: 'Statistics', sectionId: 'math', topicId: 'statistics' },
  { section: 'English', topic: 'Conventions', sectionId: 'english', topicId: 'conventions' },
  { section: 'Reading', topic: 'Evidence', sectionId: 'reading', topicId: 'evidence' },
  { section: 'Science', topic: 'Data Analysis', sectionId: 'science', topicId: 'data-analysis' },
];

function question(input: Partial<UnifiedQuestion> & Pick<UnifiedQuestion, 'id'>): UnifiedQuestion {
  const skill = taxonomy.find(({ topic }) => topic === input.topic) ?? taxonomy[0];
  return {
    externalId: null,
    section: skill.section,
    sectionId: skill.sectionId,
    topic: skill.topic,
    topicId: skill.topicId,
    subtopic: null,
    difficulty: 'medium',
    questionType: 'multiple_choice',
    question: `Question ${input.id}`,
    passage: null,
    choices: [{ id: 'A', text: 'One' }, { id: 'B', text: 'Two' }],
    correctAnswer: 'A',
    explanation: 'Because A.',
    source: 'original',
    provider: 'local',
    estimatedTimeSeconds: 60,
    tags: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...input,
    id: input.id,
  };
}

function attempt(input: Partial<PerformanceAttempt> & Pick<PerformanceAttempt, 'questionId' | 'attemptedAt' | 'isCorrect'>): PerformanceAttempt {
  return {
    section: 'Math',
    topic: 'Algebra',
    subtopic: null,
    difficulty: 'medium',
    timeSpentSeconds: 60,
    questionSnapshot: { questionType: 'multiple_choice', prompt: input.questionId },
    ...input,
  };
}

function runPlan(input: {
  attempts?: PerformanceAttempt[];
  questions?: UnifiedQuestion[];
  duration?: number;
  targetScore?: number | null;
  latestTestScore?: number | null;
  targetTestDate?: Date | string | null;
}) {
  const attempts = input.attempts ?? [];
  const analysis = analyzeQuestionAttemptPerformance(attempts, now);
  return createSmartPracticePlan({
    now,
    durationMinutes: input.duration ?? 10,
    attempts,
    analysis,
    questions: input.questions ?? [question({ id: 'alg-1' }), question({ id: 'geo-1', topic: 'Geometry' })],
    targetScore: input.targetScore ?? null,
    latestTestScore: input.latestTestScore ?? null,
    targetTestDate: input.targetTestDate ?? null,
  });
}

describe('Smart Practice recommendation engine', () => {
  it('prioritizes weak Algebra (54%) while retaining deterministic scores and question uniqueness', () => {
    const attempts = [
      ...Array.from({ length: 20 }, (_, index) => attempt({ questionId: `alg-attempt-${index}`, topic: 'Algebra', attemptedAt: new Date(now.getTime() - index * 86_400_000), isCorrect: index < 11 })),
      ...Array.from({ length: 10 }, (_, index) => attempt({ questionId: `geo-attempt-${index}`, topic: 'Geometry', attemptedAt: new Date(now.getTime() - index * 2 * 86_400_000), isCorrect: index < 9 })),
      ...Array.from({ length: 10 }, (_, index) => attempt({ questionId: `stat-attempt-${index}`, topic: 'Statistics', attemptedAt: new Date(now.getTime() - index * 3 * 86_400_000), isCorrect: index < 9 })),
    ];
    const questions = [
      question({ id: 'alg-easy', topic: 'Algebra', difficulty: 'easy' }),
      question({ id: 'alg-medium', topic: 'Algebra', difficulty: 'medium' }),
      question({ id: 'geo-medium', topic: 'Geometry', difficulty: 'medium' }),
      question({ id: 'stats-hard', topic: 'Statistics', difficulty: 'hard', questionType: 'data_interpretation' }),
    ];
    const first = runPlan({ attempts, questions, duration: 5 });
    const second = runPlan({ attempts, questions, duration: 5 });
    assert.equal(first.recommendations[0].question.topic, 'Algebra');
    assert.deepEqual(first.recommendations.map(({ question: item, recommendationScore }) => [item.id, recommendationScore]), second.recommendations.map(({ question: item, recommendationScore }) => [item.id, recommendationScore]));
    assert.equal(new Set(first.recommendations.map(({ question: item }) => item.id)).size, first.recommendations.length);
  });

  it('reinforces a recent and repeated mistake, but penalizes recently repeated exact questions', () => {
    const attempts = [
      attempt({ questionId: 'mistake-q', topic: 'Geometry', attemptedAt: now, isCorrect: false }),
      attempt({ questionId: 'mistake-q', topic: 'Geometry', attemptedAt: new Date(now.getTime() - 2 * 86_400_000), isCorrect: false }),
      ...Array.from({ length: 10 }, (_, index) => attempt({ questionId: `alg-${index}`, topic: 'Algebra', attemptedAt: new Date(now.getTime() - index * 3 * 86_400_000), isCorrect: index < 9 })),
    ];
    const plan = runPlan({
      attempts,
      questions: [question({ id: 'mistake-q', topic: 'Geometry' }), question({ id: 'new-geometry', topic: 'Geometry' }), question({ id: 'algebra-clean' })],
      duration: 5,
    });
    assert.notEqual(plan.recommendations[0].question.id, 'mistake-q');
    assert.ok(plan.recommendations.some(({ question: item, balance }) => item.topic === 'Geometry' && balance.recentMistakes > 0));
  });

  it('spaces topics and chooses an alternate skill instead of hammering a just-practiced weakness', () => {
    const attempts = [
      ...Array.from({ length: 8 }, (_, index) => attempt({ questionId: `alg-${index}`, topic: 'Algebra', attemptedAt: now, isCorrect: index < 3 })),
      ...Array.from({ length: 8 }, (_, index) => attempt({ questionId: `geo-${index}`, topic: 'Geometry', attemptedAt: new Date(now.getTime() - 5 * 86_400_000), isCorrect: index < 5 })),
    ];
    const plan = runPlan({ attempts, questions: [question({ id: 'algebra-next' }), question({ id: 'geometry-next', topic: 'Geometry' })], duration: 5 });
    assert.equal(plan.recommendations[0].question.topic, 'Geometry');
  });

  it('uses target score and an approaching test date to increase goal urgency', () => {
    const questions = [question({ id: 'algebra', topic: 'Algebra' }), question({ id: 'reading', section: 'Reading', topic: 'Evidence', sectionId: 'reading', topicId: 'evidence' })];
    const attempts = [
      ...Array.from({ length: 10 }, (_, index) => attempt({ questionId: `alg-${index}`, topic: 'Algebra', attemptedAt: new Date(now.getTime() - 2 * 86_400_000), isCorrect: index < 8 })),
      ...Array.from({ length: 10 }, (_, index) => attempt({ questionId: `read-${index}`, section: 'Reading', topic: 'Evidence', attemptedAt: new Date(now.getTime() - 2 * 86_400_000), isCorrect: index < 6 })),
    ];
    const distant = runPlan({ attempts, questions, targetScore: 30, latestTestScore: 29, targetTestDate: '2027-05-01' });
    const imminentGap = runPlan({ attempts, questions, targetScore: 36, latestTestScore: 18, targetTestDate: '2026-10-05' });
    const distantAlgebra = distant.recommendations.find(({ question: item }) => item.id === 'algebra')!;
    const imminentAlgebra = imminentGap.recommendations.find(({ question: item }) => item.id === 'algebra')!;
    assert.ok(imminentAlgebra.balance.goalUrgency > distantAlgebra.balance.goalUrgency);
  });

  it('selects manageable difficulty for weak skills, progresses challenge for stronger skills, and varies type', () => {
    const questions = [
      question({ id: 'alg-easy', topic: 'Algebra', difficulty: 'easy' }),
      question({ id: 'alg-medium', topic: 'Algebra', difficulty: 'medium', questionType: 'passage_based' }),
      question({ id: 'geo-medium', topic: 'Geometry', difficulty: 'medium' }),
      question({ id: 'geo-hard', topic: 'Geometry', difficulty: 'hard', questionType: 'data_interpretation' }),
      question({ id: 'stats-hard', topic: 'Statistics', difficulty: 'hard', questionType: 'experiment_analysis' }),
    ];
    const attempts = [
      ...Array.from({ length: 10 }, (_, index) => attempt({ questionId: `weak-${index}`, topic: 'Algebra', attemptedAt: new Date(now.getTime() - 5 * 86_400_000), isCorrect: index < 4 })),
      ...Array.from({ length: 10 }, (_, index) => attempt({ questionId: `strong-${index}`, topic: 'Geometry', attemptedAt: new Date(now.getTime() - 5 * 86_400_000), isCorrect: index < 9 })),
    ];
    const plan = runPlan({ attempts, questions, duration: 10 });
    assert.equal(plan.recommendations[0].question.difficulty, 'easy');
    assert.ok(new Set(plan.recommendations.map(({ question: item }) => item.questionType)).size > 1);
    assert.ok(plan.recommendations.some(({ question: item }) => item.topic === 'Geometry'));
  });

  it('builds balanced starter sessions and respects preset/custom lengths and catalog limits', () => {
    assert.equal(validateSmartDuration(5), true);
    assert.equal(validateSmartDuration(120), true);
    assert.equal(validateSmartDuration(0), false);
    assert.equal(validateSmartDuration(5.5), false);
    assert.throws(() => runPlan({ duration: 121 }), /Session length/);

    const questions = Array.from({ length: 40 }, (_, index) => question({
      id: `starter-${index}`,
      ...taxonomy[index % taxonomy.length],
      questionType: (['multiple_choice', 'passage_based', 'data_interpretation', 'experiment_analysis'] as const)[index % 4],
    }));
    const five = runPlan({ questions, duration: 5 });
    const thirty = runPlan({ questions, duration: 30 });
    assert.equal(five.durationMinutes, 5);
    assert.equal(five.recommendations.length, 5);
    assert.equal(thirty.durationMinutes, 30);
    assert.equal(thirty.recommendations.length, 30);
    assert.equal(new Set(five.recommendations.map(({ question: item }) => item.section)).size, 4);
    const studentPlan = toStudentSmartPracticePlan(five);
    assert.equal('correctAnswer' in studentPlan.recommendations[0].question, false);
    assert.equal('explanation' in studentPlan.recommendations[0].question, false);
    assert.match(five.summary, /starter set/i);
  });

  it('accepts AI-generated questions through the same canonical question contract', () => {
    const generated = question({ id: 'ai-algebra', source: 'ai_generated', provider: 'ai-question-provider' });
    const plan = runPlan({ questions: [generated], duration: 5 });
    assert.equal(plan.recommendations[0].question.source, 'ai_generated');
    assert.equal(plan.recommendations[0].question.provider, 'ai-question-provider');
  });

  it('returns a useful empty plan when no providers have catalog questions', () => {
    const plan = runPlan({ questions: [], duration: 10 });
    assert.deepEqual(plan.recommendations, []);
    assert.equal(plan.estimatedQuestionCount, 0);
    assert.match(plan.summary, /No published questions/);
  });
});
