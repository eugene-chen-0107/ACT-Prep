# PostgreSQL database

`schema.ts` defines Better Auth's user/session/account/verification tables and the ACT platform's relational content and learning history. User profiles, practice sessions, question attempts, test attempts, plans, tasks, preferences, progress, and earned achievements are student-owned and cascade with their account. Sections, topics, questions, test definitions, and achievement definitions are shared catalog data. Auth sessions and rate limits are persisted in PostgreSQL for multi-instance consistency.

## Domain model

- `sections` → `topics` → `questions` describe reusable ACT taxonomy and curated/AI content. Topics are hierarchical reference data: top-level topics and subtopics are rows in the same table, with `parent_topic_id`; add or reorder taxonomy records in `seed-data.ts` for demo/local content without changing UI components. Question rows reference section, topic, and optional subtopic and retain difficulty, type, estimated seconds, tags, source/provenance, lifecycle, choices, answer, and explanation.
- `diagnostic_assessments` and `diagnostic_responses` store owner-scoped diagnostic sessions, section/topic/difficulty/correctness/time facts, and a clearly labeled estimated report; report estimates are not official ACT scores.
- `profiles` stores student-specific ACT goals separately from Better Auth identity.
- `practice_sessions` groups free-practice work; `practice_tests` are versioned catalogs joined to stable questions through `practice_test_questions`; `test_attempts` freeze a test title, version, and ordered content manifest.
- `attempts` is the append-only question-attempt history. It captures selected and correct answers, result, time, timestamp, section/topic/subtopic/difficulty, and a JSON content snapshot. `question_id` deliberately has no foreign key: deleting or editing catalog content must not change historical facts. Attempt records should be created from trusted server-side question content, never from client-provided correct answers.
- `review_flags` stores durable, per-user question bookmarks keyed by `(user_id, question_id)`, with taxonomy and a frozen prompt/choices/answer/explanation snapshot so flags remain reviewable after catalog changes. The related migration is generated as `0006_solid_hercules.sql` and must be applied through the normal approved migration workflow before using flags.
- `ai_explanation_cache` stores validated, reusable provider/model outputs keyed by a SHA-256 digest of the exact question, choices, correct answer, selected answer, and canonical explanation. It contains shared learning content and answer feedback, not a user identifier. Its migration is generated as `0007_clumsy_luckman.sql`; generate/apply with the normal migration workflow before enabling database-backed AI explanations.
- `study_plans` own ordered/date-based `study_plan_tasks`; achievements separate shared `achievement_catalog` definitions from per-user `achievements` earned records.
- Indexes support the requested user, question, section, topic, and timestamp lookups, plus common section-question, session, test, and plan access paths.

The existing `attempts`, `study_plans`, and `achievements` tables are extended in place by migrations. Existing attempt rows retain their original IDs/answers and receive compatibility-safe snapshot defaults; correct answer and question content are nullable/defaulted for legacy rows and required by new write paths at the service boundary.

## Ownership boundaries

- Server-side repositories derive `userId` exclusively from `auth.api.getSession()` and `next/headers`.
- Student APIs never accept an owner ID from clients.
- Reads and mutations filter by both record ID (when applicable) and authenticated owner ID. Review flags use the authenticated user plus question ID composite key; mutations also require a trusted request origin.
- Password hashes stay on Better Auth credential accounts; clients receive only public session/profile fields.

## Migrations

Configure `DATABASE_URL` in an ignored `.env.local`, then:

```bash
npm run db:generate
npm run db:migrate
```

`db:migrate` changes the configured database schema. Do not run it against production without reviewing the generated migration and obtaining deployment approval. `db:seed` inserts/updates shared demo taxonomy and content, with explicit opt-in via `SEED_DEMO_DATA=1`; never use it in production. The seed includes original ACT-style questions (not copied from official ACT materials), at least three for each section, and no demo account/password. `db:verify` checks migrated tables, required attempt snapshot columns, and historical attempt insertion in a transaction that is always rolled back; point `TEST_DATABASE_URL` at a disposable database when possible.
