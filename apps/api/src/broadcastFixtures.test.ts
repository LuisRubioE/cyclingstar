import { gunzipSync } from 'node:zlib'
import { type RadioKm, type SnapshotRider, TIMELINE, radioKmFrom } from '@cyclingstar/engine'
import {
  type StageTimeline,
  decodeTimeline,
  encodeTimeline,
  fromDs,
  photoAt,
  toDs,
} from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import {
  FIXTURES,
  type FixtureInvariants,
  type FixtureName,
  fixtureStage,
  loadInvariants,
  loadRecordedTimeline,
  loadTimelineBody,
} from './__fixtures__/broadcast/load.js'

/**
 * LAS SEIS ETAPAS CONGELADAS CON SU LÍNEA GRABADA (docs/retransmision.md §16.2, §16.4 y §17.8; E2,
 * paso 5; 17-u). Miden `packages/shared` y no el motor: la línea es la que se grabó con el motor v91 y
 * no cambia con él, así que un cambio en `broadcast/` que cambie lo que se lee de lo grabado lo cazan
 * aquí I1 e I3 en la suite rápida (D-52), aunque no toque `packages/engine` ni corra los bancos.
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
 * El 6a le añade I2, B2 y el B6 de lo servido; el 6b, B3; el 7b, B13; y el 11a, B16.
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
      const tl = loadRecordedTimeline(name)
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
      const tl = loadRecordedTimeline(name)
      const inv = loadInvariants(name)
      if (inv.kind !== 'road') throw new Error(`${name}: se esperaba I1`)
      expect(inv.blocks.length).toBeGreaterThan(10)
      const misses = inv.blocks.flatMap((block) => i1Mismatches(tl, block))
      expect(misses.slice(0, 5)).toEqual([])
    },
  )

  it('race-france-e16 · I5: la salida del plan, un reloj que no retrocede y 10 · tiempoS en meta', () => {
    const tl = loadRecordedTimeline('race-france-e16')
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
      const tl = loadRecordedTimeline(name)
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
