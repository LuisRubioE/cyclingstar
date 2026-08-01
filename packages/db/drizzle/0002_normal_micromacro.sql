CREATE TYPE "public"."rider_archetype" AS ENUM('escalada', 'velocidad', 'clasicas', 'crono', 'fondo');--> statement-breakpoint
CREATE TYPE "public"."rider_attribute" AS ENUM('RES', 'REC', 'LLA', 'MON', 'COL', 'CRI', 'SPR', 'DES', 'PAV', 'TAC');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('M', 'F');--> statement-breakpoint
CREATE TYPE "public"."rider_health" AS ENUM('sano', 'molestias', 'enfermo', 'lesionado');--> statement-breakpoint
CREATE TABLE "rider_attr_log" (
	"rider_id" uuid NOT NULL,
	"game_day" integer NOT NULL,
	"attr" "rider_attribute" NOT NULL,
	"delta" real NOT NULL,
	CONSTRAINT "rider_attr_log_rider_id_game_day_attr_pk" PRIMARY KEY("rider_id","game_day","attr")
);
--> statement-breakpoint
CREATE TABLE "rider_attrs" (
	"rider_id" uuid NOT NULL,
	"attr" "rider_attribute" NOT NULL,
	"value" real NOT NULL,
	CONSTRAINT "rider_attrs_rider_id_attr_pk" PRIMARY KEY("rider_id","attr")
);
--> statement-breakpoint
CREATE TABLE "rider_hidden" (
	"rider_id" uuid PRIMARY KEY NOT NULL,
	"talent" real NOT NULL,
	"ceilings" jsonb NOT NULL,
	"fragility" real NOT NULL,
	"peak_age" integer NOT NULL,
	"decline_age" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "riders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"user_id" uuid,
	"team_id" uuid,
	"name" text NOT NULL,
	"country" char(2) NOT NULL,
	"gender" "gender" NOT NULL,
	"birth_season" integer NOT NULL,
	"archetype" "rider_archetype" NOT NULL,
	"retired_at" integer,
	"money" integer DEFAULT 0 NOT NULL,
	"fame" real DEFAULT 0 NOT NULL,
	"morale" real DEFAULT 50 NOT NULL,
	"team_trust" real DEFAULT 50 NOT NULL,
	"ctl" real DEFAULT 0 NOT NULL,
	"atl" real DEFAULT 0 NOT NULL,
	"health" "rider_health" DEFAULT 'sano' NOT NULL,
	"health_until_day" integer,
	"face_seed" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rider_attr_log" ADD CONSTRAINT "rider_attr_log_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_attrs" ADD CONSTRAINT "rider_attrs_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_hidden" ADD CONSTRAINT "rider_hidden_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "riders_user_idx" ON "riders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "riders_team_idx" ON "riders" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "riders_world_fame_idx" ON "riders" USING btree ("world_id","fame");