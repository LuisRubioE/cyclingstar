/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import {
  BROADCAST,
  type BannerResult,
  type Block,
  type BroadcastChunk,
  type BroadcastHead,
  type Ds,
  type GroupCatalogEntry,
  type GroupDetail,
  type GroupIx,
  type InstantContext,
  type LiveLine,
  type StateEvent,
  type TimelineCore,
  type TimelineEvent,
  chunkOf,
  cutTimeline,
  decodeTimeline,
  fromDs,
  instantAt,
  photoBlocksOf,
  timeTrialInstantAt,
  toDs,
  visibilityOf,
} from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { answerAhead, inVoice, unnamedBefore } from '../voice'
import { type ServedLine, servedLineOf, withChunk, withChunkSpread } from './servedLine'

/**
 * LA LÍNEA SERVIDA (docs/retransmision.md §4.6, §4.11 y §14.11; nota 1 del 3b): la web rehace la
 * `TimelineCore` con la cabecera y los tramos, y sobre ella pinta el instante. Juntar los tramos que
 * da `chunkOf` tiene que dar la línea que da `cutTimeline` en el borde del último (reordenando por
 * bloque lo que llega por hora), y el instante sobre lo servido, el de la línea entera (B9). Desde el
 * 3c el primer tramo lleva también lo que se ve en 0 Ds, y la web no deduce nada.
 *
 * La etapa es sintética: un grabador de juguete con las reglas de §5.4 (las marcas en los cuatro
 * sitios de §3.4, la muerte en b − 1 con su marca, el catálogo por la hora de su marca de
 * nacimiento) sobre una foto por bloque escrita a mano, más los sucesos, la capa de detalle, las
 * pancartas y un percance. Desde el 6a, también una congelada grabada de verdad (la e18, con sus
 * marcas que bajan y su muerte en el bloque de foto), leída de los `.timeline.gz` de `apps/api` como
 * en `clientCost.test.ts`, de ahí la referencia a los tipos de Node.
 */

const DX = 0.1
const LENGTH_KM = 40.04
const N = Math.round(LENGTH_KM / DX) // 400 bloques
const RIDERS = ['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9']
const PHOTO_BLOCKS = photoBlocksOf(LENGTH_KM, DX)

/** El grupo de cada corredor al final de cada bloque y el título: la carrera de juguete. */
function groupAt(b: Block, r: number): string | null {
  if (r === 9 && b >= 150) return null // abandona
  if ((r === 8 || r === 9) && b >= 120) return 'shed-1' // se descuelgan
  if (r === 4 && b >= 300) return 'mov-2' // ataca solo y llega
  if ((r === 0 || r === 1) && b >= 50 && b < 260) return 'mov-1' // la fuga, cazada en el 260
  if ((r === 2 || r === 3) && b >= 200 && b < 260) return 'mov-1' // el puente
  return 'peloton'
}
const mainAt = (b: Block): string => (b >= 380 ? 'mov-2' : 'peloton')
/** Segundos de carrera de cada grupo al cruzar el final del bloque: crecen con el bloque. */
function clockAt(id: string, b: Block): number {
  const pel = 9 * (b + 1) + Math.max(0, b - 100) * 0.05
  if (id === 'peloton') return pel
  if (id === 'mov-1') return pel - (b < 200 ? (b - 49) * 0.4 : 60 - (b - 200))
  if (id === 'shed-1') return pel + (b - 119) * 0.8
  return pel - (b - 299) * 0.3 // mov-2
}
const originOf = (id: string): GroupCatalogEntry['origin'] =>
  id === 'peloton' ? 'start' : id.startsWith('mov-') ? 'attack' : 'shed'

/** LA LÍNEA ENTERA de la etapa de juguete, como la grabaría §5.4. */
function fullLine(): TimelineCore {
  const photos = new Set(PHOTO_BLOCKS)
  const born = new Map<string, Block>([['peloton', 0]])
  const died = new Map<string, { b: Block; successor: string | null }>()
  const marks = new Map<Block, Map<string, Ds>>()
  const mark = (b: Block, id: string): void => {
    let at = marks.get(b)
    if (at === undefined) marks.set(b, (at = new Map()))
    at.set(id, toDs(clockAt(id, b)))
  }
  const changes: { b: Block; rider: number; to: string | null }[] = []
  const mains: { b: Block; id: string }[] = []
  for (let b = 0; b < N; b++) {
    const now = RIDERS.map((_, r) => groupAt(b, r))
    const prev = RIDERS.map((_, r) => (b === 0 ? 'peloton' : groupAt(b - 1, r)))
    const live = new Set(now.filter((g): g is string => g !== null))
    const before = new Set(prev.filter((g): g is string => g !== null))
    const changed = new Set<string>()
    now.forEach((g, r) => {
      if (g === prev[r]) return
      changes.push({ b, rider: r, to: g })
      if (prev[r] !== null) changed.add(prev[r]!)
      if (g !== null) changed.add(g)
    })
    for (const id of live) if (!born.has(id)) born.set(id, b)
    for (const id of before) {
      if (live.has(id)) continue
      const to = now[prev.findIndex((g) => g === id)] ?? null
      died.set(id, { b: b - 1, successor: to })
      mark(b - 1, id)
    }
    for (const id of live) if (photos.has(b) || born.get(id) === b || b === N - 1) mark(b, id)
    for (const id of changed) {
      if (live.has(id)) mark(b, id)
      if (b > 0 && before.has(id)) mark(b - 1, id)
    }
    if (b > 0 && mainAt(b) !== mainAt(b - 1)) mains.push({ b, id: mainAt(b) })
  }
  const ids = [...born.keys()]
  const bornDs = (id: string): number =>
    id === 'peloton' ? -1 : (marks.get(born.get(id)!)?.get(id) ?? Infinity)
  ids.sort((a, c) => bornDs(a) - bornDs(c) || born.get(a)! - born.get(c)!)
  const ix = new Map(ids.map((id, i) => [id, i] as const))
  const groups: GroupCatalogEntry[] = ids.map((id) => ({
    id,
    origin: originOf(id),
    bornB: born.get(id)!,
    diedB: died.get(id)?.b ?? null,
    successor: died.get(id)?.successor == null ? null : ix.get(died.get(id)!.successor!)!,
  }))
  const markOf = (id: string, b: Block): Ds => marks.get(b)!.get(id)!
  // EL PERCANCE: r5 se cae en el bloque 100, en el pelotón, y lo cuenta su suceso `crash`
  const stateEvents: StateEvent[] = []
  for (let b = 0; b < N; b++) {
    for (const c of changes)
      if (c.b === b && c.to === null) stateEvents.push({ t: 'out', b, rider: c.rider })
    const byTo = new Map<GroupIx, number[]>()
    for (const c of changes)
      if (c.b === b && c.to !== null) {
        const to = ix.get(c.to)!
        ;(byTo.get(to) ?? byTo.set(to, []).get(to)!).push(c.rider)
      }
    for (const [to, riders] of [...byTo].sort((x, y) => x[0] - y[0]))
      stateEvents.push({ t: 'move', b, to, riders: riders.sort((x, y) => x - y) })
    for (const m of mains) if (m.b === b) stateEvents.push({ t: 'main', b, group: ix.get(m.id)! })
    const at = marks.get(b)
    if (at !== undefined)
      stateEvents.push({
        t: 'clock',
        b,
        marks: [...at].map(([id, ds]) => [ix.get(id)!, ds] as const).sort((x, y) => x[0] - y[0]),
      })
    if (b === 100) stateEvents.push({ t: 'mishap', b, rider: 5, kind: 'caida', lostDs: 150 })
  }
  // LOS SUCESOS, con su hora (en Ds) y su km (a la décima), por revealS y por source
  const events: TimelineEvent[] = [
    ev(0, 'attack_go', 5.0, 50, markOf('mov-1', 50), [0, 1], { gapS: 3 }),
    ev(1, 'breakaway_formed', 8.0, 80, markOf('mov-1', 80), [0, 1], null),
    ev(2, 'crash', 10.0, 100, markOf('peloton', 100), [5], null),
    ev(3, 'abandon', 15.0, 150, markOf('shed-1', 150), [9], { motivo: 'colapso' }),
    ev(4, 'attack_reeled', 26.0, 260, markOf('peloton', 260), [0, 1, 2, 3], null),
    ev(5, 'stage_win', 40.0, N, markOf('mov-2', N - 1), [4], { margin: 9 }),
  ].sort((x, y) => x.revealS - y.revealS || x.source - y.source)
  // LA CAPA DE DETALLE: en cada km de foto, una fila por grupo vivo
  const detail = new Map<Block, readonly GroupDetail[]>()
  for (const b of PHOTO_BLOCKS) {
    const rows: GroupDetail[] = []
    for (const id of ids) {
      if (!marks.get(b)?.has(id)) continue
      const first = RIDERS.findIndex((_, r) => groupAt(b, r) === id)
      if (first < 0) continue
      rows.push({
        g: ix.get(id)!,
        speedKmh: id === 'shed-1' ? null : (425 - (b % 7)) / 10,
        pullingTotal: 2,
        pullers: [
          { rider: first, motive: id === 'peloton' ? 'persecucion' : 'fuga', forRider: null },
        ],
        mishap: b === 100 && id === 'peloton' ? { kind: 'caida', lostS: 15 } : null,
      })
    }
    detail.set(
      b,
      rows.sort((x, y) => x.g - y.g),
    )
  }
  // LAS PANCARTAS: la volante del km 15 y la cima del 25, cada una a la hora del grupo del primero
  const banners: BannerResult[] = [
    {
      kind: 'meta_volante',
      km: 15,
      cat: null,
      name: null,
      revealS: fromDs(markOf('mov-1', 150)),
      order: [
        { rider: 0, points: 20 },
        { rider: 1, points: 17 },
      ],
    },
    {
      kind: 'cima',
      km: 25,
      cat: 'cat3',
      name: 'Col de Test',
      revealS: fromDs(markOf('mov-1', 250)),
      order: [{ rider: 2, points: 5 }],
    },
  ]
  return {
    format: 1,
    engineVersion: 0,
    dx: DX,
    blocks: N,
    lengthKm: LENGTH_KM,
    timeTrial: false,
    clock: 'estimated',
    riderIds: RIDERS,
    groups,
    keys: [],
    stateEvents,
    events,
    detail,
    banners,
    profile: {
      altM: Array.from({ length: Math.ceil(LENGTH_KM) + 1 }, (_, k) => 200 + k * 5),
      climbs: [{ footKm: 20, topKm: 25, cat: 'cat3', lenKm: 5, avgPct: 4, name: 'Col de Test' }],
      sprintsKm: [15],
      laps: 1,
    },
    tt: null,
  }
}

/** Un suceso a la hora revealDs, sabido 4 s después de pasar: todo en décimas, como se guarda. */
function ev(
  source: number,
  plantilla: string,
  km: number,
  bEmit: Block,
  revealDs: Ds,
  riders: number[],
  datos: TimelineEvent['datos'],
): TimelineEvent {
  return {
    source,
    plantilla,
    km,
    tS: fromDs(revealDs - 40),
    bEmit,
    revealS: fromDs(revealDs),
    riders,
    datos,
  }
}

const FULL = fullLine()
const FINISH_DS = visibilityOf(FULL).finishDs

/** La cabecera de la etapa de juguete: lo que la web sabe antes del primer tramo. */
function headOf(tl: TimelineCore): BroadcastHead {
  return {
    stage: {
      raceKey: 'race-test:s0',
      raceId: 'race-test',
      day: 3,
      name: 'Stage 3 · Hills',
      km: Math.round(tl.lengthKm),
      kind: 'media',
      timeTrial: false,
      label: 'Hills',
      lengthKm: tl.lengthKm,
      dx: tl.dx,
      blocks: tl.blocks,
    },
    profile: tl.profile,
    weather: { tempC: 18, rain: 0, spans: [] },
    cast: tl.riderIds.map((id, ix) => ({
      ix,
      id,
      name: `Rider ${ix}`,
      bib: ix + 1,
      country: 'FR',
      gender: 'M' as const,
      team: null,
      worn: { kind: 'team' as const },
      lines: [],
      notoriety: 8 as const,
      own: ix === 4,
    })),
    startState: {
      leaders: { gc: 3, points: null, kom: null },
      gcTop: [{ rider: 3, rank: 1, gapS: 0 }],
      racingAtStart: tl.riderIds.length,
    },
    pace: [...BROADCAST.pace],
    estimateS: 300,
    clock: tl.clock,
    source: 'radio',
    preview: {
      route: tl.profile,
      weather: { tempC: 18, rain: 0, spans: [] },
      jerseysInPlay: [],
      favourites: [],
    },
    view: null,
    gate: null,
    tt: null,
    tplRev: 0,
  }
}

const HEAD = headOf(FULL)
const CTX: InstantContext = {
  own: new Set([4]),
  start: HEAD.startState,
  photoBlocks: photoBlocksOf(HEAD.stage.lengthKm, HEAD.stage.dx),
}

/** Una voz de mentira por tramo, para ver que se junta en su orden. */
const lineAt = (revealS: number): LiveLine => ({
  km: 1,
  tS: revealS,
  plantilla: 'attack_go',
  protagonists: [],
  revealS,
})

/** Los tramos de una línea con estos bordes en Ds, como los da la ruta (recortado el último a la meta). */
function chunksOf(bounds: readonly Ds[], tl: TimelineCore = FULL): BroadcastChunk[] {
  const finish = visibilityOf(tl).finishDs
  const out: BroadcastChunk[] = []
  for (let i = 1; i < bounds.length; i++) {
    const from = bounds[i - 1]!
    const to = Math.min(bounds[i]!, finish)
    out.push({ ...chunkOf(tl, from, to), lines: [lineAt(fromDs(to))] })
    if (to >= finish) break
  }
  return out
}

/** Bordes cada `stepS` de carrera, de 0 a pasada la meta. */
const every = (stepS: number): Ds[] =>
  Array.from({ length: Math.ceil(FINISH_DS / (stepS * 10)) + 1 }, (_, i) => i * stepS * 10)

/** Lo que el instante lee de una línea, en una forma que se compara con toEqual. */
function shapeOf(tl: TimelineCore) {
  return {
    groups: tl.groups,
    stateEvents: tl.stateEvents,
    events: tl.events,
    detail: [...tl.detail].sort((x, y) => x[0] - y[0]),
    banners: tl.banners,
    riderIds: tl.riderIds,
    lengthKm: tl.lengthKm,
    dx: tl.dx,
    blocks: tl.blocks,
    profile: tl.profile,
    clock: tl.clock,
  }
}

describe('servedLine · la línea de la web con la cabecera y los tramos (nota 1 del 3b)', () => {
  it('la etapa de juguete tiene de todo: nacimientos, muertes, un abandono, un título que cambia, un percance y pancartas', () => {
    const kinds = new Set(FULL.stateEvents.map((e) => e.t))
    expect([...kinds].sort()).toEqual(['clock', 'main', 'mishap', 'move', 'out'])
    expect(FULL.groups.map((g) => g.id)).toEqual(['peloton', 'mov-1', 'shed-1', 'mov-2'])
    expect(FULL.groups[1]!.diedB).toBe(259)
    expect(FINISH_DS).toBeLessThan(Infinity)
  })

  it.each([
    ['900 s', every(BROADCAST.chunkRaceS)],
    ['450 s', every(450)],
    ['de 37 s, con bordes que parten bloques', every(37)],
  ])(
    'tramos de %s: tras cada uno, la línea es la cortada en su borde (cutTimeline)',
    (_, bounds) => {
      let served: ServedLine = servedLineOf(HEAD)
      const chunks = chunksOf(bounds)
      expect(chunks.at(-1)!.atFinish).toBe(true)
      for (const c of chunks) {
        served = withChunk(HEAD, served, c)
        expect(served.toDs).toBe(c.toDs)
        // el tramo solo lleva lo anterior al borde de la meta: el último se compara una décima antes
        const T = fromDs(Math.min(c.toDs, FINISH_DS - 1))
        expect(shapeOf(served.core)).toEqual(shapeOf(cutTimeline(FULL, T)))
      }
      expect(served.lines.map((l) => l.revealS)).toEqual(chunks.map((c) => fromDs(c.toDs)))
    },
  )

  it('el instante sobre lo servido es el de la línea entera, a cualquier hora de lo servido (B9)', () => {
    let served: ServedLine = servedLineOf(HEAD)
    let checked = 0
    for (const c of chunksOf(every(450))) {
      served = withChunk(HEAD, served, c)
      const upTo = Math.min(c.toDs, FINISH_DS - 1)
      for (let ds = Math.max(0, c.fromDs - 1500); ds <= upTo; ds += 97) {
        expect(instantAt(served.core, fromDs(ds), CTX), `t = ${ds}`).toEqual(
          instantAt(FULL, fromDs(ds), CTX),
        )
        checked += 1
      }
      expect(instantAt(served.core, fromDs(upTo), CTX)).toEqual(instantAt(FULL, fromDs(upTo), CTX))
    }
    expect(checked).toBeGreaterThan(50)
  })

  it('antes del primer tramo, el grupo de salida con todos en el km 0 (3-f)', () => {
    const served = servedLineOf(HEAD)
    expect(served.toDs).toBe(0)
    expect(served.lines).toEqual([])
    const i = instantAt(served.core, 0, CTX)
    expect(i.groups).toHaveLength(1)
    expect(i.groups[0]).toMatchObject({ number: 1, km: 0, size: RIDERS.length })
    expect(i.toGoKm).toBe(LENGTH_KM)
  })

  it('la marca de salida de 0 Ds, la del adaptador, llega en el primer tramo con la fila del km 0, y la web no pone nada', () => {
    // la línea del adaptador de la radio: el reloj de la cabeza empieza en 0 en la primera foto, el
    // bloque 0, y la fila de detalle del km 0 se ve con esa marca. Hasta el 3c ningún tramo traía lo
    // de 0 Ds y la web deducía la marca; ahora el tramo que empieza en 0 lo lleva (chunkOf)
    const zero: TimelineCore = {
      ...FULL,
      stateEvents: FULL.stateEvents.map((e) =>
        e.t === 'clock' && e.b === 0 ? { ...e, marks: [[0, 0] as const] } : e,
      ),
    }
    const chunks = chunksOf(every(450), zero)
    expect(chunks[0]!.groupsBorn[0]).toEqual([0, 'peloton', 'start'])
    expect(chunks[0]!.clocks.slice(0, 3)).toEqual([0, 0, 0])
    expect(chunks[0]!.details.slice(0, 2)).toEqual([0, 0])
    let served: ServedLine = servedLineOf(HEAD)
    // antes del primer tramo no se sabe: el de salida, en el km 0 (3-f)
    expect(served.core.stateEvents).toEqual([])
    for (const c of chunks) {
      served = withChunk(HEAD, served, c)
      const upTo = Math.min(c.toDs, visibilityOf(zero).finishDs - 1)
      expect(shapeOf(served.core)).toEqual(shapeOf(cutTimeline(zero, fromDs(upTo))))
      for (let ds = 0; ds <= upTo; ds += 389)
        expect(instantAt(served.core, fromDs(ds), CTX)).toEqual(instantAt(zero, fromDs(ds), CTX))
    }
    // con ella el instante tiene la cabeza en cada km de foto, y los huecos de los grupos no salen a 0
    const t = fromDs(chunks[1]!.toDs)
    const gaps = instantAt(served.core, t, CTX).groups.map((g) => g.gap.toHeadS)
    expect(gaps.some((s) => s > 0)).toBe(true)
  })

  it('un tramo que no empieza en 0 no lleva lo de 0 Ds: nada viaja dos veces', () => {
    const [first, second] = chunksOf([0, 4500, 9000])
    expect(first!.groupsBorn.map(([g]) => g)).toContain(0)
    expect(second!.groupsBorn.map(([g]) => g)).not.toContain(0)
    const served = withChunk(HEAD, withChunk(HEAD, servedLineOf(HEAD), first!), second!)
    expect(served.core.groups.filter((g) => g.origin === 'start')).toHaveLength(1)
  })

  it('un tramo que no trae nada no cambia lo que se ve', () => {
    const first = withChunk(HEAD, servedLineOf(HEAD), chunksOf([0, 3000, 6000])[0]!)
    const empty: BroadcastChunk = {
      ...chunkOf(FULL, 3000, 3000),
      fromDs: 3000,
      toDs: 3000,
      lines: [],
    }
    const again = withChunk(HEAD, first, empty)
    expect(shapeOf(again.core)).toEqual(shapeOf(first.core))
  })

  it('un código que la web no conoce se lee como null (4-m)', () => {
    const chunk: BroadcastChunk = {
      ...chunkOf(FULL, 0, 0),
      fromDs: 0,
      toDs: 900,
      lines: [],
      // [b, g, velocidad·10, pullingTotal, MISHAP_CODE, lostDs, n, (rider, PULL_MOTIVE_CODE, forRider)]
      details: [0, 0, 425, 1, 99, 30, 2, 3, 99, -1, 4, 0, 5],
    }
    const served = withChunk(HEAD, servedLineOf(HEAD), chunk)
    expect(served.core.detail.get(0)).toEqual([
      {
        g: 0,
        speedKmh: 42.5,
        pullingTotal: 1,
        mishap: null,
        pullers: [
          { rider: 3, motive: null, forRider: null },
          { rider: 4, motive: null, forRider: 5 },
        ],
      },
    ])
  })
})

describe('servedLine · con una congelada grabada de verdad (6a)', () => {
  const url = new URL(
    '../../../../api/src/__fixtures__/broadcast/race-france-e18.timeline.gz',
    import.meta.url,
  )
  const tl = decodeTimeline(JSON.parse(gunzipSync(readFileSync(url)).toString('utf8')))
  const head = headOf(tl)
  const finish = visibilityOf(tl).finishDs
  const ctx: InstantContext = {
    own: new Set(),
    start: head.startState,
    photoBlocks: photoBlocksOf(head.stage.lengthKm, head.stage.dx),
  }

  it('tras cada tramo de 900 s, la línea es la cortada en su borde, y el instante sobre ella el de la línea entera', () => {
    expect(tl.clock).toBe('exact')
    const bounds = Array.from(
      { length: Math.ceil(finish / (BROADCAST.chunkRaceS * 10)) + 1 },
      (_, i) => i * BROADCAST.chunkRaceS * 10,
    )
    let served: ServedLine = servedLineOf(head)
    let checked = 0
    for (const c of chunksOf(bounds, tl)) {
      served = withChunk(head, served, c)
      const upTo = Math.min(c.toDs, finish - 1)
      expect(shapeOf(served.core), `hasta ${c.toDs}`).toEqual(
        shapeOf(cutTimeline(tl, fromDs(upTo))),
      )
      for (let ds = Math.max(0, c.fromDs - 600); ds <= upTo; ds += 311) {
        expect(instantAt(served.core, fromDs(ds), ctx), `t = ${ds}`).toEqual(
          instantAt(tl, fromDs(ds), ctx),
        )
        checked += 1
      }
    }
    expect(served.toDs).toBe(finish)
    expect(checked).toBeGreaterThan(100)
  })
})

describe('servedLine · la crono congelada, la e16 (6b, §9.2)', () => {
  const url = new URL(
    '../../../../api/src/__fixtures__/broadcast/race-france-e16.timeline.gz',
    import.meta.url,
  )
  const tl = decodeTimeline(JSON.parse(gunzipSync(readFileSync(url)).toString('utf8')))
  const base = headOf(tl)
  const head: BroadcastHead = {
    ...base,
    stage: { ...base.stage, timeTrial: true },
    tt: { order: tl.tt!.order, intervalS: tl.tt!.intervalS, checksKm: [...tl.tt!.checksKm] },
  }
  const finish = visibilityOf(tl).finishDs
  const ctx: InstantContext = {
    own: new Set(),
    start: head.startState,
    photoBlocks: photoBlocksOf(head.stage.lengthKm, head.stage.dx),
  }

  it('tras cada tramo, el estado de la crono sobre lo servido es el de la línea entera; sin grupos', () => {
    const bounds = Array.from(
      { length: Math.ceil(finish / (BROADCAST.chunkRaceS * 10)) + 1 },
      (_, i) => i * BROADCAST.chunkRaceS * 10,
    )
    let served: ServedLine = servedLineOf(head)
    expect(served.core.groups).toEqual([])
    expect(timeTrialInstantAt(served.core, 0, ctx).toStart).toBe(tl.riderIds.length)
    let checked = 0
    for (const c of chunksOf(bounds, tl)) {
      served = withChunk(head, served, c)
      const upTo = Math.min(c.toDs, finish - 1)
      for (let ds = Math.max(0, c.fromDs - 600); ds <= upTo; ds += 277) {
        expect(timeTrialInstantAt(served.core, fromDs(ds), ctx), `t = ${ds}`).toEqual(
          timeTrialInstantAt(tl, fromDs(ds), ctx),
        )
        checked += 1
      }
    }
    expect(served.toDs).toBe(finish)
    expect(checked).toBeGreaterThan(500)
    // los percances, de sus sucesos revelados: los cuatro de la e16
    expect(served.core.tt?.mishaps.map((m) => m.rider).sort((a, b) => a - b)).toEqual(
      [...tl.tt!.mishaps.map((m) => m.rider)].sort((a, b) => a - b),
    )
    // la última llegada es el borde: va en el paquete de meta, no en un tramo
    expect(timeTrialInstantAt(served.core, fromDs(finish), ctx).finished).toBe(
      tl.riderIds.length - 1,
    )
  })
})

/**
 * LO QUE SE HACE AL LLEGAR UN TRAMO, REPARTIDO (10b, los arreglos; §18.5 y D-56). Las tareas largas de
 * `Highlights` eran el tramo juntado de golpe en la tarea de su respuesta (rehacer la línea e indexarla
 * para la cabeza en su borde) y, al pintarlo, la voz rehaciendo a quién nombra en cada descuelgue de la
 * etapa. Lo que se pinta no cambia: la línea juntada en sus tareas es la de `withChunk`, con la misma
 * cabeza en el borde, y a quién nombra la voz en una línea no depende de cuánto se ha servido mientras
 * lo servido la traiga (B9), así que se calcula una vez por línea.
 */
describe('servedLine · el tramo juntado en sus tareas (10b, los arreglos)', () => {
  it('cede el hilo antes de rehacer la línea, antes de su visibilidad y antes de indexarla; la línea es la de withChunk y la cabeza, la de su borde', async () => {
    let served: ServedLine = servedLineOf(HEAD)
    let checked = 0
    for (const c of chunksOf(every(450))) {
      const before = served
      const kept = shapeOf(before.core)
      const steps: string[] = []
      const r = await withChunkSpread(HEAD, before, c, CTX, async () => {
        steps.push('cede')
      })
      const sync = withChunk(HEAD, before, c)
      expect(steps).toEqual(['cede', 'cede', 'cede'])
      expect(shapeOf(r.line.core)).toEqual(shapeOf(sync.core))
      expect(r.line.lines).toEqual(sync.lines)
      expect(r.line.toDs).toBe(sync.toDs)
      expect(r.headKmAtEnd).toBe(instantAt(sync.core, fromDs(c.toDs), CTX).headKm)
      // pura: la de entrada no cambia, y la pantalla puede seguir pintando con ella mientras tanto
      expect(shapeOf(before.core)).toEqual(kept)
      served = r.line
      checked += 1
    }
    expect(checked).toBeGreaterThan(5)
    expect(served.toDs).toBe(FINISH_DS)
  })

  it('si ceder falla (la pantalla se fue), no sigue: ni la línea ni el índice', async () => {
    const steps: string[] = []
    const c = chunksOf(every(450))[0]!
    await expect(
      withChunkSpread(HEAD, servedLineOf(HEAD), c, CTX, async () => {
        steps.push('cede')
        throw new Error('parado')
      }),
    ).rejects.toThrow('parado')
    expect(steps).toEqual(['cede'])
  })
})

describe('la voz sobre lo servido: a quién nombra cada línea, una vez (10b, los arreglos)', () => {
  const url = new URL(
    '../../../../api/src/__fixtures__/broadcast/race-france-e18.timeline.gz',
    import.meta.url,
  )
  const tl = decodeTimeline(JSON.parse(gunzipSync(readFileSync(url)).toString('utf8')))
  const head = headOf(tl)
  const finish = visibilityOf(tl).finishDs
  const ctxOf = (): InstantContext => ({
    own: new Set([4]),
    start: head.startState,
    photoBlocks: photoBlocksOf(head.stage.lengthKm, head.stage.dx),
  })
  const full = ctxOf()
  const bounds = Array.from(
    { length: Math.ceil(finish / (BROADCAST.chunkRaceS * 10)) + 1 },
    (_, i) => i * BROADCAST.chunkRaceS * 10,
  )
  /** Los que no salen en ningún suceso: en un grupo grande, sin tirar, nadie los nombra. */
  const quiet = new Set(tl.riderIds.map((_, r) => r))
  for (const e of tl.events) for (const r of e.riders) quiet.delete(r)
  /**
   * Descuelgues de mentira, dos por tramo a su mitad: uno de los del primer grupo de la carretera (si es
   * una fuga, nombrados) con tres callados del grupo mayor, y otro de esos tres solos, para que haya de
   * todo.
   */
  const chunks = chunksOf(bounds, tl).map((c) => {
    const revealS = fromDs(Math.round((c.fromDs + c.toDs) / 2))
    const at = instantAt(tl, revealS, full)
    const front = at.groups[0]?.members.slice(0, 4) ?? []
    const big = at.groups.reduce((a, g) => (g.size > a.size ? g : a))
    const rest = big.members
      .filter(
        (r) =>
          quiet.has(r) &&
          !full.own.has(r) &&
          !front.includes(r) &&
          !(big.detail?.pullers ?? []).some((p) => p.rider === r),
      )
      .slice(0, 3)
    const sitsUp = (riders: readonly number[], dt: number): LiveLine => ({
      km: Math.round(at.headKm),
      tS: revealS - 30,
      plantilla: 'rider_sits_up',
      protagonists: riders.map((r) => ({
        id: tl.riderIds[r]!,
        name: `Rider ${r}`,
        bib: r + 1,
        team: null,
        country: null,
      })),
      revealS: revealS + dt,
    })
    return { ...c, lines: [sitsUp([...front, ...rest], 0), sitsUp(rest, 1)] }
  })
  const answersOn = (core: TimelineCore, ctx: InstantContext, lines: readonly LiveLine[]) => {
    const unnamed = unnamedBefore(core, head.cast, ctx)
    return lines.map((l) => l.protagonists.map((p) => unnamed(l)(p.id!)))
  }

  it('sobre lo servido, tras cada tramo, lo mismo que sobre la línea entera (B9): la respuesta no depende de cuánto se ha servido', () => {
    let served: ServedLine = servedLineOf(head)
    const onFull = answersOn(
      tl,
      full,
      chunks.flatMap((c) => c.lines),
    )
    let checked = 0
    for (const c of chunks) {
      served = withChunk(head, served, c)
      // con un contexto nuevo cada vez, nada de lo calculado antes: todo sobre esta línea servida
      expect(answersOn(served.core, ctxOf(), served.lines), `hasta ${c.toDs}`).toEqual(
        onFull.slice(0, served.lines.length),
      )
      checked += served.lines.length
    }
    const flat = onFull.flat()
    expect(flat.filter((x) => x).length).toBeGreaterThan(10)
    expect(flat.filter((x) => !x).length).toBeGreaterThan(5)
    expect(checked).toBeGreaterThan(100)
  })

  it('una línea ya respondida no se rehace con otra línea servida del mismo contexto; con otro contexto, sí', () => {
    const ctx = ctxOf()
    let served: ServedLine = servedLineOf(head)
    let found: { line: LiveLine; id: string } | null = null
    for (const c of chunks) {
      served = withChunk(head, served, c)
      const line = c.lines[0]!
      const unnamed = unnamedBefore(served.core, head.cast, ctx)(line)
      const named = line.protagonists.find((p) => p.id !== tl.riderIds[4] && !unnamed(p.id!))
      if (named !== undefined) {
        found = { line, id: named.id! }
        break
      }
    }
    expect(found).not.toBeNull()
    const { line, id } = found!
    // antes del primer tramo todos van en el grupo de salida, sin sucesos: ahí nadie estaría nombrado
    const empty = servedLineOf(head).core
    expect(unnamedBefore(empty, head.cast, ctxOf())(line)(id)).toBe(true)
    // con el mismo contexto, la respuesta ya dada: un tramo nuevo no la rehace
    expect(unnamedBefore(empty, head.cast, ctx)(line)(id)).toBe(false)
    expect(unnamedBefore(served.core, head.cast, ctx)(line)(id)).toBe(false)
  })

  it('answerAhead deja hechas, en tareas cortas, las respuestas que pedirá la voz al pintar las líneas nuevas', async () => {
    const ctx = ctxOf()
    let served: ServedLine = servedLineOf(head)
    for (const c of chunks) served = withChunk(head, served, c)
    // un reloj de mentira: cada lectura, 5 ms más; con tareas de 8 ms, cede cada dos o tres líneas
    let clock = 0
    let yields = 0
    await answerAhead(
      served.core,
      head.cast,
      ctx,
      served.lines,
      async () => {
        yields += 1
      },
      8,
      () => (clock += 5),
    )
    expect(yields).toBeGreaterThan(served.lines.length / 4)
    expect(yields).toBeLessThan(served.lines.length)
    // hechas: sobre la línea de antes del primer tramo, la voz dice lo mismo que sobre la servida
    const empty = servedLineOf(head).core
    const ahead = served.lines.map((l) => inVoice(l, unnamedBefore(empty, head.cast, ctx)(l)))
    const fresh = served.lines.map((l) =>
      inVoice(l, unnamedBefore(served.core, head.cast, ctxOf())(l)),
    )
    expect(ahead).toEqual(fresh)
    expect(fresh.filter((x) => !x).length).toBeGreaterThan(0)
    expect(fresh.filter((x) => x).length).toBeGreaterThan(0)
  })

  it('answerAhead cede antes de empezar si hay algo que calcular (lo de antes en la tarea fue juntar la línea); si no, nada', async () => {
    let served: ServedLine = servedLineOf(head)
    for (const c of chunks) served = withChunk(head, served, c)
    const said = (plantilla: string): LiveLine => ({ ...served.lines[0]!, plantilla })
    for (const [lines, expected] of [
      [[said('attack_go'), said('crash'), said('front_group')], 0],
      [[said('attack_go'), said('rider_sits_up')], 1],
    ] as const) {
      let yields = 0
      await answerAhead(served.core, head.cast, ctxOf(), lines, async () => {
        yields += 1
      })
      expect(yields, lines.map((l) => l.plantilla).join(', ')).toBe(expected)
    }
  })
})
