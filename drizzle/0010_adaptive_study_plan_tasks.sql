ALTER TABLE "study_plan_tasks" ADD COLUMN "priority" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "study_plan_tasks" ADD COLUMN "source" text DEFAULT 'baseline' NOT NULL;