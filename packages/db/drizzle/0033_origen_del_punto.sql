-- DE DÓNDE VIENE CADA PUNTO, Y EL ESTADO CON EL QUE NACE UN HUMANO.
--
-- Dos cosas que no tienen que ver entre sí salvo en que las dos son del paso 2 del rediseño de
-- entrenamiento (docs/entrenamiento.md §4.6 y §3.4, docs/balance.md «v59 §2»).
--
-- NOTA SOBRE CÓMO SE ESCRIBIÓ ESTE FICHERO, porque la regla de la casa es que las migraciones salen
-- de `drizzle-kit generate` y ésta se ha tenido que corregir a mano. `drizzle-kit` diffea el esquema
-- contra el ÚLTIMO SNAPSHOT guardado, y el último que hay en el repositorio es el **0029**: los
-- snapshots de 0030, 0031 y 0032 nunca se comprometieron. Así que la generación re-emitía, además de
-- lo de aquí, el `rider_points` entero del 0031 y el `parte` del 0030, que ya existen; sobre una base
-- que hubiera corrido esas migraciones habría fallado con tabla y columna duplicadas, y la CI de
-- migraciones habría salido roja. Se deja SOLO el delta de verdad. El snapshot 0033 sí se guarda y
-- está construido desde el esquema actual, así que la próxima generación vuelve a ser correcta y este
-- arreglo no hay que repetirlo.
--
-- (El `ADD COLUMN` va ANTES que la clave primaria. El generador los emitía al revés, y una clave que
-- nombra una columna que todavía no existe no se puede crear.)

CREATE TYPE "public"."attr_log_source" AS ENUM('entrenamiento', 'carrera', 'sobrecompensacion', 'declive', 'detraining');--> statement-breakpoint

ALTER TABLE "rider_attr_log" ADD COLUMN "source" "attr_log_source" DEFAULT 'entrenamiento' NOT NULL;--> statement-breakpoint

-- La clave gana el origen. Además del desglose, arregla un defecto silencioso: con la clave vieja,
-- el día que un corredor corría Y entrenaba la segunda fila chocaba y `onConflictDoNothing` la
-- tiraba sin avisar. Los puntos se aplicaban igual; lo que se perdía era la explicación.
ALTER TABLE "rider_attr_log" DROP CONSTRAINT "rider_attr_log_rider_id_game_day_attr_pk";--> statement-breakpoint
ALTER TABLE "rider_attr_log" ADD CONSTRAINT "rider_attr_log_rider_id_game_day_attr_source_pk" PRIMARY KEY("rider_id","game_day","attr","source");--> statement-breakpoint

-- EL HUMANO NACÍA SIN PIERNAS. `createRider` no escribía `ctl`/`atl`, así que se quedaban en el
-- defecto de la columna (0) mientras `BANISTER.initialCtl` dice 45 y todo NPC nace con 45. Un
-- corredor con CTL 0 arrastra un multiplicador de depósito de 0,90 en vez de 0,99 desde su primer
-- día, y eso es conducta en producción.
--
-- El corte es `ctl < 5` y no `ctl = 0` porque el Banister mueve el número desde el primer día: un
-- humano creado hace una semana ya no está exactamente en 0. Por debajo de 5 solo se puede estar
-- habiendo nacido en 0, porque nadie baja ahí entrenando.
--
-- La MORAL no se toca, y es deliberado: el defecto la dejaba en 50 y la constante dice 60, pero 50
-- es un valor al que un corredor PUEDE haber llegado solo —la moral deriva con los resultados— y
-- desde aquí no se distingue «nació mal» de «le ha ido mal». El CTL sí se distingue.
UPDATE "riders" SET "ctl" = 45, "atl" = 45 WHERE "user_id" IS NOT NULL AND "ctl" < 5;
