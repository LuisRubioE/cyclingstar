CREATE TYPE "public"."contract_role" AS ENUM('lider', 'colider', 'gregario', 'libre');--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('pendiente', 'aceptada', 'rechazada', 'expirada');--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rider_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"role" "contract_role" DEFAULT 'libre' NOT NULL,
	"salary" integer NOT NULL,
	"start_season" integer NOT NULL,
	"end_season" integer NOT NULL,
	"release_clause" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rider_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"season" integer NOT NULL,
	"role" "contract_role" NOT NULL,
	"salary" integer NOT NULL,
	"seasons" integer NOT NULL,
	"release_clause" integer DEFAULT 0 NOT NULL,
	"created_day" integer NOT NULL,
	"status" "offer_status" DEFAULT 'pendiente' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contracts_rider_idx" ON "contracts" USING btree ("rider_id");--> statement-breakpoint
CREATE INDEX "contracts_team_idx" ON "contracts" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "offers_rider_status_idx" ON "offers" USING btree ("rider_id","status");