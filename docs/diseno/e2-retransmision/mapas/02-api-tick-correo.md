# Mapa 02: la API, el tick y los correos (cómo se corre una etapa, qué se persiste, qué se expone y qué se envía)

Ficheros leídos enteros: `apps/api/src/chronicle.ts` (1.400 l.), `chronicle.test.ts` (1.013), `raceRadio.test.ts` (183), `stageHistory.ts` (147), `stageRoute.ts` (194), `emails.ts` (135), `mailer.ts` (152), `auth.ts` (226), `app.ts` (221), `index.ts` (91), `env.ts` (89), `tick/main.ts` (23, es todo `tick/`), `routes/{races,calendar,rankings,teams,riders,context,params,health,world}.ts` y de `routes/admin.ts` las rutas de tick y de snapshot (`geo.ts` y `authProxy.ts` solo por su lista de rutas: no tocan etapas); `packages/db/src/{tick,stageRun,news,raceReport,race}.ts` enteros, `calendarRun.ts` l. 1-182, 214-276 y 1420-1665, `results.ts` l. 18-100 y 225-470, `economy.ts` l. 130-190, `ranking.ts` l. 60-222, 361-380, 449-470 y 560-605, `browse.ts` por grep, `schema.ts` l. 40-175 y 540-820; `packages/engine/src/world/news.ts` y `news.test.ts`; `packages/shared/src/` entero (`contracts.ts` 1.649 l. leído entero; `jerseys`, `time`, `raceKey`, `index` enteros; `countries`, `regions`, `rider`, `training`, `travel`, `rng` revisados: no contienen nada de etapas ni resultados); `railway.json`, `railway.tick.json`; `docs/tactica.md` R23 (l. 4836-4900), §6.6 (l. 6383-6390), fila 17 del plan (l. 6979) y §9.6 (l. 7574-7635). Mediciones propias en el scratchpad con vitest sobre las fuentes (sin tocar el repositorio): §1.3 y §7.

La pregunta del mapa: ¿qué pasa entre que el reloj decide correr una etapa y que un jugador la ve, y por dónde se escapa el resultado? La respuesta corta: **todo el día de juego se confirma de golpe en una transacción, y desde ese instante una ruta pública entrega en una sola respuesta el resultado, las clasificaciones de después, la crónica y la radio**, mientras otra docena de rutas lo filtran por los lados. Ninguna tabla ni ruta sabe qué ha visto nadie.

---

## 0. Resumen

- **No existe la tabla `stages`.** La radio vive en `stage_snapshots.radio` (`schema.ts` l. 756, migración `0029_radio_de_carrera.sql`), junto a `events` (la crónica, l. 748), `input`, `seed` y `engine_version`. Ni `stage_snapshots` ni `stage_results` guardan día de juego ni marca de tiempo (l. 660-762).
- **Una transacción por día de juego, sin trocear** (`packages/db/src/tick.ts` l. 259-284): todas las etapas de todas las carreras de ese día, sus generales, noticias, premios, puntos y palmarés, y `game_state.current_day = N`, se hacen visibles en el mismo commit.
- **Cadencia**: un día de juego son 360 min reales (`env.ts` l. 32); lo avanza el propio servicio web cada 5 min (`index.ts` l. 61-84) y, de respaldo, un cron cada 6 h (`railway.tick.json` l. 9). La hora real depende de `worlds.created_at`, que se re-ancla tras avances forzados (`tick.ts` l. 95-107).
- **Medido**: el calendario programa 1.418 etapas por temporada, 3,90 por día de media, 92 días sin etapa y picos de 35 a 187 en los días de campeonatos nacionales (§1.3).
- **La crónica se guarda como datos** (`plantilla`, `datos`, ids, `km`, `tS`) y se redacta en la web; **las noticias se guardan redactadas** (`kind` + `text` en inglés), con la semilla y los datos tirados en `emitNews` (`packages/db/src/news.ts` l. 40-48). La web adivina de qué carrera habla un titular buscando su nombre en el texto (`apps/web/src/domain/newsFeed.ts` l. 17-24).
- **`GET /api/races/:raceId/stages/:day` es pública y lo entrega todo junto** (`routes/races.ts` l. 387-539). Medido: **0,95 a 2,16 MB de JSON por etapa, el 91-96 % de radio**, y la API no comprime (§7).
- **La portada revela la última etapa** del corredor propio (puesto, ganador, «la fuga llegó») por `GET /api/riders/me/last-race`, que además **re-simula la etapa en cada petición** (`packages/db/src/raceReport.ts` l. 148): medido en vitest, 2,4 a 5,9 s de CPU por etapa (§7).
- **Correos**: tres, los tres de cuenta; ninguno habla de carreras y el proceso del tick no tiene con qué mandar correo (§5).
- **Sesión**: se sabe el id de usuario y de ahí el corredor y el equipo; **no hay último acceso por usuario, ni estado «visto», ni `localStorage`** en la web (§6).
- **Táctica**: el paso 17d se dio por cerrado, pero `raceReport.ts` sigue re-simulando y `raceReportOrdersSchema` devuelve 4 palancas de las 11 que promete `docs/tactica.md` §9.6: ese contrato va a cambiar (§8).

---

## 1. El ciclo de vida de una etapa

### 1.1 Quién dispara el tick y cuándo

| Disparador                            | Cuándo                                                                                             | Qué corre                                                     | Cita                                                          |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| Servicio `web` (auto-tick en proceso) | cada `min(5 min, max(1 min, msPorDía/4))` = 5 min con 360; y al arrancar                           | `runTick` sin `forceDays`                                     | `index.ts` l. 56-84; `railway.json` l. 8                      |
| Servicio `tick` (cron de Railway)     | `0 */6 * * *` UTC                                                                                  | `node scripts/migrate.mjs && node apps/api/dist/tick/main.js` | `railway.tick.json` l. 8-9; `tick/main.ts` l. 9-18            |
| Admin                                 | a mano: `POST /admin/tick`, `POST /admin/advance?days=1..30`, `POST /api/world/advance?days=1..10` | `runTick` (con `forceDays` los dos últimos)                   | `routes/admin.ts` l. 108, 119-121; `routes/world.ts` l. 21-23 |

- Candado `pg_try_advisory_lock`: si otro tick está dentro, se devuelve `ran: false` sin esperar (`tick.ts` l. 212-217).
- Día objetivo: `floor((ahora − worlds.created_at) / msPorDía)` (l. 75-79), con tope de **40 días por ejecución** para ponerse al día (l. 50, 233-235). En régimen normal se procesa **1 día por ejecución**.
- El día N vence en `created_at + N × 6 h` y el auto-tick lo recoge en ≤ 5 min: la hora real **no es fija**, la marca el ancla del mundo, y cada avance forzado la re-ancla a `ahora − día × msPorDía` (l. 95-107, 294-307). `GET /health` expone `gameDay` y `nextTickAtMs = created_at + (día+1) × msPorDía` (`routes/health.ts` l. 16-26).
- Un Gran Tour de 21 etapas y 2 descansos dura 23 días de juego, unos 5,75 días reales (derivado de las 6 h, no medido en producción).

### 1.2 La transacción de un día (`tick.ts` l. 262-284)

Orden exacto: `lockCalendarDay` (candados de carrera, l. 266) → `runRollover` (l. 268) → `raceWorldDay` (vuelta de prueba, solo días absolutos 1-5: `race.ts` l. 21-58) → `runCalendarDay` (l. 270-272) → `trainWorldDay` → `runCallups` → `runMarket` → `runPayroll` → `runTeamFinances` → `purgeAttrLog` → `game_state.current_day = N` (l. 280-283). El comentario lo fija como requisito: «un día se aplica entero o no se aplica» (l. 259-261).

Consecuencia para E2: **no existe en la base un estado «etapa en curso»**. Antes del commit no hay nada; después está todo, y a la vez `current_day` ya dice N. Con un avance forzado de varios días cada día es su propio commit, así que la web los ve aparecer de uno en uno.

### 1.3 Qué etapas corre cada día

`runCalendarDay` (`calendarRun.ts` l. 1524-1665) recorre `SEASON_CALENDAR`, arma los pares (carrera, etapa) de `scheduledStageIndices(race, díaDeTemporada)` (l. 1565-1586, preparado para la semietapa), convoca el día de la etapa 1 (l. 1591-1621), congela el recorrido (`freezeRaceRoute`, l. 1634), lee la etapa congelada (l. 1635) y llama a `runOneStage` (l. 1639-1656).

**Medido** (vitest en el scratchpad, `SEASON_CALENDAR` y `scheduledStageIndices` de las fuentes):

| Dato                      | Valor                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| Carreras en el calendario | 842 (532 campeonatos nacionales, 36 WT, 61 Pro, 101 `.1`, 112 `.2`)                      |
| Etapas por temporada      | 1.418 (886 fuera de los nacionales); coincide con la cifra de `docs/tactica.md` §8       |
| Media por día             | 3,90; 92 días sin ninguna                                                                |
| Histograma (etapas: días) | 1: 46 · 2: 58 · 3: 52 · 4: 30 · 5: 27 · 6: 27 · 7: 11 · 8-11: 16 · 13: 1                 |
| Días extremos             | día 175: 35 · 176: 187 · 178: 71 · 179: 153 (todas `nc-*`, cronos y ruta élite y sub-23) |
| Semietapas declaradas     | 0 (`doubleAfter` vacío en todas; lo dice también `stageRun.ts` l. 125-126)               |

Un nacional sin 5 corredores del país no se disputa (`calendarRun.ts` l. 217, 257) y `runOneStage` sale sin escribir nada (`stageRun.ts` l. 259): cuántos de esos 187 corren de verdad **no lo sé**, depende de la población del mundo.

### 1.4 `runOneStage`: qué simula y qué escribe (`packages/db/src/stageRun.ts`)

| Paso | Qué                                                                                                                               | Tablas y columnas                                                                                             | Líneas                             |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 1    | Lee el roster no abandonado (orden por dorsal), la general de SALIDA, corredores, atributos, ocultos, órdenes y el diario de ayer | lectura                                                                                                       | 219-259, 277-291, 293-376          |
| 2    | Semilla `stageSeed({worldSeed, raceId: raceKey, stageDay, engineVersion})` con `ENGINE_VERSION` 89                                |                                                                                                               | 470-475; `constants.ts` l. 838     |
| 3    | Contexto de carrera y `StageInput`                                                                                                |                                                                                                               | 482-506                            |
| 4    | **Simula**: `simulateStage(input, seed, sonda)` con la sonda de radio `raceRadioCollector(radioKmPoints(km))`, una foto por km    |                                                                                                               | 515, 528-536                       |
| 5    | Maillots de la carretera (general de salida) y lista de seguimiento: 3 maillots + 10 de la general + 10 de la etapa               |                                                                                                               | 550-569                            |
| 6    | **Snapshot**                                                                                                                      | `stage_snapshots(race_id, stage_day, seed, engine_version, input, events, radio)` con `onConflictDoNothing`   | 570-595                            |
| 7    | Resultado (solo quien acaba; bonificación 0 en un día)                                                                            | `stage_results(puesto, tiempo_s, bonificacion_s, puntos_volante, puntos_montana)`                             | 681-691, 856-858                   |
| 8    | General acumulada (upsert)                                                                                                        | `race_gc(tiempo_total_s, puntos_volante, puntos_montana, suma_puestos, ultimo_puesto)`                        | 693-705, 862-876                   |
| 9    | Fisiología                                                                                                                        | `riders.ctl/atl`, `strain_days/ill_days`, `rider_attrs.value`                                                 | 877-898                            |
| 10   | Equipos de la etapa                                                                                                               | `stage_team_results`                                                                                          | 903-926                            |
| 11   | Parte diario con lo que hizo                                                                                                      | `rider_daily_log(game_day, tss, …, activity = 'carrera:<raceId>:e<N>', parte)`                                | 658-676, 729-747, 927-929          |
| 12   | Aprendizaje                                                                                                                       | `rider_attr_log`                                                                                              | 930-932                            |
| 13   | Abandonos, lesiones, enfermedad                                                                                                   | `race_rosters.abandoned_day/_reason`, `riders.health/health_until_day`, noticias `abandon` e `injury`         | 937-1007, 1037-1140                |
| 14   | `awardOutcome`: premios                                                                                                           | `transactions` del corredor humano («`<carrera> · stage win`», «`<carrera> · GC #n`») y `teams.budget`        | 1171-1179; `economy.ts` l. 134-184 |
| 15   | Noticia de la victoria, y en la última etapa `gc_win` y `kom`                                                                     | `news`                                                                                                        | 1201-1256                          |
| 16   | Puntos y palmarés                                                                                                                 | `riders.season_points`, `rider_points(game_day, race_id, kind)`, `palmares(kind, detail 'Stage N', game_day)` | 1259-1307; `ranking.ts` l. 71-111  |

«Journal» y «crónica» son **el mismo dato**: `stage_snapshots.events`. Las clasificaciones de puntos y montaña no tienen tabla: se suman al leer desde `stage_results`, y la general y los equipos se pueden pedir «tras la etapa N» (`getGcThroughStage`, `getPointsClassification(…, throughStage)`, `getKomClassification`, `getTeamClassifications`: `results.ts` l. 236-414, `teamClassification.ts` l. 136-140). Lo único «solo presente» es `race_gc` (`getRaceGc`, `results.ts` l. 23).

### 1.5 Cómo queda identificada una etapa en cada tabla, y si lleva fecha

Es la pregunta que decide cómo se podrá saber «qué ha visto cada uno»: la etapa es `(raceKey, stageDay)` con `raceKey = <raceId>:s<temporada>` (`packages/shared/src/raceKey.ts` l. 1-27), y su día de juego no está escrito en ninguna fila de etapa; se deduce del calendario (`season × 364 + stageDayOfSeason(race, N)`, como hace `raceReport.ts` l. 52-59).

| Tabla                                                    | Cómo nombra la etapa                                                                            | `game_day` | Marca de tiempo |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------- | --------------- |
| `stage_snapshots`, `stage_results`, `stage_team_results` | `(race_id = raceKey, stage_day)`                                                                | no         | no              |
| `race_gc`                                                | `(race_id, rider_id)`: solo el acumulado tras la última etapa                                   | no         | no              |
| `rider_daily_log`                                        | `activity = 'carrera:<raceId>:e<N>'`, con el `raceId` SIN temporada (`stageRun.ts` l. 672, 746) | sí         | no              |
| `palmares`                                               | `race_id` sin temporada, `season`, `detail = 'Stage N'`                                         | sí         | `created_at`    |
| `rider_points`                                           | `race_id = raceKey`, `kind 'stage'` o `'gc'`, sin número de etapa (`schema.ts` l. 1032-1047)    | sí         | no              |
| `transactions` (libro del corredor)                      | solo en la nota: «`<carrera> · stage win`»                                                      | sí         | `created_at`    |
| `news`                                                   | en ninguna columna: solo dentro del texto                                                       | sí         | `created_at`    |

---

## 2. La crónica

**Qué guarda.** `stage_snapshots.events` es `output.events` tal cual sale del motor (`stageRun.ts` l. 578-580): una lista de `ChronicleEvent { km, tS, tipo, plantilla, protagonistas: id[], datos?: Record<string, number | string> }` (`chronicle.ts` l. 22-29). En la misma fila están `seed` (la de la simulación), `engine_version` e `input`. No hay columnas llamadas `kind` ni `data`: **`plantilla` hace de `kind` y `datos` de `data`**, sin texto y sin nombres, solo ids. Medido: 12,6 a 20,2 KB de JSON por etapa, 62 a 101 eventos (§7).

**Cómo se re-renderiza, en dos capas y en cada petición.**

1. API: `buildChronicle(events, names, { byClock })` (`routes/races.ts` l. 507-512; `chronicle.ts` l. 289-376). Resuelve cada id contra el roster y los resultados de HOY (`getRaceRiderIdentities`, l. 501), pega el maillot que llevaba puesto ESE día (`leadersThroughStage(day − 1)`, l. 469 y 108-122: cuatro consultas más), filtra `narra: 0`, ordena por km y reloj (o por reloj en la crono), deduplica, agrupa racimos y aplica unas veinte pasadas de coherencia que arreglan también lo ya congelado («Todas estas pasadas valen también para las 73 crónicas ya CONGELADAS», l. 356-357). Salida: `ChronicleEntry { km, tS, plantilla, protagonists: ChronicleRider[], mentions?, datos? }` (`contracts.ts` l. 1262-1276), con `ChronicleRider { id, name, bib, team, country, jersey? }` (l. 1232-1260).
2. Web: `chronicleTemplate` convierte `plantilla` + `datos` en una frase inglesa (`apps/web/src/domain/stageJournal.ts` l. 318 y 57 `case`), con variante determinista sembrada con `${plantilla}:${km}:${nombres}` (l. 327, hash FNV en l. 111-115). Esa semilla NO es la de la simulación.

**Por qué el encargo la pone de ejemplo bueno frente a `news`.** Porque traducir, corregir una redacción o arreglar una contradicción es cambiar código y vale hacia atrás para todas las etapas corridas; en `news` el texto se fija al escribir y en inglés. Dos matices para E2: la crónica depende también del estado de lectura (un corredor que cambió de equipo, o un equipo renombrado, sale con el equipo de HOY porque la identidad se lee de `riders.team_id` actual: `results.ts` l. 191-207; el maillot sí es el de aquel día) y de las pasadas de `buildChronicle`, así que la misma etapa puede leerse distinto tras un despliegue (buscado, no un defecto). Sin eventos guardados, la ruta de calendario sirve `journalUnavailable: true` (l. 477-497) y la de la vuelta de prueba re-simula solo con el mismo motor (l. 250-259).

**Lo que la crónica no tiene por construcción.** Solo cuenta lo que es noticia; la situación km a km está en la radio, cuyo contrato `RadioKm { km, groups, racing, gone }` **no lleva reloj** (`contracts.ts` l. 1468-1474): el segundo de carrera solo existe en los eventos (`tS`).

---

## 3. Las noticias

**Esquema** (`schema.ts` l. 789-812): `news(id, world_id, game_day, scope 'global'|'personal', rider_id, kind text, text text, created_at)`. Sin carrera, temporada, etapa, `seed` ni `data`.

**Escritura**: `emitNews` (`packages/db/src/news.ts` l. 28-49) llama a `renderNews(kind, seed, data)` (`engine/src/world/news.ts` l. 53-58) y guarda solo el texto. **Todas se escriben `global`**: ningún llamador pasa `personal: true` (grep: cero). Cada `kind` tiene UNA plantilla («la noticia es un dato», l. 29-32), así que la semilla no elige nada hoy. En la tabla, `<raya>` es el carácter U+2014 que el código escribe literalmente.

| `kind`           | Plantilla exacta (`world/news.ts`)                                                     | Quién y cuándo                                                                                                                                                                                                               | `seed` pasada (y tirada)                   |
| ---------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `stage_win`      | `${rider} wins stage ${stage} of the ${race}.`                                         | tick, cada etapa de carrera por etapas sin fuga victoriosa ni crono (`stageRun.ts` l. 1201-1217)                                                                                                                             | `win:${raceKey}:${gameDay}:${stageDay}`    |
| `tt_win`         | `${rider} wins the stage ${stage} time trial at the ${race}.`                          | tick, etapa crono                                                                                                                                                                                                            | ídem                                       |
| `breakaway_win`  | `${rider} wins stage ${stage} of the ${race} from the breakaway.`                      | tick, si hubo `fuga_formada` y ningún `fuga_cazada` (l. 1184-1186; no comprueba que el ganador fuera en ella)                                                                                                                | ídem                                       |
| `one_day_win`    | `${rider} wins the ${race}.`                                                           | tick, carrera de un día                                                                                                                                                                                                      | ídem                                       |
| `one_day_tt_win` | `${rider} wins the ${race} time trial.`                                                | tick, crono de un día                                                                                                                                                                                                        | ídem                                       |
| `gc_win`         | `${rider} wins the ${race} overall.`                                                   | tick, última etapa de una carrera por etapas (l. 1221-1231)                                                                                                                                                                  | `gc:${raceKey}:${gameDay}:${stageDay}`     |
| `kom`            | `${rider} wins the mountains classification at the ${race}.`                           | tick, última etapa, si el líder tiene > 0 puntos (l. 1233-1256)                                                                                                                                                              | `kom:${raceKey}`                           |
| `abandon`        | `${rider} abandons the ${race}` + `[ on stage ${stage}]` + `[ <raya> ${detail}]` + `.` | tick (`markAbandons`, l. 1069-1081; `detail` de l. 1020-1026: `climbs off, out of energy`, `eliminated on time`, `injured`, `ill`, `withdraws`); y la API al retirarse el jugador, sin etapa (`riderSchedule.ts` l. 299-306) | `abandon:${raceKey}:${gameDay}:${riderId}` |
| `injury`         | `${rider} injured` + `[ <raya> out for ${detail}]` + `.`                               | tick (`applyIncidents`, l. 1128-1138); `detail` «N weeks» o «N day(s)»; **no nombra la carrera**                                                                                                                             | `injury:${raceKey}:${gameDay}:${riderId}`  |
| `contract`       | `${rider} signs for ${team}` + `[ ${detail}]` + `.`                                    | API, al aceptar una oferta (`routes/riders.ts` l. 551 → `packages/db/src/contracts.ts` l. 324-339)                                                                                                                           | `contract:${offerId}`                      |
| `retirement`     | `${rider} retires` + `[ ${detail}]` + `.`                                              | tick, rollover: los 6 retirados con más palmarés, `detail` «at N» (`rollover.ts` l. 319-333)                                                                                                                                 | `${worldSeed}:retire:${riderId}`           |

Defecto de texto de paso: `contract` con traslado produce «`signs for T , relocating to Spain.`» (el `detail` empieza por coma, l. 328, y la plantilla antepone un espacio).

**Por etapa** salen: un titular de victoria siempre, un `abandon` por retirado (salvo los de lesión, silenciados en l. 957-968 porque ya llevan `injury`) y un `injury` por lesionado; al final, `gc_win` y `kom`. **No hay titular** de cambio de líder, de maillot de puntos, de equipos ni de jóvenes.

**Lectura**: `GET /api/news` (`routes/rankings.ts` l. 63-72): con sesión y corredor, `getRiderNews` (mundo y `rider_id = X OR scope = 'global'`, 40, marca `personal` si el protagonista es tu corredor: `news.ts` l. 117-146); sin ella, `getGlobalNews` (40, l. 66-90). `GET /api/teams/:id/news`: `getTeamNews`, 15, por el equipo ACTUAL del protagonista (l. 96-115). Orden `game_day desc, created_at desc`. Contratos: `newsItemSchema` (`contracts.ts` l. 787-801) y `teamNewsItemSchema` solo con `gameDay`, `kind`, `text` (l. 705-711). La web enlaza los titulares de resultado a `/world/races/<id>` tras adivinar la carrera por subcadena (`newsFeed.ts` l. 17-24, 60-80): con E10 o con dos carreras de nombre contenido, se rompe.

---

## 4. Lo que expone la API de etapas y carreras

La API no declara esquemas de respuesta (ninguna ruta usa `schema.response`); los valida la web al recibir (`apps/web/src/api/results.ts` l. 52 con `stageReplaySchema`, etc.).

| Ruta                                                                                                                                   | Sesión        | Forma (`packages/shared/src/contracts.ts`)                                                                                                                                                                                                                                                                                                                                   | Cita                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `GET /api/races/:raceId/stages/:day`                                                                                                   | **no**        | `StageReplay` (l. 1482-1533): `day, name, km, run, race, kind, timeTrial, journalUnavailable?, altimetry` (SVG con marcas de ataque, fuga, caza, pancartas y meta: `chronicle.ts` l. 169-175), `results[]` (con DNF y motivo), `chronicle[]`, `gc[]`, `kom[]`, `points[]`, `teamStage[]`, `teamGc[]`, `leaders { onRoad, afterStage }`, `radio?` (`RaceRadio`, l. 1476-1480) | `routes/races.ts` l. 387-539                                   |
| `GET /api/races/test-tour/stages/:day`, `/results`, `/history`                                                                         | sí, sí, no    | `StageReplay` reducido; `RaceResults` (l. 1211-1219); `RaceHistoryHonour[]`                                                                                                                                                                                                                                                                                                  | l. 175-282                                                     |
| `GET /api/calendar`                                                                                                                    | no            | `Calendar` (l. 389-412): por carrera `winner` y etapas; `dayOfSeason`                                                                                                                                                                                                                                                                                                        | `routes/calendar.ts` l. 38-78                                  |
| `GET /api/calendar/:raceId`                                                                                                            | no            | `RaceView` (l. 565-606): `status`, `runDays`, `stages[]` (altimetría), `gc` (actual), `points`, `kom`, `teamGc`, `leaders` (ahora), `stageWinners`, `history`                                                                                                                                                                                                                | l. 81-214                                                      |
| `GET /api/calendar/:raceId/startlist`                                                                                                  | no            | `RaceStartlist` (l. 630-640), solo antes de la salida                                                                                                                                                                                                                                                                                                                        | l. 221-249                                                     |
| `GET /api/my-orders?raceKey=`                                                                                                          | sí, convocado | `RaceOrders` (l. 1174-1189): etapas con parte meteorológico                                                                                                                                                                                                                                                                                                                  | `races.ts` l. 286-364                                          |
| `GET /api/riders/me/last-race`                                                                                                         | sí            | `RiderRaceReport` (l. 1554-1571): `position, fieldSize, timeGapToWinnerS, winnerName, personalEvents, story`                                                                                                                                                                                                                                                                 | `routes/riders.ts` l. 198-205; `packages/db/src/raceReport.ts` |
| `GET /api/riders/me/form`, `/summary`, `/ledger`, `/palmares`, `/upcoming-races`                                                       | sí            | `FormResponse` con `parte` por día de carrera (l. 276-333); `RiderSummary` (l. 253-267); `Ledger` (l. 917-933); `PalmaresRow[]`; `UpcomingRace[]` (l. 227-240)                                                                                                                                                                                                               | `routes/riders.ts` l. 134, 425-437, 500-530                    |
| `GET /api/riders/:id`, `/results`, `/palmares`, `/badges`                                                                              | no            | `PublicRiderDetail` (l. 713-737), `RiderRaceResult[]` (l. 890-913), `PalmaresRow[]`, `Badge[]`                                                                                                                                                                                                                                                                               | `routes/riders.ts` l. 657-687                                  |
| `GET /api/teams`, `/api/teams/:id`                                                                                                     | no            | `TeamListItem` (`pointsSeason`, `budget`), `TeamDetail` (plantilla con `seasonPoints` y `health`) (l. 644-682)                                                                                                                                                                                                                                                               | `routes/teams.ts` l. 116-129                                   |
| `GET /api/rankings`, `/young`, `/api/season-awards`, `/api/hall-of-fame`, `/api/records`, `/api/countries[/:code]`, `/api/free-agents` | no            | l. 748-866                                                                                                                                                                                                                                                                                                                                                                   | `routes/rankings.ts` l. 27-106                                 |

Dos límites de la ruta de etapa: resuelve la temporada con el día de HOY (`currentSeason(world.currentDay)`, l. 399), así que **una etapa de la temporada anterior no se puede abrir**; y no mira quién pide.

Y dos costes: la ficha de etapa hace unas catorce consultas por petición (mundo, recorrido congelado, snapshot, resultados, no clasificados, general, montaña, puntos, equipos, las cuatro de `leadersThroughStage` e identidades: `races.ts` l. 396-518); la ficha de carrera lee el `input` ENTERO de cada snapshot de la carrera solo para sacar el perfil (`getRacedStageProfiles`, `results.ts` l. 451-468), 56 a 90 KB por etapa según §7.

### 4.1 Qué pantallas revelan el resultado de una etapa, y desde cuándo

Todas lo revelan **desde el commit del día** (§1.2); ninguna filtra por usuario.

| Superficie                                          | Ruta(s)                                                                                 | Qué revela                                                                                                                                            | Directo o indirecto |
| --------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Portada (`apps/web/src/pages/Home.tsx` l. 145, 229) | `/api/riders/me/last-race`, `/form`, `/summary`                                         | puesto, ganador, «la fuga llegó a meta» (`raceReport.ts` l. 158-170); km en fuga, pájara y descuelgue del parte; puntos y puesto de temporada, dinero | directo             |
| Ficha de etapa                                      | `/api/races/:raceId/stages/:day`                                                        | todo                                                                                                                                                  | directo             |
| Ficha de carrera y calendario                       | `/api/calendar/:raceId`, `/api/calendar`                                                | general, puntos, montaña y equipos actuales, maillots de hoy, ganadores de etapa, `status`, `runDays`; ganador final (`winner`)                       | directo             |
| Noticias                                            | `/api/news`, `/api/teams/:id/news`                                                      | ganador de cada etapa, abandonos, lesiones; ganador final                                                                                             | directo             |
| Perfil de corredor                                  | `/api/riders/:id/results`, `/palmares`, `/badges`, `/api/riders/:id`                    | puesto en cada etapa y general; «Stage N» en palmarés; insignias; puntos, puesto de temporada, `health: lesionado` tras una caída                     | directo e indirecto |
| Mis carreras y finanzas                             | `/api/riders/:id/results`, `/api/riders/me/ledger`                                      | puestos; «`<carrera> · stage win`»                                                                                                                    | directo             |
| Ranking y premios                                   | `/api/rankings` (`rider_points` fechado), `/young`, `/season-awards`, `/countries`      | los puntos de la etapa suben ya                                                                                                                       | indirecto           |
| Equipo                                              | `/api/teams[/:id]`                                                                      | `pointsSeason`, `budget` (premio de equipo), salud de la plantilla                                                                                    | indirecto           |
| Hall of fame, récords, historial                    | `/api/hall-of-fame`, `/api/records`, `history` de la ficha                              | victorias de etapa y generales contadas desde `palmares` (la de etapa, en cuanto se corre)                                                            | directo             |
| Correo                                              | ninguno                                                                                 | nada (§5)                                                                                                                                             |                     |
| Título de la pestaña                                | `apps/web/index.html` l. 7, fijo «Cycling Star»; la web no toca `document.title` (grep) | nada hoy                                                                                                                                              |                     |

---

## 5. Los correos

| Correo                                      | Cuándo                                                                                        | Asunto                                               | Cuerpo                        | ¿Resultados? |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------- | ------------ |
| `resetPasswordEmail` (`emails.ts` l. 64-82) | «he olvidado mi contraseña» (`auth.ts` l. 126-128)                                            | `Reset your Cycling Star password`                   | enlace que caduca en una hora | no           |
| `verifyEmailEmail` (l. 90-109)              | registro, entrar sin confirmar y cambio de correo a la dirección nueva (`auth.ts` l. 136-148) | `Confirm your Cycling Star email`                    | enlace a `/verify-email`      | no           |
| `changeEmailConfirmationEmail` (l. 116-135) | cambio de correo, a la dirección actual (`auth.ts` l. 155-162)                                | `Confirm the new email of your Cycling Star account` | nombra la dirección nueva     | no           |

Salen por Resend con un POST propio y 10 s de corte, sin lanzar nunca (`mailer.ts` l. 45-118); sin `RESEND_API_KEY`/`MAIL_FROM` un mailer nulo solo lo anota (l. 124-152). **No existe ningún correo de juego.** El servicio `tick` valida solo `DATABASE_URL` y `TICK_INTERVAL_MINUTES` (`env.ts` l. 65-68) y no crea mailer. El servicio `web` sí tiene mailer y corre el auto-tick en su proceso, pero `runTick` devuelve solo `{ ran, daysProcessed, currentDay, durationMs }` (`tick.ts` l. 52-58): un aviso de «etapa corrida» tendría que consultar después qué se corrió.

---

## 6. Autenticación y sesión

- Cada ruta autenticada llama a `currentUserId(request)`: better-auth `getSession` con la cookie y devuelve `session.user.id` (`routes/context.ts` l. 47-54). No hay caché de cookie configurada (`auth.ts` no pasa `session`): es una consulta a la base por llamada. Sesión de 7 días, refresco como mucho diario (defectos de better-auth 1.6.25, `apps/api/node_modules/better-auth/dist/context/create-context.mjs` l. 146-147).
- Del id se deriva el corredor activo (`getRiderForUser`, `riders.user_id` y `retired_at` nulo: `packages/db/src/riders.ts` l. 184-215) y el equipo (su `team_id`, o el que posee por `teams.owner_user_id`).
- **Último acceso**: no existe por usuario. Lo más cercano es `sessions.updated_at` (`schema.ts` l. 102), que se toca como mucho una vez al día, y `users.updated_at` (l. 88), que es de cambios de perfil. `users.locale` existe (l. 82, por defecto `'es'`) y **no lo lee nadie** (grep).
- **Estado «visto»**: ninguno. Ni tabla ni columna (grep de `seen`, `visto`, `last_` en el esquema: solo `last_processed_day`), y la web no usa `localStorage` ni `sessionStorage` (grep: solo comentarios que explican por qué no).
- **Casi todo lo que revela resultados es público** (§4): un visitante sin sesión lo ve todo, y para él no hay a quién atribuir lo visto.
- Caché de la web: datos del mundo 30 min, personales 2 min (`apps/web/src/queryClient.ts` l. 17-60); límite global de la API 300 peticiones por minuto e IP (`security.ts` l. 10).

---

## 7. Tamaño medido

**Método.** Test de vitest en el scratchpad, con alias a las fuentes de `engine` y `shared` y las funciones reales de `apps/api/src/chronicle.ts`. Mismo camino que `stageRun.ts`: `raceRadioCollector(radioKmPoints(km))`, `simulateStage`, `radioForStorage(radio({ incidents }), lista de 3 + 10 + 10, maillots)`. Identidades sintéticas de longitud realista (nombre de 18 caracteres, equipo, país, dorsal). Bytes de `JSON.stringify`; gzip con `zlib`. Campos de `realQueenSetup` (realista) y de los escenarios del banco (homogéneo, 176 corredores).

| Etapa (campo)                           | km  | Corr. | Eventos / líneas | BD `radio`          | BD `events` | BD `input` | API `radio`        | API `chronicle` | Respuesta entera       | `simulateStage` |
| --------------------------------------- | --- | ----- | ---------------- | ------------------- | ----------- | ---------- | ------------------ | --------------- | ---------------------- | --------------- |
| race-france e5 llana (realista)         | 158 | 176   | 62 / 45          | 104,7 KB (gzip 5,9) | 12,6 KB     | 89,7 KB    | 862 KB (gzip 15,0) | 19,7 KB (2,4)   | **950 KB** (gzip 22,2) | 2,4 s           |
| race-colombia e5 reina (realista)       | 232 | 126   | 92 / 67          | 391,9 KB (18,3)     | 18,2 KB     | 67,1 KB    | 2.082 KB (43,1)    | 25,3 KB (2,8)   | **2.159 KB** (50,0)    | 3,2 s           |
| race-france e18 (homogéneo, 3.ª semana) | 185 | 176   | 101 / 68         | 141,4 KB (10,5)     | 20,2 KB     | 59,6 KB    | 1.065 KB (23,5)    | 25,3 KB (2,9)   | **1.158 KB** (31,9)    | 5,8 s           |
| race-flanders (homogéneo)               | 278 | 176   | 100 / 68         | 282,9 KB (16,0)     | 19,1 KB     | 65,4 KB    | 1.770 KB (39,8)    | 23,8 KB (2,6)   | **1.870 KB** (48,7)    | 5,9 s           |

Lecturas: (1) la radio es el 91-96 % de la respuesta porque `buildRaceRadio` repite la identidad completa de cada nombrado en cada grupo de cada km (`chronicle.ts` l. 1340-1400); tarda 10-27 ms. (2) **La API no comprime**: no hay `@fastify/compress` (grep); si el borde de Railway comprime, **no lo sé**. (3) Lo guardado en `radio` es de 5 a 18 veces el «~22 KB por etapa» que dice `schema.ts` l. 754 (en texto JSON; cuánto lo reduce TOAST en Postgres, no lo sé). (4) Los tiempos son de vitest sobre TypeScript, no del JS compilado de producción: valen como orden de magnitud del tick y del coste de la re-simulación de `last-race`.

Un límite de contenido que E2 hereda: un grupo se nombra entero solo si tiene ≤ 12 corredores (`engine/src/sim/raceRadio.ts` l. 611); en uno mayor solo salen los que tiran (como mucho 12, l. 591) y los de la lista de seguimiento, así que **el corredor del jugador, a rueda en el pelotón, no aparece en la radio** salvo que esté en esa lista (maillot, 10 primeros de la general de salida o de la etapa). Dos comentarios de `chronicle.ts` describen piezas que no existen: `member` (l. 1254) y `protect` (l. 1369).

---

## 8. Lo que la línea de táctica toca en la API

- **Fila 17 del plan** (`docs/tactica.md` l. 6979): «17d `apps/api`, `domain/dashboard.ts`: el informe deja de re-simular, cruza orden con hecho y el aviso etapa a etapa». R23.5 (l. 4866-4868), R23.6 «el informe cruza orden con hecho» (l. 4870-4873), §6.6 el aviso de «no hay órdenes» etapa a etapa (l. 6383-6390).
- **§9.6** (l. 7592-7593): «`raceReportOrdersSchema` pasa a devolver las once palancas (hoy devuelve cuatro)».
- **Estado real**: el commit `7287f73` declara «el paso 17 queda entero», pero su 17d solo cambió la vuelta de prueba (`routes/races.ts` l. 230-259). `packages/db/src/raceReport.ts` l. 148 **sigue re-simulando** con el motor de hoy, `raceReportOrdersSchema` sigue con 4 campos (`contracts.ts` l. 1543-1549), R23.6 no tiene código (grep), y la portada sigue con `hasOrders = orders.length > 0` (`Home.tsx` l. 229).
- **R23.7** «el corredor propio siempre aparece nombrado en su radio» (l. 4875-4876): sin código. Choca con §7: la radio guardada es la misma para todos y no sabe dónde va quien no está en la lista, así que exige tocar `radioForStorage` o la lista de `stageRun.ts` l. 560-569.
- **R23.4** (tres nombres + conteo + equipos, l. 4858-4863) y **R23.8** (`card_changed`, l. 4878-4880): sin código; cambiarán `protagonistas` y `datos` o añadirán plantillas. R23.1-R23.3 ya están en el motor (`simulate.ts` l. 2527, 5350, 6608). La frontera se mantiene: `StageOutput` no gana campos, lo nuevo llega como eventos dentro de `events` (l. 7597-7611), que `buildChronicle` deja pasar (orden 9 si no conoce la plantilla, `chronicle.ts` l. 325 y 341).
- **Para E2**: no diseñar contra `/api/riders/me/last-race` tal como está (va a reescribirse); `StageReplay` no figura entre lo que la táctica cambia; la crónica ganará plantillas; la radio puede cambiar si se hace R23.7.

---

## 9. Hechos que un diseñador de E2 debe tener delante

1. El resultado existe entero desde el commit del día y no hay estado intermedio (`tick.ts` l. 262-284): «ver la etapa a ritmo» es una decisión de presentación sobre datos ya cerrados, no algo que el tick pueda escalonar sin partir la transacción que el código declara indivisible.
2. La hora real de cada día depende del ancla del mundo, no de un horario: cualquier «la etapa empieza a las 18:00» tendría que derivarse de `worlds.created_at` y `TICK_INTERVAL_MINUTES` (`tick.ts` l. 75-79; `health.ts` l. 26).
3. Un día normal trae 1 a 13 etapas y cuatro días del año traen de 35 a 187 (§1.3): una portada o un feed «sin destripe» tiene que aguantar esos días.
4. `GET /api/races/:raceId/stages/:day` mezcla en una respuesta lo que se puede enseñar antes de ver la etapa (recorrido, perfil, participantes) y lo que no (resultado, clasificaciones tras la etapa, `leaders.afterStage`, crónica, radio, marcas de la altimetría): no hay forma de pedir una cosa sin la otra.
5. Las clasificaciones «tras la etapa N» ya se pueden calcular para cualquier N (`getGcThroughStage` y compañía); lo único que solo existe «a hoy» es `race_gc` y todo lo que cuelga de `season_points`, `palmares`, `budget` y `health`.
6. Las noticias no dicen de qué etapa hablan salvo por su texto; su semilla, que sí lo decía (`win:<raceKey>:<gameDay>:<stageDay>`), se tira en `emitNews`.
7. No hay ningún dato por usuario de lo visto, ni último acceso útil, y la mayoría de las rutas de resultados no piden sesión (§6).
8. La portada ya destripa hoy por `last-race`, y esa ruta está marcada por la táctica para reescribirse (§8).
9. No hay correo de juego ni canal para mandarlo desde el tick; el que se cree nacerá ya con el problema del destripe dentro.
10. La radio tal como se sirve pesa del orden de 1 a 2 MB por etapa sin comprimir; cualquier diseño que la reproduzca a ritmo o la pida por tramos tiene que decidir su forma de transporte.

## Lo que no he podido comprobar

- Tamaños y tiempos de **producción**: no hay acceso a la base. Las cifras de §7 son de etapas simuladas en el scratchpad con identidades sintéticas; ni la compresión TOAST de las columnas JSONB ni la del borde de Railway.
- La **hora real** a la que corre hoy cada día de juego: depende del `created_at` del mundo de producción y de sus re-anclajes.
- Cuántos **campeonatos nacionales** se disputan de verdad en los días 175-179 (dependen de corredores por país).
- Cuántas **noticias por día** hay en producción y si algún titular antiguo quedó escrito con plantillas anteriores.
- El coste de `simulateStage` en el JS compilado y la frecuencia real con que la portada pide `last-race`.
- Si better-auth toca `users.updated_at` en algún flujo de sesión además de en los cambios de perfil.
