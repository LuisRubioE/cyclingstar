## 16. Los bancos y los tests

Esta sección escribe cada banco y cada invariante de §G.9 con su nombre, lo que mide, cómo lo mide, sobre qué fixture, en qué suite del CI corre y con qué umbral; escribe entero el código de B1a, B1c, B9, B10 y B11 como tests de vitest y el protocolo de la prueba de lectura, y cierra con la tabla de todos. Escribe como hechos D-11, D-33 y D-60. Las medidas son de quien se nombra en cada una: el juez del motor (`juez-motor/`), los redactores de §3 (`l1/`), §5 y §13 (`l3/`), §6 y §8 (`l4/`), §10 y §14 (`l6/`) y §11 y §18 (`l7/`), y las nuevas de esta sección, en la carpeta `l8/` del scratchpad de la síntesis: `l8/transito.mjs` (el umbral de I2), `l8/voz.mjs` y `l8/voz2.mjs` (B19 con la hora de revelado real) y `l8/plantillas.mjs` (B7). Las líneas son las de HEAD `9c21885`, sin cambios de código desde entonces.

Tres reglas de todo el catálogo. La primera: un banco que puede pasar sin probar nada lleva una cláusula que lo impide (el canario tiene que salir con la etapa conocida, los dos desenlaces tienen que ser distintos, la envoltura ingenua tiene que romper B10), porque la trampa que ya conoce el repositorio es un CI en verde con el simulador sin ejecutar (`ci.yml` l. 198-202). La segunda: donde un umbral no tiene medida de los jueces se dice «sin evidencia de los jueces», y el paso que lo estrena lo mide y escribe la cifra. La tercera: lo que cambia `packages/shared` no dispara los bancos (el filtro es `^packages/engine/`, `ci.yml` l. 189), así que todo banco que dependa de código de `shared` tiene además una versión en la suite rápida sobre etapas congeladas (D-52).

### 16.1 Lo que protege hoy el relato y lo que se re-sella a propósito

El mapa 07 §1 leyó los 24 tests que tocan el relato. Los que E2 pone en rojo a propósito se re-sellan en el paso que cambia lo que protegen, con la causa escrita en el propio test, que es como lo hace el repositorio (mapa 07 §1.5):

| Test | Qué protege hoy | Paso | Qué cambia |
| --- | --- | --- | --- |
| `apps/web/src/components/raceRadioNames.test.tsx` (6) | `groupName`: `Peloton`, `Bunch together`, `Lead group`, `2nd group`, `Chase group`, `No man’s land`, `Grupetto` (l. 11-41) | 6 | las palabras de la barra de D-18 (§6.3) |
| `packages/engine/src/sim/coherence.ts`, `GROUP_NOUNS` y `WATCHED_GROUP_NOUNS` (l. 571-635) | qué nombre de grupo puede decir cada plantilla | 4a | `the gruppetto`, las filas de §12.5 y las de `mainNoun` (§12.6); `storyMetrics` (l. 736-738) se remide sobre las 60 etapas de `coherence.test.ts` l. 347-360 y la cifra va en el PR, que sigue en tres o menos por construcción |
| `apps/web/src/domain/stageJournal.test.ts` (140) | frases, variantes y vocabulario | 4a, 6b y 12 | 4a: el test de los tres nombres (l. 1646-1650) pasa a cuatro; 6b: casos de `mainRole` y de las plantillas nuevas, y «meteorito: Ana» (l. 89-93) da línea vacía; 12: las variantes, UNA vez, por la semilla neutra (§12.7) |
| `packages/engine/src/world/news.test.ts` (3) | el titular inglés, regex y menos de 70 caracteres (l. 20-38) | 4a | se muda a `packages/shared/src/news.test.ts` con los trece `kind` (§12.8) |
| `packages/db/src/abandon.test.ts` l. 232-237 | el titular del abandono leyendo `news.text` | 1a | se comprueba renderizando `data` |
| `apps/web/src/domain/newsFeed.test.ts` l. 32-44 | `raceOfHeadline` busca la carrera en el texto inglés | 1b | el enlace sale de `raceId`; la función muere |
| `apps/web/src/domain/narration.test.ts` (4) | `narrate` y la clave cruda de `personalNarration` | 12 | se borran con `narrate()` (§12.9) |
| `apps/web/src/domain/raceTimeline.test.ts` l. 120-128 | el buscador por ganador, que sella un destripe | 9b | busca sobre la lista ya cortada (§11, `sup. I3`) |
| `packages/db/src/stageRun.test.ts` l. 322-339 | radio guardada con más de 10 km, grupos no vacíos y primer hueco 0 | 11 | lo mismo sobre `radioFromTimeline` y la fila de `stage_timelines` (DD-11, §12.10) |

Lo que sigue en verde sin tocarlo, y es la red de E2: `apps/api/src/chronicle.test.ts` (62: sin `live`, el acta es la de hoy, §12.4); `apps/web/src/components/leaderJerseys.test.tsx` (7: `JerseyKind` sigue con tres valores, y las cinco categorías del rótulo viven en `WornJersey`, §7.2); `packages/engine/src/index.test.ts` l. 465 (`ENGINE_VERSION` sigue en 89, D-09); «la radio no toca la carrera» (`packages/engine/src/sim/raceRadio.test.ts` l. 748-799), que B11 extiende sin sustituir; las huellas de `stage/attribution.test.ts` y `timetrial.test.ts`; `checkReplay` y «se lee, no se re-simula»; `coherence.test.ts` y `stage/journal.test.ts`, que son el contrato del suceso y E2 no toca ningún suceso (§5.9); y `stageTables.test.tsx` y `stageStoryJerseys.test.tsx`, que separan el maillot de la carretera del de después.

### 16.2 Los invariantes I1, I2, I3 e I5

Los enunciados son de §4.4 (I-02); aquí van su fixture, su suite y su umbral.

**Los fixtures.** Dos juegos. El primero son las 24 etapas del mapa 07 §7 (las 21 de `race-france`, `race-flanders`, `race-tramuntana` y `race-colombia` e5) con las semillas 0 y 1, corridas por el motor dentro del banco: cambian con el motor y miden el motor. El segundo son etapas CONGELADAS en `apps/api/src/__fixtures__/broadcast/`, que no dependen de la versión del motor (D-43) y miden `packages/shared` y la API: cinco en línea (`race-france` e7, llana; e18, reina; e20, reina larga; `race-flanders` e1; `race-colombia` e5, 126 corredores) y una crono, `race-france` e16, con la semilla 0 y el campo del banco (decisión 16-a). Cada una son cinco ficheros: `<etapa>.timeline.gz` (el `body` de `stage_timelines`, gzip 9 de `StoredTimelineV1`, §4.3), `<etapa>.events.json.gz` (`stage_snapshots.events`), `<etapa>.radio.json.gz` (la radio completa del colector, para B16 y B22), `<etapa>.i1.json.gz` (lo que I1 espera en cada bloque de foto: `radioKmFrom` de la foto del MOTOR con el título de la línea, porque la radio del colector hereda el título del km anterior y difiere en 4 de 3.246 fotos, §5.5) y `<etapa>.acta.json.gz` (las `ChronicleEntry` del acta, para B4 y B5 en la web), más un `manifest.json` con motor, semilla, campo, tamaños y `sha256` de cada fichero. Los escribe `scripts/broadcast-fixtures.mjs` desde el `dist` del motor con el grabador real; regenerarlos es un PR propio, nunca efecto de subir la versión del motor. Pesan en conjunto menos de 1,5 MB (estimado: de 21 a 70 KB cada línea, medido por L3, más los sucesos, la radio y el acta comprimidos).

| Invariante | Qué afirma | En el banco (las 24 × 2) | En la suite rápida | Umbral | Medido |
| --- | --- | --- | --- | --- | --- |
| I1 | en cada bloque de foto, `photoAt` proyectada es `radioKmFrom` de la foto del motor con el título de la línea, con la tolerancia de relojes iguales que cubre también el `kind` (§4.4, §5.5) | `packages/engine/src/sim/timeline.test.ts`, contra las fotos del motor (`selfCheckI1`) | `apps/api/src/broadcastFixtures.test.ts`, contra `<etapa>.i1.json.gz`; y `packages/shared/src/broadcast/reduce.test.ts` sobre fotos sintéticas (D-52) | 0 discrepancias | 0 en 3.246 fotos (`estado`), 0 en 8.656 con la tolerancia (L3; 1 sin ella) |
| I2 | en la hora en que un grupo cruza un km de foto, sus miembros en `instantAt` son los de `photoAt` menos los pintados en un grupo de detrás; y el tránsito cada 30 s de carrera | ídem | ídem, sobre las cinco en línea | la igualdad, exacta; el tránsito, p90 ≤ 15 por etapa y p90 ≤ 4 en el conjunto (decisión 16-b) | abajo |
| I3 | `clave(k + 10)` es la reducción de `clave(k)`; `decodeTimeline(encodeTimeline(tl))` es `tl` | ídem | ídem | 0 | 0 en 46 corridas (L3) |
| I5 | en una crono, `startDs[r]` es la salida del plan, `kmClockDs[r]` no decrece y su última entrada es `10 · tiempoS` | ídem, en las dos cronos de las 24 | ídem, en la e16 | igualdad exacta (decisión 16-c, por 9-a) | 1.176 de 1.176 corredores con un error de 5 Ds como mucho con `toDs` (L3, `l3/i5.mjs`); con 9-a, igualdad |

**El umbral de I2** (decisión 16-b). §4.4 dejaba el p90 ≤ 2 de §G.9 para fijarlo aquí sobre el fixture, porque L1 lo vio fallar en la e18 (p90 de 3 a 5). `l8/transito.mjs` cuenta los corredores en tránsito (en dos grupos a la vez o en ninguno) cada 30 s de carrera, con la cuenta de `l1/corte.mjs` (posición exacta de cada grupo por su reloj en cada bloque), en las 22 etapas en línea de las 24 con las semillas 0 y 1: 44 corridas y 26.073 muestras. En el conjunto, p50 0, p90 3, p95 6, p99 26 y máximo 129; en dos grupos a la vez, p90 0 y p99 2; en ninguno, p90 2 y p99 21. Por etapa, el p90 va de 0 a 12, con mediana 3: pasan de 2 en 23 de 44 corridas, de 5 en 8 y de 8 en una, la reina e19 con la semilla 1 (p90 12, p95 21); las llanas dan 0. El tránsito es la carrera partiéndose, no un defecto del corte: en una reina los grupos se deshacen entre dos km de foto y el instante los enseña como `↓ 3 dropping back` (pantalla, §6.2). Por eso el umbral no puede ser el de las llanas: p90 ≤ 15 por etapa (el peor medido es 12) y p90 ≤ 4 en el conjunto (medido 3), con la igualdad de los grupos en su km de foto exacta, que es lo que afirma la primera mitad de I2.

**Cómo se lee cada uno en rojo.** Si I1 falla, `photoAt` o `reducePhoto` ya no reproducen la foto del motor: se mira la primera discrepancia (`I1Mismatch`, §4.4), que dice bloque, grupo y campo. Si falla la parte exacta de I2, el corte diagonal (§4.5) pinta a alguien fuera de su grupo en el único instante en que hay verdad. Si sube el tránsito sin fallar lo exacto, algo hace más lentos los cambios de grupo y el umbral lo caza antes que la pantalla. I3 en rojo es un formato que ya no se lee a sí mismo, y va antes que todo lo demás en el mismo fichero.

### 16.3 B1a a B1d

El canario B1 es la cuarta de las cuatro piezas que se vigilan entre sí (D-32, §10.1): recorre lo que registra Fastify y no una lista a mano, así que una ruta nueva entra sola en el barrido. Se parte en cuatro, porque cada mitad caza lo que la otra no ve (I-30, D-54): B1a busca VALORES que solo existen en el desenlace; B1c busca IDENTIDADES y órdenes, que el canario no puede buscar porque el ganador ya sale en la lista de salida; B1b busca lo que la existencia de una fila o de un aviso delata (§11.6), y B1d, que ninguna ruta se quede sin clasificar.

| Banco | Qué afirma | Cómo | Fixture | Suite y fichero | Umbral | Nace |
| --- | --- | --- | --- | --- | --- | --- |
| B1a | ninguna respuesta lleva el desenlace de una etapa velada | tras correr la etapa se plantan valores canario en sus filas de resultado y se barren todas las `GET` del registro con la sesión del jugador; el título, las `og:` y el aviso se miran con el nombre del ganador | `spoilerWorld.ts`: una carrera en guardia por corredor propio, doce corredores, etapas 1 y 2 vistas y la 3 velada | rápida, `apps/api/src/spoilerCanary.test.ts` | 0 fugas fuera de `PENDING_ROUTES`; con la etapa vista, canario en 5 rutas o más | 7 |
| B1b | correr la etapa no cambia un byte para quien no la ha visto | barrido antes y después de correr la 3, mismo día de juego; y otra cuenta que ve y revela la etapa no cambia lo que recibe la primera (§11.19) | ídem | rápida, `apps/api/src/spoilerDiff.test.ts` | 0 diferencias fuera de la lista blanca de §11.18; con la etapa vista, 10 rutas distintas o más | 7 |
| B1c | dos desenlaces distintos dan los mismos bytes | dos bases con el mismo mundo y la misma historia hasta la 2, y la 3 corrida con dos semillas cuyos ganadores difieren | ídem, dos veces | rápida, `apps/api/src/spoilerOutcomes.test.ts` | 0 diferencias fuera de la lista blanca más el tiempo de la cabecera; el visitante sin velo ve 5 rutas distintas o más | 7 |
| B1d | toda ruta con cuerpo declara su política y su mecanismo | construye la app, lee `app.spoilerRegistry` y lo compara con la tabla de §11.3 escrita en el test; una app con una ruta sin `config.spoiler` no arranca | la app sin base y con base | rápida, `apps/api/src/spoilerRegistry.test.ts` | igualdad exacta con la tabla | 7 |

**Las rutas pendientes.** El registro existe desde el paso 7, pero las rutas se cierran en el 7b, el 8a, el 8b, el 9a y el 9b (la columna «Cierra» de §11.3). Para que la suite siga en verde mientras tanto sin mentir, `PENDING_ROUTES` lista cada ruta que todavía destripa, con el PR que la cierra y los bancos que la ven; cada test comprueba LAS DOS cosas: que ninguna ruta fuera de la lista falla, y que cada ruta de la lista sigue fallando. Así un PR que cierra una ruta tiene que quitarla de la lista (si no, el test dice «ya no destripa: quítala»), y una ruta que vuelve a destripar después no se puede esconder. La lista nace llena en el 7a, se vacía en el 9b y en ese PR se borra la constante.

```ts
// apps/api/src/__fixtures__/spoilerWorld.ts (nuevo, paso 7): el mundo de B1a, B1b y B1c. PGlite, suite rápida.
import { gameState, raceRosters, raceWatch, riderAttrs, riderHidden, riders, runOneStage, teams, timelineTickLog, worlds, type StageRunSpec } from '@cyclingstar/db'
import { type TestDb, startTestDb } from '@cyclingstar/db/test'
import { SEASON_CALENDAR } from '@cyclingstar/engine'
import { ATTRIBUTES } from '@cyclingstar/shared'
import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../app.js'
import { createAuth } from '../auth.js'

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
 * La lista blanca de B1b: ruta → campos que pueden cambiar al correrse una etapa velada. Su ÚNICA fuente es la tabla de §11.18:
 * una entrada por fila, con la ruta como la registra Fastify y la segunda columna en la gramática de `strip` (con puntos; `[]`
 * recorre un array; `[veiledDay]` quita de un array la fila cuyo `gameDay` es el de la etapa velada). Aquí no se escribe nada
 * que no esté allí: una ruta nueva entra antes en §11.18, con su motivo en `config.veil.why` (decisión 16-o).
 */
export const B1B_WHITELIST: ReadonlyMap<string, readonly string[]> = new Map([
  // las filas de §11.18, y ninguna más
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

const specOf = (stageDay: number): StageRunSpec => {
  const s = RACE.stages.find((x) => x.index === stageDay)!
  return { raceKey: RACE_KEY, raceId: RACE_ID, raceName: RACE.name, level: 'WT', raceClass: 'WT', season: 0, stageDay,
    kind: s.kind, profile: s.profile, timeTrial: s.timeTrial === true, isFinal: false, timeline: timelineTickLog() }
}

/** Siembra el mundo, corre la 1 y la 2 con `baseSeed`, da de alta al jugador con lo visto hasta la 2 y deja el reloj en el día de la 3. */
export async function startSpoilerWorld(baseSeed: string): Promise<SpoilerWorld> {
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
  for (const day of [1, 2]) await t.db.transaction((tx) => runOneStage(tx, worldId, dayOf(day), baseSeed, specOf(day)))
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
  await t.db.update(riders).set({ userId: u!.id }).where(eq(riders.id, OWN_RIDER))
  await t.db.insert(raceWatch).values({ userId: u!.id, worldId, raceKey: RACE_KEY, knownThrough: 2, how: 'WW' })

  const world: SpoilerWorld = {
    t, app, worldId, userId: u!.id, cookie, extraRiders: [],
    async runVeiled(stageSeed) { await t.db.transaction((tx) => runOneStage(tx, worldId, dayOf(VEILED), stageSeed, specOf(VEILED))) },
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
const SKIP: ReadonlyMap<string, string> = new Map([['GET /api/auth/*', 'better-auth: la cuenta, ningún dato de carrera']])

/** Todas las GET del registro, con cada combinación de parámetros. La clave es `${ruta} ${url}`. */
export async function sweep(w: SpoilerWorld, who: 'player' | 'anon'): Promise<Map<string, Swept>> {
  const out = new Map<string, Swept>()
  for (const [route, r] of w.app.spoilerRegistry) {
    if (r.method !== 'GET' || r.origin === 'static' || SKIP.has(route)) continue
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

/** Quita del cuerpo los campos de la lista blanca. Un cuerpo que no es JSON se compara tal cual. */
export function strip(r: Swept, paths: readonly string[]): string {
  if (paths.length === 0) return `${r.status} ${r.body}`
  let v: unknown
  try { v = JSON.parse(r.body) } catch { return `${r.status} ${r.body}` }
  const drop = (x: unknown, p: readonly string[]): void => {
    if (p.length === 0 || x === null || typeof x !== 'object') return
    const [head, ...tail] = p as [string, ...string[]]
    if (head === '[]') { if (Array.isArray(x)) for (const y of x) drop(y, tail); return }
    if (head === '[veiledDay]') {                          // la fila del día de la etapa velada (§11.18), entera
      if (Array.isArray(x)) for (let i = x.length - 1; i >= 0; i--) {
        const row: unknown = x[i]
        if (typeof row === 'object' && row !== null && (row as { gameDay?: unknown }).gameDay === dayOf(VEILED)) x.splice(i, 1)
      }
      return
    }
    if (tail.length === 0) delete (x as Record<string, unknown>)[head]
    else drop((x as Record<string, unknown>)[head], tail)
  }
  for (const p of paths) drop(v, p.split('.'))
  return `${r.status} ${JSON.stringify(v)}`
}

/** Lo que difiere entre dos bases por construcción y no por la etapa: uuid aleatorios, por orden de aparición, y marcas de tiempo. */
export function normalize(s: string): string {
  const seen = new Map<string, string>()
  return s
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g, '<t>')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, (id) => {
      if (id.startsWith(FIXED)) return id                     // los ids fijos son los mismos en las dos bases
      if (!seen.has(id)) seen.set(id, `<id${seen.size}>`)
      return seen.get(id)!
    })
}
```

`runOneStage`, `StageRunSpec` y `timelineTickLog` se exportan desde `packages/db/src/index.ts` para esto (hoy `runOneStage` no se exporta; lo importa `abandon.test.ts` por ruta relativa, l. 17). La etapa 1 de `race-france` es una crono, así que el mundo de B1 cubre también la cabecera y los tramos de una crono en las etapas conocidas.

**B1a, entero.** Los valores canario salen de columnas que solo escribe el desenlace de la etapa: el tiempo del ganador en `stage_results`, los premios del día en `transactions`, los puntos del día en `rider_points` y los ids de las noticias y del palmarés del día, reescritos con un prefijo imposible. No se busca el nombre del ganador en las respuestas JSON, porque sale con razón en la lista de salida y en el reparto; eso es B1c. Sí se busca en el título, las `og:` y el correo, que no llevan ninguna lista (§11.8, §11.9).

```ts
// apps/api/src/spoilerCanary.test.ts (nuevo, paso 7): B1a (§16.3). Suite rápida.
import { anonHorizon, computeHorizon } from '@cyclingstar/db'
import { pageTitle } from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { stageReadyEmail } from './emails.js'
import { preStageInfoFor, shellMetaFor } from './spaShell.js'
import { PENDING_ROUTES, RACE_ID, RACE_KEY, VEILED, type SpoilerWorld, type Swept, dayOf, pendingFor, routeOf, startSpoilerWorld, sweep } from './__fixtures__/spoilerWorld.js'

/** EL CANARIO: valores que solo existen en el desenlace de la etapa velada. Se plantan tras correrla. */
const CANARY = { timeS: 31337, money: 424242, points: 7373, idPrefix: 'c0ffee00-0000-4000-8000-' } as const
const TOKENS: readonly RegExp[] = [/(?<![0-9])31337(?![0-9])/, /(?<![0-9])424242(?![0-9])/, /(?<![0-9])7373(?![0-9])/, /c0ffee00-0000-4000-8000-/]

async function plantCanary(w: SpoilerWorld): Promise<void> {
  const day = dayOf(VEILED)
  await w.t.client`update stage_results set tiempo_s = ${CANARY.timeS} where race_id = ${RACE_KEY} and stage_day = ${VEILED} and puesto = 1`
  await w.t.client`update transactions set amount = ${CANARY.money} where game_day = ${day} and kind = 'premio'`
  await w.t.client`update rider_points set points = ${CANARY.points} where game_day = ${day}`
  for (const table of ['news', 'palmares'] as const)
    await w.t.client`update ${w.t.client(table)} set id = (${CANARY.idPrefix} || lpad(s.n::text, 12, '0'))::uuid
      from (select id as old, row_number() over (order by id) as n from ${w.t.client(table)} where game_day = ${day}) s where id = s.old`
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
    expect(JSON.stringify(stageReadyEmail(info!, true, watch.href))).not.toContain(winnerName)
    for (const page of ['watch', 'report', 'race'] as const) expect(pageTitle(info, page)).not.toContain(winnerName)
  })

  it('no es vacío: con la etapa vista, el canario sale en cinco rutas o más', async () => {
    await w.reveal()                                           // el último: deja la etapa conocida
    expect(new Set(leaking(await sweep(w, 'player')).map(routeOf)).size).toBeGreaterThanOrEqual(5)
  })
})
```

Con la etapa vista, las rutas en las que tiene que salir el canario son, al menos, la ruta de etapa y la del acta (el tiempo), `/api/news` y las noticias de los dos equipos (los ids), y la ficha y los resultados del ganador (su palmarés y su tiempo); el umbral de cinco deja una de margen. Los totales no sirven de canario, porque una suma no conserva el número: una general que deje ver la etapa velada la caza B1c. El barrido es de `GET`: las dos rutas `horizon` que no lo son, `POST /api/riders/me/plan/preview` (`sup. X10`) y `POST /api/riders/me/races/:raceKey/retire` (`sup. X9`), piden cuerpo o escriben, y las prueban `abandon.test.ts` y el resto de la tabla de §11.19.

**B1b.** El barrido del jugador con el mundo en el día de la etapa 3, antes y después de correrla, con `strip` de `B1B_WHITELIST`: ninguna clave puede cambiar fuera de la lista blanca de §11.18, ni aunque el cambio parezca inocente (§11.18 da los casos: el ranking, la salud de un corredor ajeno, el orden de una lista). `B1B_WHITELIST` es la tabla de §11.18 y nada más (esta sección no la copia), y un `it` comprueba que cada ruta suya está en `app.spoilerRegistry` con L y su `why`: la lista no puede crecer con una ruta que §11.18 no justifique. La fila de `/api/riders/me/form` se escribe con `[veiledDay]` porque la fila del día de la etapa no cambia, aparece (`getDailyLog`, `packages/db/src/riders.ts` l. 322-342, devuelve las filas que haya), y quitarle los campos uno a uno dejaría una fila de más. No vacío: tras `reveal()`, diez rutas o más cambian respecto del barrido de antes. Otro `it` es el de §11.19: una segunda cuenta ve la etapa entera y la revela, y el barrido de la primera no cambia un byte, porque lo visto es privado (§11.14). El diferencial caza lo que no es un valor: que exista una fila, que un aviso diga «3 stages hidden» en vez de «2», que una lista cambie de orden.

**B1c, entero.**

```ts
// apps/api/src/spoilerOutcomes.test.ts (nuevo, paso 7): B1c (§16.3). Suite rápida.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { B1C_WHITELIST, PENDING_ROUTES, type SpoilerWorld, normalize, pendingFor, routeOf, startSpoilerWorld, strip, sweep } from './__fixtures__/spoilerWorld.js'

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

La lista blanca de B1c es la de B1b más el tiempo de la cabecera. El motivo es de construcción, no de producto: para que el desenlace cambie hay que cambiar la semilla de la etapa, y esa semilla también decide el tiempo del día (`stageWeather(seed, input.lugar)`, `packages/engine/src/stage/simulate.ts` l. 1483), que en una carrera de verdad se sabe antes de la salida. El parte de la ficha de carrera, en cambio, sale de la semilla del MUNDO (`routes/races.ts` l. 326-339) y es el mismo en las dos bases.

**B1d.** `spoilerRegistry.test.ts` construye la app con base (como `adminPanel.test.ts`) y escribe, literal, la tabla de §11.3: `${método} ${url}` con su `SpoilerPolicy` y su `VeilSpec`. Compara en los dos sentidos (ni sobra ni falta una ruta, ni cambia una política o un mecanismo), comprueba que toda `L` lleva su `why`, y que las 53 rutas `HEAD` heredan el `config` de su `GET` (medido por L6 en Fastify 5.11.2, §14.5). Un segundo `it` registra en una app de prueba una ruta sin `config.spoiler` y espera que `ready()` rechace con el mensaje de `registerSpoilerGuard` (`ruta sin política de destripe`), que es lo que impide arrancar en producción (§14.5). Clasificar una ruta nueva obliga a tocar la tabla del test, y el diff lo enseña en la revisión.

### 16.4 B2 a B22, uno a uno

Cada banco con su enunciado (§G.9), cómo se mide, sobre qué, en qué suite, con qué umbral y en qué paso nace. «Rápida» es `pnpm test:rapido`, en todo PR; «banco» es un tramo de `ci.yml`, solo si el PR toca `packages/engine/`, y el nocturno; «a mano» es un script que se corre en el paso que se dice y cuya cifra va en la descripción del PR.

- **B2 · el estado contra los sucesos.** Para cada `front_group`, `time_gap`, `breakaway_formed`, `breakaway_caught`, `peloton_split` y `peloton_selection`, lo que dice el suceso contra `instantAt(revealS)`: los protagonistas de `front_group` y `breakaway_formed` son el grupo 1 (o están en él); en `breakaway_caught`, los cazados van en el grupo del cazador; el `gapS` de `time_gap` casa con `mainGap.gapS` si la pareja es la misma; tras un `peloton_split` o un `peloton_selection` hay más grupos de más de tres que antes. Umbrales (sin evidencia de los jueces): 0 contradicciones en pertenencia; en huecos, |diferencia| ≤ 15 s en el 95 % (el suceso lee el reloj de su bloque y el instante el del último km de foto, §4.5). Banco: `packages/engine/src/sim/timeline.test.ts` en las 24 × 2; rápida: `apps/api/src/broadcastFixtures.test.ts`. Nace en el 6a, que lo mide, y si una familia no llega, se escribe la cifra medida con su causa en lugar del umbral, nunca en silencio (I-02 criticaba justo eso: «sella lo medido» sin listón).
- **B3 · el rótulo.** Cada 30 s de carrera, en cada grupo del instante, `namedRidersOf` (§7.7) nombra o cuenta a TODOS sus miembros (`named.length + others = size`) y cada miembro tiene su `RiderCard` en la cabecera. Umbral: 100 %, que la política da por construcción (§7.7); el banco vigila que siga siendo así. Rápida, en `apps/api/src/broadcastFixtures.test.ts` sobre las seis etapas congeladas, con la cabecera que arma la ruta (§14.2); nace en el 6b.
- **B4 · el re-render.** La noticia, la línea de la voz y la del acta se redactan igual desde `seed + data`: los trece goldens de `packages/shared/src/news.test.ts`; en `packages/db/src/news.test.ts`, que lo leído es lo escrito, fila a fila (§12.8); y en la web, que cada `ChronicleEntry` de las actas congeladas (`<etapa>.acta.json.gz`) da la misma frase dos veces y en dos procesos (`apps/web/src/domain/stageJournal.corpus.test.ts`). Umbral: igualdad exacta. Rápida; nace en el 1a (noticias) y en el 6b (voz y acta).
- **B5 · la estabilidad.** El `sha256` de todas las líneas de voz y de acta de las seis etapas congeladas y de los trece goldens de noticias, en `stageJournal.corpus.test.ts`: solo cambia con un re-sellado deliberado, y añadir una redacción con `since` nuevo no lo mueve (§12.7). Rápida; se sella UNA vez en el paso 12, tras la semilla neutra.
- **B6 · el tamaño.** Lo guardado contra `TIMELINE.maxStoredBytes`, `maxJsonBytes`, `medianJsonBytes` y `ttMaxStoredBytes` (§15.2, D-11): el JSON de `encodeTimeline`, en el banco sobre las 24 × 2 (`timeline.test.ts`); el `bytea` con gzip 9, en la rápida sobre los seis `<etapa>.timeline.gz` (`broadcastFixtures.test.ts`) y a mano sobre las 24 × 2 en el paso 5 con `scripts/broadcast-fixtures.mjs --sizes`, porque el motor no puede comprimir ni en sus tests (decisión 16-n). Lo servido, con gzip 6 como `@fastify/compress` (§14.8), contra los topes de red que se proponen aquí con los valores de §14.8 (sin evidencia de los jueces): `BROADCAST.maxHeadGzipBytes` (16.384), `maxChunkGzipBytes` (12.288), `maxFinishGzipBytes` (40.960) y `maxVeiledStageGzipBytes` (4.096), con `app.inject` en la rápida: la cabecera y los tramos sobre las seis, cargadas en PGlite por `broadcastFixtures.test.ts`; el paquete de meta y la ruta de etapa velada, sobre la etapa corrida de `routes/broadcast.test.ts` (§14.7), que tiene resultado, general y noticias. L7 midió la cabecera en 7,1-9,2 KB y el tramo mayor en 4,83 KB con gzip (§18.7): caben con holgura. Nace en el 0 como línea base de la ruta de hoy (medida, 22,2-50,0 KB con gzip, mapa 02 §7) y en el 5 y el 6 con sus topes. Los topes de D-11 NO pasan con lo que midió L3: la línea guardada ocupa de 20,9 a 70,0 KB (mediana 38,8, p90 53,3) contra 48 KB, el JSON de 123 a 464 KB (mediana 222) contra 128 KB y 64 KB de mediana, y las cronos de 176 corredores de 18,8 a 24,2 KB contra 16 KB: 10 de 46 corridas en línea pasan de 48 KB y 45 de 46 de 128 KB de JSON (§5.7). Los topes son umbrales de banco, no de escritura (15-g), así que nada se pierde en producción; pero con esos valores B6 nace en rojo, y va a las dudas.
- **B7 · la cobertura.** `apps/web/src/domain/templateCoverage.test.ts` recorre con el AST de TypeScript (la dependencia `typescript` de la raíz) las llamadas a `log.emit` de `simulate.ts` y `timetrial.ts` y la inserción de `events.ts`, recoge la plantilla solo en posiciones de valor (literal y ramas de un ternario; si encuentra una calculada, falla), y exige que el conjunto sea el escrito en el test (54, medido en `l8/plantillas.mjs`: 44 de carretera, `rider_defies_team` y 13 de la crono, cuatro compartidas) más `crash`; que cada una tenga fila en `CUE_OF_TEMPLATE` y la regla de revelado que el test tiene escrita (la de `REVEAL_RULES` o `TT_REVEAL_RULES`, o la de por defecto, apuntada a propósito), y que `chronicleLine` dé una frase no vacía para un suceso sintético de cada una, con sus datos mínimos. Una plantilla nueva del motor pone este test en rojo hasta que tiene frase, rótulo y regla. Rápida, porque vive en la web aunque lea el motor; nace en el 6b.
- **B8 · el cliente.** `apps/web/src/domain/broadcast/clientCost.test.ts`: `JSON.parse` y `safeParse` del tramo mayor y de la cabecera de las seis etapas, y `instantAt` en 600 fotogramas seguidos, en Node. Umbrales (decisión 16-m): mediana ≤ 2 ms el tramo mayor y ≤ 3 ms la cabecera; p95 de `instantAt` ≤ 0,25 ms. Son de cuatro a cinco veces lo que midió L7 (`l7/red.mjs` y `l7/instante.mjs`, §18.1: 0,54 ms el tramo mayor, 0,71 ms la cabecera y un p99 de 0,036 a 0,056 ms por fotograma), para que el banco cace una regresión de cinco veces y no solo una de un orden de magnitud; `datos` midió el parse y el Zod del corte ENTERO en 0,8-6,0 ms (`datos.md` §10.5). El fotograma de L7 es una aproximación del corte de §4.5: el PR 6a mide el `instantAt` de verdad y, si su p95 pasa de 0,05 ms, el umbral pasa a cinco veces lo medido, con la cifra en el PR. El móvil se mira a mano en el paso 10 (§18.5). Rápida; nace en el 6a.
- **B9 · el corte causal** (I-10). Código abajo (`apps/api/src/broadcastCut.test.ts`). Umbral: igualdad exacta en las tres cláusulas. Rápida, en las seis etapas congeladas. Nace en el 3a, cuando los tramos salen del adaptador de la radio (§3.8): entonces `loadTimeline` construye la línea del adaptador con la radio y los sucesos del fixture; desde el 6a lee la grabada. La tercera cláusula de §G.9, que el ritmo no dependa de los sucesos, es de `player.test.ts` (§8.12, paso 3b): la misma línea con sus sucesos y sin ellos da la misma hora fotograma a fotograma.
- **B10 · la foto por km y el aprendizaje** (I-12, X-10). Código abajo (`packages/db/src/timelineCollector.test.ts`). Umbral: igualdad byte a byte con la envoltura de hoy, y la ingenua tiene que romper en alguna de las tres. Rápida con tres etapas y una semilla; las 22 en línea por dos semillas, en el nocturno. L3 midió 18 de 18 corridas iguales con el colector aparte y 6 de 18 rotas, hasta en 20 corredores, con la envoltura ingenua (§5.3). Nace en el 4b.
- **B11 · observar no toca la carrera** (I-12, X-09). Código abajo (`packages/engine/src/sim/timeline.test.ts`). Umbral: la huella entera igual, con cada gancho llamado las veces que le tocan. Banco, tramo «mundo y radio» (15-d), doce etapas por dos semillas con seis cronos; más una prueba de humo en la rápida (`packages/engine/src/stage/probeHooks.test.ts`: una en línea y una crono), porque el grabador usa `packages/shared` y un cambio allí no dispara los bancos. Medido: 20 de 20 por el juez sin los ganchos (C5) y 24 de 24 por L3 con ellos (§5.1). Nace en el 4a como prueba de humo con ganchos que solo cuentan, porque el grabador aún no existe, y en el 4b pasa a la versión de abajo, con el grabador, en `timeline.test.ts` y en el tramo (15-d).
- **B12 · la aritmética del horizonte.** Los dieciocho casos de §10.14, uno por `it`, sobre PGlite con el mundo mínimo de allí (una vuelta de siete etapas en guardia por `own_rider`, una de cabecera y una ajena). Los que solo tocan `packages/db` (el prefijo, el arrastre, la etapa a medias, la meta por modo, la caducidad, el acuse, las fuentes y los alcances, la temporada anterior, la vuelta de prueba, el memo, los dos dispositivos, la retirada y el predicado), en `packages/db/src/horizon.test.ts`; los que pasan por la petición (la puerta con su 403, lo servido que no es visto, la cookie que solo restringe, las cookies malas y `SPOILER_MODE`, que vive en `request.horizon()`, §14.5), en los tests de rutas de §14.7 (`apps/api/src/routes/me.test.ts` y `broadcast.test.ts`). Umbral: todos. Rápida; nace en el 7a y gana el caso del predicado con `veilSql` en el 8a y el de la retirada con `VeilDelta` en el 8b.
- **B13 · la procedencia.** Con las seis cabeceras congeladas y 500 velos al azar (semilla fija), ningún campo de `veilCast(cast, h)` cuyo `from` esté en el velo viaja: se serializa y se busca (§10.10, §7.8). Rápida, `packages/shared/src/broadcast/veilCast.test.ts`; nace en el 7b.
- **B14 · la latencia del horizonte** (D-33, O-17, H-10, X-11). `packages/db/src/horizonLatency.test.ts` llena `race_rosters` con 250.000 filas por `generate_series` (3.900 corredores, como L3) y mide por separado, 200 veces cada una: `computeHorizon` sin memo (cada llamada con otro `horizon_rev`), en la forma D de §18.2 (decisión 18-a) y para dos espectadores, el jugador de un corredor y el mánager que además posee un equipo de 30; y `recordProgress` (D-55). Umbral (decisión 16-k): p95 ≤ `SPOILER.horizonBudgetMs` (5 ms) en `computeHorizon` del jugador y, aparte, en `recordProgress`; el mánager se imprime con su p95 y es puerta en la medida contra Postgres del paso 7 (§18.9). Medido por L7 en PGlite (`l7/horizonte.mjs` y `l7/horizonte2.mjs`, §18.2 y §18.4): `computeHorizon` en la forma D, p95 de 3,1 a 3,7 ms el jugador y de 8,6 a 9,3 ms el mánager, que tiene seis veces más carreras en guardia; `recordProgress`, p95 de 3,05 ms. La consulta por corredor sola: 19,6 ms sin índice y 0,11 ms con él (juez, C12), y 20,75 ms frente a 0,46 ms (L3, `l3/aplicar2.mjs`). Rápida; nace en el 7a. Si el jugador no pasa, `SPOILER_MODE=off` lo apaga sin desplegar (§10.13); si el mánager no pasa contra Postgres, decide el dueño (16-k).
- **B15 · el coste del tick** (O-23, H-14, X-24). `scripts/bench-tick.mjs`, a mano en los pasos 5 y 10: corre en una base de prueba los días 176 (187 cronos nacionales) y 179 (153 nacionales en línea) con `TIMELINE_RECORD=off` y `on`, y compara el tiempo del día. Umbral (decisión 16-l): falla si la grabación suma en un mismo día, a la vez, más de un 25 % y más de 15 s, o si deja alguna lápida (§5.5). Medido por L7 con el prototipo de L3 (`l7/tick.mjs`, dos corridas, §18.3): el 179 pasa de 103,8-109,0 s a 119,3-127,9 s (de +15,5 a +18,9 s, de +15 a +17 %) y el 176, de 2,2-2,4 s a 3,1 s (de +0,7 a +0,8 s), así que pasan los dos. Es casi el doble de lo que estimaba §5.8 para el 179 (de 6 a 10 s, con las cifras de L3 por etapa grande: de 30 a 73 ms de grabador, de 17 a 57 de cierre, de 2,8 a 27,8 de gzip y de 6 a 25 de `selfCheckI1`), porque en un nacional de 40 corredores el grabador pesa más en proporción; el juez medía de 11 a 30 ms por crono nacional y de 0,3 a 0,8 s por nacional en línea (C15). Falta la escritura de las 153 filas de `stage_timelines` en la transacción del día (estimada de 0,2 a 0,5 s en Postgres, §18.3): por eso se repite en el paso 5 con el grabador y la escritura de verdad. No va en el CI: es un día de juego entero en la base. Si falla, `TIMELINE_RECORD=off` apaga la grabación sin desplegar (D-12).
- **B16 · la radio desde la línea** (O-16). `radioFromTimeline` contra `buildRaceRadio(radioForStorage(radio, ∅, []))`, km a km: grupos, tamaños, huecos, velocidades, percances, relevistas y motivos (§12.10). Banco en las 24 × 2 (`timeline.test.ts`) y rápida en las seis (`broadcastFixtures.test.ts`, contra `<etapa>.radio.json.gz`). Umbral: igualdad. Nace en el 11 y condiciona DD-11.
- **B17 · el ritmo medido.** `scripts/bench-pace.mjs` corre la curva en las 24 etapas en los pasos 0 (con el adaptador) y 10 (con la línea) y la rápida en las seis congeladas (`apps/api/src/broadcastPace.test.ts`), con las bandas de 8-k: `Watch` de 6:00 a 22:00 en línea; `Highlights` de 1:45 a 7:30; los últimos 5 km, el 15 % o más (35 % en los finales en alto); la crono, de 5:30 a 13:00; el digest, a menos del 40 % de su presupuesto; el error de `estimateS`, p90 < 60 s fuera de los finales en alto. Medido por L4 (§8.3): 7:39-19:59, 2:12-6:37, 18-24 % y 45-47 %, 6:24-11:23, de −9 a +34 % y 55 s.
- **B18 · el servidor no adelanta.** `apps/api/src/routes/broadcast.test.ts` (§14.7, sobre PGlite con una etapa corrida con grabador): un tramo más allá de lo alcanzado más `prefetchRaceS` da 409 `beyond_reached`; el que llega al borde lleva `atFinish` y ningún dato de meta; la meta solo sale por `POST …/finish`. Rápida; nace en el 7a.
- **B19 · la voz es prefijo.** `apps/api/src/voicePrefix.test.ts`: en las cinco etapas en línea congeladas, la voz construida como la ruta del tramo (§14.3) cada 30 s de carrera hasta el borde de la meta; la de `t` es prefijo exacto de la de `t + 30 s`. Umbral: 0. Medido: 0 en 15 corridas por `ingeniero` revelando en `tS`, y 0 en 18 corridas y 12.083 pasos con el `revealS` real (`l8/voz.mjs`, §12.2), frente a 44 ordenando por `tS` y 574 con el acta truncada. Un segundo `it` corre lo mismo con `liveClusters` y la política de nombres real (§7.7) sobre el reparto del fixture: tiene que dar 0 antes de encender la constante (DD-18); sin nombres, `l8/voz2.mjs` dio 0 (§12.3). Rápida; nace en el 2.
- **B20 · revelar sin castigo** (I-35). `packages/db/src/revealFree.test.ts` lee con el AST los ficheros de `packages/db/src` y `packages/engine/src` y falla si alguno fuera de la lista escrita (`schema.ts`, `horizon.ts`, `watch.ts`, el reinicio que la borra y los tests) nombra `raceWatch` o `race_watch`: ningún premio, logro, moral ni dinero lee lo visto (D-38). Rápida; nace en el 7a.
- **B21 · la posición del instante.** Informativo (D-04): el error de la posición extrapolada de cada grupo contra la línea entera, p50 y p99 impresos en el banco; solo falla si llega a 1 km, que la construcción impide (§4.5). L1 midió un p99 de 52 a 508 m en 15 corridas (`l1/corte.mjs`). Banco, en `timeline.test.ts`; nace en el 6a.
- **B22 · el reloj estimado.** `apps/api/src/radioAdapter.test.ts`: la línea del adaptador de la radio (§3.8), construida desde `<etapa>.radio.json.gz`, contra la grabada de la misma etapa: posición de la cabeza, p99 ≤ 1 km. L1 midió un máximo de 0,69 km. Rápida; nace en el 6a y decide si las etapas del adaptador abren en `Watch` o en `Report` (D-61).

**B9, entero.**

```ts
// apps/api/src/broadcastCut.test.ts (nuevo, paso 3a): B9 (§16.4). Suite rápida, sobre las seis etapas congeladas.
import { type InstantContext, type StageTimeline, chunkOf, cutTimeline, instantAt, photoBlocksOf, seededRng, timeTrialInstantAt, visibilityOf } from '@cyclingstar/shared'
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

describe.each(FIXTURES)('B9 · el corte causal · %s', (name) => {
  const tl = loadTimeline(name)
  const ctx = ctxOf(tl)
  const { finishDs } = visibilityOf(tl)
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
      for (let i = 0; i < c.clocks.length; i += 3) expect(c.clocks[i + 2]! > from && c.clocks[i + 2]! <= to).toBe(true)
      for (let i = 0; i < c.banners.length; i += 4 + 2 * c.banners[i + 3]!) expect(c.banners[i + 2]! > from && c.banners[i + 2]! <= to).toBe(true)
      expect(c.atFinish).toBe(to === finishDs)
    }
  })

  it('los tramos, uno tras otro, son la línea entera hasta la meta: nada se pierde ni se repite', () => {
    const whole = chunkOf(tl, 0, finishDs)
    const joined = new Map<string, unknown[]>()
    for (let from = 0; from < finishDs; from += CHUNK_DS)
      for (const [k, v] of Object.entries(chunkOf(tl, from, Math.min(from + CHUNK_DS, finishDs))))
        if (Array.isArray(v)) joined.set(k, [...(joined.get(k) ?? []), ...v])
    for (const [k, v] of Object.entries(whole)) if (Array.isArray(v)) expect(joined.get(k) ?? []).toEqual(v)
  })
})
```

`load.ts` es un ayudante de cinco líneas en la misma carpeta: `FIXTURES` con los seis nombres y `loadTimeline(name)`, que lee `<etapa>.timeline.gz` con `readFileSync(new URL(…, import.meta.url))`, lo descomprime con `gunzipSync` y lo pasa por `decodeTimeline` (§4.3), igual que `readStageTimeline` (§5.6).

**B10, entero.**

```ts
// packages/db/src/timelineCollector.test.ts (nuevo, paso 4b): B10 (§16.4). Rápida con tres etapas; las 22 en línea por dos semillas con CS_BANCOS=1.
import { ENGINE_VERSION, SEASON_CALENDAR, STAGE, type StageProbe, raceRadioCollector, radioForStorage, radioKmPoints, realRaceScenario, simulateStage, stageLengthKm, stageSeed } from '@cyclingstar/engine'
import { describe, expect, it } from 'vitest'
import { startStageTimeline } from './timelines.js'

type Input = ReturnType<typeof realRaceScenario>['input']
type Wrap = 'today' | 'e2' | 'naive'
/** Lo que una envoltura deja ver al aprendizaje (trabajaronParaOtro) y a la radio guardada, como stageRun.ts l. 515-586. */
interface Seen { readonly learners: readonly string[]; readonly stored: string }

function watch(input: Input, seed: string, wrap: Wrap): Seen {
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
const seedOf = (raceId: string, day: number, s: number): string => stageSeed({ worldSeed: `b10-${s}`, raceId, stageDay: day, engineVersion: ENGINE_VERSION })

/** Tres de las que rompen con la envoltura ingenua (L3: la e20 con la semilla 0, hasta 20 corredores); las elige el PR 4b. */
const QUICK = [['race-france', 20, 0], ['race-france', 18, 0], ['race-flanders', 1, 1]] as const
const LONG = [...Array.from({ length: 21 }, (_, i) => ['race-france', i + 1] as const), ['race-flanders', 1] as const, ['race-tramuntana', 1] as const, ['race-colombia', 5] as const]
  .filter(([id, day]) => SEASON_CALENDAR.find((r) => r.id === id)!.stages[day - 1]!.timeTrial !== true)
  .flatMap(([id, day]) => [0, 1].map((s) => [id, day, s] as const))

const same = (cases: readonly (readonly [string, number, number])[]): void =>
  it.each(cases)('%s e%i semilla %i: el colector aparte ve lo mismo que la envoltura de hoy', (raceId, day, s) => {
    const { input } = realRaceScenario(raceId, day)
    const today = watch(input, seedOf(raceId, day, s), 'today')
    const e2 = watch(input, seedOf(raceId, day, s), 'e2')
    expect(e2.learners).toEqual(today.learners)
    expect(e2.stored).toBe(today.stored)
  }, 120_000)

describe('B10 · la foto por km y el aprendizaje', () => {
  same(QUICK)
  it('no es vacío: la envoltura ingenua cambia el aprendizaje o la radio en alguna de las tres', () => {
    const broken = QUICK.some(([raceId, day, s]) => {
      const { input } = realRaceScenario(raceId, day)
      const today = watch(input, seedOf(raceId, day, s), 'today')
      const naive = watch(input, seedOf(raceId, day, s), 'naive')
      return naive.stored !== today.stored || naive.learners.join() !== today.learners.join()
    })
    expect(broken).toBe(true)
  }, 360_000)
})
describe.runIf(process.env.CS_BANCOS === '1')('B10 · las 22 etapas en línea por dos semillas (nocturno)', () => same(LONG))
```

`CS_BANCOS=1` lo pone `cobertura.yml` en su paso `pnpm test:coverage` (l. 63-64), que es el nocturno; el PR 4b lo añade. La rápida paga tres etapas por tres envolturas, del orden de medio minuto (estimado: de 0,5 a 3 s por etapa simulada con el campo del escenario). `realRaceScenario` (`packages/engine/src/sim/scenarios.ts` l. 518) no se exporta hoy de `@cyclingstar/engine`, que solo publica `.` (`packages/engine/package.json` l. 8-13): el PR 4b lo añade a `packages/engine/src/index.ts` con las exportaciones de §5.10, porque B10 vive en `packages/db`.

**B11, entero.**

```ts
// packages/engine/src/sim/timeline.test.ts (nuevo, paso 4b; tramo «mundo y radio», 15-d): B11 (§16.4). I1, I2, I3, I5, B2, B16 y B21, en el mismo fichero.
import { photoBlocksOf } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { ENGINE_VERSION, STAGE } from '../constants.js'
import { stageSeed } from '../stage/rng.js'
import { stageLengthKm } from '../stage/sample.js'
import { simulateStage } from '../stage/simulate.js'
import type { StageProbe } from '../stage/types.js'
import { realRaceScenario } from './scenarios.js'
import { timelineRecorder } from './timeline.js'

/** Seis en línea (llana, media, dos reinas, clásica y nacional) y seis cronos: la que abre la grande (e1, 20 km), la de la tercera semana
 *  (e16, 26 km), la de una vuelta de montaña (race-colombia e3, 33 km), la que abre una vuelta de seis etapas (race-basque-country e1,
 *  14 km) y dos nacionales (40 y 31,2 km). */
const STAGES = [
  ['race-france', 7], ['race-france', 13], ['race-france', 18], ['race-france', 20], ['race-flanders', 1], ['nc-es-road', 1],
  ['race-france', 1], ['race-france', 16], ['race-colombia', 3], ['race-basque-country', 1], ['nc-es-itt', 1], ['nc-es-u23-itt', 1],
] as const
/** La huella entera de una etapa: los cuatro campos de StageOutput que el mundo guarda, no solo `puesto:id:tiempo` (raceRadio.test.ts l. 756-757). */
const huella = (o: ReturnType<typeof simulateStage>): string => JSON.stringify([o.results, o.events, o.efforts, o.incidents])

describe('B11 · observar no toca la carrera', () => {
  it.each(STAGES.flatMap(([id, day]) => [0, 1].map((s) => [id, day, s] as const)))('%s e%i semilla %i', (raceId, day, s) => {
    const { input } = realRaceScenario(raceId, day)
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
    if (input.timeTrial === true) expect([calls.ride, calls.snapshot, calls.event]).toEqual([input.riders.length, 0, 0])
    else { expect(calls.event).toBeGreaterThan(0); expect(calls.snapshot).toBe(blocks) }
  }, 120_000)
})
```

El grabador recibe lo que el motor le da por referencia y no lo copia (§5.4): si un día muta una foto o un suceso, este test lo caza en la huella, porque la carrera sigue con los objetos tocados. Por eso se prueba con `timelineRecorder` de verdad y no con ganchos vacíos, y con los cuatro campos y no con la huella de puestos y tiempos, que es lo único que compara hoy «la radio no toca la carrera» (`raceRadio.test.ts` l. 756-764).

### 16.5 La prueba de lectura

D-60, escrito como hecho (H-04; [DOC 7]; [DUEÑO 4]). Ningún banco dice si la pantalla se entiende: lo dice alguien que la mira. Es el criterio del MVP, paso 31: «un tercero entiende qué pasó en la etapa sin que nadie se lo explique» (`docs/MVP.md` l. 140), y el del dueño en la v27: «La prueba de esta tanda es leer el diario… El criterio no es un porcentaje» (`docs/balance.md` l. 6236-6237). Las cuatro preguntas son las de la regla del diario: «quién va delante, con cuánta ventaja, sobre quién y cuánto queda» (SPEC §6.15, l. 596-599). El umbral, nueve de nueve, no tiene evidencia de los jueces.

1. **Quién.** El dueño y una persona que no conozca el diseño: no ha leído `docs/retransmision.md` ni ha trabajado en E2. Contestan por separado, sin verse. Un organizador, el que lleva el paso 10, prepara, pausa y comprueba; no ayuda ni explica.
2. **Cuándo.** En el paso 10, con 10a y 10b desplegados y antes de `BROADCAST_WATCH=on`, en el mundo de pruebas con `BROADCAST_WATCH=admins`; la persona usa una cuenta de administrador creada para la prueba.
3. **Qué etapas.** Tres corridas con la grabación encendida que ninguno de los dos ha visto: una llana, una reina y una clásica (por `StageKind`: `llana`, `reina`, `clasica`), las más recientes de cada tipo. Si no hay una clásica con línea, la carrera de un día más larga que la tenga.
4. **Qué puntos.** Tres por etapa, sorteados ANTES de verla con una semilla que se apunta: km a meta al azar entre 5 y `lengthKm − 5`, separados al menos 20 km y uno de ellos en los últimos 30 km. Los dos no los conocen.
5. **Cómo se ve.** `Watch` (pantalla) desde la salida, a la velocidad de siempre (§8.2), con los mandos normales: se puede pausar y abrir `Commentary` o tocar una fila de la barra, que es parte de la pantalla; no se puede saltar. Cuando la capa fija llega al km a meta del punto, el organizador pausa.
6. **Las preguntas.** Quién va delante (los nombres si son tres o menos; si no, qué grupo y cuántos), con cuánta ventaja, sobre quién y cuánto queda. Se contestan en voz alta, sin volver atrás.
7. **La verdad.** El organizador la saca de la línea con `scripts/pl-truth.mjs <raceKey> <día> <kmAMeta>`: el grupo 1 del instante con sus miembros, `mainGap` con su referencia (§4.5, D-17) y los km a meta de la cabeza.
8. **Qué es una respuesta bien.** Los nombres exactos si el grupo 1 es de tres o menos, o su palabra y su tamaño con un corredor de margen; la ventaja a 10 s o la cifra de la capa fija; «sobre quién», el grupo de referencia de la diferencia principal; lo que queda, a 1 km.
9. **La aceptación.** Un punto cuenta si LAS DOS personas contestan bien las cuatro preguntas. Nueve de nueve.
10. **Si falla.** Se apunta qué pregunta falló y dónde, y se ajusta solo lo que vive en `packages/shared`: las constantes de ritmo y de la cola (`pace`, `cueHoldS`, `crashNamesDelayS`, `breakRoundEveryS`, `gapsTableEveryRealS`; §15.6), las palabras (§6.3) o los rótulos (§6.5). Se remide B17 y se repite con tres etapas y nueve puntos NUEVOS. Nunca se toca el motor (§8.9). Si la misma pregunta falla dos veces seguidas, no es una constante: va al dueño como decisión.
11. **El registro.** Etapas, semilla del sorteo, respuestas, verdad y veredicto, en la descripción del PR 10b. Con nueve de nueve se enciende `BROADCAST_WATCH=on` (D-53).

### 16.6 Los tests de pantalla y de producto

Lo que se ve se prueba sin navegador: el render es estático con `renderToStaticMarkup`, como `apps/web/src/components/leaderJerseys.test.tsx` (l. 2), y el reproductor es un reductor puro (§8.12). Cada test está en la sección de su pieza; aquí, el índice.

| Qué | Fichero | Sección | Paso |
| --- | --- | --- | --- |
| la capa fija, la barra y sus palabras, el tránsito y `Your rider` | `apps/web/src/components/broadcast/*.test.tsx` | §6.2, §6.3 | 6b |
| el rótulo de corredor y `breakHeadline` | `packages/shared/src/broadcast/names.test.ts` y los de `apps/web/src/components/broadcast/` | §7.1, §7.6 | 6b |
| la cola de rótulos y `CUE_OF_TEMPLATE` | `packages/shared/src/broadcast/cues.test.ts` | §6.5, §6.6 | 6a |
| el reproductor, los saltos, los modos y `Next action` | `apps/web/src/domain/broadcast/player.test.ts` | §8.11, §8.12 | 3b y 10 |
| `usePageTitle`, único escritor de `document.title`, sin el ganador | `apps/web/src/domain/pageTitle.test.ts` | §11.8, §11.19 | 9a |
| `stageReadyEmail` y `stageReadyNotice`, sin el nombre del canario | `apps/api/src/emails.test.ts`, `packages/shared/src/broadcast/pageTitle.test.ts` | §11.9 | 9a |
| revelar sin castigo: `Don't ask again` y `Watch anyway`, y que ningún premio lea lo visto | los de §11.11; B20 | §11.11 | 7a y 9a |
| la voz: `inVoice`, `linesOf`, las frases de §12.5 y `mainNoun` | `apps/web/src/domain/voice.test.ts`, `stageJournal.test.ts` | §12.2, §12.5, §12.6 | 2 y 6b |

### 16.7 El CI

**La trampa, escrita.** `test:rapido` excluye `packages/engine/src/sim/**` (`package.json` l. 21), y los tramos de bancos son listas de ficheros escritas a mano en la matriz (`ci.yml` l. 150-175) que solo corren si el diff toca `^packages/engine/` (l. 189). Un test nuevo en `packages/engine/src/sim/` que no esté en ningún tramo no corre en ningún PR, solo en el nocturno (`cobertura.yml`, `15 4 * * *`, l. 26, con `pnpm test:coverage`, l. 63-64). Por eso 15-d mete `timeline.test.ts` en el tramo «mundo y radio» (l. 166-175) en el PR 4b, el del grabador, y por eso todo lo que depende de `packages/shared` tiene su versión rápida (D-52). Los tests de `packages/engine/src/stage/` sí corren en la rápida: ahí va la prueba de humo de B11.

| Suite | Cuándo corre | Coste medido | Bancos de E2 |
| --- | --- | --- | --- |
| `typecheck` | todo PR | 37,4 s (mapa 07 §4) | los tipos de §4 y las uniones cerradas (`satisfies`) |
| `test:rapido` | todo PR, con Postgres de servicio y PGlite | 562 s y 529 s en dos corridas (mapa 07 §4) | I1, I2, I3, I5 y B16 sobre las seis congeladas; B1a a B1d; B2 a B10; B12 a B14; B17 sobre las seis; B18 a B20; B22; la prueba de humo de B11 |
| bancos, ocho tramos | solo si el PR toca `packages/engine/` | 4.365 s sumados (`ci.yml` l. 103), en paralelo | «mundo y radio»: I1, I2, I3, I5, B2, B6 (el JSON), B11, B16 y B21 en `timeline.test.ts` |
| nocturno | cada día a las 04:15 UTC | toda la suite con cobertura | todo lo anterior, más B10 largo (`CS_BANCOS=1`) |
| a mano | en su paso | un día de juego (B15); las 24 etapas (B6 y B17) | B6 del `bytea` sobre las 24 × 2 (paso 5), B15 (pasos 5 y 10), B17 largo (pasos 0 y 10), PL (paso 10) |

**Quién paga los bancos.** Solo el paso 4 toca `packages/engine` (4a, los ganchos, `GROUP_NOUNS` y la retirada de `renderNews`; 4b, el grabador), así que solo sus dos PR pagan los ocho tramos (D-54): unos 73 min de runner en paralelo sobre los 9 min de la rápida. El resto de E2 son PR de `typecheck` y rápida. La rápida crece con E2: las seis etapas congeladas y los mundos de PGlite de B1 y B12 añaden del orden de dos a cuatro minutos (estimado: dos mundos de B1c, uno de B1a y uno de B1b con tres etapas de doce corredores cada uno, más B10 con tres etapas por tres envolturas).

### 16.8 Las cegueras

Las ocho del mapa 07 §5.2, y lo que E2 hace con cada una:

| # | Ceguera | Qué la tapa |
| --- | --- | --- |
| 1 | la radio guardada nombra desde el km 0 a los diez primeros de la etapa (`stageRun.ts` l. 558-568) | se corta al leer con la política de §7.7 (D-16, §11.16); B1a y B1c la barren; desde el paso 11 la radio sale de la línea sin lista (B16) |
| 2 | las pasadas de la crónica miran el futuro | la voz causal de §12.2; B19 |
| 3 | una respuesta lo lleva todo, altimetría con marcas incluida | cabecera, tramos y meta por separado (§14.2, §14.3); B1a, B18 |
| 4 | `chronicle.test.ts` l. 967-1013 prueba una copia de «leer o re-simular», no la de `routes/races.ts` | en parte: los mundos de B1 inyectan la ruta de etapa de verdad sobre etapas corridas en PGlite, con sus sucesos guardados, así que la rama «se lee» se ejerce; la copia de `chronicle.test.ts` se queda |
| 5 | ni `stageReplaySchema` ni `newsResponseSchema` en `contracts.test.ts`; ninguna ruta de etapa o de feed con test; los sucesos guardados no se validan al leer | los contratos, en el paso 0 (§17.3); `broadcast.test.ts`, `yesterday.test.ts` y el test de `/api/news` (§14); la línea se valida al decodificar (§4.3). Los sucesos de `stage_snapshots.events` siguen leyéndose con un `as` (`routes/races.ts` l. 477): no la tapa E2 |
| 6 | `schema.ts` l. 754 promete unos 22 KB de radio; son 102-514 KB | B6 sella la línea y lo servido; la radio deja de escribirse en el paso 11 |
| 7 | `raceOfHeadline` y el país de los campeonatos leen texto inglés; el buscador por ganador sella un destripe | `raceId` en la noticia (§12.8); el buscador busca sobre lo ya cortado (§11, `sup. I3`); el país de los campeonatos queda para E10 |
| 8 | un suceso sin plantilla se pinta crudo | el `default` vacío y B7 (§12.5) |

### 16.9 La tabla final

| Banco | Qué | Nace | Suite | Umbral | Medido | Lo usa |
| --- | --- | --- | --- | --- | --- | --- |
| I1 | la foto reducida es la del motor | 4b | banco y rápida | 0 | sí: 0 en 3.246 y en 8.656 | §4.4, §5.5 |
| I2 | el instante casa con la foto; el tránsito | 6a | banco y rápida | exacta; p90 ≤ 15 por etapa y ≤ 4 en total | sí: `l8/transito.mjs` | §4.4, §4.5 |
| I3 | claves y empaquetado | 4b | banco y rápida | 0 | sí: 0 en 46 | §4.3 |
| I5 | la traza de la crono cuadra con el resultado | 4b | banco y rápida | igualdad | sí: 1.176 de 1.176 | §9 |
| B1a | el canario | 7a | rápida | 0 fugas; 5 rutas o más con la etapa vista | no | §10, §11 |
| B1b | el diferencial | 7a | rápida | 0 fuera de §11.18; 10 rutas o más al verla | no | §11.18 |
| B1c | dos desenlaces | 7a | rápida | 0 fuera de la lista blanca | no | §10, §11 |
| B1d | la política completa | 7a | rápida | igual a §11.3 | sí: 140 registros (L6) | §14.5 |
| B2 | el estado contra los sucesos | 6a | banco y rápida | 0 en pertenencia; ±15 s en el 95 % | no, lo mide el 6a | §4.5, §6 |
| B3 | el rótulo | 6b | rápida | 100 % | por construcción | §7.7 |
| B4 | el re-render | 1a y 6b | rápida | igualdad | no | §12.7, §12.8 |
| B5 | la estabilidad | 12 | rápida | hash fijo | no | §12.7 |
| B6 | el tamaño | 0, 5 y 6 | banco (el JSON), rápida y a mano (el `bytea` de las 24 × 2) | `TIMELINE` y los cuatro topes de red | sí: L3, L6 y L7; lo guardado falla con D-11 | §5.7, §14.8, §15, §18.7 |
| B7 | la cobertura | 6b | rápida | las 54 más `crash`, con frase, rótulo y regla | sí: 54 (AST) | §6.6, §12.5 |
| B8 | el cliente | 6a | rápida | mediana ≤ 2 ms el tramo y ≤ 3 ms la cabecera; p95 ≤ 0,25 ms | sí: L7 (0,54 y 0,71 ms; el fotograma, con una aproximación) | §4.11, §8, §18.1 |
| B9 | el corte causal | 3a | rápida | igualdad | no | §4.6, §14.3 |
| B10 | la foto por km y el aprendizaje | 4b | rápida y nocturno | igualdad; la ingenua rompe | sí: 18 de 18 | §5.3 |
| B11 | observar no toca la carrera | 4a y 4b | banco y humo | huella igual | sí: 20 de 20 y 24 de 24 | §5.1 |
| B12 | la aritmética del horizonte | 7a, 8a y 8b | rápida | los 18 casos | no | §10.14 |
| B13 | la procedencia | 7b | rápida | 0 | no | §7.8, §10.10 |
| B14 | la latencia del horizonte | 7a | rápida; contra Postgres en el 7 | p95 ≤ 5 ms el jugador y `recordProgress`; el mánager, contra Postgres | sí: L7 en PGlite, 3,1-3,7 ms el jugador, 8,6-9,3 el mánager y 3,05 `recordProgress` | §10.7, §18.2 |
| B15 | el coste del tick | 5 y 10 | a mano | falla con más de un 25 % y más de 15 s a la vez; 0 lápidas | sí, con el prototipo (L7): +15,5 a +18,9 s el 179, +0,7 a +0,8 s el 176 | §5.8, §18.3 |
| B16 | la radio desde la línea | 11 | banco y rápida | igualdad | no | §12.10 |
| B17 | el ritmo medido | 0 y 10 | a mano y rápida | las bandas de 8-k | sí: L4 | §8.9 |
| B18 | el servidor no adelanta | 7a | rápida | 409 | no | §10.11, §14.3 |
| B19 | la voz es prefijo | 2 | rápida | 0 | sí: 0 en 15 y en 18 | §12.2, §12.3 |
| B20 | revelar sin castigo | 7a | rápida | nadie fuera de la lista lee lo visto | no | §11.11 |
| B21 | la posición del instante | 6a | banco | informativo; < 1 km | sí: p99 52-508 m | §4.5 |
| B22 | el reloj estimado | 6a | rápida | p99 ≤ 1 km | sí: máximo 0,69 km | §3.8, D-61 |
| PL | la prueba de lectura | 10 | a mano | nueve de nueve | no (sin evidencia) | §8.9, §16.5 |

---

**Injertos aplicados.** I-02 (§16.2: I1, I2, I3 e I5 con su fixture, su suite, su umbral y sus cifras; la autocomprobación al grabar es §5.5), I-10 (§16.4: B9 con su código entero), I-12 (§16.4: B10 y B11 con su código entero, la cláusula de la envoltura ingenua y la prueba de humo), I-30 (§16.3: B1b diferencial con la lista blanca de §11.18 y la segunda cuenta, B1c de dos desenlaces con su código, y `PENDING_ROUTES` comprobada en los dos sentidos), I-35 (§16.4: B20; §16.6).

**Objeciones resueltas.** O-16 (§16.4: B16 en las 24 y en las seis congeladas antes de dejar de escribir la radio, que condiciona DD-11), O-17 (§16.4: B14 con 250.000 filas, el índice de la `0045` y p95 ≤ 5 ms), O-23 (§16.4: B15 sobre los días 176 y 179, con grabador y escritura y su umbral).

**Huecos rellenados.** H-04 (§16.5: el protocolo de la prueba de lectura, entero), H-10 (§16.4: B14), H-14 (§16.4: B15). Contradicciones de hecho que quedan resueltas: X-08 (§16.4, B15: las cifras de CPU del juez, de L3 y de L7 y el banco que las sella), X-09 (§16.4, B11: 20 de 20 y 24 de 24), X-10 (§16.4, B10: el colector aparte y la ingenua que rompe), X-11 (§16.4, B14) y X-24 (§16.4, B15).

**Decisión tomada aquí.**
- 16-a. Las etapas congeladas son seis y no cinco: las cinco en línea de B19 (`race-france` e7, e18 y e20, `race-flanders` e1 y `race-colombia` e5) y la crono `race-france` e16, que necesitan I5, B6 de las cronos y B9 de la crono; semilla 0 y campo del banco. `scripts/broadcast-fixtures.mjs` las escribe en dos veces: sucesos, radio y acta en el paso 2, para que B19 nazca con el `revealS` de lo guardado (el del adaptador, §3.8); la línea y lo que espera I1, en el 4b, y desde el 5 B19 usa la línea grabada.
- 16-b. I2: la igualdad en el km de foto, exacta; el tránsito, p90 ≤ 15 por etapa y p90 ≤ 4 en el conjunto, sobre lo medido en `l8/transito.mjs` (12 y 3). Descartado: el p90 ≤ 2 de §G.9, que falla en 23 de 44 corridas y describe las llanas, no las reinas.
- 16-c. I5 es una igualdad exacta, porque 9-a hace la última entrada de la traza `10 · tiempoS`. Descartado: la tolerancia de 5 Ds de §4.4, que solo hacía falta con `toDs`.
- 16-d. B1a busca valores plantados en las filas del desenlace (tiempo, premio, puntos e ids) y el nombre del ganador solo en el título, las `og:` y el correo, que no llevan listas; la identidad del ganador en el JSON es de B1c. Descartado: buscar el nombre en todo el JSON, que falla por construcción con la lista de salida.
- 16-e. Cada B1 lleva su cláusula de no vacío (el canario sale con la etapa vista; los ganadores son distintos; el visitante sin velo ve dos carreras; diez rutas cambian al verla) y `PENDING_ROUTES` se comprueba en los dos sentidos, por banco.
- 16-f. B1c deja pasar, además de la lista blanca de B1b, el tiempo de la cabecera: cambiar el desenlace obliga a cambiar la semilla de la etapa, que también decide el tiempo del día, y ese tiempo se sabe antes de salir.
- 16-g. Dónde corre cada uno: B10 corto en la rápida y largo en el nocturno con `CS_BANCOS=1`; B11 en «mundo y radio» con prueba de humo en `packages/engine/src/stage/`; B15, B17 largo y la PL, a mano en su paso, con la cifra en el PR.
- 16-h. Los topes de red de B6 son constantes con nombre (`maxHeadGzipBytes`, `maxChunkGzipBytes`, `maxFinishGzipBytes`, `maxVeiledStageGzipBytes`) con los valores de §14.8, sin evidencia de los jueces.
- 16-i. En la PL un punto cuenta si LAS DOS personas contestan bien las cuatro preguntas; la verdad sale de la línea (`scripts/pl-truth.mjs`), con los márgenes de 16.5; una pregunta que falla dos veces seguidas va al dueño.
- 16-j. B2: 0 contradicciones de pertenencia y 15 s en el 95 % de los huecos, medido en el 6a; si una familia no llega, se escribe la cifra con su causa.
- 16-k. B14 mide `computeHorizon` (sin memo, en la forma D de §18.2) y `recordProgress` por separado, cada uno con el umbral de D-33 (p95 ≤ 5 ms), y `computeHorizon` para dos espectadores: el jugador es la puerta en la suite rápida; el mánager de un equipo de 30, que en PGlite da de 8,6 a 9,3 ms, se imprime con su cifra y es puerta en la medida contra Postgres del paso 7 (§18.9), porque PGlite es Postgres en WASM de un solo hilo (§18.2). Si el mánager no pasa contra Postgres (del dueño): por defecto `SPOILER_MODE` no pasa a `on` hasta que pase, como dice §15.6, y lo primero que se optimiza es la cuarta consulta. Descartado: sumar las dos funciones en un solo p95 (con ellas juntas no pasaría ni el jugador, 3,1-3,7 más 3,05 ms), que mezcla el coste de leer, en cada petición con horizonte, con el de escribir, como mucho una vez cada 15 s por espectador y carrera (10-l).
- 16-l. B15 falla si la grabación suma en un mismo día, a la vez, más de un 25 % y más de 15 s, o si deja alguna lápida: el porcentaje decide en el día grande y los segundos en el pequeño. Con el prototipo pasan los dos días (§18.3): el 179 suma de 15,5 a 18,9 s, pero solo de un 15 a un 17 %; el 176 pasa del 25 % (de 2,2-2,4 s a 3,1 s), pero son 0,8 s como mucho. Descartado: exigir las dos cotas a la vez, que con el prototipo suspende cada día por la cota que no le toca; los segundos del 179, además, dependen de la máquina (en la de L7, 15 s son un 14 % de ese día).
- 16-m. Los umbrales de B8 salen de lo que midió L7 (§18.1), con un margen de cuatro a cinco veces: mediana ≤ 2 ms el tramo mayor (medido, 0,54) y ≤ 3 ms la cabecera (0,71); p95 de `instantAt` ≤ 0,25 ms (p99 de 0,036 a 0,056 con una aproximación del corte). El PR 6a mide el `instantAt` de verdad y, si su p95 pasa de 0,05 ms, el umbral es cinco veces lo medido. Descartado: 10 ms y 2 ms, de 14 a 36 veces lo medido, que solo cazarían una regresión de un orden de magnitud.
- 16-n. B6 mide cada tope donde se puede medir: el JSON en el banco sobre las 24 × 2; el `bytea` con gzip 9 en la rápida sobre los seis `.timeline.gz` y a mano sobre las 24 × 2 en el paso 5 (`scripts/broadcast-fixtures.mjs --sizes`), porque el motor no importa `node:*` ni en sus tests (`eslint.config.js` l. 80-137); la cabecera y los tramos, con `app.inject` sobre las seis cargadas en PGlite; el paquete de meta y la ruta de etapa velada, sobre la etapa corrida de `routes/broadcast.test.ts`, la única con resultado, general y noticias. Descartado: comprimir en el motor con `CompressionStream`, que no deja elegir el nivel 9.
- 16-o. La lista blanca de B1b no se copia aquí: `B1B_WHITELIST` es la tabla de §11.18, su única fuente, escrita con la gramática de `strip`, que gana `[veiledDay]` para la fila de `/api/riders/me/form` (la fila del día de la etapa aparece, no cambia), y B1b comprueba que cada ruta de la lista es L en el registro. Descartado: la copia literal, que ya se había separado de §11.18 justo en esa fila (quitaba los campos de la fila, que no existe antes de correr la etapa).

**Propuesto para el glosario.**
- Los fixtures `apps/api/src/__fixtures__/broadcast/` (`<etapa>.timeline.gz`, `.events.json.gz`, `.radio.json.gz`, `.i1.json.gz`, `.acta.json.gz`, `manifest.json` y `load.ts` con `FIXTURES` y `loadTimeline`) y los scripts `scripts/broadcast-fixtures.mjs`, `scripts/bench-tick.mjs`, `scripts/bench-pace.mjs` y `scripts/pl-truth.mjs`.
- `apps/api/src/__fixtures__/spoilerWorld.ts`: `startSpoilerWorld`, `SpoilerWorld`, `Swept`, `sweep`, `strip`, `normalize`, `routeOf`, `pendingFor`, `PENDING_ROUTES`, `B1B_WHITELIST` y `B1C_WHITELIST`.
- `BROADCAST.maxHeadGzipBytes` (16.384), `maxChunkGzipBytes` (12.288), `maxFinishGzipBytes` (40.960) y `maxVeiledStageGzipBytes` (4.096): topes de banco, no de escritura, como los de `TIMELINE` (15-g).
- La variable `CS_BANCOS` (`1` en el nocturno) y las exportaciones `runOneStage`, `StageRunSpec` y `timelineTickLog` de `packages/db/src/index.ts`.
- El token `[veiledDay]` de la gramática de `strip` (la fila de un array cuyo `gameDay` es el de la etapa velada) y la opción `--sizes` de `scripts/broadcast-fixtures.mjs` (el `bytea` de las 24 × 2, paso 5).
- Los ficheros de test nuevos de esta sección: `apps/api/src/spoilerCanary.test.ts`, `spoilerDiff.test.ts`, `spoilerOutcomes.test.ts`, `spoilerRegistry.test.ts`, `broadcastCut.test.ts`, `broadcastFixtures.test.ts`, `broadcastPace.test.ts`, `voicePrefix.test.ts` y `radioAdapter.test.ts`; `packages/db/src/timelineCollector.test.ts`, `horizonLatency.test.ts` y `revealFree.test.ts`; `packages/engine/src/stage/probeHooks.test.ts`; `apps/web/src/domain/templateCoverage.test.ts`, `stageJournal.corpus.test.ts` y `broadcast/clientCost.test.ts`.

**Dudas para el ensamblador.**
- B6 con los topes de D-11 nace en rojo con lo que midió L3 (§5.7): la línea de 20,9 a 70,0 KB contra 48 KB, el JSON de 123 a 464 KB contra 128 KB y las cronos de 176 corredores contra 16 KB. Esta sección no reabre D-11; §15.2 y §18 tienen que decidir con la propuesta de L3 (96 KB, 640 KB, 256 KB y 32 KB) antes del paso 5.
- §4.4 escribe I5 con una tolerancia de 5 Ds y §G.9 escribe I2 con «p90 ≤ 2»: 16-c y 16-b los cambian, y los dos sitios deberían decirlo.
- §15 no tiene los topes de red de B6: 16-h propone nombres y valores (los de §14.8).
- La introducción de §11 describe B1a como «el nombre del ganador de una etapa velada no sale en ninguna respuesta»; con 16-d, el nombre se busca en el título, las `og:` y el correo, y en el JSON se buscan valores plantados (la identidad es B1c).
- §5.10 dice que B10 corre «en las 24 etapas del mapa 07 §7»: son las 22 en línea, porque en una crono no hay fotos de radio.
- §G.9 cita B19 con «0 en 15 corridas por ingeniero»: ahora también 0 en 18 con el `revealS` real (§12.2).
- §17 tiene que llevar: el script de fixtures en el paso 2 y su segunda mitad en el 4b; `CS_BANCOS=1` en `cobertura.yml` en el 4b; las exportaciones de `packages/db` en el 7a; y el umbral de I2 del 6a.

**Dudas del cierre (lote L8).** Lo que el cierre no puede arreglar desde esta sección:
- B14 (16-k): si el mánager, que en PGlite da de 8,6 a 9,3 ms, no pasa contra Postgres en el paso 7, la decisión es del dueño; §20 tiene que recogerla, y §15.6 y la tabla de §18.10 tienen que decir que B14 mide dos espectadores y `recordProgress` aparte.
- B15 (16-l) y B8 (16-m) cambian umbrales que §18.1, §18.3 y §18.10 citan todavía con los valores de antes (un 25 % y 15 s a la vez; 10 ms y 2 ms): esas filas tienen que tomar los de §16.4.
- B6 (16-n): el paso 5 de §17 tiene que llevar `scripts/broadcast-fixtures.mjs --sizes`; el tope del paquete de meta y el de la ruta de etapa velada se miden en `routes/broadcast.test.ts` (§14.7), que es de L6.
- B10: el PR 4b tiene que exportar `realRaceScenario` en `packages/engine/src/index.ts`; ni la lista de exportaciones de §5.10 ni §17 lo dicen.
- B11: el código anterior exigía `onEvent` en las seis cronos, que §5.2 dice que no lo llaman; ya exige lo contrario. Si §5 cambia y la crono pasa a emitir por `onEvent`, este `it` cae y hay que re-sellarlo.
- B12: sus casos van en dos ficheros (`packages/db/src/horizon.test.ts` y los tests de rutas de §14.7) y en tres PR (7a, 8a y 8b); el esqueleto (§17.11) pone B12 y B13 en el paso 8. §17 tiene que seguir a §16.9 o decir por qué no.
- B1b (16-o): §11.18 describe la fila de `/api/riders/me/form` en prosa y `B1B_WHITELIST` la traduce con `[veiledDay]`; si el ensamblador prefiere que la tabla de §11.18 lleve además las rutas de campos en una columna, la traducción deja de quedar al implementador.
- B1c depende de 8-g (`TimelineCast.favourites`, propuesto por §8): sin los favoritos congelados, `preview.favourites` se lee con los atributos de hoy, que difieren entre los dos desenlaces, y B1c nace en rojo (nota de L4).
