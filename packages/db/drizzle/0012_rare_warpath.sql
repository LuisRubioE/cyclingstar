CREATE TYPE "public"."blocked_name_kind" AS ENUM('team', 'rider');--> statement-breakpoint
CREATE TABLE "blocked_names" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "blocked_name_kind" NOT NULL,
	"value" text NOT NULL,
	"value_norm" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "blocked_names_kind_norm_idx" ON "blocked_names" USING btree ("kind","value_norm");