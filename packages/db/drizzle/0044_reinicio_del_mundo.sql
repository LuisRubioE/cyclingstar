-- REINICIO DEL MUNDO, CON COPIA DE SEGURIDAD DENTRO DE LA BASE (decisión del dueño, 02/10/2026).
--
-- El dueño decide borrar el mundo de producción entero y empezar uno nuevo con la génesis v2
-- (`GENESIS_WORLD_SEED` = 'cyclingstar-2', motor v90). Desde aquí nadie tiene acceso externo a la
-- base de producción, así que la copia de seguridad la hace esta misma migración, dentro de la base
-- y ANTES de borrar nada.
--
-- ATOMICIDAD. El migrador de Drizzle (`PgDialect.migrate`) aplica todas las migraciones pendientes
-- dentro de UNA transacción, y en Postgres el DDL (CREATE SCHEMA, CREATE TABLE AS, TRUNCATE) también
-- es transaccional. Si algo falla, sea la copia o el borrado, no queda ni la copia a medias ni el
-- mundo a medio borrar: la base sigue exactamente como estaba y el servicio no arranca. El esquema
-- de la copia se crea sin IF NOT EXISTS a propósito: si ya existiera, la migración falla antes de
-- tocar nada en vez de mezclar dos copias.
--
-- ORDEN.
--   1. Candado del tick (`LOCK_CLASS.tick` = 2, `TICK_LOCK_KEY` = 1, en su versión de transacción):
--      espera a que termine un tick en curso del servicio viejo y no deja empezar otro hasta el
--      COMMIT. Ese tick que no arranca ve el candado ocupado y simplemente no hace nada.
--   2. LOCK TABLE de todas las tablas del mundo en ACCESS EXCLUSIVE: nadie escribe entre la copia y
--      el borrado, así que la copia es exactamente lo que se borra.
--   3. Copia: esquema `respaldo_mundo_1` con una tabla por cada tabla que se vacía
--      (CREATE TABLE ... AS TABLE, solo datos: sin índices, claves ni restricciones) y la tabla
--      `leeme`, con una fila que dice cuándo, por qué y qué mundo se guardó.
--   4. Borrado: un único TRUNCATE de las 29 tablas.
--
-- QUÉ SE COPIA Y SE BORRA (29 tablas, todo lo que es del mundo):
--   el mundo y su reloj: worlds, game_state, tick_log;
--   equipos y corredores, también los de los jugadores: teams, riders, rider_attrs, rider_hidden,
--   rider_attr_log, rider_daily_log, rider_points, rider_race_prefs;
--   entrenamiento: training_plans, training_orders, team_training_orders;
--   carreras: race_routes, race_rosters, race_entries, race_callups, team_race_plan, stage_orders,
--   stage_results, race_gc, stage_team_results, stage_snapshots (con la radio y la crónica);
--   palmarés y noticias: palmares, news;
--   economía y mercado: transactions, contracts, offers.
--
-- QUÉ SE CONSERVA (5 tablas, nada de ellas cuelga del mundo):
--   users, accounts, sessions, verifications: las cuentas, sus credenciales y sus sesiones. El
--   jugador sigue dado de alta y con la sesión abierta, y al entrar ve que no tiene ciclista y crea
--   uno nuevo (decisión del dueño: los corredores de los jugadores también se borran).
--   blocked_names: la lista de bloqueo de nombres que curan los admins; vale para cualquier mundo.
--   La contabilidad de Drizzle (`drizzle.__drizzle_migrations`) vive en otro esquema y no se toca.
--
-- TRUNCATE ... CASCADE no alcanza nada de lo que se conserva: ninguna de esas cinco tablas apunta a
-- una tabla del mundo (son las del mundo las que apuntan a `users`). El CASCADE está para que el
-- test (`reinicioDelMundo.test.ts`), que corre este SQL contra el esquema más reciente, no se rompa
-- el día que una migración posterior añada otra tabla que cuelgue de estas.
--
-- DESPUÉS. El servicio web lanza un tick nada más arrancar (`autoTick` en apps/api/src/index.ts) y el
-- servicio tick hace lo mismo tras `migrate.mjs`. Con `game_state` vacío, `ensureGenesis` crea un
-- mundo nuevo con la semilla 'cyclingstar-2', nacido reparado (`repair_version` actual) y fuera de
-- la transición E1 (`e1_transicion_hasta` = -1), y `seedWorld` siembra equipos y corredores.
--
-- CÓMO RESTAURAR (si el dueño quiere volver al mundo 1). Nunca SQL a mano en producción: se genera
-- una migración custom (`pnpm exec drizzle-kit generate --custom --name=restaurar_mundo_1` dentro
-- de packages/db) que, en una transacción, vacía el mundo nuevo con el mismo TRUNCATE de abajo y
-- vuelve a meter cada tabla con
--   INSERT INTO public.<tabla> SELECT * FROM respaldo_mundo_1.<tabla>;
-- en orden de claves foráneas: worlds, game_state, tick_log, teams, riders, y después todas las
-- demás. `SELECT *` solo vale mientras ninguna migración posterior haya cambiado las columnas de
-- esas tablas; si alguna lo hizo, se escriben las columnas a mano. Un usuario borrado después del
-- reinicio rompería la clave de `riders.user_id` o `teams.owner_user_id`: esas filas se insertan con
-- el usuario a NULL. El procedimiento completo está en docs/ops.md.
--
-- CUÁNDO BORRAR LA COPIA. Cuando el dueño dé el mundo nuevo por bueno, otra migración custom con
--   DROP SCHEMA respaldo_mundo_1 CASCADE;
-- Hasta entonces la copia ocupa más o menos lo que ocupaban los datos del mundo 1 (sin índices).
SELECT pg_advisory_xact_lock(2, 1);--> statement-breakpoint
LOCK TABLE
  "worlds", "game_state", "tick_log",
  "teams", "riders", "rider_attrs", "rider_hidden", "rider_attr_log", "rider_daily_log",
  "rider_points", "rider_race_prefs",
  "training_plans", "training_orders", "team_training_orders",
  "race_routes", "race_rosters", "race_entries", "race_callups", "team_race_plan", "stage_orders",
  "stage_results", "race_gc", "stage_team_results", "stage_snapshots",
  "palmares", "news",
  "transactions", "contracts", "offers"
IN ACCESS EXCLUSIVE MODE;--> statement-breakpoint
CREATE SCHEMA "respaldo_mundo_1";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."leeme" (
  "creado_en" timestamp with time zone NOT NULL,
  "engine_version" integer NOT NULL,
  "motivo" text NOT NULL,
  "mundo_id" uuid,
  "semilla" text,
  "dia_de_juego" integer,
  "como_restaurar" text NOT NULL
);--> statement-breakpoint
INSERT INTO "respaldo_mundo_1"."leeme"
  ("creado_en", "engine_version", "motivo", "mundo_id", "semilla", "dia_de_juego", "como_restaurar")
SELECT
  now(),
  90,
  'reset del mundo por decisión del dueño, 02/10/2026',
  g."world_id",
  w."world_seed",
  g."current_day",
  'migración 0044_reinicio_del_mundo; procedimiento en docs/ops.md, sección «Migración 0044»'
FROM (SELECT 1) AS una
LEFT JOIN "game_state" g ON g."id" = 1
LEFT JOIN "worlds" w ON w."id" = g."world_id";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."worlds" AS TABLE "public"."worlds";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."game_state" AS TABLE "public"."game_state";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."tick_log" AS TABLE "public"."tick_log";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."teams" AS TABLE "public"."teams";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."riders" AS TABLE "public"."riders";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."rider_attrs" AS TABLE "public"."rider_attrs";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."rider_hidden" AS TABLE "public"."rider_hidden";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."rider_attr_log" AS TABLE "public"."rider_attr_log";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."rider_daily_log" AS TABLE "public"."rider_daily_log";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."rider_points" AS TABLE "public"."rider_points";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."rider_race_prefs" AS TABLE "public"."rider_race_prefs";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."training_plans" AS TABLE "public"."training_plans";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."training_orders" AS TABLE "public"."training_orders";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."team_training_orders" AS TABLE "public"."team_training_orders";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."race_routes" AS TABLE "public"."race_routes";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."race_rosters" AS TABLE "public"."race_rosters";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."race_entries" AS TABLE "public"."race_entries";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."race_callups" AS TABLE "public"."race_callups";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."team_race_plan" AS TABLE "public"."team_race_plan";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."stage_orders" AS TABLE "public"."stage_orders";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."stage_results" AS TABLE "public"."stage_results";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."race_gc" AS TABLE "public"."race_gc";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."stage_team_results" AS TABLE "public"."stage_team_results";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."stage_snapshots" AS TABLE "public"."stage_snapshots";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."palmares" AS TABLE "public"."palmares";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."news" AS TABLE "public"."news";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."transactions" AS TABLE "public"."transactions";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."contracts" AS TABLE "public"."contracts";--> statement-breakpoint
CREATE TABLE "respaldo_mundo_1"."offers" AS TABLE "public"."offers";--> statement-breakpoint
TRUNCATE TABLE
  "worlds", "game_state", "tick_log",
  "teams", "riders", "rider_attrs", "rider_hidden", "rider_attr_log", "rider_daily_log",
  "rider_points", "rider_race_prefs",
  "training_plans", "training_orders", "team_training_orders",
  "race_routes", "race_rosters", "race_entries", "race_callups", "team_race_plan", "stage_orders",
  "stage_results", "race_gc", "stage_team_results", "stage_snapshots",
  "palmares", "news",
  "transactions", "contracts", "offers"
CASCADE;
