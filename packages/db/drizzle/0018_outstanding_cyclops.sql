CREATE TABLE "team_race_plan" (
	"team_id" uuid NOT NULL,
	"race_id" text NOT NULL,
	"season" integer NOT NULL,
	"created_day" integer NOT NULL,
	CONSTRAINT "team_race_plan_team_id_race_id_season_pk" PRIMARY KEY("team_id","race_id","season")
);
--> statement-breakpoint
ALTER TABLE "team_race_plan" ADD CONSTRAINT "team_race_plan_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;