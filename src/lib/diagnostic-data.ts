import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { getDb } from '@/db';
import { diagnosticAssessments, diagnosticResponses } from '@/db/schema';
import { getAuth } from '@/lib/auth';
import { buildDiagnosticReport, DIAGNOSTIC_MAX_QUESTIONS, sampleDiagnosticQuestions, type DiagnosticReport, type DiagnosticResponse } from './diagnostic-assessment';
import { questionProvider } from './question-providers';
import { toStudentPracticeQuestion, type StudentPracticeQuestion } from './practice-flow';

export class DiagnosticRequestError extends Error {
  constructor(message: string, readonly status = 400) { super(message); this.name = 'DiagnosticRequestError'; }
}

async function authenticatedUserId() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) throw new DiagnosticRequestError('Unauthorized', 401);
  return session.user.id;
}

export type StartedDiagnostic = { id: string; questions: StudentPracticeQuestion[] };

export async function startMyDiagnostic(): Promise<StartedDiagnostic> {
  const userId = await authenticatedUserId();
  const bank = await questionProvider.getQuestions({ limit: 500 });
  const sampled = sampleDiagnosticQuestions(bank);
  const coveredSections = new Set(sampled.map(({ section }) => section));
  if (sampled.length !== DIAGNOSTIC_MAX_QUESTIONS || coveredSections.size !== 4) {
    throw new DiagnosticRequestError('The diagnostic needs at least three published questions per ACT section before it can start.', 503);
  }
  const id = randomUUID();
  await getDb().insert(diagnosticAssessments).values({
    id, userId, questionIds: sampled.map(({ id: questionId }) => questionId), status: 'in_progress', startedAt: new Date(),
  });
  return { id, questions: sampled.map(toStudentPracticeQuestion) };
}

export async function submitMyDiagnosticResponse(input: { assessmentId: string; questionId: string; selectedAnswer: string; timeSpentSeconds: number }) {
  const userId = await authenticatedUserId();
  const db = getDb();
  const [assessment] = await db.select().from(diagnosticAssessments)
    .where(and(eq(diagnosticAssessments.id, input.assessmentId), eq(diagnosticAssessments.userId, userId), eq(diagnosticAssessments.status, 'in_progress'))).limit(1);
  if (!assessment) throw new DiagnosticRequestError('Diagnostic assessment not found.', 404);
  if (!assessment.questionIds.includes(input.questionId)) throw new DiagnosticRequestError('Question is not part of this diagnostic.');

  const [existing] = await db.select({ id: diagnosticResponses.id }).from(diagnosticResponses)
    .where(and(eq(diagnosticResponses.assessmentId, assessment.id), eq(diagnosticResponses.questionId, input.questionId))).limit(1);
  // Make retries safe if a client lost the response after the insert committed.
  if (existing) return { saved: true, isComplete: false };

  const question = await questionProvider.getQuestionById(input.questionId);
  if (!question) throw new DiagnosticRequestError('Question not found.', 404);
  if (!question.choices.some(({ id }) => id === input.selectedAnswer)) throw new DiagnosticRequestError('Selected answer is not a valid choice.');
  const isCorrect = question.correctAnswer === input.selectedAnswer;
  await db.insert(diagnosticResponses).values({
    id: randomUUID(), assessmentId: assessment.id, userId, questionId: question.id, isCorrect,
    timeSpentSeconds: input.timeSpentSeconds, section: question.section, topic: question.topic, subtopic: question.subtopic,
    difficulty: question.difficulty, questionType: question.questionType, estimatedTimeSeconds: question.estimatedTimeSeconds, attemptedAt: new Date(),
  });
  return { saved: true, isComplete: false };
}

export async function completeMyDiagnostic(assessmentId: string): Promise<DiagnosticReport> {
  const userId = await authenticatedUserId();
  const db = getDb();
  const [assessment] = await db.select().from(diagnosticAssessments)
    .where(and(eq(diagnosticAssessments.id, assessmentId), eq(diagnosticAssessments.userId, userId))).limit(1);
  if (!assessment) throw new DiagnosticRequestError('Diagnostic assessment not found.', 404);
  if (assessment.status === 'completed' && assessment.report) return assessment.report as DiagnosticReport;

  const rows = await db.select({
    questionId: diagnosticResponses.questionId,
    isCorrect: diagnosticResponses.isCorrect,
    timeSpentSeconds: diagnosticResponses.timeSpentSeconds,
    section: diagnosticResponses.section,
    topic: diagnosticResponses.topic,
    subtopic: diagnosticResponses.subtopic,
    difficulty: diagnosticResponses.difficulty,
    questionType: diagnosticResponses.questionType,
    estimatedTimeSeconds: diagnosticResponses.estimatedTimeSeconds,
  }).from(diagnosticResponses)
    .where(and(eq(diagnosticResponses.assessmentId, assessment.id), eq(diagnosticResponses.userId, userId)))
    .orderBy(asc(diagnosticResponses.attemptedAt));
  if (rows.length !== assessment.questionIds.length || new Set(rows.map(({ questionId }) => questionId)).size !== assessment.questionIds.length) {
    throw new DiagnosticRequestError('Answer every diagnostic question before completing.', 409);
  }

  const report = buildDiagnosticReport(rows as DiagnosticResponse[]);
  await db.update(diagnosticAssessments).set({ status: 'completed', report, completedAt: new Date() })
    .where(and(eq(diagnosticAssessments.id, assessment.id), eq(diagnosticAssessments.userId, userId)));
  return report;
}
