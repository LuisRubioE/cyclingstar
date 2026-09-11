CREATE TABLE "race_routes" (
	"world_id" uuid NOT NULL,
	"race_key" text NOT NULL,
	"stage_day" integer NOT NULL,
	"profile" jsonb NOT NULL,
	"route_source" text DEFAULT 'generado' NOT NULL,
	CONSTRAINT "race_routes_world_id_race_key_stage_day_pk" PRIMARY KEY("world_id","race_key","stage_day")
);
--> statement-breakpoint
ALTER TABLE "race_routes" ADD CONSTRAINT "race_routes_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;