-- EL RANKING A 365 DÍAS RODANTES (docs/epics.md «G3»).
--
-- El dueño: «el ranking debería sumar los puntos en los últimos 365 días: si llegamos al GD 25, hay
-- que sumar los que consigan ese día y restar los que consiguieron el GD 25 del año anterior». Es
-- como funciona el ranking UCI de verdad.
--
-- No se podía. `riders.season_points` es un CONTADOR que se incrementa (`season_points + pts`) y que
-- el rollover pone a cero cada temporada: no hay puntuaciones fechadas, así que no hay nada que
-- restar. Es un cambio de esquema, no de fórmula, y esta tabla es el cambio: cada puntuación con su
-- día, su carrera y de qué fue.
--
-- Solo puntúan los diez primeros de cada etapa y de cada general, así que son ~10 filas por día de
-- carrera: unas pocas miles por temporada. No se borra en el rollover —esa es justamente la gracia—.
CREATE TABLE "rider_points" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "rider_id" uuid NOT NULL REFERENCES "riders"("id") ON DELETE CASCADE,
  "game_day" integer NOT NULL,
  "points" integer NOT NULL,
  -- De dónde salieron, para poder enseñar el desglose y para poder depurar un ranking raro.
  "race_id" text NOT NULL,
  "kind" text NOT NULL
);

-- La consulta del ranking suma por corredor dentro de una ventana de días; la del perfil pide los de
-- UN corredor. Los dos índices son esas dos preguntas.
CREATE INDEX "rider_points_rider_day_idx" ON "rider_points" ("rider_id","game_day");
CREATE INDEX "rider_points_day_idx" ON "rider_points" ("game_day");

-- Y NADIE PIERDE SU PUESTO AL DESPLEGAR. Un mundo que ya está vivo tiene los puntos de la temporada
-- en curso en `riders.season_points` y ni una sola puntuación fechada, así que sin esto el ranking
-- entero saldría a cero el día del despliegue. Se siembra lo que cada uno lleva acumulado como UNA
-- puntuación con la fecha de hoy: el ranking no da un salto, y esa fila va cayendo sola de la
-- ventana dentro de un año, que es exactamente lo que le pasaría a los puntos que representa.
INSERT INTO "rider_points" ("rider_id", "game_day", "points", "race_id", "kind")
SELECT r."id", COALESCE((SELECT g."current_day" FROM "game_state" g WHERE g."id" = 1), 0),
       r."season_points", 'legado', 'legado'
FROM "riders" r
WHERE r."season_points" > 0;
