ALTER TYPE "public"."txn_kind" ADD VALUE 'viaje' BEFORE 'otro';--> statement-breakpoint
ALTER TYPE "public"."txn_kind" ADD VALUE 'vivienda' BEFORE 'otro';--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN "residence" char(2);