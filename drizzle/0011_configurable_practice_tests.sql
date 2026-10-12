ALTER TABLE "practice_tests" ADD COLUMN "section_configuration" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD COLUMN "configuration_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD COLUMN "state" jsonb DEFAULT '{}'::jsonb NOT NULL;