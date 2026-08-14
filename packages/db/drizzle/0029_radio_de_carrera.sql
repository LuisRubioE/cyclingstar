-- LA RADIO DE CARRERA, GUARDADA.
--
-- La radio —qué grupos hay en cada kilómetro, cuántos van en cada uno, qué hueco llevan y quién está
-- dando la cara— se GUARDA cuando la etapa se corre, por la misma razón exacta por la que se congela
-- la crónica en `events`: una etapa corrida con el motor de ayer no se puede reconstruir con el de
-- hoy (`checkReplay`). Si se calculara al vuelo, estaría vacía justo para las etapas ya corridas,
-- que son las que el jugador quiere mirar.
--
-- Null en los snapshots anteriores a esta columna: esas etapas no tienen radio y la vista lo dice.
ALTER TABLE "stage_snapshots" ADD COLUMN "radio" jsonb;
