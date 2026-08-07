CREATE TABLE "stage_team_results" (
	"race_id" text NOT NULL,
	"stage_day" integer NOT NULL,
	"team_id" uuid NOT NULL,
	"scored" boolean DEFAULT true NOT NULL,
	"tiempo_s" integer DEFAULT 0 NOT NULL,
	"suma_puestos" integer DEFAULT 0 NOT NULL,
	"mejor_puesto" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "stage_team_results_race_id_stage_day_team_id_pk" PRIMARY KEY("race_id","stage_day","team_id")
);
--> statement-breakpoint
ALTER TABLE "stage_team_results" ADD CONSTRAINT "stage_team_results_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;