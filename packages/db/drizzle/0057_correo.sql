CREATE TABLE "email_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resend_id" text,
	"kind" text NOT NULL,
	"recipient_hash" text NOT NULL,
	"user_id" uuid,
	"status" text DEFAULT 'queued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_log_resend_id_unique" UNIQUE("resend_id")
);
--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_log_recipient" ON "email_log" USING btree ("recipient_hash","created_at");--> statement-breakpoint
CREATE INDEX "email_log_created" ON "email_log" USING btree ("created_at");