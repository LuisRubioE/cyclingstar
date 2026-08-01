CREATE TYPE "public"."stage_effort" AS ENUM('ahorrar', 'normal', 'a_tope');--> statement-breakpoint
CREATE TYPE "public"."stage_mentality" AS ENUM('reservon', 'oportunista', 'combativo', 'supercombativo');--> statement-breakpoint
CREATE TYPE "public"."stage_role" AS ENUM('lider', 'sprinter', 'lanzador', 'gregario', 'cazaetapas', 'marcador', 'libre');--> statement-breakpoint
CREATE TABLE "race_rosters" (
	"race_id" text NOT NULL,
	"rider_id" uuid NOT NULL,
	CONSTRAINT "race_rosters_race_id_rider_id_pk" PRIMARY KEY("race_id","rider_id")
);
--> statement-breakpoint
CREATE TABLE "stage_orders" (
	"rider_id" uuid NOT NULL,
	"race_id" text NOT NULL,
	"stage_day" integer NOT NULL,
	"role" "stage_role" NOT NULL,
	"target_rider_id" uuid,
	"mentality" "stage_mentality" NOT NULL,
	"effort" "stage_effort" NOT NULL,
	"trigger_km" integer,
	"contest_sprints" boolean DEFAULT false NOT NULL,
	"contest_climbs" boolean DEFAULT false NOT NULL,
	CONSTRAINT "stage_orders_rider_id_race_id_stage_day_pk" PRIMARY KEY("rider_id","race_id","stage_day")
);
--> statement-breakpoint
ALTER TABLE "race_rosters" ADD CONSTRAINT "race_rosters_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_orders" ADD CONSTRAINT "stage_orders_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;