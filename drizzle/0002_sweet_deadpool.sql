CREATE UNIQUE INDEX "account_provider_account_id_unique" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE TABLE "achievement_catalog" (
	"key" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"icon" text DEFAULT 'award' NOT NULL,
	"criteria" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"section_id" text,
	"section_snapshot" text,
	"mode" text DEFAULT 'practice' NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"question_count" integer DEFAULT 0 NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "practice_sessions_status_check" CHECK ("practice_sessions"."status" in ('in_progress', 'completed', 'abandoned')),
	CONSTRAINT "practice_sessions_counts_check" CHECK ("practice_sessions"."question_count" >= 0 and "practice_sessions"."correct_count" >= 0 and "practice_sessions"."correct_count" <= "practice_sessions"."question_count")
);
--> statement-breakpoint
CREATE TABLE "practice_test_questions" (
	"practice_test_id" text NOT NULL,
	"question_id" text NOT NULL,
	"position" integer NOT NULL,
	"section_id" text NOT NULL,
	CONSTRAINT "practice_test_questions_practice_test_id_question_id_pk" PRIMARY KEY("practice_test_id","question_id"),
	CONSTRAINT "practice_test_questions_position_positive_check" CHECK ("practice_test_questions"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "practice_tests" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"duration_seconds" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "practice_tests_version_positive_check" CHECK ("practice_tests"."version" > 0),
	CONSTRAINT "practice_tests_duration_positive_check" CHECK ("practice_tests"."duration_seconds" > 0),
	CONSTRAINT "practice_tests_status_check" CHECK ("practice_tests"."status" in ('draft', 'published', 'retired'))
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"grade_level" text,
	"target_score" integer,
	"target_test_date" timestamp,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"section_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"subtopic" text,
	"difficulty" text NOT NULL,
	"prompt" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_answer" text NOT NULL,
	"explanation" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"source" text DEFAULT 'curated' NOT NULL,
	"source_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	CONSTRAINT "questions_slug_unique" UNIQUE("slug"),
	CONSTRAINT "questions_difficulty_check" CHECK ("questions"."difficulty" in ('easy', 'medium', 'hard')),
	CONSTRAINT "questions_status_check" CHECK ("questions"."status" in ('draft', 'published', 'retired'))
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_plan_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"study_plan_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"section_id" text,
	"topic_id" text,
	"task_date" timestamp,
	"estimated_minutes" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_plan_tasks_minutes_positive_check" CHECK ("study_plan_tasks"."estimated_minutes" is null or "study_plan_tasks"."estimated_minutes" > 0),
	CONSTRAINT "study_plan_tasks_status_check" CHECK ("study_plan_tasks"."status" in ('pending', 'in_progress', 'completed', 'skipped'))
);
--> statement-breakpoint
CREATE TABLE "test_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"practice_test_id" text NOT NULL,
	"test_title_snapshot" text NOT NULL,
	"test_version_snapshot" integer NOT NULL,
	"question_manifest" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"raw_score" integer,
	"scaled_score" integer,
	"section_scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "test_attempts_status_check" CHECK ("test_attempts"."status" in ('in_progress', 'completed', 'abandoned')),
	CONSTRAINT "test_attempts_score_nonnegative_check" CHECK (("test_attempts"."raw_score" is null or "test_attempts"."raw_score" >= 0) and ("test_attempts"."scaled_score" is null or "test_attempts"."scaled_score" between 1 and 36))
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" text PRIMARY KEY NOT NULL,
	"section_id" text NOT NULL,
	"parent_topic_id" text,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attempts" ALTER COLUMN "section" SET DEFAULT 'unknown';--> statement-breakpoint
ALTER TABLE "achievements" ADD COLUMN "title_snapshot" text;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "practice_session_id" text;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "test_attempt_id" text;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "correct_answer" text;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "topic" text;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "subtopic" text;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "difficulty" text;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "question_snapshot" jsonb DEFAULT '{"prompt":"","options":[]}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_test_questions" ADD CONSTRAINT "practice_test_questions_practice_test_id_practice_tests_id_fk" FOREIGN KEY ("practice_test_id") REFERENCES "public"."practice_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_test_questions" ADD CONSTRAINT "practice_test_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_test_questions" ADD CONSTRAINT "practice_test_questions_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plan_tasks" ADD CONSTRAINT "study_plan_tasks_study_plan_id_study_plans_id_fk" FOREIGN KEY ("study_plan_id") REFERENCES "public"."study_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plan_tasks" ADD CONSTRAINT "study_plan_tasks_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plan_tasks" ADD CONSTRAINT "study_plan_tasks_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_practice_test_id_practice_tests_id_fk" FOREIGN KEY ("practice_test_id") REFERENCES "public"."practice_tests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_parent_topic_id_topics_id_fk" FOREIGN KEY ("parent_topic_id") REFERENCES "public"."topics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "practice_sessions_user_started_idx" ON "practice_sessions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "practice_sessions_user_status_idx" ON "practice_sessions" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "practice_test_questions_position_unique" ON "practice_test_questions" USING btree ("practice_test_id","position");--> statement-breakpoint
CREATE INDEX "practice_test_questions_question_id_idx" ON "practice_test_questions" USING btree ("question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "practice_tests_slug_version_unique" ON "practice_tests" USING btree ("slug","version");--> statement-breakpoint
CREATE INDEX "practice_tests_status_idx" ON "practice_tests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "questions_section_topic_idx" ON "questions" USING btree ("section_id","topic_id");--> statement-breakpoint
CREATE INDEX "questions_status_difficulty_idx" ON "questions" USING btree ("status","difficulty");--> statement-breakpoint
CREATE INDEX "questions_topic_id_idx" ON "questions" USING btree ("topic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sections_name_unique" ON "sections" USING btree ("name");--> statement-breakpoint
CREATE INDEX "study_plan_tasks_plan_order_idx" ON "study_plan_tasks" USING btree ("study_plan_id","sort_order");--> statement-breakpoint
CREATE INDEX "study_plan_tasks_plan_date_idx" ON "study_plan_tasks" USING btree ("study_plan_id","task_date");--> statement-breakpoint
CREATE INDEX "study_plan_tasks_topic_id_idx" ON "study_plan_tasks" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "test_attempts_user_started_idx" ON "test_attempts" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "test_attempts_practice_test_id_idx" ON "test_attempts" USING btree ("practice_test_id");--> statement-breakpoint
CREATE UNIQUE INDEX "topics_section_parent_name_unique" ON "topics" USING btree ("section_id","parent_topic_id","name");--> statement-breakpoint
CREATE INDEX "topics_section_id_idx" ON "topics" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "topics_parent_topic_id_idx" ON "topics" USING btree ("parent_topic_id");--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_practice_session_id_practice_sessions_id_fk" FOREIGN KEY ("practice_session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_test_attempt_id_test_attempts_id_fk" FOREIGN KEY ("test_attempt_id") REFERENCES "public"."test_attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempts_question_id_idx" ON "attempts" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "attempts_section_idx" ON "attempts" USING btree ("section");--> statement-breakpoint
CREATE INDEX "attempts_topic_idx" ON "attempts" USING btree ("topic");--> statement-breakpoint
CREATE INDEX "attempts_attempted_at_idx" ON "attempts" USING btree ("attempted_at");--> statement-breakpoint
CREATE INDEX "attempts_practice_session_id_idx" ON "attempts" USING btree ("practice_session_id");--> statement-breakpoint
CREATE INDEX "attempts_test_attempt_id_idx" ON "attempts" USING btree ("test_attempt_id");--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_time_spent_nonnegative_check" CHECK ("attempts"."time_spent_seconds" >= 0);--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_difficulty_check" CHECK ("attempts"."difficulty" is null or "attempts"."difficulty" in ('easy', 'medium', 'hard'));--> statement-breakpoint
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_target_score_check" CHECK ("study_plans"."target_score" is null or "study_plans"."target_score" between 1 and 36);