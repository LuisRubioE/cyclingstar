CREATE TABLE "auth_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL,
	"day_start" timestamp with time zone NOT NULL,
	"day_count" integer NOT NULL,
	"locked_until" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "locale" SET DEFAULT 'en';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "birth_date" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "terms_version" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "terms_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "away_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "away_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "welcome_back_from" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "time_zone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notice_prefs" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_undeliverable_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "device_epoch" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_away_pair" CHECK (("users"."away_since" is null) = ("users"."away_until" is null) and ("users"."away_until" is null or "users"."away_until" > "users"."away_since"));--> statement-breakpoint

-- LOS DOS UPDATE DE DATOS (docs/cuenta.md §15.2 y §19.1). No se pueden deshacer.
-- La IP de cada sesión, vaciada: better-auth ya no la guarda (`disableIpTracking`, §6.2; D-18) y nadie
-- la lee; la columna se queda porque es del modelo de better-auth.
UPDATE "sessions" SET "ip_address" = '';--> statement-breakpoint
-- El nombre de hoy, el mismo para todas: no se enseña en ninguna parte (D-08) y el gancho de registro
-- lo escribe en las cuentas nuevas (§4.7).
UPDATE "users" SET "name" = 'Player';
