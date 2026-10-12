CREATE TABLE "ai_explanation_cache" (
	"cache_key" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_explanation_cache_status_check" CHECK ("ai_explanation_cache"."status" in ('ready', 'invalid'))
);
--> statement-breakpoint
CREATE INDEX "ai_explanation_cache_updated_idx" ON "ai_explanation_cache" USING btree ("updated_at");