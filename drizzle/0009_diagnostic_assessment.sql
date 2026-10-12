CREATE TABLE "diagnostic_assessments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"question_ids" jsonb NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"report" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "diagnostic_assessments_status_check" CHECK ("diagnostic_assessments"."status" in ('in_progress', 'completed'))
);
--> statement-breakpoint
CREATE TABLE "diagnostic_responses" (
	"id" text PRIMARY KEY NOT NULL,
	"assessment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"question_id" text NOT NULL,
	"is_correct" boolean NOT NULL,
	"time_spent_seconds" integer NOT NULL,
	"section" text NOT NULL,
	"topic" text NOT NULL,
	"subtopic" text,
	"difficulty" text NOT NULL,
	"question_type" text NOT NULL,
	"estimated_time_seconds" integer NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "diagnostic_responses_time_nonnegative_check" CHECK ("diagnostic_responses"."time_spent_seconds" >= 0),
	CONSTRAINT "diagnostic_responses_estimated_time_positive_check" CHECK ("diagnostic_responses"."estimated_time_seconds" > 0)
);
--> statement-breakpoint
ALTER TABLE "diagnostic_assessments" ADD CONSTRAINT "diagnostic_assessments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnostic_responses" ADD CONSTRAINT "diagnostic_responses_assessment_id_diagnostic_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."diagnostic_assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnostic_responses" ADD CONSTRAINT "diagnostic_responses_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "diagnostic_assessments_user_started_idx" ON "diagnostic_assessments" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "diagnostic_responses_assessment_question_unique" ON "diagnostic_responses" USING btree ("assessment_id","question_id");--> statement-breakpoint
CREATE INDEX "diagnostic_responses_user_attempted_idx" ON "diagnostic_responses" USING btree ("user_id","attempted_at");