CREATE TYPE "public"."chase_policy" AS ENUM('nunca', 'si_amenaza', 'siempre');--> statement-breakpoint
CREATE TYPE "public"."day_goal" AS ENUM('ganar', 'general', 'puntos', 'montana', 'grupeto', 'ahorrar', 'servir');--> statement-breakpoint
ALTER TABLE "stage_orders" ADD COLUMN "trigger_on" jsonb;--> statement-breakpoint
ALTER TABLE "stage_orders" ADD COLUMN "chase_policy" "chase_policy";--> statement-breakpoint
ALTER TABLE "stage_orders" ADD COLUMN "refuse_relay_teams" jsonb;--> statement-breakpoint
ALTER TABLE "stage_orders" ADD COLUMN "day_goal" "day_goal";