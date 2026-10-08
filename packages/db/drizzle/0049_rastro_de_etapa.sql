ALTER TABLE "palmares" ADD COLUMN "stage_day" smallint;--> statement-breakpoint
ALTER TABLE "rider_points" ADD COLUMN "stage_day" smallint;--> statement-breakpoint
ALTER TABLE "stage_team_results" ADD COLUMN "prize" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "race_key" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "stage_day" smallint;--> statement-breakpoint
CREATE INDEX "rider_points_race_stage_idx" ON "rider_points" USING btree ("race_id","stage_day");--> statement-breakpoint
CREATE INDEX "transactions_race_stage_idx" ON "transactions" USING btree ("race_key","stage_day");