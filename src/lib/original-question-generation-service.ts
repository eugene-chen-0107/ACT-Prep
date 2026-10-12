import 'server-only';
import { createOriginalQuestionGenerationService, QuestionGenerationUnavailableError, type OriginalQuestionGenerator } from './ai-question-generation';
import { GrokOriginalQuestionGenerator } from './grok-question-generator';

let injectedProvider: OriginalQuestionGenerator | null | undefined;

/** Allow server-side job/test composition to inject a different provider. */
export function configureOriginalQuestionGenerator(provider: OriginalQuestionGenerator | null) {
  injectedProvider = provider;
}

export function generateOriginalQuestion(input: unknown) {
  const configured = injectedProvider ?? (() => {
    const provider = new GrokOriginalQuestionGenerator();
    return provider.available ? provider : null;
  })();
  if (!configured) throw new QuestionGenerationUnavailableError();
  return createOriginalQuestionGenerationService({ provider: configured })(input);
}
