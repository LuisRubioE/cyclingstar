CREATE TABLE "race_entries" (
	"rider_id" uuid NOT NULL,
	"race_id" text NOT NULL,
	"season" integer NOT NULL,
	"created_day" integer NOT NULL,
	"enrolled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "race_entries_rider_id_race_id_season_pk" PRIMARY KEY("rider_id","race_id","season")
);
--> statement-breakpoint
ALTER TABLE "race_entries" ADD CONSTRAINT "race_entries_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;