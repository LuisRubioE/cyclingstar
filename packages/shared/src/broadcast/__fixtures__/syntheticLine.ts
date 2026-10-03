/**
 * UNA LÍNEA TEMPORAL SINTÉTICA para los tests de `shared` (E2, docs/retransmision.md §16.2; D-52).
 *
 * `shared` no importa el motor, y un cambio aquí no corre los bancos: I1 e I3 se comprueban también en
 * la suite rápida sobre fotos sintéticas. Este grabador de juguete hace con unas fotos escritas a mano
 * lo que el de verdad (§5.4, PR 4b) hará con las del motor: el catálogo con su `GroupIx` por la hora de
 * su marca de nacimiento (4-a), los sucesos de estado en su orden (out, move, main, clock), las marcas
 * en los cuatro sitios de §3.4 y las fotos clave.
 */
import type {
  Block,
  Ds,
  GroupCatalogEntry,
  GroupIx,
  GroupOrigin,
  KeyPhoto,
  StateEvent,
  TimelineCore,
} from '../timeline.js'
import { toDs } from '../timeline.js'

/** La foto del «motor» al final de un bloque: el grupo de cada corredor (null si ya no corre), el reloj de cada grupo vivo y el título. */
export interface SynthPhoto {
  readonly groupOf: readonly (string | null)[]
  /** segundos de carrera de cada grupo vivo al cruzar el bloque */
  readonly clockS: Readonly<Record<string, number>>
  readonly main: string | null
}

export interface SynthOptions {
  /** cada cuántos bloques hay foto de km (en el motor, 10) */
  readonly photoEvery: number
  /** cada cuántos bloques hay foto clave (en el motor, 100) */
  readonly keyEvery: number
  /** cuántos bloques del final llevan marca en cada bloque (TIMELINE.lastKmMarkBlocks, en el motor 10) */
  readonly lastBlocks: number
}

const originOf = (id: string): GroupOrigin =>
  id === 'peloton' ? 'start' : id.startsWith('mov-') ? 'attack' : 'shed'

/** Graba la línea de unas fotos, una por bloque desde el 0, como el grabador de §5.4. */
export function synthLine(
  photos: readonly SynthPhoto[],
  riderIds: readonly string[],
  opts: SynthOptions,
): { readonly tl: TimelineCore; readonly ixOf: ReadonlyMap<string, GroupIx> } {
  const n = photos.length
  const photoBlocks = new Set<Block>()
  for (let b = 0; b < n; b += opts.photoEvery) photoBlocks.add(b)
  photoBlocks.add(n - 1)
  const born = new Map<string, Block>([['peloton', 0]])
  const died = new Map<string, { b: Block; successor: string | null }>()
  const marks = new Map<Block, Map<string, Ds>>()
  const mark = (b: Block, id: string): void => {
    const s = photos[b]?.clockS[id]
    if (s === undefined) throw new Error(`sin reloj de ${id} en ${b}`)
    let at = marks.get(b)
    if (at === undefined) marks.set(b, (at = new Map()))
    at.set(id, toDs(s))
  }
  const alive = (b: Block): Set<string> =>
    new Set(photos[b]!.groupOf.filter((g): g is string => g !== null))
  const changes: { b: Block; rider: number; to: string | null }[] = []
  const mains: { b: Block; id: string | null }[] = []
  let prevMain: string | null = 'peloton'
  for (let b = 0; b < n; b++) {
    const now = photos[b]!
    const prevOf = b === 0 ? riderIds.map(() => 'peloton') : photos[b - 1]!.groupOf
    const live = alive(b)
    const before = b === 0 ? new Set(['peloton']) : alive(b - 1)
    const changed = new Set<string>()
    now.groupOf.forEach((g, r) => {
      if (g === prevOf[r]) return
      changes.push({ b, rider: r, to: g })
      if (prevOf[r] !== null) changed.add(prevOf[r]!)
      if (g !== null) changed.add(g)
    })
    for (const id of live) if (!born.has(id)) born.set(id, b)
    for (const id of before) {
      if (live.has(id)) continue
      // muere en b − 1: su sucesor, el grupo de b adonde fue la mayoría de los suyos (desempate por id)
      const count = new Map<string, number>()
      prevOf.forEach((g, r) => {
        const to = now.groupOf[r]
        if (g === id && to !== null && to !== undefined) count.set(to, (count.get(to) ?? 0) + 1)
      })
      let successor: string | null = null
      let best = -1
      for (const [to, c] of [...count].sort((x, y) => (x[0] < y[0] ? -1 : 1)))
        if (c > best) {
          successor = to
          best = c
        }
      died.set(id, { b: b - 1, successor })
      mark(b - 1, id)
    }
    // las marcas: (a) foto de km, (b) nacimiento, (c) cambio de composición, (d) el final
    for (const id of live) {
      if (photoBlocks.has(b) || born.get(id) === b || b >= n - opts.lastBlocks) mark(b, id)
    }
    for (const id of changed) {
      if (live.has(id)) mark(b, id)
      if (b > 0 && before.has(id)) mark(b - 1, id)
    }
    if (now.main !== prevMain) {
      mains.push({ b, id: now.main })
      prevMain = now.main
    }
  }

  // 4-a: el catálogo por la hora de la marca de nacimiento (desempate por bloque e id); el de salida, el 0.
  const ids = [...born.keys()]
  const bornDs = (id: string): number =>
    id === 'peloton' ? -1 : (marks.get(born.get(id)!)?.get(id) ?? Number.POSITIVE_INFINITY)
  ids.sort((a, b) => bornDs(a) - bornDs(b) || born.get(a)! - born.get(b)! || (a < b ? -1 : 1))
  const ixOf = new Map(ids.map((id, i) => [id, i] as const))
  const groups: GroupCatalogEntry[] = ids.map((id) => {
    const d = died.get(id)
    return {
      id,
      origin: originOf(id),
      bornB: born.get(id)!,
      diedB: d?.b ?? null,
      successor: d?.successor == null ? null : ixOf.get(d.successor)!,
    }
  })

  const stateEvents: StateEvent[] = []
  for (let b = 0; b < n; b++) {
    for (const c of changes)
      if (c.b === b && c.to === null) stateEvents.push({ t: 'out', b, rider: c.rider })
    const byTo = new Map<GroupIx, number[]>()
    for (const c of changes)
      if (c.b === b && c.to !== null) {
        const to = ixOf.get(c.to)!
        ;(byTo.get(to) ?? byTo.set(to, []).get(to)!).push(c.rider)
      }
    for (const [to, riders] of [...byTo].sort((x, y) => x[0] - y[0]))
      stateEvents.push({ t: 'move', b, to, riders: riders.sort((x, y) => x - y) })
    for (const m of mains)
      if (m.b === b)
        stateEvents.push({ t: 'main', b, group: m.id === null ? null : ixOf.get(m.id)! })
    const at = marks.get(b)
    if (at !== undefined)
      stateEvents.push({
        t: 'clock',
        b,
        marks: [...at].map(([id, ds]) => [ixOf.get(id)!, ds] as const).sort((x, y) => x[0] - y[0]),
      })
  }

  const keys: KeyPhoto[] = []
  for (let b = 0; b < n; b += opts.keyEvery) {
    const groupOf = new Int16Array(riderIds.length)
    photos[b]!.groupOf.forEach((g, r) => (groupOf[r] = g === null ? -1 : ixOf.get(g)!))
    const m = photos[b]!.main
    keys.push({ b, groupOf, main: m === null ? null : ixOf.get(m)! })
  }

  const tl: TimelineCore = {
    format: 1,
    engineVersion: 0,
    dx: 0.1,
    blocks: n,
    lengthKm: n * 0.1,
    timeTrial: false,
    clock: 'exact',
    riderIds,
    groups,
    keys,
    stateEvents,
    events: [],
    detail: new Map(),
    banners: [],
    profile: { altM: [], climbs: [], sprintsKm: [], laps: 1 },
    tt: null,
  }
  return { tl, ixOf }
}

/**
 * UNA ETAPA DE JUGUETE de 60 bloques y ocho corredores, con todo lo que la línea tiene que saber
 * contar: un ataque que nace (bloque 12), un descolgado (25), un puente (33), un abandono (40), una
 * caza que mata al grupo de detrás (47) y el título que cambia de grupo (50). El reloj de cada grupo
 * crece con el bloque a su ritmo.
 */
export function toyStage(): { readonly photos: SynthPhoto[]; readonly riderIds: string[] } {
  const riderIds = ['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7']
  const photos: SynthPhoto[] = []
  for (let b = 0; b < 60; b++) {
    const groupOf: (string | null)[] = riderIds.map(() => 'peloton')
    if (b >= 12) groupOf[0] = groupOf[1] = 'mov-1'
    if (b >= 33) groupOf[2] = 'mov-1'
    if (b >= 25 && b < 47) groupOf[5] = 'shed-2'
    if (b >= 40) groupOf[7] = null
    const clockS: Record<string, number> = { peloton: 9 * (b + 1) + Math.max(0, b - 12) * 0.5 }
    if (b >= 12) clockS['mov-1'] = 9 * (b + 1) - Math.min(30, (b - 11) * 1.5)
    if (b >= 25 && b < 47) clockS['shed-2'] = clockS.peloton! + (b - 24) * 2
    const main = b >= 50 ? 'mov-1' : 'peloton'
    photos.push({ groupOf, clockS, main })
  }
  return { photos, riderIds }
}
