import 'server-only';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { aiExplanationCache } from '@/db/schema';
import type { ExplanationCache, GeneratedExplanation } from './ai-explanation';

export const postgresExplanationCache: ExplanationCache = {
  async get(key) {
    const [entry] = await getDb().select({ payload: aiExplanationCache.payload })
      .from(aiExplanationCache).where(and(eq(aiExplanationCache.cacheKey, key), eq(aiExplanationCache.status, 'ready'))).limit(1);
    return entry?.payload ?? null;
  },
  async set(key, provider, model, value: GeneratedExplanation) {
    await getDb().insert(aiExplanationCache).values({
      cacheKey: key,
      provider,
      model,
      payload: value,
      status: 'ready',
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: aiExplanationCache.cacheKey,
      set: { provider, model, payload: value, status: 'ready', updatedAt: new Date() },
    });
  },
};
