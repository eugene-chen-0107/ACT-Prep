import { AIQuestionProvider } from './ai-question-provider';
import { LicensedApiQuestionProvider } from './licensed-api-question-provider';
import { LocalQuestionProvider } from './local-question-provider';
import { QuestionProviderRegistry } from './question-provider-registry';

/**
 * Main server-side entry point for question consumption. The database provider
 * works now; external sources must be explicitly configured before they serve data.
 */
export const questionProvider = new QuestionProviderRegistry([
  new LocalQuestionProvider(),
  new AIQuestionProvider(),
  new LicensedApiQuestionProvider(),
]);
