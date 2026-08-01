CREATE TABLE "race_gc" (
	"race_id" text NOT NULL,
	"rider_id" uuid NOT NULL,
	"tiempo_total_s" integer DEFAULT 0 NOT NULL,
	"puntos_volante" integer DEFAULT 0 NOT NULL,
	"puntos_montana" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "race_gc_race_id_rider_id_pk" PRIMARY KEY("race_id","rider_id")
);
--> statement-breakpoint
CREATE TABLE "stage_results" (
	"race_id" text NOT NULL,
	"stage_day" integer NOT NULL,
	"rider_id" uuid NOT NULL,
	"puesto" integer NOT NULL,
	"tiempo_s" integer NOT NULL,
	"bonificacion_s" integer DEFAULT 0 NOT NULL,
	"puntos_volante" integer DEFAULT 0 NOT NULL,
	"puntos_montana" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "stage_results_race_id_stage_day_rider_id_pk" PRIMARY KEY("race_id","stage_day","rider_id")
);
--> statement-breakpoint
CREATE TABLE "stage_snapshots" (
	"race_id" text NOT NULL,
	"stage_day" integer NOT NULL,
	"seed" text NOT NULL,
	"engine_version" integer NOT NULL,
	"input" jsonb NOT NULL,
	CONSTRAINT "stage_snapshots_race_id_stage_day_pk" PRIMARY KEY("race_id","stage_day")
);
--> statement-breakpoint
ALTER TABLE "race_gc" ADD CONSTRAINT "race_gc_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_results" ADD CONSTRAINT "stage_results_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;