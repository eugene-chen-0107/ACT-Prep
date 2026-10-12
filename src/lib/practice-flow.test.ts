import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { submitPracticeAnswer, toStudentPracticeQuestion } from './practice-flow';
import type { UnifiedQuestion } from './question-provider';

const question: UnifiedQuestion = {
  id: 'practice-math-001',
  externalId: null,
  section: 'Math',
  sectionId: 'math',
  topic: 'Algebra',
  topicId: 'math-algebra',
  subtopic: 'Linear equations',
  subtopicId: 'math-linear-equations',
  difficulty: 'easy',
  questionType: 'multiple_choice',
  question: 'If 2x = 10, what is x?',
  passage: null,
  choices: [
    { id: 'A', text: '2' },
    { id: 'B', text: '5' },
    { id: 'C', text: '8' },
    { id: 'D', text: '12' },
  ],
  correctAnswer: 'B',
  explanation: 'Divide both sides by 2 to get x = 5.',
  source: 'original',
  provider: 'local-question-bank',
  estimatedTimeSeconds: 45,
  tags: ['algebra'],
  createdAt: '2026-09-24T00:00:00.000Z',
  updatedAt: '2026-09-24T00:00:00.000Z',
};

describe('practice flow', () => {
  it('keeps answer and explanation out of the question response until submission', () => {
    const studentQuestion = toStudentPracticeQuestion(question);
    assert.equal('correctAnswer' in studentQuestion, false);
    assert.equal('explanation' in studentQuestion, false);
    assert.deepEqual(studentQuestion.choices, question.choices);
  });

  it('scores from trusted question data, persists the attempt snapshot, then returns coaching feedback', async () => {
    const savedRows: Parameters<NonNullable<Parameters<typeof submitPracticeAnswer>[1]>['saveAttempt']>[0][] = [];
    const feedback = await submitPracticeAnswer({
      questionId: question.id,
      selectedAnswer: 'B',
      timeSpentSeconds: 38,
    }, {
      userId: 'student-123',
      getQuestionById: async (id) => id === question.id ? question : null,
      saveAttempt: async (attempt) => {
        savedRows.push(attempt);
        return { id: attempt.id, attemptedAt: new Date('2026-09-24T12:00:00.000Z') };
      },
      createId: () => 'attempt-123',
    });

    assert.equal(savedRows.length, 1);
    assert.deepEqual(savedRows[0], {
      id: 'attempt-123',
      userId: 'student-123',
      questionId: 'practice-math-001',
      selectedAnswer: 'B',
      correctAnswer: 'B',
      isCorrect: true,
      timeSpentSeconds: 38,
      section: 'Math',
      topic: 'Algebra',
      subtopic: 'Linear equations',
      difficulty: 'easy',
      questionSnapshot: {
        prompt: question.question,
        passage: question.passage,
        options: question.choices,
        explanation: question.explanation,
        questionType: question.questionType,
        estimatedTimeSeconds: 45,
        tags: ['algebra'],
        source: 'original',
      },
    });
    assert.equal(feedback.isCorrect, true);
    assert.equal(feedback.correctAnswer, 'B');
    assert.equal(feedback.explanation, question.explanation);
    assert.equal(feedback.keyConcept, 'Linear equations');
    assert.equal(feedback.attemptId, 'attempt-123');
    assert.equal(feedback.attemptedAt, '2026-09-24T12:00:00.000Z');
    assert.match(feedback.actStrategy, /substitute your answer/i);
    assert.equal(feedback.aiExplanation, null);
  });

  it('requests an explanation only after the authoritative attempt save completes', async () => {
    const events: string[] = [];
    let explainedInput: unknown;
    const feedback = await submitPracticeAnswer({ questionId: question.id, selectedAnswer: 'A', timeSpentSeconds: 8 }, {
      userId: 'student-123',
      getQuestionById: async () => question,
      saveAttempt: async (attempt) => {
        events.push('saved');
        return { id: attempt.id, attemptedAt: new Date('2026-10-01T12:00:00Z') };
      },
      explain: async (input) => {
        events.push('explained');
        explainedInput = input;
        return {
          correctAnswerId: 'B', correctAnswerText: 'B. 5', stepByStep: ['Divide by 2.'],
          whySelectedAnswerWasIncorrect: 'A is not 5.', keyConcept: 'Equations', actStrategy: 'Undo operations.',
          shortcut: null, takeaway: 'Isolate x.', calculationChecksVerified: 1, generatedByAI: true,
        };
      },
    });
    assert.deepEqual(events, ['saved', 'explained']);
    assert.deepEqual(explainedInput, {
      questionId: question.id, section: question.section, topic: question.topic, questionType: question.questionType,
      question: question.question, passage: question.passage, choices: question.choices, correctAnswer: question.correctAnswer,
      selectedAnswer: 'A', canonicalExplanation: question.explanation,
    });
    assert.equal(feedback.aiExplanation?.correctAnswerId, 'B');
    assert.equal(feedback.explanation, 'Divide by 2.');
  });

  it('stores incorrect answers as incorrect and refuses invalid selections without saving', async () => {
    let saveCalls = 0;
    const dependencies = {
      userId: 'student-123',
      getQuestionById: async () => question,
      saveAttempt: async (attempt: { id: string; attemptedAt?: Date | string }) => {
        saveCalls += 1;
        return { id: attempt.id, attemptedAt: new Date() };
      },
      createId: () => 'attempt-wrong',
    };
    const feedback = await submitPracticeAnswer({
      questionId: question.id,
      selectedAnswer: 'A',
      timeSpentSeconds: 5,
    }, dependencies);
    assert.equal(feedback.isCorrect, false);
    assert.equal(feedback.correctAnswer, 'B');
    assert.equal(feedback.aiExplanation, null);
    assert.equal(saveCalls, 1);

    await assert.rejects(submitPracticeAnswer({
      questionId: question.id,
      selectedAnswer: 'Z',
      timeSpentSeconds: 5,
    }, dependencies), /not one of the available choices/);
    assert.equal(saveCalls, 1);
  });
});
