CREATE TABLE "team_training_orders" (
	"team_id" uuid NOT NULL,
	"game_day" integer NOT NULL,
	"session" "training_session" NOT NULL,
	"intensity" "training_intensity" NOT NULL,
	CONSTRAINT "team_training_orders_team_id_game_day_pk" PRIMARY KEY("team_id","game_day")
);
--> statement-breakpoint
ALTER TABLE "team_training_orders" ADD CONSTRAINT "team_training_orders_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;