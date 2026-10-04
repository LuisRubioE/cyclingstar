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
 * Nace en el PR 3a. En el 6a, dos cosas que la línea grabada pedía (notas 1 y 3 del 4b): una marca
 * que baja (el reloj de un grupo es el de su primero, y quien cae de un grupo de delante entra con el
 * suyo) se ve y se pinta con el máximo acumulado del reloj de su grupo, como la cabeza (C3), y su
 * reloj de verdad sigue dando el hueco; y el fotograma ya no rehace lo visto cruzando cada corredor
 * con cada grupo, sino con un índice por línea (sus cambios, por corredor, y las marcas, por grupo y
 * por bloque), para que B8 quepa: de 1 a 5 ms por llamada sobre las líneas grabadas a un p95 de
 * 0,06 a 0,1 ms, con el mismo resultado. `timeTrialInstantAt` (§9.3) llega en el 6b.
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

/**
 * Las marcas de un grupo, por bloque creciente: el reloj de verdad (`raw`, el de su primero al cruzar
 * el bloque, §3.4), que da los huecos, y la hora a la que se ve (`eff`, el máximo acumulado de `raw`,
 * de `visibilityOf`), que no decrece y da qué se ve y dónde se pinta (6a; nota 1 del 4b).
 */
interface GroupMarks {
  readonly b: readonly Block[]
  readonly raw: readonly Ds[]
  readonly eff: readonly Ds[]
  /**
   * `eff` no decrece. Solo no lo hace si la marca de su muerte, que se ve a su reloj, baja: entonces las
   * vistas son un prefijo mientras vive, pero no cuando ya ha muerto (su velocidad como origen, abajo).
   */
  readonly sorted: boolean
}

/** Las marcas de un bloque por la hora a la que se ven, con el menor reloj de las vistas hasta cada una: la cabeza (C3). */
interface BlockMarks {
  readonly eff: readonly Ds[]
  readonly minRaw: readonly Ds[]
}

/** Un cambio de grupo de un corredor: en qué bloque, adónde (−1 es su `out`) y desde qué hora se ve. */
interface RiderEntry {
  readonly b: Block
  readonly to: GroupIx
  readonly vis: Ds
}

/** Un corredor de un `move`, por la posición de su cambio en `entries[rider]`. */
interface MoveRef {
  readonly rider: RiderIx
  readonly entry: number
}

/** Un `move` de la línea, para la histéresis del papel (4-q): adónde, quiénes y la primera hora a la que se ve uno. */
interface MoveEvent {
  readonly to: GroupIx
  readonly refs: readonly MoveRef[]
  readonly vis1: Ds
}

/**
 * Lo que no depende de la hora y sí del calendario de fotos, que da el tope de la extrapolación: por
 * grupo, el máximo de lo pintado por cada marca hasta la siguiente (`pm[k]`, el de las marcas 1 a
 * k − 1; la 0 depende de su origen y se calcula aparte).
 */
interface PhotoCache {
  readonly reachMax: Map<GroupIx, number[]>
  /** por GroupIx: lo pintado por su primera marca hasta la segunda, válido desde `since` (depende de su origen) */
  readonly reach0: Map<GroupIx, { readonly since: Ds; readonly value: number }>
}

/**
 * Lo que el instante lee de una línea, calculado una vez por objeto. Con él, un fotograma no rehace lo
 * visto recorriendo cada corredor contra cada grupo: B8 pide su p95 por debajo de 0,25 ms (§16.4) y el
 * instante del 3a costaba de 1 a 5 ms por llamada sobre las líneas grabadas (6a).
 */
interface LineIndex {
  readonly tl: TimelineCore
  readonly vis: TimelineVisibility
  /** la línea entera de la que sale (cutRootOf): comparte con ella el memo de los papeles crudos */
  readonly root: TimelineCore
  /** por GroupIx */
  readonly marks: readonly GroupMarks[]
  /** por bloque con marcas */
  readonly marksAt: ReadonlyMap<Block, BlockMarks>
  /** por RiderIx: sus cambios de grupo y su `out`, en el orden de la línea, que es el de los bloques */
  readonly entries: readonly (readonly RiderEntry[])[]
  /** por RiderIx: la hora a la que se ve cada uno de sus cambios, en el mismo orden */
  readonly entryVis: readonly (readonly Ds[])[]
  /**
   * por RiderIx: si la hora a la que se ven sus cambios no decrece con el bloque. Casi siempre (en las
   * congeladas no la cumplen de 0 a 14 corredores por etapa): entonces lo visto es un prefijo y se busca
   * por bisección; si no, se recorre.
   */
  readonly monotone: readonly boolean[]
  /** los `main`, en el orden de la línea, con su hora; y el mínimo de la hora de cada sufijo */
  readonly mains: readonly { readonly group: GroupIx | null; readonly vis: Ds }[]
  readonly mainsSufMin: readonly Ds[]
  /** los `move`, por su primera hora */
  readonly moves: readonly MoveEvent[]
  readonly movesVis1: readonly Ds[]
  /** por GroupIx: los cambios que entran en él en su bloque de nacimiento (su origen, 3-a) */
  readonly births: readonly (readonly MoveRef[])[]
  /**
   * por GroupIx: su origen, ya fijo desde `since`: cuando se ven todos los que entran en él al nacer y
   * ninguno de ellos ve sus cambios fuera de orden, lo visto después no lo cambia.
   */
  readonly originCache: Map<GroupIx, { readonly since: Ds; readonly origin: GroupIx | undefined }>
  readonly byPhotos: WeakMap<readonly Block[], PhotoCache>
}

const indexes = new WeakMap<TimelineCore, LineIndex>()

function indexOf(tl: TimelineCore): LineIndex {
  const hit = indexes.get(tl)
  if (hit !== undefined) return hit
  const vis = visibilityOf(tl)
  const nG = tl.groups.length
  const mb: Block[][] = Array.from({ length: nG }, () => [])
  const mr: Ds[][] = Array.from({ length: nG }, () => [])
  const me: Ds[][] = Array.from({ length: nG }, () => [])
  const at = new Map<Block, [Ds, Ds][]>()
  const entries: RiderEntry[][] = tl.riderIds.map(() => [])
  const mains: { group: GroupIx | null; vis: Ds }[] = []
  const moves: MoveEvent[] = []
  const births: MoveRef[][] = Array.from({ length: nG }, () => [])
  tl.stateEvents.forEach((e, i) => {
    switch (e.t) {
      case 'clock': {
        const seenAt = vis.clockMarkDs[i] ?? []
        e.marks.forEach(([g, raw], j) => {
          const eff = seenAt[j] ?? raw
          ;(mb[g] ??= []).push(e.b)
          ;(mr[g] ??= []).push(raw)
          ;(me[g] ??= []).push(eff)
          let list = at.get(e.b)
          if (list === undefined) at.set(e.b, (list = []))
          list.push([eff, raw])
        })
        return
      }
      case 'out':
        entries[e.rider]?.push({ b: e.b, to: -1, vis: vis.stateEventDs[i]! })
        return
      case 'move': {
        const per = vis.moveRiderDs[i] ?? []
        const refs: MoveRef[] = []
        e.riders.forEach((r, j) => {
          const list = entries[r]
          if (list === undefined) return
          list.push({ b: e.b, to: e.to, vis: per[j] ?? Number.POSITIVE_INFINITY })
          refs.push({ rider: r, entry: list.length - 1 })
        })
        let vis1 = Number.POSITIVE_INFINITY
        for (const d of per) if (d < vis1) vis1 = d
        moves.push({ to: e.to, refs, vis1 })
        if (e.to < nG && tl.groups[e.to]!.bornB === e.b) births[e.to]!.push(...refs)
        return
      }
      case 'main':
        mains.push({ group: e.group, vis: vis.stateEventDs[i]! })
        return
      default:
        return
    }
  })
  const marksAt = new Map<Block, BlockMarks>()
  for (const [b, list] of at) {
    list.sort((x, y) => x[0] - y[0] || x[1] - y[1])
    let min = Number.POSITIVE_INFINITY
    const minRaw = list.map(([, raw]) => (min = Math.min(min, raw)))
    marksAt.set(b, { eff: list.map(([eff]) => eff), minRaw })
  }
  const mainsSufMin: Ds[] = new Array<Ds>(mains.length)
  let suf = Number.POSITIVE_INFINITY
  for (let i = mains.length - 1; i >= 0; i--) mainsSufMin[i] = suf = Math.min(suf, mains[i]!.vis)
  moves.sort((x, y) => x.vis1 - y.vis1)
  const out: LineIndex = {
    tl,
    vis,
    root: cutRootOf(tl),
    marks: mb.map((b, g) => {
      const eff = me[g] ?? []
      return { b, raw: mr[g] ?? [], eff, sorted: eff.every((d, j) => j === 0 || d >= eff[j - 1]!) }
    }),
    marksAt,
    entries,
    entryVis: entries.map((list) => list.map((x) => x.vis)),
    monotone: entries.map((list) => list.every((x, k) => k === 0 || x.vis >= list[k - 1]!.vis)),
    mains,
    mainsSufMin,
    moves,
    movesVis1: moves.map((m) => m.vis1),
    births,
    originCache: new Map(),
    byPhotos: new WeakMap(),
  }
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

/** La primera posición de una lista ordenada con valor ≥ x (búsqueda binaria). */
function lowerBound(xs: readonly number[], x: number): number {
  let lo = 0
  let hi = xs.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (xs[mid]! < x) lo = mid + 1
    else hi = mid
  }
  return lo
}

/**
 * Hasta qué bloque llega la marca j de un grupo a la hora s: su bloque más su velocidad por el tiempo
 * desde que se ve, sin pasar de la foto siguiente (`cap`). La velocidad es la de la marca anterior a la
 * siguiente, o, en la primera, la de su grupo de origen (3-a, `speed0`). Todo con la hora a la que se
 * ve cada marca, que no decrece: un grupo nunca va hacia atrás.
 */
function reachOf(
  m: GroupMarks,
  j: number,
  s: Ds,
  cap: (b: Block) => number,
  speed0: (s: Ds) => number,
): number {
  const bj = m.b[j]!
  const dj = m.eff[j]!
  let speed: number
  if (j >= 1) {
    const d0 = m.eff[j - 1]!
    speed = dj > d0 ? (bj - m.b[j - 1]!) / (dj - d0) : 0
  } else speed = speed0(s)
  return Math.min(cap(bj), bj + speed * (s - dj))
}

/** El máximo de lo pintado por las marcas 1 a k − 1 de un grupo, cada una hasta la siguiente (no depende de la hora). */
function reachMaxOf(
  cache: PhotoCache,
  g: GroupIx,
  m: GroupMarks,
  k: number,
  cap: (b: Block) => number,
): number {
  let pm = cache.reachMax.get(g)
  if (pm === undefined)
    cache.reachMax.set(g, (pm = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]))
  while (pm.length <= k) {
    const j = pm.length - 1
    pm.push(
      Math.max(
        pm[j]!,
        reachOf(m, j, m.eff[j + 1]!, cap, () => 0),
      ),
    )
  }
  return pm[k]!
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
  readonly outs: number
  readonly inTransit: readonly {
    readonly rider: RiderIx
    readonly from: GroupIx
    readonly to: GroupIx
    readonly lastB: Block
  }[]
  /** el grupo de origen de un grupo (3-a): el de la mayoría de los que entran en él al nacer */
  readonly originOf: (g: GroupIx) => GroupIx | undefined
  /** ¿le tocó a g un movimiento de más de un corredor que se ve después de `since`? (la histéresis, 4-q) */
  readonly touchedSince: (g: GroupIx, since: Ds) => boolean
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
  const { tl, vis, marks, entries, monotone } = ix
  const nR = tl.riderIds.length
  const nG = tl.groups.length
  // 1. Los grupos que se ven (un prefijo, 4-a) y los vivos.
  let nVisible = 0
  while (nVisible < nG && vis.groupBornDs[nVisible]! <= S) nVisible++
  const diedSeen = (g: GroupIx): boolean => {
    const d = vis.groupDiedDs[g] ?? null
    return d !== null && d <= S
  }

  // Lo visto de cada corredor, en el orden de la línea: el último de sus cambios que se ve. Su grupo al
  // final de un bloque es el de su último cambio visto de ese bloque o anterior; el grupo que deja un
  // cambio, el del cambio visto anterior (o el de salida).
  const last = new Int32Array(nR)
  for (let r = 0; r < nR; r++) {
    const list = entries[r]!
    if (monotone[r]) last[r] = upperBound(ix.entryVis[r]!, S) - 1
    else {
      let k = -1
      for (let i = 0; i < list.length; i++) if (list[i]!.vis <= S) k = i
      last[r] = k
    }
  }
  const prevSeen = (r: RiderIx, i: number): number => {
    if (monotone[r]) return i - 1
    const list = entries[r]!
    for (let j = i - 1; j >= 0; j--) if (list[j]!.vis <= S) return j
    return -1
  }
  const toOf = (r: RiderIx, i: number): GroupIx => (i < 0 ? 0 : entries[r]![i]!.to)
  const groupAtBlock = (r: RiderIx, b: Block): GroupIx => {
    const k = last[r]!
    if (k < 0) return 0
    const list = entries[r]!
    if (monotone[r]) {
      let lo = 0
      let hi = k + 1
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (list[mid]!.b <= b) lo = mid + 1
        else hi = mid
      }
      return lo === 0 ? 0 : list[lo - 1]!.to
    }
    for (let j = k; j >= 0; j--) {
      const x = list[j]!
      if (x.vis <= S && x.b <= b) return x.to
    }
    return 0
  }
  const lastMoveOf = (r: RiderIx): { b: Block; from: GroupIx; to: GroupIx } | undefined => {
    const k = last[r]!
    if (k < 0) return undefined
    const x = entries[r]![k]!
    return { b: x.b, from: toOf(r, prevSeen(r, k)), to: x.to }
  }
  let outs = 0
  for (let r = 0; r < nR; r++) {
    const k = last[r]!
    if (k >= 0 && entries[r]![k]!.to === -1) outs += 1
  }
  // El último `main` visto, en el orden de la línea: el mayor índice con hora ≤ S.
  let mainG: GroupIx | null = 0
  const lastMain = upperBound(ix.mainsSufMin, S) - 1
  if (lastMain >= 0) mainG = ix.mains[lastMain]!.group

  // El origen de cada grupo (3-a), cuando se pide: el grupo que dejan la mayoría de los que entran en
  // él en su bloque de nacimiento; a igualdad, el de menor índice.
  const origins = new Map<GroupIx, GroupIx | undefined>()
  const originOf = (g: GroupIx): GroupIx | undefined => {
    const fixed = ix.originCache.get(g)
    if (fixed !== undefined && S >= fixed.since) return fixed.origin
    if (origins.has(g)) return origins.get(g)
    const counts = new Map<GroupIx, number>()
    let since = Number.NEGATIVE_INFINITY
    let settled = true
    for (const ref of ix.births[g] ?? []) {
      const vis = entries[ref.rider]![ref.entry]!.vis
      if (vis > S) {
        settled = false
        continue
      }
      since = Math.max(since, vis)
      if (!monotone[ref.rider]) settled = false
      const from = toOf(ref.rider, prevSeen(ref.rider, ref.entry))
      counts.set(from, (counts.get(from) ?? 0) + 1)
    }
    let best: GroupIx | undefined
    let bestN = -1
    for (const [from, n] of [...counts].sort((x, y) => x[0] - y[0]))
      if (n > bestN && from >= 0) {
        best = from
        bestN = n
      }
    origins.set(g, best)
    if (settled) ix.originCache.set(g, { since, origin: best })
    return best
  }

  // 2. La posición de cada grupo vivo (D-04, 3-a, 3-f), con la hora a la que se ve cada marca.
  const cap = (b: Block): number => {
    const k = upperBound(photoBlocks, b)
    return k < photoBlocks.length ? photoBlocks[k]! : tl.blocks - 1
  }
  /** Las dos últimas marcas de o vistas a la hora s, como velocidad en bloques por décima; 0 sin dos. */
  const originSpeed = (o: GroupIx | undefined, s: Ds): number => {
    const m = o === undefined ? undefined : marks[o]
    if (m === undefined) return 0
    let i0 = -1
    let i1 = -1
    if (m.sorted) {
      i1 = upperBound(m.eff, s) - 1
      i0 = i1 - 1
    } else
      for (let j = 0; j < m.eff.length; j++)
        if (m.eff[j]! <= s) {
          i0 = i1
          i1 = j
        }
    if (i0 < 0) return 0
    const d0 = m.eff[i0]!
    const d1 = m.eff[i1]!
    return d1 > d0 ? (m.b[i1]! - m.b[i0]!) / (d1 - d0) : 0
  }
  let cache = ix.byPhotos.get(photoBlocks)
  if (cache === undefined)
    ix.byPhotos.set(photoBlocks, (cache = { reachMax: new Map(), reach0: new Map() }))
  /** Lo pintado por la primera marca de g hasta la segunda: fijo en cuanto su origen lo es. */
  const reach0Of = (g: GroupIx, m: GroupMarks, speed0: (s: Ds) => number): number => {
    const hit = cache.reach0.get(g)
    if (hit !== undefined && S >= hit.since) return hit.value
    const value = reachOf(m, 0, m.eff[1]!, cap, speed0)
    const fixed = g === 0 ? { since: Number.NEGATIVE_INFINITY } : ix.originCache.get(g)
    if (fixed !== undefined && S >= fixed.since)
      cache.reach0.set(g, { since: Math.max(fixed.since, m.eff[1]!), value })
    return value
  }
  const live: { g: GroupIx; real: number; painted: number; km: number; last: number }[] = []
  for (let g = 0; g < nVisible; g++) {
    if (diedSeen(g)) continue
    const m = marks[g]
    // vivo, sus marcas vistas son un prefijo: la de su muerte, la única que puede no seguir el orden, no se ve aún
    let n = 0
    if (m !== undefined && m.sorted) n = upperBound(m.eff, S)
    else if (m !== undefined) while (n < m.eff.length && m.eff[n]! <= S) n++
    if (m === undefined || n === 0) {
      // antes de su primera marca: solo el de salida existe, en el km 0 con todo el reparto (3-f)
      if (g === 0) live.push({ g, real: 0, painted: -0.5, km: 0, last: -1 })
      continue
    }
    const speed0 = (s: Ds): number => (g === 0 ? 0 : originSpeed(originOf(g), s))
    const lastIx = n - 1
    const real = reachOf(m, lastIx, S, cap, speed0)
    let painted = real
    if (lastIx >= 1) {
      painted = Math.max(painted, reach0Of(g, m, speed0))
      painted = Math.max(painted, reachMaxOf(cache, g, m, lastIx, cap))
    }
    live.push({ g, real, painted, km: Math.max(0, (painted + 0.5) * tl.dx), last: lastIx })
  }

  // 3. La composición: los de cada grupo en la foto de su bloque sin pintar (4-e). Por corredor, cada
  //    tramo de bloques en que lo visto le pone en un grupo vivo cuenta si contiene el bloque de ese grupo.
  const membersOf: RiderIx[][] = []
  const blockOfLive = new Int32Array(nG).fill(-1)
  for (const x of live) {
    membersOf[x.g] = []
    blockOfLive[x.g] = Math.floor(x.real)
  }
  /** r es de h si el bloque de h cae en [lo, hi). */
  const claim = (r: RiderIx, h: GroupIx, lo: Block, hi: Block): void => {
    if (h < 0 || h >= nG) return
    const B = blockOfLive[h]!
    if (B >= 0 && B >= lo && B < hi) membersOf[h]!.push(r)
  }
  for (let r = 0; r < nR; r++) {
    const k = last[r]!
    const list = entries[r]!
    if (k >= 0 && list[k]!.to === -1) continue // fuera: su `out` se ve
    let cur: GroupIx = 0
    let lo: Block = 0
    for (let i = 0; i <= k; i++) {
      const x = list[i]!
      if (x.vis > S) continue
      claim(r, cur, lo, x.b)
      cur = x.to
      lo = x.b
    }
    claim(r, cur, lo, Number.POSITIVE_INFINITY)
  }

  // 5. El orden: por km pintado decreciente; a igual km, por la marca de su último km de foto y por id.
  const lastPhotoMark: Ds[] = []
  for (const x of live) {
    if (x.last < 0) {
      lastPhotoMark[x.g] = 0
      continue
    }
    const m = marks[x.g]!
    const kIx = upperBound(photoBlocks, m.b[x.last]!) - 1
    const k = kIx >= 0 ? photoBlocks[kIx]! : -1
    let d = m.raw[x.last]!
    for (let j = x.last; j >= 0 && m.b[j]! >= k; j--)
      if (m.b[j] === k) {
        d = m.raw[j]!
        break
      }
    lastPhotoMark[x.g] = d
  }
  live.sort(
    (a, b) =>
      b.km - a.km ||
      lastPhotoMark[a.g]! - lastPhotoMark[b.g]! ||
      (tl.groups[a.g]!.id < tl.groups[b.g]!.id
        ? -1
        : tl.groups[a.g]!.id > tl.groups[b.g]!.id
          ? 1
          : 0),
  )

  // 4. El tránsito (3-b): el que sale en dos grupos se pinta en el de atrás; el que no sale en
  //    ninguno y no se ha bajado, va de su grupo de antes a su destino. Por corredor, en cuántos grupos
  //    sale y el primero y el último de ellos en orden de carretera.
  const count = new Int32Array(nR)
  const firstPos = new Int32Array(nR)
  const lastPos = new Int32Array(nR)
  let doubled = false
  live.forEach((x, pos) => {
    for (const r of membersOf[x.g]!) {
      const n = count[r]!
      if (n === 0) firstPos[r] = pos
      else doubled = true
      count[r] = n + 1
      lastPos[r] = pos
    }
  })
  if (doubled)
    live.forEach((x, pos) => {
      const list = membersOf[x.g]!
      if (list.some((r) => count[r]! > 1 && lastPos[r] !== pos))
        membersOf[x.g] = list.filter((r) => count[r]! < 2 || lastPos[r] === pos)
    })
  const inTransit: { rider: RiderIx; from: GroupIx; to: GroupIx; lastB: Block }[] = []
  for (let r = 0; r < nR; r++) {
    const n = count[r]!
    if (n === 1) continue
    const mv = lastMoveOf(r)
    if (n > 1) {
      inTransit.push({
        rider: r,
        from: live[lastPos[r]!]!.g,
        to: live[firstPos[r]!]!.g,
        lastB: mv?.b ?? 0,
      })
      continue
    }
    if (mv !== undefined && mv.to === -1) continue // se bajó
    const cur = toOf(r, last[r]!)
    inTransit.push({ rider: r, from: mv?.from ?? cur, to: mv?.to ?? cur, lastB: mv?.b ?? 0 })
  }

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

  /** Los movimientos de más de un corredor vistos, que tocan a g (adonde van o de donde sale uno), vistos después de `since`. */
  const touchedSince = (g: GroupIx, since: Ds): boolean => {
    for (let i = upperBound(ix.movesVis1, since); i < ix.moves.length; i++) {
      const m = ix.moves[i]!
      if (m.vis1 > S) break
      let seen = 0
      let touched = m.to === g
      for (const ref of m.refs) {
        if (entries[ref.rider]![ref.entry]!.vis > S) continue
        seen += 1
        if (!touched && toOf(ref.rider, prevSeen(ref.rider, ref.entry)) === g) touched = true
      }
      if (seen > 1 && touched) return true
    }
    return false
  }

  return {
    S,
    order: live.map((x, i) => ({
      g: x.g,
      real: x.real,
      painted: x.painted,
      km: x.km,
      last: x.last,
      members: membersOf[x.g]!,
      kind: kinds[i]!,
    })),
    mainG: main,
    outs,
    inTransit,
    originOf,
    touchedSince,
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

  /** Su marca en el bloque, con su reloj de verdad, si se ve. */
  const markOf = (g: GroupIx, b: Block): Ds | null => {
    const m = marks[g]
    if (m === undefined) return null
    const j = lowerBound(m.b, b)
    if (j >= m.b.length || m.b[j] !== b) return null
    return m.eff[j]! <= S ? m.raw[j]! : null
  }
  // La cabeza en cada km de foto: la menor marca vista, con máximo acumulado (C3).
  const headAt = new Map<Block, Ds>()
  let acc = 0
  for (const k of pb) {
    const at = ix.marksAt.get(k)
    const n = at === undefined ? 0 : upperBound(at.eff, S)
    if (at === undefined || n === 0) break // nadie ha cruzado aún este km: tampoco los siguientes
    acc = Math.max(acc, at.minRaw[n - 1]!)
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
    x.last >= 0 ? marks[x.g]!.b[x.last]! : null
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
      const o = seen.originOf(x.g)
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
    return seen.touchedSince(x.g, then.d) ? now : thenRole
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
    const o = seen.originOf(g.g)
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
