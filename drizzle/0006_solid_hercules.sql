CREATE TABLE "review_flags" (
	"user_id" text NOT NULL,
	"question_id" text NOT NULL,
	"section" text NOT NULL,
	"topic" text,
	"subtopic" text,
	"question_snapshot" jsonb NOT NULL,
	"flagged_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_flags_user_id_question_id_pk" PRIMARY KEY("user_id","question_id")
);
--> statement-breakpoint
ALTER TABLE "review_flags" ADD CONSTRAINT "review_flags_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "review_flags_user_flagged_idx" ON "review_flags" USING btree ("user_id","flagged_at");