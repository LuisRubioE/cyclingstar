CREATE TYPE "public"."team_division" AS ENUM('WT', 'PRS', 'CON');--> statement-breakpoint
CREATE TYPE "public"."team_philosophy" AS ENUM('general', 'sprints', 'clasicas', 'cantera', 'equilibrado');--> statement-breakpoint
CREATE TYPE "public"."team_name_status" AS ENUM('pendiente', 'aprobado', 'rechazado');--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_status" "team_name_status" DEFAULT 'aprobado' NOT NULL,
	"owner_user_id" uuid,
	"division" "team_division" NOT NULL,
	"budget" integer DEFAULT 0 NOT NULL,
	"philosophy" "team_philosophy" NOT NULL,
	"jersey_seed" text NOT NULL,
	"facilities" real DEFAULT 1 NOT NULL,
	"points_season" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "teams_world_division_idx" ON "teams" USING btree ("world_id","division");