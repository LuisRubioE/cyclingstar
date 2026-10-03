# Mapa 04: el esquema de datos, el tiempo del mundo y el estado por jugador

Árbol a 2026-09-26 (HEAD `ce0f4d8`, `ENGINE_VERSION = 89`, `constants.ts` l. 838). Enteros:
`db/src/{schema,tick,news,migrate}.ts`, `engine/src/world/{lifecycle,jersey,points,prizes,news}.ts`,
`shared/src/jerseys.ts`, `apps/api/src/{auth,security,index}.ts`, `apps/api/src/tick/main.ts`,
`railway*.json`, `docs/ops.md` y las migraciones `0000`, `0001`, `0005`, `0010`, `0011`, `0014`,
`0024`, `0026`-`0031`, `0033`, `0039`-`0042`. Por partes: `db/src/{stageRun,calendarRun,results,ranking,economy,classifications,riders,world}.ts`,
`engine/src/sim/{world,raceRadio}.ts`, `engine/src/routes/{schedule,calendar}.ts`, `SPEC.md` §2 y §6.15,
`agenda.md` §3, `encargos.md` E2/E3/E12, `tactica.md` §8.3 y §9.6-9.8, `entrenamiento.md` §8 y §12.
Medidas en el scratchpad (vitest sobre las fuentes, sin tocar el repositorio) y en PGlite 0.5.4
(PostgreSQL 18.3 en WASM, TOAST `pglz`), la base de los tests de integración (`db/src/testDb.ts`).

La pregunta del mapa: **qué guarda la base de una etapa corrida, a qué ritmo aparecen etapas nuevas
para cada jugador, qué sabe la base de cada jugador, y cuánto cuesta añadir lo que falta.**

---

## 0. Dos correcciones de nombre antes de empezar

1. **No existe la tabla `stages` ni `stages.radio`**, aunque así la nombran `00-encargo.md` l. 53,
   `encargos.md` l. 161 y `agenda.md` l. 121 («la crónica guarda sucesos (`stages.radio`, `jsonb`, con
   `plantilla`, `protagonistas` y `datos`)»). La radio es **`stage_snapshots.radio`** (`schema.ts` l. 756) y la crónica **`stage_snapshots.events`** (l. 748), dos columnas de la misma fila; los sucesos
   con `plantilla` y `protagonistas` son `events` (`RaceEvent`, `engine/src/stage/types.ts` l. 330-337).
2. **`stage_day` no es un día de juego: es el NÚMERO de etapa** (1-based) en `stage_results`,
   `stage_snapshots`, `stage_team_results`, `stage_orders` y `race_routes` (`stageRun.ts` l. 92-93;
   `calendarRun.ts` l. 1646 pasa `stageDay: idx`). La clave de carrera es `race_key =
${race.id}:s${season}` (`calendarRun.ts` l. 1589), con la temporada 0-based. Ninguna de esas tablas
   lleva `world_id` ni `game_day` ni `created_at`.

---

## 1. Qué se guarda de una etapa corrida

Todo lo escribe `runOneStage` dentro de la transacción del día (`stageRun.ts` l. 212-1309). Si el
roster está vacío no se escribe nada (l. 259).

| Tabla (`schema.ts`)               | Columnas que guardan la etapa                                                                                                                | Clave e índices                                                                    | Escrito en `stageRun.ts`                            | ¿Lleva día de juego? |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------- |
| `stage_snapshots` (l. 737-759)    | `seed text`, `engine_version int`, `input jsonb NOT NULL`, `events jsonb` (0024), `radio jsonb` (0029)                                       | PK `(race_id, stage_day)`; sin más índices                                         | l. 570-595, `onConflictDoNothing`                   | No                   |
| `stage_results` (l. 660-675)      | `puesto`, `tiempo_s`, `bonificacion_s`, `puntos_volante`, `puntos_montana` (enteros)                                                         | PK `(race_id, stage_day, rider_id)`; FK rider cascade                              | l. 856-858; solo clasificados (l. 610-617)          | No                   |
| `race_gc` (l. 685-701)            | `tiempo_total_s`, `puntos_volante`, `puntos_montana`, `suma_puestos`, `ultimo_puesto`: ESTADO ACTUAL acumulado                               | PK `(race_id, rider_id)`                                                           | l. 862-876, upsert con `excluded.*`                 | No, y se sobrescribe |
| `stage_team_results` (l. 716-734) | `scored`, `tiempo_s`, `suma_puestos`, `mejor_puesto` por equipo y etapa                                                                      | PK `(race_id, stage_day, team_id)`                                                 | l. 903-926                                          | No                   |
| `race_rosters` (l. 587-610)       | `bib`, `abandoned_day` (día de juego), `abandoned_reason` (text: `colapso`, `fuera_control`, `lesion`, `enfermedad`, `voluntario`)           | PK `(race_id, rider_id)`                                                           | `markAbandons` l. 1063-1067                         | Sí, el abandono      |
| `rider_daily_log` (l. 996-1019)   | `tss`, `ctl`, `atl`, `tsb`, `activity`, `parte jsonb` (`StageEffort`, 0030)                                                                  | PK `(rider_id, game_day)`                                                          | l. 927-929                                          | Sí                   |
| `rider_attr_log` (l. 389-407)     | `delta` con `source` `carrera` o `sobrecompensacion`                                                                                         | PK `(rider_id, game_day, attr, source)`; se purga a 60 días (`tick.ts` l. 171-178) | l. 930-932                                          | Sí                   |
| `rider_points` (l. 1032-1049)     | `points`, `race_id` (la `race_key` con temporada), `kind` (`stage`, `gc`, `legado`)                                                          | índices `(rider_id, game_day)` y `(game_day)`                                      | vía `addSeasonPointsBatch` (`ranking.ts` l. 71-110) | Sí                   |
| `palmares` (l. 764-787)           | `season`, `race_id` (id SIN temporada), `race_name`, `kind` enum `gc/stage/kom/points`, `detail` («Stage N»), `game_day`                     | índices `(rider_id)` y `(world_id, race_id)`                                       | l. 1279-1290 (`stage`), 1297-1306 (`gc`)            | Sí                   |
| `news` (l. 792-811)               | `kind text`, `text text` ya redactado                                                                                                        | índices `(world_id, game_day)` y `(rider_id)`                                      | l. 1069, 1131, 1210, 1223, 1247                     | Sí                   |
| `transactions` (l. 824-839)       | `kind` `premio`, `amount`, `note` «`${raceName} · stage win`» / «`· GC #N`» (`economy.ts` l. 165-181)                                        | índice `(rider_id, game_day)`                                                      | `awardRacePrizes` (`economy.ts` l. 135)             | Sí                   |
| `riders`, `teams`                 | `season_points` (l. 307, contador), `money`, `ctl/atl`, `strain_days/ill_days`, `health/health_until_day`; `teams.budget` (premio de equipo) | `riders_world_points_idx` (l. 339)                                                 | l. 877-898, 990, 1122                               | No: estado actual    |
| `race_routes` (l. 551-585)        | `profile jsonb`, `kind`, `label`, `time_trial`, `arch jsonb`: el recorrido congelado el día de la etapa 1                                    | PK `(world_id, race_key, stage_day)`                                               | `freezeRaceRoute`, `calendarRun.ts` l. 1634         | No                   |

**Tiempos**: enteros en segundos en todas las tablas (convención de `schema.ts` l. 32-33). Los
sucesos (`events`) llevan `km` y `tS` (segundos de carrera) por suceso. **Maillots**: no hay columna
(ver §4). **Forma**: la de antes de la salida está congelada por corredor en
`stage_snapshots.input.riders[]` (`eff0` por atributo, `energy`, `matches`, `tsb`, `orders`,
`teamId`, `bib`, `gcRank`, `standings`; `types.ts` l. 168-276); la de después, en `rider_daily_log`.

### 1.1 `stage_snapshots.radio`: tipo, forma y tamaño medido

**Tipo exacto**: `jsonb`, nullable, sin `$type` en el esquema (`schema.ts` l. 756; SQL en
`0029_radio_de_carrera.sql` l. 10). Contenido: `StoredRaceRadio = { starters, riders: string[], kms:
StoredRadioKm[] }` (`raceRadio.ts` l. 583-588); cada km lleva `{ km, groups, racing, gone }` (l.
575-580) y cada grupo `{ kind, size, gapS, speedKmh, mishap?, pulling[], pullingTotal?, motivos[],
paraQuien[], watching[] }` por índice sobre `riders` (l. 497-572), con tope de 12 en `pulling` (l.
591). Un punto por km (`radioKmPoints(totalKm, 1)`, l. 230). Tres cosas que la radio guardada **no**
tiene: (a) **el reloj**: el grupo en memoria tiene `tS` y `riderTs`, pero lo guardado solo conserva
`gapS` redondeado y `speedKmh` (l. 945-963), así que la hora de carrera por km no se puede leer, solo
integrar desde velocidades que pueden ser `null`; (b) **quién lleva cada maillot**: la lista
`priority` solo ordena el corte (l. 787, 924) y no se guarda; (c) **dónde va cada corredor no
nombrado**: un grupo de hasta 12 se nombra entero (l. 611), así que una fuga de cinco está completa;
en los mayores solo los que tiran y la lista de seguimiento (maillots, 10 primeros de la general de
salida y de la etapa, `stageRun.ts` l. 560-568). Opcionales por versión: `pullingTotal` (v34),
`motivos` (v47), `paraQuien` (v57), `mishap` (v70.1).

**Medido** (35 etapas del calendario de la temporada 0, campo del banco `buildField` de 176/140/126
corredores y 40 en los nacionales, ids sustituidos por uuid; `JSON` = `JSON.stringify`, `jsonb` =
`pg_column_size` tras TOAST):

| Tipo de etapa (n)  | Radio JSON, mediana (máx.) | Radio en `jsonb`, mediana (rango) | `events` `jsonb` | `input` `jsonb` |
| ------------------ | -------------------------: | --------------------------------: | ---------------: | --------------: |
| crono (2)          |              48 KB (48 KB) |                   12 KB (3-12 KB) |             3 KB |           33 KB |
| llana (8)          |            134 KB (170 KB) |                   16 KB (9-24 KB) |             7 KB |           35 KB |
| media (14)         |            184 KB (303 KB) |                  27 KB (19-41 KB) |             8 KB |           28 KB |
| reina (9)          |            392 KB (616 KB) |                 90 KB (44-156 KB) |            13 KB |           34 KB |
| nacional ruta, 40  |                     209 KB |                             26 KB |             5 KB |            9 KB |
| nacional crono, 40 |                      26 KB |                              6 KB |             3 KB |            8 KB |

Media de las etapas con campo de equipo: **41 KB en disco, 226 KB en JSON** (relación 5,6). La Race
France entera (21 etapas): 909 KB de radio en disco, 4,9 MB en JSON. **El comentario del esquema
«~22 KB por etapa» (l. 754) solo casa con la mediana en disco de una vuelta pequeña**; la de
`raceRadio.ts` l. 485-489 («~55 KB») tampoco casa con el JSON medido. Quien sirva la radio entera a
la web manda, en texto, de 50 a 600 KB por etapa.

### 1.2 `news`: columnas exactas y lo que se tira al escribir

Confirmado: `id uuid`, `world_id uuid` (FK sin cascada), `game_day int`, `scope news_scope`
(`global`/`personal`, defecto `global`), `rider_id uuid` nullable (FK cascade), **`kind text`**,
**`text text`**, `created_at timestamptz` (`schema.ts` l. 792-811; `0010_dapper_living_tribunal.sql`
l. 1-16). **No hay `seed`, ni `data`, ni `race_key`, ni `stage_day`, ni `team_id`.** `emitNews`
recibe `seed` y `data` (`db/src/news.ts` l. 28-39), llama a `renderNews` (l. 40) e inserta solo el
texto (l. 41-48). Tres hechos que importan a E2 y a E10:

1. **`NewsData` no son ingredientes traducibles**: `rider`, `team` y `race` son NOMBRES y `detail` es
   inglés libre (`engine/src/world/news.ts` l. 21-27): «climbs off, out of energy» (`stageRun.ts` l.
   1020-1026), «3 weeks» (l. 1127-1130), «, relocating to Spain…» (`contracts.ts` l. 326-328), «at 38»
   (`rollover.ts` l. 331). Guardar `data` tal cual guardaría inglés y nombres congelados.
2. **Una noticia de etapa no sabe de qué etapa es**: solo `game_day`, `kind` y protagonista. La
   semilla sí lo sabía (`win:${raceKey}:${gameDay}:${stageDay}`, l. 1195 y 1214) y se tira. Sin
   `race_key` y `stage_day` en la fila no se puede esconder la noticia de una etapa concreta.
3. **Orden dentro del día**: todas las noticias de un día de juego se escriben en la misma
   transacción, y `now()` en Postgres es la hora de inicio de la transacción, así que comparten
   `created_at`; el feed ordena por `(game_day desc, created_at desc)` (`news.ts` l. 87) y dentro del
   día el orden no es estable. Once `kind` (`world/news.ts` l. 8-19), en ocho sitios: cinco en `stageRun.ts`,
   `riderSchedule.ts` l. 299 (retirada voluntaria, desde la API y fuera del tick), `contracts.ts` l.
   332, `rollover.ts` l. 326 (seis retiradas notables como mucho, l. 319-324).

### 1.3 ¿Se puede pintar el mundo «tal como estaba» al final de un día D? (el destripe fuera de la etapa)

| Dato que enseña la web                  | Fuente                                                             | Lectura «hasta D» hoy                                                                                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| General, puntos, montaña de una carrera | `stage_results` sumado                                             | **Sí, ya existe**: `getGcThroughStage`, `getPointsClassification`, `getKomClassification` con `throughStage` (`results.ts` l. 236, 320, 379) y `getTeamClassifications(…, throughStage)` |
| General «actual» de la ficha            | `race_gc` (`getRaceGc`, `results.ts` l. 23)                        | No: solo estado actual                                                                                                                                                                   |
| Maillots en carretera                   | derivado                                                           | Sí: `leadersThroughStage(db, raceKey, day)` (`routes/races.ts` l. 108-121)                                                                                                               |
| Ranking a 364 días                      | `rider_points.game_day`                                            | Casi: `getRanking` filtra `game_day > desde` sin tope superior (`ranking.ts` l. 187); falta un `<= D`                                                                                    |
| Premios del año, joven, escuadras       | `riders.season_points`                                             | No: contador sin fecha (`ranking.ts` l. 235, 246)                                                                                                                                        |
| Palmarés, noticias, dinero, parte       | `palmares`, `news`, `transactions`, `rider_daily_log` (`game_day`) | Sí, filtrando por `game_day`                                                                                                                                                             |
| Salud, moral, forma actual, abandono    | `riders.*`, `race_rosters.abandoned_day`                           | Parcial: `abandoned_day` sí; salud y moral solo actuales                                                                                                                                 |

`stage_results`, `stage_snapshots` y `stage_team_results` no tienen día: el día de juego de una etapa
se deduce del calendario (`stageDayOfSeason`, `engine/src/routes/schedule.ts` l. 12-18) más `season ·
364`, contando descansos.

---

## 2. El reloj del mundo

| Hecho                         | Valor                                                                                                                                     | Cita                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Día de juego                  | `TICK_INTERVAL_MINUTES`, defecto **360 min = 6 h reales**; 4 días de juego por día real                                                   | `apps/api/src/env.ts` l. 32 y 67; `SPEC.md` l. 53; `tick.ts` l. 24-26                     |
| Temporada                     | 364 días de juego = **91 días reales**; 4 temporadas por año real                                                                         | `shared/src/time.ts` l. 8; `tick.ts` l. 42; `SPEC.md` l. 54                               |
| Qué día toca                  | `floor(transcurrido desde worlds.created_at / 6 h)`                                                                                       | `tick.ts` l. 75-79                                                                        |
| Quién lo avanza, camino 1     | el servicio web sondea cada **5 min** (`min(5 min, max(1 min, 6 h/4))`) y se pone al día                                                  | `apps/api/src/index.ts` l. 56-85, l. 61; `railway.json` l. 11 (`sleepApplication: false`) |
| Quién lo avanza, camino 2     | cron `0 */6 * * *` (00, 06, 12, 18 UTC) que primero migra                                                                                 | `railway.tick.json` l. 8-9; `README.md` l. 236-248 («redundante y confuso»)               |
| A qué hora real cambia el día | **anclada a `worlds.created_at` + k·6 h** (± 5 min), NO a las horas del cron; `/health` la anuncia así                                    | `routes/health.ts` l. 24-26; el cron solo encuentra trabajo si el web no lo hizo          |
| Reanclaje                     | un avance forzado mueve `created_at`, y con él las horas                                                                                  | `tick.ts` l. 95-107 y 294-307                                                             |
| Avance forzado                | `POST /admin/advance?days=N`, 1 a 30 días por llamada                                                                                     | `routes/admin.ts` l. 119-123                                                              |
| Puesta al día                 | hasta 40 días por ejecución: tras una caída o un avance forzado, varias etapas de la MISMA vuelta llegan juntas (una transacción por día) | `tick.ts` l. 50, 233-235                                                                  |
| Atomicidad                    | **una transacción por día de juego** con TODAS las etapas de ese día; se hacen visibles de golpe al confirmar                             | `tick.ts` l. 256-284                                                                      |
| «Hoy» ya está corrido         | el día `d` corre sus etapas y luego pone `current_day = d`: cuando la web dice «día d», la etapa de hoy ya tiene resultado                | `tick.ts` l. 257-283                                                                      |

**Cuántas etapas corre un tick.** Todas las de todas las carreras de ese día (`calendarRun.ts` l.
1565-1586), **una por carrera**: la semietapa existe en código (`schedule.ts` l. 39-49) pero **ninguna
carrera declara `doubleAfter`** (`calendar.ts` l. 115-118; medido: 0 de 842). Descansos medidos: Italia
tras 3, 9 y 15; Francia y España tras 9 y 15; Portugal tras 6. Etapas por día de juego en el mundo
(medido): **p50 2, p90 6, máximo 187** (domingo de los nacionales; sin ellos, 11); 92 de 364 días sin
etapas; de la primera (día 8) a la última (307), no «15 a 290» (`SPEC.md` l. 55). La `test-tour`
corre además los días 1-5 de la temporada 0 (`db/src/race.ts` l. 8-11).

**Cuántas etapas nuevas encuentra el jugador** (medido sobre ventanas deslizantes del calendario; el
propio corredor, estimado con 45 días de carrera al año para un humano que empieza y 65 para un
profesional, `sim/world.ts` l. 1000 y l. 200):

| Visita              | Días de juego | Etapas del mundo, p50 (p90; máx.) | Sin nacionales, p50 (p90; máx.) | Etapas de SU corredor                                     |
| ------------------- | ------------: | --------------------------------: | ------------------------------: | --------------------------------------------------------- |
| Cada 6 horas        |             1 |                        2 (6; 187) |                       2 (6; 11) | 0 o 1                                                     |
| Una vez al día      |             4 |                      11 (22; 411) |                      9 (19; 39) | media 0,5-0,7; **4 seguidas si está en una vuelta**       |
| Una vez a la semana |            28 |                     94 (142; 530) |                   73 (121; 138) | media 3,5-5; **una gran vuelta ENTERA cabe en la semana** |

Una gran vuelta dura 23-24 días de juego (Italia días 128-151, Francia 185-207, España 234-256;
medido) = **6 días reales**; una vuelta de una semana tiene mediana de 5 etapas (1 a 11) = 1,25 días
reales. Quien entra una vez al día encuentra cuatro etapas nuevas de su vuelta; quien entra los
domingos encuentra la vuelta acabada, con general, maillots, noticias y palmarés escritos.

**Dos cuentas del reloj**: `seasonPosition` de la web es 1-based (`time.ts` l. 61-70) y el backend
0-based (`calendarRun.ts` l. 1531-1532, `race_key` `:s0`); `nextTickAt` se alinea al epoch (l. 73-76) y
`/health` a `created_at`, que es el que usa `WorldClock.tsx` cuando llega (l. 22).

---

## 3. Qué se sabe de cada jugador

| Tabla (`schema.ts`)            | Campos                                                                                                                                                                      | Notas                                                                                                                                                                                                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users` (l. 73-89)             | `id`, `name`, `email citext unique`, `email_verified`, `image`, `password_hash` (sin uso), `locale` (`'es'` por defecto), `is_admin`, `premium`, `created_at`, `updated_at` | `locale` miente: la interfaz es inglés (`agenda.md` l. 135-136). **No hay zona horaria, ni país, ni `last_seen`, ni preferencias de aviso**                                                                                                                   |
| `sessions` (l. 92-103)         | `token unique`, `expires_at`, `ip_address`, `user_agent`, `user_id` (cascade), `created_at`, `updated_at`                                                                   | better-auth 1.6.25 sin `session` configurada (`auth.ts` l. 102-223): caduca a **7 días** y renueva `updated_at` como mucho **una vez al día** (`dist/context/create-context.mjs` l. 146-147). Es el único rastro de «última visita», con resolución de un día |
| `accounts`, `verifications`    | credenciales y enlaces de correo                                                                                                                                            | sin datos de juego                                                                                                                                                                                                                                            |
| `riders.user_id` (l. 277)      | el corredor del jugador                                                                                                                                                     | uno VIVO por usuario por lógica, no por restricción (`riders.ts` l. 163-190); al retirarse (39 años, `lifecycle.ts` l. 12) crea otro                                                                                                                          |
| `teams.owner_user_id` (l. 227) | el equipo del mánager premium                                                                                                                                               | null = NPC                                                                                                                                                                                                                                                    |

**«Visto», «leído», «cursor»: nada, en ninguna tabla.** Búsqueda de `seen`, `last_seen`, `cursor`,
`unread`, `visto`, `leído` en `packages/{db,shared}/src` y `apps/{api,web}/src`: cero columnas y cero
`localStorage` con ese fin. `encargos.md` l. 729-731 pide «registrar la última visita (`last_seen`).
Hoy no existe» y E7 lo necesita para su regla «un mes real sin entrar ni una vez y el corredor pasa a
bot» (l. 395-398). Correos: solo los transaccionales (`emails.ts` l. 64, 90, 116), ninguno de carrera.

**Coste de una tabla «visto por jugador y etapa»** (estimado; fila de `(user_id uuid, race_key text
~15 B, stage_day int, seen_at timestamptz)`: 76 B de montón más ~75 B de índice de clave ≈ **150 B por
fila**). Filas por jugador: su corredor corre 45-65 etapas por temporada; si además mira otras 20-60,
son 65-125 por temporada, **260-500 por año real** (4 temporadas).

| Forma                                                  | Filas por año real, N = 1.000 |            N = 10.000 | Escritura por visita                  | Qué no puede decir                                |
| ------------------------------------------------------ | ----------------------------: | --------------------: | ------------------------------------- | ------------------------------------------------- |
| A. Una fila por (jugador, carrera, etapa)              |         0,26-0,5 M (40-75 MB) | 2,6-5 M (0,4-0,75 GB) | 1 upsert por etapa vista              | nada                                              |
| B. Una fila por (jugador, carrera) con «vista hasta k» |                     40-80 mil |             0,4-0,8 M | 1 update por etapa vista (misma fila) | haber visto la 5 sin la 3                         |
| C. Una marca por jugador, «visto hasta el día D»       |                             N |                     N | 1 update por visita                   | carreras vistas a medias; lo que pasa en paralelo |

Escala de comparación: `rider_daily_log` ya escribe ~1,4 M filas por temporada (3.900 corredores × 364
días, estimado) y nadie las purga; una etapa de gran vuelta escribe ~176 filas en cada una de
`stage_results`, `race_gc` y `rider_daily_log`. La escritura de A es despreciable al lado del tick.

---

## 4. Los maillots en datos

**Los tres de clasificación no se guardan: se calculan.** `shared/src/jerseys.ts` lo dice (l. 9-11):
«quién lleva cada maillot es una CONSULTA sobre las clasificaciones que ya existen». `JerseyKind =
'gc' | 'points' | 'kom'` (l. 19), prioridad amarillo > verde > azul con «pasa al siguiente» y sin
abandonados (`assignLeaderJerseys`, l. 80-98); el equipo líder lleva dorsal amarillo y va aparte
(`leadingTeam`, l. 116-118). El de carretera en la etapa N sale de las clasificaciones hasta N−1
(`routes/races.ts` l. 100-121, 469-472). El tick los calcula para la lista de seguimiento de la radio
(`stageRun.ts` l. 551-557) y **no los persiste**.

**Campeón nacional o del mundo: no existe en datos.** No hay `champion` en ninguna tabla ni tipo.
Lo que sí hay: 532 campeonatos nacionales por temporada, 4 por país × 133 países (`nc-<cc>-itt`,
`nc-<cc>-u23-itt`, `nc-<cc>-u23-road`, `nc-<cc>-road`, `calendar.ts` l. 3655-3660), la ruta élite
el día `doy(6, 28)` salvo excepciones por país (l. 204-234), campo de 5 a 40 corredores del país
(`calendarRun.ts` l. 216-217, 257). Su ganador queda en `palmares` con `kind = 'gc'`, `race_id =
'nc-es-road'` y `season` (`stageRun.ts` l. 1291-1307, las carreras de un día registran solo `gc`) y en
`race_gc` de `nc-es-road:sS`, así que **«campeón vigente de España en ruta» es derivable** con el
índice `palmares_race_idx (world_id, race_id)`. Precedente de la misma consulta: el dorsal 1 del
campeón defensor (`calendarRun.ts` l. 991-1007). **No hay Campeonato del Mundo** en el calendario
(`encargos.md` l. 625-628). Nacionalidad: `riders.country char(2) NOT NULL` (l. 280), `teams.country`
nullable (l. 230), `COUNTRIES` con 133 códigos (`shared/src/countries.ts`).

**El maillot del equipo es una semilla, no unos colores.** `teams.jersey_seed text NOT NULL` (l. 234).
Lo pinta la WEB con `jerseyStyle(seed)`: 14 colores, 5 patrones, acento blanco
(`apps/web/src/components/visuals.ts` l. 34-49, 54-55, 65-73; `Jersey.tsx` l. 15-54). El
`renderJerseySvg` del motor (`engine/src/world/jersey.ts` l. 8-56: otra paleta de 10 y otros 4
patrones) **no lo usa producción**: solo su test y la exportación (`engine/src/index.ts` l. 148). El
servidor no conoce los colores; el mánager cambia la semilla (`routes/teams.ts` l. 22). El
`TeamIdentity` de `db/src/teamClassification.ts` (l. 118-121) es solo `{ teamName, country }`. Para
una etapa pasada, el equipo con el que corrió cada uno está en `stage_snapshots.input.riders[].teamId`;
`riders.team_id` es el de hoy.

---

## 5. Volúmenes

**Medido en `calendarForSeason(0)` y `(1)`** (iguales): **842 carreras y 1.418 etapas por
temporada**.

| Clase | Carreras | Etapas | Tope de campo (`calendarRun.ts` l. 107-113) |
| ----- | -------: | -----: | ------------------------------------------: |
| WT    |       36 |    161 |                                         176 |
| Pro   |       61 |    174 |                                         150 |
| .1    |      101 |    230 |                                         130 |
| .2    |      112 |    321 |                                         112 |
| NC    |      532 |    532 |                                          40 |

Por formato: 710 de un día, 129 de una semana (645 etapas), 3 grandes vueltas (63). Por tipo, sin
nacionales: 233 llanas, 373 medias, 140 reinas, 77 cronos, 63 clásicas; nacionales: 266 cronos, 266
en línea. Mundo: **219 equipos** (18 WT, 16 PRS, 185 CON; contados en `TEAM_DIST`, `db/src/world.ts`
l. 46-132; el comentario de l. 40 dice 18 ProTeams y son 16), plantillas 28/20/12 (l. 145), **3.900
corredores** objetivo, 3.044 con contrato (l. 152-153).

**Estimado por temporada** (etapas por tipo × medianas de §1.1; campos del banco algo mayores que los
de producción en .2 y menores en Pro): radio **~40 MB en disco** (35-45) y **~240 MB en JSON**;
`input` ~32 MB; `events` ~10 MB; `stage_snapshots` entero ~85 MB por temporada, **~340 MB por año
real**. `stage_results`: ≤ 141.500 filas por temporada (etapas × tope de campo). `news`: ~1.418
victorias + ~260 generales y montaña + abandonos y lesiones, del orden de 2.000-3.000 filas por
temporada (no medido). **Ninguna de estas tablas se purga**: el único `DELETE` periódico es
`rider_attr_log` (búsqueda de `.delete(` en `packages/db/src`).

---

## 6. Reglas del repositorio para migraciones

1. **Solo `drizzle-kit generate`** (`Claude.md` l. 14; `README.md` l. 224-225; `packages/db` script
   `db:generate`), que diffea `schema.ts` contra el último snapshot de `drizzle/meta/`.
2. **Se aplican al arrancar** con `pg_advisory_lock(LOCK_CLASS.migration = 1, 1)` (`migrate.ts` l.
   21-36; `locks.ts` l. 15-19; `Claude.md` l. 22); el tick migra antes (`railway.tick.json` l. 8); CI
   las aplica sobre base vacía dos veces para probar idempotencia (`ci.yml` l. 233-261), igual que
   `migrations.test.ts` en PGlite; el arranque tiene 300 s de margen (`README.md` l. 255-256).
3. **Los snapshots 0030-0032 no existen** (`ls drizzle/meta`); la 0033 se corrigió a mano por eso (l.
   6-14) y desde ella la generación vuelve a ser fiable. La siguiente libre es la **0043**
   (`_journal.json`, 43 entradas).
4. **Los enums solo se amplían** (`schema.ts` l. 178-181; `0034`, `0035`). `news.kind` es `text`, no
   enum: un `kind` nuevo no pide migración.
5. **Añadir a `news`**: `ADD COLUMN` nullable (o con defecto constante) es solo de catálogo en Postgres
   ≥ 11 y la tabla es pequeña. **No hay relleno posible** de `seed` y `data` viejos (se tiraron): o
   columnas nullable con el `text` viejo de respaldo, o borrar el histórico en el reinicio.
   `columnasVivas.test.ts` (l. 6-25) exige que toda columna numérica con defecto se escriba en algún sitio.
6. **Crear una tabla nueva**: sin coste; convención de la casa, claves por `race_key` text sin
   `world_id` (como `stage_results`) y FK a `users` con `on delete cascade` (como `sessions`).
   `tactica.md` §8.3 manda que un paso no se revierte con la migración sino con un flag (l. 6948-6950,
   7110-7112), pero **no hay ningún `FEATURE_*` en el código** (búsqueda en `packages` y `apps`).

---

## 7. Lo que `tactica.md` y `entrenamiento.md` hacen o prometen en el esquema

| Qué                                                                                  | Documento                                                        | Estado en `schema.ts` hoy                                                                                       |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `stage_orders` + `trigger_on`, `chase_policy`, `refuse_relay_teams`, `day_goal`      | `tactica.md` §9.6 (l. 7581), paso 17a                            | **Hecho** (`0040`; l. 643-654)                                                                                  |
| `race_routes` (planeada con `season`, `generatorVersion`)                            | `tactica.md` l. 7582                                             | **Hecha distinta** (`0039`, `0041`): clave `(world_id, race_key, stage_day)`, sin `generatorVersion`            |
| `race_classifications`                                                               | `tactica.md` l. 7586, paso 4                                     | **No se crea, por decisión**: `classifications.ts` l. 19-23 («segunda fuente de verdad»)                        |
| `team_race_structure`                                                                | `tactica.md` l. 7583, paso 8                                     | No existe                                                                                                       |
| `stage_snapshots` «no gana columnas»                                                 | `tactica.md` l. 7589-7591                                        | Cierto; `StageOutput` tampoco gana campos (l. 7597)                                                             |
| `rider_race_prefs` + `priority`, `skip`, `as_training`, `raceObjective` en la `0038` | `entrenamiento.md` l. 1267-1270, 1875; `tactica.md` l. 7576-7581 | **No existe**: la `0038` creó `training_plans` y `rider_race_prefs` sigue en `(rider_id, race_id)` (l. 909-923) |
| `strain_days`, `ill_days`, `staff_level`, `attr_log.source`, `muros`, 8 arquetipos   | `entrenamiento.md`                                               | Hechos (`0033`-`0038`)                                                                                          |

Ninguno toca `news`, `users`, `sessions` ni la radio. Choques posibles para E2: (a) si añade columnas
a `stage_snapshots`, contradice la frase de `tactica.md` l. 7589 y debe decirlo; (b) la numeración:
E2 empieza en `0043` y cualquier paso pendiente de los otros dos documentos que llegue antes la
empuja; (c) `rider_race_prefs` tiene dos migraciones prometidas y ninguna hecha.

---

## 8. El reinicio del mundo antes del lanzamiento

Está decidido y escrito: «**El mundo de producción se reinicia antes del lanzamiento**» (`docs/ops.md`
l. 179-182); «Uno y para siempre, con un **reset** al pasar de pruebas a juego de verdad: se reinicia
desde la temporada 1» (`agenda.md` l. 35); «los datos se van a tirar» (l. 110-114). Y con plazo para
E2: «**antes del reset**, añadir `seed` y `data` a `news` y mover el renderizado al momento de leer.
Después del reset, cada noticia escrita sí es definitiva» (l. 131-133; Oleada 0, l. 1411-1417); «el
reset es el último momento barato para todo cambio de esquema con historia detrás» (l. 184-186).

**Lo que NO hace falta**: rellenar `seed`/`data` viejos; leer snapshots con `radio` null (antes de
la `0029`) o `events` null (antes de la `0024`); los campos opcionales de radios viejas
(`pullingTotal`, `motivos`, `paraQuien`, `mishap`); las filas `legado` de `rider_points` (`0031` l.
29-38); la transición E1, temporal por su propio texto (`ops.md` l. 212-214). **Lo que SÍ hace
falta**: que E2 funcione con el mundo de pruebas entre su despliegue y el reinicio (columnas nullable o
lectura tolerante), porque las migraciones son de una sola dirección y ese mundo sigue vivo.

---

## Lo que no he podido comprobar

1. **Tamaños en producción**: sin acceso a la base. Los de §1.1 son etapas del calendario con campos
   del banco en PGlite con `pglz`; con `lz4` o campos reales cambian. `pg_column_size` lo zanjaría.
2. **La hora real del cambio de día en producción** (depende de `worlds.created_at` y de los
   reanclajes), si el cron sigue activo (y que Railway lo lea en UTC) y cuánto tarda un día.
3. **Cuántos jugadores hay** y cuántas etapas miran: las cifras de §3 son supuestos.
4. **Cuántos de los 532 nacionales corren**: el país de menor peso espera ~20 corredores (mínimo 5),
   pero no he medido la nacionalidad real tras el reagrupamiento de plantillas.
5. **Si las cuentas (`users`, `sessions`) sobreviven al reinicio**: ningún documento lo dice.
6. **Que las noticias de un día compartan `created_at`**: es la semántica de `now()`; no lo he visto
   en una base con datos.
