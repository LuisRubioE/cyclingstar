CREATE TYPE "public"."kit_set_by" AS ENUM('system', 'manager', 'sponsor', 'moderator');--> statement-breakpoint
CREATE TABLE "team_kits" (
	"team_id" uuid NOT NULL,
	"valid_from_day" integer NOT NULL,
	"kit" text NOT NULL,
	"set_by" "kit_set_by" NOT NULL,
	"sponsor_deal_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_kits_team_id_valid_from_day_pk" PRIMARY KEY("team_id","valid_from_day"),
	CONSTRAINT "team_kits_code" CHECK ("team_kits"."kit" ~ '^[a-z]+([.][a-z]+){1,2}$'),
	CONSTRAINT "team_kits_sponsor" CHECK (("team_kits"."set_by" = 'sponsor') = ("team_kits"."sponsor_deal_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "bib" text DEFAULT 'black' NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "kit_canonical" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "managed_since_day" integer;--> statement-breakpoint
ALTER TABLE "team_kits" ADD CONSTRAINT "team_kits_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "teams_world_kit_uidx" ON "teams" USING btree ("world_id","kit_canonical");--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_bib_style" CHECK ("teams"."bib" in ('black', 'black.panel', 'base', 'base.panel'));