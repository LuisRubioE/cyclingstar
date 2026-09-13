CREATE TYPE "public"."coach_block" AS ENUM('base', 'construccion', 'especifico', 'afinado', 'recuperacion');--> statement-breakpoint
CREATE TYPE "public"."training_mode" AS ENUM('entrenador', 'mixto', 'manual');--> statement-breakpoint
CREATE TABLE "training_plans" (
	"rider_id" uuid NOT NULL,
	"start_day" integer NOT NULL,
	"block_1" "coach_block",
	"block_2" "coach_block",
	"block_3" "coach_block",
	"block_4" "coach_block",
	"focus_attr" "rider_attribute",
	"intensity" "training_intensity",
	"goal_race_id" text,
	CONSTRAINT "training_plans_rider_id_start_day_pk" PRIMARY KEY("rider_id","start_day")
);
--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN "training_mode" "training_mode" DEFAULT 'mixto' NOT NULL;--> statement-breakpoint
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;