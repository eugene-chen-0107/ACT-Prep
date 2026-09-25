import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  type AnyPgColumn,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

const timestampColumn = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type QuestionStatus = 'draft' | 'published' | 'retired';
export type PracticeStatus = 'in_progress' | 'completed' | 'abandoned';
export type QuestionOption = { id: string; text: string };
export type QuestionSnapshot = {
  prompt: string;
  options: QuestionOption[];
  explanation?: string;
};

// Better Auth core schema. Password hashes are stored on the credential account,
// never in the user row or returned to client components.
export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    createdAt: timestampColumn('created_at').notNull().defaultNow(),
    updatedAt: timestampColumn('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('user_email_unique').on(table.email),
    uniqueIndex('user_email_lower_unique').on(sql`lower(${table.email})`),
  ],
);

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestampColumn('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestampColumn('created_at').notNull().defaultNow(),
    updatedAt: timestampColumn('updated_at').notNull().defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_user_id_idx').on(table.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestampColumn('access_token_expires_at'),
    refreshTokenExpiresAt: timestampColumn('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestampColumn('created_at').notNull().defaultNow(),
    updatedAt: timestampColumn('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('account_provider_account_id_unique').on(table.providerId, table.accountId),
    index('account_user_id_idx').on(table.userId),
  ],
);

export const rateLimit = pgTable('rate_limit', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  lastRequest: bigint('last_request', { mode: 'number' }).notNull(),
});

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestampColumn('expires_at').notNull(),
    createdAt: timestampColumn('created_at').defaultNow(),
    updatedAt: timestampColumn('updated_at').defaultNow(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
);

// ACT taxonomy is stable, reusable reference data shared by all students.
export const sections = pgTable(
  'sections',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [uniqueIndex('sections_name_unique').on(table.name)],
);

export const topics = pgTable(
  'topics',
  {
    id: text('id').primaryKey(),
    sectionId: text('section_id').notNull().references(() => sections.id, { onDelete: 'restrict' }),
    parentTopicId: text('parent_topic_id').references((): AnyPgColumn => topics.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    check('topics_not_own_parent_check', sql`${table.parentTopicId} is null or ${table.parentTopicId} <> ${table.id}`),
    uniqueIndex('topics_section_parent_name_unique').on(table.sectionId, table.parentTopicId, table.name),
    index('topics_section_id_idx').on(table.sectionId),
    index('topics_parent_topic_id_idx').on(table.parentTopicId),
  ],
);

export const questions = pgTable(
  'questions',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    sectionId: text('section_id').notNull().references(() => sections.id, { onDelete: 'restrict' }),
    topicId: text('topic_id').notNull().references(() => topics.id, { onDelete: 'restrict' }),
    subtopic: text('subtopic'),
    difficulty: text('difficulty').$type<QuestionDifficulty>().notNull(),
    prompt: text('prompt').notNull(),
    options: jsonb('options').$type<QuestionOption[]>().notNull(),
    correctAnswer: text('correct_answer').notNull(),
    explanation: text('explanation').notNull(),
    status: text('status').$type<QuestionStatus>().notNull().default('draft'),
    source: text('source').notNull().default('curated'),
    sourceMetadata: jsonb('source_metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestampColumn('created_at').notNull().defaultNow(),
    updatedAt: timestampColumn('updated_at').notNull().defaultNow(),
    publishedAt: timestampColumn('published_at'),
    retiredAt: timestampColumn('retired_at'),
  },
  (table) => [
    check('questions_difficulty_check', sql`${table.difficulty} in ('easy', 'medium', 'hard')`),
    check('questions_status_check', sql`${table.status} in ('draft', 'published', 'retired')`),
    index('questions_section_topic_idx').on(table.sectionId, table.topicId),
    index('questions_status_difficulty_idx').on(table.status, table.difficulty),
    index('questions_topic_id_idx').on(table.topicId),
  ],
);

export const profiles = pgTable(
  'profiles',
  {
    userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
    gradeLevel: text('grade_level'),
    targetScore: integer('target_score'),
    targetTestDate: timestamp('target_test_date', { mode: 'date' }),
    timezone: text('timezone').notNull().default('UTC'),
    createdAt: timestampColumn('created_at').notNull().defaultNow(),
    updatedAt: timestampColumn('updated_at').notNull().defaultNow(),
  },
);

export const practiceSessions = pgTable(
  'practice_sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    sectionId: text('section_id').references(() => sections.id, { onDelete: 'set null' }),
    sectionSnapshot: text('section_snapshot'),
    mode: text('mode').notNull().default('practice'),
    status: text('status').notNull().default('in_progress'),
    startedAt: timestampColumn('started_at').notNull().defaultNow(),
    completedAt: timestampColumn('completed_at'),
    questionCount: integer('question_count').notNull().default(0),
    correctCount: integer('correct_count').notNull().default(0),
  },
  (table) => [
    check('practice_sessions_status_check', sql`${table.status} in ('in_progress', 'completed', 'abandoned')`),
    check('practice_sessions_counts_check', sql`${table.questionCount} >= 0 and ${table.correctCount} >= 0 and ${table.correctCount} <= ${table.questionCount}`),
    index('practice_sessions_user_started_idx').on(table.userId, table.startedAt),
    index('practice_sessions_user_status_idx').on(table.userId, table.status),
  ],
);

export const practiceTests = pgTable(
  'practice_tests',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    version: integer('version').notNull().default(1),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull().default('draft'),
    durationSeconds: integer('duration_seconds').notNull(),
    createdAt: timestampColumn('created_at').notNull().defaultNow(),
    updatedAt: timestampColumn('updated_at').notNull().defaultNow(),
    publishedAt: timestampColumn('published_at'),
  },
  (table) => [
    check('practice_tests_version_positive_check', sql`${table.version} > 0`),
    check('practice_tests_duration_positive_check', sql`${table.durationSeconds} > 0`),
    check('practice_tests_status_check', sql`${table.status} in ('draft', 'published', 'retired')`),
    uniqueIndex('practice_tests_slug_version_unique').on(table.slug, table.version),
    index('practice_tests_status_idx').on(table.status),
  ],
);

export const practiceTestQuestions = pgTable(
  'practice_test_questions',
  {
    practiceTestId: text('practice_test_id').notNull().references(() => practiceTests.id, { onDelete: 'cascade' }),
    questionId: text('question_id').notNull().references(() => questions.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    sectionId: text('section_id').notNull().references(() => sections.id, { onDelete: 'restrict' }),
  },
  (table) => [
    primaryKey({ columns: [table.practiceTestId, table.questionId] }),
    check('practice_test_questions_position_positive_check', sql`${table.position} > 0`),
    uniqueIndex('practice_test_questions_position_unique').on(table.practiceTestId, table.position),
    index('practice_test_questions_question_id_idx').on(table.questionId),
  ],
);

export const testAttempts = pgTable(
  'test_attempts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    practiceTestId: text('practice_test_id').notNull().references(() => practiceTests.id, { onDelete: 'restrict' }),
    testTitleSnapshot: text('test_title_snapshot').notNull(),
    testVersionSnapshot: integer('test_version_snapshot').notNull(),
    // Frozen ordered question content ensures review/scoring remains reproducible if content changes.
    questionManifest: jsonb('question_manifest').$type<Array<Record<string, unknown>>>().notNull().default([]),
    status: text('status').notNull().default('in_progress'),
    startedAt: timestampColumn('started_at').notNull().defaultNow(),
    completedAt: timestampColumn('completed_at'),
    rawScore: integer('raw_score'),
    scaledScore: integer('scaled_score'),
    sectionScores: jsonb('section_scores').$type<Record<string, number>>().notNull().default({}),
  },
  (table) => [
    check('test_attempts_status_check', sql`${table.status} in ('in_progress', 'completed', 'abandoned')`),
    check('test_attempts_score_nonnegative_check', sql`(${table.rawScore} is null or ${table.rawScore} >= 0) and (${table.scaledScore} is null or ${table.scaledScore} between 1 and 36)`),
    index('test_attempts_user_started_idx').on(table.userId, table.startedAt),
    index('test_attempts_practice_test_id_idx').on(table.practiceTestId),
  ],
);

// Historical attempt facts are intentionally snapshotted. questionId is a stable
// source identifier without an FK, so retiring or deleting a content row cannot
// rewrite or cascade-delete the student's answer history. New attempt writes must
// snapshot the canonical answer and content on the server at submission time.
export const questionAttempts = pgTable(
  'attempts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    questionId: text('question_id').notNull(),
    practiceSessionId: text('practice_session_id').references(() => practiceSessions.id, { onDelete: 'set null' }),
    testAttemptId: text('test_attempt_id').references(() => testAttempts.id, { onDelete: 'set null' }),
    selectedAnswer: text('selected_answer'),
    // Nullable only for legacy rows created before answer snapshots were introduced.
    correctAnswer: text('correct_answer'),
    isCorrect: boolean('is_correct').notNull(),
    timeSpentSeconds: integer('time_spent_seconds').notNull().default(0),
    attemptedAt: timestampColumn('attempted_at').notNull().defaultNow(),
    section: text('section').notNull().default('unknown'),
    topic: text('topic'),
    subtopic: text('subtopic'),
    difficulty: text('difficulty').$type<QuestionDifficulty>(),
    questionSnapshot: jsonb('question_snapshot').$type<QuestionSnapshot>().notNull().default({ prompt: '', options: [] }),
  },
  (table) => [
    check('attempts_time_spent_nonnegative_check', sql`${table.timeSpentSeconds} >= 0`),
    check('attempts_difficulty_check', sql`${table.difficulty} is null or ${table.difficulty} in ('easy', 'medium', 'hard')`),
    index('attempts_user_attempted_idx').on(table.userId, table.attemptedAt),
    index('attempts_question_id_idx').on(table.questionId),
    index('attempts_section_idx').on(table.section),
    index('attempts_topic_idx').on(table.topic),
    index('attempts_attempted_at_idx').on(table.attemptedAt),
    index('attempts_practice_session_id_idx').on(table.practiceSessionId),
    index('attempts_test_attempt_id_idx').on(table.testAttemptId),
  ],
);

export type QuestionAttempt = typeof questionAttempts.$inferSelect;
export type NewQuestionAttempt = typeof questionAttempts.$inferInsert;

export const studyPlans = pgTable(
  'study_plans',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    targetScore: integer('target_score'),
    targetDate: timestamp('target_date', { mode: 'date' }),
    schedule: jsonb('schedule').$type<Record<string, unknown>>().notNull().default({}),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestampColumn('created_at').notNull().defaultNow(),
    updatedAt: timestampColumn('updated_at').notNull().defaultNow(),
  },
  (table) => [
    check('study_plans_target_score_check', sql`${table.targetScore} is null or ${table.targetScore} between 1 and 36`),
    index('study_plans_user_active_idx').on(table.userId, table.isActive),
  ],
);

export const studyPlanTasks = pgTable(
  'study_plan_tasks',
  {
    id: text('id').primaryKey(),
    studyPlanId: text('study_plan_id').notNull().references(() => studyPlans.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    sectionId: text('section_id').references(() => sections.id, { onDelete: 'set null' }),
    topicId: text('topic_id').references(() => topics.id, { onDelete: 'set null' }),
    taskDate: timestamp('task_date', { mode: 'date' }),
    estimatedMinutes: integer('estimated_minutes'),
    sortOrder: integer('sort_order').notNull().default(0),
    status: text('status').notNull().default('pending'),
    completedAt: timestampColumn('completed_at'),
    createdAt: timestampColumn('created_at').notNull().defaultNow(),
  },
  (table) => [
    check('study_plan_tasks_minutes_positive_check', sql`${table.estimatedMinutes} is null or ${table.estimatedMinutes} > 0`),
    check('study_plan_tasks_status_check', sql`${table.status} in ('pending', 'in_progress', 'completed', 'skipped')`),
    index('study_plan_tasks_plan_order_idx').on(table.studyPlanId, table.sortOrder),
    index('study_plan_tasks_plan_date_idx').on(table.studyPlanId, table.taskDate),
    index('study_plan_tasks_topic_id_idx').on(table.topicId),
  ],
);

export const studentPreferences = pgTable('student_preferences', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  weeklyGoalMinutes: integer('weekly_goal_minutes').notNull().default(120),
  preferredStudyDays: jsonb('preferred_study_days').$type<string[]>().notNull().default([]),
  reminderEnabled: boolean('reminder_enabled').notNull().default(false),
  updatedAt: timestampColumn('updated_at').notNull().defaultNow(),
});

// Definitions are shared catalog records; achievements are a student's earned,
// owner-scoped award records. Award keys/titles are copied so retirement/editing
// of a definition never erases what a student earned.
export const achievementCatalog = pgTable(
  'achievement_catalog',
  {
    key: text('key').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    icon: text('icon').notNull().default('award'),
    criteria: jsonb('criteria').$type<Record<string, unknown>>().notNull().default({}),
    isActive: boolean('is_active').notNull().default(true),
  },
);

export const achievements = pgTable(
  'achievements',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    achievementKey: text('achievement_key').notNull(),
    titleSnapshot: text('title_snapshot'),
    earnedAt: timestampColumn('earned_at').notNull().defaultNow(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [
    uniqueIndex('achievements_user_key_unique').on(table.userId, table.achievementKey),
    index('achievements_user_earned_idx').on(table.userId, table.earnedAt),
  ],
);

export const studentProgress = pgTable(
  'student_progress',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    section: text('section').notNull(),
    skillKey: text('skill_key').notNull(),
    questionsSeen: integer('questions_seen').notNull().default(0),
    correctAnswers: integer('correct_answers').notNull().default(0),
    updatedAt: timestampColumn('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('student_progress_user_skill_unique').on(table.userId, table.section, table.skillKey),
    index('student_progress_user_id_idx').on(table.userId),
  ],
);

export type User = typeof user.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type PracticeSession = typeof practiceSessions.$inferSelect;
export type PracticeTest = typeof practiceTests.$inferSelect;
export type TestAttempt = typeof testAttempts.$inferSelect;
export type StudyPlan = typeof studyPlans.$inferSelect;
export type StudyPlanTask = typeof studyPlanTasks.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
