import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { headers } from 'next/headers';
import { getDb } from '@/db';
import { practiceTestQuestions, practiceTests, questionAttempts, sections, testAttempts } from '@/db/schema';
import { getAuth } from '@/lib/auth';
import { questionProvider } from '@/lib/question-providers';
import { toStudentPracticeQuestion } from '@/lib/practice-flow';
import { accrueQuestionTime, createTestAttemptState, remainingSectionSeconds, startTestSection, summarizeTest, testSectionConfigurationSchema, type TestAttemptState, type TestQuestionSnapshot, type TestSectionSnapshot } from './practice-test-engine';
import { publicTestQuestion } from './practice-test-projection';

export class PracticeTestRequestError extends Error {
  constructor(message: string, readonly status = 400) { super(message); this.name = 'PracticeTestRequestError'; }
}
async function requireUserId() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new PracticeTestRequestError('Unauthorized', 401);
  return session.user.id;
}
function readState(value: unknown): TestAttemptState {
  if (value && typeof value === 'object' && 'phase' in value && 'activeSectionIndex' in value && 'activeQuestionIndex' in value && 'sectionStartedAt' in value && 'sectionDeadlineAt' in value) {
    const saved = value as TestAttemptState;
    return { ...saved, questionEnteredAt: saved.questionEnteredAt ?? null, questionTimes: saved.questionTimes ?? {} };
  }
  return createTestAttemptState();
}
function readManifest(value: unknown): TestQuestionSnapshot[] { return Array.isArray(value) ? value as TestQuestionSnapshot[] : []; }
function readSections(value: unknown): TestSectionSnapshot[] { return Array.isArray(value) ? value as TestSectionSnapshot[] : []; }
function answerRecord(value: unknown): Record<string, string | null> { return value && typeof value === 'object' && 'answers' in value && value.answers && typeof value.answers === 'object' ? value.answers as Record<string, string | null> : {}; }
function flagRecord(value: unknown): Record<string, boolean> { return value && typeof value === 'object' && 'flags' in value && value.flags && typeof value.flags === 'object' ? value.flags as Record<string, boolean> : {}; }
export async function listPracticeTests() {
  const userId = await requireUserId();
  const db = getDb();
  const rows = await db.select({ id: practiceTests.id, slug: practiceTests.slug, version: practiceTests.version, title: practiceTests.title, description: practiceTests.description, durationSeconds: practiceTests.durationSeconds, configuration: practiceTests.sectionConfiguration })
    .from(practiceTests).where(eq(practiceTests.status, 'published')).orderBy(desc(practiceTests.publishedAt));
  if (!rows.length) return { tests: [], activeAttempts: [] };
  const testIds = rows.map(({ id }) => id);
  const questionRows = await db.select({ testId: practiceTestQuestions.practiceTestId, sectionId: practiceTestQuestions.sectionId, questionId: practiceTestQuestions.questionId })
    .from(practiceTestQuestions).where(inArray(practiceTestQuestions.practiceTestId, testIds));
  const activeRows = await db.select({ id: testAttempts.id, title: testAttempts.testTitleSnapshot, testId: testAttempts.practiceTestId, startedAt: testAttempts.startedAt })
    .from(testAttempts).where(and(eq(testAttempts.userId, userId), eq(testAttempts.status, 'in_progress'))).orderBy(desc(testAttempts.startedAt));
  return {
    tests: rows.map((test) => ({ ...test, sections: test.configuration, questionCount: questionRows.filter(({ testId }) => testId === test.id).length, sectionCounts: Object.fromEntries(test.configuration.map(({ sectionId }) => [sectionId, questionRows.filter((row) => row.testId === test.id && row.sectionId === sectionId).length])) })),
    activeAttempts: activeRows.map(({ id, title, testId, startedAt }) => ({ id, title, testId, startedAt: startedAt.toISOString() })),
  };
}

export async function getMyTestAttempt(attemptId: string) {
  const userId = await requireUserId();
  const [attempt] = await getDb().select().from(testAttempts).where(and(eq(testAttempts.id, attemptId), eq(testAttempts.userId, userId))).limit(1);
  if (!attempt) throw new PracticeTestRequestError('Test attempt not found.', 404);
  const manifest = readManifest(attempt.questionManifest);
  const sections = readSections(attempt.configurationSnapshot);
  const state = readState(attempt.state);
  const answers = answerRecord(attempt.state);
  const flags = flagRecord(attempt.state);
  const result = attempt.status === 'completed' ? summarizeTest(manifest, answers, sections) : null;
  return { attemptId: attempt.id, status: attempt.status, testTitle: attempt.testTitleSnapshot, testVersion: attempt.testVersionSnapshot, phase: state.phase, activeSectionIndex: state.activeSectionIndex, activeQuestionIndex: state.activeQuestionIndex, sectionStartedAt: state.sectionStartedAt, sectionDeadlineAt: state.sectionDeadlineAt, remainingSeconds: remainingSectionSeconds(state), sections: sections.map(({ sectionId, sectionName, durationSeconds, instructions, questionIds }, index) => ({
    sectionId, sectionName, durationSeconds, instructions, questionCount: questionIds.length,
    answeredCount: questionIds.filter((id) => answers[id] !== undefined && answers[id] !== null).length,
    flaggedCount: questionIds.filter((id) => flags[id]).length,
    questions: attempt.status === 'completed' || (attempt.status === 'in_progress' && state.phase === 'in_progress' && index === state.activeSectionIndex)
      ? questionIds.map((id) => { const question = manifest.find((entry) => entry.id === id)!; return publicTestQuestion(question); })
      : [],
  })), answers, flags, result };
}

export async function startMyTestAttempt(testId: string) {
  const userId = await requireUserId();
  const db = getDb();
  const [existing] = await db.select({ id: testAttempts.id }).from(testAttempts).where(and(eq(testAttempts.userId, userId), eq(testAttempts.practiceTestId, testId), eq(testAttempts.status, 'in_progress'))).orderBy(desc(testAttempts.startedAt)).limit(1);
  if (existing) return getMyTestAttempt(existing.id);
  const [test] = await db.select().from(practiceTests).where(and(eq(practiceTests.id, testId), eq(practiceTests.status, 'published'))).limit(1);
  if (!test) throw new PracticeTestRequestError('Practice test not found.', 404);
  const config = testSectionConfigurationSchema.array().parse(test.sectionConfiguration);
  if (!config.length) throw new PracticeTestRequestError('This test is not configured yet.', 409);
  const joins = await db.select({ questionId: practiceTestQuestions.questionId, sectionId: practiceTestQuestions.sectionId, position: practiceTestQuestions.position, sectionName: sections.name })
    .from(practiceTestQuestions).innerJoin(sections, eq(practiceTestQuestions.sectionId, sections.id)).where(eq(practiceTestQuestions.practiceTestId, test.id)).orderBy(asc(practiceTestQuestions.position));
  if (!joins.length) throw new PracticeTestRequestError('This test has no questions yet.', 409);
  const unified = await Promise.all(joins.map(async ({ questionId }) => questionProvider.getQuestionById(questionId)));
  if (unified.some((question) => !question)) throw new PracticeTestRequestError('Some questions in this test are no longer available.', 409);
  if (unified.some((question) => question && question.source !== 'original' && question.source !== 'licensed_api')) throw new PracticeTestRequestError('Practice tests may only contain original or explicitly licensed questions.', 409);
  const questions = joins.map((row, index) => ({ ...unified[index]!, sectionId: row.sectionId }));
  const questionSections = new Map(joins.map(({ sectionId, sectionName }) => [sectionId, sectionName]));
  const sectionsSnapshot: TestSectionSnapshot[] = config.map((section) => {
    const sectionName = questionSections.get(section.sectionId);
    const questionIds = joins.filter((row) => row.sectionId === section.sectionId).map(({ questionId }) => questionId);
    if (!sectionName || !questionIds.length) throw new PracticeTestRequestError(`Configured section ${section.sectionId} has no questions.`, 409);
    return { ...section, sectionName, questionIds };
  });
  if (joins.some(({ sectionId }) => !sectionsSnapshot.some((section) => section.sectionId === sectionId))) throw new PracticeTestRequestError('Every test question must belong to a configured section.', 409);
  const manifest: TestQuestionSnapshot[] = questions.map((question) => ({ ...toStudentPracticeQuestion(question), correctAnswer: question.correctAnswer, explanation: question.explanation }));
  const id = randomUUID();
  const now = new Date();
  await db.insert(testAttempts).values({ id, userId, practiceTestId: test.id, testTitleSnapshot: test.title, testVersionSnapshot: test.version, questionManifest: manifest, configurationSnapshot: sectionsSnapshot, state: { ...createTestAttemptState(), answers: {}, flags: {} }, startedAt: now });
  return getMyTestAttempt(id);
}

export async function mutateMyTestAttempt(input: { attemptId: string; action: 'begin' | 'answer' | 'navigate' | 'flag' | 'continue' | 'expire' | 'finishSection' | 'submit'; questionId?: string; selectedAnswer?: string | null; questionIndex?: number; flagged?: boolean }) {
  const userId = await requireUserId();
  const db = getDb();
  const [attempt] = await db.select().from(testAttempts).where(and(eq(testAttempts.id, input.attemptId), eq(testAttempts.userId, userId))).limit(1);
  if (!attempt) throw new PracticeTestRequestError('Test attempt not found.', 404);
  if (attempt.status === 'completed') {
    if (input.action === 'submit') return getMyTestAttempt(attempt.id);
    throw new PracticeTestRequestError('This test has already been submitted.', 409);
  }
  const manifest = readManifest(attempt.questionManifest);
  const sections = readSections(attempt.configurationSnapshot);
  const existingState = readState(attempt.state);
  const answers = answerRecord(attempt.state);
  const flags = flagRecord(attempt.state);
  let state = existingState;
  const now = new Date();
  if (input.action === 'begin') {
    if (state.phase !== 'overview') throw new PracticeTestRequestError('Test has already started.', 409);
    state = { ...state, phase: 'instructions' };
  } else if (input.action === 'expire' || input.action === 'finishSection') {
    if (state.phase !== 'in_progress') throw new PracticeTestRequestError('The section is not active.', 409);
    if (input.action === 'expire' && remainingSectionSeconds(state, now) > 0) throw new PracticeTestRequestError('The section timer has not expired.', 409);
    state = { ...accrueQuestionTime(state, sections, now), phase: 'section_transition' };
  } else if (input.action === 'continue') {
    if (state.phase !== 'instructions' && state.phase !== 'section_transition') throw new PracticeTestRequestError('Section instructions are not available.', 409);
    if (state.phase === 'section_transition' && state.activeSectionIndex >= sections.length - 1) throw new PracticeTestRequestError('Submit the test to see your results.', 409);
    state = state.phase === 'instructions'
      ? startTestSection(state, sections, now)
      : { ...state, phase: 'instructions', activeSectionIndex: state.activeSectionIndex + 1, activeQuestionIndex: 0, sectionStartedAt: null, sectionDeadlineAt: null, questionEnteredAt: null };
  } else if (input.action === 'answer' || input.action === 'flag' || input.action === 'navigate') {
    if (state.phase !== 'in_progress') throw new PracticeTestRequestError('The section is not active.', 409);
    if (remainingSectionSeconds(state, now) <= 0) {
      state = { ...accrueQuestionTime(state, sections, now), phase: 'section_transition' };
    } else {
      state = accrueQuestionTime(state, sections, now);
      const activeSection = sections[state.activeSectionIndex];
      if (input.action === 'answer' || input.action === 'flag') {
        const question = manifest.find(({ id }) => id === input.questionId);
        if (!question || question.sectionId !== activeSection.sectionId) throw new PracticeTestRequestError('Question is not in the active section.', 400);
        if (input.action === 'answer') {
          if (input.selectedAnswer !== null && !question.choices.some(({ id }) => id === input.selectedAnswer)) throw new PracticeTestRequestError('Selected answer is invalid.', 400);
          answers[question.id] = input.selectedAnswer ?? null;
        } else flags[question.id] = Boolean(input.flagged);
        state = { ...state, activeQuestionIndex: activeSection.questionIds.indexOf(question.id), questionEnteredAt: now.toISOString() };
      } else {
        if (!Number.isInteger(input.questionIndex) || input.questionIndex! < 0 || input.questionIndex! >= activeSection.questionIds.length) throw new PracticeTestRequestError('Question position is invalid.', 400);
        state = { ...state, activeQuestionIndex: input.questionIndex!, questionEnteredAt: now.toISOString() };
      }
    }
  } else if (input.action === 'submit') {
    if (state.activeSectionIndex !== sections.length - 1 || (state.phase !== 'section_transition' && state.phase !== 'in_progress')) throw new PracticeTestRequestError('Complete every test section before submitting.', 409);
    state = { ...accrueQuestionTime(state, sections, now), phase: 'completed', sectionStartedAt: null, sectionDeadlineAt: null, questionEnteredAt: null };
  }
  const updatedState = { ...state, answers, flags };
  if (input.action === 'submit') {
    await db.transaction(async (transaction) => {
      for (const question of manifest) {
        const selectedAnswer = answers[question.id] ?? null;
        const existing = await transaction.select({ id: questionAttempts.id }).from(questionAttempts).where(and(eq(questionAttempts.testAttemptId, attempt.id), eq(questionAttempts.questionId, question.id))).limit(1);
        if (!existing.length) await transaction.insert(questionAttempts).values({
          id: randomUUID(), userId, questionId: question.id, testAttemptId: attempt.id, selectedAnswer, correctAnswer: question.correctAnswer,
          isCorrect: selectedAnswer !== null && selectedAnswer === question.correctAnswer,
          timeSpentSeconds: Math.max(0, updatedState.questionTimes[question.id] ?? 0), section: question.section, topic: question.topic,
          subtopic: question.subtopic, difficulty: question.difficulty,
          questionSnapshot: { prompt: question.question, passage: question.passage, options: question.choices, explanation: question.explanation, questionType: question.questionType, estimatedTimeSeconds: question.estimatedTimeSeconds, tags: question.tags, source: question.source },
        });
      }
      const summary = summarizeTest(manifest, answers, sections);
      await transaction.update(testAttempts).set({ state: updatedState, status: 'completed', completedAt: now, rawScore: summary.correct, sectionScores: {} })
        .where(and(eq(testAttempts.id, attempt.id), eq(testAttempts.userId, userId), eq(testAttempts.status, 'in_progress')));
    });
  } else {
    await db.update(testAttempts).set({ state: updatedState })
      .where(and(eq(testAttempts.id, attempt.id), eq(testAttempts.userId, userId), eq(testAttempts.status, 'in_progress')));
  }
  return getMyTestAttempt(attempt.id);
}
