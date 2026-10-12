import 'server-only';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { generatedQuestionValidations } from '@/db/schema';
import type { OriginalGeneratedQuestion, QuestionGenerationInput } from './ai-question-generation';
import { GrokOriginalQuestionReviewer } from './grok-question-reviewer';
import { validateOriginalQuestion, type OriginalQuestionReviewer, type QuestionLifecycle } from './original-question-validation';

const transition: Record<QuestionLifecycle, readonly QuestionLifecycle[]> = {
  GENERATED: ['VALIDATING'],
  VALIDATING: ['APPROVED', 'REJECTED'],
  APPROVED: ['AVAILABLE'],
  AVAILABLE: [],
  REJECTED: ['REGENERATE'],
  REGENERATE: ['GENERATED'],
};

export function assertQuestionLifecycleTransition(from: QuestionLifecycle, to: QuestionLifecycle) {
  if (!transition[from].includes(to)) throw new Error(`Invalid generated-question lifecycle transition: ${from} -> ${to}.`);
}

export async function validateAndStoreOriginalQuestion(input: QuestionGenerationInput, question: OriginalGeneratedQuestion, reviewer?: OriginalQuestionReviewer | null) {
  const db = getDb();
  const id = question.id;
  const now = new Date();
  const [stored] = await db.insert(generatedQuestionValidations).values({
    id: randomUUID(), questionId: id, lifecycle: 'GENERATED', question: question as unknown as Record<string, unknown>, checks: [], errors: [], attempts: 0,
    createdAt: now, updatedAt: now,
  }).onConflictDoUpdate({
    target: generatedQuestionValidations.questionId,
    set: { lifecycle: 'GENERATED', question: question as unknown as Record<string, unknown>, checks: [], errors: [], attempts: 0, updatedAt: now },
  }).returning({ id: generatedQuestionValidations.id, lifecycle: generatedQuestionValidations.lifecycle, attempts: generatedQuestionValidations.attempts });

  assertQuestionLifecycleTransition(stored.lifecycle, 'VALIDATING');
  await db.update(generatedQuestionValidations).set({ lifecycle: 'VALIDATING', attempts: stored.attempts + 1, updatedAt: new Date() })
    .where(eq(generatedQuestionValidations.id, stored.id));

  const configuredReviewer = reviewer === undefined ? (() => { const provider = new GrokOriginalQuestionReviewer(); return provider.available ? provider : null; })() : reviewer;
  const result = await validateOriginalQuestion(input, question, configuredReviewer);
  const terminal: QuestionLifecycle = result.passed ? 'APPROVED' : 'REJECTED';
  assertQuestionLifecycleTransition('VALIDATING', terminal);
  await db.update(generatedQuestionValidations).set({
    lifecycle: terminal,
    checks: result.checks,
    errors: result.errors,
    updatedAt: new Date(),
  }).where(eq(generatedQuestionValidations.id, stored.id));

  if (!result.passed) {
    assertQuestionLifecycleTransition('REJECTED', 'REGENERATE');
    await db.update(generatedQuestionValidations).set({ lifecycle: 'REGENERATE', updatedAt: new Date() })
      .where(eq(generatedQuestionValidations.id, stored.id));
    return { question: null, validation: result, lifecycle: 'REGENERATE' as const };
  }

  assertQuestionLifecycleTransition('APPROVED', 'AVAILABLE');
  await db.update(generatedQuestionValidations).set({ lifecycle: 'AVAILABLE', updatedAt: new Date() })
    .where(eq(generatedQuestionValidations.id, stored.id));
  return { question, validation: result, lifecycle: 'AVAILABLE' as const };
}
