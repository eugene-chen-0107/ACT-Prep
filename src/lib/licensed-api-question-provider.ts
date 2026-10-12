import type { QuestionProvider, QuestionProviderQuery, QuestionSource, UnifiedQuestion } from './question-provider';
import { QuestionProviderUnavailableError, unifiedQuestionSchema } from './question-provider';

export interface LicensedQuestionApiClient {
  listQuestions(query: QuestionProviderQuery): Promise<UnifiedQuestion[]>;
  getQuestion(id: string): Promise<UnifiedQuestion | null>;
}

/**
 * Placeholder for a provider used only under an explicit license and official API.
 * This class intentionally contains no scraping or undocumented-site access.
 */
export class LicensedApiQuestionProvider implements QuestionProvider {
  readonly name = 'licensed-question-api';
  readonly sources: readonly QuestionSource[] = ['licensed_api'];

  constructor(private readonly client?: LicensedQuestionApiClient) {}

  get available() {
    return Boolean(this.client);
  }

  async getQuestions(query: QuestionProviderQuery = {}) {
    if (!this.client) throw new QuestionProviderUnavailableError(this.name);
    const questions = await this.client.listQuestions(query);
    return questions.map((question) => unifiedQuestionSchema.parse({
      ...question,
      source: 'licensed_api',
      provider: this.name,
    }));
  }

  async getQuestionById(id: string) {
    if (!this.client) throw new QuestionProviderUnavailableError(this.name);
    const question = await this.client.getQuestion(id);
    return question ? unifiedQuestionSchema.parse({
      ...question,
      source: 'licensed_api',
      provider: this.name,
    }) : null;
  }
}
