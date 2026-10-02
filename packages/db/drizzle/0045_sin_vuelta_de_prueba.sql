-- SIN VUELTA DE PRUEBA (decisión del dueño, 02/10/2026): «¿qué es el Test tour del GD1? Quítalo».
--
-- La vuelta de prueba (clave `test-tour`, sin sufijo de temporada) era un resto del MVP: el tick la
-- corría en los días de juego 1 a 5 de cada mundo con un pelotón de relleno, fuera del calendario.
-- Tras el reinicio de la 0044 el mundo nuevo la corrió en su GD1 y los jugadores la vieron. El código
-- ya no la corre ni la sirve; esta migración borra lo que dejó escrito en el mundo vivo para que no
-- aparezca en ninguna pantalla (resultados, último informe, palmarés, ranking, noticias, cuentas,
-- registro diario).
--
-- Qué se toca, SOLO lo que salió de la vuelta de prueba:
--   1. Candado del tick (`LOCK_CLASS.tick` = 2, `TICK_LOCK_KEY` = 1, versión de transacción): espera
--      a que acabe un tick en curso y no deja empezar otro hasta el COMMIT, igual que la 0044.
--   2. Puntos de ranking: se borran las filas de `rider_points` con `race_id = 'test-tour'` y se
--      descuentan esos mismos puntos de `riders.season_points`, que los sumó a la vez. Solo los de la
--      temporada en curso: si el mundo ya hubiera cambiado de temporada, el rollover habría puesto
--      `season_points` a cero y restar dejaría a esos corredores en negativo.
--   3. Premios del corredor: se borran las entradas de `transactions` que apuntó la vuelta
--      (`kind = 'premio'`, nota «Test tour · stage win» o «Test tour · GC #n») y se descuenta su
--      importe de `riders.money`, que es la suma de esas entradas. El premio de EQUIPO no deja rastro
--      por carrera (va directo a `teams.budget`) y no se puede deshacer con exactitud: se queda.
--   4. Las tablas de carrera indexadas por la clave: `race_rosters`, `stage_orders`, `stage_results`,
--      `race_gc`, `stage_team_results`, `stage_snapshots` y `palmares` (`race_id = 'test-tour'`).
--   5. El parte diario de esos días de carrera (`rider_daily_log.activity` = 'carrera:test-tour:eN').
--   6. Los titulares de la vuelta (`news`): los de victoria, general, montaña y abandono, que citan
--      la carrera por su nombre («… of the Test tour»). Ninguna carrera del calendario se llama así.
--
-- Qué NO se toca: la fisiología de esos días (forma, fatiga, lesiones, la progresión de atributos de
-- `rider_attr_log`) ya pasó y forma parte del corredor; ninguna de esas filas nombra la vuelta. Ni
-- una fila de una carrera del calendario: todas sus claves llevan `:sN`.
--
-- Idempotente: una segunda pasada no encuentra filas y no cambia nada.
SELECT pg_advisory_xact_lock(2, 1);--> statement-breakpoint
WITH borrados AS (
  DELETE FROM "rider_points"
  WHERE "race_id" = 'test-tour'
  RETURNING "rider_id", "game_day", "points"
),
por_corredor AS (
  SELECT "rider_id", sum("points")::int AS "puntos"
  FROM borrados
  WHERE "game_day" / 364 = (SELECT "current_day" / 364 FROM "game_state" WHERE "id" = 1)
  GROUP BY "rider_id"
)
UPDATE "riders" r
SET "season_points" = r."season_points" - p."puntos"
FROM por_corredor p
WHERE r."id" = p."rider_id";--> statement-breakpoint
WITH borrados AS (
  DELETE FROM "transactions"
  WHERE "kind" = 'premio' AND "note" LIKE 'Test tour · %'
  RETURNING "rider_id", "amount"
),
por_corredor AS (
  SELECT "rider_id", sum("amount")::int AS "importe"
  FROM borrados
  GROUP BY "rider_id"
)
UPDATE "riders" r
SET "money" = r."money" - p."importe"
FROM por_corredor p
WHERE r."id" = p."rider_id";--> statement-breakpoint
DELETE FROM "race_rosters" WHERE "race_id" = 'test-tour';--> statement-breakpoint
DELETE FROM "stage_orders" WHERE "race_id" = 'test-tour';--> statement-breakpoint
DELETE FROM "stage_results" WHERE "race_id" = 'test-tour';--> statement-breakpoint
DELETE FROM "race_gc" WHERE "race_id" = 'test-tour';--> statement-breakpoint
DELETE FROM "stage_team_results" WHERE "race_id" = 'test-tour';--> statement-breakpoint
DELETE FROM "stage_snapshots" WHERE "race_id" = 'test-tour';--> statement-breakpoint
DELETE FROM "palmares" WHERE "race_id" = 'test-tour';--> statement-breakpoint
DELETE FROM "rider_daily_log" WHERE "activity" LIKE 'carrera:test-tour:e%';--> statement-breakpoint
DELETE FROM "news"
WHERE "kind" IN ('stage_win', 'tt_win', 'breakaway_win', 'one_day_win', 'one_day_tt_win', 'gc_win', 'kom', 'abandon')
  AND "text" LIKE '%the Test tour%';
