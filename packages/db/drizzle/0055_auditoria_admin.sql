CREATE TABLE "admin_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"target_user_id" uuid,
	"detail" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "admin_audit_at" ON "admin_audit" USING btree ("at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "admin_audit_target" ON "admin_audit" USING btree ("target_user_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_status" CHECK ("users"."status" in ('pending', 'approved'));--> statement-breakpoint

-- LAS CUENTAS DE HOY, APROBADAS (docs/cuenta.md §4.9 y §15.2). Desde esta migración quien se registra
-- queda `pending` hasta que un administrador lo aprueba; las cuentas que ya existían entraron cuando
-- el registro estaba abierto, así que pasan a `approved` con la fecha de hoy. La del dueño entre
-- ellas: ninguna se queda fuera.
UPDATE "users" SET "status" = 'approved', "approved_at" = now();
