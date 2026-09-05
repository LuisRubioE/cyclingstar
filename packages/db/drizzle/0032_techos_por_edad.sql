-- SE SIGUE MEJORANDO DESPUÉS DE LOS 24, PERO EN COSAS DISTINTAS (docs/epics.md «G1»).
--
-- El motor generaba a los NPCs con el techo clavado en su atributo a partir de los 24 años, y como
-- la ganancia por entrenamiento vale 0 en cuanto se alcanza el techo, el 90 % del pelotón NO PODÍA
-- MEJORAR JAMÁS. El dueño lo mandó abrir: «hay que ser menos cartesianos… un ciclista sí mejora
-- después de los 24, pero mejora en cosas diferentes».
--
-- Arreglarlo en el generador solo sirve para los que NAZCAN a partir de ahora. Los corredores que
-- ya existen llevan sus techos guardados en `rider_hidden.ceilings`, congelados, y sin esta
-- migración se quedarían así el resto de su carrera: en un mundo vivo, el arreglo no se notaría en
-- años. Por eso se les reabre el techo aquí, una vez.
--
-- SIN DADO, a propósito. El generador reparte el margen con una uniforme para que dos corredores
-- de la misma edad no salgan iguales; aquí eso no aporta nada —la variedad ya está en los atributos
-- que cada uno tiene— y un número reproducible es mucho más fácil de auditar el día que alguien
-- pregunte por qué su corredor tiene el techo donde lo tiene. Se usa el centro de cada rango de
-- `NPC.ceilingBoost`, redondeado.
--
-- Y NUNCA BAJA: se toma el máximo con el techo actual. A un joven que ya tenía margen no se le
-- recorta, y a nadie se le deja por debajo de lo que ya es.
WITH edades AS (
  SELECT r."id",
         20 - r."birth_season"
           + floor(COALESCE((SELECT g."current_day" FROM "game_state" g WHERE g."id" = 1), 0) / 364)
           AS edad
  FROM "riders" r
),
nuevos AS (
  SELECT h."rider_id",
         jsonb_object_agg(
           a."attr"::text,
           LEAST(
             96,
             GREATEST(
               COALESCE((h."ceilings" ->> a."attr"::text)::numeric, a."value"),
               a."value" + CASE
                 -- Oficio (táctica, descenso, adoquín): se aprende toda la carrera.
                 WHEN a."attr" IN ('TAC', 'DES', 'PAV') THEN
                   CASE WHEN e.edad <= 23 THEN 19 WHEN e.edad <= 27 THEN 14 ELSE 10 END
                 -- Motor: rápido de joven, poquito en la plenitud, un hilo de veterano.
                 ELSE
                   CASE WHEN e.edad <= 23 THEN 17 WHEN e.edad <= 27 THEN 5 ELSE 1 END
               END
             )
           )
         ) AS techos
  FROM "rider_hidden" h
  JOIN "rider_attrs" a ON a."rider_id" = h."rider_id"
  JOIN edades e ON e."id" = h."rider_id"
  GROUP BY h."rider_id"
)
UPDATE "rider_hidden" h
SET "ceilings" = h."ceilings" || n.techos
FROM nuevos n
WHERE n."rider_id" = h."rider_id";
