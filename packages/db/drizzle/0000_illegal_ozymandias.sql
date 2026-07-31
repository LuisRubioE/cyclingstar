CREATE TABLE "game_state" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"world_id" uuid NOT NULL,
	"current_day" integer NOT NULL,
	"season_id" uuid,
	"last_processed_day" integer NOT NULL,
	CONSTRAINT "game_state_singleton" CHECK ("game_state"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "tick_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"days_processed" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"ok" boolean NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" "citext" NOT NULL,
	"password_hash" text,
	"locale" text DEFAULT 'es' NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "worlds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_seed" text NOT NULL,
	"engine_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_state" ADD CONSTRAINT "game_state_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE no action ON UPDATE no action;