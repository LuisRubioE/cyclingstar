ALTER TABLE "race_routes" ADD COLUMN "kind" text;--> statement-breakpoint
ALTER TABLE "race_routes" ADD COLUMN "label" text;--> statement-breakpoint
ALTER TABLE "race_routes" ADD COLUMN "time_trial" boolean;--> statement-breakpoint
ALTER TABLE "race_routes" ADD COLUMN "arch" jsonb;