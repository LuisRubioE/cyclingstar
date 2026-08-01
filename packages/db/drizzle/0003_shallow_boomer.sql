CREATE TYPE "public"."training_intensity" AS ENUM('suave', 'normal', 'fuerte');--> statement-breakpoint
CREATE TYPE "public"."training_session" AS ENUM('descanso_total', 'descanso_activo', 'fondo', 'umbral', 'puertos', 'sprint', 'crono', 'bajada_paves', 'gimnasio', 'video_tactica', 'viaje');--> statement-breakpoint
CREATE TABLE "rider_daily_log" (
	"rider_id" uuid NOT NULL,
	"game_day" integer NOT NULL,
	"tss" real NOT NULL,
	"ctl" real NOT NULL,
	"atl" real NOT NULL,
	"tsb" real NOT NULL,
	"activity" text NOT NULL,
	CONSTRAINT "rider_daily_log_rider_id_game_day_pk" PRIMARY KEY("rider_id","game_day")
);
--> statement-breakpoint
CREATE TABLE "training_orders" (
	"rider_id" uuid NOT NULL,
	"game_day" integer NOT NULL,
	"session" "training_session" NOT NULL,
	"intensity" "training_intensity" NOT NULL,
	CONSTRAINT "training_orders_rider_id_game_day_pk" PRIMARY KEY("rider_id","game_day")
);
--> statement-breakpoint
ALTER TABLE "rider_daily_log" ADD CONSTRAINT "rider_daily_log_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_orders" ADD CONSTRAINT "training_orders_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;