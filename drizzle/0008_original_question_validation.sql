CREATE TABLE "generated_question_validations" (
	"id" text PRIMARY KEY NOT NULL,
	"question_id" text NOT NULL,
	"lifecycle" text DEFAULT 'GENERATED' NOT NULL,
	"question" jsonb NOT NULL,
	"checks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generated_question_validations_question_id_unique" UNIQUE("question_id"),
	CONSTRAINT "generated_question_validations_lifecycle_check" CHECK ("generated_question_validations"."lifecycle" in ('GENERATED', 'VALIDATING', 'APPROVED', 'AVAILABLE', 'REJECTED', 'REGENERATE')),
	CONSTRAINT "generated_question_validations_attempts_check" CHECK ("generated_question_validations"."attempts" >= 0)
);
--> statement-breakpoint
CREATE INDEX "generated_question_validations_lifecycle_idx" ON "generated_question_validations" USING btree ("lifecycle","created_at");