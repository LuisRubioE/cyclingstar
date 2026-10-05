CREATE TYPE "public"."spoiler_scope" AS ENUM('guarded', 'own_only', 'off');--> statement-breakpoint
CREATE TABLE "race_watch" (
	"user_id" uuid NOT NULL,
	"world_id" uuid NOT NULL,
	"race_key" text NOT NULL,
	"follow" smallint DEFAULT 0 NOT NULL,
	"known_through" smallint DEFAULT 0 NOT NULL,
	"how" text DEFAULT '' NOT NULL,
	"watching_stage" smallint,
	"reached_s" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "race_watch_user_id_world_id_race_key_pk" PRIMARY KEY("user_id","world_id","race_key"),
	CONSTRAINT "race_watch_follow" CHECK ("race_watch"."follow" between -1 and 1),
	CONSTRAINT "race_watch_how" CHECK ("race_watch"."how" ~ '^[WSRAX]*$' and char_length("race_watch"."how") = "race_watch"."known_through"),
	CONSTRAINT "race_watch_watching" CHECK (("race_watch"."watching_stage" is null) = ("race_watch"."reached_s" is null) and ("race_watch"."watching_stage" is null or "race_watch"."watching_stage" = "race_watch"."known_through" + 1))
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "spoiler_scope" "spoiler_scope" DEFAULT 'guarded' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "horizon_rev" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reveal_confirm" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "race_watch" ADD CONSTRAINT "race_watch_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_watch" ADD CONSTRAINT "race_watch_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "race_rosters_rider_idx" ON "race_rosters" USING btree ("rider_id");