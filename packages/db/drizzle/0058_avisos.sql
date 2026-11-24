CREATE TYPE "public"."push_channel" AS ENUM('webpush', 'fcm', 'apns');--> statement-breakpoint
CREATE TABLE "notice_log" (
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"ref" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notice_log_once" UNIQUE("user_id","kind","ref")
);
--> statement-breakpoint
CREATE TABLE "push_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid,
	"channel" "push_channel" NOT NULL,
	"endpoint_hash" text NOT NULL,
	"credential" jsonb NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_ok_at" timestamp with time zone,
	"failures" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "push_targets_endpoint_hash_unique" UNIQUE("endpoint_hash")
);
--> statement-breakpoint
ALTER TABLE "notice_log" ADD CONSTRAINT "notice_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_targets" ADD CONSTRAINT "push_targets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_targets" ADD CONSTRAINT "push_targets_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notice_log_sent" ON "notice_log" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "push_targets_user" ON "push_targets" USING btree ("user_id");