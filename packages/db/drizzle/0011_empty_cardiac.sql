CREATE TYPE "public"."palmares_kind" AS ENUM('gc', 'stage', 'kom', 'points');--> statement-breakpoint
CREATE TABLE "palmares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"rider_id" uuid NOT NULL,
	"season" integer NOT NULL,
	"race_id" text NOT NULL,
	"race_name" text NOT NULL,
	"kind" "palmares_kind" NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"game_day" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN "season_points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "palmares" ADD CONSTRAINT "palmares_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palmares" ADD CONSTRAINT "palmares_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "palmares_rider_idx" ON "palmares" USING btree ("rider_id");--> statement-breakpoint
CREATE INDEX "palmares_race_idx" ON "palmares" USING btree ("world_id","race_id");