/**
 * EL INSTANTE (E2, docs/retransmision.md §4.5, §6.2 y §6.3; D-01, D-03, D-04, D-17, D-18).
 *
 * Lo que pinta la tele a una hora de carrera `t`: cada grupo donde está AHORA. No lo guarda nadie: lo
 * calcula `instantAt` sobre la línea, en la web cada fotograma y en el servidor para la cabecera y los
 * avisos. Es causal por definición (4-c): `instantAt(tl, t)` es el instante de lo que se ve a la hora
 * t, y nada de lo que se ve después entra en la cuenta, ni siquiera para saber de qué grupo venía un
 * corredor; así `instantAt(cutTimeline(tl, T), T)` es `instantAt(tl, T)` (B9, §16.4).
 *
 * El algoritmo es el de §4.5, paso a paso, con las decisiones 3-a (un grupo con una sola marca va a la
 * velocidad de su grupo de origen), 3-b (el que sale en dos grupos se pinta atrás y va en tránsito),
 * 3-c (el hueco de un corredor en tránsito es el del grupo que dejó), 3-e (un grupo que aún no ha
 * cruzado un km de foto lleva el hueco de su origen) y 3-f (la salida se ve desde t = 0), y la
 * histéresis del papel sin estado de 4-q.
 *
 * Nace en el PR 3a. `timeTrialInstantAt` (§9.3) llega en el 6b.
 */
import type { RadioGroupKind } from '../contracts.js'
import { JERSEY_PRIORITY, type JerseyKind } from '../jerseys.js'
import { BROADCAST } from './constants.js'
import { cutRootOf, visibilityOf, type TimelineVisibility } from './cut.js'
import type {
  BannerResult,
  Block,
  Ds,
  GroupCatalogEntry,
  GroupDetail,
  GroupIx,
  RaceS,
  RiderIx,
  TimelineCore,
} from './timeline.js'
import { toDs } from './timeline.js'
import type { StartState } from './wire.js'

// --------------------------------------------------------------------------------- los tipos (§4.5)

/** UN código de papel para la barra, la radio servida, la voz y el acta (D-18); las palabras son de §6.3. */
export type GroupRole = 'lead' | 'chase' | 'bunch' | 'gruppetto'

/** Los papeles, para la guarda de lo que llega sin tipo en `datos` (§12.6). */
export const GROUP_ROLES = [
  'lead',
  'chase',
  'bunch',
  'gruppetto',
] as const satisfies readonly GroupRole[]

/** mainRole y groupRole viajan en `datos` de una línea, que no tiene tipo: sin la guarda, no indexan GROUP_WORDS. */
export function isGroupRole(x: unknown): x is GroupRole {
  return typeof x === 'string' && (GROUP_ROLES as readonly string[]).includes(x)
}

/** Cómo se rotula una fila (§6.3). */
export type GroupLabel =
  /** la palabra de su papel: `Lead group`, `Chase group`, `Bunch`, `Gruppetto` (pantalla) */
  | { readonly k: 'role' }
  /** BROADCAST.byNamesUpTo o menos: se nombra por ellos (SPEC §6.15) */
  | { readonly k: 'names'; readonly riders: readonly RiderIx[] }
  /** lleva un maillot de líder y no es cabeza ni pelotón: `Race leader’s group` (pantalla) */
  | { readonly k: 'jersey_group'; readonly jersey: JerseyKind }
  /** un solo grupo en carrera: `Bunch together` (pantalla) */
  | { readonly k: 'together' }

/** La tendencia de un hueco (D-17): el hueco ahora menos el de trendWindowKm antes, del mismo grupo o de su antecesor. */
export interface GapTrend {
  /** > 0: crece */
  readonly deltaS: number
  readonly windowKm: number
  /** up si deltaS ≥ trendMinS, down si ≤ −trendMinS, flat (sin flecha) entre medias */
  readonly arrow: 'up' | 'down' | 'flat'
}

export interface GapReading {
  /** a la cabeza, en el último km de foto que ESTE grupo ha cruzado; si no ha cruzado ninguno, el de su origen (3-e) */
  readonly toHeadS: number
  /** al grupo de número anterior en ese mismo bloque; null si ese grupo no tenía marca allí */
  readonly toAheadS: number | null
  /** el km de foto donde se midió: (bloque + 0,5) · dx, la moto de cronometraje */
  readonly atKm: number
  /** null si ni él ni un antecesor suyo tenía marca trendWindowKm antes, o en el caso 3-e */
  readonly trend: GapTrend | null
}

/** UN GRUPO EN PANTALLA en la hora t. Todo se deriva. */
export interface GroupNow {
  /** la identidad: el id del motor (D-03) */
  readonly g: GroupIx
  /** 1 = el primero de la carretera en t; renumera, no es identidad (UCI §11.2) */
  readonly number: number
  /** con histéresis de BROADCAST.roleHysteresisKm (4-q) */
  readonly role: GroupRole
  readonly label: GroupLabel
  /** kindOf (raceRadio.ts) sobre el orden y el pelotón de ESTE instante */
  readonly kind: RadioGroupKind
  /** dónde se pinta: el máximo de lo pintado, nunca hacia atrás (D-04, 4-e) */
  readonly km: number
  /** members.length */
  readonly size: number
  /** por RiderIx creciente; el que sale en dos grupos cuenta solo en el de atrás (3-b) */
  readonly members: readonly RiderIx[]
  readonly gap: GapReading
  /** su fila de la capa de detalle en el último km de foto cruzado */
  readonly detail: GroupDetail | null
  /** maillots de líder que llevan sus miembros (ctx.start.leaders), en JERSEY_PRIORITY */
  readonly jerseys: readonly JerseyKind[]
  /** lleva un corredor del espectador (ctx.own) */
  readonly own: boolean
}

/** Un corredor que en t sale en dos grupos (se pinta en el de atrás, `from`) o en ninguno (D-01, punto 6; 3-b). */
export interface InTransit {
  readonly rider: RiderIx
  readonly from: GroupIx
  readonly to: GroupIx
  /** el de from en el último km de foto en que iba en él (3-c) */
  readonly gap: GapReading
}

/** La diferencia principal de la capa fija (D-17). */
export interface MainGap {
  readonly ahead: GroupIx
  readonly behind: GroupIx
  /** marca de `behind` menos la de `ahead` en el último km de foto que ha cruzado `behind` */
  readonly gapS: number
  /** la de `behind`, por la cadena de successor (§4.5) */
  readonly trend: GapTrend | null
  /** contra el pelotón; contra el primero de detrás con maillot o un top mainGapTopStart de salida; contra el segundo */
  readonly ref: 'bunch' | 'jersey_group' | 'second'
}

/** Una fila de la general virtual (mapa 06 §3.3). */
export interface VirtualGcRow {
  readonly rider: RiderIx
  /** −1 en crono */
  readonly group: GroupIx
  /** StartState.gcTop */
  readonly startRank: number
  /** déficit de salida + hueco de su grupo al del líder en su último km de foto común */
  readonly virtualS: number
}

/** EL INSTANTE (D-04). */
export interface Instant {
  readonly t: RaceS
  /** el km pintado del grupo número 1 */
  readonly headKm: number
  /** máx(0, lengthKm − headKm) */
  readonly toGoKm: number
  /** si profile.laps > 1, ceil(toGoKm / (lengthKm / laps)); si no, null */
  readonly lapsToGo: number | null
  /** en orden de carretera */
  readonly groups: readonly GroupNow[]
  readonly inTransit: readonly InTransit[]
  /** null: un solo grupo, `Bunch together` (pantalla) */
  readonly mainGap: MainGap | null
  /** solo las ya reveladas */
  readonly banners: readonly BannerResult[]
  /** solo si un top virtualGcTop de salida va en otro grupo que el líder a menos de virtualGcMaxS */
  readonly virtualGc: readonly VirtualGcRow[] | null
  /** sin un `out` visible */
  readonly racing: number
  /** riderIds.length − racing */
  readonly gone: number
}

/** La crono en la hora t (D-23; su algoritmo es §9.3 y llega en el 6b). Se deriva de TimeTrialTrace. */
export interface TimeTrialInstant {
  readonly t: RaceS
  readonly onCourse: readonly {
    readonly rider: RiderIx
    readonly km: number
    readonly lastSplitKm: number | null
    readonly deltaS: number | null
  }[]
  readonly hotSeat: { readonly rider: RiderIx; readonly timeS: number } | null
  readonly arrivals: readonly { readonly rider: RiderIx; readonly timeS: number }[]
  readonly splits: readonly {
    readonly km: number
    readonly board: readonly { readonly rider: RiderIx; readonly timeS: number }[]
  }[]
  readonly virtualGc: readonly VirtualGcRow[] | null
  readonly toStart: number
  readonly finished: number
}

/** Lo que el instante necesita además de la línea: el reparto servido, ya con el velo, y el calendario público de fotos. */
export interface InstantContext {
  /** corredores del espectador y de su equipo; vacío para el visitante */
  readonly own: ReadonlySet<RiderIx>
  /** maillots y general de salida (§4.11), degradados por el velo como el reparto (B13) */
  readonly start: StartState
  /** photoBlocksOf(lengthKm, dx): públicos porque salen de la longitud */
  readonly photoBlocks: readonly Block[]
}

// ------------------------------------------------------------------ el calendario de fotos (§15.5)

/**
 * Los bloques de las fotos de km del motor: `radioKmPoints` (raceRadio.ts) llevado a bloques como
 * `simulate.ts` (`probeAt`), sin repetir, porque `probeAt` es un `Map` por bloque y en 69 de las 1.418
 * etapas del calendario los dos últimos puntos caen en el mismo. Copia atada por test
 * (`apps/api/src/broadcastConstants.test.ts`, decisión 4-o): `shared` no importa el motor.
 */
export function photoBlocksOf(lengthKm: number, dx: number): readonly Block[] {
  const n = Math.round(lengthKm / dx)
  const kms: number[] = []
  for (let km = 0; km < lengthKm; km += 1) kms.push(Math.round(km * 10) / 10)
  const last = Math.max(0, lengthKm - dx)
  if (kms.length === 0 || kms[kms.length - 1]! < last) kms.push(Math.round(last * 10) / 10)
  const out: Block[] = []
  for (const km of kms) {
    const b = Math.max(0, Math.min(n - 1, Math.round(km / dx - 0.5)))
    if (out[out.length - 1] !== b) out.push(b)
  }
  return out
}

// ---------------------------------------------------------------- el papel y la etiqueta (§6.3)

/**
 * Copia de `chaseReferenceIndex` (packages/engine/src/stage/group.ts), atada por test (decisión 6-a;
 * §15.5, 15-k): el grupo de detrás contra el que el motor mide el boquete cuando no hay grueso. −1 si
 * no hay nadie detrás. Se exporta para ese test, que entra en el 4a con la exportación del motor.
 */
export function chaseRefOf(
  behind: readonly { readonly size: number; readonly racing: boolean }[],
  mainFraction: number,
): number {
  if (behind.length === 0) return -1
  const pool = behind.filter((x) => x.racing && x.size >= 2)
  const candidates = pool.length > 0 ? pool : behind
  const biggest = candidates.reduce((mx, x) => Math.max(mx, x.size), 0)
  const chosen = candidates.find((x) => x.size >= biggest * mainFraction) ?? candidates[0]!
  return behind.indexOf(chosen)
}

/** EL PAPEL de cada grupo, en orden de carretera (D-18). road[i].kind === 'peloton' es el grupo con el título. */
export function groupRoleOf(
  road: readonly { readonly size: number; readonly kind: RadioGroupKind }[],
  racing: number,
): readonly GroupRole[] {
  if (road.length === 1) return ['bunch'] // un solo grupo: `Bunch together`
  const main = road.findIndex((x) => x.kind === 'peloton')
  const bunch = main >= 0 && road[main]!.size >= racing * BROADCAST.bunchMinShare ? main : -1
  // sin grueso, la persecución que el motor nombra «the chase group» tras una criba
  const ref =
    bunch >= 0
      ? -1
      : 1 +
        chaseRefOf(
          road.slice(1).map((x, j) => ({ size: x.size, racing: main < 0 || j + 1 <= main })),
          BROADCAST.chaseMinShare,
        )
  return road.map((_, i): GroupRole => {
    if (i === bunch) return 'bunch' // el título con dos tercios de la carrera
    if (i === 0) return 'lead' // el primero de la carretera, si no es el grueso
    if (bunch >= 0) return i < bunch ? 'chase' : 'gruppetto' // entre la cabeza y el grueso persigue; detrás, descolgado
    if (main < 0 || i <= main) return 'chase' // sin grueso: todo lo que va con el título o por delante
    return i === ref ? 'chase' : 'gruppetto'
  })
}

/** CÓMO SE ROTULA la fila (§6.3). `jerseys` va en JERSEY_PRIORITY: el primero es el que nombra al grupo. */
export function groupLabelOf(
  size: number,
  members: readonly number[],
  jerseys: readonly JerseyKind[],
  role: GroupRole,
  groupsCount: number,
): GroupLabel {
  if (groupsCount === 1) return { k: 'together' }
  if (size <= BROADCAST.byNamesUpTo) return { k: 'names', riders: members } // tres o menos, por sus nombres
  if ((role === 'chase' || role === 'gruppetto') && jerseys.length > 0)
    return { k: 'jersey_group', jersey: jerseys[0]! }
  return { k: 'role' }
}

/**
 * LA DIFERENCIA PRINCIPAL de la capa fija (D-17, §6.2): el paso 10 de `instantAt`. `groups`, los del
 * instante en orden de carretera y con su papel; `markAt`, la marca en Ds de un grupo en un km de foto
 * (con el respaldo del origen, 3-e). La referencia: el pelotón si no es la cabeza (`on the bunch`); si
 * la cabeza es el pelotón, el primer grupo de detrás con un maillot o un top mainGapTopStart de salida;
 * si no hay ninguno, el segundo.
 */
export function mainGapOf(
  groups: readonly GroupNow[],
  start: StartState,
  markAt: (g: GroupNow, photoKm: number) => number,
): MainGap | null {
  if (groups.length < 2) return null // un solo grupo: `Bunch together` (pantalla)
  const head = groups[0]!
  // «El pelotón» de D-17: el grupo con papel bunch; si ninguno llega a los dos tercios, el del título (6-b)
  const pack =
    groups.find((g) => g.role === 'bunch') ?? groups.find((g) => g.kind === 'peloton') ?? null
  let behind: GroupNow
  let ref: MainGap['ref']
  if (pack !== null && pack.g !== head.g) {
    behind = pack
    ref = 'bunch'
  } else {
    const top = new Set(
      start.gcTop.filter((r) => r.rank <= BROADCAST.mainGapTopStart).map((r) => r.rider),
    )
    const jg = groups
      .slice(1)
      .find((g) => g.jerseys.length > 0 || g.members.some((r) => top.has(r)))
    if (jg !== undefined) {
      behind = jg
      ref = 'jersey_group'
    } else {
      behind = groups[1]!
      ref = 'second'
    }
  }
  const k = behind.gap.atKm // el último km de foto que ha cruzado el de detrás (§3.5)
  const gapS = Math.max(0, (markAt(behind, k) - markAt(head, k)) / 10)
  return { ahead: head.g, behind: behind.g, gapS, trend: behind.gap.trend, ref }
}

// ------------------------------------------------------------------------ la línea, indexada

/** Lo que el instante lee de una línea, calculado una vez por objeto. */
interface LineIndex {
  readonly tl: TimelineCore
  readonly vis: TimelineVisibility
  /** por GroupIx: sus marcas [bloque, Ds], por bloque creciente */
  readonly marks: readonly (readonly (readonly [Block, Ds])[])[]
  /** por bloque: las marcas [GroupIx, Ds] de ese bloque */
  readonly marksAt: ReadonlyMap<Block, readonly (readonly [GroupIx, Ds])[]>
  /** la línea entera de la que sale (cutRootOf): comparte con ella el memo de los papeles crudos */
  readonly root: TimelineCore
}

const indexes = new WeakMap<TimelineCore, LineIndex>()

function indexOf(tl: TimelineCore): LineIndex {
  const hit = indexes.get(tl)
  if (hit !== undefined) return hit
  const marks: [Block, Ds][][] = tl.groups.map(() => [])
  const marksAt = new Map<Block, [GroupIx, Ds][]>()
  for (const e of tl.stateEvents) {
    if (e.t !== 'clock') continue
    for (const [g, ds] of e.marks) {
      ;(marks[g] ??= []).push([e.b, ds])
      let at = marksAt.get(e.b)
      if (at === undefined) marksAt.set(e.b, (at = []))
      at.push([g, ds])
    }
  }
  for (const list of marks) list.sort((x, y) => x[0] - y[0] || x[1] - y[1])
  const out: LineIndex = { tl, vis: visibilityOf(tl), marks, marksAt, root: cutRootOf(tl) }
  indexes.set(tl, out)
  return out
}

/** Los papeles crudos (sin histéresis) a una hora, por línea entera: el memo del paso 9 (§18.1). */
const rawRolesMemo = new WeakMap<TimelineCore, Map<Ds, ReadonlyMap<GroupIx, GroupRole>>>()

/** La primera posición de una lista ordenada con valor > x (búsqueda binaria). */
function upperBound(xs: readonly number[], x: number): number {
  let lo = 0
  let hi = xs.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (xs[mid]! <= x) lo = mid + 1
    else hi = mid
  }
  return lo
}

/** La regla de kindOf (raceRadio.ts) sobre el orden de este instante: delante, fuga y contra; detrás, tierra o grupeto. */
function kindsOf(
  order: readonly { readonly g: GroupIx; readonly km: number; readonly origin: string }[],
  mainG: GroupIx | null,
): RadioGroupKind[] {
  const mainIx = mainG === null ? -1 : order.findIndex((x) => x.g === mainG)
  let movesAhead = 0
  return order.map((x, i) => {
    if (i === mainIx) return 'peloton'
    if (mainIx < 0) return x.origin === 'shed' ? 'grupeto' : 'fuga'
    // a la misma altura que el pelotón, ni escapado ni descolgado
    if (x.km === order[mainIx]!.km) return 'tierra'
    // detrás: el origen informa, y es la única vez que lo hace
    if (i > mainIx) return x.origin === 'attack' ? 'tierra' : 'grupeto'
    const kind = movesAhead === 0 ? 'fuga' : 'contra'
    movesAhead += 1
    return kind
  })
}

/** Lo que se ve de la línea a la hora S, hasta el paso 7 (grupos, posiciones, composición, orden, pelotón y tipo). */
interface Seen {
  readonly S: Ds
  /** los grupos vivos en orden de carretera */
  readonly order: readonly {
    readonly g: GroupIx
    readonly real: number
    readonly painted: number
    readonly km: number
    /** índice de su última marca vista en `marks[g]`; −1 si no tiene */
    readonly last: number
    readonly members: readonly RiderIx[]
    readonly kind: RadioGroupKind
  }[]
  readonly mainG: GroupIx | null
  /** por corredor: su último cambio de grupo visto { b, from, to }; to = −1 es `out` */
  readonly lastMove: ReadonlyMap<
    RiderIx,
    { readonly b: Block; readonly from: GroupIx; readonly to: GroupIx }
  >
  readonly outs: number
  readonly inTransit: readonly {
    readonly rider: RiderIx
    readonly from: GroupIx
    readonly to: GroupIx
    readonly lastB: Block
  }[]
  /** por GroupIx vivo: su grupo de origen (3-a) */
  readonly originOf: ReadonlyMap<GroupIx, GroupIx>
  /** los movimientos vistos de más de un corredor: para la histéresis del papel (4-q) */
  readonly bigMoves: readonly { readonly ds: Ds; readonly touched: ReadonlySet<GroupIx> }[]
  /** por GroupIx muerto y visto: sus predecesores (los que le tienen por sucesor) */
  readonly preds: ReadonlyMap<GroupIx, readonly GroupIx[]>
  /** el grupo de un corredor al final de un bloque, con lo visto */
  readonly groupAtBlock: (r: RiderIx, b: Block) => GroupIx
}

/**
 * Los pasos 1 a 7 de §4.5 a la hora S (en Ds). Solo lee datos con visibilidad ≤ S, y todo lo que
 * dependa de quién iba dónde sale de rehacer lo visto, nunca de la línea entera.
 */
function seenAt(ix: LineIndex, S: Ds, photoBlocks: readonly Block[]): Seen {
  const { tl, vis, marks } = ix
  // 1. Los grupos que se ven (un prefijo, 4-a) y los vivos.
  let nVisible = 0
  while (nVisible < tl.groups.length && vis.groupBornDs[nVisible]! <= S) nVisible++
  const diedSeen = (g: GroupIx): boolean => {
    const d = vis.groupDiedDs[g] ?? null
    return d !== null && d <= S
  }

  // Lo visto, rehecho en orden de bloque: el historial de cada corredor, los orígenes de cada grupo
  // (los de los corredores que entran en él en su bloque de nacimiento), el último título y los
  // movimientos de más de un corredor.
  const history = new Map<RiderIx, [Block, GroupIx][]>()
  const current = new Int16Array(tl.riderIds.length)
  const lastMove = new Map<RiderIx, { b: Block; from: GroupIx; to: GroupIx }>()
  const originCount = new Map<GroupIx, Map<GroupIx, number>>()
  const bigMoves: { ds: Ds; touched: Set<GroupIx> }[] = []
  let mainG: GroupIx | null = 0
  let outs = 0
  tl.stateEvents.forEach((e, i) => {
    switch (e.t) {
      case 'out':
        if (vis.stateEventDs[i]! > S) return
        lastMove.set(e.rider, { b: e.b, from: current[e.rider]!, to: -1 })
        current[e.rider] = -1
        ;(history.get(e.rider) ?? history.set(e.rider, []).get(e.rider)!).push([e.b, -1])
        outs += 1
        return
      case 'move': {
        const per = vis.moveRiderDs[i] ?? []
        const touched = new Set<GroupIx>([e.to])
        let seen = 0
        let minDs = Number.POSITIVE_INFINITY
        e.riders.forEach((r, j) => {
          const ds = per[j] ?? Number.POSITIVE_INFINITY
          if (ds > S) return
          const from = current[r]!
          seen += 1
          minDs = Math.min(minDs, ds)
          touched.add(from)
          if (e.to < tl.groups.length && tl.groups[e.to]!.bornB === e.b) {
            let c = originCount.get(e.to)
            if (c === undefined) originCount.set(e.to, (c = new Map()))
            c.set(from, (c.get(from) ?? 0) + 1)
          }
          lastMove.set(r, { b: e.b, from, to: e.to })
          current[r] = e.to
          ;(history.get(r) ?? history.set(r, []).get(r)!).push([e.b, e.to])
        })
        if (seen > 1) bigMoves.push({ ds: minDs, touched })
        return
      }
      case 'main':
        if (vis.stateEventDs[i]! <= S) mainG = e.group
        return
      default:
        return
    }
  })
  const groupAtBlock = (r: RiderIx, b: Block): GroupIx => {
    const h = history.get(r)
    if (h === undefined) return 0
    let out: GroupIx = 0
    for (const [hb, g] of h) {
      if (hb > b) break
      out = g
    }
    return out
  }
  const originOf = new Map<GroupIx, GroupIx>()
  for (const [g, counts] of originCount) {
    let best: GroupIx | null = null
    let bestN = -1
    for (const [from, n] of [...counts].sort((x, y) => x[0] - y[0]))
      if (n > bestN && from >= 0) {
        best = from
        bestN = n
      }
    if (best !== null) originOf.set(g, best)
  }

  // 2. La posición de cada grupo vivo (D-04, 3-a, 3-f).
  const visibleMarks = (g: GroupIx): number => {
    const list = marks[g] ?? []
    // las marcas de un grupo crecen con el bloque: las vistas son un prefijo
    let lo = 0
    let hi = list.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (list[mid]![1] <= S) lo = mid + 1
      else hi = mid
    }
    return lo
  }
  const cap = (b: Block): number => {
    const k = upperBound(photoBlocks, b)
    return k < photoBlocks.length ? photoBlocks[k]! : tl.blocks - 1
  }
  /** Las dos últimas marcas de o con reloj ≤ s, como velocidad en bloques por décima; 0 sin dos. */
  const originSpeed = (o: GroupIx | undefined, s: Ds): number => {
    if (o === undefined) return 0
    const list = marks[o] ?? []
    let n = 0
    while (n < list.length && list[n]![1] <= s) n++
    if (n < 2) return 0
    const [b0, d0] = list[n - 2]!
    const [b1, d1] = list[n - 1]!
    return d1 > d0 ? (b1 - b0) / (d1 - d0) : 0
  }
  const live: { g: GroupIx; real: number; painted: number; km: number; last: number }[] = []
  for (let g = 0; g < nVisible; g++) {
    if (diedSeen(g)) continue
    const list = marks[g] ?? []
    const n = visibleMarks(g)
    if (n === 0) {
      // antes de su primera marca: solo el de salida existe, en el km 0 con todo el reparto (3-f)
      if (g === 0) live.push({ g, real: 0, painted: -0.5, km: 0, last: -1 })
      continue
    }
    const speed = (j: number, s: Ds): number => {
      if (j >= 1) {
        const [b0, d0] = list[j - 1]!
        const [b1, d1] = list[j]!
        return d1 > d0 ? (b1 - b0) / (d1 - d0) : 0
      }
      return g === 0 ? 0 : originSpeed(originOf.get(g), s)
    }
    const reach = (j: number, s: Ds): number => {
      const [bj, dj] = list[j]!
      return Math.min(cap(bj), bj + speed(j, s) * (s - dj))
    }
    const lastIx = n - 1
    const real = reach(lastIx, S)
    let painted = real
    for (let j = 0; j < lastIx; j++) painted = Math.max(painted, reach(j, list[j + 1]![1]))
    live.push({ g, real, painted, km: Math.max(0, (painted + 0.5) * tl.dx), last: lastIx })
  }

  // 3. La composición: los de cada grupo en la foto de su bloque sin pintar (4-e).
  const membersOf = new Map<GroupIx, RiderIx[]>()
  for (const x of live) membersOf.set(x.g, [])
  const blockOf = new Map(live.map((x) => [x.g, Math.floor(x.real)] as const))
  for (let r = 0; r < tl.riderIds.length; r++) {
    if (current[r] === -1 && lastMove.get(r)?.to === -1) continue // fuera: su `out` se ve
    for (const x of live) {
      if (groupAtBlock(r, blockOf.get(x.g)!) === x.g) membersOf.get(x.g)!.push(r)
    }
  }

  // 5. El orden: por km pintado decreciente; a igual km, por la marca de su último km de foto y por id.
  const lastPhotoMark = (x: { g: GroupIx; last: number }): Ds => {
    if (x.last < 0) return 0
    const list = marks[x.g]!
    const bLast = list[x.last]![0]
    const kIx = upperBound(photoBlocks, bLast) - 1
    const k = kIx >= 0 ? photoBlocks[kIx]! : -1
    for (let j = x.last; j >= 0; j--) if (list[j]![0] === k) return list[j]![1]
    return list[x.last]![1]
  }
  live.sort(
    (a, b) =>
      b.km - a.km ||
      lastPhotoMark(a) - lastPhotoMark(b) ||
      (tl.groups[a.g]!.id < tl.groups[b.g]!.id
        ? -1
        : tl.groups[a.g]!.id > tl.groups[b.g]!.id
          ? 1
          : 0),
  )

  // 4. El tránsito (3-b): el que sale en dos grupos se pinta en el de atrás; el que no sale en
  //    ninguno y no se ha bajado, va de su grupo de antes a su destino.
  const inTransit: { rider: RiderIx; from: GroupIx; to: GroupIx; lastB: Block }[] = []
  const where = new Map<RiderIx, number[]>() // posiciones en `live` (orden de carretera)
  live.forEach((x, pos) => {
    for (const r of membersOf.get(x.g)!) (where.get(r) ?? where.set(r, []).get(r)!).push(pos)
  })
  for (const [r, poss] of where) {
    if (poss.length < 2) continue
    const behind = Math.max(...poss)
    const ahead = Math.min(...poss)
    for (const pos of poss) {
      if (pos === behind) continue
      const list = membersOf.get(live[pos]!.g)!
      list.splice(list.indexOf(r), 1)
    }
    const mv = lastMove.get(r)
    inTransit.push({
      rider: r,
      from: live[behind]!.g,
      to: live[ahead]!.g,
      lastB: mv?.b ?? 0,
    })
  }
  for (let r = 0; r < tl.riderIds.length; r++) {
    if (where.has(r)) continue
    const mv = lastMove.get(r)
    if (mv !== undefined && mv.to === -1) continue // se bajó
    const from = mv?.from ?? current[r]!
    const to = mv?.to ?? current[r]!
    inTransit.push({ rider: r, from, to, lastB: mv?.b ?? 0 })
  }
  inTransit.sort((a, b) => a.rider - b.rider)

  // 6. El pelotón: el del último `main` visto; si ya no vive, el primero vivo de su cadena de sucesores.
  const aliveSet = new Set(live.map((x) => x.g))
  let main: GroupIx | null = mainG
  const guard = new Set<GroupIx>()
  while (main !== null && !aliveSet.has(main) && !guard.has(main)) {
    const g: GroupIx = main
    guard.add(g)
    const entry: GroupCatalogEntry | undefined = g < nVisible ? tl.groups[g] : undefined
    main = entry !== undefined && diedSeen(g) ? entry.successor : null
  }
  if (main !== null && !aliveSet.has(main)) main = null

  // 7. El tipo, por la regla de kindOf con este orden y este pelotón.
  const kinds = kindsOf(
    live.map((x) => ({ g: x.g, km: x.km, origin: tl.groups[x.g]!.origin })),
    main,
  )

  const preds = new Map<GroupIx, GroupIx[]>()
  for (let g = 0; g < nVisible; g++) {
    const s = diedSeen(g) ? tl.groups[g]!.successor : null
    if (s !== null && s !== undefined) (preds.get(s) ?? preds.set(s, []).get(s)!).push(g)
  }

  return {
    S,
    order: live.map((x, i) => ({
      g: x.g,
      real: x.real,
      painted: x.painted,
      km: x.km,
      last: x.last,
      members: membersOf.get(x.g)!,
      kind: kinds[i]!,
    })),
    mainG: main,
    lastMove,
    outs,
    inTransit,
    originOf,
    bigMoves,
    preds,
    groupAtBlock,
  }
}

/** Los papeles crudos de §6.3 sobre lo que se ve a la hora S. */
function rawRoles(
  ix: LineIndex,
  S: Ds,
  photoBlocks: readonly Block[],
): ReadonlyMap<GroupIx, GroupRole> {
  let memo = rawRolesMemo.get(ix.root)
  if (memo === undefined) rawRolesMemo.set(ix.root, (memo = new Map()))
  const hit = memo.get(S)
  if (hit !== undefined) return hit
  const seen = seenAt(ix, S, photoBlocks)
  const racing = ix.tl.riderIds.length - seen.outs
  const roles = groupRoleOf(
    seen.order.map((x) => ({ size: x.members.length, kind: x.kind })),
    racing,
  )
  const out = new Map(seen.order.map((x, i) => [x.g, roles[i]!] as const))
  memo.set(S, out)
  return out
}

/**
 * EL CORTE DIAGONAL, causal: el instante a la hora t con lo que se ve hasta t (§4.5, §4.6). Pura.
 */
export function instantAt(tl: TimelineCore, t: RaceS, ctx: InstantContext): Instant {
  const ix = indexOf(tl)
  const S = toDs(t)
  const pb = ctx.photoBlocks
  const seen = seenAt(ix, S, pb)
  const { marks } = ix

  /** Su marca en el bloque, si se ve. */
  const markOf = (g: GroupIx, b: Block): Ds | null => {
    const list = marks[g] ?? []
    for (const [mb, d] of list) {
      if (mb === b) return d <= S ? d : null
      if (mb > b) break
    }
    return null
  }
  // La cabeza en cada km de foto: la menor marca vista, con máximo acumulado (C3).
  const headAt = new Map<Block, Ds>()
  let acc = 0
  for (const k of pb) {
    const at = ix.marksAt.get(k) ?? []
    let min: Ds | null = null
    for (const [, d] of at) if (d <= S && (min === null || d < min)) min = d
    if (min === null) break // nadie ha cruzado aún este km: tampoco los siguientes
    acc = Math.max(acc, min)
    headAt.set(k, acc)
  }
  const photoAtOrBefore = (b: Block): Block | null => {
    const k = upperBound(pb, b) - 1
    return k >= 0 ? pb[k]! : null
  }
  const kmOfPhoto = (k: Block): number => (k + 0.5) * ix.tl.dx
  const sizeAt = (g: GroupIx, b: Block): number => {
    let n = 0
    for (let r = 0; r < ix.tl.riderIds.length; r++) if (seen.groupAtBlock(r, b) === g) n++
    return n
  }
  /** g o, si no vivía en el km k, su antecesor más grande por la cadena de sucesores con marca allí. */
  const markOrAncestor = (g: GroupIx, k: Block): { g: GroupIx; d: Ds } | null => {
    const own = markOf(g, k)
    if (own !== null) return { g, d: own }
    let best: { g: GroupIx; d: Ds; size: number } | null = null
    const stack = [...(seen.preds.get(g) ?? [])]
    const visited = new Set<GroupIx>()
    while (stack.length > 0) {
      const p = stack.pop()!
      if (visited.has(p)) continue
      visited.add(p)
      const d = markOf(p, k)
      if (d !== null) {
        const size = sizeAt(p, k)
        if (best === null || size > best.size || (size === best.size && p < best.g))
          best = { g: p, d, size }
      } else stack.push(...(seen.preds.get(p) ?? []))
    }
    return best === null ? null : { g: best.g, d: best.d }
  }
  const toHeadAt = (d: Ds, k: Block): number => (d - (headAt.get(k) ?? d)) / 10
  const trendOf = (g: GroupIx, k: Block, nowS: number): GapTrend | null => {
    const back = photoAtOrBefore(k - Math.round(BROADCAST.trendWindowKm / ix.tl.dx))
    if (back === null || back < 0 || k - Math.round(BROADCAST.trendWindowKm / ix.tl.dx) < 0)
      return null
    const then = markOrAncestor(g, back)
    if (then === null) return null
    const deltaS = nowS - toHeadAt(then.d, back)
    const arrow =
      deltaS >= BROADCAST.trendMinS ? 'up' : deltaS <= -BROADCAST.trendMinS ? 'down' : 'flat'
    return { deltaS, windowKm: BROADCAST.trendWindowKm, arrow }
  }

  // 8. Los huecos: en el último km de foto que cada grupo ha cruzado (D-01, punto 4).
  const lastBlockOf = (x: Seen['order'][number]): Block | null =>
    x.last >= 0 ? marks[x.g]![x.last]![0] : null
  /** reading: su hueco; k: el km de foto de la lectura; own: si es suyo y no de su origen (3-e). */
  const gapOf = new Map<GroupIx, { reading: GapReading; k: Block | null; own: boolean }>()
  /** El hueco de un grupo en un km de foto concreto, sin tendencia ni el de delante. */
  const plainGap = (g: GroupIx, k: Block): GapReading | null => {
    const d = markOf(g, k)
    if (d === null) return null
    return { toHeadS: toHeadAt(d, k), toAheadS: null, atKm: kmOfPhoto(k), trend: null }
  }
  const startGap: GapReading = { toHeadS: 0, toAheadS: null, atKm: 0, trend: null }
  seen.order.forEach((x, i) => {
    const bn = lastBlockOf(x)
    const k = bn === null ? null : photoAtOrBefore(bn)
    const d = k === null ? null : markOf(x.g, k)
    if (k === null || d === null) {
      // 3-e: aún no ha cruzado un km de foto; el hueco de su origen en su último km antes de nacer
      const o = seen.originOf.get(x.g)
      const born = ix.tl.groups[x.g]!.bornB
      const ko = photoAtOrBefore(born - 1)
      const fromOrigin = o !== undefined && ko !== null ? plainGap(o, ko) : null
      gapOf.set(x.g, {
        reading: fromOrigin ?? startGap,
        k: fromOrigin === null ? null : ko,
        own: false,
      })
      return
    }
    const toHeadS = toHeadAt(d, k)
    const ahead = i > 0 ? seen.order[i - 1]! : null
    const da = ahead === null ? null : markOf(ahead.g, k)
    gapOf.set(x.g, {
      reading: {
        toHeadS,
        toAheadS: da === null ? null : (d - da) / 10,
        atKm: kmOfPhoto(k),
        trend: trendOf(x.g, k, toHeadS),
      },
      k,
      own: true,
    })
  })

  // 9. El papel, con la histéresis de 4-q: el crudo de ahora si es el de hace roleHysteresisKm de su
  //    marcha, si no hay con qué comparar o si un movimiento de más de un corredor le tocó entre medias.
  const rolesNow = groupRoleOf(
    seen.order.map((x) => ({ size: x.members.length, kind: x.kind })),
    ix.tl.riderIds.length - seen.outs,
  )
  const roleOf = (x: Seen['order'][number], i: number): GroupRole => {
    const now = rolesNow[i]!
    const gap = gapOf.get(x.g)
    // sin un km de foto propio (3-e) no hay marcha que medir: el papel de ahora
    const k = gap !== undefined && gap.own ? gap.k : null
    if (k === null) return now
    const back = photoAtOrBefore(k - Math.round(BROADCAST.roleHysteresisKm / ix.tl.dx))
    if (back === null || k - Math.round(BROADCAST.roleHysteresisKm / ix.tl.dx) < 0) return now
    const then = markOrAncestor(x.g, back)
    if (then === null) return now
    const thenRole = rawRoles(ix, then.d, pb).get(then.g)
    if (thenRole === undefined || thenRole === now) return now
    const touched = seen.bigMoves.some((m) => m.ds > then.d && m.touched.has(x.g))
    return touched ? now : thenRole
  }

  // 10. Lo demás: los maillots y los del espectador de cada grupo, la etiqueta, la diferencia
  //     principal, la general virtual y las pancartas reveladas.
  const leaders = ctx.start.leaders
  const groups: GroupNow[] = seen.order.map((x, i) => {
    const members = [...x.members].sort((a, b) => a - b)
    const jerseys = JERSEY_PRIORITY.filter((j) => {
      const holder = leaders[j]
      return holder !== null && members.includes(holder)
    })
    const role = roleOf(x, i)
    const gap = gapOf.get(x.g)!
    const ownK = gap.own ? gap.k : null
    const detailRows = ownK === null ? undefined : ix.tl.detail.get(ownK)
    const detailDs = ownK === null ? undefined : ix.vis.detailDs.get(ownK)
    const rowIx = detailRows?.findIndex((row) => row.g === x.g) ?? -1
    const detail =
      rowIx >= 0 && (detailDs?.[rowIx] ?? Number.POSITIVE_INFINITY) <= S
        ? detailRows![rowIx]!
        : null
    return {
      g: x.g,
      number: i + 1,
      role,
      label: groupLabelOf(members.length, members, jerseys, role, seen.order.length),
      kind: x.kind,
      km: x.km,
      size: members.length,
      members,
      gap: gap.reading,
      detail,
      jerseys,
      own: members.some((r) => ctx.own.has(r)),
    }
  })

  const markAtKm = (g: GroupNow, photoKm: number): number => {
    const k = Math.max(0, Math.round(photoKm / ix.tl.dx - 0.5))
    const d = markOf(g.g, k)
    if (d !== null) return d
    const o = seen.originOf.get(g.g)
    const od = o === undefined ? null : markOf(o, k)
    return od ?? (headAt.get(k) ?? 0) + g.gap.toHeadS * 10
  }
  const mainGap = mainGapOf(groups, ctx.start, markAtKm)

  const inTransit: InTransit[] = seen.inTransit.map((x) => {
    const inFrom = groups.find((g) => g.g === x.from)
    if (inFrom !== undefined && inFrom.members.includes(x.rider))
      return { rider: x.rider, from: x.from, to: x.to, gap: inFrom.gap }
    const k = photoAtOrBefore(x.lastB - 1)
    const gap = k === null ? null : plainGap(x.from, k)
    return { rider: x.rider, from: x.from, to: x.to, gap: gap ?? startGap }
  })

  const head = groups[0]
  const headKm = head?.km ?? 0
  const toGoKm = Math.max(0, ix.tl.lengthKm - headKm)
  const laps = ix.tl.profile.laps
  const racing = ix.tl.riderIds.length - seen.outs
  const banners = ix.tl.banners.filter((_, i) => ix.vis.bannerDs[i]! <= S)

  return {
    t,
    headKm,
    toGoKm,
    lapsToGo: laps > 1 ? Math.ceil(toGoKm / (ix.tl.lengthKm / laps)) : null,
    groups,
    inTransit,
    mainGap,
    banners,
    virtualGc: virtualGcOf(groups, inTransit, ctx.start, markAtKm),
    racing,
    gone: ix.tl.riderIds.length - racing,
  }
}

/**
 * LA GENERAL VIRTUAL (mapa 06 §3.3): la general de salida más el hueco en carretera de cada grupo al
 * del líder, en su último km de foto común. Solo si uno de los virtualGcTop primeros de salida va en
 * otro grupo que el líder a menos de virtualGcMaxS de él. Por tiempo virtual y, a igualdad, por puesto
 * de salida; las bonificaciones de meta se tratan como posibles y no se suman.
 */
function virtualGcOf(
  groups: readonly GroupNow[],
  inTransit: readonly InTransit[],
  start: StartState,
  markAt: (g: GroupNow, photoKm: number) => number,
): readonly VirtualGcRow[] | null {
  const top = start.gcTop.filter((r) => r.rank <= BROADCAST.virtualGcTop)
  const leader = top.find((r) => r.rank === 1)
  if (leader === undefined) return null
  const groupOfRider = (r: RiderIx): GroupNow | undefined =>
    groups.find((g) => g.members.includes(r)) ??
    groups.find((g) => g.g === inTransit.find((x) => x.rider === r)?.from)
  const lg = groupOfRider(leader.rider)
  if (lg === undefined) return null
  const rows: VirtualGcRow[] = []
  for (const r of top) {
    const g = groupOfRider(r.rider)
    if (g === undefined) continue
    let roadS = 0
    if (g.g !== lg.g) {
      const km = Math.min(g.gap.atKm, lg.gap.atKm)
      roadS = (markAt(g, km) - markAt(lg, km)) / 10
    }
    rows.push({ rider: r.rider, group: g.g, startRank: r.rank, virtualS: r.gapS + roadS })
  }
  const lv = rows.find((x) => x.rider === leader.rider)?.virtualS ?? 0
  const threat = rows.some(
    (x) =>
      x.rider !== leader.rider && x.group !== lg.g && x.virtualS - lv < BROADCAST.virtualGcMaxS,
  )
  if (!threat) return null
  return rows.sort((a, b) => a.virtualS - b.virtualS || a.startRank - b.startRank)
}
