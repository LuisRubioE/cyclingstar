-- UN SOLO PLAN VIVO (E3, docs/visual.md §11.5; D-39, H-04; PR 13a).
--
-- Hasta el 13a, `PUT /api/riders/me/plan` guardaba siempre con el `startDay` de mañana, y la clave de
-- `training_plans` es (`rider_id`, `start_day`): dos guardados en la misma ventana de 28 días dejaban dos
-- filas. La pantalla leía una (`getPlanForDay`, sin orden) y el tick entrenaba otra (la última de su
-- `Map`). Desde el 13a el guardado va sobre el `startDay` del plan vivo y borra los que pisa, y las dos
-- lecturas se quedan con el de `start_day` mayor.
--
-- Esta migración limpia los solapes que ya hay: un plan con otro posterior del mismo corredor a menos de
-- 28 días se borra, y se conserva el de `start_day` mayor, el que leerán la pantalla y el tick. Un plan
-- que acabó antes de que empezara el siguiente (a 28 días o más) no pisa a nadie y se queda.
--
-- Sin candado propio: `runMigrations` ya toma el del tick cuando hay migraciones pendientes.
--
-- Idempotente: una segunda pasada no encuentra solapes.
DELETE FROM "training_plans" AS p USING "training_plans" AS q
WHERE q."rider_id" = p."rider_id"
  AND q."start_day" > p."start_day"
  AND q."start_day" - p."start_day" < 28;
