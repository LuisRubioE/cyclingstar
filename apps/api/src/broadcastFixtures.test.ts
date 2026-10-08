import { gunzipSync, gzipSync } from 'node:zlib'
import { type Horizon, type VeiledStage, veilCast, worldHorizon } from '@cyclingstar/db'
import { type TestDb, startTestDb } from '@cyclingstar/db/test'
import {
  ENGINE_VERSION,
  type RaceRadio as CollectorRadio,
  type RadioKm,
  SEASON_CALENDAR,
  STAGE,
  type SnapshotRider,
  type StageInput,
  type StageOutput,
  TIMELINE,
  freezeStageWeather,
  profileStripOf,
  raceRadioCollector,
  raceRadioFrom,
  radioForStorage,
  radioKmFrom,
  radioKmPoints,
  realRaceScenario,
  simulateStage,
  stageLengthKm,
  stageSeed,
  timelineRecorder,
} from '@cyclingstar/engine'
import {
  BROADCAST,
  type BroadcastHead,
  CUE_OF_TEMPLATE,
  type CastRider,
  type ChampionTitle,
  type ChronicleRider,
  type InstantContext,
  JERSEY_PRIORITY,
  type RaceRadio,
  type RadioGroup,
  type RadioNames,
  type RiderCard,
  type StageRef,
  type StageTimeline,
  type TimelineCast,
  breakHeadline,
  breakPresentedOf,
  broadcastChunkSchema,
  broadcastHeadSchema,
  clockMarksOf,
  cuesBetween,
  decodeTimeline,
  encodeTimeline,
  fromDs,
  instantAt,
  namedRidersOf,
  photoAt,
  photoBlocksOf,
  radioFromTimeline,
  seededRng,
  startStateOf,
  staticNotoriety,
  toDs,
} from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  FIXTURES,
  type FixtureInvariants,
  type FixtureName,
  ROAD_FIXTURES,
  fixtureNames,
  fixtureStage,
  loadEvents,
  loadInvariants,
  loadRadio,
  loadTimeline,
  loadTimelineBody,
  seedFixtureWorld,
} from './__fixtures__/broadcast/load.js'
import { type AppDeps, buildApp } from './app.js'
import { serveCast } from './broadcastSource.js'
import { type ChronicleNames, buildRaceRadio } from './chronicle.js'

/**
 * LAS SEIS ETAPAS CONGELADAS CON SU LÍNEA GRABADA (docs/retransmision.md §16.2, §16.4, §17.8 y §17.9;
 * E2, pasos 5 y 6a; 17-u). Miden `packages/shared` y la API, no el motor: la línea es la que se grabó
 * con el motor v91 y no cambia con él, así que un cambio en `broadcast/` que cambie lo que se lee de lo
 * grabado lo cazan aquí en la suite rápida (D-52), aunque no toque `packages/engine` ni corra los
 * bancos.
 *
 * - I3: la línea vuelve igual de su JSON, y cada foto clave es la reducción desde la salida.
 * - I1 (las cinco en línea): en cada bloque de foto, `photoAt` proyectada como radio es lo que guardó el
 *   script, `radioKmFrom` de la foto del MOTOR con el título de la línea, con la tolerancia de relojes
 *   iguales en décimas que cubre también el `kind` (§5.5).
 * - I5 (la crono): la salida de cada corredor es la del plan, su reloj no retrocede y su última entrada
 *   es 10 · tiempoS.
 * - B6: el `bytea` contra `TIMELINE.maxStoredBytes` (`ttMaxStoredBytes` en la crono), y su JSON contra
 *   `maxJsonBytes` y, la mediana de las seis, contra `medianJsonBytes` (16-n).
 * - Y el reparto: el de la salida, por RiderIx, con un `from` de campeón donde el script lo sembró.
 *
 * Desde el 6a, sobre la línea grabada que sirven las rutas:
 *
 * - I2 (las cinco en línea; §4.4, 16-b): en la hora de su marca en un km de foto, cada grupo lleva a
 *   los de la foto menos los que el corte diagonal pinta en un grupo de detrás, y el tránsito cada 30 s
 *   de carrera, con p90 ≤ 15 por etapa y ≤ 4 en el conjunto. Es la versión rápida de la del banco
 *   (`packages/engine/src/sim/timeline.test.ts`, 4b), con sus mismas dos salvedades contadas.
 * - B2 (16-j): lo que dice cada suceso de cabeza, de caza, de hueco y de corte contra el instante en su
 *   hora de revelado; cada familia contra lo que mide hoy, impreso con su causa.
 * - B6 de lo servido (16-h, 16-n): la cabecera y el tramo mayor de las seis, con gzip 6 como
 *   `@fastify/compress`, servidos por `app.inject` sobre las seis sembradas en PGlite con
 *   `seedFixtureWorld`, contra `maxHeadGzipBytes` y `maxChunkGzipBytes`; y B8 de su parse, `JSON.parse`
 *   más el `safeParse` del esquema de `shared`, con los umbrales de §16.4 (la web no tiene estas
 *   respuestas: `clientCost.test.ts` mide allí el fotograma).
 * - Y cada plantilla de las seis tiene su rótulo en `CUE_OF_TEMPLATE` (§6.6).
 *
 * El 6b le añade B3, su primera parte (§16.4), sobre la cabecera que sirve la ruta a las seis: en cada
 * grupo de hasta `nameWholeGroupUpTo` cada 30 s de carrera, `namedRidersOf` nombra a todos y cada uno
 * tiene su carta con el maillot resuelto, y la cláusula de no vacío con una cabecera sintética. La
 * segunda parte es de la web (`breakPresentation.test.ts`). El 7b le añade B13 (abajo, 17-t): ningún
 * dato del reparto cuya procedencia esté en el velo viaja; y el 11a, B16 (al final, 17-l): la radio
 * desde la línea (`radioFromTimeline`) es la guardada de hoy (`buildRaceRadio` sobre `radioForStorage`),
 * en la rápida sobre las seis y, con `CS_BANCOS=1`, sobre las 24 del banco corridas aquí.
 */

const ROAD = new Set<FixtureName>(FIXTURES.filter((name) => !fixtureStage(name).timeTrial))

/** La foto del bloque `b` de la línea proyectada como radio, como `selfCheckI1` (§5.5). */
function lineProjection(tl: StageTimeline, b: number): RadioKm {
  const p = photoAt(tl, b)
  const titleId = p.main === null ? undefined : tl.groups[p.main]?.id
  const riders: SnapshotRider[] = []
  p.groupOf.forEach((g, r) => {
    if (g < 0) return
    const d = p.clock.get(g)
    riders.push({
      riderId: tl.riderIds[r]!,
      groupId: tl.groups[g]?.id ?? `?${g}`,
      tS: d === undefined ? Number.NaN : fromDs(d),
      energy: 0,
      energy0: 0,
      pulling: false,
      pullMotive: null,
      pullFor: null,
      pullWindow: 0,
    })
  })
  return radioKmFrom((b + 0.5) * tl.dx, riders, tl.riderIds.length, Infinity, null, titleId)
}

type RoadBlock = Extract<FixtureInvariants, { kind: 'road' }>['blocks'][number]

/**
 * Las diferencias entre lo que espera I1 y la proyección de la línea, por TRAMOS de igual reloj en Ds:
 * en cada tramo, los mismos ids; en cada id, los mismos miembros, el tamaño y el hueco a 0,1 s; los
 * `kind` del tramo, como multiconjunto; y racing, gone y el pelotón iguales.
 */
function i1Mismatches(tl: StageTimeline, expected: RoadBlock): string[] {
  const [b, racing, gone, mainId, groups] = expected
  const got = lineProjection(tl, b)
  const ix = new Map(tl.riderIds.map((id, r) => [id, r] as const))
  const out: string[] = []
  if (got.racing !== racing) out.push(`b${b} racing ${racing} ≠ ${got.racing}`)
  if (got.gone !== gone) out.push(`b${b} gone ${gone} ≠ ${got.gone}`)
  if (got.mainId !== mainId) out.push(`b${b} pelotón ${mainId} ≠ ${got.mainId}`)
  const have = got.groups.map(
    (g) =>
      [
        g.id,
        toDs(g.tS),
        g.kind,
        g.size,
        g.gapS,
        g.riderIds.map((id) => ix.get(id) ?? -1).sort((x, y) => x - y),
      ] as const,
  )
  /** Los grupos en tramos de igual reloj en Ds, en orden de carretera. */
  const runsOf = <T extends readonly [string, number, ...unknown[]]>(gs: readonly T[]): T[][] => {
    const runs: T[][] = []
    for (const g of gs) {
      const last = runs[runs.length - 1]
      if (last !== undefined && last[0]![1] === g[1]) last.push(g)
      else runs.push([g])
    }
    return runs
  }
  const want = runsOf(groups)
  const mine = runsOf(have)
  if (want.length !== mine.length) out.push(`b${b} ${want.length} tramos ≠ ${mine.length}`)
  for (let i = 0; i < Math.min(want.length, mine.length); i++) {
    const a = want[i]!
    const c = mine[i]!
    const ids = (run: readonly (readonly [string, ...unknown[]])[]) =>
      run
        .map((g) => g[0])
        .sort()
        .join(',')
    if (ids(a) !== ids(c) || a[0]![1] !== c[0]![1]) {
      out.push(`b${b} tramo ${i}: ${ids(a)} @${a[0]![1]} ≠ ${ids(c)} @${c[0]![1]}`)
      continue
    }
    for (const [id, , , size, gapCs, members] of a) {
      const g = c.find((x) => x[0] === id)!
      if (g[3] !== size) out.push(`b${b} ${id} tamaño ${size} ≠ ${g[3]}`)
      if (Math.abs(gapCs / 100 - g[4]) > 0.1 + 1e-6)
        out.push(`b${b} ${id} hueco ${gapCs} ≠ ${g[4]}`)
      if (members.join(',') !== g[5].join(',')) out.push(`b${b} ${id} miembros distintos`)
    }
    const kinds = (run: readonly (readonly [string, number, string, ...unknown[]])[]) =>
      run
        .map((g) => g[2])
        .sort()
        .join(',')
    if (kinds(a) !== kinds(c)) out.push(`b${b} tramo ${i}: kind ${kinds(a)} ≠ ${kinds(c)}`)
  }
  return out
}

describe('las etapas congeladas con su línea grabada (I1, I3, I5 y B6; paso 5)', () => {
  it.each(FIXTURES)(
    '%s · I3: la línea vuelve igual de su JSON y las fotos clave son la reducción',
    (name) => {
      const json: unknown = JSON.parse(gunzipSync(loadTimelineBody(name)).toString('utf8'))
      const tl = loadTimeline(name)
      expect(tl.clock).toBe('exact')
      // El dato, y no el texto: lo que pasa tal cual al JSON vuelve con las claves en el orden del esquema.
      expect(JSON.parse(JSON.stringify(encodeTimeline(tl)))).toEqual(json)
      expect(decodeTimeline(JSON.parse(JSON.stringify(encodeTimeline(tl))))).toEqual(tl)
      const sinClaves = { ...tl, keys: [] }
      for (const k of tl.keys) {
        const p = photoAt(sinClaves, k.b)
        expect([...p.groupOf], `${name} clave b${k.b}`).toEqual([...k.groupOf])
        expect(p.main, `${name} clave b${k.b}`).toBe(k.main)
      }
      expect(tl.keys.length > 0).toBe(ROAD.has(name))
    },
  )

  it.each([...ROAD])(
    '%s · I1: cada bloque de foto es la foto del motor con el título de la línea',
    (name) => {
      const tl = loadTimeline(name)
      const inv = loadInvariants(name)
      if (inv.kind !== 'road') throw new Error(`${name}: se esperaba I1`)
      expect(inv.blocks.length).toBeGreaterThan(10)
      const misses = inv.blocks.flatMap((block) => i1Mismatches(tl, block))
      expect(misses.slice(0, 5)).toEqual([])
    },
  )

  it('race-france-e16 · I5: la salida del plan, un reloj que no retrocede y 10 · tiempoS en meta', () => {
    const tl = loadTimeline('race-france-e16')
    const inv = loadInvariants('race-france-e16')
    if (inv.kind !== 'tt' || tl.tt === null) throw new Error('la e16 es una crono')
    expect(tl.tt.startDs).toEqual(inv.startDs)
    tl.tt.kmClockDs.forEach((row, r) => {
      for (let j = 1; j < row.length; j++) expect(row[j]!).toBeGreaterThanOrEqual(row[j - 1]!)
      expect(row[row.length - 1], `corredor ${r}`).toBe(inv.finishDs[r])
    })
  })

  it('B6: el bytea y su JSON caben en los topes de TIMELINE, y la mediana del JSON también (16-n)', () => {
    const json: number[] = []
    for (const name of FIXTURES) {
      const body = loadTimelineBody(name)
      const cap = ROAD.has(name) ? TIMELINE.maxStoredBytes : TIMELINE.ttMaxStoredBytes
      expect(body.length, name).toBeLessThanOrEqual(cap)
      const bytes = gunzipSync(body).length
      expect(bytes, name).toBeLessThanOrEqual(TIMELINE.maxJsonBytes)
      json.push(bytes)
    }
    const sorted = [...json].sort((a, b) => a - b)
    const median = (sorted[2]! + sorted[3]!) / 2
    expect(median).toBeLessThanOrEqual(TIMELINE.medianJsonBytes)
  })

  it.each(FIXTURES)(
    '%s · el reparto es el de la salida, con su campeón donde se sembró',
    (name) => {
      const stage = fixtureStage(name)
      const tl = loadTimeline(name)
      expect(tl.riderIds).toEqual(stage.riderIds)
      expect(tl.cast.riders.map((c) => c.riderId)).toEqual(stage.riderIds)
      expect(tl.cast.favourites).toHaveLength(3)
      for (const champion of stage.champions) {
        const c = tl.cast.riders.find((x) => x.riderId === champion.riderId)!
        const titles = [
          ...(c.worn.kind === 'champion' ? [c.worn.title] : []),
          ...c.distinctions.flatMap((d) => (d.kind === 'champion' ? [d.title] : [])),
        ]
        expect(titles.map((t) => t.source)).toContainEqual({
          raceKey: `${champion.raceId}:s0`,
          stageDay: 1,
        })
      }
    },
  )
})

// ------------------------------------------------------------------- I2 y B2 sobre la línea (6a)

/** I2 (16-b): el tránsito, p90 de corredores en dos grupos o en ninguno cada 30 s de carrera. */
const I2_TRANSIT_EVERY_S = 30
const I2_TRANSIT_P90_STAGE = 15
const I2_TRANSIT_P90_ALL = 4
/**
 * B2 (§16.4, 16-j), las familias de la pertenencia: los protagonistas de la cabeza en el grupo 1 y los
 * cazados en el pelotón. Las de los huecos y los cortes, aparte.
 */
const B2_HEAD = new Set(['front_group', 'breakaway_formed'])
const B2_SPLIT = new Set(['peloton_split', 'peloton_selection'])
/** B2 (16-j): el hueco del suceso contra `mainGap`, a 15 s en el 95 %. */
const B2_GAP_S = 15
const B2_GAP_SHARE = 0.95
/**
 * LO QUE MIDE B2 HOY sobre las cinco en línea (6a), con su causa, como pide 16-j a la familia que no
 * llega: es el suelo de esta suite, que no puede empeorar sin que un test lo diga (las congeladas no
 * cambian; lo que cambia es `shared`). Las causas son las del banco del 4b (`timeline.test.ts`):
 *
 * - la cabeza, 26 de 29: en las tres que no, el grupo nombrado va a la par de otro y el instante pinta
 *   delante al otro. En la `race-colombia` e5 (km 121,1) la fuga recién nacida está en su marca de
 *   nacimiento, en el mismo km que el pelotón del que sale, hasta su segunda marca; en la e20 (km
 *   75,5, que se revela en el km 81) el escapado va 10 m por detrás de un grupo de quince; y en la e18
 *   (km 180,1) los tres nombrados pasan su bloque después que el grupo de cuatro que la línea titula
 *   pelotón, y van 170 m por detrás de él hasta que lo alcanzan.
 * - los huecos con la misma pareja, 16 de 18 a 15 s o menos (el 89 %; p95 de 77 s): el suceso lee los
 *   relojes del bloque en que se emite, y `mainGap` el del último km de foto que ha cruzado el grupo de
 *   detrás (§4.5), que con minutos de hueco va kilómetros por detrás.
 * - los cortes, 10 de 15: el suceso cuenta los que el pelotón ha perdido desde su aviso anterior, no
 *   los grupos, y en los otros cinco nacen grupos pero otros se funden o bajan de cuatro.
 */
const B2_MEASURED = { headBad: 3, gapShare: 0.88, splitBad: 5 } as const

const quantile = (xs: readonly number[], q: number): number => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length === 0 ? Number.NaN : s[Math.min(s.length - 1, Math.floor(q * s.length))]!
}

/** El contexto del instante: sin corredores propios y sin maillots, como el banco. */
const ctxOf = (tl: StageTimeline): InstantContext => ({
  own: new Set(),
  start: {
    leaders: { gc: null, points: null, kom: null },
    gcTop: [],
    racingAtStart: tl.riderIds.length,
  },
  photoBlocks: photoBlocksOf(tl.lengthKm, tl.dx),
})

describe('I2 y B2 sobre la línea grabada de las cinco en línea (6a; 16-b, 16-j)', () => {
  const transit: number[] = []
  const i2 = { checks: 0, dyingAtPhoto: 0, unordered: 0 }
  const b2 = {
    head: 0,
    headBad: [] as string[],
    caught: 0,
    caughtBad: [] as string[],
    gaps: [] as number[],
    split: 0,
    splitBad: [] as string[],
  }

  it.each(ROAD_FIXTURES)('%s · I2: el instante en el km de foto y el tránsito', (name) => {
    const tl = loadTimeline(name)
    const ctx = ctxOf(tl)
    // Un grupo con una marca fuera de orden respecto de la del km de foto (una anterior con reloj
    // mayor o igual, o una posterior con reloj menor o igual) se ve a esa hora en otro bloque (§4.6):
    // no entra, y se cuenta, como en el banco.
    const marksOf = tl.groups.map((_, g) => clockMarksOf(tl, g))
    for (const b of ctx.photoBlocks) {
      const p = photoAt(tl, b)
      for (const [g, d] of p.clock) {
        const at = instantAt(tl, d / 10, ctx)
        const inPhoto = [...p.groupOf].flatMap((x, r) => (x === g ? [r] : []))
        const now = at.groups.find((x) => x.g === g)
        if (tl.groups[g]!.diedB === b) {
          // muere en ese bloque: su muerte se ve a esa misma hora y los suyos van en tránsito o en su sucesor
          i2.dyingAtPhoto += 1
          expect(now, `${name}: ${tl.groups[g]!.id} muere en el ${b}`).toBeUndefined()
          const seen = new Set([
            ...at.groups.flatMap((x) => x.members),
            ...at.inTransit.map((x) => x.rider),
          ])
          expect(inPhoto.every((r) => seen.has(r))).toBe(true)
          continue
        }
        if (marksOf[g]!.some(([mb, md]) => (mb > b && md <= d) || (mb < b && md >= d))) {
          i2.unordered += 1
          continue
        }
        i2.checks += 1
        const behind = new Set(at.inTransit.filter((x) => x.to === g).map((x) => x.rider))
        expect(now?.members, `${name}: ${tl.groups[g]!.id} en el bloque ${b}`).toEqual(
          inPhoto.filter((r) => !behind.has(r)),
        )
      }
    }
    const here: number[] = []
    for (let t = 0; t <= tl.finish.finishS; t += I2_TRANSIT_EVERY_S)
      here.push(instantAt(tl, t, ctx).inTransit.length)
    transit.push(...here)
    expect(quantile(here, 0.9), `${name}: p90 del tránsito`).toBeLessThanOrEqual(
      I2_TRANSIT_P90_STAGE,
    )
  })

  it.each(ROAD_FIXTURES)('%s · B2: los sucesos contra el instante en su hora', (name) => {
    const tl = loadTimeline(name)
    const ctx = ctxOf(tl)
    /** Los grupos de más de tres a una hora: un corte se compara con el anterior (o con la salida). */
    const bigGroups = (t: number): number =>
      instantAt(tl, t, ctx).groups.filter((x) => x.size > 3).length
    let lastCutS = 0
    for (const e of tl.events) {
      if (B2_HEAD.has(e.plantilla)) {
        const head = new Set(instantAt(tl, e.revealS, ctx).groups[0]?.members ?? [])
        b2.head += 1
        if (!e.riders.every((r) => head.has(r)))
          b2.headBad.push(`${name} ${e.plantilla} km ${e.km}`)
      } else if (B2_SPLIT.has(e.plantilla)) {
        b2.split += 1
        if (bigGroups(e.revealS) <= bigGroups(lastCutS))
          b2.splitBad.push(`${name} ${e.plantilla} km ${e.km}`)
        lastCutS = e.revealS
      } else if (e.plantilla === 'breakaway_caught' && e.datos?.motivo !== 'deshecha') {
        // los cazados van en el grupo del que caza, que es el pelotón
        const pack = instantAt(tl, e.revealS, ctx).groups.find((x) => x.kind === 'peloton')
        const inPack = new Set(pack?.members ?? [])
        b2.caught += 1
        if (!e.riders.every((r) => inPack.has(r))) b2.caughtBad.push(`${name} km ${e.km}`)
      } else if (e.plantilla === 'time_gap' && e.datos !== null) {
        // el hueco del suceso contra mainGap, si la pareja es la misma (los dos grupos, por su tamaño)
        const at = instantAt(tl, e.revealS, ctx)
        const mg = at.mainGap
        const ahead = at.groups.find((x) => x.g === mg?.ahead)
        const behind = at.groups.find((x) => x.g === mg?.behind)
        const gapS = e.datos.gapS
        if (
          mg !== null &&
          typeof gapS === 'number' &&
          ahead?.size === e.datos.leadSize &&
          behind?.size === e.datos.chaseSize
        )
          b2.gaps.push(Math.abs(mg.gapS - gapS))
      }
    }
  })

  it('I2 en el conjunto: la igualdad en el km de foto y el tránsito con p90 ≤ 4 (16-b)', () => {
    console.info(
      `[broadcast] I2 sobre las cinco en línea: ${i2.checks} grupos en su km de foto, iguales; fuera, ` +
        `${i2.dyingAtPhoto} que mueren en él y ${i2.unordered} con marcas fuera de orden. Tránsito: ` +
        `p50 ${quantile(transit, 0.5)}, p90 ${quantile(transit, 0.9)}, máximo ${Math.max(...transit)} ` +
        `en ${transit.length} muestras`,
    )
    expect(i2.checks).toBeGreaterThan(0)
    expect(quantile(transit, 0.9)).toBeLessThanOrEqual(I2_TRANSIT_P90_ALL)
  })

  it('B2: cada familia con su umbral o con su cifra medida y su causa (16-j)', () => {
    const near = b2.gaps.filter((x) => x <= B2_GAP_S).length
    const pct = (n: number, of: number): string =>
      `${of === 0 ? 100 : ((100 * n) / of).toFixed(0)} %`
    console.info(
      [
        `[broadcast] B2 sobre las cinco en línea:`,
        `  la cabeza, ${b2.head - b2.headBad.length} de ${b2.head}; fuera: ${b2.headBad.join('; ')}`,
        `  las cazadas, ${b2.caught - b2.caughtBad.length} de ${b2.caught}`,
        `  los huecos con la misma pareja: ${b2.gaps.length}, a ≤ ${B2_GAP_S} s ${near} ` +
          `(${pct(near, b2.gaps.length)}), p50 ${quantile(b2.gaps, 0.5).toFixed(1)} s, ` +
          `p95 ${quantile(b2.gaps, 0.95).toFixed(1)} s`,
        `  los cortes, ${b2.split - b2.splitBad.length} de ${b2.split}; fuera: ${b2.splitBad.join('; ')}`,
      ].join('\n'),
    )
    expect(b2.head).toBeGreaterThan(0)
    expect(b2.caught).toBeGreaterThan(0)
    expect(b2.gaps.length).toBeGreaterThan(0)
    expect(b2.split).toBeGreaterThan(0)
    // el umbral de 16-j donde se cumple: los cazados van en el pelotón
    expect(b2.caughtBad).toEqual([])
    // donde no se cumple, la cifra medida es el suelo (arriba, con su causa)
    expect(b2.headBad.length).toBeLessThanOrEqual(B2_MEASURED.headBad)
    expect(b2.splitBad.length).toBeLessThanOrEqual(B2_MEASURED.splitBad)
    expect(near / b2.gaps.length).toBeGreaterThanOrEqual(
      Math.min(B2_GAP_SHARE, B2_MEASURED.gapShare),
    )
  })
})

// ------------------------------------------------------------ B6 de lo servido y los rótulos (6a)

describe('cada plantilla de las seis tiene su rótulo (§6.6)', () => {
  it.each(FIXTURES)('%s', (name) => {
    const missing = [...new Set(loadEvents(name).map((e) => e.plantilla))].filter(
      (p) => !(p in CUE_OF_TEMPLATE),
    )
    expect(missing).toEqual([])
  })
})

/** Las congeladas por carrera: una base tiene un mundo, y los uuid se repiten entre carreras. */
const BY_RACE = [...new Set(FIXTURES.map((name) => fixtureStage(name).raceId))].map(
  (raceId) => [raceId, FIXTURES.filter((name) => fixtureStage(name).raceId === raceId)] as const,
)

/** Sin sesión: la retransmisión abierta a todos y sin velo, como la sirve `BROADCAST_WATCH=on`. */
const noAuth = {
  api: { getSession: async () => null },
  handler: async () => new Response('{}', { status: 200 }),
} as unknown as NonNullable<AppDeps['auth']>

/**
 * B8 DEL PARSE (§16.4; 16-m, 18-l), los umbrales de §16.4, su única fuente escrita (16-v): la mediana de
 * `JSON.parse` más el `safeParse` del esquema de `shared` (el mismo que usa la web) de la cabecera ≤ 3
 * ms y del tramo mayor ≤ 2 ms, en Node, sobre lo que sirve la ruta de verdad. `clientCost.test.ts` (la
 * web) mide el fotograma; las respuestas de la API las tiene este fichero.
 */
const B8_PARSE_MEDIAN_MS = { head: 3, chunk: 2 } as const
/** Las vueltas de cada medida de B8: la mediana. */
const B8_PARSE_REPS = 21

/** La mediana de lo que tarda `JSON.parse` más `safeParse` de una respuesta, en ms. */
function parseMedianMs(body: string, schema: { safeParse: (x: unknown) => { success: boolean } }) {
  const ms: number[] = []
  for (let i = 0; i < B8_PARSE_REPS; i++) {
    const t0 = performance.now()
    const ok = schema.safeParse(JSON.parse(body)).success
    ms.push(performance.now() - t0)
    expect(ok).toBe(true)
  }
  return ms.sort((a, b) => a - b)[Math.floor(B8_PARSE_REPS / 2)]!
}

/** Las cabeceras que sirve la ruta a las seis, de B6, para B3 (sembrar PGlite cuesta: una vez por carrera). */
const servedHeads = new Map<FixtureName, BroadcastHead>()

describe('B6 de lo servido: la cabecera y el tramo mayor de las seis, con gzip 6 (16-h, 16-n), y B8 de su parse', () => {
  const poolBefore = process.env.DB_POOL_MAX
  const served: {
    name: string
    head: number
    chunk: number
    chunks: number
    headMs: number
    chunkMs: number
  }[] = []
  beforeAll(() => {
    // PGlite admite UNA sesión (testDb.ts), y la ruta lanza consultas a la vez.
    process.env.DB_POOL_MAX = '1'
  })
  afterAll(() => {
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  const gz = (body: string): number => gzipSync(Buffer.from(body), { level: 6 }).length

  it.each(BY_RACE)(
    '%s: cada congelada, sembrada y servida por las rutas',
    async (raceId, names) => {
      let t: TestDb | null = null
      let app: ReturnType<typeof buildApp> | null = null
      try {
        t = await startTestDb()
        for (const name of names) await seedFixtureWorld(t, name)
        app = buildApp({
          db: t.db,
          auth: noAuth,
          serveWeb: false,
          migrationsApplied: true,
          tickIntervalMinutes: 360,
          switches: { broadcastWatch: 'on', spoilerMode: 'off' },
        })
        for (const name of names) {
          const { day } = fixtureStage(name)
          const url = `/api/races/${raceId}/stages/${day}/broadcast`
          const res = await app.inject({ method: 'GET', url })
          expect(res.statusCode, res.body.slice(0, 300)).toBe(200)
          const head = broadcastHeadSchema.parse(res.json())
          expect(head.clock).toBe('exact')
          servedHeads.set(name, head)
          let chunk = 0
          let chunks = 0
          let largest = ''
          for (let from = 0; ; from += BROADCAST.chunkRaceS * 10) {
            const c = await app.inject({
              method: 'GET',
              url: `${url}/chunk?fromDs=${from}&toDs=${from + BROADCAST.chunkRaceS * 10}`,
            })
            expect(c.statusCode, c.body.slice(0, 300)).toBe(200)
            if (gz(c.body) > chunk) largest = c.body
            chunk = Math.max(chunk, gz(c.body))
            chunks += 1
            if (broadcastChunkSchema.parse(c.json()).atFinish) break
            expect(chunks).toBeLessThan(100)
          }
          const headMs = parseMedianMs(res.body, broadcastHeadSchema)
          const chunkMs = parseMedianMs(largest, broadcastChunkSchema)
          served.push({ name, head: gz(res.body), chunk, chunks, headMs, chunkMs })
          expect(headMs, `${name}: B8 de la cabecera`).toBeLessThanOrEqual(B8_PARSE_MEDIAN_MS.head)
          expect(chunkMs, `${name}: B8 del tramo mayor`).toBeLessThanOrEqual(
            B8_PARSE_MEDIAN_MS.chunk,
          )
          expect(gz(res.body), `${name}: la cabecera`).toBeLessThanOrEqual(
            BROADCAST.maxHeadGzipBytes,
          )
          expect(chunk, `${name}: el tramo mayor`).toBeLessThanOrEqual(BROADCAST.maxChunkGzipBytes)
        }
      } finally {
        await app?.close()
        await t?.close()
      }
    },
    120_000,
  )

  it('las seis, servidas', () => {
    const kb = (b: number): string => (b / 1024).toFixed(2)
    console.info(
      `[broadcast] B6 de lo servido (gzip 6; topes ${kb(BROADCAST.maxHeadGzipBytes)} y ` +
        `${kb(BROADCAST.maxChunkGzipBytes)} KB):\n` +
        served
          .map(
            (s) =>
              `  ${s.name}: la cabecera ${kb(s.head)} KB, el tramo mayor ${kb(s.chunk)} KB de ` +
              `${s.chunks}; B8, el parse de la cabecera ${s.headMs.toFixed(2)} ms y del tramo mayor ` +
              `${s.chunkMs.toFixed(2)} ms (topes ${B8_PARSE_MEDIAN_MS.head} y ${B8_PARSE_MEDIAN_MS.chunk})`,
          )
          .join('\n'),
    )
    expect(served.map((s) => s.name).sort()).toEqual([...FIXTURES].sort())
  })
})

/** El maillot resuelto de una carta (B3): de líder con su tabla, de campeón con su título, o el de su equipo. */
function resolved(card: RiderCard | undefined, tl: StageTimeline, r: number): boolean {
  if (card === undefined || card.ix !== r) return false
  const w = card.worn
  if (w.kind === 'leader') return (JERSEY_PRIORITY as readonly string[]).includes(w.jersey)
  if (w.kind === 'champion') return w.title.scope.length > 0 && w.title.discipline.length > 0
  // la equipación del día: con equipo, el suyo; sin equipo, `team: null`, que lo dice
  return (card.team !== null) === (tl.cast.riders[r]?.team !== null)
}

describe('B3, primera parte: el rótulo y los maillots de la fuga sobre la cabecera de la ruta (§16.4; [DUEÑO 3])', () => {
  it.each(FIXTURES)(
    '%s: cada 30 s, cada grupo de hasta 12 nombrado entero y con su maillot',
    (name) => {
      const head = servedHeads.get(name)
      expect(head, 'B6 sirve antes las seis cabeceras').toBeDefined()
      const tl = loadTimeline(name)
      const cast = head!.cast
      expect(cast.map((c) => c.ix)).toEqual(tl.riderIds.map((_, r) => r))
      if (tl.timeTrial) {
        // la crono no tiene grupos: cada corredor, en ruta o en el tablero, con su carta resuelta
        tl.riderIds.forEach((_, r) => expect(resolved(cast[r], tl, r), `${r}`).toBe(true))
        return
      }
      const ctx: InstantContext = {
        own: new Set(),
        start: head!.startState,
        photoBlocks: photoBlocksOf(tl.lengthKm, tl.dx),
      }
      let groups = 0
      let whole = 0
      for (let t = 0; t < tl.finish.finishS; t += 30) {
        const i = instantAt(tl, t, ctx)
        const revealed = tl.events.filter((e) => e.revealS <= t)
        for (const g of i.groups) {
          if (g.size === 0) continue
          groups++
          const { named, others } = namedRidersOf(g, cast, revealed, ctx)
          expect(named.length + others, `${name} t ${t} g ${g.g}`).toBe(g.size)
          if (g.size <= BROADCAST.nameWholeGroupUpTo) {
            whole++
            expect(others).toBe(0)
            expect([...named].sort((a, b) => a - b)).toEqual([...g.members].sort((a, b) => a - b))
          }
          for (const r of named)
            expect(resolved(cast[r], tl, r), `${name} t ${t} r ${r}`).toBe(true)
        }
      }
      expect(whole).toBeGreaterThan(0)
      expect(groups).toBeGreaterThan(whole)
    },
  )

  /**
   * LA CLÁUSULA DE NO VACÍO: la primera fuga de 3 a 12 de cada etapa en línea, con una cabecera
   * sintética que da a su primer escapado por dorsal el título de Italia vigente y al segundo el maillot
   * de la montaña; su `break_presented`, el que sale de su `break_formed`, los nombra a los dos, por su
   * título. En las congeladas la tienen la e7, la e18 y Flandes (la e20 sale con uno solo y Colombia,
   * sin fuga).
   */
  it('la cabecera sintética: el campeón de Italia y el líder de la montaña, nombrados por su título', () => {
    const checked: string[] = []
    for (const name of ROAD_FIXTURES) {
      const head = servedHeads.get(name)!
      const tl = loadTimeline(name)
      const e = tl.events.find(
        (x) =>
          x.plantilla === 'breakaway_formed' &&
          x.riders.length >= 3 &&
          x.riders.length <= BROADCAST.nameWholeGroupUpTo,
      )
      if (e === undefined) continue
      const ctx: InstantContext = {
        own: new Set(),
        start: head.startState,
        photoBlocks: photoBlocksOf(tl.lengthKm, tl.dx),
      }
      const formed = cuesBetween(
        instantAt(tl, e.revealS - 0.1, ctx),
        instantAt(tl, e.revealS, ctx),
        tl.events,
      ).find((c) => c.kind === 'break_formed')
      if (formed === undefined || formed.kind !== 'break_formed')
        throw new Error(`${name}: sin break_formed`)
      const stage = fixtureStage(name)
      const from = { raceKey: stage.raceKey, stageDay: Math.max(1, stage.day - 1) }
      const title: ChampionTitle = {
        scope: 'national',
        country: 'IT',
        discipline: 'road',
        category: 'elite',
        season: 0,
        validFromDay: 0,
        validToDay: 365,
        source: from,
        provisional: true,
      }
      const [first, second] = [...formed.riders].sort(
        (a, b) => (head.cast[a]!.bib ?? a) - (head.cast[b]!.bib ?? b) || a - b,
      )
      const opts = {
        gcThreatTop: BROADCAST.gcThreatTop,
        knownNameMinWins: BROADCAST.knownNameMinWins,
      }
      const cast = head.cast.map((c): RiderCard => {
        if (c.ix === first) {
          const worn = { kind: 'champion', title } as const
          return { ...c, worn, notoriety: staticNotoriety(worn, c.lines, 0, 'elite', opts) }
        }
        if (c.ix === second) {
          const worn = { kind: 'leader', jersey: 'kom', delegated: false, from } as const
          return { ...c, worn, notoriety: staticNotoriety(worn, c.lines, 0, 'elite', opts) }
        }
        return c
      })
      const presented = breakPresentedOf(formed, cast, new Set())
      expect(presented.named, name).toEqual([second, first])
      expect(presented.named.length + presented.others).toBe(formed.riders.length)
      const others = formed.riders.length - 2
      expect(
        breakHeadline(
          'en',
          presented.riders.map((r) => cast[r]!),
          new Set(),
        ),
      ).toMatch(
        new RegExp(
          `^The mountains leader and the champion of Italy go clear with ${others === 1 ? 'one other' : `\\w+ others`}`,
        ),
      )
      checked.push(name)
    }
    expect(checked).toEqual(['race-france-e7', 'race-france-e18', 'race-flanders-e1'])
  })
})

// ------------------------------------------------------------------------ B13, la procedencia (7b)

/** Las vueltas de B13 y su cláusula de no vacío (§16.4, 17-u). */
const B13_VEILS = 500
const B13_MIN_VEILED_FIELDS = 100

const refKey = (r: StageRef): string => `${r.raceKey}#${r.stageDay}`

/**
 * Las procedencias de un valor ya servido: todo objeto con `raceKey` y `stageDay` es un `StageRef`
 * (§7.8). Se busca en el JSON parseado, es decir, en lo que viaja.
 */
function refsIn(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const v of value) refsIn(v, out)
  else if (value !== null && typeof value === 'object') {
    const o = value as Record<string, unknown>
    if (typeof o.raceKey === 'string' && typeof o.stageDay === 'number')
      out.add(`${o.raceKey}#${o.stageDay}`)
    for (const v of Object.values(o)) refsIn(v, out)
  }
  return out
}

/** Las procedencias de un corredor del reparto congelado, una por dato (§7.8). */
function refsOfRider(c: CastRider): StageRef[] {
  const refs: StageRef[] = []
  if (c.start.from !== null) refs.push(c.start.from)
  if (c.worn.kind === 'leader') refs.push(c.worn.from)
  if (c.worn.kind === 'champion') refs.push(c.worn.title.source)
  for (const d of c.distinctions)
    if (d.kind === 'champion') refs.push(d.title.source)
    else if (d.kind === 'stage_wins') refs.push(...d.stages)
    else refs.push(d.from)
  return refs
}

/**
 * B13 · LA PROCEDENCIA (docs/retransmision.md §16.4, §10.10 y §7.8; I-11, D-15; paso 7b, decisiones
 * 17-t y 17-u). Con el reparto congelado de las seis, el mismo que `seedFixtureWorld` siembra y la ruta
 * sirve (el primer caso lo ata a las cabeceras de B6), y 500 velos al azar con semilla fija sobre las
 * etapas de las que sale algo de esos repartos (más ruido de otras carreras): ningún dato con
 * procedencia velada viaja, ni en el reparto degradado (`veilCast`), ni en las cartas servidas
 * (`serveCast`), ni en la salida (`startStateOf`: un maillot velado no lo lleva nadie y una general de
 * salida velada no da filas). Cada resultado se serializa y se busca. Con la cláusula de no vacío: en
 * los 500 velos, al menos 100 campos con procedencia velada existían en el reparto sin velar (las seis
 * llevan la general de salida, y tres de ellas un campeón plantado por el script, §16.2).
 */
describe('B13 · la procedencia: nada del reparto con procedencia velada viaja (§16.4; 17-t)', () => {
  const casts = FIXTURES.map((name) => [name, loadTimeline(name).cast] as const)
  const names = { rider: (id: string) => `rider ${id}`, team: (id: string) => `team ${id}` }
  const ctx = { own: new Set<number>(), dayCategory: 'elite' as const }

  it('con el velo vacío, la cabecera que sirve la ruta es la de serveCast y startStateOf sobre el reparto congelado', () => {
    for (const [name, cast] of casts) {
      const head = servedHeads.get(name)
      expect(head, 'B6 sirve antes las seis cabeceras').toBeDefined()
      const riders = new Map(head!.cast.map((c) => [c.id, c.name] as const))
      const teams = new Map(
        head!.cast.flatMap((c) => (c.team === null ? [] : [[c.team.id, c.team.name] as const])),
      )
      const served = serveCast(
        cast,
        worldHorizon,
        { rider: (id) => riders.get(id) ?? id, team: (id) => teams.get(id) ?? id },
        ctx,
      )
      expect(served, name).toEqual(head!.cast)
      expect(startStateOf(veilCast(cast, worldHorizon), cast.riders.length), name).toEqual(
        head!.startState,
      )
    }
  })

  it('500 velos al azar: ninguna procedencia velada en el reparto, las cartas ni la salida', () => {
    const rnd = seededRng('b13-la-procedencia')
    const universe = [
      ...new Set(casts.flatMap(([, cast]) => cast.riders.flatMap(refsOfRider).map(refKey))),
    ].sort()
    const noise = ['race-italy:s0#3', 'race-france:s0#21', 'race-colombia:s0#5', 'nc-es-road:s0#1']
    const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)]!
    const leaks: string[] = []
    let veiledFields = 0
    for (let i = 0; i < B13_VEILS; i++) {
      const keys = new Set<string>()
      const size = 1 + Math.floor(rnd() * 6)
      while (keys.size < size) keys.add(pick(universe))
      if (rnd() < 0.5) keys.add(pick(noise))
      const veil: VeiledStage[] = [...keys].map((k) => {
        const [raceKey, day] = k.split('#') as [string, string]
        return { raceKey, stageDay: Number(day), gameDay: 0, reason: 'follow' }
      })
      const h: Horizon = {
        ...worldHorizon,
        kind: 'viewer',
        userId: 'b13',
        readOnly: false,
        rev: `0.${i}`,
        veil,
      }
      for (const [name, cast] of casts) {
        veiledFields += cast.riders.reduce(
          (n, c) => n + refsOfRider(c).filter((r) => keys.has(refKey(r))).length,
          0,
        )
        const where = `${name}, velo ${i} (${[...keys].join(' ')})`
        const out: TimelineCast = veilCast(cast, h)
        const cards: RiderCard[] = serveCast(cast, h, names, ctx)
        for (const [what, value] of [
          ['el reparto', out],
          ['las cartas', cards],
        ] as const)
          for (const r of refsIn(JSON.parse(JSON.stringify(value)) as unknown))
            if (keys.has(r)) leaks.push(`${where}: ${what} lleva ${r}`)
        const start = startStateOf(out, cast.riders.length)
        for (const jersey of JERSEY_PRIORITY) {
          const holder = start.leaders[jersey]
          const worn = holder === null ? null : cast.riders[holder]?.worn
          if (worn?.kind === 'leader' && keys.has(refKey(worn.from)))
            leaks.push(`${where}: la salida viste a ${holder} de ${jersey}`)
        }
        for (const row of start.gcTop) {
          const from = cast.riders[row.rider]?.start.from ?? null
          if (from === null || keys.has(refKey(from)))
            leaks.push(`${where}: la general de salida lleva a ${row.rider}`)
        }
      }
    }
    console.info(
      `[broadcast] B13: ${B13_VEILS} velos sobre las seis, ${veiledFields} datos con procedencia ` +
        `velada en el reparto sin velar (mínimo ${B13_MIN_VEILED_FIELDS}), ${leaks.length} viajan`,
    )
    expect(leaks.slice(0, 5)).toEqual([])
    expect(veiledFields).toBeGreaterThanOrEqual(B13_MIN_VEILED_FIELDS)
  })
})

// ------------------------------------------------------------- B16, la radio desde la línea (11a)

/**
 * LA RADIO GUARDADA DE HOY con la lista de seguimiento `lista` y sin prioridades, como la pide B16
 * (§16.4): `buildRaceRadio(radioForStorage(radio, lista, []), names)`. En una crono, la que guarda hoy la
 * envoltura: la del colector sin una sola foto (la crono ignora la sonda).
 */
function storedRadioOf(
  radio: CollectorRadio | null,
  lista: ReadonlySet<string>,
  names: ChronicleNames,
): RaceRadio {
  const built = buildRaceRadio(radioForStorage(radio ?? raceRadioFrom([]), lista, []), names)
  if (built === null) throw new Error('B16: la radio guardada no pasa su esquema')
  return built
}

/** Los nombres del lado de la línea: el mismo `riderOf` que la guardada, `own` y la lista como `nameableAt`. */
function lineNamesOf(
  tl: StageTimeline,
  names: ChronicleNames,
  lista: ReadonlySet<string>,
  own: ReadonlySet<number> = new Set(),
): RadioNames {
  const listed = new Set(tl.riderIds.flatMap((id, r) => (lista.has(id) ? [r] : [])))
  return { riderOf: names.riderOf, own, nameableAt: () => listed }
}

/** Lo que B16 cuenta de lo que no es igualdad estricta, con su causa (`b16Misses`). */
interface B16Tally {
  photos: number
  groups: number
  /** huecos que la línea redondea un segundo arriba: su reloj va en décimas (§4.1), el de la guardada en coma flotante */
  gapRounding: number
  gapToPrevRounding: number
  /** fotos en que el título de la línea (D-03, el de la barra de Watch) no es el pelotón que guardó el motor */
  titlePhotos: number
  /** tramos de grupos con el mismo reloj en décimas, cuyo orden la línea no guarda (5-i) */
  tieRuns: number
}
const newTally = (): B16Tally => ({
  photos: 0,
  groups: 0,
  gapRounding: 0,
  gapToPrevRounding: 0,
  titlePhotos: 0,
  tieRuns: 0,
})

/** Lo que es un grupo sin su sitio en la fila: lo que se compara como multiconjunto en un tramo de igual reloj. */
const groupSig = (g: RadioGroup): string =>
  JSON.stringify([
    g.size,
    g.speedKmh,
    g.mishap === null ? null : [g.mishap.tipo, toDs(g.mishap.lostS)],
    g.pullingTotal,
    g.riders.filter((r) => r.role === 'pulling'),
    g.riders
      .filter((r) => r.role === 'sheltered')
      .map((r) => r.id)
      .sort(),
    g.unnamed,
  ])

/**
 * B16 CON LA LISTA VACÍA, la radio de una etapa no conocida (§12.10, §16.4): foto a foto, la de la línea
 * contra la guardada, igual en el km, `starters`, `racing`, `gone`, el número de grupos y, en cada grupo,
 * su tamaño, su velocidad, su percance (a la décima de segundo de la línea), `pullingTotal`, los que
 * tiran con su motivo, su destinatario y en su orden, los nombrados a rueda como conjunto y `unnamed`.
 * Tres tolerancias, cada una con su causa y contada: el hueco, un segundo como mucho (la línea guarda los
 * relojes en décimas, §4.1, y la guardada redondeaba al segundo su resta en coma flotante: un hueco de
 * x,5 s en décimas era x o x + 1); el `kind`, solo en las fotos en que el título de la línea (la regla
 * del título por bloque, D-03, la de la barra de `Watch`) no es el pelotón que tenía el motor en esa foto;
 * y el orden dentro de un tramo de grupos con el mismo reloj en décimas, que la línea no guarda (5-i).
 */
function b16Misses(
  where: string,
  tl: StageTimeline,
  full: CollectorRadio | null,
  line: RaceRadio,
  stored: RaceRadio,
  tally: B16Tally,
): string[] {
  const out: string[] = []
  const miss = (what: string): void => {
    if (out.length < 10) out.push(`${where} ${what}`)
  }
  if (line.starters !== stored.starters) miss(`starters ${line.starters} ≠ ${stored.starters}`)
  if (line.kms.length !== stored.kms.length) {
    miss(`${line.kms.length} fotos ≠ ${stored.kms.length}`)
    return out
  }
  const blocks = photoBlocksOf(tl.lengthKm, tl.dx)
  line.kms.forEach((a, i) => {
    const s = stored.kms[i]!
    const at = `km ${s.km.toFixed(1)}`
    tally.photos += 1
    if (a.km !== s.km) miss(`${at}: el km de la línea es ${a.km}`)
    if (a.racing !== s.racing || a.gone !== s.gone)
      miss(`${at}: racing ${a.racing}/${s.racing}, gone ${a.gone}/${s.gone}`)
    if (a.groups.length !== s.groups.length) {
      miss(`${at}: ${a.groups.length} grupos ≠ ${s.groups.length}`)
      return
    }
    const p = photoAt(tl, blocks[i]!)
    const title = p.main === null ? null : (tl.groups[p.main]?.id ?? null)
    const sameTitle = full === null || full.kms[i]?.mainId === title
    if (!sameTitle) tally.titlePhotos += 1
    // las marcas del bloque en orden de carretera: la fila de la línea va por ellas (y, a igual reloj, por id)
    const clocks = [...p.clock.values()].sort((x, y) => x - y)
    for (let start = 0; start < a.groups.length;) {
      let end = start + 1
      while (end < a.groups.length && clocks[end] === clocks[start]) end++
      if (end - start > 1) tally.tieRuns += 1
      const mine = a.groups.slice(start, end)
      const theirs = s.groups.slice(start, end)
      const sigs = (gs: readonly RadioGroup[]): string => JSON.stringify(gs.map(groupSig).sort())
      if (sigs(mine) !== sigs(theirs))
        miss(`${at}, grupo ${start}: ${sigs(mine)} ≠ ${sigs(theirs)}`)
      const kinds = (gs: readonly RadioGroup[]): string =>
        gs
          .map((g) => g.kind)
          .sort()
          .join(',')
      if (sameTitle && kinds(mine) !== kinds(theirs))
        miss(`${at}, grupo ${start}: kind ${kinds(mine)} ≠ ${kinds(theirs)}`)
      for (let j = start; j < end; j++) {
        tally.groups += 1
        const dGap = a.groups[j]!.gapS - s.groups[j]!.gapS
        const dPrev = a.groups[j]!.gapToPrevS - s.groups[j]!.gapToPrevS
        if (dGap !== 0) tally.gapRounding += 1
        if (dPrev !== 0) tally.gapToPrevRounding += 1
        if (Math.abs(dGap) > 1 || Math.abs(dPrev) > 1)
          miss(
            `${at}, grupo ${j}: huecos ${a.groups[j]!.gapS}/${a.groups[j]!.gapToPrevS} ≠ ` +
              `${s.groups[j]!.gapS}/${s.groups[j]!.gapToPrevS}`,
          )
      }
      start = end
    }
  })
  return out
}

/**
 * B16 CON LOS DIEZ PRIMEROS DE LA ETAPA en la lista y en `nameableAt`, la etapa conocida (Rdueno-008):
 * cada uno va en `riders` de su grupo en toda foto en que corre, en las dos radios, y `unnamed` es igual.
 * No la igualdad entera: la guardada conserva como relevista a uno de la lista que tira por detrás de los
 * doce de `STORED_PULLERS_MAX` (`raceRadio.ts`), y la línea solo guarda esos doce (§5.4), así que en la
 * suya va a rueda; se cuentan.
 */
function b16KnownMisses(
  where: string,
  tl: StageTimeline,
  line: RaceRadio,
  stored: RaceRadio,
  ten: ReadonlySet<string>,
): { readonly misses: string[]; readonly checks: number; readonly asPuller: number } {
  const misses: string[] = []
  let checks = 0
  let asPuller = 0
  const blocks = photoBlocksOf(tl.lengthKm, tl.dx)
  line.kms.forEach((a, i) => {
    const s = stored.kms[i]!
    const at = `${where} km ${s.km.toFixed(1)}`
    const p = photoAt(tl, blocks[i]!)
    // la fila de la línea: los grupos vivos por su marca y, a igual reloj, por id
    const order = [...p.clock.entries()]
      .filter(([g]) => p.groupOf.includes(g))
      .sort((x, y) => x[1] - y[1] || (tl.groups[x[0]]!.id < tl.groups[y[0]]!.id ? -1 : 1))
      .map(([g]) => g)
    tl.riderIds.forEach((id, r) => {
      if (!ten.has(id) || p.groupOf[r]! < 0) return
      checks += 1
      const mine = a.groups[order.indexOf(p.groupOf[r]!)]
      const theirs = s.groups.find((g) => g.riders.some((x) => x.id === id))
      if (mine === undefined || !mine.riders.some((x) => x.id === id))
        misses.push(`${at}: ${id} no va nombrado en la línea`)
      if (theirs === undefined || theirs.size !== mine?.size)
        misses.push(`${at}: ${id} no va nombrado en su grupo en la guardada`)
      const roleIn = (g: RadioGroup | undefined) => g?.riders.find((x) => x.id === id)?.role
      if (roleIn(theirs) === 'pulling' && roleIn(mine) === 'sheltered') asPuller += 1
    })
    const unnamed = (k: RaceRadio['kms'][number]): string =>
      JSON.stringify(k.groups.map((g) => [g.size, g.unnamed]).sort())
    if (unnamed(a) !== unnamed(s)) misses.push(`${at}: unnamed ${unnamed(a)} ≠ ${unnamed(s)}`)
  })
  return { misses: misses.slice(0, 10), checks, asPuller }
}

/**
 * Los diez primeros de una congelada: por llegada (`finish.arrivals`), y a igual tiempo por `RiderIx`,
 * porque ni la línea ni el manifiesto guardan el puesto. Para B16 basta con que los dos lados reciban la
 * misma lista (la nocturna usa el puesto de verdad).
 */
const firstTenOf = (tl: StageTimeline): Set<string> =>
  new Set(
    tl.finish.arrivals
      .flatMap(([, riders]) => riders)
      .slice(0, 10)
      .map((r) => tl.riderIds[r]!),
  )

/**
 * B16 · LA RADIO DESDE LA LÍNEA (docs/retransmision.md §16.4 y §12.10; O-16, D-16; paso 11a, decisiones
 * 17-l y 17-v), la rápida: las cinco congeladas en línea y la crono, con la radio COMPLETA del colector de
 * cada una (`<etapa>.radio.json.gz`) del lado de la guardada y su línea grabada del otro, con el mismo
 * `riderOf` (el que arma `load.ts` desde `manifest.json`) y sin nadie propio. La nocturna, abajo.
 */
describe('B16 · la radio desde la línea es la guardada de hoy (§16.4; 11a)', () => {
  const tally = newTally()
  let known = 0
  let knownAsPuller = 0

  it.each(ROAD_FIXTURES)(
    '%s: con la lista vacía, foto a foto, la de hoy; con los diez primeros, cada uno nombrado',
    (name) => {
      const tl = loadTimeline(name)
      const full = loadRadio(name)
      const names = fixtureNames(name)
      const none = new Set<string>()
      const line = radioFromTimeline(tl, lineNamesOf(tl, names, none))
      expect(line.kms.length).toBeGreaterThan(100)
      expect(b16Misses(name, tl, full, line, storedRadioOf(full, none, names), tally)).toEqual([])
      const ten = firstTenOf(tl)
      expect(ten.size).toBe(10)
      const k = b16KnownMisses(
        name,
        tl,
        radioFromTimeline(tl, lineNamesOf(tl, names, ten)),
        storedRadioOf(full, ten, names),
        ten,
      )
      expect(k.misses).toEqual([])
      known += k.checks
      knownAsPuller += k.asPuller
    },
  )

  it('race-france-e16, la crono: las dos radios vacías', () => {
    const tl = loadTimeline('race-france-e16')
    const names = fixtureNames('race-france-e16')
    const line = radioFromTimeline(tl, lineNamesOf(tl, names, new Set()))
    expect(line.kms).toHaveLength(0)
    expect(line).toEqual(storedRadioOf(null, new Set(), names))
  })

  it('el kind, el orden y el tamaño son los de radioKmFrom sobre la misma foto de la línea: la copia de kindOf, atada', () => {
    for (const name of ROAD_FIXTURES) {
      const tl = loadTimeline(name)
      const line = radioFromTimeline(tl, lineNamesOf(tl, fixtureNames(name), new Set()))
      photoBlocksOf(tl.lengthKm, tl.dx).forEach((b, i) => {
        const proj = lineProjection(tl, b)
        expect(
          line.kms[i]!.groups.map((g) => [g.kind, g.size, g.gapS]),
          `${name} b${b}`,
        ).toEqual(
          proj.groups.map((g) => [g.kind, g.size, Math.round(Math.round(g.gapS * 10) / 10)]),
        )
      })
    }
  })

  it('R23.7: con un corredor propio, va en riders de su grupo en todas las fotos en que corre', () => {
    for (const name of ROAD_FIXTURES) {
      const tl = loadTimeline(name)
      // uno del montón: el de en medio por llegada, que casi nunca tira ni va en la lista
      const order = tl.finish.arrivals.flatMap(([, riders]) => riders)
      const own = order[Math.floor(order.length / 2)]!
      const id = tl.riderIds[own]!
      const radio = radioFromTimeline(
        tl,
        lineNamesOf(tl, fixtureNames(name), new Set(), new Set([own])),
      )
      let photos = 0
      let inBigGroup = 0
      photoBlocksOf(tl.lengthKm, tl.dx).forEach((b, i) => {
        const p = photoAt(tl, b)
        if (p.groupOf[own]! < 0) return
        photos += 1
        const g = radio.kms[i]!.groups.find((x) => x.riders.some((r) => r.id === id))
        expect(g, `${name} b${b}: el propio no va nombrado`).toBeDefined()
        expect(g!.size).toBe([...p.groupOf].filter((x) => x === p.groupOf[own]).length)
        if (g!.size > BROADCAST.nameWholeGroupUpTo) inBigGroup += 1
      })
      expect(photos, name).toBeGreaterThan(100)
      // en un grupo de los que no se nombran enteros: si no, la prueba no probaría nada
      expect(inBigGroup, name).toBeGreaterThan(10)
    }
  })

  it('no vacío: cada etapa en línea tiene fotos con relevistas nombrados con su motivo; y lo tolerado, contado', () => {
    for (const name of ROAD_FIXTURES) {
      const tl = loadTimeline(name)
      const radio = radioFromTimeline(tl, lineNamesOf(tl, fixtureNames(name), new Set()))
      const withPullers = radio.kms.filter((k) =>
        k.groups.some((g) => g.riders.some((r) => r.role === 'pulling' && r.motivo !== null)),
      ).length
      expect(withPullers, name).toBeGreaterThan(0)
    }
    console.info(
      `[broadcast] B16 sobre las cinco en línea: ${tally.photos} fotos y ${tally.groups} grupos; ` +
        `huecos un segundo arriba en ${tally.gapRounding} grupos ` +
        `(${((100 * tally.gapRounding) / tally.groups).toFixed(1)} %) y ${tally.gapToPrevRounding} ` +
        `huecos al de delante; ${tally.titlePhotos} fotos con otro título (D-03); ${tally.tieRuns} ` +
        `tramos de igual reloj. Con los diez primeros: ${known} corredor-foto nombrados en las dos, ` +
        `${knownAsPuller} relevistas en la guardada y a rueda en la línea`,
    )
    expect(tally.groups).toBeGreaterThan(1000)
    expect(known).toBeGreaterThan(1000)
  })
})

/** Las 24 etapas del mapa 07 §7: las 22 en línea, por dos semillas, y las dos cronos, por una (17-l). */
const B16_LONG = [
  ...Array.from({ length: 21 }, (_, i) => ['race-france', i + 1] as const),
  ['race-flanders', 1] as const,
  ['race-tramuntana', 1] as const,
  ['race-colombia', 5] as const,
].flatMap(([raceId, day]) =>
  SEASON_CALENDAR.find((r) => r.id === raceId)!.stages[day - 1]!.timeTrial === true
    ? [[raceId, day, 0] as const]
    : [0, 1].map((s) => [raceId, day, s] as const),
)

/** Un reparto con la forma del de producción, sin títulos ni general: B16 no lo lee, el cierre de la línea lo pide. */
function benchCastOf(input: StageInput): TimelineCast {
  const teams: { teamId: string; jerseySeed: string }[] = []
  const teamIx = new Map<string, number>()
  return {
    riders: input.riders.map((x, rider): CastRider => {
      let team: number | null = null
      if (x.teamId != null) {
        team = teamIx.get(x.teamId) ?? teams.length
        if (team === teams.length) {
          teamIx.set(x.teamId, team)
          teams.push({ teamId: x.teamId, jerseySeed: `${x.teamId}:kit` })
        }
      }
      return {
        rider,
        riderId: x.riderId,
        bib: x.bib ?? rider + 1,
        team,
        country: 'ES',
        gender: 'M',
        start: { gcRank: null, gcDeficitS: null, from: null },
        worn: { kind: 'team' },
        distinctions: [],
        knownWins: 0,
      }
    }),
    teams,
    favourites: [],
  }
}

/**
 * UNA ETAPA DEL BANCO CORRIDA CON LA LÍNEA, enganchada como la engancha `startStageTimeline`
 * (`packages/db/src/timelines.ts`, el colector aparte de §5.3, que su índice no exporta): la foto de
 * cada bloque al grabador y las de los bloques de foto, además, a la radio de hoy. La línea vuelve por
 * su JSON, como la lee la API (`readStageTimeline`).
 */
function recordedStage(
  raceId: string,
  day: number,
  s: number,
): {
  readonly output: StageOutput
  readonly radio: CollectorRadio | null
  readonly tl: StageTimeline
} {
  const scenario = realRaceScenario(raceId, day).input
  const timeTrial =
    SEASON_CALENDAR.find((r) => r.id === raceId)!.stages[day - 1]!.timeTrial === true
  const input: StageInput = timeTrial ? { ...scenario, timeTrial: true } : scenario
  const seed = stageSeed({
    worldSeed: `b11-${s}`,
    raceId,
    stageDay: day,
    engineVersion: ENGINE_VERSION,
  })
  const lengthKm = stageLengthKm(input.profile)
  const blocks = Math.round(lengthKm / STAGE.dx)
  const radioBlocks = new Set(photoBlocksOf(lengthKm, STAGE.dx))
  const recorder = timelineRecorder({
    blocks,
    dx: STAGE.dx,
    lengthKm,
    timeTrial,
    radioBlocks,
    riderIds: input.riders.map((r) => r.riderId),
  })
  const collector = raceRadioCollector(radioKmPoints(lengthKm))
  const blockOf = (km: number): number =>
    Math.max(0, Math.min(blocks - 1, Math.round(km / STAGE.dx - 0.5)))
  const output = simulateStage(input, seed, {
    atKm: Array.from({ length: blocks }, (_, b) => (b + 0.5) * STAGE.dx),
    onSnapshot: (km, riders, mainId) => {
      if (radioBlocks.has(blockOf(km))) collector.probe.onSnapshot(km, riders, mainId)
      recorder.onSnapshot(km, riders, mainId)
    },
    onEvent: recorder.onEvent,
    onBanner: recorder.onBanner,
    onTimeTrialRide: recorder.onTimeTrialRide,
  })
  const radio = timeTrial ? null : collector.radio({ incidents: output.incidents })
  const timeline = recorder.finish({
    input,
    output,
    radio,
    cast: benchCastOf(input),
    profile: profileStripOf(input.profile, { raceId, stageDay: day }),
    weather: freezeStageWeather(input, seed),
  })
  const tl = decodeTimeline(JSON.parse(JSON.stringify(encodeTimeline(timeline))))
  return { output, radio, tl }
}

/**
 * B16, LA NOCTURNA (§16.4; decisión 17-l): las 22 etapas en línea del banco por dos semillas y las dos
 * cronos, corridas aquí con la línea, con un `riderOf` sintético (`Rider <índice>` por cada `riderId` de
 * la entrada; Rcodigo-096) y los diez primeros de la etapa por su puesto. Solo con `CS_BANCOS=1`: vive en
 * `apps/api` porque `buildRaceRadio` es de aquí y el motor no puede importarla, y el paso 11 no toca
 * `packages/engine` (D-54). Las mismas comparaciones y tolerancias que la rápida.
 */
describe.runIf(process.env.CS_BANCOS === '1')(
  'B16 · la radio desde la línea en las 24 del banco (nocturno; 17-l)',
  () => {
    const tally = newTally()
    let known = 0
    let knownAsPuller = 0

    it.each(B16_LONG)(
      '%s e%i semilla %i: la radio de la línea es la guardada de hoy',
      (raceId, day, s) => {
        const { output, radio, tl } = recordedStage(raceId, day, s)
        const riderOf = new Map(
          tl.riderIds.map((id, i): [string, ChronicleRider] => [
            id,
            { id, name: `Rider ${i}`, bib: i + 1, team: null, country: null },
          ]),
        )
        const names: ChronicleNames = { riderOf }
        const where = `${raceId} e${day} s${s}`
        const none = new Set<string>()
        const line = radioFromTimeline(tl, lineNamesOf(tl, names, none))
        const stored = storedRadioOf(radio, none, names)
        if (tl.timeTrial) {
          expect(line.kms).toHaveLength(0)
          expect(line).toEqual(stored)
          return
        }
        expect(b16Misses(where, tl, radio, line, stored, tally)).toEqual([])
        const ten = new Set(
          [...output.results]
            .filter((r) => r.estado === 'finish')
            .sort((a, b) => a.puesto - b.puesto)
            .slice(0, 10)
            .map((r) => r.riderId),
        )
        const k = b16KnownMisses(
          where,
          tl,
          radioFromTimeline(tl, lineNamesOf(tl, names, ten)),
          storedRadioOf(radio, ten, names),
          ten,
        )
        expect(k.misses).toEqual([])
        known += k.checks
        knownAsPuller += k.asPuller
        expect(
          line.kms.some((km) => km.groups.some((g) => g.riders.some((r) => r.role === 'pulling'))),
          `${where}: sin relevistas nombrados`,
        ).toBe(true)
      },
      120_000,
    )

    it('lo tolerado, contado', () => {
      console.info(
        `[broadcast] B16 nocturno (${B16_LONG.length} corridas): ${tally.photos} fotos y ` +
          `${tally.groups} grupos; huecos un segundo arriba en ${tally.gapRounding} grupos ` +
          `(${((100 * tally.gapRounding) / Math.max(1, tally.groups)).toFixed(1)} %) y ` +
          `${tally.gapToPrevRounding} al de delante; ${tally.titlePhotos} fotos con otro título ` +
          `(D-03); ${tally.tieRuns} tramos de igual reloj. Con los diez primeros: ${known} ` +
          `corredor-foto nombrados en las dos, ${knownAsPuller} relevistas en la guardada y a rueda ` +
          `en la línea`,
      )
      expect(tally.photos).toBeGreaterThan(5000)
    })
  },
)
