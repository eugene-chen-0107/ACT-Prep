import type { QuestionProvider, QuestionProviderQuery, QuestionSource, UnifiedQuestion } from './question-provider';
import { QuestionProviderUnavailableError, unifiedQuestionSchema } from './question-provider';

export interface AIQuestionGenerator {
  generate(query: QuestionProviderQuery): Promise<UnifiedQuestion[]>;
  getQuestionById?(id: string): Promise<UnifiedQuestion | null>;
}

/**
 * AI adapter seam. Supply a server-side generator when a validated AI integration
 * is implemented; without one this provider explicitly reports unavailable.
 */
export class AIQuestionProvider implements QuestionProvider {
  readonly name = 'ai-question-provider';
  readonly sources: readonly QuestionSource[] = ['ai_generated'];

  constructor(private readonly generator?: AIQuestionGenerator) {}

  get available() {
    return Boolean(this.generator);
  }

  async getQuestions(query: QuestionProviderQuery = {}) {
    if (!this.generator) throw new QuestionProviderUnavailableError(this.name);
    const questions = await this.generator.generate(query);
    return questions.map((question) => unifiedQuestionSchema.parse({
      ...question,
      source: 'ai_generated',
      provider: this.name,
    }));
  }

  async getQuestionById(id: string): Promise<UnifiedQuestion | null> {
    if (!this.generator) throw new QuestionProviderUnavailableError(this.name);
    const question = await this.generator.getQuestionById?.(id);
    return question ? unifiedQuestionSchema.parse({
      ...question,
      source: 'ai_generated',
      provider: this.name,
    }) : null;
  }
}
