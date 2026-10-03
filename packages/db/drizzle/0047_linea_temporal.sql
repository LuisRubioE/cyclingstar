CREATE TABLE "stage_timelines" (
	"race_id" text NOT NULL,
	"stage_day" integer NOT NULL,
	"game_day" integer NOT NULL,
	"format" smallint NOT NULL,
	"engine_version" integer NOT NULL,
	"tpl_rev" smallint NOT NULL,
	"finish_s" integer NOT NULL,
	"bytes" integer NOT NULL,
	"body" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stage_timelines_race_id_stage_day_pk" PRIMARY KEY("race_id","stage_day")
);
--> statement-breakpoint
CREATE INDEX "stage_timelines_day_idx" ON "stage_timelines" USING btree ("game_day");