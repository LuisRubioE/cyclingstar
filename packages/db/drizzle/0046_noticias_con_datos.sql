ALTER TABLE "news" ALTER COLUMN "text" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "seed" text;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "data" jsonb;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "race_key" text;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "stage_day" smallint;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "tpl_rev" smallint;--> statement-breakpoint
CREATE INDEX "news_race_stage_idx" ON "news" USING btree ("world_id","race_key","stage_day");--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_text_or_data" CHECK ("news"."text" is not null or "news"."data" is not null);