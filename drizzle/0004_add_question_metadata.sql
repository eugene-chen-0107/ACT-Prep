ALTER TABLE "questions" ADD COLUMN "subtopic_id" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "question_type" text DEFAULT 'multiple_choice' NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "estimated_time_seconds" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_subtopic_id_topics_id_fk" FOREIGN KEY ("subtopic_id") REFERENCES "public"."topics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "questions_subtopic_id_idx" ON "questions" USING btree ("subtopic_id");--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_estimated_time_positive_check" CHECK ("questions"."estimated_time_seconds" > 0);