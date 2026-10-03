## 16. Los bancos y los tests

Esta sección escribe cada banco y cada invariante (la tabla final es §16.9) con su nombre, lo que mide, cómo lo mide, sobre qué fixture, en qué suite del CI corre y con qué umbral; escribe entero el código de B1a, B1c, B9, B10 y B11 como tests de vitest y el protocolo de la prueba de lectura, y cierra con la tabla de todos. Escribe como hechos D-11, D-33 y D-60. Las medidas son de quien se nombra en cada una: el juez del motor (`juez-motor/`), el de ejecutabilidad (`juez-ejec/`), los redactores de §3 (`l1/`), §4 y §15 (`l2/`), §5 y §13 (`l3/`), §6 y §8 (`l4/`), §7 y §9 (`l5/`), §10 y §14 (`l6/`) y §11 y §18 (`l7/`), y las nuevas de esta sección, en la carpeta `l8/` del scratchpad de la síntesis: `l8/transito.mjs` (el umbral de I2), `l8/voz.mjs` y `l8/voz2.mjs` (B19 con la hora de revelado real) y `l8/plantillas.mjs` (B7). Las líneas son las de HEAD `9c21885`, sin cambios de código desde entonces; la corrección tras la refutación (fase 5, lote L8) las volvió a comprobar en `21b36b1`, que solo añade `docs/`, y cita por su nombre las medidas de los refutadores (`rcod/`, `rc3/`, `rc4/`, `coste/`) y de los otros correctores (`corr-l7/`, `l4c/`, `c-l3/`) que usa.

Tres reglas de todo el catálogo. La primera: un banco que puede pasar sin probar nada lleva una cláusula que lo impide (el canario tiene que salir con la etapa conocida, los dos desenlaces tienen que ser distintos, la envoltura ingenua tiene que romper B10), porque la trampa que ya conoce el repositorio es un CI en verde con el simulador sin ejecutar (`ci.yml` l. 198-202). La segunda: donde un umbral no tiene medida de los jueces se dice «sin evidencia de los jueces», y el paso que lo estrena lo mide y escribe la cifra. La tercera: lo que cambia `packages/shared` no dispara los bancos (el filtro es `^packages/engine/`, `ci.yml` l. 189), así que todo banco que dependa de código de `shared` tiene además una versión en la suite rápida sobre etapas congeladas (D-52).

### 16.1 Lo que protege hoy el relato y lo que se re-sella a propósito

El mapa 07 §1 leyó los 24 tests que tocan el relato. Los que E2 pone en rojo a propósito se re-sellan en el paso que cambia lo que protegen, con la causa escrita en el propio test, que es como lo hace el repositorio (mapa 07 §1.5):

| Test | Qué protege hoy | Paso | Qué cambia |
| --- | --- | --- | --- |
| `apps/web/src/components/raceRadioNames.test.tsx` (6) | `groupName`: `Peloton`, `Bunch together`, `Lead group`, `2nd group`, `Chase group`, `No man’s land`, `Grupetto` (l. 11-41) | 6 | las palabras de la barra de D-18 (§6.3) |
| `packages/engine/src/sim/coherence.ts`, `GROUP_NOUNS` y `WATCHED_GROUP_NOUNS` (l. 571-635) | qué nombre de grupo puede decir cada plantilla | 4a | `the gruppetto`, los tres nombres del grupo del maillot (6-b), las filas de §12.5 y las de `mainNoun` (§12.6); la unión que mide `storyMetrics` (l. 736-738) pasa de tres a seis, así que «el vocabulario de grupos no pasa de tres nombres» (`coherence.test.ts` l. 347-360) se re-sella en el mismo 4a con el tope de seis y la cifra remedida sobre sus 60 etapas va en el PR (§12.6) |
| `apps/web/src/domain/stageJournal.test.ts` (140) | frases, variantes y vocabulario | 4a, 6b y 12 | 4a: el test de los tres nombres (l. 1646-1650) pasa a siete, los cuatro papeles y los tres del grupo del maillot; 6b: casos de `mainRole`, de `mainJersey` y de las plantillas nuevas, y «meteorito: Ana» (l. 89-93) da línea vacía; 12: las variantes, UNA vez, por la semilla neutra (§12.7) |
| `packages/engine/src/world/news.test.ts` (3) | el titular inglés, regex y menos de 70 caracteres (l. 20-38) | 4a | se muda a `packages/shared/src/news.test.ts` con los trece `kind` (§12.8) |
| `packages/db/src/abandon.test.ts` l. 232-237 | el titular del abandono leyendo `news.text` | 1a | se comprueba renderizando `data` |
| `apps/web/src/domain/newsFeed.test.ts` l. 32-44 | `raceOfHeadline` busca la carrera en el texto inglés | 1b | el enlace sale de `raceId`; la función muere |
| `apps/web/src/domain/narration.test.ts` (4) | `narrate` y la clave cruda de `personalNarration` (tres `it`, l. 24-39) y `raceVerdict` (el cuarto, l. 41-59) | 12 | los tres de `narrate` y `personalNarration` se borran con `narrate()` (§12.9); el de `raceVerdict`, que E2 no borra (`LastRaceReport.tsx` l. 4, `Home.tsx` l. 19), se queda |
| `apps/web/src/domain/raceTimeline.test.ts` l. 120-128 | el buscador por ganador, que sella un destripe | 9b | busca sobre la lista ya cortada (§11, `sup. I3`) |
| `packages/db/src/stageRun.test.ts` l. 322-339 | radio guardada con más de 10 km, grupos no vacíos y primer hueco 0 | 11b | lo mismo sobre `radioFromTimeline` y la fila de `stage_timelines` (DD-11, §12.10) |

Lo que sigue en verde sin tocarlo, y es la red de E2: `apps/api/src/chronicle.test.ts` (62: sin `live`, el acta es la de hoy, §12.4); `apps/web/src/components/leaderJerseys.test.tsx` (7: `JerseyKind` sigue con tres valores, y las cinco categorías del rótulo viven en `WornJersey`, §7.2); `packages/engine/src/index.test.ts` l. 465 (`ENGINE_VERSION` sigue en 89, D-09); «la radio no toca la carrera» (`packages/engine/src/sim/raceRadio.test.ts` l. 748-799), que B11 extiende sin sustituir; las huellas de `stage/attribution.test.ts` y `timetrial.test.ts`; `checkReplay` y «se lee, no se re-simula»; `coherence.test.ts` (salvo el tope del vocabulario, que el 4a re-sella a seis) y `stage/journal.test.ts`, que son el contrato del suceso y E2 no toca ningún suceso (§5.9); y `stageTables.test.tsx` y `stageStoryJerseys.test.tsx`, que separan el maillot de la carretera del de después.

### 16.2 Los invariantes I1, I2, I3 e I5

Los enunciados son de §4.4 (I-02); aquí van su fixture, su suite y su umbral.

**Los fixtures.** Dos juegos. El primero son las 24 etapas del mapa 07 §7 (las 21 de `race-france`, `race-flanders`, `race-tramuntana` y `race-colombia` e5) con las semillas 0 y 1, corridas por el motor dentro del banco: cambian con el motor y miden el motor. Su entrada es la de `realRaceScenario` más el `timeTrial` del calendario (`inputOf`, en el código de B11): `realRaceScenario` no lo pone (`packages/engine/src/sim/scenarios.ts` l. 518-541), y sin él las dos cronos de las 24 correrían como etapas en línea sobre un perfil de crono (Rcodigo-030). El segundo son etapas CONGELADAS en `apps/api/src/__fixtures__/broadcast/`, que no dependen de la versión del motor (D-43) y miden `packages/shared` y la API: cinco en línea (`race-france` e7, llana; e18, reina; e20, reina larga; `race-flanders` e1; `race-colombia` e5, 126 corredores) y una crono, `race-france` e16, con la semilla 0 y el campo del banco (decisión 16-a). Cada una son cinco ficheros: `<etapa>.timeline.gz` (el `body` de `stage_timelines`, gzip 9 de `StoredTimelineV1`, §4.3), `<etapa>.events.json.gz` (`stage_snapshots.events`), `<etapa>.radio.json.gz` (la radio completa del colector, para B16 y B22), `<etapa>.i1.json.gz` (lo que I1 espera en cada bloque de foto: `radioKmFrom` de la foto del MOTOR con el título de la línea, porque la radio del colector hereda el título del km anterior y difiere en 4 de 3.246 fotos, §5.5) y `<etapa>.acta.json.gz` (las `ChronicleEntry` del acta, para B4 y B5 en la web), más un `manifest.json` con motor, semilla, campo, tamaños y `sha256` de cada fichero. Los escribe `scripts/broadcast-fixtures.mjs` en dos veces (decisión 17-u): cada etapa sale de un mundo de PGlite sembrado con el campo del banco bajo ids uuid deterministas (`00000000-0000-4000-8000-` y el índice en doce cifras, como `idDe` de `packages/db/src/stageRun.test.ts` l. 44: corredores del 1 por dorsal, equipos del 1001), en el que `runOneStage` corre antes las etapas 1 a N − 1 de su carrera, y `manifest.json` guarda por uuid el dorsal, el país, el equipo y un nombre de prueba (`Rider 012`). El paso 2 escribe los sucesos, la radio y el acta; el 5 (no el 4b) escribe `.timeline.gz` (el `body` de `stage_timelines`, con el reparto de `buildTimelineCast` sobre la N − 1) y `.i1.json.gz` de la misma corrida con `spec.timeline`, y falla si los sucesos o la radio difieren en un byte de los del 2. En `race-flanders` e1, `race-colombia` e5 y la crono e16 el script escribe antes en `palmares` un nacional para dos corredores de la salida, para que haya un `from` de campeón. `load.ts` exporta `FIXTURES` (los seis), `ROAD_FIXTURES` (los cinco en línea, desde el 2) y `loadTimeline(name)`, y desde el 6a `seedFixtureWorld(t, name)`, que siembra en PGlite el mundo, `game_state`, los equipos y los corredores del manifiesto y las filas de `stage_timelines` y `stage_snapshots` de la etapa; `broadcastFixtures.test.ts` nace en el 5. Regenerarlos es un PR propio, nunca efecto de subir la versión del motor. Pesan en conjunto menos de 1,5 MB (estimado: de 21 a 70 KB cada línea, medido por L3, más los sucesos, la radio y el acta comprimidos).

| Invariante | Qué afirma | En el banco (las 24 × 2) | En la suite rápida | Umbral | Medido |
| --- | --- | --- | --- | --- | --- |
| I1 | en cada bloque de foto, `photoAt` proyectada es `radioKmFrom` de la foto del motor con el título de la línea, con la tolerancia de relojes iguales que cubre también el `kind` (§4.4, §5.5) | `packages/engine/src/sim/timeline.test.ts`, contra las fotos del motor (`selfCheckI1`) | `apps/api/src/broadcastFixtures.test.ts`, contra `<etapa>.i1.json.gz`; y `packages/shared/src/broadcast/reduce.test.ts` sobre fotos sintéticas (D-52) | 0 discrepancias | 0 en 3.246 fotos (`estado`), 0 en 8.656 con la tolerancia (L3; 1 sin ella) |
| I2 | en la hora en que un grupo cruza un km de foto, sus miembros en `instantAt` son los de `photoAt` menos los pintados en un grupo de detrás; y el tránsito cada 30 s de carrera | ídem | ídem, sobre las cinco en línea | la igualdad, exacta; el tránsito, p90 ≤ 15 por etapa y p90 ≤ 4 en el conjunto (decisión 16-b) | abajo |
| I3 | `clave(k + 10)` es la reducción de `clave(k)`; `decodeTimeline(encodeTimeline(tl))` es `tl` | ídem | las claves, en `reduce.test.ts` (3a); la vuelta del códec sobre la línea sintética de `reduce.test.ts`, en `packages/shared/src/broadcast/codec.test.ts` (nace en el 4b con `encodeTimeline` y `decodeTimeline`, y comprueba además que un `format` desconocido lanza `TimelineFormatError`, §15.2); y las seis congeladas en `broadcastFixtures.test.ts` (5) | 0 | 0 en 46 corridas (L3) |
| I5 | en una crono, `startDs[r]` es la salida del plan, `kmClockDs[r]` no decrece y su última entrada es `10 · tiempoS` | ídem, en las dos cronos de las 24 | ídem, en la e16 | igualdad exacta (decisión 16-c, por 9-a) | 1.176 de 1.176 corredores con un error de 5 Ds como mucho con `toDs` (L3, `l3/i5.mjs`); con 9-a, igualdad |

**El umbral de I2** (decisión 16-b). §4.4 dejaba el p90 ≤ 2 que fijó la síntesis para fijarlo aquí sobre el fixture, porque L1 lo vio fallar en la e18 (p90 de 3 a 5). `l8/transito.mjs` cuenta los corredores en tránsito (en dos grupos a la vez o en ninguno) cada 30 s de carrera, con la cuenta de `l1/corte.mjs` (posición exacta de cada grupo por su reloj en cada bloque), en las 22 etapas en línea de las 24 con las semillas 0 y 1: 44 corridas y 26.073 muestras. En el conjunto, p50 0, p90 3, p95 6, p99 26 y máximo 129; en dos grupos a la vez, p90 0 y p99 2; en ninguno, p90 2 y p99 21. Por etapa, el p90 va de 0 a 12, con mediana 3: pasan de 2 en 23 de 44 corridas, de 5 en 8 y de 8 en una, la reina e19 con la semilla 1 (p90 12, p95 21); las llanas dan 0. El tránsito es la carrera partiéndose, no un defecto del corte: en una reina los grupos se deshacen entre dos km de foto y el instante los enseña como `↓ 3 dropping back` (pantalla, §6.2). Por eso el umbral no puede ser el de las llanas: p90 ≤ 15 por etapa (el peor medido es 12) y p90 ≤ 4 en el conjunto (medido 3), con la igualdad de los grupos en su km de foto exacta, que es lo que afirma la primera mitad de I2.

**Cómo se lee cada uno en rojo.** Si I1 falla, `photoAt` o `reducePhoto` ya no reproducen la foto del motor: se mira la primera discrepancia (`I1Mismatch`, §4.4), que dice bloque, grupo y campo. Si falla la parte exacta de I2, el corte diagonal (§4.5) pinta a alguien fuera de su grupo en el único instante en que hay verdad. Si sube el tránsito sin fallar lo exacto, algo hace más lentos los cambios de grupo y el umbral lo caza antes que la pantalla. I3 en rojo es un formato que ya no se lee a sí mismo, y va antes que todo lo demás en el mismo fichero.

### 16.3 B1a a B1d

El canario B1 es la cuarta de las cuatro piezas que se vigilan entre sí (D-32, §10.1): recorre lo que registra Fastify y no una lista a mano, así que una ruta nueva entra sola en el barrido. Se parte en cuatro, porque cada mitad caza lo que la otra no ve (I-30, D-54): B1a busca VALORES que solo existen en el desenlace; B1c busca IDENTIDADES y órdenes, que el canario no puede buscar porque el ganador ya sale en la lista de salida; B1b busca lo que la existencia de una fila o de un aviso delata (§11.6), y B1d, que ninguna ruta se quede sin clasificar.

| Banco | Qué afirma | Cómo | Fixture | Suite y fichero | Umbral | Nace |
| --- | --- | --- | --- | --- | --- | --- |
| B1a | ninguna respuesta lleva el desenlace de una etapa velada | tras correr la etapa se plantan valores canario en campos del desenlace que la API sirve y se barren todas las `GET` del registro con la sesión del jugador; el título, las `og:` y el aviso se miran con el nombre del ganador | `spoilerWorld.ts`: una carrera en guardia por corredor propio, doce corredores, etapas 1 y 2 vistas y la 3 velada | rápida, `apps/api/src/spoilerCanary.test.ts` | 0 fugas fuera de `PENDING_ROUTES`; con la etapa vista, canario en 5 rutas o más | 7 |
| B1b | correr la etapa no cambia un byte para quien no la ha visto | barrido antes y después de correr la 3, mismo día de juego; y otra cuenta que ve y revela la etapa no cambia lo que recibe la primera (§11.19) | ídem | rápida, `apps/api/src/spoilerDiff.test.ts` | 0 diferencias fuera de las dos tablas de §11.18 (la lista blanca y lo que cambia porque el velo gana la etapa); ningún 5xx; con la etapa vista, 10 rutas distintas o más | 7 |
| B1c | dos desenlaces distintos dan los mismos bytes | dos bases con el mismo mundo y la misma historia hasta la 2, y la 3 corrida con dos semillas cuyos ganadores difieren | ídem, dos veces | rápida, `apps/api/src/spoilerOutcomes.test.ts` | 0 diferencias fuera de la lista blanca más el tiempo de la cabecera; el visitante sin velo ve 5 rutas distintas o más | 7 |
| B1d | toda ruta con cuerpo declara su política y su mecanismo | construye la app, lee `app.spoilerRegistry` y lo compara con la tabla de §11.3 escrita en el test; una app con una ruta sin `config.spoiler` no arranca | la app sin base y con base | rápida, `apps/api/src/spoilerRegistry.test.ts` | igualdad exacta con la tabla | 8a; el fichero nace en el 0 como inventario de rutas (17-b) |

**Las rutas pendientes.** El registro existe desde el paso 7, pero las rutas se cierran en el 7b, el 8a y el 8b (la columna «Mecanismo en» de §11.3; el 9a y el 9b cambian la web, no lo que manda el servidor). Para que la suite siga en verde mientras tanto sin mentir, `PENDING_ROUTES` lista cada ruta que todavía destripa, con el PR que la cierra y los bancos que la ven; cada test comprueba LAS DOS cosas: que ninguna ruta fuera de la lista falla, y que cada ruta de la lista sigue fallando. Así un PR que cierra una ruta tiene que quitarla de la lista (si no, el test dice «ya no destripa: quítala»), y una ruta que vuelve a destripar después no se puede esconder. La lista nace llena en el 7a y queda vacía al cerrar el 8b, que cierra el destripe con B1 en verde en todas las rutas (D-54); en el 9b se borran la constante y sus `it` (decisión 17-n).

```ts
// apps/api/src/__fixtures__/spoilerWorld.ts (nuevo, paso 7): el mundo de B1a, B1b y B1c. PGlite, suite rápida.
import { clearHorizonCaches, clearStageTimelineCache, gameState, raceRosters, raceWatch, riderAttrs, riderHidden, riders, runOneStage, teams, timelineTickLog, worlds, type StageRunSpec, type TimelineTickLog } from '@cyclingstar/db'
import { type TestDb, startTestDb } from '@cyclingstar/db/test'
import { SEASON_CALENDAR } from '@cyclingstar/engine'
import { ATTRIBUTES } from '@cyclingstar/shared'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../app.js'
import { createAuth } from '../auth.js'
import { clearAdaptedTimelineCache } from '../broadcastSource.js'
// Sin drizzle-orm: `apps/api` no depende de él (package.json l. 12-23) y sus tests escriben con SQL crudo (authFlow.test.ts l. 279).

export const RACE_ID = 'race-france'
export const RACE_KEY = `${RACE_ID}:s0`
/** La etapa que el jugador no ha visto; la 1 y la 2, sí. */
export const VEILED = 3
const RACE = SEASON_CALENDAR.find((r) => r.id === RACE_ID)!
export const dayOf = (stageDay: number): number => RACE.startDay + stageDay - 1
/** Ids fijos, como abandon.test.ts l. 43: dos bases con la misma semilla base son el mismo mundo hasta la etapa velada. */
const FIXED = '00000000-0000-4000-8000-'
export const idDe = (i: number): string => `${FIXED}${String(i).padStart(12, '0')}`
export const OWN_RIDER = idDe(0)
const FIELD = 12
const BASE = 'http://localhost:3000'

export type Bank = 'B1a' | 'B1b' | 'B1c'
/** Lo que el paso 8 aún no ha cerrado: ruta, PR que la cierra (§11.3) y bancos que la ven. Nace llena en el 7a y se borra en el 9b. */
export const PENDING_ROUTES: ReadonlyMap<string, { readonly pr: string; readonly banks: readonly Bank[] }> = new Map([
  // ['GET /api/rankings', { pr: '8b', banks: ['B1b', 'B1c'] }],
])
/**
 * La lista blanca de B1b: ruta → campos que pueden cambiar al correrse una etapa velada. Su ÚNICA fuente es la primera tabla de
 * §11.18, fila a fila y en el mismo orden, con su columna «Campos (`strip`)»: puntos; `[]` recorre un array; `[veiledDay]` quita de
 * un array la fila cuyo `gameDay` es el de la etapa velada. Aquí no se escribe nada que no esté allí: una ruta nueva entra antes en
 * §11.18, con su motivo en `config.veil.why` (decisión 16-o).
 */
export const B1B_WHITELIST: ReadonlyMap<string, readonly string[]> = new Map([
  ['GET /api/calendar/:raceId', ['status', 'runDays']],
  ['GET /api/riders/me', ['rider.attributes']],
  ['GET /api/riders/me/form', ['form', 'log.[veiledDay]']],
  ['GET /api/riders/me/coach-view', ['coachView.notes']],
  ['GET /api/riders/:id', ['rider.attributes']],
  ['GET /api/riders/me/race-prefs', ['races.[].callup']],
  ['GET /api/riders/me/offers', ['offers']],
])
/**
 * Lo que cambia SOLO porque el velo gana la etapa entre los dos barridos de B1b (el jugador pasa de velo vacío a la etapa velada):
 * la segunda tabla de §11.18. B1b lo quita; B1c, que compara dos desenlaces con el mismo velo, no.
 */
export const B1B_VEIL: ReadonlyMap<string, readonly string[]> = new Map([
  ['GET /api/news', ['news.[stageReady]']],
  ['GET /api/teams/:id/news', ['news.[stageReady]']],
  ['GET /api/riders/:id/results', ['results.[toWatch]']],
  ['GET /api/riders/me/last-race', ['ready']],
  ['GET /api/riders/me/report', ['report.sessions', 'report.trainingDays']],
])
/** B1c además deja pasar el tiempo de la cabecera: la semilla de la etapa también decide el tiempo (simulate.ts l. 1483), que en carretera se sabe antes de salir. */
export const B1C_WHITELIST: ReadonlyMap<string, readonly string[]> = new Map([
  ...B1B_WHITELIST,
  ['GET /api/races/:raceId/stages/:day/broadcast', ['weather', 'preview.weather']],
])

export interface Swept { readonly status: number; readonly body: string }
export interface SpoilerWorld {
  readonly t: TestDb
  readonly app: FastifyInstance
  readonly worldId: string
  readonly userId: string
  /** La sesión del jugador dueño de OWN_RIDER. */
  readonly cookie: string
  /** Corredores de más para barrer sus fichas (B1a añade al ganador; B1c no, para que las URL sean las mismas). */
  readonly extraRiders: string[]
  runVeiled(stageSeed: string): Promise<void>
  winner(): Promise<string>
  reveal(): Promise<void>
  close(): Promise<void>
}

const specOf = (stageDay: number, log: TimelineTickLog): StageRunSpec => {
  const s = RACE.stages.find((x) => x.index === stageDay)!
  return { raceKey: RACE_KEY, raceId: RACE_ID, raceName: RACE.name, level: 'WT', raceClass: 'WT', season: 0, stageDay,
    kind: s.kind, profile: s.profile, timeTrial: s.timeTrial === true, isFinal: false, timeline: log }
}
/** Una etapa como la corre el tick: runOneStage deja su fila en el diario y flush la escribe en la misma transacción (5-l, §5.5). */
const runStage = (t: TestDb, worldId: string, stageDay: number, seed: string): Promise<void> =>
  t.db.transaction(async (tx) => {
    const log = timelineTickLog()
    await runOneStage(tx, worldId, dayOf(stageDay), seed, specOf(stageDay, log))
    await log.flush(tx)
  })

/** Siembra el mundo, corre la 1 y la 2 con `baseSeed`, da de alta al jugador con lo visto hasta la 2 y deja el reloj en el día de la 3. */
export async function startSpoilerWorld(baseSeed: string): Promise<SpoilerWorld> {
  // Las dos LRU de líneas van por `${raceKey}|${stageDay}`, sin mundo (§5.6, §14.4), y B1c monta dos mundos con la misma carrera en el
  // mismo proceso: sin vaciarlas, el segundo leería la línea que dejó el primero (Rcodigo-086).
  clearStageTimelineCache()
  clearAdaptedTimelineCache()
  // PGlite admite UNA sesión (testDb.ts l. 15-19) y createDb abre hasta 10 (client.ts l. 21-29): la ruta de etapa hace cuatro
  // consultas a la vez (routes/races.ts l. 114-119) y el socket corta con ECONNRESET y un 500. createDb lee la variable al llamarse.
  process.env.DB_POOL_MAX = '1'
  const t = await startTestDb()
  const [w] = await t.db.insert(worlds).values({ worldSeed: baseSeed, engineVersion: 1 }).returning({ id: worlds.id })
  const worldId = w!.id
  await t.db.insert(teams).values([0, 1].map((k) => ({ id: idDe(100 + k), worldId, name: `Team ${k}`, division: 'WT' as const, philosophy: 'general' as const, jerseySeed: `j${k}`, country: 'ES' })))
  await t.db.insert(riders).values(Array.from({ length: FIELD }, (_, i) => ({ id: idDe(i), worldId, teamId: idDe(100 + (i % 2)),
    name: `Rider ${String(i).padStart(2, '0')}`, country: 'ES', gender: 'M' as const, birthSeason: -25, archetype: 'fondo' as const, faceSeed: `f${i}`, ctl: 60, atl: 40 })))
  await t.db.insert(riderAttrs).values(Array.from({ length: FIELD }, (_, i) => ATTRIBUTES.map((attr) => ({ riderId: idDe(i), attr, value: 50 + i }))).flat())
  await t.db.insert(riderHidden).values(Array.from({ length: FIELD }, (_, i) => ({ riderId: idDe(i), talent: 1,
    ceilings: Object.fromEntries(ATTRIBUTES.map((a) => [a, 90])), fragility: 1, peakAge: 28, declineAge: 33 })))
  await t.db.insert(raceRosters).values(Array.from({ length: FIELD }, (_, i) => ({ raceId: RACE_KEY, riderId: idDe(i), bib: i + 1 })))
  for (const day of [1, 2]) await runStage(t, worldId, day, baseSeed)
  await t.db.insert(gameState).values({ worldId, currentDay: dayOf(VEILED), lastProcessedDay: dayOf(VEILED) })

  const auth = createAuth(t.db, { secret: 's'.repeat(32), baseURL: BASE, mailer: { async send() { return true } } })
  const app = buildApp({ db: t.db, auth, serveWeb: false, switches: { broadcastWatch: 'on', spoilerMode: 'on' } })
  const post = (path: string, body: unknown) => app.inject({ method: 'POST', url: `/api/auth${path}`, headers: { 'content-type': 'application/json', origin: BASE }, payload: JSON.stringify(body) })
  await post('/sign-up/email', { name: 'Player', email: 'player@example.com', password: 'contrasena-larga' })
  await t.client`update users set email_verified = true where email = 'player@example.com'`
  const [u] = await t.client<{ id: string }[]>`select id from users where email = 'player@example.com'`
  const login = await post('/sign-in/email', { email: 'player@example.com', password: 'contrasena-larga' })
  const set = login.headers['set-cookie']
  const cookie = (Array.isArray(set) ? set : set ? [set] : []).map((c) => c.split(';')[0]).join('; ')
  await t.client`update riders set user_id = ${u!.id} where id = ${OWN_RIDER}`
  await t.db.insert(raceWatch).values({ userId: u!.id, worldId, raceKey: RACE_KEY, knownThrough: 2, how: 'WW' })

  const world: SpoilerWorld = {
    t, app, worldId, userId: u!.id, cookie, extraRiders: [],
    async runVeiled(stageSeed) {
      await runStage(t, worldId, VEILED, stageSeed)
      // En producción el tick sube el día en la misma transacción (tick.ts l. 262-284) y las cachés del horizonte, que van por
      // (userId, currentDay, horizonRev) y por (worldId, currentDay), se invalidan solas; aquí el día no cambia (§10.6).
      clearHorizonCaches()
    },
    async winner() {
      const [r] = await t.client<{ rider_id: string }[]>`select rider_id from stage_results where race_id = ${RACE_KEY} and stage_day = ${VEILED} and puesto = 1`
      return r!.rider_id
    },
    async reveal() {                                       // lo que hace revealStage (§10.3), escrito a mano: el test no depende de su firma
      await t.client`update race_watch set known_through = ${VEILED}, how = 'WWR' where user_id = ${u!.id}`
      await t.client`update users set horizon_rev = horizon_rev + 1 where id = ${u!.id}`
    },
    async close() { await app.close(); await t.close() },
  }
  return world
}

/** Los valores de cada :param. Un parámetro que no esté aquí hace fallar el barrido: se añade a propósito. */
const PARAM: Readonly<Record<string, (url: string, w: SpoilerWorld) => readonly string[]>> = {
  raceId: () => [RACE_ID],
  raceKey: () => [RACE_KEY],
  day: () => [String(VEILED)],
  season: () => ['0'],
  code: () => ['ES'],
  id: (url, w) => (url.startsWith('/api/teams') ? [idDe(100), idDe(101)] : [OWN_RIDER, idDe(5), ...w.extraRiders]),
}
/** Las consultas mínimas de las rutas que las piden: sin ellas darían 400 y no probarían nada. */
const QUERY: Readonly<Record<string, string>> = { 'GET /api/races/:raceId/stages/:day/broadcast/chunk': '?fromDs=0&toDs=9000' }
/** Lo que no se barre, con su motivo. */
export const SKIP: ReadonlyMap<string, string> = new Map([['GET /api/auth/*', 'better-auth: la cuenta, ningún dato de carrera']])
/** Lo que B1b no barre además (§11.18): el velo mismo, y la etapa velada, que antes de correrse da el plan o un 404 y después la puerta. Las vigilan B1a y B1c. */
export const B1B_SKIP: ReadonlyMap<string, string> = new Map([
  ...SKIP,
  ['GET /api/me/horizon', 'el velo mismo: cambia al correrse la etapa por construcción'],
  ['GET /api/races/:raceId/stages/:day', 'la etapa velada: el plan antes, la puerta después (B1a, B1c)'],
  ['GET /api/races/:raceId/stages/:day/broadcast', 'ídem: 404 antes, la cabecera con `watch` después'],
  ['GET /api/races/:raceId/stages/:day/broadcast/chunk', 'ídem: 404 antes, 403 `not_seen` o el tramo después'],
  ['GET /api/races/:raceId/stages/:day/report', 'ídem: 404 antes, la puerta después'],
])

/** Todas las GET del registro, con cada combinación de parámetros. La clave es `${ruta} ${url}`. */
export async function sweep(w: SpoilerWorld, who: 'player' | 'anon', skip: ReadonlyMap<string, string> = SKIP): Promise<Map<string, Swept>> {
  const out = new Map<string, Swept>()
  for (const [route, r] of w.app.spoilerRegistry) {
    if (r.method !== 'GET' || r.origin === 'static' || skip.has(route)) continue
    let urls = [r.url]
    for (const [, name] of r.url.matchAll(/:([A-Za-z]+)/g)) {
      const values = PARAM[name!]?.(r.url, w)
      if (values === undefined) throw new Error(`barrido: ${route} pide :${name}, que el mundo de B1 no sabe rellenar`)
      urls = urls.flatMap((u) => values.map((v) => u.replace(`:${name}`, encodeURIComponent(v))))
    }
    for (const url of urls) {
      const res = await w.app.inject({ method: 'GET', url: url + (QUERY[route] ?? ''), headers: who === 'player' ? { cookie: w.cookie } : {} })
      out.set(`${route} ${url}`, { status: res.statusCode, body: res.body })
    }
  }
  return out
}
export const routeOf = (key: string): string => key.split(' ').slice(0, 2).join(' ')
export const pendingFor = (key: string, bank: Bank): boolean => PENDING_ROUTES.get(routeOf(key))?.banks.includes(bank) ?? false
/** Un 5xx no es una respuesta igual ni distinta: es un banco que no ha mirado. Cada B1 tiene un `it` que exige esta lista vacía. */
export const serverErrors = (bodies: ReadonlyMap<string, Swept>): string[] => [...bodies].filter(([, r]) => r.status >= 500).map(([k]) => k)

/** Quita del cuerpo los campos de la lista blanca. Un cuerpo que no es JSON se compara tal cual. */
export function strip(r: Swept, paths: readonly string[]): string {
  if (paths.length === 0) return `${r.status} ${r.body}`
  let v: unknown
  try { v = JSON.parse(r.body) } catch { return `${r.status} ${r.body}` }
  const dropRows = (x: unknown, gone: (row: Record<string, unknown>) => boolean): void => {
    if (Array.isArray(x)) for (let i = x.length - 1; i >= 0; i--) {
      const row: unknown = x[i]
      if (typeof row === 'object' && row !== null && gone(row as Record<string, unknown>)) x.splice(i, 1)
    }
  }
  const drop = (x: unknown, p: readonly string[]): void => {
    if (p.length === 0 || x === null || typeof x !== 'object') return
    const [head, ...tail] = p as [string, ...string[]]
    if (head === '[]') { if (Array.isArray(x)) for (const y of x) drop(y, tail); return }
    if (head === '[veiledDay]') return dropRows(x, (row) => row.gameDay === dayOf(VEILED))       // la fila del día de la etapa velada, entera
    if (head === '[stageReady]') return dropRows(x, (row) => row.kind === 'stage_ready')          // el marcador de §11.7
    if (head === '[toWatch]') {                                                                     // la cuenta de etapas por ver de §11.6, punto 2
      if (Array.isArray(x)) for (const row of x) if (typeof row === 'object' && row !== null && (row as { raceId?: unknown }).raceId === RACE_ID) delete (row as Record<string, unknown>).stagesToWatch
      return
    }
    if (tail.length === 0) delete (x as Record<string, unknown>)[head]
    else drop((x as Record<string, unknown>)[head], tail)
  }
  for (const p of paths) drop(v, p.split('.'))
  return `${r.status} ${JSON.stringify(v)}`
}

/**
 * Lo que difiere entre dos bases por construcción y no por la etapa: uuid aleatorios, por orden de aparición; marcas de tiempo;
 * y la cuenta atrás de `/health`, que sale de la hora real de creación del mundo (`nextTickAtMs`, routes/health.ts l. 20-27).
 */
export function normalize(s: string): string {
  const seen = new Map<string, string>()
  return s
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g, '<t>')
    .replace(/"nextTickAtMs":\d+/g, '"nextTickAtMs":<t>')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, (id) => {
      if (id.startsWith(FIXED)) return id                     // los ids fijos son los mismos en las dos bases
      if (!seen.has(id)) seen.set(id, `<id${seen.size}>`)
      return seen.get(id)!
    })
}
```

`runOneStage`, `StageRunSpec`, `timelineTickLog` y `TimelineTickLog` se exportan desde `packages/db/src/index.ts` para esto (hoy `runOneStage` no se exporta; lo importa `abandon.test.ts` por ruta relativa, l. 17), y `clearHorizonCaches` y `clearStageTimelineCache`, solo para los tests, desde `horizon.ts` (§10.6) y `timelines.ts` (§5.6); `clearAdaptedTimelineCache` la exporta `apps/api/src/broadcastSource.ts` (§14.4). La etapa 1 de `race-france` es una crono, así que el mundo de B1 cubre también la cabecera y los tramos de una crono en las etapas conocidas.

Cinco cosas del mundo que no se ven en el código y lo sostienen. **La fila de cada etapa**: desde 5-l, `runOneStage` no escribe la fila de `stage_timelines`, la deja en el diario del tick y la escribe `flush`, que `runTick` llama detrás del día (§5.5); por eso `runStage` crea un diario por etapa y llama a `flush` en la misma transacción, porque sin él las tres etapas quedarían sin fila y la cabecera y los tramos saldrían del adaptador de la radio (D-07) sin que ningún B1 lo notara (cruzada de L3, Rcoste-006). **Una sesión** (`DB_POOL_MAX=1`): sin ella, medido por el refutador de código con el código de hoy (`rcod/n/b1/dbg500.mjs`: este mundo rehecho con `runOneStage`, `createAuth` y `buildApp` de los `dist`, y `app.inject`), `GET /api/races/race-france/stages/2` y `/3` responden 500 `interno` con `ECONNRESET` en las tres corridas, y con la variable, 200; lo mismo vale para los otros tests que piden la ruta de etapa de una etapa corrida sobre PGlite (`yesterday.test.ts`, §14.7, y `routes/broadcast.test.ts`), que ponen la misma línea. **Las cachés del horizonte**: el memo de `computeHorizon` y el mapa de `lastRunStages` van por el día de juego (§10.6, §10.7), que en B1b es el mismo antes y después de correr la etapa; sin `clearHorizonCaches` el barrido de después recibiría el horizonte de antes, con el velo vacío, y la etapa 3 se serviría entera. **Las LRU de líneas**: van por carrera y etapa, sin mundo, y B1c monta dos mundos con la misma carrera en el mismo proceso; por eso `startSpoilerWorld` vacía las dos al montarse (Rcodigo-086). **La cuenta de etapas por ver**: `[toWatch]` quita `stagesToWatch`, el número de etapas veladas que la fila de una carrera en `GET /api/riders/:id/results` lleva desde el 8a (§11.6, punto 2), cuyo nombre y esquema fija §14.2.

**B1a, entero.** Los valores canario van en campos que solo escribe el desenlace de la etapa y que la API sirve: el tiempo del ganador en `stage_results` (lo sirven la ruta de etapa y la del acta, `tiempoS`, `contracts.ts` l. 1290); un premio del día en `transactions`, que se INSERTA para el corredor del jugador, porque `awardRacePrizes` solo apunta premios a corredores humanos (`packages/db/src/economy.ts` l. 149, 164 y 180) y el ganador casi nunca es el del jugador (medido por el refutador de código con este mundo rehecho con el código de hoy, `rcod/n/b1/mundo.mjs`: con `b1a-base` y `b1a-velada` gana el 08 y `OWN_RIDER` llega 4.º, y el día de la etapa 3 no hay ninguna fila en `transactions`; igual con otras cinco semillas); los puntos del día en `rider_points`; el `detail` del palmarés del día (`getPalmares` lo sirve, `packages/db/src/ranking.ts` l. 336-348); y la etapa de las noticias del día en `news.data`, que el render de §12.8 convierte en «stage 97». No sirven los ids, que eran el canario de noticias y palmarés: ni `NewsItem` (`packages/db/src/news.ts` l. 51-64), ni `newsItemSchema` y `teamNewsItemSchema` (`contracts.ts` l. 787-799 y 705-709), ni las ampliaciones de §14.2, ni `getPalmares` llevan `id`, así que ese canario no saldría nunca. No se busca el nombre del ganador en las respuestas JSON, porque sale con razón en la lista de salida y en el reparto; eso es B1c. Sí se busca en el título, las `og:` y el correo, que no llevan ninguna lista (§11.8, §11.9).

```ts
// apps/api/src/spoilerCanary.test.ts (nuevo, paso 7): B1a (§16.3). Suite rápida.
import { anonHorizon, computeHorizon } from '@cyclingstar/db'
import { pageTitle } from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { stageReadyEmail } from './emails.js'
import { preStageInfoFor, shellMetaFor } from './spaShell.js'
import { OWN_RIDER, PENDING_ROUTES, RACE_ID, RACE_KEY, VEILED, type SpoilerWorld, type Swept, dayOf, pendingFor, routeOf, serverErrors, startSpoilerWorld, sweep } from './__fixtures__/spoilerWorld.js'

/** EL CANARIO: valores que solo existen en el desenlace de la etapa velada, en campos que la API sirve. Se plantan tras correrla. */
const CANARY = { timeS: 31337, money: 424242, points: 7373, word: 'c0ffee00', stageDay: 97 } as const
const TOKENS: readonly RegExp[] = [/(?<![0-9])31337(?![0-9])/, /(?<![0-9])424242(?![0-9])/, /(?<![0-9])7373(?![0-9])/, /c0ffee00/, /stage 97\b/]

async function plantCanary(w: SpoilerWorld): Promise<void> {
  const day = dayOf(VEILED)
  // el tiempo del ganador: la ruta de etapa y la del acta
  await w.t.client`update stage_results set tiempo_s = ${CANARY.timeS} where race_id = ${RACE_KEY} and stage_day = ${VEILED} and puesto = 1`
  // un premio del día, insertado: awardRacePrizes solo paga a humanos (economy.ts l. 149-180); lo sirve /api/riders/me/ledger.
  // Desde el 8a la fila lleva además race_key y stage_day (la 0046); sin ellos, el velo la casa por game_day (10-d).
  await w.t.client`insert into transactions (rider_id, game_day, kind, amount, note) values (${OWN_RIDER}, ${day}, 'premio', ${CANARY.money}, 'Race France · stage win')`
  // los puntos del día: solo salen sumados (ranking.ts l. 184), así que 7373 solo cae si son los únicos del corredor en la ventana
  await w.t.client`update rider_points set points = ${CANARY.points} where game_day = ${day}`
  // el palmarés del día: /api/riders/:id/palmares sirve `detail`
  await w.t.client`update palmares set detail = ${`Stage ${CANARY.word}`} where game_day = ${day}`
  // las noticias del día: se redactan de `data` al leer (§12.8); una etapa imposible sale como «stage 97»
  await w.t.client`update news set data = jsonb_set(data, '{stageDay}', ${String(CANARY.stageDay)}::jsonb) where game_day = ${day} and data ? 'stageDay'`
}
const leaking = (bodies: ReadonlyMap<string, Swept>): string[] =>
  [...bodies].filter(([, r]) => TOKENS.some((t) => t.test(r.body))).map(([k]) => k)

describe('B1a · el canario', () => {
  let w: SpoilerWorld
  let winnerName = ''
  beforeAll(async () => {
    w = await startSpoilerWorld('b1a-base')
    await w.runVeiled('b1a-velada')
    await plantCanary(w)
    const winner = await w.winner()
    w.extraRiders.push(winner)                               // su ficha es la que más tendría que contar
    winnerName = (await w.t.client<{ name: string }[]>`select name from riders where id = ${winner}`)[0]!.name
  }, 300_000)
  afterAll(async () => { await w?.close() })

  it('ninguna respuesta le cuenta el desenlace a quien no ha visto la etapa', async () => {
    const leaks = leaking(await sweep(w, 'player'))
    expect(leaks.filter((k) => !pendingFor(k, 'B1a'))).toEqual([])
  })

  it('ninguna respuesta del barrido es un 5xx: un 500 no cuenta ni destripa, es un banco que no ha mirado', async () => {
    expect(serverErrors(await sweep(w, 'player'))).toEqual([])
  })

  it('cada ruta pendiente de B1a sigue destripando; si ya no, se quita de PENDING_ROUTES', async () => {
    const leaks = new Set(leaking(await sweep(w, 'player')).map(routeOf))
    const stale = [...PENDING_ROUTES].filter(([route, p]) => p.banks.includes('B1a') && !leaks.has(route)).map(([route]) => route)
    expect(stale).toEqual([])
  })

  it('ni el título, ni las og:, ni el aviso llevan al ganador; el robot sin cookie sí lo ve en el acta, marcado', async () => {
    const h = await computeHorizon(w.t.db, { userId: w.userId, readOnly: false }, { worldId: w.worldId, currentDay: dayOf(VEILED) })
    const watch = new URL(`/world/races/${RACE_ID}/stages/${VEILED}`, 'http://localhost')
    const report = new URL(`/world/races/${RACE_ID}/stages/${VEILED}/report`, 'http://localhost')
    for (const url of [watch, report]) expect(JSON.stringify(await shellMetaFor(w.t.db, h, url))).not.toContain(winnerName)
    expect(JSON.stringify(await shellMetaFor(w.t.db, anonHorizon(), report))).toContain(winnerName)    // no vacío (DD-12)
    const info = await preStageInfoFor(w.t.db, RACE_ID, VEILED, 0)
    expect(info).not.toBeNull()
    expect(JSON.stringify(stageReadyEmail('en', info!, true, watch.href))).not.toContain(winnerName)            // el locale delante (12-q)
    for (const page of ['watch', 'report', 'race'] as const) expect(pageTitle('en', info, page)).not.toContain(winnerName)
  })

  it('no es vacío: con la etapa vista, el canario sale en cinco rutas o más, de las seis que lo llevan', async () => {
    await w.reveal()                                           // el último: deja la etapa conocida
    expect(new Set(leaking(await sweep(w, 'player')).map(routeOf)).size).toBeGreaterThanOrEqual(5)
  })
})
```

Con la etapa vista, las rutas que devuelven el canario son seis: la ruta de etapa y la del acta (el tiempo del ganador), `/api/news` y `/api/teams/:id/news` (la noticia de la etapa, «stage 97»), `/api/riders/:id/palmares` del ganador (el `detail`) y `/api/riders/me/ledger` (el premio insertado); el umbral de cinco deja una de margen. No lo llevan la ficha del ganador ni `/api/riders/:id/results`: `getPublicRider` no trae palmarés ni tiempos (`packages/db/src/browse.ts` l. 269-322) y `getRiderRaceResults` solo selecciona carrera, etapa y puesto (`packages/db/src/riderResults.ts` l. 190-196). Los puntos del día solo salen sumados (`ranking.ts` l. 184) y cuentan como canario de propina. Los totales no sirven de canario, porque una suma no conserva el número: una general que deje ver la etapa velada la caza B1c. El barrido es de `GET`: las dos rutas `horizon` que no lo son, `POST /api/riders/me/plan/preview` (`sup. X10`) y `POST /api/riders/me/races/:raceKey/retire` (`sup. X9`), piden cuerpo o escriben, y las prueban `abandon.test.ts` y el resto de la tabla de §11.19.

**B1b.** El barrido del jugador con el mundo en el día de la etapa 3, antes y después de correrla (tras `runVeiled`, que vacía las cachés del horizonte porque el día no cambia), con `sweep(w, 'player', B1B_SKIP)` y `strip` de `B1B_WHITELIST` y `B1B_VEIL` juntas: ninguna clave puede cambiar fuera de las dos tablas de §11.18, ni aunque el cambio parezca inocente (§11.18 da los casos: el ranking, la salud de un corredor ajeno, el orden de una lista). La primera tabla son los campos de las rutas L que cambian al correrse una etapa, con su motivo; la segunda, lo que cambia SOLO porque el velo del jugador pasa de vacío a la etapa velada y que §11.6 quiere que cambie (el `stage_ready` de las noticias, la cuenta de etapas por ver de los resultados, `ready` de `last-race` y las sesiones del informe del bloque, que cuenta el día velado con la actividad de su etapa, 11-e: medido por el refutador de código con el código de hoy, `report.sessions` pasa de 2 a 3 entradas, `rcod/n/b1/sweep.mjs`). Sin ella, B1b no podría pasar con el diseño correcto. `B1B_SKIP` saca del barrido `GET /api/me/horizon`, que es el velo mismo, y las cuatro rutas de la etapa velada, que antes de correrse dan el plan o un 404 y después la puerta: las vigilan B1a y B1c. Las tres constantes son §11.18 y nada más (esta sección las copia fila a fila y en el mismo orden, sin añadir), y un `it` comprueba que cada ruta de `B1B_WHITELIST` está en `app.spoilerRegistry` con L y su `why`: la lista no puede crecer con una ruta que §11.18 no justifique. La fila de `/api/riders/me/form` se escribe con `[veiledDay]` porque la fila del día de la etapa no cambia, aparece (`getDailyLog`, `packages/db/src/riders.ts` l. 322-342, devuelve las filas que haya), y quitarle los campos uno a uno dejaría una fila de más. Un `it` exige que ningún barrido tenga un 5xx (`serverErrors`). No vacío: tras `reveal()`, diez rutas o más cambian respecto del barrido de antes. Otro `it` es el de §11.19: una segunda cuenta ve la etapa entera y la revela, y el barrido de la primera no cambia un byte, porque lo visto es privado (§11.14). El diferencial caza lo que no es un valor: que exista una fila, que un aviso diga dos etapas ocultas cuando el velo solo ganó una, que una lista cambie de orden.

**B1c, entero.**

```ts
// apps/api/src/spoilerOutcomes.test.ts (nuevo, paso 7): B1c (§16.3). Suite rápida.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { B1C_WHITELIST, PENDING_ROUTES, type SpoilerWorld, normalize, pendingFor, routeOf, serverErrors, startSpoilerWorld, strip, sweep } from './__fixtures__/spoilerWorld.js'

/** Dos semillas de la etapa velada con ganadores distintos: lo comprueba el primer test; si el motor los iguala, se eligen otras. */
const SEEDS = ['b1c-uno', 'b1c-dos'] as const

describe('B1c · dos desenlaces, los mismos bytes', () => {
  const worlds: SpoilerWorld[] = []
  beforeAll(async () => {
    for (const seed of SEEDS) {                              // una base cada uno, en serie (PGlite: una sesión por base, testDb.ts l. 15-19)
      const w = await startSpoilerWorld('b1c-base')          // la misma historia: mundo, ids y etapas 1 y 2 con la misma semilla
      await w.runVeiled(seed)
      worlds.push(w)
    }
  }, 600_000)
  afterAll(async () => { for (const w of worlds) await w.close() })

  it('los dos mundos acaban la etapa con ganadores distintos (si no, el banco no prueba nada)', async () => {
    const [a, b] = worlds as [SpoilerWorld, SpoilerWorld]
    expect(await a.winner()).not.toBe(await b.winner())
  })

  it('quien no ha visto la etapa recibe lo mismo, byte a byte, en todas las rutas', async () => {
    const [a, b] = worlds as [SpoilerWorld, SpoilerWorld]
    const [ra, rb] = [await sweep(a, 'player'), await sweep(b, 'player')]
    expect([...serverErrors(ra), ...serverErrors(rb)]).toEqual([])        // dos 500 iguales no prueban nada
    expect([...ra.keys()]).toEqual([...rb.keys()])
    const differ = [...ra.keys()].filter((k) => {
      const paths = B1C_WHITELIST.get(routeOf(k)) ?? []
      return normalize(strip(ra.get(k)!, paths)) !== normalize(strip(rb.get(k)!, paths))
    })
    expect(differ.filter((k) => !pendingFor(k, 'B1c'))).toEqual([])
    const still = new Set(differ.map(routeOf))
    expect([...PENDING_ROUTES].filter(([route, p]) => p.banks.includes('B1c') && !still.has(route)).map(([route]) => route)).toEqual([])
  })

  it('no es vacío: el visitante sin cuenta, que no tiene nada velado, ve dos carreras distintas en cinco rutas o más', async () => {
    const [a, b] = worlds as [SpoilerWorld, SpoilerWorld]
    const [ra, rb] = [await sweep(a, 'anon'), await sweep(b, 'anon')]
    const differ = [...ra.keys()].filter((k) => normalize(strip(ra.get(k)!, [])) !== normalize(strip(rb.get(k)!, [])))
    expect(new Set(differ.map(routeOf)).size).toBeGreaterThanOrEqual(5)
  })
})
```

La lista blanca de B1c es la primera de B1b (no la del velo: los dos mundos tienen el mismo) más el tiempo de la cabecera, y `normalize` quita además la cuenta atrás de `/health` (`nextTickAtMs`, `routes/health.ts` l. 20-27), que sale de `worlds.created_at`, la hora real a la que se creó cada base: medido por el refutador de código con las dos bases de B1c (`rcod/n/b1/sweep.mjs b1c`), `GET /health` difiere solo en eso, y B1c nacía en rojo por el reloj de pared. El motivo es de construcción, no de producto: para que el desenlace cambie hay que cambiar la semilla de la etapa, y esa semilla también decide el tiempo del día (`stageWeather(seed, input.lugar)`, `packages/engine/src/stage/simulate.ts` l. 1483), que en una carrera de verdad se sabe antes de la salida. El parte de la ficha de carrera, en cambio, sale de la semilla del MUNDO (`routes/races.ts` l. 326-339) y es el mismo en las dos bases.

**B1d.** `spoilerRegistry.test.ts` construye la app con base (como `adminPanel.test.ts`) y escribe, literal, la tabla de §11.3: `${método} ${url}` con su `SpoilerPolicy` y su `VeilSpec`. Compara en los dos sentidos (ni sobra ni falta una ruta, ni cambia una política o un mecanismo), comprueba que toda `L` lleva su `why`, y que cada ruta `HEAD` registrada tiene un `GET` con la misma `url` y el mismo `config`, sin fijar cuántas son: Fastify 5.11.2 crea una por cada ruta con `GET`, también el comodín `GET, POST` de `/api/auth/*` (medido por L6, §14.5, y por el refutador de código, `rcod/n/head.mjs`), así que son 53 hoy y 57 con los cuatro `GET` nuevos de §14.2 (la cabecera, el tramo, el acta y `GET /api/me/horizon`), y un `toHaveLength(53)` nacería en rojo. Un segundo `it` registra en una app de prueba una ruta sin `config.spoiler` y espera que `ready()` rechace con el mensaje de `registerSpoilerGuard` (`ruta sin política de destripe`), que es lo que impide arrancar en producción (§14.5). Clasificar una ruta nueva obliga a tocar la tabla del test, y el diff lo enseña en la revisión.

### 16.4 B2 a B22, uno a uno

Cada banco con su enunciado (el de la tabla de §16.9), cómo se mide, sobre qué, en qué suite, con qué umbral y en qué paso nace. «Rápida» es `pnpm test:rapido`, en todo PR; «banco» es un tramo de `ci.yml`, solo si el PR toca `packages/engine/`, y el nocturno; «a mano» es un script que se corre en el paso que se dice y cuya cifra va en la descripción del PR.

- **B2 · el estado contra los sucesos.** Para cada `front_group`, `time_gap`, `breakaway_formed`, `breakaway_caught`, `peloton_split` y `peloton_selection`, lo que dice el suceso contra `instantAt(revealS)`: los protagonistas de `front_group` y `breakaway_formed` son el grupo 1 (o están en él); en `breakaway_caught`, los cazados van en el grupo del cazador; el `gapS` de `time_gap` casa con `mainGap.gapS` si la pareja es la misma; tras un `peloton_split` o un `peloton_selection` hay más grupos de más de tres que antes. Umbrales (sin evidencia de los jueces): 0 contradicciones en pertenencia; en huecos, |diferencia| ≤ 15 s en el 95 % (el suceso lee el reloj de su bloque y el instante el del último km de foto, §4.5). Banco: `packages/engine/src/sim/timeline.test.ts` en las 24 × 2; rápida: `apps/api/src/broadcastFixtures.test.ts`. Nace en el 6a, que lo mide (la versión de banco de `timeline.test.ts` entra antes, en el 4b, con todo lo de E2 bajo `packages/engine/`: decisión 17-i), y si una familia no llega, se escribe la cifra medida con su causa en lugar del umbral, nunca en silencio (I-02 criticaba justo eso: «sella lo medido» sin listón).
- **B3 · el rótulo y los maillots de la fuga** ([DUEÑO 3]: «cuando se escapan cinco, que se vean sus maillots», `docs/encargos.md` l. 153-154). Dos partes, las dos con umbral de 100 %. **La primera, el rótulo.** Cada 30 s de carrera, en cada grupo del instante de hasta `BROADCAST.nameWholeGroupUpTo` (12) corredores, `namedRidersOf` (§7.7) nombra a TODOS (`others = 0`), y cada nombrado tiene su `RiderCard` en la cabecera con el maillot llevado resuelto: `worn.kind` `leader` con su `jersey`, `champion` con su `ChampionTitle`, o `team` con `team` no nulo (la equipación del día; el corredor sin equipo lo dice con `team: null`); en los mayores, `named.length + others = size`. Cláusula de no vacío (regla 1 de arriba): sobre la primera fuga de 3 a 12 corredores de cada etapa en línea congelada, una cabecera sintética da a su primer escapado por dorsal un `ChampionTitle` vigente (el de Italia, con `source` en una etapa corrida) y al segundo el maillot de líder de la montaña, y el `break_presented` de esa fuga, el que el reproductor programa en cuanto sale su `break_formed` (§6.5, 6-i), tiene que llevar a los dos en `named`, con una frase de `breakHeadline('en', cards, own)` que los nombra por su título (`The mountains leader and the champion of Italy go clear with …`, §7.6); si no, B3 falla. Antes el umbral era «el 100 %, que la política da por construcción», y `named.length + others = size` lo cumple también una política que no nombre a nadie: una fuga de cinco con el campeón contado entre `others` pasaba (Rcobertura-051). Rápida, en `apps/api/src/broadcastFixtures.test.ts` sobre las seis etapas congeladas, con la cabecera que arma la ruta (§14.2). **La segunda, la presentación de la fuga** (6-m, §6.7), en `apps/web/src/domain/broadcast/breakPresentation.test.ts`, rápida, porque la cola de rótulos es del reproductor (§6.5): lee los fixtures de `apps/api/src/__fixtures__/broadcast/`, como `templateCoverage.test.ts` lee el motor, y corre el reproductor de verdad sin navegador (sus funciones puras: `cuesBetween`, la programación de §6.5, `admitir` y el fotograma de la cola, `isPresentation`, `aheadOfPeloton` y `breakRoundOf`) a 60 fotogramas por segundo de pared, con la cabecera que arma la ruta. Primero, una fuga de cinco con el campeón y el líder, revelada con la cola llena de rótulos de clase 1 y 2: en `Watch` a ×1 salen enteras la lista (`break_formed`, con el `worn` de los cinco), la frase y los cinco rótulos de la ronda (`rider` con `break_round`, por dorsal, cada `breakRoundEveryS`), ninguno descartado; a ×4 y en `Highlights`, la lista y la frase, sin ronda. Después, las cinco etapas en línea congeladas, en `Watch` a ×½, ×1 y ×2 y en `Highlights` a ×1, con umbral de 100 % en las cinco: (1) la lista y la frase de toda fuga salen enteras, salvo que no quede ningún escapado por delante del pelotón cuando les toca; (2) en `Watch` a ×½ y ×1, todo escapado de `breakRoundOf` que sigue por delante del pelotón cuando le toca tiene su rótulo entero antes de dejar de estarlo; (3) ningún rótulo de la ronda empieza cuando su corredor ya no va por delante del pelotón (`aheadOfPeloton`), porque lo han cazado o se ha quedado (6-m). Imprime, sin umbral, la ronda a ×2, lo que sale entero del resto de la cola por clase y el retraso del último rótulo de cada ronda sobre su hora prevista (`breakRoundEveryS` por su puesto en la ronda): como mucho 36 s de pared a ×1 en las 44 corridas, así que el tope de 30 s que proponía Rcobertura-023 fallaría por seis segundos en el peor caso sin que se perdiera ningún rótulo. Medido por L4 con la cola de §6.5 y el prototipo del grabador (`l4c/cola.mjs`, `cola3.json`): en las congeladas, 5 de 5 listas y frases en todos los modos y 21 de 21 rótulos a ×½ y a ×1 (20 de 21 a ×2), contra 9 de 21 rótulos y 2 de 5 frases con la cola de antes; en las 22 en línea por dos semillas, 33 de 34 listas y frases y 157 de 158 rótulos a ×1 (la fuga que falta vivió un segundo de pared, §6.7). A mano en el paso 10, lo mismo sobre las 24 × 2 con la línea grabada, con umbral del 99 % en (2) (cruzada de L4, Rcobertura-023 y Rdueno-003). Las dos partes nacen en el 6b.
- **B4 · el re-render.** La noticia, la línea de la voz y la del acta se redactan igual desde `seed + data`: los trece goldens de `packages/shared/src/news.test.ts`; en `packages/db/src/news.test.ts`, que lo leído es lo escrito, fila a fila (§12.8); y en la web, que cada `ChronicleEntry` de las actas congeladas (`<etapa>.acta.json.gz`) da la misma frase dos veces y en dos procesos (`apps/web/src/domain/stageJournal.corpus.test.ts`). Umbral: igualdad exacta. Rápida; nace en el 1a (noticias) y en el 6b (voz y acta). Los tests de la web que leen ficheros o lanzan procesos (este, `templateCoverage.test.ts`, `clientCost.test.ts` y `breakPresentation.test.ts`) empiezan por `/// <reference types="node" />`: `apps/web/tsconfig.json` no carga los tipos de Node (`"types": []`, l. 9), su `include` es `src` con los tests y `pnpm typecheck` lo compila; sin la directiva, `import { readFileSync } from 'node:fs'` da `TS2307` (medido por el refutador de código con ese tsconfig, `rcod/n/ws`), y con ella compila, porque `@types/node` se resuelve desde la raíz (`package.json`).
- **B5 · la estabilidad.** El `sha256` de todas las líneas de voz y de acta de las seis etapas congeladas y de los trece goldens de noticias, en `stageJournal.corpus.test.ts`: solo cambia con un re-sellado deliberado, y añadir una redacción con `since` nuevo no lo mueve (§12.7). Rápida; se sella UNA vez en el paso 12, tras la semilla neutra.
- **B6 · el tamaño.** Lo guardado contra `TIMELINE.maxStoredBytes`, `maxJsonBytes`, `medianJsonBytes` y `ttMaxStoredBytes` (§15.2, D-11): el `bytea` con gzip 9, en el banco sobre las 24 × 2 y sobre la crono más larga de 176 corredores del calendario (`timeline.test.ts`, decisión 16-n) y en la rápida sobre los seis `<etapa>.timeline.gz` (`broadcastFixtures.test.ts`); el JSON de `encodeTimeline`, con sus dos topes, falla en la rápida sobre las seis congeladas (el `.timeline.gz` descomprimido) y en el nocturno sobre las 24 × 2 (`CS_BANCOS=1`), y en el tramo «mundo y radio» de un PR imprime las cifras sin fallar: la mediana tiene un 15 % de margen sobre lo medido y una misma etapa cambia hasta un 20 % con la semilla (§5.7), así que un paso de la táctica que haga las carreras más movidas no se pone en rojo por un umbral de E2 que no decide lo que se graba (15-g); el PR que la mueva lo apunta en su descripción y el nocturno lo caza esa misma noche (cruzada de L3, Rcoste-008). El motor no comprime en su código, pero sus tests sí pueden: `gzipSync` de `node:zlib` al nivel `TIMELINE.gzipLevel`, importado con `// eslint-disable-next-line @typescript-eslint/no-restricted-imports`, como ya hacen los tests del motor que leen ficheros (`packages/engine/src/routes/arranque.test.ts` l. 3-6, `grammar/motifs.test.ts`, `regions.test.ts` y `veto.test.ts`); la regla de `eslint.config.js` l. 101-127 protege el código del motor, no sus tests, y `@types/node` llega al motor desde la raíz. Como `timeline.test.ts` corre en el tramo «mundo y radio» en todo PR que toca el motor y en el nocturno, el tope del `bytea` vigila lo que graba el motor de cada día, y no una medida a mano del paso 5 que la táctica podía dejar atrás sin que nada se pusiera en rojo (Rcodigo-065, Rcoste-025). Las 24 etapas se corren con la entrada de `realRaceScenario` más el `timeTrial` del calendario, que `realRaceScenario` no pone (B11). La crono larga la elige el test en `SEASON_CALENDAR` entre las carreras de 176 corredores fuera de los nacionales (hoy `race-italy` e10, 42 km: 31.436 B sin `checkClockDs` y 32.203 con él, contra los 49.152 de `ttMaxStoredBytes`, 15-i, §9.2), porque ninguna de las 24 pasa de 26 km. Lo servido, con gzip 6 como `@fastify/compress` (§14.8), contra los topes de red de `BROADCAST` (§15.3; sin evidencia de los jueces): `maxHeadGzipBytes` (16.384), `maxChunkGzipBytes` (12.288), `maxFinishGzipBytes` (40.960), `maxVeiledStageGzipBytes` (4.096) y `maxKnownStageGzipBytes` (112.640: 110 KB, el máximo medido de la ruta de etapa de hoy con gzip, 100,1 KB en la e20, más un 10 %), con `app.inject` en la rápida: la cabecera y los tramos sobre las seis, cargadas en PGlite por `broadcastFixtures.test.ts`; el paquete de meta y la ruta de etapa, velada y conocida, sobre la etapa corrida de `routes/broadcast.test.ts` (§14.7), que tiene resultado, general y noticias. La ruta de etapa conocida, la que piden `Report` y `Race Radio`, es la respuesta más pesada de todas, y sin tope nadie vería su regresión (Rcobertura-052). Esa etapa corrida es solo la prueba de humo: el paquete de meta y la ruta conocida crecen con los corredores y con el acta, y la que decide sus topes es una reina de 176 al final de una gran vuelta, así que en el paso 6 se miden además a mano sobre las 24 × 2 con `scripts/broadcast-fixtures.mjs --sizes` y el máximo va a §18.10 (Rcoste-024). L7 midió la cabecera en 7,1-9,0 KB y el tramo mayor en 4,72 KB con gzip (§18.1): caben con holgura. Nace en el 0 como línea base de la ruta de hoy (medida: de 0,87 a 2,95 MB de JSON y de 22,2 a 100,1 KB con gzip en las 22 etapas en línea del banco, mapa 07 §7; el mapa 02 §7 midió de 0,95 a 2,16 MB en cuatro), en el 4b con lo guardado en el banco, en el 5 con lo guardado de las seis congeladas (`broadcastFixtures.test.ts`, 17-u), en el 6a con lo servido y en el 7b con la ruta de etapa velada. Los topes de D-11 están fijados sobre lo que midió L3 (§5.7): la línea guardada ocupa de 20,9 a 70,0 KB (mediana 38,8, p90 53,3) contra 96 KB, el JSON de 123 a 464 KB (mediana 222) contra 640 KB y 320 KB de mediana (15-l), y las cronos de 176 corredores del banco (20 y 26 km) de 18,8 a 24,2 KB y la más larga del calendario 32,2 KB, contra 48 KB. Con los de la síntesis (48, 128, 64 y 16 KB) B6 habría nacido en rojo. Los topes son umbrales de banco, no de escritura (15-g), así que nada se pierde en producción.
- **B7 · la cobertura.** `apps/web/src/domain/templateCoverage.test.ts` recorre con el AST de TypeScript (la dependencia `typescript` de la raíz) las llamadas a `log.emit` de `simulate.ts` y `timetrial.ts` y la inserción de `events.ts`, recoge la plantilla solo en posiciones de valor (literal y ramas de un ternario; si encuentra una calculada, falla), y exige que el conjunto sea el escrito en el test (54, medido en `l8/plantillas.mjs`: 44 de carretera, `rider_defies_team` y 13 de la crono, cuatro compartidas) más `crash`; que cada una tenga fila en `CUE_OF_TEMPLATE` y la regla de revelado que el test tiene escrita (la de `REVEAL_RULES` o `TT_REVEAL_RULES`, o la de por defecto, apuntada a propósito), y que `chronicleLine` dé una frase no vacía para un suceso sintético de cada una, con sus datos mínimos. Una plantilla nueva del motor pone este test en rojo hasta que tiene frase, rótulo y regla. Lo que la voz servida puede decir de los grupos lo vigila `stageJournal.test.ts` (l. 1624 y 1646) con los casos del 6b, cada plantilla de `MAIN_GROUP_TEMPLATES` con los cuatro papeles de `mainRole` y los tres maillots de `mainJersey`, y `crash` con los de `groupRole` y `groupJersey`: la unión queda dentro de los siete nombres de D-18 y 6-b, y cada frase dentro de su fila de `GROUP_NOUNS`; `coherence.test.ts` solo mira lo que emite el motor, y el 4a lo re-sella con el tope de seis (§12.6, Rdueno-019 y Rdueno-017). Lee ficheros del motor, así que lleva `/// <reference types="node" />` (B4). Rápida, porque vive en la web aunque lea el motor; nace en el 6b.
- **B8 · el cliente.** `apps/web/src/domain/broadcast/clientCost.test.ts`, en Node: `JSON.parse` y `safeParse` del tramo mayor y de la cabecera de las seis etapas congeladas, y `instantAt`, con el paso 9 de §4.5 implementado y memorizado por `(g, k_g)`, sobre dos muestras: todos los fotogramas de las seis a pasos de 1 s de carrera, como `Watch` de ×1 a ×60, con el p95 sobre todos, y aparte los 600 seguidos del tramo de más grupos vivos de la e20, con el p95 de esos 600. Umbrales fijos (decisiones 16-m y 18-l): mediana ≤ 2 ms el tramo mayor y ≤ 3 ms la cabecera; p95 de `instantAt` ≤ 0,25 ms en las dos muestras. Lo medido queda por debajo (§18.1): el tramo mayor, 0,54 ms; la cabecera, 0,71 ms; el fotograma con el memo, p95 de 0,034 a 0,042 ms sobre las seis y 0,053 ms en el tramo denso de la e20 (`corr-l7/instante-memo.mjs`); sin el memo del paso 9, 0,51 y 0,66 ms, y B8 falla, que es justo la regresión que existe para cazar. No se mide con los 600 primeros fotogramas, que tienen uno o dos grupos vivos y pasan sin memo (p95 de 0,04 a 0,18 ms, `coste/instante-first.mjs`; Rcoste-045), ni con 600 repartidos por la etapa, que el memo no aprovecha (§18.1). El umbral no se deriva nunca de la medida del mismo PR: si el `instantAt` de verdad del 6a no cabe, se optimiza antes de fusionar o se decide con la cifra en el PR; la regla de antes («si su p95 pasa de 0,05 ms, el umbral pasa a cinco veces lo medido») dejaba pasar cualquier coste, también el del paso 9 sin memo (Rcoste-021, 18-l). Dos medidas más con el mismo criterio, en Node y en la API: `withGroupRoles` sobre la línea entera de cada una de las cinco en línea congeladas, mediana ≤ 10 ms por etapa, en `apps/api/src/voicePrefix.test.ts`, que ya construye la voz como la ruta del tramo (sin evidencia de los jueces: estimado de 1 a 4 ms con el memo y hasta unos 40 sin él, §12.6; Rcoste-022); y `JSON.parse` más `stageReplaySchema.safeParse` de la ruta de etapa CONOCIDA, en `apps/api/src/routes/broadcast.test.ts` sobre su etapa corrida y desde el 6a (no en `clientCost.test.ts`, que es de la web y no tiene esa respuesta; §17.9), mediana ≤ 40 ms (la de hoy cuesta de 2,8 a 9,3 ms de parse y de 4,1 a 24,9 de Zod, 34,2 como mucho, `datos.md` §10.5, §14.8; Rcobertura-052). El móvil, con el factor de tres a cinco veces del mapa 07 (estimado), se mira a mano en el paso 10 (§18.5). Los umbrales de este y de los demás bancos se escriben una vez, aquí, y en el código viven en una sola constante del fichero de test que los usa, con su comentario de procedencia (decisión 16-v). Rápida; nace en el 6a, y la medida de `withGroupRoles`, en el 6b, con `voiceRoles.ts` (§17.9).
- **B9 · el corte causal** (I-10). Código abajo (`apps/api/src/broadcastCut.test.ts`). Umbral: igualdad exacta en las tres cláusulas. Rápida, en las seis etapas congeladas. Nace en el 3a, cuando los tramos salen del adaptador de la radio (§3.8): entonces `loadTimeline` construye la línea del adaptador con la radio y los sucesos del fixture; desde el 6a lee la grabada. La tercera cláusula de B9 (§4.6), que el ritmo no dependa de los sucesos, es de `player.test.ts` (§8.12, paso 3b): la misma línea con sus sucesos y sin ellos da la misma hora fotograma a fotograma. La igualdad de la segunda cláusula (`chunkOf(tl, from, to)` igual al tramo de la línea cortada en `to`) supone que `cutTimeline` corta sucesos y pancartas con el mismo `toDs` que `chunkOf` (`eventDs` y `bannerDs`, §4.6): si los cortara por `revealS ≤ toS`, un suceso del adaptador con `revealS` entre `to / 10` y `to / 10 + 0,05` s, que sale de un reloj estimado en coma flotante (§3.8), caería en un lado y no en el otro, y el test fallaría por un redondeo y no por una fuga (Rcodigo-077). Nada con visibilidad igual o mayor que `finishDs` va en un tramo (§4.6): el código lo comprueba en sucesos, marcas de reloj y pancartas, y en la crono en los pasos por km y por control, que la tercera cláusula junta aplanados (Rcodigo-088).
- **B10 · la foto por km y el aprendizaje** (I-12, X-10). Código abajo (`packages/db/src/timelineCollector.test.ts`). Umbral: igualdad byte a byte con la envoltura de hoy, y la ingenua tiene que cambiar el aprendizaje en alguna de las tres etapas rápidas (y, aparte, la radio guardada). Rápida con tres etapas y una semilla; las 22 en línea por dos semillas, en el nocturno, partidas en dos ficheros para que corran en paralelo (`timelineCollector.long1.test.ts` con las once primeras etapas y `long2` con el resto, 16-g). L3 midió 18 de 18 corridas iguales con el colector aparte y 6 de 18 rotas con la ingenua, sobre el campo de `juez-motor/campo.mjs` (§5.3); con el de `realRaceScenario` (176 corredores en 22 equipos, `uniformField`, `scenarios.ts` l. 491-509), que es el que corre B10, la ingenua cambia el aprendizaje en las 3 de 3 de la rápida (6, 1 y 2 corredores) y en 36 de 44 largas (hasta 30 corredores, `race-france` e15, semilla 0), y la radio guardada en todas (medido por el refutador de código con la réplica literal de `watch()`, `rc3/b10quick.mjs`). Por eso la cláusula de no vacío mira el aprendizaje sola: con el `||` de antes pasaba siempre por la radio, que la ingenua cambia por construcción al darle la foto de cada bloque (Rcodigo-076). Nace en el 4b.
- **B11 · observar no toca la carrera** (I-12, X-09). Código abajo (`packages/engine/src/sim/timeline.test.ts`). Umbral: la huella entera igual, con cada gancho llamado las veces que le tocan. Banco, tramo «mundo y radio» (15-d), doce etapas por dos semillas con seis cronos, que se corren como cronos con el `timeTrial` del calendario: `realRaceScenario` no lo pone (`scenarios.ts` l. 518-541; solo `timeTrialScenario` lo hace, l. 587-597), y sin él las «seis cronos» eran seis etapas en línea sobre un perfil de crono que no llamaban nunca a `onTimeTrialRide` (medido por el refutador de código con el `dist` v89, `rcod/n/rrs.mjs`: `input.timeTrial` indefinido y 0 sucesos `tt_*` en `race-france` e1 y e16, `race-colombia` e3 y `nc-es-itt`; Rcodigo-030). Más una prueba de humo en la rápida (`packages/engine/src/stage/probeHooks.test.ts`: una en línea y una crono), porque el grabador usa `packages/shared` y un cambio allí no dispara los bancos: nace en el 4a con ganchos que solo cuentan, porque el grabador aún no existe, y en el 4b engancha el grabador de verdad (`timelineRecorder`, como el código de abajo) con la huella de cuatro campos y las cuentas de ganchos, así que un cambio en `packages/shared/src/broadcast/` que haga al grabador tocar lo que el motor lee cae en la rápida del mismo PR (Rcodigo-091): `timeline.test.ts` solo corre si el diff toca `packages/engine/` o de noche, y B10, el otro test rápido con el grabador, compara la radio y el aprendizaje, no `results`, `events` ni `incidents`. Medido: 20 de 20 por el juez sin los ganchos (C5) y 24 de 24 por L3 con ellos (§5.1).
- **B12 · la aritmética del horizonte.** Los veinte casos de §10.14, uno por `it`, más los que piden §10.8 y §11.19. Diecinueve sobre PGlite con el mundo mínimo de allí (una vuelta de siete etapas en guardia por `own_rider`, una de cabecera y una ajena): los que solo tocan `packages/db` (el prefijo, el arrastre, la etapa a medias, la meta por modo, la caducidad, el acuse, las fuentes y los alcances, la temporada anterior, la vuelta de prueba, el memo, el memo con tope, el mapa del día, la retirada y el predicado), en `packages/db/src/horizon.test.ts`; los que pasan por la petición (la puerta con su 403, lo servido que no es visto, la cookie que solo restringe y que no se re-firma dentro del día, las cookies malas y `SPOILER_MODE`, que vive en `request.horizon()`, §14.5), en los tests de rutas de §14.7 (`apps/api/src/routes/me.test.ts` y `broadcast.test.ts`; dos tramos seguidos de la misma sesión con una `cs_viewer` de hace una hora no llevan `Set-Cookie`, 10-g). El vigésimo, «dos dispositivos» (dos `recordProgress` concurrentes de la misma etapa: `reached_s` es el mayor y `how` no pierde letras), no se puede probar sobre PGlite, que tiene un solo backend y una sesión (`packages/db/src/testDb.ts` l. 16-19): allí las dos transacciones van una detrás de otra y el caso pasaría sin el `select … for update` de §10.3, o el socket cortaría la segunda. Va en `packages/db/src/watchConcurrency.test.ts`, contra el Postgres de servicio del job `test` (`ci.yml` l. 33-48), con `describe.skipIf(realTestDatabaseUrl() == null)` como `calendarConcurrency.test.ts` (l. 20-21 y 45) y su base propia, `realTestDbFor('cyclingstar_watch')` (16-r), y abre dos conexiones que llaman a `recordProgress` a la vez (Rcodigo-084). Hoy ningún fichero de `.github/workflows/` define `TEST_DATABASE_URL` y los tests de concurrencia del repositorio se saltan en todo PR: el PR 1a se la da al job `test`, porque los dos casos de dos sesiones de `migrations.test.ts` (§13.10, punto 8) la necesitan antes (decisión 17-w; §16.7). Y, de §11.19, veinte peticiones a la vez el día nuevo hacen una sola cuenta del total del ranking y de `lastRunStages`, y si la cuenta falla la siguiente la repite (11-s), en el 8b. Umbral: todos. Rápida; nace en el 7a y gana el caso del predicado con `veilSql` en el 8a y los de la retirada con `VeilDelta` y la cuenta del día en el 8b.
- **B13 · la procedencia.** Con las seis cabeceras congeladas y 500 velos al azar (semilla fija), ningún campo de `veilCast(cast, h)` cuyo `from` esté en el velo viaja: se serializa y se busca (§10.10, §7.8). Con su cláusula de no vacío (17-u): en los 500 velos, al menos 100 campos con `from` velado existían en el reparto sin velar, y ninguno viaja; sin ella, un reparto sin procedencias pasaría sin probar nada (por eso el script de los fixtures planta un nacional en tres de las seis, §16.2). Rápida, en `apps/api/src/broadcastFixtures.test.ts`, junto a B3, porque `veilCast` vive en `packages/db` (§10.10) y `@cyclingstar/shared` solo depende de `zod` (decisión 17-t); nace en el 7b.
- **B14 · la latencia del horizonte** (D-33, O-17, H-10, X-11). `packages/db/src/horizonLatency.test.ts` llena `race_rosters` con 250.000 filas por `generate_series` (3.900 corredores, como L3), en un `beforeAll` con tiempo explícito de 120.000 ms, como `tickRun.test.ts` l. 22: `vitest.config.ts` solo sube `testTimeout` y deja los ganchos en los 10 s de vitest, y en PGlite aplicar las 47 migraciones costó de 2,4 a 6,8 s y llenar la tabla con su `analyze`, unos 8 s (Rcoste-033). Tras 20 llamadas de calentamiento, mide por separado, 200 veces cada una: `computeHorizon` sin memo (cada llamada con otro `horizon_rev`), en la forma D de §18.2 (decisión 18-a) y para dos espectadores, el jugador de un corredor y el mánager que además posee un equipo de 30; y `recordProgress` (D-55). Dónde y con qué umbral (decisiones 16-k y 18-j): contra el Postgres de servicio que el job `test` de `.github/workflows/ci.yml` ya levanta (`postgres:17-alpine`, l. 33-48), en una base propia del servidor de `TEST_DATABASE_URL`, que el test crea y prepara con `realTestDbFor('cyclingstar_b14')` (sobre `realTestDatabaseUrl()` y `resetRealTestDb`, `packages/db/src/testDb.ts` l. 102-124; propia porque `calendarConcurrency.test.ts` usa la misma variable y vacía el esquema, y vitest corre los ficheros en paralelo, 16-r), el jugador y `recordProgress` son puerta, p95 ≤ `SPOILER.horizonBudgetMs` (5 ms), y el mánager se imprime; sin esa base, en local, corre en PGlite, imprime los tres p95 y falla solo por encima de 15 ms, tres veces el presupuesto, que caza la pérdida del índice (sin él, de 20 a 27 ms de p95 en Postgres y más de 23 en PGlite, §18.2) y no el ruido. Lo medido (§18.2): por el socket de `testDb.ts`, que es el camino de este test en PGlite, el jugador da un p95 de 2,55 a 4,97 ms entre corridas y `recordProgress`, de 2,63 a 5,08, así que una puerta de 5 ms en PGlite sería intermitente en todo PR, los de la táctica incluidos (Rcoste-020); en PostgreSQL 16 sin red, 2,16 ms el jugador, 3,88 el mánager y de 2,44 a 3,25 `recordProgress` (`coste/pgm/horizonte-pg.mjs`, refutador de coste); en PGlite dentro del proceso, 3,1-3,7 ms el jugador y 8,6-9,3 el mánager (`l7/horizonte2.mjs`). La consulta por corredor sola: 19,6 ms sin índice y 0,11 ms con él (juez, C12), y 20,75 ms frente a 0,46 ms (L3, `l3/aplicar2.mjs`). Rápida; nace en el 7a. Si el jugador no pasa, `SPOILER_MODE=off` lo apaga sin desplegar (§10.13); el mánager lo decide la medida de §18.9 desde el servicio `web` de Railway contra una copia de producción, y si no pasa, el dueño (DD-21, 16-k).
- **B15 · el coste del tick** (O-23, H-14, X-24). `scripts/bench-tick.mjs`, a mano en los pasos 5 y 10: corre en una base de prueba los días 176 (187 cronos nacionales, 76 élite y 111 sub-23) y 179 (153 nacionales en línea, 111 élite y 42 sub-23; `coste/dias.mjs`) enteros, sub-23 incluidos, con `buildTimelineCast` y la escritura de `stage_timelines` de verdad, con `TIMELINE_RECORD=off` y `on`, y compara el tiempo del día. Umbral (decisión 16-l): falla si la grabación suma en un mismo día, a la vez, más de un 25 % y más de 15 s, o si deja alguna lápida (§5.5). Vigila además los puntos de guardado: durante los dos días, otra sesión lee `pg_stat_get_backend_subxact` del proceso del tick (PostgreSQL 16 o posterior) y B15 falla si `subxact_overflowed` sale verdadero, que es lo que daría volver a un punto de guardado por etapa (187 el 176 y 153 el 179, contra los 64 que caben en la caché de cada proceso; medido por el refutador de coste, `coste/pgm/subxact.mjs`, §5.5); la defensa es 5-l, una sola escritura por día (cruzada de L3, Rcoste-006). Lo que hay es una proyección, no una medida del día (§18.3): L7 simuló 30 nacionales élite de cada clase con el prototipo de L3 y un reparto sintético, sin sub-23, sin `buildTimelineCast` y sin escribir (`l7/tick.mjs`, dos corridas), y multiplicó la media por 153 y por 187: el 179 pasa de 103,8-109,0 s a 119,3-127,9 s (de +15,5 a +18,9 s, de +15 a +17 %) y el 176, de 2,2-2,4 s a 3,1 s (de +0,7 a +0,8 s), así que pasarían los dos. Es casi el doble de lo que estimaba §5.8 para el 179 (de 6 a 10 s, con las cifras de L3 por etapa grande: de 30 a 73 ms de grabador, de 17 a 57 de cierre, de 2,8 a 27,8 de gzip y de 6 a 25 de `selfCheckI1`), porque en un nacional de 40 corredores el grabador pesa más en proporción; el juez medía de 11 a 30 ms por crono nacional y de 0,3 a 0,8 s por nacional en línea (C15). La escritura de las 153 filas de un día, medida aparte en PostgreSQL 16, cuesta de 0,07 a 0,15 s (de 68 a 85 ms, y de 122 a 153 ms con un punto de guardado por fila, `coste/pgm/subxact.mjs`), no los 0,2 a 0,5 s que se estimaban. No va en el CI: es un día de juego entero en la base. Si falla, `TIMELINE_RECORD=off` apaga la grabación sin desplegar (D-12).
- **B16 · la radio desde la línea** (O-16). `radioFromTimeline(tl, names)` contra `buildRaceRadio(radioForStorage(radio, lista, []), chronicleNames)` (`buildRaceRadio` pide los nombres, `apps/api/src/chronicle.ts` l. 1340), con el mismo `riderOf` en los dos lados y `own` vacío (§12.10): en la rápida, el que arma `load.ts` desde `manifest.json`; en la larga, uno sintético `Rider <índice>` por cada `riderId` de la entrada (Rcodigo-096). En las 22 etapas en línea, dos comparaciones. Con la lista vacía y `nameableAt` vacío, que es la radio de una etapa no conocida, igualdad km a km en grupos, tamaños, huecos, velocidades, percances, relevistas con su motivo y su destinatario, `pullingTotal`, `racing` y `gone`, en el conjunto de los nombrados a rueda y en `unnamed`. Con los diez primeros de la etapa en la lista y en `nameableAt`, que es la etapa conocida (Rdueno-008), cada uno de ellos va en `riders` de su grupo en toda foto en que corre, en las dos radios, y `unnamed` es igual: no la igualdad entera, porque la guardada conserva como relevista a uno de la lista que tira por detrás de los doce de `STORED_PULLERS_MAX` (`raceRadio.ts` l. 912-913) y la línea solo guarda esos doce (§5.4). En las dos cronos, las dos radios son vacías (`kms.length === 0`): la crono ignora la sonda y la guardada no tiene km (medido, `rcod/n/ws/ttradio.mjs`; Rcodigo-027, Rcobertura-054). Dos `it` más en la rápida: con `own` igual a un corredor, ese corredor va en `riders` de su grupo en todas las fotos en que corre (R23.7; Rcobertura-042); y no vacío, al menos un km con relevistas nombrados en cada etapa en línea, para que la igualdad no sea de `null` contra `null`. Nocturno en las 22 en línea por dos semillas más las dos cronos, con `CS_BANCOS=1`, y rápida en las cinco en línea de las seis congeladas más la crono, los dos en `apps/api/src/broadcastFixtures.test.ts` (contra `<etapa>.radio.json.gz`): el motor no puede importar `buildRaceRadio`, que vive en `apps/api`, y el paso 11 no toca `packages/engine/` (decisión 17-l). Umbral: igualdad. Nace en el 11a y condiciona DD-11, que se aplica en el 11b (17-v).
- **B17 · el ritmo medido.** `scripts/bench-pace.mjs` corre la curva en las 24 etapas en el paso 0 (con su propia copia de la curva y su propio reloj estimado de la cabeza, 17-c) y en el 10b (con la línea grabada), y la rápida corre en las seis congeladas desde el 3a (`apps/api/src/broadcastPace.test.ts`), con las bandas de 8-k (§8.9, que es su fuente): `Watch` de 6:00 a 22:00 en línea; `Highlights` de 1:45 a 7:30; los últimos 5 km, el 15 % o más (35 % en los finales en alto); la crono, de 5:00 a 13:00; el digest, a menos del 40 % de su presupuesto; el error de `estimateS`, p90 < 60 s fuera de los finales en alto. Medido por L4 (§8.3, `l4/zonas.mjs`): 7:39-19:59, 2:12-6:37, 18-24 % y 45-47 %, y el digest, de −9 a +34 %; la crono, por el juez de ejecutabilidad (`juez-ejec/crono.mjs` y `crono_gc.mjs`) y por L5 (`l5/crono.mjs`), de 5:20 a 11:23 (el prólogo de 176 corredores, de 6:24 a 7:06; la e16, de 11:14 a 11:23; las nacionales de 35 y 40 km, de 5:20 a 5:52; §9.4); y el error de `estimateS`, por L2 (§15.3, `l2/estimacion.mjs`), con p90 de 55 s.
- **B18 · el servidor no adelanta.** `apps/api/src/routes/broadcast.test.ts` (§14.7, sobre PGlite con una etapa corrida con grabador): un tramo más allá de lo alcanzado más `prefetchRaceS` da 409 `beyond_reached`; el que llega al borde lleva `atFinish` y ningún dato de meta; la meta solo sale por `POST …/finish`; con la memoria de lo alcanzado del proceso vacía, como tras un reinicio de `web` o un cambio de interruptor (§14.6), un tramo en el borde se sirve tras un informe del progreso (riesgo 19 de §19.1, §17.10; Rcoste-042); y dos sesiones desde la misma IP piden 320 tramos en un minuto sin un 429, porque los tramos y el progreso llevan su propio límite, por usuario (`PLAYER_RATE_LIMIT`, 1.200 por minuto con sesión y 300 por IP sin ella, contador aparte del global; 14-q), y un 429 no pausa: espera `retry-after` con `Loading`. Rápida; nace en dos veces: el caso de los 320 tramos sin un 429, en el 3a, con `PLAYER_RATE_LIMIT`, que llega en ese PR (§17.6); el tope de lo alcanzado, su 409 `beyond_reached` y la memoria vacía, en el 7b (decisión 17-m).
- **B19 · la voz es prefijo.** `apps/api/src/voicePrefix.test.ts`: en las cinco etapas en línea congeladas, la voz construida como la ruta del tramo (§14.3, con `withGroupRoles` antes de atar las horas, 12-n) cada 30 s de carrera hasta el borde de la meta; la de `t` es prefijo exacto de la de `t + 30 s`. Umbral: 0. Medido: 0 en 15 corridas por `ingeniero` revelando en `tS`, y 0 en 18 corridas y 12.083 pasos con el `revealS` real (`l8/voz.mjs`, §12.2), frente a 44 ordenando por `tS` y 574 con el acta truncada. Un segundo `it` corre lo mismo con `liveClusters`: en el 2, con todos los corredores sin rótulo, que es el peor caso (`l8/voz2.mjs` dio 0, §12.3); desde el 6b, con la política de nombres real (§7.7) sobre el reparto del fixture, y tiene que dar 0 antes de encender la constante (DD-18). El mismo fichero mide `withGroupRoles` para B8 desde el 6b. Rápida; nace en el 2 (§17.5 y §17.9).
- **B20 · revelar sin castigo** (I-35). `packages/db/src/revealFree.test.ts` lee con el AST los ficheros de `packages/db/src` y `packages/engine/src` y falla si alguno fuera de una lista literal y cerrada nombra `raceWatch` o `race_watch`: `schema.ts`, `horizon.ts`, `watch.ts` y los `*.test.ts`. Ningún premio, logro, moral ni dinero lee lo visto (D-38). El reinicio que borra la tabla no tiene código (§13.9: es un procedimiento que el 7a escribe en `docs/ops.md`, con la tabla que crea, y el 12 relee, 17-y; hoy no hay ninguno: `grep` de `truncate` y `resetWorld` en `packages/db/src`, `apps/api/src` y `scripts` sale vacío); si algún día lo tiene, su fichero entra en la lista en el mismo PR y con su motivo, porque una regla como «cualquier fichero que se llame reset» abriría justo el agujero que B20 cierra (Rcodigo-093). Rápida; nace en el 7a.
- **B21 · la posición del instante.** Informativo (D-04): el error de la posición extrapolada de cada grupo contra la línea entera, p50 y p99 impresos en el banco; solo falla si llega a 1 km, que la construcción impide (§4.5). L1 midió un p99 de 52 a 508 m en 15 corridas (`l1/corte.mjs`). Banco, en `timeline.test.ts`; entra en el 4b con todo lo de E2 bajo `packages/engine/` (decisión 17-i).
- **B22 · el reloj estimado.** `apps/api/src/radioAdapter.test.ts`: la línea del adaptador de la radio (§3.8), construida desde `<etapa>.radio.json.gz`, contra la grabada de la misma etapa. Puerta (D-07, D-61): posición de la cabeza, p99 ≤ `BROADCAST.estimatedClockMaxErrKm` (1 km); L1 midió un máximo de 0,69 km. Informa además, sin ser puerta, del p99 y del máximo de la posición de TODOS los grupos (el cursor pintado contra la posición exacta del motor, cada 10 s de carrera) y del porcentaje de pares de fotos seguidas en que la misma posición es otro grupo del motor, que es la identidad del adaptador: la cabeza es el grupo que mejor sale, y la puerta sola dejaría pasar un pelotón a varios km (duda 1.6, cerrada). Medido por el refutador de código sobre el banco de L1 (`rcod/n/adapt.mjs`, cuatro corridas: `race-flanders`, `race-france` e18 y `race-colombia` e5 y e13): la cabeza, p99 de 0,32 a 0,60 km; todos los grupos, p99 de 0,84 a 0,89 km y máximos de 2,17 y 2,62 km; la misma posición cambia de grupo en el 15-30 % de los pares; es una cota optimista, porque se toma como marcada la hora del grupo verdadero (Rcodigo-047). Qué pasa con esa cifra, que las dos caras de la refutación ven distinto (decisión 16-s): si el p99 de todos los grupos pasa de 1 km, se escribe en el PR y decide el dueño antes de abrir en `Watch` las etapas del adaptador (§20.6, 20-l; Rcodigo-047); y si pasa de 2 km, esas etapas pintan en el perfil solo el cursor de la cabeza y el del grupo del título, y la barra no cambia (Rcobertura-055). Si la cabeza pasa de 1 km, sigue mandando D-61: solo `Report`. Rápida; nace en el 6a y decide si las etapas del adaptador abren en `Watch` o en `Report`.

**B9, entero.**

```ts
// apps/api/src/broadcastCut.test.ts (nuevo, paso 3a): B9 (§16.4). Suite rápida, sobre las seis etapas congeladas (en el 3a sobre
// ROAD_FIXTURES y con instantAt; la crono y timeTrialInstantAt, en el 6b, §17.6).
import { type BroadcastChunk, type InstantContext, type StageTimeline, chunkOf, cutTimeline, instantAt, photoBlocksOf, seededRng, timeTrialInstantAt, visibilityOf } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { FIXTURES, loadTimeline } from './__fixtures__/broadcast/load.js'

/** Sin espectador y sin salida: ni `own` ni `start` cambian lo que el corte deja ver. */
const ctxOf = (tl: StageTimeline): InstantContext => ({
  own: new Set(),
  start: { leaders: { gc: null, points: null, kom: null }, gcTop: [], racingAtStart: tl.riderIds.length },
  photoBlocks: photoBlocksOf(tl.lengthKm, tl.dx),
})
const CHUNK_DS = 9000                                             // BROADCAST.chunkRaceS (900 s) en Ds
const REVEAL = 5                                                  // revealDs en la tupla de un suceso (StoredTimelineV1, §4.3)
/** El tramo con `tt` aplanado: `tt` es un objeto { starts, km, checks } (§4.11) y sin esto la tercera cláusula no juntaba lo de la crono. */
const flat = (c: Omit<BroadcastChunk, 'lines'>): Record<string, unknown> =>
  ({ ...c, tt: null, 'tt.starts': c.tt?.starts ?? [], 'tt.km': c.tt?.km ?? [], 'tt.checks': c.tt?.checks ?? [] })

describe.each(FIXTURES)('B9 · el corte causal · %s', (name) => {
  const tl = loadTimeline(name)
  const ctx = ctxOf(tl)
  const { finishDs, ttKmDs, ttCheckDs } = visibilityOf(tl)
  const at = tl.timeTrial ? timeTrialInstantAt : instantAt

  it('lo que se ve en T no cambia al quitar de la línea todo lo que aún no se ve', () => {
    const rng = seededRng(`b9:${name}`)
    for (let i = 0; i < 200; i++) {
      const T = Math.floor(rng() * finishDs) / 10                 // RaceS, de la salida al borde de la meta
      expect(at(cutTimeline(tl, T), T, ctx)).toEqual(at(tl, T, ctx))
    }
  })

  it('un tramo solo lleva lo visible en su intervalo, y nunca la meta', () => {
    for (let from = 0; from < finishDs; from += CHUNK_DS) {
      const to = Math.min(from + CHUNK_DS, finishDs)
      const c = chunkOf(tl, from, to)
      expect(c).toEqual(chunkOf(cutTimeline(tl, to / 10), from, to))          // nada de después de `to` hace falta para armarlo
      for (const e of c.events) expect(e[REVEAL] > from && e[REVEAL] <= to && e[REVEAL] < finishDs).toBe(true)
      // nunca la meta: la marca de la cabeza en el último bloque vale exactamente finishDs y es el tiempo del ganador (§4.6)
      for (let i = 0; i < c.clocks.length; i += 3) expect(c.clocks[i + 2]! > from && c.clocks[i + 2]! <= to && c.clocks[i + 2]! < finishDs).toBe(true)
      for (let i = 0; i < c.banners.length; i += 4 + 2 * c.banners[i + 3]!) expect(c.banners[i + 2]! > from && c.banners[i + 2]! <= to && c.banners[i + 2]! < finishDs).toBe(true)
      if (c.tt !== null) {                                        // la crono: cada paso por km y por control, con su visibilidad (§4.6)
        for (let i = 0; i < c.tt.starts.length; i += 2) { const ds = c.tt.starts[i + 1]!; expect(ds > from && ds <= to && ds < finishDs).toBe(true) }
        for (let i = 0; i < c.tt.km.length; i += 3) { const ds = ttKmDs![c.tt.km[i]!]![c.tt.km[i + 1]!]!; expect(ds > from && ds <= to && ds < finishDs).toBe(true) }
        for (let i = 0; i < c.tt.checks.length; i += 3) { const ds = ttCheckDs![c.tt.checks[i]!]![c.tt.checks[i + 1]!]!; expect(ds > from && ds <= to && ds < finishDs).toBe(true) }
      }
      expect(c.atFinish).toBe(to === finishDs)
    }
  })

  it('los tramos, uno tras otro, son la línea entera hasta la meta: nada se pierde ni se repite', () => {
    const whole = chunkOf(tl, 0, finishDs)
    const joined = new Map<string, unknown[]>()
    for (let from = 0; from < finishDs; from += CHUNK_DS)
      for (const [k, v] of Object.entries(flat(chunkOf(tl, from, Math.min(from + CHUNK_DS, finishDs)))))
        if (Array.isArray(v)) joined.set(k, [...(joined.get(k) ?? []), ...v])
    for (const [k, v] of Object.entries(flat(whole))) if (Array.isArray(v)) expect(joined.get(k) ?? []).toEqual(v)
  })
})
```

`load.ts` es un ayudante corto en la misma carpeta: `FIXTURES` con los seis nombres y `ROAD_FIXTURES` con los cinco en línea, y `loadTimeline(name)`, que lee `<etapa>.timeline.gz` con `readFileSync(new URL(…, import.meta.url))`, lo descomprime con `gunzipSync` y lo pasa por `decodeTimeline` (§4.3), igual que `readStageTimeline` (§5.6). Hasta el 6a, porque el `.timeline.gz` lo escribe el 5 y la retransmisión no lee la línea grabada hasta el 6a, `loadTimeline` construye la línea del adaptador desde `<etapa>.radio.json.gz` y `.events.json.gz` (§17.6). Desde el 6a gana `seedFixtureWorld(t, name)` (§16.2).

**B10, entero.**

```ts
// packages/db/src/timelineCollectorBench.ts (nuevo, paso 4b): lo que comparten la rápida de B10 (§16.4) y sus dos ficheros del nocturno.
import { ENGINE_VERSION, SEASON_CALENDAR, STAGE, type StageProbe, raceRadioCollector, radioForStorage, radioKmPoints, realRaceScenario, simulateStage, stageLengthKm, stageSeed } from '@cyclingstar/engine'
import { expect, it } from 'vitest'
import { startStageTimeline } from './timelines.js'

type Input = ReturnType<typeof realRaceScenario>['input']
type Wrap = 'today' | 'e2' | 'naive'
/** Lo que una envoltura deja ver al aprendizaje (trabajaronParaOtro) y a la radio guardada, como stageRun.ts l. 515-586. */
interface Seen { readonly learners: readonly string[]; readonly stored: string }

export function watch(input: Input, seed: string, wrap: Wrap): Seen {
  const lengthKm = stageLengthKm(input.profile)
  const radio = raceRadioCollector(radioKmPoints(lengthKm))
  const learners = new Set<string>()
  const radioShot: StageProbe['onSnapshot'] = (km, riders, mainId) => {                  // lo de hoy (stageRun.ts l. 528-535)
    for (const r of riders) if (r.pullFor != null) learners.add(r.riderId)
    radio.probe.onSnapshot(km, riders, mainId)
  }
  const blocks = Math.round(lengthKm / STAGE.dx)
  const recording = wrap === 'e2'
    ? startStageTimeline({ lengthKm, timeTrial: input.timeTrial === true, riderIds: input.riders.map((r) => r.riderId), radioShot })
    : null
  const probe: StageProbe = recording?.probe
    ?? (wrap === 'today'
      ? { atKm: radio.probe.atKm, onSnapshot: radioShot }
      : { atKm: Array.from({ length: blocks }, (_, b) => (b + 0.5) * STAGE.dx), onSnapshot: radioShot })   // la ingenua: todas las fotos a los dos
  const output = simulateStage(input, seed, probe)
  expect(recording?.failure()).toBeUndefined()                                            // el grabador no se apagó
  return { learners: [...learners].sort(), stored: JSON.stringify(radioForStorage(radio.radio({ incidents: output.incidents }))) }
}
export const seedOf = (raceId: string, day: number, s: number): string => stageSeed({ worldSeed: `b10-${s}`, raceId, stageDay: day, engineVersion: ENGINE_VERSION })

/** Tres en que, con este campo (uniformField, 176 corredores) y estas semillas, el colector aparte ve lo mismo que hoy y la ingenua rompe:
 *  6, 1 y 2 corredores en trabajaronParaOtro, y la radio en las tres (c-l3/b10uniforme.mjs, re-medido en el cierre de L8). */
export const QUICK = [['race-france', 20, 0], ['race-france', 18, 0], ['race-flanders', 1, 1]] as const
export const LONG = [...Array.from({ length: 21 }, (_, i) => ['race-france', i + 1] as const), ['race-flanders', 1] as const, ['race-tramuntana', 1] as const, ['race-colombia', 5] as const]
  .filter(([id, day]) => SEASON_CALENDAR.find((r) => r.id === id)!.stages[day - 1]!.timeTrial !== true)
  .flatMap(([id, day]) => [0, 1].map((s) => [id, day, s] as const))

export const same = (cases: readonly (readonly [string, number, number])[]): void =>
  it.each(cases)('%s e%i semilla %i: el colector aparte ve lo mismo que la envoltura de hoy', (raceId, day, s) => {
    const { input } = realRaceScenario(raceId, day)
    const today = watch(input, seedOf(raceId, day, s), 'today')
    const e2 = watch(input, seedOf(raceId, day, s), 'e2')
    expect(e2.learners).toEqual(today.learners)
    expect(e2.stored).toBe(today.stored)
  }, 120_000)


// packages/db/src/timelineCollector.test.ts (nuevo, paso 4b): B10, la rápida, con tres etapas y una semilla.
import { realRaceScenario } from '@cyclingstar/engine'
import { describe, expect, it } from 'vitest'
import { QUICK, same, seedOf, watch } from './timelineCollectorBench.js'

describe('B10 · la foto por km y el aprendizaje', () => {
  same(QUICK)
  // Dos cláusulas y no una con `||`: la ingenua da a radioShot la foto de cada bloque y cambia la radio guardada por construcción,
  // así que con `||` el test seguía en verde aunque la comparación del aprendizaje estuviera rota (rc3/b10quick.mjs).
  it('no es vacío: la envoltura ingenua cambia el aprendizaje en alguna de las tres', () => {
    const broken = QUICK.some(([raceId, day, s]) => {
      const { input } = realRaceScenario(raceId, day)
      return watch(input, seedOf(raceId, day, s), 'naive').learners.join() !== watch(input, seedOf(raceId, day, s), 'today').learners.join()
    })
    expect(broken).toBe(true)                                   // medido: cambia en las tres (6, 1 y 2 corredores)
  }, 360_000)
  it('la envoltura ingenua cambia la radio guardada', () => {
    const [raceId, day, s] = QUICK[0]
    const { input } = realRaceScenario(raceId, day)
    expect(watch(input, seedOf(raceId, day, s), 'naive').stored).not.toBe(watch(input, seedOf(raceId, day, s), 'today').stored)
  }, 120_000)
})

// packages/db/src/timelineCollector.long1.test.ts (nuevo, paso 4b): el nocturno, las once primeras etapas en línea por dos semillas;
// long2.test.ts, igual con LONG.slice(22). Dos ficheros para que corran en paralelo: vitest corre en serie los `it` de un fichero.
import { describe } from 'vitest'
import { LONG, same } from './timelineCollectorBench.js'

describe.runIf(process.env.CS_BANCOS === '1')('B10 · las once primeras etapas en línea por dos semillas (nocturno)', () => same(LONG.slice(0, 22)))
```

`CS_BANCOS=1` lo pone `cobertura.yml` en su paso `pnpm test:coverage` (l. 63-64), que es el nocturno; el PR 4b lo añade. La rápida paga unas 33 s (medido por el refutador de coste con este código, `coste/b10/b10.mjs`: de 3,3 a 4,8 s por etapa simulada con los 176 corredores del escenario y de 3,8 a 5,5 s con la envoltura ingenua; seis simulaciones de `same` y las de las dos cláusulas, que paran en la primera que rompe). El nocturno son 88 simulaciones, de 5 a 7 min sin cobertura, y con ella, que multiplica por 1,75 a 2,02 (`vitest.config.ts`), de 9 a 14: partido en dos ficheros no alarga el job (estimado con lo medido por etapa; Rcoste-026, Rcoste-027). `realRaceScenario` (`packages/engine/src/sim/scenarios.ts` l. 518) no se exporta hoy de `@cyclingstar/engine`, que solo publica `.` (`packages/engine/package.json` l. 8-13): el PR 4b lo añade a `packages/engine/src/index.ts` con las exportaciones de §5.10, porque B10 vive en `packages/db`.

**B11, entero.**

```ts
// packages/engine/src/sim/timeline.test.ts (nuevo, paso 4b; tramo «mundo y radio», 15-d): B11 (§16.4). I1, I2, I3, I5, B2, B6 y B21, en el mismo fichero (B16 vive en `apps/api`, 17-l).
import { photoBlocksOf } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { ENGINE_VERSION, STAGE } from '../constants.js'
import { stageSeed } from '../stage/rng.js'
import { stageLengthKm } from '../stage/sample.js'
import { simulateStage } from '../stage/simulate.js'
import type { StageProbe } from '../stage/types.js'
import { SEASON_CALENDAR } from '../routes/calendar.js'
import { realRaceScenario } from './scenarios.js'
import { timelineRecorder } from './timeline.js'

/** Seis en línea (llana, media, dos reinas, clásica y nacional) y seis cronos: la que abre la grande (e1, 20 km), la de la tercera semana
 *  (e16, 26 km), la de una vuelta de montaña (race-colombia e3, 33 km), la que abre una vuelta de seis etapas (race-basque-country e1,
 *  14 km) y dos nacionales (40 y 31,2 km). */
const STAGES = [
  ['race-france', 7], ['race-france', 13], ['race-france', 18], ['race-france', 20], ['race-flanders', 1], ['nc-es-road', 1],
  ['race-france', 1], ['race-france', 16], ['race-colombia', 3], ['race-basque-country', 1], ['nc-es-itt', 1], ['nc-es-u23-itt', 1],
] as const
/** La huella entera de una etapa: los cuatro campos de StageOutput que el mundo guarda, no solo `puesto:id:tiempo` (raceRadio.test.ts l. 756-757).
 *  `efforts` es un Map (types.ts l. 582): sin `entries()` se serializa como `{}` y la huella no lo compararía (medido, `rcod/n/rrs.mjs`). */
const huella = (o: ReturnType<typeof simulateStage>): string => JSON.stringify([o.results, o.events, [...o.efforts.entries()], o.incidents])
/** La entrada de una etapa del calendario. realRaceScenario no pone `timeTrial` (scenarios.ts l. 518-541): sin él, una crono corre en línea. */
const inputOf = (raceId: string, day: number): ReturnType<typeof realRaceScenario>['input'] => {
  const stage = SEASON_CALENDAR.find((r) => r.id === raceId)!.stages.find((x) => x.index === day)!
  const { input } = realRaceScenario(raceId, day)
  return stage.timeTrial === true ? { ...input, timeTrial: true } : input
}

describe('B11 · observar no toca la carrera', () => {
  it.each(STAGES.flatMap(([id, day]) => [0, 1].map((s) => [id, day, s] as const)))('%s e%i semilla %i', (raceId, day, s) => {
    const input = inputOf(raceId, day)
    const seed = stageSeed({ worldSeed: `b11-${s}`, raceId, stageDay: day, engineVersion: ENGINE_VERSION })
    const sin = simulateStage(input, seed)
    const lengthKm = stageLengthKm(input.profile)
    const blocks = Math.round(lengthKm / STAGE.dx)
    const rec = timelineRecorder({ blocks, dx: STAGE.dx, lengthKm, timeTrial: input.timeTrial === true,
      radioBlocks: new Set(photoBlocksOf(lengthKm, STAGE.dx)), riderIds: input.riders.map((r) => r.riderId) })
    const calls = { snapshot: 0, event: 0, ride: 0 }
    const probe: StageProbe = {                                          // la foto de CADA bloque y los tres ganchos, al grabador de verdad
      atKm: Array.from({ length: blocks }, (_, b) => (b + 0.5) * STAGE.dx),
      onSnapshot: (km, riders, mainId) => { calls.snapshot++; rec.onSnapshot(km, riders, mainId) },
      onEvent: (e, b) => { calls.event++; rec.onEvent(e, b) },
      onBanner: (x) => rec.onBanner(x),
      onTimeTrialRide: (x) => { calls.ride++; rec.onTimeTrialRide(x) },
    }
    const con = simulateStage(input, seed, probe)
    expect(huella(con)).toBe(huella(sin))
    // …y la sonda se usó de verdad: un gancho que no se llama no prueba nada. La crono no llama ni a onSnapshot ni a onEvent
    // (simulate.ts l. 1264; §5.2: «Solo en carretera: la crono no lo llama»): solo a onTimeTrialRide, una vez por corredor.
    if (input.timeTrial === true) {
      expect([calls.ride, calls.snapshot, calls.event]).toEqual([input.riders.length, 0, 0])
      expect(con.events.some((e) => e.plantilla === 'stage_win_itt')).toBe(true)          // corrió como crono de verdad
    } else { expect(calls.event).toBeGreaterThan(0); expect(calls.snapshot).toBe(blocks) }
  }, 120_000)
})
```

El grabador recibe lo que el motor le da por referencia y no lo copia (§5.4): si un día muta una foto o un suceso, este test lo caza en la huella, porque la carrera sigue con los objetos tocados. `inputOf` es la misma que construye las 24 etapas de I1, I2, I3, I5, B2, B6 y B21 en este fichero (§16.2), y la prueba de humo de `probeHooks.test.ts` engancha desde el 4b este mismo grabador (B11 arriba). Por eso se prueba con `timelineRecorder` de verdad y no con ganchos vacíos, y con los cuatro campos y no con la huella de puestos y tiempos, que es lo único que compara hoy «la radio no toca la carrera» (`raceRadio.test.ts` l. 756-764).

### 16.5 La prueba de lectura

D-60, escrito como hecho (H-04; [DOC 7]; [DUEÑO 4]). Ningún banco dice si la pantalla se entiende: lo dice alguien que la mira. Es el criterio del MVP, paso 31: «un tercero entiende qué pasó en la etapa sin que nadie se lo explique» (`MVP.md` l. 140), y el que la propia v27 se puso: «la prueba de esta tanda es leer el diario del §7 de arriba abajo. El criterio no es un porcentaje» (`docs/balance.md` l. 6236-6237). Esa frase es del registro de la v27, no del dueño; lo del dueño en la v27 es la queja que la originó, «si lees todo el Journal no SABES quién va ganando, quién va persiguiendo… es un lío los últimos mensajes» (l. 5975-5976). Y la frase pide leer el diario de arriba abajo, mientras que esta prueba pregunta en nueve puntos sorteados: es una muestra de ese criterio, no el criterio entero, y por eso cada persona ve la etapa desde la salida y sin saltar (punto 5). Las cuatro preguntas son las de la regla del diario: «quién va delante, con cuánta ventaja, sobre quién y cuánto queda» (SPEC §6.15, l. 598-600). Se añaden dos para las dos peticiones del dueño que más pesan en `Watch` y que las cuatro no miran: los maillots de la fuga («cuando se escapan cinco, que se vean sus maillots», `docs/encargos.md` l. 153-154) y por qué tira quien tira («Cada vez que alguien tire del pelotón, tienes que mencionar por qué», `docs/balance.md` l. 1843, v13). Sin ellas, la prueba no medía ni el requisito literal del encargo ni D-24 a D-26, que el apéndice daba por aceptados en ella (Rdueno-004). El umbral, nueve de nueve, no tiene evidencia de los jueces.

1. **Quién.** El dueño y una persona que no conozca el diseño: no ha leído `docs/retransmision.md` ni ha trabajado en E2. Contestan por separado, sin verse. Un organizador, el que lleva el paso 10, prepara, pausa y comprueba; no ayuda ni explica.
2. **Cuándo.** En el paso 10, con 10a y 10b desplegados y antes de `BROADCAST_WATCH=on`, en el mundo de pruebas con `BROADCAST_WATCH=admins`; la persona usa una cuenta de administrador creada para la prueba.
3. **Qué etapas.** Tres corridas con la grabación encendida que ninguno de los dos ha visto: una llana, una reina y una clásica (por `StageKind`: `llana`, `reina`, `clasica`), las más recientes de cada tipo. Si no hay una clásica con línea, la carrera de un día más larga que la tenga.
4. **Qué puntos.** Tres por etapa, sorteados ANTES de verla con una semilla que se apunta: km a meta al azar entre 5 y `lengthKm − 5`, separados al menos 20 km y uno de ellos en los últimos 30 km. Los dos no los conocen.
5. **Cómo se ve.** `Watch` (pantalla) desde la salida, a la velocidad de siempre (§8.2), con los mandos normales: se puede pausar y abrir `Commentary` o tocar una fila de la barra, que es parte de la pantalla; no se puede saltar. Cuando la capa fija llega al km a meta del punto, el organizador pausa.
6. **Las preguntas.** Quién va delante (los nombres si son tres o menos; si no, qué grupo y cuántos), con cuánta ventaja, sobre quién y cuánto queda. Y, en todo punto en que el grupo 1 vaya por delante del pelotón con hasta `BROADCAST.nameWholeGroupUpTo` (12) corredores, dos más: qué lleva cada uno de los de delante (el maillot de líder, el de campeón o el de su equipo), contestada mirando la barra, y quién tira detrás y por qué. Si en los nueve puntos no sale ninguna fuga así, se sortea uno más entre los km en que la haya. Se contestan en voz alta, sin volver atrás.
7. **La verdad.** El organizador la saca de la línea con `scripts/pl-truth.mjs <raceKey> <día> <kmAMeta>`: el grupo 1 del instante con sus miembros y el `worn` de cada uno (§4.8), `mainGap` con su referencia (§4.5, D-17), los km a meta de la cabeza y, del grupo que persigue, la línea de los que tiran con el motivo de cada equipo (`pullingLineOf`, §6.4).
8. **Qué es una respuesta bien.** Los nombres exactos si el grupo 1 es de tres o menos, o su palabra y su tamaño con un corredor de margen; la ventaja a 10 s o la cifra de la capa fija; «sobre quién», el grupo de referencia de la diferencia principal; lo que queda, a 1 km; los maillots, el de cada uno de los de delante (líder de qué clasificación, campeón de dónde, o «el de su equipo»); y quién tira, el equipo o los equipos y el motivo de cada uno como lo dice la línea `Pulling:`.
9. **La aceptación.** Un punto cuenta si LAS DOS personas contestan bien todas las preguntas del punto: las cuatro, o las seis cuando va delante una fuga de hasta 12. Nueve de nueve (diez de diez si hubo que sortear el punto de la fuga).
10. **Si falla.** Se apunta qué pregunta falló y dónde, y se ajusta solo lo que vive en `packages/shared`: las constantes de ritmo y de la cola (`pace`, `cueHoldS`, `crashNamesDelayS`, `breakRoundEveryS`, `gapsTableEveryRealS`; §15.6), las palabras (§6.3) o los rótulos (§6.5). Se remide B17 y se repite con tres etapas y nueve puntos NUEVOS. Nunca se toca el motor (§8.9). Si la misma pregunta falla dos veces seguidas, no es una constante: va al dueño como decisión.
11. **El registro.** Etapas, semilla del sorteo, respuestas, verdad y veredicto, en la descripción del PR 10b. Con la aceptación del punto 9 (nueve de nueve, o diez de diez si hubo que sortear el punto de la fuga) se enciende `BROADCAST_WATCH=on` (D-53).

### 16.6 Los tests de pantalla y de producto

Lo que se ve se prueba sin navegador: el render es estático con `renderToStaticMarkup`, como `apps/web/src/components/leaderJerseys.test.tsx` (l. 2), y el reproductor es un reductor puro (§8.12). Cada test está en la sección de su pieza, con sus casos; aquí, el índice. Todos corren en la rápida (`test:rapido`, §16.7), porque ninguno vive bajo `packages/engine/src/sim/`, y su umbral es el de un test unitario: todos los casos en verde.

| Qué | Fichero | Sección | Paso |
| --- | --- | --- | --- |
| la capa fija, la barra y sus palabras, el tránsito y `Your rider`; en `GroupBar.test.tsx`, cada nombre de una fila con su `WornJerseyIcon` delante (el de líder, `ChampionMark` o la equipación de `RiderCard.team.jerseySeed`, leído de `BroadcastHead.cast` por `RiderIx`), la fila de un grupo de cuatro a doce con la línea de sus corredores, cada uno con su icono (en el móvil, solo los iconos y solo bajo la fila 1 y las del espectador), y los nombres tal como están guardados, cortados con `…` si no caben (6-c) | `apps/web/src/components/broadcast/*.test.tsx` (`FixedOverlay.test.tsx` y `GroupBar.test.tsx` nacen en el 3c) | §6.2, §6.3 | 3c y 6b |
| el rótulo de corredor, `breakHeadline` y `breakRoundOf` (hasta doce, por dorsal; en una fuga mayor, antes los de maillot, luego los propios y luego por notoriedad) | `packages/shared/src/broadcast/names.test.ts` y los de `apps/web/src/components/broadcast/` | §6.7, §7.1, §7.6 | 6b |
| la presentación de la fuga: la lista, la frase y la ronda de la moto, enteras con la cola llena (la segunda parte de B3) | `apps/web/src/domain/broadcast/breakPresentation.test.ts` | §6.7 (6-m), §16.4 | 6b |
| la cola de rótulos y `CUE_OF_TEMPLATE`; `isPresentation`, `aheadOfPeloton` (en tránsito cuenta el grupo que dejó; sin grupo con el título, cierto) y la cola con una fuga: la lista, la frase y la ronda no cuentan para `cueQueueMax`, no se descartan ni caducan, esperan detrás de los demás de clase 2 y se tiran solo cuando ya no presentan nada: el escapado ya no va por delante del pelotón (`aheadOfPeloton`), porque lo han cazado o se ha quedado; la fuga, sin ninguno (6-m) | `packages/shared/src/broadcast/cues.test.ts` | §6.5, §6.6, §6.7 | 6a; la fuga, 6b |
| el reproductor, los saltos, los modos y `Next action`; un 429 que espera con `Loading` y nunca da `Connection lost`, los mandos que se esconden en `playing`, el `finish` con su `mode` y el `release` del digest; `PlayerControls` a 360 px | `apps/web/src/domain/broadcast/player.test.ts` y `apps/web/src/components/broadcast/PlayerControls.test.tsx` | §8.11, §8.12 | 3b y 10 |
| `usePageTitle`, único escritor de `document.title`, sin el ganador | `apps/web/src/domain/pageTitle.test.ts` | §11.8, §11.19 | 9a |
| `?tab=` y `?cls=` de una etapa no conocida pintan la puerta y no la tabla, y `?tab=story` abre `report` (`sup. E9`) | `apps/web/src/pages/stageTables.test.tsx` (9a) y `apps/web/src/domain/raceTabs.test.ts` (9b) | §11.8, §11.17 | 9a y 9b |
| `stageReadyEmail` y `stageReadyNotice`, sin el nombre del canario | `apps/api/src/emails.test.ts`, `packages/shared/src/broadcast/pageTitle.test.ts` | §11.9 | 9a |
| revelar sin castigo: `Don't ask again` y `Watch anyway`, y que ningún premio lea lo visto | los de §11.11; B20 | §11.11 | 7a y 9a |
| la voz: `inVoice`, `linesOf`, las frases de §12.5 y `mainNoun` con los cuatro papeles y los tres maillots (`groupNounOf`, `isJerseyKind`) | `apps/web/src/domain/voice.test.ts`, `stageJournal.test.ts` | §12.2, §12.5, §12.6 | 2 y 6b |
| los momentos del corredor en `Last race`: `moments` con las líneas del acta de la última etapa conocida en que es protagonista o destinatario | `apps/api/src/routes/lastRace.test.ts` | §12.9 | 12 |

### 16.7 El CI

**La trampa, escrita.** `test:rapido` excluye `packages/engine/src/sim/**` (`package.json` l. 21), y los tramos de bancos son listas de ficheros escritas a mano en la matriz (`ci.yml` l. 150-175) que solo corren si el diff toca `^packages/engine/` (l. 189). Un test nuevo en `packages/engine/src/sim/` que no esté en ningún tramo no corre en ningún PR, solo en el nocturno (`cobertura.yml`, `15 4 * * *`, l. 26, con `pnpm test:coverage`, l. 63-64). Por eso 15-d mete `timeline.test.ts` en el tramo «mundo y radio» (l. 166-175) en el PR 4b, el del grabador, y por eso todo lo que depende de `packages/shared` tiene su versión rápida (D-52). Los tests de `packages/engine/src/stage/` sí corren en la rápida: ahí va la prueba de humo de B11.

| Suite | Cuándo corre | Coste medido | Bancos de E2 |
| --- | --- | --- | --- |
| `typecheck` | todo PR | 37,4 s (mapa 07 §4) | los tipos de §4 y las uniones cerradas (`satisfies`) |
| `test:rapido` | todo PR, con Postgres de servicio y PGlite | 562 s y 529 s en dos corridas (mapa 07 §4) | I1, I2, I3, I5 y B16 sobre las seis congeladas; B1a a B1d; B2 a B10; B12 a B14 (el caso de dos dispositivos de B12 y la puerta de B14, contra el Postgres de servicio); B17 sobre las seis; B18 a B20; B22; la prueba de humo de B11, con el grabador desde el 4b |
| bancos, ocho tramos | solo si el PR toca `packages/engine/` | 4.365 s sumados (`ci.yml` l. 103, medidos el 21/09/2026 con el motor v83 y cinco ficheros), en paralelo | «mundo y radio»: I1, I2, I3, I5, B2, B6 (el `bytea`; el JSON, impreso sin fallar), B11 y B21 en `timeline.test.ts`, que suma de 3,7 a 5,4 min al tramo (estimado: unas 68 simulaciones en línea, las 48 de I1 con el grabador y las 24 de B11 sin y con sonda, a los 3,3-4,8 s por etapa medidos en `coste/b10/b10.mjs`; Rcoste-028) |
| nocturno | cada día a las 04:15 UTC | toda la suite con cobertura, de 17 a 22 min (`vitest.config.ts`) | todo lo anterior, más B6 del JSON sobre las 24 × 2, que en el tramo del PR solo se imprime, B10 largo (88 simulaciones, de 5 a 7 min, en dos ficheros que corren en paralelo) y B16 largo (48, de 2,5 a 3,5 min) con `CS_BANCOS=1`: sin cobertura, de 7,5 a 10,5 min de CPU más, y con ella (de ×1,75 a ×2,02), de 13 a 21 (estimado con lo medido por etapa; Rcoste-027) |
| a mano | en su paso | un día de juego (B15); las 24 etapas (B3, B6 y B17) | B6 del paquete de meta y de la ruta de etapa conocida sobre las 24 × 2 (paso 6, `scripts/broadcast-fixtures.mjs --sizes`), B15 (pasos 5 y 10), B17 largo (pasos 0 y 10), la presentación de la fuga de B3 sobre las 24 × 2 con la línea grabada (paso 10), PL (paso 10) |

**Quién paga los bancos.** Solo el paso 4 toca `packages/engine` (4a, los ganchos, `GROUP_NOUNS` y la retirada de `renderNews`; 4b, el grabador), así que de E2 solo sus dos PR pagan los ocho tramos (D-54): 4.365 s de pruebas en serie, unos 73 min, que la matriz reparte en ocho tramos en paralelo (con seis tramos sumaron 82,8 min de runner y el más largo tardó 33,1; regla 4 de §17.1), sobre los 9 min de la rápida. Las dos cifras son de antes de que creciera «mundo y radio»: los 4.365 s suman cinco ficheros medidos el 21/09/2026 con el motor v83 (`ci.yml` l. 103-110), y los 5,5 min del tramo son de la corrida de `4d53bd7`, cuando tenía tres; desde el 26/09 lleva además `routeCensus.test.ts`, `stageKind.completo.test.ts`, `frozenSkeletons.test.ts`, `preRegistro.test.ts` y `legacy/golden.test.ts` (`ci.yml` l. 166-175), que suman 35,8 s de pruebas en local y 15 s de importación (medido por el refutador de código, `rc4/mundo_extra.log`): el tramo parte de unos 6,1 min (estimado) y el total en serie, de unos 4.401 s (Rcodigo-092). `ci.yml` no guarda el reloj de cada tramo (l. 135-136): el PR 4a lo apunta en su descripción. Y `timeline.test.ts` no lo pagan solo los PR de E2: desde el 4b es puerta de todo PR del motor, los de la táctica incluidos, que tienen que pasar I1, I3, B6 del `bytea` y B11 (riesgo 1 de §19.1); B6 del JSON solo se imprime en su tramo y falla de noche (Rcoste-008). El resto de E2 son PR de `typecheck` y rápida. La rápida crece con E2: las seis etapas congeladas y los mundos de PGlite de B1 y B12 añaden del orden de dos a cuatro minutos (estimado: dos mundos de B1c, uno de B1a y uno de B1b con tres etapas de doce corredores cada uno, más las unas 33 s medidas de B10). Y el job `test` gana `TEST_DATABASE_URL` en el 1a (decisión 17-w), para los dos casos de dos sesiones de `migrations.test.ts` (§13.10, punto 8), y después la usan el caso de dos dispositivos de B12 y B14 (18-j, 16-r): con ella empieza a correr en todo PR el test que hoy se salta sin ella, `calendarConcurrency.test.ts` (l. 45), que sigue en la base de la variable. Como vitest corre los ficheros en paralelo y todos vacían el esquema al empezar (`resetRealTestDb`, `testDb.ts` l. 102-124), cada uno de los tres nuevos usa una base propia del mismo servidor (`cyclingstar_migrate`, `cyclingstar_watch` y `cyclingstar_b14`): `realTestDbFor(nombre)`, un ayudante nuevo de `testDb.ts` del 1a, crea con `TEST_DATABASE_URL` la base `nombre` si no existe, la deja con `resetRealTestDb` y devuelve su URL, o `undefined` sin la variable (decisión 16-r).

### 16.8 Las cegueras

Las ocho del mapa 07 §5.2, y lo que E2 hace con cada una:

| # | Ceguera | Qué la tapa |
| --- | --- | --- |
| 1 | la radio guardada nombra desde el km 0 a los diez primeros de la etapa (`stageRun.ts` l. 558-568) | se corta al leer con la política de §7.7 (D-16, §11.16); B1a y B1c la barren; desde el 11a la radio sale de la línea sin lista (B16) |
| 2 | las pasadas de la crónica miran el futuro | la voz causal de §12.2; B19 |
| 3 | una respuesta lo lleva todo, altimetría con marcas incluida | cabecera, tramos y meta por separado (§14.2, §14.3); B1a, B18 |
| 4 | `chronicle.test.ts` l. 967-1013 prueba una copia de «leer o re-simular», no la de `routes/races.ts` | en parte: los mundos de B1 inyectan la ruta de etapa de verdad sobre etapas corridas en PGlite, con sus sucesos guardados, así que la rama «se lee» se ejerce; la copia de `chronicle.test.ts` se queda |
| 5 | ni `stageReplaySchema` ni `newsResponseSchema` en `contracts.test.ts`; ninguna ruta de etapa o de feed con test; los sucesos guardados no se validan al leer | los contratos, en el paso 0 (§17.3); `broadcast.test.ts`, `yesterday.test.ts` y el test de `/api/news` (§14); la línea se valida al decodificar (§4.3). Los sucesos de `stage_snapshots.events` siguen leyéndose con un `as` (`routes/races.ts` l. 477): no la tapa E2 |
| 6 | `schema.ts` l. 754 promete unos 22 KB de radio; son de 102 a 514 KB de JSON (mapa 07) y de 10,7 a 146,4 KB en `jsonb` en disco, con la compresión TOAST (juez del motor, D-11): dos medidas de cosas distintas | B6 sella la línea y lo servido; la radio deja de escribirse en el 11b (17-v), y el comentario nuevo del PR 5 dice las dos cifras con su unidad |
| 7 | `raceOfHeadline` y el país de los campeonatos leen texto inglés; el buscador por ganador sella un destripe | `raceId` en la noticia (§12.8); el buscador busca sobre lo ya cortado (§11, `sup. I3`); el país de los campeonatos queda para E10 |
| 8 | un suceso sin plantilla se pinta crudo | el `default` vacío y B7 (§12.5) |

### 16.9 La tabla final

| Banco | Qué | Nace | Suite | Umbral | Medido | Lo usa |
| --- | --- | --- | --- | --- | --- | --- |
| I1 | la foto reducida es la del motor | 3a la rápida sintética (`reduce.test.ts`); 4b el banco; 5 las seis congeladas (17-u) | banco y rápida | 0 | sí: 0 en 3.246 y en 8.656 | §4.4, §5.5 |
| I2 | el instante casa con la foto; el tránsito | 4b el banco (17-i) y 6a la rápida | banco y rápida | exacta; p90 ≤ 15 por etapa y ≤ 4 en total | sí: `l8/transito.mjs` | §4.4, §4.5 |
| I3 | claves y empaquetado | 3a las claves (`reduce.test.ts`); 4b el banco y la vuelta en `codec.test.ts`; 5 las seis | banco y rápida | 0 | sí: 0 en 46 | §4.3 |
| I5 | la traza de la crono cuadra con el resultado | 4b el banco; 5 la e16 | banco y rápida | igualdad | sí: 1.176 de 1.176 | §9 |
| B1a | el canario, en campos que la API sirve | 7a | rápida | 0 fugas; ningún 5xx; 5 rutas o más de las 6 que lo llevan, con la etapa vista | no | §10, §11 |
| B1b | el diferencial | 7a | rápida | 0 fuera de las dos tablas de §11.18; ningún 5xx; 10 rutas o más al verla | no | §11.18 |
| B1c | dos desenlaces | 7a | rápida | 0 fuera de la lista blanca; ningún 5xx | no | §10, §11 |
| B1d | la política completa | 0 (inventario) y 8a (17-b) | rápida | igual a §11.3 | sí: 140 registros (L6) | §14.5 |
| B2 | el estado contra los sucesos | 4b el banco (17-i) y 6a la rápida | banco y rápida | 0 en pertenencia; ±15 s en el 95 % | no, lo mide el 6a | §4.5, §6 |
| B3 | el rótulo y los maillots de la fuga | 6b | rápida; la presentación, además a mano sobre las 24 × 2 (paso 10) | 100 %: todos nombrados con su maillot en los grupos de hasta 12; en las cinco congeladas, la lista y la frase de toda fuga, la ronda entera a ×½ y ×1 y ningún rótulo de un escapado que ya no va por delante del pelotón; a mano, el 99 % de la ronda | la presentación, sí: L4 con la cola entera, en las congeladas 5 de 5 listas y frases y 21 de 21 rótulos, y en las 44 corridas 157 de 158 (`l4c/cola.mjs`); el rótulo, no | §6.7, §7.6, §7.7 |
| B4 | el re-render | 1a y 6b | rápida | igualdad | no | §12.7, §12.8 |
| B5 | la estabilidad | 12 | rápida | hash fijo | no | §12.7 |
| B6 | el tamaño | 0 (línea base), 4b (el JSON y el `bytea`, en el banco), 5 (las seis congeladas, 17-u), 6a (lo servido) y 7b (la etapa velada) | banco (el `bytea` de las 24 × 2 y la crono larga; el JSON, impreso), nocturno (el JSON de las 24 × 2), rápida (el `bytea` y el JSON de las seis) y a mano (la meta y la ruta conocida de las 24 × 2, paso 6) | `TIMELINE` y los cinco topes de red | sí: L3, L5, L6 y L7; lo guardado cabe en los topes de D-11, fijados sobre lo medido | §5.7, §9.2, §14.8, §15, §18.7 |
| B7 | la cobertura | 6b | rápida | las 54 más `crash`, con frase, rótulo y regla | sí: 54 (AST) | §6.6, §12.5 |
| B8 | el cliente | 6a; `withGroupRoles`, 6b | rápida | fijos: mediana ≤ 2 ms el tramo y ≤ 3 ms la cabecera; p95 de `instantAt` ≤ 0,25 ms en la etapa entera y en el tramo denso de la e20; `withGroupRoles` ≤ 10 ms por etapa; la ruta conocida ≤ 40 ms | sí: L7 y su corrector (0,54 y 0,71 ms; el fotograma con el memo, p95 de 0,034 a 0,053 ms); `withGroupRoles` y la ruta conocida, estimados | §4.11, §8, §12.6, §18.1 |
| B9 | el corte causal | 3a | rápida | igualdad | no | §4.6, §14.3 |
| B10 | la foto por km y el aprendizaje | 4b | rápida y nocturno (en dos ficheros) | igualdad; la ingenua cambia el aprendizaje | sí: 18 de 18 (L3); con el campo de `realRaceScenario`, la ingenua cambia el aprendizaje en 3 de 3 y en 36 de 44 (refutador de código) | §5.3 |
| B11 | observar no toca la carrera | 4a (humo con ganchos que cuentan) y 4b (el grabador, en el banco y en el humo) | banco y humo | huella igual, `efforts` incluido; las cronos, como cronos | sí: 20 de 20 y 24 de 24 | §5.1 |
| B12 | la aritmética del horizonte | 7a, 8a y 8b | rápida (dos dispositivos, contra el Postgres de servicio) | los 20 casos de §10.14, la cookie que no se re-firma y la cuenta del día | no | §10.14 |
| B13 | la procedencia | 7b | rápida | 0 | no | §7.8, §10.10 |
| B14 | la latencia del horizonte | 7a | rápida: puerta contra el Postgres de servicio; en PGlite solo informa | p95 ≤ 5 ms el jugador y `recordProgress` contra Postgres; en PGlite, falla solo por encima de 15 ms; el mánager, desde Railway (DD-21) | sí: por el socket de `testDb.ts`, 2,55-4,97 ms el jugador y 2,63-5,08 `recordProgress`; en PostgreSQL 16 sin red, 2,16, 3,88 el mánager y 2,44-3,25 | §10.7, §18.2 |
| B15 | el coste del tick | 5 y 10 | a mano, los días enteros | falla con más de un 25 % y más de 15 s a la vez; 0 lápidas; ninguna transacción con las subtransacciones desbordadas | proyectado con el prototipo (L7): +15,5 a +18,9 s el 179, +0,7 a +0,8 s el 176; la escritura de las 153 filas, medida, de 0,07 a 0,15 s | §5.8, §18.3 |
| B16 | la radio desde la línea | 11a (17-v) | nocturno y rápida, en `apps/api` (17-l) | igualdad en las 22 en línea con la lista vacía; los diez de la etapa nombrados con ella; el propio nombrado; las cronos, vacías | no | §12.10 |
| B17 | el ritmo medido | 0 (línea base), 3a (rápida) y 10b (la línea grabada) | a mano y rápida | las bandas de 8-k | sí: L4; la crono, el juez de ejecutabilidad y L5; el error de `estimateS`, L2 | §8.9, §9.4 |
| B18 | el servidor no adelanta | 3a (los 320 tramos sin un 429) y 7b (el 409 y la memoria vacía, 17-m) | rápida | 409; el tramo en el borde tras un informe con la memoria vacía; y ningún 429 por su propio límite | no | §10.11, §14.3, §14.5 |
| B19 | la voz es prefijo | 2; el segundo `it`, con la política de nombres real, 6b | rápida | 0 | sí: 0 en 15 y en 18 | §12.2, §12.3 |
| B20 | revelar sin castigo | 7a | rápida | nadie fuera de la lista lee lo visto | no | §11.11 |
| B21 | la posición del instante | 4b (17-i) | banco | informativo; < 1 km | sí: p99 52-508 m | §4.5 |
| B22 | el reloj estimado | 6a | rápida | p99 ≤ 1 km la cabeza; todos los grupos, informativo, con sus dos caras (16-s) | sí: máximo 0,69 km la cabeza (L1); todos los grupos, p99 0,84-0,89 km y máximo 2,62 (refutador) | §3.8, D-61 |
| PL | la prueba de lectura | 10 | a mano | nueve de nueve (diez de diez si hubo que sortear el punto de la fuga), con los maillots de la fuga y quién tira | no (sin evidencia) | §8.9, §16.5 |

Las fechas de nacimiento siguen al plan (§17), que movió varias respecto de lo que esta sección fijaba al escribirse: B1d al 8a (17-b), las versiones de banco de I2, B2 y B21 al 4b (17-i), B16 largo al nocturno de `apps/api` (17-l), B18 al 7b (17-m) con su caso del límite en el 3a, `PENDING_ROUTES` vacía en el 8b (17-n) y B13 en `apps/api` (17-t); B12 sigue a esta tabla (17-s). En la corrección siguen también al plan I1 en el 3a (su rápida nace con `reduce.ts`), la rápida de I1, I3 e I5 sobre las seis congeladas en el 5, con `broadcastFixtures.test.ts` (17-u), B6 en el 4b, el 5, el 6a y el 7b, B17 en el 3a y los tests de la capa fija y de la barra en el 3c (Rcobertura-056, Rcodigo-083); el `bytea` de B6 pasa del paso 5 al banco (16-n).

---

**Injertos aplicados.** I-02 (§16.2: I1, I2, I3 e I5 con su fixture, su suite, su umbral y sus cifras; la autocomprobación al grabar es §5.5), I-10 (§16.4: B9 con su código entero), I-12 (§16.4: B10 y B11 con su código entero, la cláusula de la envoltura ingenua y la prueba de humo), I-30 (§16.3: B1b diferencial con la lista blanca de §11.18 y la segunda cuenta, B1c de dos desenlaces con su código, y `PENDING_ROUTES` comprobada en los dos sentidos), I-35 (§16.4: B20; §16.6).

**Objeciones resueltas.** O-16 (§16.4: B16 en las 22 etapas en línea, con las dos cronos vacías, y en las seis congeladas antes de dejar de escribir la radio, que condiciona DD-11), O-17 (§16.4: B14 con 250.000 filas, el índice de la `0045` y p95 ≤ 5 ms), O-23 (§16.4: B15 sobre los días 176 y 179, con grabador y escritura y su umbral).

**Huecos rellenados.** H-04 (§16.5: el protocolo de la prueba de lectura, entero), H-10 (§16.4: B14), H-14 (§16.4: B15). Contradicciones de hecho que quedan resueltas: X-08 (§16.4, B15: las cifras de CPU del juez, de L3 y de L7 y el banco que las sella), X-09 (§16.4, B11: 20 de 20 y 24 de 24), X-10 (§16.4, B10: el colector aparte y la ingenua que rompe), X-11 (§16.4, B14) y X-24 (§16.4, B15).

**Decisión tomada aquí.**
- 16-a. Las etapas congeladas son seis y no cinco: las cinco en línea de B19 (`race-france` e7, e18 y e20, `race-flanders` e1 y `race-colombia` e5) y la crono `race-france` e16, que necesitan I5, B6 de las cronos y B9 de la crono; semilla 0 y campo del banco. `scripts/broadcast-fixtures.mjs` las escribe en dos veces, desde un mundo de PGlite con ids uuid (17-u): sucesos, radio y acta en el paso 2, para que B19 nazca con el `revealS` de lo guardado (el del adaptador, §3.8); la línea y lo que espera I1, en el 5 (no en el 4b: el reparto congelado nace en el 5, 17-k), de la misma corrida, y desde el 5 B19 usa la línea grabada.
- 16-b. I2: la igualdad en el km de foto, exacta; el tránsito, p90 ≤ 15 por etapa y p90 ≤ 4 en el conjunto, sobre lo medido en `l8/transito.mjs` (12 y 3). Descartado: el p90 ≤ 2 que fijó la síntesis, que falla en 23 de 44 corridas y describe las llanas, no las reinas.
- 16-c. I5 es una igualdad exacta, porque 9-a hace la última entrada de la traza `10 · tiempoS`. Descartado: la tolerancia de 5 Ds de §4.4, que solo hacía falta con `toDs`.
- 16-d. B1a busca valores plantados en campos del desenlace que la API sirve (el tiempo del ganador, un premio del día insertado para el corredor del jugador, los puntos del día, el `detail` del palmarés y la etapa de las noticias en `news.data`) y el nombre del ganador solo en el título, las `og:` y el correo, que no llevan listas; la identidad del ganador en el JSON es de B1c. Descartado: buscar el nombre en todo el JSON, que falla por construcción con la lista de salida; y, en la corrección L8 (Rcodigo-032), plantar en los ids de noticias y palmarés, que ninguna ruta sirve, y reescribir los premios del día, que en este mundo no existen porque solo cobran los corredores humanos.
- 16-e. Cada B1 lleva su cláusula de no vacío (el canario sale con la etapa vista; los ganadores son distintos; el visitante sin velo ve dos carreras; diez rutas cambian al verla) y `PENDING_ROUTES` se comprueba en los dos sentidos, por banco.
- 16-f. B1c deja pasar, además de la lista blanca de B1b, el tiempo de la cabecera: cambiar el desenlace obliga a cambiar la semilla de la etapa, que también decide el tiempo del día, y ese tiempo se sabe antes de salir.
- 16-g. Dónde corre cada uno: B10 corto en la rápida y largo en el nocturno con `CS_BANCOS=1`, en dos ficheros que corren en paralelo; B11 en «mundo y radio» con prueba de humo en `packages/engine/src/stage/`, que desde el 4b engancha el grabador de verdad; B6 del JSON, en el nocturno y en la rápida, y solo impreso en «mundo y radio» (16-n); B15, B17 largo, la presentación de B3 sobre las 24 × 2 y la PL, a mano en su paso, con la cifra en el PR.
- 16-h. Los topes de red de B6 son constantes con nombre (`maxHeadGzipBytes`, `maxChunkGzipBytes`, `maxFinishGzipBytes`, `maxVeiledStageGzipBytes`) con los valores de §14.8, sin evidencia de los jueces.
- 16-i. En la PL un punto cuenta si LAS DOS personas contestan bien todas las preguntas del punto: las cuatro de SPEC §6.15 y, con una fuga de hasta 12 delante del pelotón, qué lleva cada uno y quién tira detrás y por qué (Rdueno-004; cruzada de L4, Rdueno-003); la verdad sale de la línea (`scripts/pl-truth.mjs`), con los márgenes de 16.5; una pregunta que falla dos veces seguidas va al dueño.
- 16-j. B2: 0 contradicciones de pertenencia y 15 s en el 95 % de los huecos, medido en el 6a; si una familia no llega, se escribe la cifra con su causa.
- 16-k. B14 mide `computeHorizon` (sin memo, en la forma D de §18.2) y `recordProgress` por separado, cada uno con el umbral de D-33 (p95 ≤ 5 ms), y `computeHorizon` para dos espectadores: el jugador y `recordProgress` son la puerta en la suite rápida contra el Postgres de servicio del CI, y en PGlite solo informan y fallan por encima de 15 ms (18-j: por el socket de `testDb.ts` el jugador va de 2,55 a 4,97 ms entre corridas y la puerta sería intermitente, Rcoste-020); el mánager de un equipo de 30 se imprime y es puerta en la medida de §18.9, desde el servicio `web` de Railway contra una copia de producción, porque PGlite es Postgres en WASM de un solo hilo (§18.2). Si el mánager no pasa allí (del dueño, DD-21): por defecto `SPOILER_MODE` no pasa a `on` hasta que pase, como dice §15.6, y lo primero que se optimiza es la consulta 2, las carreras de la plantilla en `race_rosters`: en la forma D la cuarta ya no va en la petición (`lastRunStages`, 18-a), y en PostgreSQL 16 la 2 es la que pesa en el mánager, p95 de 2,50 ms, contra 0,98 la 1 y 1,11 la 3 (`coste/pgm/desglose.mjs`, refutador de coste; Rcoste-013). Descartado de esa corrección: memorizar las carreras de la plantilla por `(teamId, currentDay)`, porque `race_rosters` también cambia dentro del día (la web congela escuadras en `routes/calendar.ts` l. 242, `ensureRaceRosterFrozen`) y el memo dejaría una guardia vieja. Descartado: sumar las dos funciones en un solo p95 (con ellas juntas no pasaría ni el jugador, 3,1-3,7 más 3,05 ms), que mezcla el coste de leer, en cada petición con horizonte, con el de escribir, como mucho una vez cada 15 s por espectador y carrera (10-l).
- 16-l. B15 falla si la grabación suma en un mismo día, a la vez, más de un 25 % y más de 15 s, o si deja alguna lápida: el porcentaje decide en el día grande y los segundos en el pequeño. Con el prototipo pasan los dos días (§18.3): el 179 suma de 15,5 a 18,9 s, pero solo de un 15 a un 17 %; el 176 pasa del 25 % (de 2,2-2,4 s a 3,1 s), pero son 0,8 s como mucho. Descartado: exigir las dos cotas a la vez, que con el prototipo suspende cada día por la cota que no le toca; los segundos del 179, además, dependen de la máquina (en la de L7, 15 s son un 14 % de ese día).
- 16-m. Los umbrales de B8 salen de lo que midió L7 (§18.1), con un margen de cuatro a cinco veces, y son fijos: mediana ≤ 2 ms el tramo mayor (medido, 0,54) y ≤ 3 ms la cabecera (0,71); p95 de `instantAt` ≤ 0,25 ms con el paso 9 memorizado, sobre todos los fotogramas de las seis a pasos de 1 s y sobre los 600 seguidos del tramo de más grupos de la e20 (medido con el memo, de 0,034 a 0,053; sin él, 0,51 y 0,66, que falla). El umbral nunca se deriva de la medida del mismo PR: si el 6a no cabe, se optimiza antes de fusionar o se decide con la cifra (18-l; Rcoste-021 y Rcoste-045). B8 mide además `withGroupRoles` (≤ 10 ms por etapa) y el parse de la ruta de etapa conocida (≤ 40 ms), en la API. Descartado: 10 ms y 2 ms, de 14 a 36 veces lo medido, que solo cazarían una regresión de un orden de magnitud; el umbral de «cinco veces lo que mida el 6a», que deja pasar cualquier coste; y los 600 primeros fotogramas o 600 repartidos, que no ven el paso 9 o que el memo no aprovecha.
- 16-n. B6 mide cada tope donde se puede medir: el `bytea` con gzip 9 en el banco sobre las 24 × 2 y la crono más larga de 176 corredores del calendario (`timeline.test.ts`, con `gzipSync` de `node:zlib` bajo un `eslint-disable-next-line`, como los tests del motor que ya leen ficheros) y en la rápida sobre los seis `.timeline.gz`; el JSON imprime sin fallar en el tramo de un PR y falla en el nocturno sobre las 24 × 2 (los dos, `timeline.test.ts`) y en la rápida sobre las seis (`broadcastFixtures.test.ts`); la cabecera y los tramos, con `app.inject` sobre las seis cargadas en PGlite; el paquete de meta y la ruta de etapa, velada y conocida, sobre la etapa corrida de `routes/broadcast.test.ts`, la única con resultado, general y noticias, y a mano en el paso 6 sobre las 24 × 2 (`scripts/broadcast-fixtures.mjs --sizes`). Corregida en la corrección L8 (Rcodigo-065): decía que el `bytea` de las 24 × 2 se medía a mano en el paso 5 «porque el motor no importa `node:*` ni en sus tests»; la regla de `eslint.config.js` (l. 101-127) se salta en los tests con un comentario y el repositorio ya lo hace (`packages/engine/src/routes/arranque.test.ts` l. 3-6), así que la medida a mano dejaba el tope sin vigilancia automática sobre lo que graba el motor de cada día. Descartado: comprimir en el motor con `CompressionStream`, que no deja elegir el nivel 9. En el cierre de L8 (cruzada de L3, Rcoste-008), de las dos salidas de §5.7 para la mediana del JSON, que tiene un 15 % de margen sobre lo medido, la que deja el JSON sin fallar en el tramo del PR, porque es la única con la que un paso de la táctica no se pone en rojo por un umbral de E2. Descartado: sacar los cuatro topes de `TIMELINE` a `packages/shared`, que no quita ese rojo, porque `timeline.test.ts` sigue corriendo en el tramo con la constante viva donde viva. La cifra de la mediana es de §15.2: 320 KB (327.680 B), 1,44 veces lo medido (15-l, la cruzada de L3 aplicada en la coherencia).
- 16-o. La lista blanca de B1b no se escribe aquí: `B1B_WHITELIST` y `B1B_VEIL` son las dos tablas de §11.18, su única fuente, copiadas fila a fila con la columna «Campos (`strip`)», con la gramática de `strip`, que gana `[veiledDay]` para la fila de `/api/riders/me/form` (la fila del día de la etapa aparece, no cambia) y `[stageReady]` y `[toWatch]` para los marcadores del velo; y B1b comprueba que cada ruta de la primera es L en el registro. Descartado: una traducción propia de la prosa, que ya se había separado de §11.18 justo en esa fila (quitaba los campos de la fila, que no existe antes de correr la etapa).
- 16-p. (Corrección L8; Rcobertura-051.) B3 exige que se nombre a todos, con su maillot resuelto, en todo grupo de hasta `nameWholeGroupUpTo`, con una cláusula de no vacío sobre una fuga sintética con un campeón y un líder, y sella en una segunda parte la presentación de la fuga de 6-m (la lista, la frase y la ronda de la moto), que en el cierre (cruzada de L4, Rcobertura-023 y Rdueno-003) corre el reproductor de verdad sobre las cinco congeladas a ×½, ×1 y ×2 y en `Highlights`, con el 100 % de listas y frases, de la ronda a ×½ y ×1 y de rótulos que no empiezan cuando su corredor ya no va por delante del pelotón (6-m), y a mano en el paso 10 sobre las 24 × 2, con el 99 % de la ronda. Descartado: `named.length + others = size` como umbral, que cumple por construcción cualquier política, también una que no nombre a nadie; y el tope de 30 s de pared por rótulo que proponía Rcobertura-023, que con 36 s medidos en el peor caso fallaría sin que se perdiera ningún rótulo: el retraso se imprime.
- 16-q. (Corrección L8; Rcodigo-032, Rcodigo-062, Rcodigo-064, Rcodigo-087.) El mundo de B1 corre con una sola sesión de base (`DB_POOL_MAX=1`), vacía las cachés del horizonte tras correr la etapa velada, planta el canario en campos que viajan, quita la cuenta atrás de `/health` al normalizar, y cada B1 exige que ningún barrido tenga un 5xx. Descartado: dejar que un 500 cuente como respuesta, que convierte a B1b y B1c en bancos que comparan dos errores.
- 16-r. (Corrección L8; Rcodigo-084, Rcoste-020.) Lo que necesita varias sesiones de verdad (el caso de dos dispositivos de B12) y la puerta de B14 corren contra el Postgres de servicio del job `test`, cada fichero en su propia base (`realTestDbFor`), porque vitest corre los ficheros en paralelo y `resetRealTestDb` vacía el esquema. Descartado: PGlite, que con un solo backend hace pasar el caso de concurrencia aunque falte el `for update`.
- 16-s. (Corrección L8; Rcobertura-055 y Rcodigo-047, las dos caras.) B22 sigue siendo puerta solo en la cabeza (D-07) e informa del p99 y del máximo de todos los grupos; si el p99 de todos pasa de 1 km decide el dueño antes de abrir en `Watch` las etapas del adaptador (§20.6, 20-l), y si pasa de 2 km esas etapas pintan en el perfil solo la cabeza y el grupo del título. Medido: de 0,84 a 0,89 km. Descartado: la puerta solo en la cabeza sin informar de los demás, que es el grupo que mejor sale.
- 16-t. (Corrección L8; Rcodigo-027, Rcodigo-096, Rcobertura-042 y Rdueno-008.) B16 compara las 22 etapas en línea con la lista vacía (igualdad) y con los diez primeros de la etapa (nombrados), con los mismos nombres en los dos lados, comprueba el propio de R23.7 y que las cronos dan radio vacía. Descartado: «las 24 etapas», que nacía en rojo en las dos cronos.
- 16-u. (Corrección L8; Rcodigo-091, Rcodigo-030 y Rcodigo-031.) La prueba de humo de B11 engancha el grabador desde el 4b, las cronos del banco se corren como cronos con el `timeTrial` del calendario y la huella compara `efforts` por sus entradas. Descartado: una prueba de humo con ganchos que solo cuentan, que no ve un cambio de `packages/shared` que haga al grabador tocar lo que el motor lee.
- 16-v. (Corrección L8; Rcobertura-053, en parte.) Cada umbral de banco se escribe una vez, en esta sección (las bandas de B17, en 8-k, que esta sección cita), y en el código vive en una sola constante del fichero de test que lo usa, con su comentario de procedencia. Descartado: el bloque `BENCH` en `packages/shared/src/broadcast/constants.ts` que proponía el hallazgo, porque ese fichero lo carga la web y los umbrales de un test no son constantes del producto; los topes de B6 sí están en `BROADCAST`, porque §14.8 y §15.3 los fijan como topes de lo que se sirve.
- 16-w. (Corrección L8; Rdueno-004; en el cierre, cruzada de L4, Rdueno-003.) La prueba de lectura pregunta además, con una fuga de hasta 12 delante del pelotón, qué lleva cada uno, contestado mirando la barra, y quién tira detrás y por qué, con la verdad del `worn` y de `pullingLineOf`. La corrección decía de 4 a 12; una fuga de uno a tres también lleva maillots que ver, y el requisito del dueño es de la fuga, no de su tamaño. Descartado: medir el requisito literal del encargo solo con bancos, que dicen que el dato está y no que se entiende.

**Propuesto para el glosario.**
- Los fixtures `apps/api/src/__fixtures__/broadcast/` (`<etapa>.timeline.gz`, `.events.json.gz`, `.radio.json.gz`, `.i1.json.gz`, `.acta.json.gz`, `manifest.json` y `load.ts` con `FIXTURES` y `loadTimeline`) y los scripts `scripts/broadcast-fixtures.mjs`, `scripts/bench-tick.mjs`, `scripts/bench-pace.mjs` y `scripts/pl-truth.mjs`.
- `apps/api/src/__fixtures__/spoilerWorld.ts`: `startSpoilerWorld`, `SpoilerWorld`, `Swept`, `sweep` (con su `skip`), `strip`, `normalize`, `routeOf`, `pendingFor`, `serverErrors`, `PENDING_ROUTES`, `SKIP`, `B1B_SKIP`, `B1B_WHITELIST`, `B1B_VEIL` y `B1C_WHITELIST`.
- `BROADCAST.maxHeadGzipBytes` (16.384), `maxChunkGzipBytes` (12.288), `maxFinishGzipBytes` (40.960), `maxVeiledStageGzipBytes` (4.096) y, desde la corrección L8, `maxKnownStageGzipBytes` (112.640, la ruta de etapa conocida): topes de banco, no de escritura, como los de `TIMELINE` (15-g).
- La variable `CS_BANCOS` (`1` en el nocturno) y las exportaciones `runOneStage`, `StageRunSpec`, `timelineTickLog`, `TimelineTickLog` y `clearHorizonCaches` (solo para los tests, §10.6) de `packages/db/src/index.ts`; `realTestDbFor(nombre)` en `packages/db/src/testDb.ts` (16-r).
- Los tokens `[veiledDay]` (la fila de un array cuyo `gameDay` es el de la etapa velada), `[stageReady]` (las filas `stage_ready`) y `[toWatch]` (la cuenta `stagesToWatch` de la carrera velada) de la gramática de `strip`, y la opción `--sizes` de `scripts/broadcast-fixtures.mjs` (el paquete de meta y la ruta de etapa conocida de las 24 × 2, paso 6; el `bytea` pasó al banco, 16-n).
- (Corrección L8.) `packages/db/src/timelineCollectorBench.ts` (`watch`, `seedOf`, `same`, `QUICK` y `LONG`) y los ficheros del nocturno `timelineCollector.long1.test.ts` y `timelineCollector.long2.test.ts`; `packages/db/src/watchConcurrency.test.ts` (B12, dos dispositivos); `apps/web/src/domain/broadcast/breakPresentation.test.ts` (la segunda parte de B3); el campo `stagesToWatch` de `riderRaceResultSchema` que B1b quita (§14.2).
- Los ficheros de test nuevos de esta sección: `apps/api/src/spoilerCanary.test.ts`, `spoilerDiff.test.ts`, `spoilerOutcomes.test.ts`, `spoilerRegistry.test.ts`, `broadcastCut.test.ts`, `broadcastFixtures.test.ts`, `broadcastPace.test.ts`, `voicePrefix.test.ts` y `radioAdapter.test.ts`; `packages/db/src/timelineCollector.test.ts`, `horizonLatency.test.ts` y `revealFree.test.ts`; `packages/engine/src/stage/probeHooks.test.ts`; `apps/web/src/domain/templateCoverage.test.ts`, `stageJournal.corpus.test.ts` y `broadcast/clientCost.test.ts`.

**Dudas para el ensamblador.**
- B6 con los topes de D-11 nace en rojo con lo que midió L3 (§5.7): la línea de 20,9 a 70,0 KB contra 48 KB, el JSON de 123 a 464 KB contra 128 KB y las cronos de 176 corredores contra 16 KB. Esta sección no reabre D-11; §15.2 y §18 tienen que decidir con la propuesta de L3 (96 KB, 640 KB, 256 KB y 32 KB) antes del paso 5. (Cerrada: §5.7 y §15.2 llevan ya los topes que midió L3, con el de la crono en 48 KB, 15-i, y la mediana del JSON en 320 KB, 15-l, y B6 los cita.)
- §4.4 escribe I5 con una tolerancia de 5 Ds y §G.9 escribe I2 con «p90 ≤ 2»: 16-c y 16-b los cambian, y los dos sitios deberían decirlo. (Cerrada: §4.4 escribe I5 como igualdad exacta y §G.9 lleva I2 con 16-b.)
- §15 no tiene los topes de red de B6: 16-h propone nombres y valores (los de §14.8). (Cerrada para los cuatro de 16-h, que §15.3 ya lleva; y, en la auditoría L8, para `maxKnownStageGzipBytes`, que §15.3 lleva también, 15-constantes.md l. 154.)
- La introducción de §11 describe B1a como «el nombre del ganador de una etapa velada no sale en ninguna respuesta»; con 16-d, el nombre se busca en el título, las `og:` y el correo, y en el JSON se buscan valores plantados (la identidad es B1c). (Cerrada: la introducción de §11 ya no lo dice.)
- §5.10 dice que B10 corre «en las 24 etapas del mapa 07 §7»: son las 22 en línea, porque en una crono no hay fotos de radio. (Cerrada: §5.10 ya lo dice.)
- §G.9 cita B19 con «0 en 15 corridas por ingeniero»: ahora también 0 en 18 con el `revealS` real (§12.2). (Cerrada: §G.9 lo dice.)
- §17 tiene que llevar: el script de fixtures en el paso 2 y su segunda mitad en el 4b; `CS_BANCOS=1` en `cobertura.yml` en el 4b; las exportaciones de `packages/db` en el 7a; y el umbral de I2 del 6a. (Cerrada en la auditoría L8: §17 lleva el script en el 2 y su segunda mitad en el 5, no en el 4b, 17-u; `CS_BANCOS=1` en el 4b; las exportaciones de `packages/db` en el 2, el 5 y el 7a; y el umbral de I2 es el de 16-b.)

**Dudas del cierre (lote L8).** Lo que el cierre no puede arreglar desde esta sección:
- B14 (16-k): si el mánager, que en PGlite da de 8,6 a 9,3 ms, no pasa contra Postgres en el paso 7, la decisión es del dueño; §20 tiene que recogerla, y §15.6 y la tabla de §18.10 tienen que decir que B14 mide dos espectadores y `recordProgress` aparte. (Cerrada: DD-21 en §20, §15.6 y la tabla de §18.10 ya lo dicen.)
- B15 (16-l) y B8 (16-m) cambian umbrales que §18.1, §18.3 y §18.10 citan todavía con los valores de antes (un 25 % y 15 s a la vez; 10 ms y 2 ms): esas filas tienen que tomar los de §16.4. (Cerrada: §18.1, §18.3 y §18.10 citan ya los de §16.4, corrección L7.)
- B6 (16-n): el paso 5 de §17 tiene que llevar `scripts/broadcast-fixtures.mjs --sizes`; el tope del paquete de meta y el de la ruta de etapa velada se miden en `routes/broadcast.test.ts` (§14.7), que es de L6. (Superada por 16-n corregida: `--sizes` es del paso 6 y mide la meta y la ruta conocida, y el `bytea` está en el banco; va por la cruzada de L8 a §17.)
- B10: el PR 4b tiene que exportar `realRaceScenario` en `packages/engine/src/index.ts`; ni la lista de exportaciones de §5.10 ni §17 lo dicen. (§17 ya lo dice, 17-j; y, en la auditoría L8, la lista de §5.10 también, 05-motor.md l. 662: cerrada.)
- B11: el código anterior exigía `onEvent` en las seis cronos, que §5.2 dice que no lo llaman; ya exige lo contrario. Si §5 cambia y la crono pasa a emitir por `onEvent`, este `it` cae y hay que re-sellarlo. (Queda como aviso para quien implemente: §5.2 sigue diciendo que la crono no llama a `onEvent`, 05-motor.md l. 63.)
- B12: sus casos van en dos ficheros (`packages/db/src/horizon.test.ts` y los tests de rutas de §14.7) y en tres PR (7a, 8a y 8b); el esqueleto (§17.11) pone B12 y B13 en el paso 8. §17 tiene que seguir a §16.9 o decir por qué no. (Cerrada: 17-s.)
- B1b (16-o): §11.18 describe la fila de `/api/riders/me/form` en prosa y `B1B_WHITELIST` la traduce con `[veiledDay]`; si el ensamblador prefiere que la tabla de §11.18 lleve además las rutas de campos en una columna, la traducción deja de quedar al implementador. (Cerrada: §11.18 lleva la columna «Campos (`strip`)», corrección L7, y `B1B_WHITELIST` la copia; ver la última de este bloque.)
- B1c depende de 8-g (`TimelineCast.favourites`, propuesto por §8): sin los favoritos congelados, `preview.favourites` se lee con los atributos de hoy, que difieren entre los dos desenlaces, y B1c nace en rojo (nota de L4). (Cerrada en la corrección L2: `TimelineCast.favourites` está en §4.2, 4-u.)
- (Corrección L8.) La lista blanca de B1b ya lleva sus rutas de campos en §11.18 (corrección L7), y el código de §16.3 las copia: la duda de 16-o y la 1.12 quedan cerradas. La 1.6 (B22 solo mide la cabeza) y la 1.10 (B16 en las cronos) quedan cerradas por 16-s y 16-t.
