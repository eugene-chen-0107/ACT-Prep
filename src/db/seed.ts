import { loadEnvConfig } from '@next/env';
import { sql } from 'drizzle-orm';
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
    await db.insert(sections).values([...demoSections]).onConflictDoUpdate({
      target: sections.id,
      set: { name: sql`excluded.name`, description: sql`excluded.description`, sortOrder: sql`excluded.sort_order` },
    });
    await db.insert(topics).values([...demoTopics]).onConflictDoUpdate({
      target: topics.id,
      set: {
        sectionId: sql`excluded.section_id`,
        parentTopicId: sql`excluded.parent_topic_id`,
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        sortOrder: sql`excluded.sort_order`,
      },
    });

    const questionRows = demoQuestions.map((question) => ({
      ...question,
      status: 'published' as const,
      source: 'original',
      sourceMetadata: { dataset: 'northstar-act-demo-v1', original: true },
      publishedAt: new Date('2025-01-01T00:00:00.000Z'),
    }));
    await db.insert(questions).values(questionRows).onConflictDoUpdate({
      target: questions.id,
      set: {
        sectionId: sql`excluded.section_id`,
        topicId: sql`excluded.topic_id`,
        subtopicId: sql`excluded.subtopic_id`,
        subtopic: sql`excluded.subtopic`,
        difficulty: sql`excluded.difficulty`,
        questionType: sql`excluded.question_type`,
        estimatedTimeSeconds: sql`excluded.estimated_time_seconds`,
        tags: sql`excluded.tags`,
        prompt: sql`excluded.prompt`,
        options: sql`excluded.options`,
        correctAnswer: sql`excluded.correct_answer`,
        explanation: sql`excluded.explanation`,
        status: sql`excluded.status`,
        source: sql`excluded.source`,
        sourceMetadata: sql`excluded.source_metadata`,
        publishedAt: sql`excluded.published_at`,
        updatedAt: sql`now()`,
      },
    });
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
      sectionConfiguration: [
        { sectionId: 'english', durationSeconds: 5 * 60, instructions: 'Read each sentence carefully and choose the clearest answer supported by standard written English.' },
        { sectionId: 'math', durationSeconds: 5 * 60, instructions: 'Work each problem carefully. You may move between questions in this section until time expires.' },
        { sectionId: 'reading', durationSeconds: 5 * 60, instructions: 'Use the passage evidence to choose the best-supported answer.' },
        { sectionId: 'science', durationSeconds: 5 * 60, instructions: 'Use the data and experimental details in each prompt to answer.' },
      ],
      publishedAt: new Date('2025-01-01T00:00:00.000Z'),
    }).onConflictDoUpdate({
      target: practiceTests.id,
      set: { sectionConfiguration: sql`excluded.section_configuration`, updatedAt: sql`now()` },
    });

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
