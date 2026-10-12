import type { QuestionProvider, QuestionProviderQuery, UnifiedQuestion } from './question-provider';
import { unifiedQuestionSchema } from './question-provider';

/** The application-facing provider; it can combine local and licensed catalogs. */
export class QuestionProviderRegistry implements QuestionProvider {
  readonly name = 'question-provider-registry';

  constructor(private readonly providers: readonly QuestionProvider[]) {}

  get sources() {
    return [...new Set(this.providers.flatMap(({ sources }) => sources))];
  }

  get available() {
    return this.providers.some(({ available }) => available);
  }

  private getProviders(query: QuestionProviderQuery = {}) {
    return this.providers.filter((provider) =>
      query.source
        ? provider.sources.includes(query.source)
        : provider.available && !provider.sources.includes('ai_generated'),
    );
  }

  async getQuestions(query: QuestionProviderQuery = {}): Promise<UnifiedQuestion[]> {
    const providers = this.getProviders(query);
    if (query.source && providers.length === 0) return [];

    const batches = await Promise.all(providers.map((provider) => provider.getQuestions(query)));
    const unique = new Map<string, UnifiedQuestion>();
    for (const question of batches.flat()) {
      const validated = unifiedQuestionSchema.parse(question);
      unique.set(validated.id, validated);
    }
    const results = [...unique.values()];
    return typeof query.limit === 'number' ? results.slice(0, Math.max(0, query.limit)) : results;
  }

  async getQuestionById(id: string): Promise<UnifiedQuestion | null> {
    for (const provider of this.providers.filter(({ available, sources }) => available && !sources.includes('ai_generated'))) {
      const question = await provider.getQuestionById(id);
      if (question) return unifiedQuestionSchema.parse(question);
    }
    return null;
  }
}
