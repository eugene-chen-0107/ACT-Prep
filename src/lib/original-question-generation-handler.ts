import { questionGenerationInputSchema, QuestionGenerationUnavailableError, type QuestionGenerationInput } from './ai-question-generation';

function appendValidationFeedback(weakness: string, errors: string[]) {
  const feedback = errors.join('; ').slice(0, 1200);
  return `${weakness} Previous generated draft validation failed: ${feedback}. Correct these errors while making a fresh original question.`.slice(0, 2000);
}

export function createOriginalQuestionGenerationHandler(dependencies: {
  hasTrustedOrigin(request: Request): boolean;
  isAuthenticated(): Promise<boolean>;
  generate(input: QuestionGenerationInput): Promise<unknown>;
  validate?(input: QuestionGenerationInput, question: unknown): Promise<unknown>;
  maxRegenerations?: number;
}) {
  return async function handle(request: Request): Promise<Response> {
    if (!dependencies.hasTrustedOrigin(request)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!await dependencies.isAuthenticated()) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = questionGenerationInputSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Invalid question-generation request.' }, { status: 400 });
    }

    try {
      if (!dependencies.validate) {
        const question = await dependencies.generate(parsed.data);
        return Response.json(question, { headers: { 'Cache-Control': 'private, no-store' } });
      }

      const maxAttempts = Math.max(1, Math.min((dependencies.maxRegenerations ?? 1) + 1, 3));
      let previousErrors: string[] = [];
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const retryInput = attempt === 0 ? parsed.data : {
          ...parsed.data,
          studentWeakness: appendValidationFeedback(parsed.data.studentWeakness, previousErrors),
        };
        const generated = await dependencies.generate(retryInput);
        const validated = await dependencies.validate(retryInput, generated);
        if (validated && typeof validated === 'object' && 'lifecycle' in validated && validated.lifecycle === 'AVAILABLE' && 'question' in validated) {
          return Response.json(validated.question, { headers: { 'Cache-Control': 'private, no-store' } });
        }
        previousErrors = validated && typeof validated === 'object' && 'validation' in validated
          ? (validated as { validation?: { errors?: string[] } }).validation?.errors ?? []
          : ['Validation did not reach AVAILABLE.'];
      }
      return Response.json({ error: 'Generated question failed validation after regeneration.', lifecycle: 'REGENERATE', validationErrors: previousErrors }, { status: 422, headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
      if (error instanceof QuestionGenerationUnavailableError) {
        return Response.json({ error: 'Original question generation is not configured.' }, { status: 503 });
      }
      return Response.json({ error: 'Could not generate an original practice question.' }, { status: 502 });
    }
  };
}
