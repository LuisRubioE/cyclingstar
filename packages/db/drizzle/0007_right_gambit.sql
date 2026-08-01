CREATE TABLE "race_callups" (
	"rider_id" uuid NOT NULL,
	"race_id" text NOT NULL,
	"season" integer NOT NULL,
	"decided_day" integer NOT NULL,
	"selected" boolean NOT NULL,
	"wanted" boolean DEFAULT false NOT NULL,
	CONSTRAINT "race_callups_rider_id_race_id_season_pk" PRIMARY KEY("rider_id","race_id","season")
);
--> statement-breakpoint
CREATE TABLE "rider_race_prefs" (
	"rider_id" uuid NOT NULL,
	"race_id" text NOT NULL,
	CONSTRAINT "rider_race_prefs_rider_id_race_id_pk" PRIMARY KEY("rider_id","race_id")
);
--> statement-breakpoint
ALTER TABLE "race_callups" ADD CONSTRAINT "race_callups_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_race_prefs" ADD CONSTRAINT "rider_race_prefs_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "race_callups_rider_idx" ON "race_callups" USING btree ("rider_id");