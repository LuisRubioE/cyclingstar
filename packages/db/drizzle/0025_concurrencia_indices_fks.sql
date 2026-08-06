DROP INDEX "contracts_rider_idx";--> statement-breakpoint
ALTER TABLE "tick_log" ADD COLUMN "failed_day" integer;--> statement-breakpoint
ALTER TABLE "tick_log" ADD COLUMN "failed_attempts" integer;--> statement-breakpoint
ALTER TABLE "worlds" ADD COLUMN "repair_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- LIMPIEZA DE DATOS (añadida a mano sobre la migración generada por drizzle-kit).
-- `riders.team_id` no tenía clave foránea, así que puede haber filas apuntando a equipos ya
-- borrados (la poda de NPC de world.ts borraba el equipo y ponía team_id a null en otra sentencia:
-- si algo falló entre medias, o si se borró un equipo por otra vía, quedó colgando). Un team_id
-- colgando es exactamente un agente libre, así que se pone a null antes de crear la constraint.
UPDATE "riders" SET "team_id" = NULL
WHERE "team_id" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "teams" WHERE "teams"."id" = "riders"."team_id");--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- LIMPIEZA DE DATOS (añadida a mano): "un contrato por corredor" solo lo sostenía el código
-- (`acceptOffer` borra antes de insertar). Si algún mundo tiene duplicados, se conserva el contrato
-- MÁS VIGENTE de cada corredor (el de temporada final más lejana; a igualdad, el que empieza más
-- tarde, luego el de mayor salario y por último el de id mayor, para que sea determinista) y se
-- borran los demás, antes de imponer el índice único.
DELETE FROM "contracts" c
USING "contracts" other
WHERE c."rider_id" = other."rider_id"
  AND (other."end_season", other."start_season", other."salary", other."id")
    > (c."end_season", c."start_season", c."salary", c."id");--> statement-breakpoint
CREATE UNIQUE INDEX "contracts_rider_uidx" ON "contracts" USING btree ("rider_id");--> statement-breakpoint
CREATE INDEX "offers_team_idx" ON "offers" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "race_entries_race_season_idx" ON "race_entries" USING btree ("race_id","season");--> statement-breakpoint
CREATE INDEX "rider_race_prefs_race_idx" ON "rider_race_prefs" USING btree ("race_id");--> statement-breakpoint
CREATE INDEX "riders_world_points_idx" ON "riders" USING btree ("world_id","season_points" desc);--> statement-breakpoint
CREATE INDEX "team_race_plan_season_race_idx" ON "team_race_plan" USING btree ("season","race_id");--> statement-breakpoint
CREATE INDEX "tick_log_started_idx" ON "tick_log" USING btree ("started_at");
