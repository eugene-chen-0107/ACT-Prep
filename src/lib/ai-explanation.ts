import { createHash } from 'node:crypto';
import { z } from 'zod';

export const explanationRequestSchema = z.object({
  questionId: z.string().min(1).max(128),
  section: z.string().min(1).max(80),
  topic: z.string().min(1).max(160),
  questionType: z.string().min(1).max(64),
  question: z.string().min(1).max(12000),
  passage: z.string().max(30000).nullable(),
  choices: z.array(z.object({ id: z.string().min(1).max(32), text: z.string().min(1).max(4000) }).strict()).min(2).max(12),
  correctAnswer: z.string().min(1).max(32),
  selectedAnswer: z.string().min(1).max(32),
  canonicalExplanation: z.string().min(1).max(12000),
}).strict().superRefine((value, context) => {
  const ids = new Set(value.choices.map(({ id }) => id));
  if (ids.size !== value.choices.length || !ids.has(value.correctAnswer) || !ids.has(value.selectedAnswer)) {
    context.addIssue({ code: 'custom', message: 'Answers must identify distinct available choices.' });
  }
});

const arithmeticCheckSchema = z.object({
  left: z.number(),
  operator: z.enum(['+', '-', '*', '/', '^']),
  right: z.number(),
  result: z.number(),
}).strict();

export const generatedExplanationSchema = z.object({
  stepByStep: z.array(z.string().trim().min(1).max(1500)).min(1).max(8),
  whySelectedAnswerWasIncorrect: z.string().trim().min(1).max(2000),
  keyConcept: z.string().trim().min(1).max(300),
  actStrategy: z.string().trim().min(1).max(1000),
  shortcut: z.string().trim().max(1000).nullable(),
  takeaway: z.string().trim().min(1).max(500),
  calculationChecks: z.array(arithmeticCheckSchema).max(20),
}).strict();

export type ExplanationRequest = z.infer<typeof explanationRequestSchema>;
export type GeneratedExplanation = z.infer<typeof generatedExplanationSchema>;
export type StudentExplanation = Omit<GeneratedExplanation, 'calculationChecks'> & {
  correctAnswerId: string;
  correctAnswerText: string;
  calculationChecksVerified: number;
  generatedByAI: boolean;
};

export interface ExplanationProvider {
  readonly name: string;
  readonly model: string;
  generate(input: ExplanationRequest): Promise<unknown>;
}

export interface ExplanationCache {
  get(key: string): Promise<unknown | null>;
  set(key: string, provider: string, model: string, value: GeneratedExplanation): Promise<void>;
}

export function explanationCacheKey(provider: string, model: string, input: ExplanationRequest) {
  const content = Object.fromEntries(Object.entries(input).filter(([field]) => field !== 'questionId'));
  return createHash('sha256').update(JSON.stringify({ version: 1, provider, model, input: content })).digest('hex');
}

function computeArithmetic(left: number, operator: string, right: number) {
  switch (operator) {
    case '+': return left + right;
    case '-': return left - right;
    case '*': return left * right;
    case '/': return right === 0 ? Number.NaN : left / right;
    case '^': return left ** right;
    default: return Number.NaN;
  }
}

export function verifyCalculationChecks(checks: GeneratedExplanation['calculationChecks']) {
  return checks.every(({ left, operator, right, result }) => {
    const computed = computeArithmetic(left, operator, right);
    return Number.isFinite(computed) && Number.isFinite(result) && Math.abs(computed - result) <= 1e-9 * Math.max(1, Math.abs(computed));
  });
}

function isMathQuestion(input: ExplanationRequest) {
  return input.section.toLowerCase() === 'math' || input.questionType === 'math';
}

export function hasSufficientMathVerification(input: ExplanationRequest, explanation: GeneratedExplanation) {
  if (!isMathQuestion(input)) return true;
  const text = `${explanation.stepByStep.join(' ')} ${explanation.shortcut ?? ''}`;
  const hasVisibleArithmetic = /(?:\d\s*(?:[+\-×÷*/^=]|to the power of)\s*\d|\b(?:sum|difference|product|quotient|squared|square root)\b)/i.test(text);
  if (!hasVisibleArithmetic) return true;
  if (!explanation.calculationChecks.length) return false;
  const claims = [...text.matchAll(/(-?\d+(?:\.\d+)?)\s*([+\-−×÷*/^])\s*(-?\d+(?:\.\d+)?)(?:\s*=\s*(-?\d+(?:\.\d+)?))?/g)];
  if (claims.length === 0) return explanation.calculationChecks.length > 0;
  return claims.every(([, left, symbol, right, result]) => {
    const operator = symbol === '−' ? '-' : symbol === '×' ? '*' : symbol === '÷' ? '/' : symbol;
    return explanation.calculationChecks.some((check) => check.left === Number(left) && check.operator === operator && check.right === Number(right) && (result === undefined || check.result === Number(result)));
  });
}

const sectionStrategies: Record<string, string> = {
  English: 'Read the whole sentence for context, check grammar and meaning, then choose the clearest option that is still correct.',
  Math: 'Translate the prompt into a mathematical step, solve carefully, then substitute your answer to check it.',
  Reading: 'Return to the passage and prove your choice with a specific detail. Eliminate answers that go beyond the evidence.',
  Science: 'Identify what changes, what is measured, and what stays constant. Compare only the data that answers the question.',
};

export function buildFallbackExplanation(input: ExplanationRequest): StudentExplanation {
  const correctChoice = input.choices.find(({ id }) => id === input.correctAnswer);
  const selectedChoice = input.choices.find(({ id }) => id === input.selectedAnswer);
  const isCorrect = input.selectedAnswer === input.correctAnswer;
  return {
    correctAnswerId: input.correctAnswer,
    stepByStep: [input.canonicalExplanation],
    correctAnswerText: correctChoice ? `${correctChoice.id}. ${correctChoice.text}` : input.correctAnswer,
    whySelectedAnswerWasIncorrect: isCorrect
      ? 'Your selected answer is correct.'
      : `Your choice, ${input.selectedAnswer}${selectedChoice ? ` (${selectedChoice.text})` : ''}, is not the best answer. Review the explanation and compare it with the correct choice, ${input.correctAnswer}${correctChoice ? ` (${correctChoice.text})` : ''}.`,
    keyConcept: input.topic,
    actStrategy: sectionStrategies[input.section] ?? 'Identify what the question asks, use the evidence provided, and check that your answer directly fits.',
    shortcut: null,
    takeaway: `Remember the key idea: ${input.topic}.`,
    calculationChecksVerified: 0,
    generatedByAI: false,
  };
}

const inFlightExplanations = new Map<string, Promise<GeneratedExplanation | null>>();

export function createAIExplanationService(dependencies: {
  provider: ExplanationProvider | null;
  cache: ExplanationCache;
}) {
  function studentExplanation(input: ExplanationRequest, explanation: GeneratedExplanation): StudentExplanation {
    const correctChoice = input.choices.find(({ id }) => id === input.correctAnswer);
    return {
      ...explanation,
      correctAnswerId: input.correctAnswer,
      correctAnswerText: correctChoice ? `${correctChoice.id}. ${correctChoice.text}` : input.correctAnswer,
      whySelectedAnswerWasIncorrect: input.selectedAnswer === input.correctAnswer ? 'Your selected answer is correct.' : explanation.whySelectedAnswerWasIncorrect,
      calculationChecksVerified: explanation.calculationChecks.length,
      generatedByAI: true,
    };
  }
  return async function explain(inputValue: unknown): Promise<StudentExplanation> {
    const input = explanationRequestSchema.parse(inputValue);
    const fallback = buildFallbackExplanation(input);
    const provider = dependencies.provider;
    if (!provider) return fallback;

    const key = explanationCacheKey(provider.name, provider.model, input);
    let pending = inFlightExplanations.get(key);
    if (!pending) {
      pending = (async () => {
        try {
          const cached = await dependencies.cache.get(key);
          if (cached !== null) {
            const parsed = generatedExplanationSchema.safeParse(cached);
            if (parsed.success && verifyCalculationChecks(parsed.data.calculationChecks) && hasSufficientMathVerification(input, parsed.data)) {
              return parsed.data;
            }
          }

          const parsed = generatedExplanationSchema.safeParse(await provider.generate(input));
          if (!parsed.success || !verifyCalculationChecks(parsed.data.calculationChecks) || !hasSufficientMathVerification(input, parsed.data)) return null;
          await dependencies.cache.set(key, provider.name, provider.model, parsed.data);
          return parsed.data;
        } catch {
          // Existing, trusted explanation remains available if the optional AI service is unavailable.
          return null;
        }
      })();
      inFlightExplanations.set(key, pending);
      void pending.finally(() => {
        if (inFlightExplanations.get(key) === pending) inFlightExplanations.delete(key);
      });
    }
    const generated = await pending;
    return generated ? studentExplanation(input, generated) : fallback;
  };
}
