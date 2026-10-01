-- LOS TOPES DEL ARQUETIPO, APLICADOS UNA VEZ AL MUNDO VIVO (decisión del dueño, 28/09/2026).
--
-- El mundo vivo nació con la génesis legacy, que no conocía arquetipos: sorteaba el atributo y le
-- añadía un margen. La 0032 reabrió después los techos de TODOS los corredores en TODOS los
-- atributos (+17 en los físicos de los de 23 años o menos), sin mirar para qué está hecho cada uno.
-- La génesis v2 (`NPC.ceilingCapOffTrade`, `world/npc.ts`) pone un tope de 83 a lo que el
-- arquetipo penaliza de verdad (offset ≤ −14 en `ARCHETYPE_CEILING_OFFSETS`), pero solo a los que
-- nacen desde entonces. Resultado visible: un «crono» con CRI 95 y SPR 90 que ganó el prólogo y tres
-- esprints de la misma vuelta (Race Germany, temporada 0).
--
-- Qué hace: a cada corredor BOT (`user_id` nulo; a los de los jugadores no se les toca) le baja a 83
-- el techo, y el atributo si lo pasa, en los físicos que su arquetipo penaliza. TAC queda fuera
-- porque es oficio y se aprende corriendo, no compite por el mismo cuerpo (tampoco entra en el
-- presupuesto de dispersión de la v2). Solo baja: quien ya está por debajo no cambia.
--
-- La lista de pares la genera y la vigila `topesArquetipo.test.ts` contra las constantes: si un
-- offset cambia, el test pide rehacer esta lista (la migración ya aplicada no se reescribe).
WITH pares ("archetype", "attr") AS (
  VALUES
    ('escalada', 'LLA'),
    ('escalada', 'CRI'),
    ('escalada', 'SPR'),
    ('escalada', 'PAV'),
    ('velocidad', 'RES'),
    ('velocidad', 'MON'),
    ('velocidad', 'COL'),
    ('velocidad', 'CRI'),
    ('velocidad', 'DES'),
    ('velocidad', 'PAV'),
    ('puncheur', 'MON'),
    ('puncheur', 'CRI'),
    ('puncheur', 'PAV'),
    ('clasicas', 'MON'),
    ('clasicas', 'CRI'),
    ('crono', 'MON'),
    ('crono', 'COL'),
    ('crono', 'SPR'),
    ('crono', 'DES'),
    ('crono', 'PAV'),
    ('rodador', 'MON'),
    ('rodador', 'COL'),
    ('rodador', 'SPR'),
    ('fondo', 'SPR'),
    ('fondo', 'PAV'),
    ('gregario', 'MON'),
    ('gregario', 'COL'),
    ('gregario', 'CRI'),
    ('gregario', 'SPR'),
    ('gregario', 'PAV')
),
afectados AS (
  SELECT r."id" AS "rider_id", p."attr"
  FROM "riders" r
  JOIN pares p ON p."archetype" = r."archetype"::text
  WHERE r."user_id" IS NULL
),
techos AS (
  SELECT a."rider_id",
         jsonb_object_agg(a."attr", LEAST((h."ceilings" ->> a."attr")::numeric, 83)) AS nuevos
  FROM afectados a
  JOIN "rider_hidden" h ON h."rider_id" = a."rider_id"
  WHERE (h."ceilings" ->> a."attr")::numeric > 83
  GROUP BY a."rider_id"
)
UPDATE "rider_hidden" h
SET "ceilings" = h."ceilings" || t.nuevos
FROM techos t
WHERE t."rider_id" = h."rider_id";--> statement-breakpoint
WITH pares ("archetype", "attr") AS (
  VALUES
    ('escalada', 'LLA'),
    ('escalada', 'CRI'),
    ('escalada', 'SPR'),
    ('escalada', 'PAV'),
    ('velocidad', 'RES'),
    ('velocidad', 'MON'),
    ('velocidad', 'COL'),
    ('velocidad', 'CRI'),
    ('velocidad', 'DES'),
    ('velocidad', 'PAV'),
    ('puncheur', 'MON'),
    ('puncheur', 'CRI'),
    ('puncheur', 'PAV'),
    ('clasicas', 'MON'),
    ('clasicas', 'CRI'),
    ('crono', 'MON'),
    ('crono', 'COL'),
    ('crono', 'SPR'),
    ('crono', 'DES'),
    ('crono', 'PAV'),
    ('rodador', 'MON'),
    ('rodador', 'COL'),
    ('rodador', 'SPR'),
    ('fondo', 'SPR'),
    ('fondo', 'PAV'),
    ('gregario', 'MON'),
    ('gregario', 'COL'),
    ('gregario', 'CRI'),
    ('gregario', 'SPR'),
    ('gregario', 'PAV')
)
UPDATE "rider_attrs" ra
SET "value" = 83
FROM "riders" r, pares p
WHERE ra."rider_id" = r."id"
  AND r."user_id" IS NULL
  AND p."archetype" = r."archetype"::text
  AND ra."attr"::text = p."attr"
  AND ra."value" > 83;
