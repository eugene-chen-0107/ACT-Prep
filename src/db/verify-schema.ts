import { loadEnvConfig } from '@next/env';
import postgres from 'postgres';

loadEnvConfig(process.cwd());

async function verifyDatabase() {
  const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Set TEST_DATABASE_URL or DATABASE_URL to a disposable verification database.');

  const client = postgres(connectionString, { max: 1, prepare: false });
  try {
    const requiredTables = [
      'user', 'profiles', 'sections', 'topics', 'questions', 'attempts', 'practice_sessions',
      'practice_tests', 'practice_test_questions', 'test_attempts', 'study_plans',
      'study_plan_tasks', 'achievement_catalog', 'achievements',
    ];
    const found = await client<{ table_name: string }[]>`
      select table_name
      from information_schema.tables
      where table_schema = 'public' and table_name = any(${requiredTables})
    `;
    const foundNames = new Set(found.map((row) => row.table_name));
    const missing = requiredTables.filter((table) => !foundNames.has(table));
    if (missing.length) throw new Error(`Missing migrated tables: ${missing.join(', ')}`);

    const attemptColumns = await client<{ column_name: string }[]>`
      select column_name
      from information_schema.columns
      where table_schema = 'public' and table_name = 'attempts'
    `;
    const attemptColumnNames = new Set(attemptColumns.map((row) => row.column_name));
    const expectedAttemptColumns = [
      'user_id', 'question_id', 'selected_answer', 'correct_answer', 'is_correct',
      'time_spent_seconds', 'attempted_at', 'section', 'topic', 'subtopic', 'difficulty', 'question_snapshot',
    ];
    const missingAttemptColumns = expectedAttemptColumns.filter((column) => !attemptColumnNames.has(column));
    if (missingAttemptColumns.length) throw new Error(`Missing attempt snapshot columns: ${missingAttemptColumns.join(', ')}`);

    await client.begin(async (transaction) => {
      const attemptId = `db-verify-${crypto.randomUUID()}`;
      const questionId = `db-verify-question-${crypto.randomUUID()}`;
      const sectionId = `db-verify-section-${crypto.randomUUID()}`;
      const topicId = `db-verify-topic-${crypto.randomUUID()}`;
      const userId = `verify-${crypto.randomUUID()}`;
      const email = `${userId}@example.test`;
      await transaction`
        insert into "user" (id, name, email, email_verified)
        values (${userId}, 'Database verification', ${email}, true)
      `;
      await transaction`
        insert into sections (id, name) values (${sectionId}, ${sectionId})
      `;
      await transaction`
        insert into topics (id, section_id, name) values (${topicId}, ${sectionId}, ${topicId})
      `;
      await transaction`
        insert into questions (
          id, slug, section_id, topic_id, difficulty, prompt, options,
          correct_answer, explanation, status
        ) values (
          ${questionId}, ${questionId}, ${sectionId}, ${topicId}, 'easy',
          'Original prompt', ${transaction.json([{ id: 'A', text: 'one' }, { id: 'B', text: 'two' }])},
          'B', 'Original explanation', 'published'
        )
      `;
      await transaction`
        insert into attempts (
          id, user_id, question_id, selected_answer, correct_answer, is_correct,
          time_spent_seconds, section, topic, subtopic, difficulty, question_snapshot
        ) values (
          ${attemptId}, ${userId}, ${questionId}, 'A', 'B', false,
          19, 'Math', 'Algebra', 'Linear equations', 'easy',
          ${transaction.json({ prompt: 'Frozen prompt', options: [{ id: 'A', text: 'one' }, { id: 'B', text: 'two' }] })}
        )
      `;
      const persisted = await transaction<{ correct_answer: string; question_snapshot: { prompt: string } }[]>`
        select correct_answer, question_snapshot from attempts where id = ${attemptId}
      `;
      if (persisted.length !== 1 || persisted[0].correct_answer !== 'B' || persisted[0].question_snapshot.prompt !== 'Frozen prompt') {
        throw new Error('Attempt snapshot did not persist correctly.');
      }
      const questionForeignKey = await transaction<{ constraint_name: string }[]>`
        select tc.constraint_name
        from information_schema.table_constraints tc
        join information_schema.key_column_usage kcu
          on tc.constraint_catalog = kcu.constraint_catalog
          and tc.constraint_schema = kcu.constraint_schema
          and tc.constraint_name = kcu.constraint_name
        where tc.constraint_type = 'FOREIGN KEY'
          and tc.table_schema = 'public'
          and tc.table_name = 'attempts'
          and kcu.column_name = 'question_id'
      `;
      if (questionForeignKey.length) throw new Error('Attempt question_id must remain a historical identifier, not a cascading question foreign key.');
      await transaction`
        update questions
        set prompt = 'Edited prompt', correct_answer = 'A', status = 'retired'
        where id = ${questionId}
      `;
      const afterRetirement = await transaction<{ question_id: string; correct_answer: string; question_snapshot: { prompt: string } }[]>`
        select question_id, correct_answer, question_snapshot from attempts where id = ${attemptId}
      `;
      if (
        afterRetirement.length !== 1 ||
        afterRetirement[0].question_id !== questionId ||
        afterRetirement[0].correct_answer !== 'B' ||
        afterRetirement[0].question_snapshot.prompt !== 'Frozen prompt'
      ) throw new Error('Editing/retiring a question changed its historical attempt snapshot.');
      throw new Error('ROLLBACK_DB_VERIFICATION_TRANSACTION');
    }).catch((error: unknown) => {
      if (!(error instanceof Error) || error.message !== 'ROLLBACK_DB_VERIFICATION_TRANSACTION') throw error;
    });

    console.info(`Database verification passed: ${requiredTables.length} tables exist and attempt history remains independent of question rows.`);
  } finally {
    await client.end();
  }
}

verifyDatabase().catch((error: unknown) => {
  console.error('Database verification failed:', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
});
