import { loadEnvConfig } from '@next/env';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  achievementCatalog,
  practiceTestQuestions,
  practiceTests,
  questions,
  sections,
  topics,
} from './schema';
import { demoAchievements, demoQuestions, demoSections, demoTopics } from './seed-data';

loadEnvConfig(process.cwd());

async function seedDemoData() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo seed is disabled in production.');
  }
  if (process.env.SEED_DEMO_DATA !== '1') {
    throw new Error('Set SEED_DEMO_DATA=1 to explicitly enable inserting demo data.');
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required to seed demo data.');

  const client = postgres(connectionString, { max: 1, prepare: false });
  const db = drizzle(client);
  try {
    await db.insert(sections).values([...demoSections]).onConflictDoNothing({ target: sections.id });
    await db.insert(topics).values([...demoTopics]).onConflictDoNothing({ target: topics.id });

    const questionRows = demoQuestions.map((question) => ({
      ...question,
      status: 'published' as const,
      source: 'demo',
      sourceMetadata: { dataset: 'northstar-act-demo-v1', original: true },
      publishedAt: new Date('2025-01-01T00:00:00.000Z'),
    }));
    await db.insert(questions).values(questionRows).onConflictDoNothing({ target: questions.id });
    await db.insert(achievementCatalog).values([...demoAchievements]).onConflictDoNothing({ target: achievementCatalog.key });

    const testId = 'demo-foundations-v1';
    await db.insert(practiceTests).values({
      id: testId,
      slug: 'demo-foundations',
      version: 1,
      title: 'ACT Foundations — Demo Set',
      description: 'A short, original sample set for local data and workflow testing.',
      status: 'published',
      durationSeconds: 20 * 60,
      publishedAt: new Date('2025-01-01T00:00:00.000Z'),
    }).onConflictDoNothing({ target: practiceTests.id });

    const testQuestionRows = demoQuestions.map((question, position) => ({
      practiceTestId: testId,
      questionId: question.id,
      sectionId: question.sectionId,
      position: position + 1,
    }));
    await db.insert(practiceTestQuestions).values(testQuestionRows).onConflictDoNothing();

    console.info(`Seeded ${demoSections.length} sections, ${demoTopics.length} topics, ${demoQuestions.length} questions, 1 practice test, and ${demoAchievements.length} achievement definitions.`);
  } finally {
    await client.end();
  }
}

seedDemoData().catch((error: unknown) => {
  console.error('Demo seed failed:', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
});
