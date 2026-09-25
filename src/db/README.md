# PostgreSQL database

`schema.ts` defines Better Auth's user/session/account/verification tables and the ACT platform's relational content and learning history. User profiles, practice sessions, question attempts, test attempts, plans, tasks, preferences, progress, and earned achievements are student-owned and cascade with their account. Sections, topics, questions, test definitions, and achievement definitions are shared catalog data. Auth sessions and rate limits are persisted in PostgreSQL for multi-instance consistency.

## Domain model

- `sections` → `topics` → `questions` describe reusable ACT taxonomy and curated/AI content. Topics support an optional parent for subtopic hierarchies; question rows retain source/provenance, draft/published/retired lifecycle, answer options, canonical answer, and explanation.
- `profiles` stores student-specific ACT goals separately from Better Auth identity.
- `practice_sessions` groups free-practice work; `practice_tests` are versioned catalogs joined to stable questions through `practice_test_questions`; `test_attempts` freeze a test title, version, and ordered content manifest.
- `attempts` is the append-only question-attempt history. It captures selected and correct answers, result, time, timestamp, section/topic/subtopic/difficulty, and a JSON content snapshot. `question_id` deliberately has no foreign key: deleting or editing catalog content must not change historical facts. Attempt records should be created from trusted server-side question content, never from client-provided correct answers.
- `study_plans` own ordered/date-based `study_plan_tasks`; achievements separate shared `achievement_catalog` definitions from per-user `achievements` earned records.
- Indexes support the requested user, question, section, topic, and timestamp lookups, plus common section-question, session, test, and plan access paths.

The existing `attempts`, `study_plans`, and `achievements` tables are extended in place by migrations. Existing attempt rows retain their original IDs/answers and receive compatibility-safe snapshot defaults; correct answer and question content are nullable/defaulted for legacy rows and required by new write paths at the service boundary.

## Ownership boundaries

- Server-side repositories derive `userId` exclusively from `auth.api.getSession()` and `next/headers`.
- Student APIs never accept an owner ID from clients.
- Reads and mutations filter by both record ID (when applicable) and authenticated owner ID.
- Password hashes stay on Better Auth credential accounts; clients receive only public session/profile fields.

## Migrations

Configure `DATABASE_URL` in an ignored `.env.local`, then:

```bash
npm run db:generate
npm run db:migrate
```

`db:migrate` changes the configured database schema. Do not run it against production without reviewing the generated migration and obtaining deployment approval. `db:seed` is idempotent and inserts only shared demo content; explicitly set `SEED_DEMO_DATA=1` and never use it in production. The seed creates original ACT-style demo questions but no demo account/password. `db:verify` checks migrated tables, required attempt snapshot columns, and historical attempt insertion in a transaction that is always rolled back; point `TEST_DATABASE_URL` at a disposable database when possible.
