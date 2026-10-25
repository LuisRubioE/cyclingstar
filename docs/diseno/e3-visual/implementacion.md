# E3 · La implementación, PR a PR

Lo que entra en cada PR del plan de `docs/visual.md` (§17.2, en el orden de §17.25), lo que se aparta del diseño y por qué, y lo que el paso siguiente tiene que saber. Cada PR añade su fila a la tabla y su apartado de notas debajo, y su paso a la línea de estado de `docs/visual.md`.

La base de E3 es `912c5fa` (25-10-2026): `main` con el diseño fusionado (#306) sobre `58c14da`, la versión de producción con el motor v91 y E2 encendido. `ENGINE_VERSION` sigue en 91 y no la mueve ningún PR de E3 (§17.1, regla 3). Las citas de línea del diseño se escribieron contra `58c14da`, y entre `58c14da` y `912c5fa` no cambia nada fuera de `docs/`; cada PR las comprueba contra el código de su día, y las que se han movido van en sus notas.

## Decisiones del dueño durante la implementación

1. **El código de E3 se abre el 25 de octubre de 2026** (`docs/diseno/e3-visual/00-encargo.md` §7.8): «Sí, fusiónalo y empieza por el PR 1 y sigue con todo lo demás del E3». Se trabaja en el modo autónomo de `Claude.md`: cada PR con sus tests, el CI en verde y la fusión en cadena, parando solo para lo que pide al dueño (Railway, cuentas externas, verificación visual en producción o una decisión de producto grande).

## La tabla

| Paso · PR      | Qué entró                                                                                                                                                                                                                                                                                                                                                                                                                           | Tests                                                                                                                                                      | Se aparta del diseño                                                                                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 · 1, el clon | La `0050_semilla_del_dibujo` (`teams.jersey_style_seed`, `text`, nula); `updateOwnedTeam` escribe ahí el maillot elegido; `teamDrawSeed`, `coalesce(jersey_style_seed, jersey_seed)`, en todo lo que dibuja; `teamIndexFromSeed` da `null` a una semilla que no es de génesis y `reconcileTeams` ni poda ni renombra esos equipos; y `removeJerseyClones`, un paso del tick tras `seedWorld`, que borra el clon que ya haya (D-00q) | `jerseyClone.test.ts` (nuevo, cuatro casos de §8.9 contra PGlite con el mundo de la génesis entero); `migrations.test.ts` y `schema.test.ts` con la `0050` | el clon se reconoce por la primera alta de corredores de la base y no por `worlds.created_at`; solo se borran sus corredores nacidos después de la génesis; dos lectores más del dibujo |

## PR 1 · El clon

### Lo que entró

- **La `0050_semilla_del_dibujo`**, de `drizzle-kit generate --name semilla_del_dibujo`: una sola sentencia, `ALTER TABLE "teams" ADD COLUMN "jersey_style_seed" text;`, nula y sin defecto, así que no reescribe la tabla. Es la 51.ª entrada del journal (`idx` 50), la siguiente a la `0049_rastro_de_etapa`, como decía §17.1, regla 4.
- **`updateOwnedTeam`** (`packages/db/src/teamControl.ts`) escribe el maillot elegido en `jersey_style_seed` y nunca en `jersey_seed`. La ruta (`PUT /api/teams/me`) y su esquema no cambian: el cuerpo sigue llamando `jerseySeed` a la semilla elegida.
- **`teamDrawSeed`** y **`teamDrawSeedOrNull`** (`packages/db/src/jerseyClone.ts`): `coalesce(jersey_style_seed, jersey_seed)`, servido con el nombre de hoy, `jerseySeed`. Lo leen los seis sitios que dibujan: el reparto (`cast.ts`), `getCastIdentities` (`castIdentities.ts`), la lista y la ficha de equipos (`browse.ts`, `getTeams` y `getTeamDetail`) y las dos listas de inscritos de una carrera (`calendarRun.ts`, `resolveFieldTeams` y la escuadra congelada). Ningún contrato ni la web cambian.
- **`teamIndexFromSeed`** (`packages/db/src/world.ts`) se exporta y da `null` a toda semilla que no case con `:team:(WT|PRS|CON):i:jersey`. `reconcileTeams` deja fuera de la poda y del renombrado a esos equipos y reserva su nombre; `clusterTeamNationalities` los ordena al final de su división.
- **`removeJerseyClones(tx, worldId)`** (`packages/db/src/jerseyClone.ts`), en `runTick` tras `seedWorld`, en su propia transacción. Sin ningún equipo con semilla que no sea de génesis es una sola consulta y no deja nota; si encuentra el clon, `tick_log.notes` dice `jersey clone removed: <nombre> (<id>), 12 riders`.

### Lo que se aparta del diseño, y por qué

1. **El clon se reconoce por la primera alta de corredores, no por `worlds.created_at`.** §8.9 tomaba como clon a un equipo sin dueño «cuyos corredores nacieron todos más de un día después que el mundo (`worlds.created_at`)». Pero `worlds.created_at` es el ancla del reloj, y `reanchorClock` (`packages/db/src/tick.ts` l. 116-128) la mueve tras cada avance manual: con un mundo adelantado a mano, la génesis entera habría «nacido más de un día después que el mundo», todos los equipos serían candidatos y la regla de uno con uno no habría borrado nada. La génesis es la primera alta de corredores de la base, `min(riders.created_at)`: todos los de la génesis entran en una transacción, con el mismo `now()`, y los del clon en otra posterior. El criterio es que la mayoría de los corredores del equipo nacieran después de ese instante (y no todos, porque el mercado de los NPC pudo cambiar alguno de equipo desde que nació el clon).
2. **Del clon solo se borran sus corredores nacidos después de la génesis**, y no todos los que tenga hoy. Uno de la génesis que hubiera fichado por el clon es un corredor legítimo: queda libre, porque la clave `riders.team_id` es `on delete set null`. Las 19 referencias a `riders.id` de `schema.ts` son `on delete cascade`, así que el rastro de los borrados (contratos, diarios, resultados) se va con ellos, como decía el diseño.
3. **También cuentan los equipos sin dueño que abandonaron su semilla de génesis.** El diseño buscaba solo los que tienen dueño; uno que lo perdió después de cambiar el maillot también deja el hueco por el que `seedWorld` crea el clon, y la misma regla lo arregla.
4. **Dos lectores más del dibujo.** §17.3 nombraba los contratos, el reparto y `getCastIdentities`; `browse.ts` (la lista y la ficha, que dan los contratos de equipo) y `calendarRun.ts` (las listas de inscritos de una carrera, que pintan el maillot en `Race.tsx`) también leían `jersey_seed` para dibujar, y pasan a `teamDrawSeed`. Lo que identifica al equipo (`seedWorld`, `reconcileTeams`, `clusterTeamNationalities` y su nombre por idioma) sigue en `jersey_seed`.
5. **La nota de una división sin clon claro** solo sale cuando hay candidatos y no casan uno con uno (`jersey clone: CON, 2 sin semilla de génesis y 1 candidatos, no se borra nada`). Sin candidatos no hay nada que contar, como en los mundos de prueba que montan equipos con semillas propias (`equipacion-1`, `j1`).

### Las cifras (para la descripción del PR)

**La reproducción del mapa 03 §2.2**, con el arreglo (`jerseyClone.test.ts`, PGlite, el mundo de la génesis de la semilla `semilla-clon`): el CON 0 con dueño, la cuarta candidata (`<id>:jersey:3`) y un tick: siguen 219 equipos y 3.900 corredores, la semilla de génesis no se mueve y `getCastIdentities` sirve la elegida; el tick deja `sin días pendientes`, sin nota de clon. **Con el `updateOwnedTeam` de antes, el mismo caso falla** (el equipo pierde su semilla de génesis), comprobado devolviendo `teamControl.ts` a `912c5fa`. **El clon de hoy**: la semilla escrita a mano en `jersey_seed` y `seedWorld` dan 220 equipos y 3.912 corredores, con un NPC del mismo nombre; `removeJerseyClones` lo borra con sus 12 corredores, vuelven 219 y 3.900, el equipo con dueño recupera su semilla de génesis y conserva su dibujo, y ni un segundo paso ni el tick siguiente hacen nada. Los cuatro casos tardan unos 8 s.

### Lo que ve el dueño

Nada en pantalla. Elegir maillot en `/team/identity` deja de crear un equipo, y **tras el primer tick del despliegue el clon de producción ya no está**: el panel de administración lo dice en las notas del tick (`jersey clone removed: …`). Su equipo se sigue viendo con el maillot que eligió.

### El riesgo del despliegue

- **La `0050`** la aplica el arrancador al subir el servicio `web`, con su candado; es un `ADD COLUMN` nulo, instantáneo.
- **El borrado del clon no se deshace**: un revert devuelve el defecto (y la `0050` queda inerte), pero el clon y sus corredores no vuelven (D-00q, DD-17, decidido por el dueño). Lo grabado de las etapas que corrió el clon se queda: una etapa vieja sin línea pinta a esos corredores con el país desconocido (`XX`, `broadcastSource.ts` l. 1298), como a cualquier corredor que ya no está.
- **Si la nota del primer tick no dice `jersey clone removed`**, no se borró nada: o no había clon, o la división no casaba uno con uno (y lo dice). En ese caso el clon se queda como un NPC más, y no nace ninguno nuevo.

### Notas para el paso siguiente

1. **El 2a y el 2b** no dependen de este. El mundo de la prueba del teléfono (§7.2) se monta con `runTick`, que ya corre `removeJerseyClones`: en un mundo recién nacido no hace nada.
2. **`jersey_style_seed` muere en el 19c** con la `0053_sin_semilla_del_dibujo`, junto con `jerseySeed` de los contratos, cuando la traducción del 17b ya haya corrido en producción. Hasta entonces, todo lector nuevo que dibuje un equipo usa `teamDrawSeed`, nunca `teams.jerseySeed`.
3. **`teamIndexFromSeed` puede dar `null`**: quien lo use para ordenar o para un país tiene que decidir qué hace con un equipo sin semilla de génesis, como `reconcileTeams` y `clusterTeamNationalities`.
