/**
 * EL GRABADOR DE LA LÍNEA TEMPORAL (E2, docs/retransmision.md §4.3, §5.4 y §5.5; D-02, D-12, D-13).
 *
 * La retransmisión se monta sobre una línea temporal de la etapa (§4.2): el catálogo de grupos, la
 * pertenencia completa cada `TIMELINE.keyPhotoKm` km, los sucesos de estado de cada bloque, las marcas
 * de reloj, los sucesos narrables con el bloque en que se emitieron y la hora a la que se enseñan, la
 * capa de detalle de la radio, las pancartas, la traza de la crono y la meta. Todo eso el motor ya lo
 * ve al correr la etapa y lo tira; este fichero lo graba a través de la sonda (`StageProbe` y sus tres
 * ganchos de §5.2), sin cambiar un solo resultado: el grabador no tira dados, no devuelve nada al motor
 * y no toca lo que recibe (B11, `timeline.test.ts`).
 *
 * Es puro como `raceRadio.ts`: no lee reloj ni azar y no importa Node (el gzip es de `packages/db`). Usa
 * de `@cyclingstar/shared` los tipos de §4, el reductor (`photoAt`, `clockMarksOf`, `clockOfMarks`) y la
 * regla de revelado (`revealSOf`), nunca `BROADCAST` ni `SPOILER` (15-b). Guarda en memoria la foto
 * anterior y la actual, no la etapa (D-02): lo que acumula son las diferencias, que es lo que se escribe,
 * más un reloj de cabeza por bloque para fechar los sucesos.
 *
 * Nace en el PR 4b sin llamador en producción: `packages/db/src/timelines.ts` (`startStageTimeline`, el
 * colector aparte de §5.3) lo engancha, y el paso 5 lo conecta al tick. Si al grabar algo no cuadra,
 * lanza `TimelineFormatError` y la etapa se queda sin línea, con su lápida y su nota (D-12, §5.5).
 */
import type {
  BannerResult,
  Block,
  Ds,
  GroupCatalogEntry,
  GroupDetail,
  GroupIx,
  GroupOrigin,
  KeyPhoto,
  MishapKind,
  ProfileStrip,
  PullMotive,
  RaceS,
  RadioGroupKind,
  RecorderView,
  RiderIx,
  StageTimeline,
  StageWeather,
  StateEvent,
  TimeTrialTrace,
  TimelineCast,
  TimelineCore,
  TimelineEvent,
} from '@cyclingstar/shared'
import {
  TimelineFormatError,
  clockMarksOf,
  clockOfMarks,
  fromDs,
  fromKm10,
  photoAt,
  revealSOf,
  toDs,
  toKm10,
} from '@cyclingstar/shared'
import { ENGINE_VERSION, STAGE, TIMELINE } from '../constants.js'
import { STAGE_FEATURES } from '../routes/stageFeatures.js'
import { altitudesDelPerfil } from '../stage/citas.js'
import { mainGroupId } from '../stage/group.js'
import { sampleProfile, stageLengthKm } from '../stage/sample.js'
import { type StartOrderPlan, timeTrialStartOrder } from '../stage/startOrder.js'
import { ttSplitChecksOf } from '../stage/timetrial.js'
import type {
  BannerType,
  PullMotive as EnginePullMotive,
  Incident,
  ProbeBanner,
  ProbeTimeTrialRide,
  RaceEvent,
  SnapshotRider,
  StageInput,
  StageOutput,
  StageProbe,
  StageProfile,
} from '../stage/types.js'
import {
  bearingAt,
  roadBearings,
  stageWeather,
  stageWindStrength,
  weatherAt,
  weatherPlan,
  windComponents,
} from '../stage/weather.js'
import {
  type RaceRadio,
  type RadioGroupKind as EngineRadioGroupKind,
  STORED_PULLERS_MAX,
  radioGroupDetails,
  radioKmFrom,
} from './raceRadio.js'

// ================================================================ LA GUARDA DE TIPOS (§4.3; I-17, H-13)

/**
 * Qué hace el grabador con cada campo de la foto. Si `SnapshotRider` gana o pierde uno, esto no compila
 * y quien lo toca decide aquí si la línea lo guarda (con un `TIMELINE.format` nuevo y su decodificador)
 * o lo ignora: el motor cambia cada pocos días y la línea guardada no se reescribe.
 */
export const SNAPSHOT_FIELDS = {
  /** a RiderIx por riderIds */
  riderId: 'rider',
  /** a GroupIx por el catálogo: nacimientos, muertes, move y out */
  groupId: 'group',
  /** la marca de reloj del grupo: el mínimo de los suyos (raceRadio.ts, radioKmFrom) */
  tS: 'clock',
  /** la tele no enseña depósitos; la radio guardada tampoco (energyPct no pasa a StoredRadioGroup) */
  energy: 'ignored',
  energy0: 'ignored',
  /** capa de detalle, solo en los bloques de radioKmPoints (D-08) */
  pulling: 'detail',
  pullMotive: 'detail',
  pullFor: 'detail',
  /** ordena a los relevistas (radioKmFrom) */
  pullWindow: 'detail',
} as const satisfies Record<keyof SnapshotRider, 'rider' | 'group' | 'clock' | 'detail' | 'ignored'>

/** Cada método de `StageProbe`, con el uso que le da el grabador; uno nuevo en la sonda obliga a decidir aquí. */
export const PROBE_HOOKS = {
  /** el centro de CADA bloque, por el colector aparte (D-08, §5.3) */
  atKm: 'every_block',
  onSnapshot: 'photo',
  /** §5.2 */
  onEvent: 'emit_block',
  /** §5.2 */
  onBanner: 'banner',
  /** §5.2, §9.2 */
  onTimeTrialRide: 'tt_trace',
} as const satisfies Record<keyof StageProbe, string>

/** Iguales en los dos sentidos (el patrón del test de `PullMotive` de la API). */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

/**
 * Los vocabularios que la línea guarda como CADENA, iguales en el motor y en `shared`. No se lee nunca
 * en ejecución: existe para que `pnpm typecheck` compare las uniones junto al código que depende de ellas.
 */
export const CODES_MATCH = {
  mishap: true,
  motive: true,
  kind: true,
  banner: true,
} as const satisfies {
  mishap: Same<MishapKind, Incident['tipo']>
  motive: Same<PullMotive, EnginePullMotive>
  kind: Same<RadioGroupKind, EngineRadioGroupKind>
  banner: Same<BannerResult['kind'], BannerType>
}

/**
 * Del prefijo del id de un grupo a su origen (`peloton`, `mov-N` y `shed-N` en `simulate.ts`). Un
 * prefijo que no esté aquí hace lanzar `TimelineFormatError` al grabar, y B11 lo ve en los bancos.
 */
export const ORIGIN_OF_PREFIX: readonly (readonly [string, GroupOrigin])[] = [
  ['peloton', 'start'],
  ['mov-', 'attack'],
  ['shed-', 'shed'],
]

function originOf(id: string): GroupOrigin {
  for (const [prefix, origin] of ORIGIN_OF_PREFIX) if (id.startsWith(prefix)) return origin
  throw new TimelineFormatError(`grabador: el grupo «${id}» no tiene un prefijo conocido`)
}

// ===================================================================== LO QUE EL GRABADOR RECIBE (§5.4)

/** Lo que el grabador necesita saber de la etapa antes de que corra. */
export interface TimelineRecorderOptions {
  /** `Math.round(lengthKm / dx)`, los de `sampleProfile` */
  readonly blocks: number
  /** `STAGE.dx` */
  readonly dx: number
  /** `stageLengthKm(profile)`: las fotos clave, el último km y la meta de la crono */
  readonly lengthKm: number
  /** en crono no llegan fotos: solo la traza */
  readonly timeTrial: boolean
  /** `photoBlocksOf(lengthKm, dx)`: la capa de detalle y las fotos de I1 */
  readonly radioBlocks: ReadonlySet<Block>
  /** por RiderIx: el orden de `stage_snapshots.input.riders` (dorsal y luego id, `stageRun.ts`) */
  readonly riderIds: readonly string[]
}

/** Lo que el cierre necesita y el motor no ve. Lo arma `packages/db` con lo que ya tiene al correr la etapa (§5.5). */
export interface RecorderFinishInput {
  /** la entrada congelada: el orden de salida de la crono (`timeTrialStartOrder`) */
  readonly input: StageInput
  /** `events`, `results` e `incidents`, tal cual */
  readonly output: StageOutput
  /** la radio COMPLETA que el colector ya construye (`radio.radio({ incidents })`); null en crono */
  readonly radio: RaceRadio | null
  /**
   * `buildTimelineCast` (packages/db, D-15, paso 5), con los favoritos (§4.2, 8-g) de los atributos que
   * `runOneStage` leyó al empezar, antes de que el aprendizaje los reescriba.
   */
  readonly cast: TimelineCast
  /** `profileStripOf`, abajo */
  readonly profile: ProfileStrip
  /** `freezeStageWeather`, abajo: el `StageWeather` de §4.2, no el del motor */
  readonly weather: StageWeather
}

/** EL GRABADOR (D-02). Sus cuatro métodos son cierres sin `this`: el colector aparte (§5.3) los pasa sueltos. */
export interface TimelineRecorder extends Required<Omit<StageProbe, 'atKm'>> {
  /** Las fotos del motor en los bloques de radioKmPoints, por referencia: las que compara `selfCheckI1`. */
  readonly kmPhotos: ReadonlyMap<Block, readonly SnapshotRider[]>
  /**
   * Cierra la línea. Lanza `TimelineFormatError` si faltó la foto de un bloque, si un id de grupo no
   * tiene prefijo conocido, si hay más de 255 grupos, si la radio no casa con los bloques de foto o si
   * el reparto no es el de la salida. No escribe nada: eso es de `packages/db` (§5.6).
   */
  finish(input: RecorderFinishInput): StageTimeline
}

/** Lo que `selfCheckI1` devuelve por cada diferencia (§4.4); vacío si I1 se cumple. */
export interface I1Mismatch {
  /** bloque de la foto de km */
  readonly b: Block
  /** su km, para la nota de tick_log `timeline I1: <raceKey> e<N> km <k>` (D-12) */
  readonly km: number
  readonly field: 'order' | 'members' | 'size' | 'kind' | 'gapS' | 'racing' | 'gone' | 'mainId'
  /** id del motor del grupo afectado; null en racing, gone y mainId */
  readonly group: string | null
  /** lo que da radioKmFrom sobre la foto del motor, en pocas letras */
  readonly expected: string
  /** lo que da la línea reducida */
  readonly got: string
}

// ====================================================================== LA CRONO: LA TRAZA (§9.2)

/** Lo que el grabador se queda de cada corredor de una crono, ya convertido, durante su `onTimeTrialRide`. */
export interface TimeTrialRideTrace {
  readonly startDs: Ds
  readonly kmClockDs: readonly Ds[]
  readonly checkClockDs: readonly Ds[]
  readonly mishap: {
    readonly km: number
    readonly kind: MishapKind
    readonly lostDs: Ds
  } | null
}

/**
 * Los bloques en cuyo final se apunta el reloj propio de cada corredor de una crono: el último de cada
 * km entero y, si la etapa no acaba en km entero, el último (la meta). Con 260 bloques, 26 entradas; con
 * 263, 27 (§9.2).
 */
export function ttKmBlocksOf(blocks: number, dx: number): readonly Block[] {
  const perKm = Math.round(1 / dx)
  const out: Block[] = []
  for (let k = 1; k <= Math.floor(blocks / perKm); k++) out.push(perKm * k - 1)
  if (out[out.length - 1] !== blocks - 1) out.push(blocks - 1)
  return out
}

/**
 * LA TRAZA DE UN CORREDOR (§9.2, decisiones 9-a y 9-b), leída DURANTE la llamada: el motor no copia
 * `raw`. En cada km entero, `toDs(raw · noise)`; en meta, `10 · Math.round(totalS)`, que es el `tiempoS`
 * de `results` por diez, con el percance dentro (I5 es así una igualdad); en cada control, `10 ·
 * Math.round(raw[idx] · noise)`, el entero que compara `bestChain` y escribe `tt_split`; y el percance,
 * con el km del motor y la pérdida con ruido.
 */
export function ttRideTraceOf(
  ride: ProbeTimeTrialRide,
  blocks: number,
  dx: number,
  lengthKm: number,
): TimeTrialRideTrace {
  if (ride.raw.length !== blocks)
    throw new TimelineFormatError(
      `grabador: la traza de ${ride.riderId} tiene ${ride.raw.length} bloques de ${blocks}`,
    )
  const kmBlocks = ttKmBlocksOf(blocks, dx)
  return {
    startDs: toDs(ride.startS),
    kmClockDs: kmBlocks.map((b, j) =>
      j === kmBlocks.length - 1 ? 10 * Math.round(ride.totalS) : toDs(ride.raw[b]! * ride.noise),
    ),
    checkClockDs: ttSplitChecksOf(blocks, Math.round(lengthKm)).map(
      ({ idx }) => 10 * Math.round(ride.raw[idx]! * ride.noise),
    ),
    mishap:
      ride.mishap === null
        ? null
        : {
            km: ride.mishap.km,
            kind: ride.mishap.kind,
            lostDs: toDs(ride.mishap.lostS * ride.noise),
          },
  }
}

/** `TimeTrialTrace` (§4.2) sobre las trazas de todos, por RiderIx, y el plan de la rampa. */
export function ttTraceOf(
  traces: readonly TimeTrialRideTrace[],
  plan: StartOrderPlan,
  blocks: number,
  dx: number,
  lengthKm: number,
): TimeTrialTrace {
  return {
    order: plan.mode === 'general' ? 'gc' : 'bib',
    intervalS: plan.intervalS,
    checksKm: ttSplitChecksOf(blocks, Math.round(lengthKm)).map(({ idx }) =>
      fromKm10(toKm10((idx + 1) * dx)),
    ),
    startDs: traces.map((t) => t.startDs),
    kmClockDs: traces.map((t) => t.kmClockDs),
    checkClockDs: traces.map((t) => t.checkClockDs),
    mishaps: traces.flatMap((t, rider) => (t.mishap === null ? [] : [{ rider, ...t.mishap }])),
  }
}

// ========================================================================== EL GRABADOR (§5.4)

/** Una vida de un grupo: un id que reaparece tras morir abre otra (5-f). Su índice es su asa hasta el cierre. */
interface Life {
  readonly id: string
  readonly origin: GroupOrigin
  readonly bornB: Block
  diedB: Block | null
  /** asa del sucesor */
  successor: number | null
}

/** El orden de los sucesos de estado dentro de un bloque (§4.2). */
const STATE_ORDER: Readonly<Record<StateEvent['t'], number>> = {
  out: 0,
  move: 1,
  main: 2,
  clock: 3,
  mishap: 4,
}

/**
 * EL GRABADOR PURO (§5.4). Recibe la foto de CADA bloque, en orden, y lo que dan los tres ganchos; al
 * cerrar arma la `StageTimeline` de §4.2 con el reparto, el recorrido y el tiempo que le da `packages/db`.
 *
 * Las marcas de reloj van en los cuatro sitios de §3.4 (I-03): (a) cada grupo vivo en un bloque de foto
 * de km, (b) el nacimiento y la muerte de cada grupo, (c) el bloque de cada cambio de composición y el
 * anterior, y (d) cada bloque del último km. El título de pelotón es el del motor si su grupo tiene gente
 * y, si no, la regla de la radio aplicada por bloque (D-03). Las fotos de los bloques de radio se guardan
 * por referencia para `selfCheckI1`.
 */
export function timelineRecorder(opts: TimelineRecorderOptions): TimelineRecorder {
  const { blocks, dx, lengthKm, timeTrial, radioBlocks, riderIds } = opts
  const n = riderIds.length
  const ix = new Map(riderIds.map((id, i) => [id, i] as const))
  if (ix.size !== n)
    throw new TimelineFormatError('grabador: hay corredores repetidos en la salida')
  const blockOf = (km: number): Block =>
    Math.max(0, Math.min(blocks - 1, Math.round(km / dx - 0.5)))
  const riderOf = (id: string, where: string): RiderIx => {
    const r = ix.get(id)
    if (r === undefined)
      throw new TimelineFormatError(`grabador: ${where}: ${id} no tomó la salida`)
    return r
  }

  // El catálogo, por vida; `alive` da la vida en curso de cada id.
  const lives: Life[] = [{ id: 'peloton', origin: 'start', bornB: 0, diedB: null, successor: null }]
  const alive = new Map<string, number>([['peloton', 0]])
  // La foto anterior: al empezar, la de salida, con todos en el pelotón y su reloj a 0.
  let prevB = -1
  let prevGroupOf = new Int32Array(n)
  let prevClock = new Map<number, RaceS>([[0, 0]])
  let prevTitle: number | null = 0
  // Lo que se acumula: las diferencias.
  const marksAt = new Map<Block, Map<number, Ds>>()
  const mark = (b: Block, g: number, s: RaceS): void => {
    let at = marksAt.get(b)
    if (at === undefined) marksAt.set(b, (at = new Map()))
    at.set(g, toDs(s))
  }
  const changes: { readonly b: Block; readonly rider: RiderIx; readonly to: number }[] = []
  const titles: { readonly b: Block; readonly title: number | null }[] = []
  const keyBlocks = new Set<Block>()
  for (let km = 0; km < lengthKm; km += TIMELINE.keyPhotoKm) keyBlocks.add(blockOf(km))
  keyBlocks.add(blockOf(lengthKm - 1))
  const keys: { readonly b: Block; readonly groupOf: Int32Array; readonly title: number | null }[] =
    []
  const kmPhotos = new Map<Block, readonly SnapshotRider[]>()
  /** El reloj de la cabeza al cruzar cada bloque, con máximo acumulado (C3): no retrocede. */
  const head = new Float64Array(blocks)
  const emitBlock = new Map<Readonly<RaceEvent>, Block>()
  const banners: ProbeBanner[] = []
  const rides = new Map<RiderIx, TimeTrialRideTrace>()

  const onSnapshot: StageProbe['onSnapshot'] = (km, riders, mainId) => {
    const b = blockOf(km)
    if (timeTrial) throw new TimelineFormatError('grabador: una crono no tiene fotos')
    if (b !== prevB + 1)
      throw new TimelineFormatError(
        `grabador: falta la foto del bloque ${prevB + 1} (llega la del ${b})`,
      )
    // Una pasada: el grupo de cada uno, y el reloj (el de su primero) y el tamaño de cada grupo.
    const groupOf = new Int32Array(n).fill(-1)
    const clock = new Map<number, RaceS>()
    const size = new Map<number, number>()
    for (const r of riders) {
      const i = riderOf(r.riderId, `foto del bloque ${b}`)
      let g = alive.get(r.groupId)
      if (g === undefined) {
        g = lives.length
        lives.push({
          id: r.groupId,
          origin: originOf(r.groupId),
          bornB: b,
          diedB: null,
          successor: null,
        })
        alive.set(r.groupId, g)
      }
      groupOf[i] = g
      const c = clock.get(g)
      if (c === undefined || r.tS < c) clock.set(g, r.tS)
      size.set(g, (size.get(g) ?? 0) + 1)
    }
    // Quién cambia de grupo (o deja de estar en la foto: abandona) al final de b.
    const cambian = new Set<number>()
    for (let r = 0; r < n; r++) {
      const from = prevGroupOf[r]!
      const to = groupOf[r]!
      if (from === to) continue
      changes.push({ b, rider: r, to })
      if (from >= 0) cambian.add(from)
      if (to >= 0) cambian.add(to)
    }
    // Los que vivían en b − 1 y no tienen a nadie en b mueren en b − 1, con su marca y su sucesor: el
    // grupo de b adonde fue la mayoría de los suyos (a igual cuenta, el de id menor; null si no sigue nadie).
    for (const [g, s] of prevClock) {
      if (clock.has(g)) continue
      if (b === 0)
        throw new TimelineFormatError('grabador: el grupo de salida se vacía en el primer bloque')
      const life = lives[g]!
      const count = new Map<number, number>()
      for (let r = 0; r < n; r++)
        if (prevGroupOf[r] === g && groupOf[r]! >= 0)
          count.set(groupOf[r]!, (count.get(groupOf[r]!) ?? 0) + 1)
      let best = 0
      let successor: number | null = null
      for (const [to, c] of count)
        if (
          c > best ||
          (c === best && successor !== null && lives[to]!.id < lives[successor]!.id)
        ) {
          best = c
          successor = to
        }
      life.diedB = b - 1
      life.successor = successor
      mark(b - 1, g, s)
      alive.delete(life.id)
    }
    // Las marcas de §3.4.
    const everyGroup = radioBlocks.has(b) || b >= blocks - TIMELINE.lastKmMarkBlocks
    for (const [g, s] of clock) if (everyGroup || lives[g]!.bornB === b) mark(b, g, s)
    for (const g of cambian) {
      const now = clock.get(g)
      if (now !== undefined) mark(b, g, now)
      const before = b > 0 ? prevClock.get(g) : undefined
      if (before !== undefined) mark(b - 1, g, before)
    }
    // El título: el del motor si su grupo tiene gente en b; si no, la regla de la radio (D-03).
    const engineTitle = mainId === null ? undefined : alive.get(mainId)
    let title: number | null
    if (engineTitle !== undefined && clock.has(engineTitle)) title = engineTitle
    else {
      const id = mainGroupId(
        [...size].map(([g, count]) => ({ id: lives[g]!.id, size: count })),
        prevTitle === null ? null : lives[prevTitle]!.id,
        STAGE.mainGroupTakeoverRatio,
      )
      title = id === null ? null : (alive.get(id) ?? null)
    }
    if (title !== prevTitle) titles.push({ b, title })
    if (keyBlocks.has(b)) keys.push({ b, groupOf: groupOf.slice(), title })
    if (radioBlocks.has(b)) kmPhotos.set(b, riders)
    let lowest = Number.POSITIVE_INFINITY
    for (const s of clock.values()) if (s < lowest) lowest = s
    head[b] = Math.max(b > 0 ? head[b - 1]! : 0, lowest === Number.POSITIVE_INFINITY ? 0 : lowest)
    prevB = b
    prevGroupOf = groupOf
    prevClock = clock
    prevTitle = title
  }

  const onEvent: NonNullable<StageProbe['onEvent']> = (event, block) => {
    emitBlock.set(event, block)
  }
  const onBanner: NonNullable<StageProbe['onBanner']> = (banner) => {
    banners.push(banner)
  }
  const onTimeTrialRide: NonNullable<StageProbe['onTimeTrialRide']> = (ride) => {
    const r = riderOf(ride.riderId, 'crono')
    rides.set(r, ttRideTraceOf(ride, blocks, dx, lengthKm))
  }

  const finish = (fin: RecorderFinishInput): StageTimeline => {
    const { output } = fin
    if (
      fin.cast.riders.length !== n ||
      fin.cast.riders.some((c, r) => c.rider !== r || c.riderId !== riderIds[r])
    )
      throw new TimelineFormatError(
        'grabador: el reparto no va por RiderIx con los corredores de la salida',
      )
    if (!timeTrial && prevB !== blocks - 1)
      throw new TimelineFormatError(
        `grabador: la última foto es la del bloque ${prevB} de ${blocks}`,
      )
    if (lives.length > 255)
      throw new TimelineFormatError(`grabador: ${lives.length} grupos, y el formato 1 admite 255`)

    // 1. El catálogo renumerado (4-a): el de salida, el 0; los demás por (marca de nacimiento, bornB, id).
    const birthDs = (g: number): number =>
      marksAt.get(lives[g]!.bornB)?.get(g) ?? Number.POSITIVE_INFINITY
    const order = timeTrial
      ? []
      : lives
          .map((_, g) => g)
          .sort((a, c) =>
            a === 0
              ? -1
              : c === 0
                ? 1
                : birthDs(a) - birthDs(c) ||
                  lives[a]!.bornB - lives[c]!.bornB ||
                  (lives[a]!.id < lives[c]!.id ? -1 : lives[a]!.id > lives[c]!.id ? 1 : 0),
          )
    const gix = new Int32Array(lives.length).fill(-1)
    order.forEach((g, i) => (gix[g] = i))
    const toGix = (g: number): GroupIx => gix[g]!
    const groups: GroupCatalogEntry[] = order.map((g) => {
      const life = lives[g]!
      return {
        id: life.id,
        origin: life.origin,
        bornB: life.bornB,
        diedB: life.diedB,
        successor: life.successor === null ? null : toGix(life.successor),
      }
    })

    // 2. Los sucesos de estado: los grabados y un `mishap` por percance con pérdida (D-13).
    const byKind: StateEvent[] = []
    if (!timeTrial) {
      const movesAt = new Map<Block, Map<GroupIx, RiderIx[]>>()
      for (const c of changes) {
        if (c.to < 0) {
          byKind.push({ t: 'out', b: c.b, rider: c.rider })
          continue
        }
        let at = movesAt.get(c.b)
        if (at === undefined) movesAt.set(c.b, (at = new Map()))
        const to = toGix(c.to)
        const list = at.get(to)
        if (list === undefined) at.set(to, [c.rider])
        else list.push(c.rider)
      }
      for (const [b, at] of movesAt)
        for (const [to, riders] of [...at].sort((x, y) => x[0] - y[0]))
          byKind.push({ t: 'move', b, to, riders: [...riders].sort((x, y) => x - y) })
      for (const { b, title } of titles)
        byKind.push({ t: 'main', b, group: title === null ? null : toGix(title) })
      for (const [b, at] of marksAt)
        byKind.push({
          t: 'clock',
          b,
          marks: [...at].map(([g, d]) => [toGix(g), d] as const).sort((x, y) => x[0] - y[0]),
        })
      for (const inc of output.incidents)
        if (inc.perdidaS > 0)
          byKind.push({
            t: 'mishap',
            b: blockOf(inc.km),
            rider: riderOf(inc.riderId, 'percance'),
            kind: inc.tipo,
            lostDs: toDs(inc.perdidaS),
          })
    }
    const stateEvents = byKind
      .map((e, i) => ({ e, i }))
      .sort((x, y) => x.e.b - y.e.b || STATE_ORDER[x.e.t] - STATE_ORDER[y.e.t] || x.i - y.i)
      .map(({ e }) => e)
    const keyPhotos: KeyPhoto[] = keys.map((k) => ({
      b: k.b,
      groupOf: Int16Array.from(k.groupOf, (g) => (g < 0 ? -1 : toGix(g))),
      main: k.title === null ? null : toGix(k.title),
    }))
    const core: TimelineCore = {
      format: TIMELINE.format,
      engineVersion: ENGINE_VERSION,
      dx,
      blocks,
      lengthKm,
      timeTrial,
      clock: 'exact',
      riderIds: [...riderIds],
      groups,
      keys: keyPhotos,
      stateEvents,
      events: [],
      detail: new Map(),
      banners: [],
      profile: fin.profile,
      tt: null,
    }

    // 3. La crono y la meta.
    let tt: TimeTrialTrace | null = null
    if (timeTrial) {
      const traces = riderIds.map((id, r) => {
        const t = rides.get(r)
        if (t === undefined)
          throw new TimelineFormatError(`grabador: la crono no trae la traza de ${id}`)
        return t
      })
      tt = ttTraceOf(traces, timeTrialStartOrder(fin.input.riders), blocks, dx, lengthKm)
    }
    const arrivalOf = (r: RiderIx, tiempoS: number): Ds =>
      tt === null ? toDs(tiempoS) : tt.startDs[r]! + toDs(tiempoS)
    let finishS: RaceS
    if (tt === null) finishS = fromDs(toDs(head[blocks - 1]!))
    else {
      let last = 0
      tt.kmClockDs.forEach(
        (row, r) => (last = Math.max(last, tt!.startDs[r]! + (row[row.length - 1] ?? 0))),
      )
      finishS = fromDs(last)
    }
    const byArrival = new Map<Ds, RiderIx[]>()
    for (const res of output.results) {
      if (res.estado === 'abandon') continue
      const r = riderOf(res.riderId, 'resultados')
      const d = arrivalOf(r, res.tiempoS)
      const list = byArrival.get(d)
      if (list === undefined) byArrival.set(d, [r])
      else list.push(r)
    }
    const arrivals = [...byArrival]
      .sort((x, y) => x[0] - y[0])
      .map(([d, riders]) => [d, riders.sort((x, y) => x - y)] as const)

    // 4. Las pancartas, con el nombre del puerto del recorrido congelado si su cima cae a menos de un bloque.
    const bannerResults: { readonly probeKm: number; readonly result: BannerResult }[] = banners
      .map((x) => ({
        probeKm: x.km,
        result: {
          kind: x.kind,
          km: fromKm10(toKm10(x.km)),
          cat: x.cat,
          name:
            x.kind === 'cima'
              ? (fin.profile.climbs.find((c) => Math.abs(c.topKm - x.km) < dx)?.name ?? null)
              : null,
          revealS: fromDs(toDs(x.tS)),
          order: x.order.map((o) => ({ rider: riderOf(o.riderId, 'pancarta'), points: o.points })),
        },
      }))
      .sort((x, y) => x.probeKm - y.probeKm)

    // 5. La vista con que se fecha cada suceso (RecorderView, §4.7) sobre lo grabado.
    const ridersOf = output.events.map((e) =>
      e.protagonistas.flatMap((id) => {
        const r = ix.get(id)
        return r === undefined ? [] : [r]
      }),
    )
    const pathOf = new Map<RiderIx, { readonly b: Block; readonly g: GroupIx | null }[]>()
    for (const e of stateEvents) {
      if (e.t !== 'out' && e.t !== 'move') continue
      for (const r of e.t === 'out' ? [e.rider] : e.riders) {
        let path = pathOf.get(r)
        if (path === undefined) pathOf.set(r, (path = []))
        path.push({ b: e.b, g: e.t === 'out' ? null : e.to })
      }
    }
    const lastBlock = (b: Block): Block => Math.min(b, blocks - 1)
    const groupAt = (r: RiderIx, b: Block): GroupIx | null => {
      if (timeTrial) return null
      if (b < 0) return 0
      const path = pathOf.get(r)
      let g: GroupIx | null = 0
      if (path !== undefined)
        for (const step of path) {
          if (step.b > b) break
          g = step.g
        }
      return g
    }
    const clockAt = (g: GroupIx, b: Block): RaceS | null => {
      const entry = groups[g]
      if (entry === undefined || b < 0) return null
      const at = lastBlock(b)
      if (at < entry.bornB || (entry.diedB !== null && at > entry.diedB)) return null
      const d = clockOfMarks(clockMarksOf(core, g), at)
      return d === null ? null : fromDs(d)
    }
    const traceKm = ttKmBlocksOf(blocks, dx).map((b) => (b + 1) * dx)
    const ttOwnClockAt = (r: RiderIx, km: number): RaceS => {
      const row = tt?.kmClockDs[r]
      if (row === undefined || row.length === 0) return 0
      let fromKm = 0
      let fromDsClock = 0
      for (let j = 0; j < row.length; j++) {
        const toKm = traceKm[j]!
        if (km <= toKm) {
          const share = toKm > fromKm ? (km - fromKm) / (toKm - fromKm) : 1
          return fromDs(fromDsClock + (row[j]! - fromDsClock) * Math.max(0, share))
        }
        fromKm = toKm
        fromDsClock = row[j]!
      }
      return fromDs(row[row.length - 1]!)
    }
    const view: RecorderView = {
      timeTrial,
      finishS,
      riderIx: (id) => ix.get(id) ?? null,
      blockOfKm: blockOf,
      groupAt,
      clockAt,
      headClockAt: (b) => (b < 0 ? 0 : head[lastBlock(b)]!),
      bannerAt: (kind, km) =>
        bannerResults.find((x) => x.result.kind === kind && Math.abs(x.probeKm - km) < dx)
          ?.result ?? null,
      nextEmitOf: (rider, afterSource) => {
        for (let j = afterSource + 1; j < output.events.length; j++) {
          const b = emitBlock.get(output.events[j]!)
          if (b !== undefined && ridersOf[j]!.includes(rider)) return b
        }
        return null
      },
      ttStartS: (r) => fromDs(tt?.startDs[r] ?? 0),
      ttOwnClockAt,
    }

    // 6. Los sucesos narrables: uno por suceso de la salida y uno por montón de caídas (D-13).
    const events: TimelineEvent[] = output.events.map((e, i) => {
      let bEmit = timeTrial ? blocks : emitBlock.get(e)
      if (bEmit === undefined) {
        // Lo que no pasó por `onEvent` (los `rider_defies_team` de announceRebels): el bloque del
        // siguiente suceso que nombra a su protagonista, que es el caso (b) de D-05; si no hay, la meta.
        const r0 = ridersOf[i]![0]
        bEmit = (r0 === undefined ? null : view.nextEmitOf(r0, i)) ?? blocks
      }
      return {
        source: i,
        plantilla: e.plantilla,
        km: fromKm10(toKm10(e.km)),
        tS: fromDs(toDs(e.tS)),
        bEmit,
        revealS: fromDs(toDs(revealSOf(e, i, bEmit, view))),
        riders: ridersOf[i]!,
        datos: e.datos === undefined ? null : { ...e.datos },
      }
    })
    if (!timeTrial) {
      // Un suceso `crash` por montón: las caídas de un mismo bloque de corredores que iban en el mismo
      // grupo al final del anterior. Entra en revealSOf con tS 0 (regla `incident`, 4-v) y se graba con
      // su hora de revelado como fecha.
      const piles = new Map<string, { readonly b: Block; readonly riders: RiderIx[] }>()
      for (const inc of output.incidents) {
        if (inc.tipo !== 'caida') continue
        const r = riderOf(inc.riderId, 'caída')
        const b = blockOf(inc.km)
        const key = `${b}|${groupAt(r, b - 1) ?? -1}`
        const pile = piles.get(key)
        if (pile === undefined) piles.set(key, { b, riders: [r] })
        else if (!pile.riders.includes(r)) pile.riders.push(r)
      }
      for (const { b, riders } of piles.values()) {
        const sorted = [...riders].sort((x, y) => x - y)
        const km = (b + 0.5) * dx
        const reveal = fromDs(
          toDs(
            revealSOf(
              { plantilla: 'crash', km, tS: 0, protagonistas: [riderIds[sorted[0]!]!] },
              -1,
              b,
              view,
            ),
          ),
        )
        events.push({
          source: -1,
          plantilla: 'crash',
          km: fromKm10(toKm10(km)),
          tS: reveal,
          bEmit: b,
          revealS: reveal,
          riders: sorted,
          datos: null,
        })
      }
    }
    events.sort((x, y) => x.revealS - y.revealS || x.source - y.source)

    // 7. La capa de detalle de la radio en los bloques de foto de km, con los índices de la línea (5-g).
    const detail = new Map<Block, readonly GroupDetail[]>()
    if (!timeTrial) {
      const radio = fin.radio
      const photoBlocks = [...radioBlocks].sort((x, y) => x - y)
      if (radio === null || radio.kms.length !== photoBlocks.length)
        throw new TimelineFormatError(
          `grabador: la radio trae ${radio?.kms.length ?? 0} fotos para ${photoBlocks.length} bloques de foto`,
        )
      const livesOf = new Map<string, GroupIx[]>()
      groups.forEach((g, i) => livesOf.set(g.id, [...(livesOf.get(g.id) ?? []), i]))
      const groupIxAt = (id: string, b: Block): GroupIx => {
        const g = livesOf
          .get(id)
          ?.find(
            (i) => groups[i]!.bornB <= b && (groups[i]!.diedB === null || b <= groups[i]!.diedB!),
          )
        if (g === undefined)
          throw new TimelineFormatError(`grabador: la radio nombra «${id}» en el bloque ${b}`)
        return g
      }
      radioGroupDetails(radio).forEach((rows, i) => {
        const b = photoBlocks[i]!
        detail.set(
          b,
          rows
            .map((d): GroupDetail => ({
              g: groupIxAt(d.id, b),
              speedKmh: d.speedKmh === null ? null : Math.round(d.speedKmh * 10) / 10,
              pullingTotal: d.relevan.length,
              pullers: d.relevan.slice(0, STORED_PULLERS_MAX).map((p) => ({
                rider: riderOf(p.riderId, 'relevo'),
                motive: p.motivo,
                forRider: p.para == null ? null : riderOf(p.para, 'relevo'),
              })),
              mishap:
                d.mishap === null
                  ? null
                  : { kind: d.mishap.tipo, lostS: fromDs(toDs(d.mishap.lostS)) },
            }))
            .sort((x, y) => x.g - y.g),
        )
      })
    }

    return {
      ...core,
      events,
      detail,
      banners: bannerResults.map((x) => x.result),
      cast: fin.cast,
      weather: fin.weather,
      tt,
      finish: { finishS, arrivals },
    }
  }

  return { onSnapshot, onEvent, onBanner, onTimeTrialRide, kmPhotos, finish }
}

// ======================================================================== EL RECORRIDO Y EL TIEMPO

/**
 * A la décima: lo que la cabecera sirve del recorrido y del tiempo. Sin −0 (el `+ 0`): JSON lo escribe
 * como 0, y la línea decodificada tiene que ser la grabada sin tolerancia (I3).
 */
const round1 = (x: number): number => Math.round(x * 10) / 10 + 0
/** Al entero, sin −0: una cota de −0,3 m es 0 m, y no −0 (I3). */
const round0 = (x: number): number => Math.round(x) + 0

/**
 * EL RECORRIDO CONGELADO (§4.2 `ProfileStrip`; 5-o): la cota al final de cada km entero desde `startM`
 * (`altitudesDelPerfil`), en metros enteros; las cimas con categoría (la del dato oficial o la
 * derivada, como las puntúa el motor), con el pie donde empieza la racha de bloques en subida que acaba
 * en ellas, su longitud y su pendiente media; las volantes; y las vueltas. El nombre de un puerto sale
 * de `STAGE_FEATURES[raceId][stageDay − 1]` si la etapa tiene rasgos reales y el puerto corona donde su
 * pancarta (el perfil la pone en el km entero de su cima, `featureProfile.ts`); si no, null.
 *
 * La misma cuenta que el reparto provisional de la API hace para el adaptador de la radio
 * (`apps/api/src/broadcastSource.ts`, paso 3a), más el nombre: aquella no podía leer `STAGE_FEATURES`.
 */
export function profileStripOf(
  profile: StageProfile,
  at: { readonly raceId: string; readonly stageDay: number } | null,
): ProfileStrip {
  const dx = STAGE.dx
  const sampled = sampleProfile(profile)
  const startM = profile.startM ?? 0
  const alt = altitudesDelPerfil(sampled, dx, startM)
  /** La cota al final del bloque i; antes del primero, la de salida. */
  const altAt = (i: number): number =>
    i < 0 ? startM : (alt[Math.min(alt.length - 1, i)] ?? startM)
  // Por bloques y no con ceil(lengthKm): con la coma flotante de stageLengthKm, 26 km pueden ser
  // 26.000000000000004 y darían un km de más (§9.2).
  const perKm = Math.round(1 / dx)
  const altM = [round0(startM)]
  for (let k = 1; k <= Math.ceil(sampled.length / perKm); k++)
    altM.push(round0(altAt(Math.min(alt.length, k * perKm) - 1)))
  const named = [
    ...((at === null ? null : STAGE_FEATURES[at.raceId]?.[at.stageDay - 1])?.climbs ?? []),
  ]
  const climbs: ProfileStrip['climbs'][number][] = []
  for (const banner of profile.banners ?? []) {
    if (banner.tipo !== 'cima') continue
    const idx = Math.min(sampled.length - 1, Math.max(0, Math.floor(banner.km / dx)))
    const cat = sampled[idx]?.climbCategory ?? null
    if (cat === null) continue
    let foot = idx
    while (foot > 0 && sampled[foot - 1]!.tipo === 'subida') foot -= 1
    const footKm = round1(foot * dx)
    const topKm = round1(banner.km)
    const lenKm = round1(Math.max(0, topKm - footKm))
    const rise = altAt(idx) - altAt(foot - 1)
    const real = named.findIndex((c) => Math.round(c.summitKm) === Math.round(banner.km))
    climbs.push({
      footKm,
      topKm,
      cat,
      lenKm,
      avgPct: lenKm > 0 ? round1(rise / (lenKm * 10)) : 0,
      name: real < 0 ? null : named.splice(real, 1)[0]!.name,
    })
  }
  return {
    altM,
    climbs,
    sprintsKm: (profile.banners ?? [])
      .filter((x) => x.tipo === 'meta_volante')
      .map((x) => round1(x.km)),
    laps: profile.laps ?? 1,
  }
}

/**
 * EL TIEMPO DEL DÍA CONGELADO (D-14, I-19; 5-o): las mismas funciones puras con que lo calcula la
 * carrera (`stageWeather`, `stageWindStrength`, `weatherPlan`, `roadBearings` y `windComponents`) sobre su
 * semilla y su sitio, con el interruptor del clima de la carrera (`input.flags?.weather ??
 * STAGE.weather.enabled`, el de `simulateStage`). Un tramo por `STAGE.weather.roadTurnKm`, fundidos los
 * iguales seguidos, con viento cruzado donde su componente lateral contra el rumbo llega al umbral con
 * que el motor abre el abanico. Sin clima, un solo tramo sin viento.
 */
export function freezeStageWeather(input: StageInput, seed: string): StageWeather {
  const day = stageWeather(seed, input.lugar)
  const base = { tempC: round1(day.grados), rain: day.lluvia }
  if (!(input.flags?.weather ?? STAGE.weather.enabled))
    return {
      ...base,
      spans: [
        {
          fromKm: 0,
          rain: Math.round(day.lluvia * 100) / 100,
          windDir: 0,
          windKmh: 0,
          crosswind: false,
        },
      ],
    }
  const lengthKm = stageLengthKm(input.profile)
  const strength = stageWindStrength(seed)
  const plan = weatherPlan(seed, input.lugar, lengthKm, strength)
  const bearings = roadBearings(seed, lengthKm)
  const spans: StageWeather['spans'][number][] = []
  for (let fromKm = 0; fromKm < lengthKm; fromKm += STAGE.weather.roadTurnKm) {
    const seg = weatherAt(plan, fromKm)
    const span = {
      fromKm,
      rain: Math.round(seg.lluvia * 100) / 100,
      windDir: Math.round(seg.windDir * 1000) / 1000,
      windKmh: round1(seg.windKmh),
      crosswind:
        windComponents(strength, seg.windDir, bearingAt(bearings, fromKm)).lateral >=
        STAGE.weather.echelonCloseThreshold,
    }
    const prev = spans[spans.length - 1]
    if (
      prev !== undefined &&
      prev.rain === span.rain &&
      prev.windDir === span.windDir &&
      prev.windKmh === span.windKmh &&
      prev.crosswind === span.crosswind
    )
      continue
    spans.push(span)
  }
  return { ...base, spans }
}

// ===================================================================== LA AUTOCOMPROBACIÓN (§5.5)

/** Un grupo de la radio en pocas letras, para el informe de I1. */
const brief = (members: readonly string[]): string =>
  `${members.length} [${[...members].sort().slice(0, 4).join(' ')}${members.length > 4 ? ' …' : ''}]`

/**
 * I1 AL GRABAR (§4.4, §5.5; D-12, 5-i): en cada foto de km, la foto de la línea reducida (`photoAt`)
 * proyectada como radio es la del motor proyectada con el TÍTULO DE LA LÍNEA. Las dos proyecciones son
 * `radioKmFrom`: la del motor sobre su foto, y la de la línea sobre una foto en la que cada corredor
 * lleva el reloj de su grupo en Ds, que ordena por reloj en Ds y, a igual reloj, por id, y da el `kind`
 * con la misma regla. Se compara por TRAMOS de igual reloj en Ds, porque dos grupos con el mismo reloj
 * en décimas pueden cambiar de puesto y, con el puesto, su `kind` (medido: 1 de 8.656 fotos sin esta
 * tolerancia, 0 con ella): en cada tramo, los mismos ids; en cada id, los miembros como conjunto, el
 * tamaño y el hueco a 0,1 s; los `kind` del tramo, como multiconjunto; y `racing`, `gone` y `mainId`.
 * Vacío si se cumple.
 */
export function selfCheckI1(
  tl: StageTimeline,
  kmPhotos: ReadonlyMap<Block, readonly SnapshotRider[]>,
): readonly I1Mismatch[] {
  const out: I1Mismatch[] = []
  const starters = tl.riderIds.length
  for (const b of [...kmPhotos.keys()].sort((x, y) => x - y)) {
    const km = (b + 0.5) * tl.dx
    const p = photoAt(tl, b)
    const titleId = p.main === null ? undefined : tl.groups[p.main]?.id
    const expected = radioKmFrom(km, kmPhotos.get(b)!, starters, Infinity, null, titleId)
    const lineRiders: SnapshotRider[] = []
    p.groupOf.forEach((g, r) => {
      if (g < 0) return
      const d = p.clock.get(g)
      lineRiders.push({
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
    const got = radioKmFrom(km, lineRiders, starters, Infinity, null, titleId)
    const miss = (
      field: I1Mismatch['field'],
      group: string | null,
      e: string | number | null,
      g: string | number | null,
    ): void => {
      out.push({ b, km, field, group, expected: String(e), got: String(g) })
    }
    if (expected.racing !== got.racing) miss('racing', null, expected.racing, got.racing)
    if (expected.gone !== got.gone) miss('gone', null, expected.gone, got.gone)
    if (expected.mainId !== got.mainId) miss('mainId', null, expected.mainId, got.mainId)
    /** Los grupos, en tramos de igual reloj en Ds, en orden de carretera. */
    const runsOf = (groups: typeof expected.groups): (typeof expected.groups)[number][][] => {
      const runs: (typeof expected.groups)[number][][] = []
      let last: Ds | null = null
      for (const g of groups) {
        const d = toDs(g.tS)
        if (last === null || d !== last) runs.push([])
        runs[runs.length - 1]!.push(g)
        last = d
      }
      return runs
    }
    const want = runsOf(expected.groups)
    const have = runsOf(got.groups)
    for (let i = 0; i < Math.max(want.length, have.length); i++) {
      const a = want[i]
      const c = have[i]
      const ids = (run: typeof a): string =>
        run === undefined
          ? '—'
          : `${run
              .map((g) => g.id)
              .sort()
              .join(',')} @${toDs(run[0]!.tS)}`
      if (a === undefined || c === undefined || ids(a) !== ids(c)) {
        miss('order', (a ?? c)?.[0]?.id ?? null, ids(a), ids(c))
        break
      }
      for (const ge of a) {
        const gg = c.find((x) => x.id === ge.id)!
        const em = [...ge.riderIds].sort().join(',')
        const gm = [...gg.riderIds].sort().join(',')
        if (em !== gm) miss('members', ge.id, brief(ge.riderIds), brief(gg.riderIds))
        if (ge.size !== gg.size) miss('size', ge.id, ge.size, gg.size)
        if (Math.abs(ge.gapS - gg.gapS) > 0.1 + 1e-6)
          miss('gapS', ge.id, ge.gapS.toFixed(2), gg.gapS.toFixed(2))
      }
      const kinds = (run: NonNullable<typeof a>): string =>
        run
          .map((g) => g.kind)
          .sort()
          .join(',')
      if (kinds(a) !== kinds(c)) miss('kind', a[0]!.id, kinds(a), kinds(c))
    }
  }
  return out
}

/**
 * I5 AL GRABAR (§4.4, §5.5; 5-j) en una crono: la última entrada de cada traza contra `10 ·
 * results.tiempoS`, y el reloj de cada control contra `10 · splitS` de todo `tt_split` de la salida cuyo
 * primer protagonista es ese corredor (9-b). Igualdades, sin tolerancia: los dos lados salen del mismo
 * `Math.round` del motor. `check`: el índice del control en `checksKm`, null para la meta y −1 si el
 * control del suceso no está en la traza. Vacío si se cumple.
 */
export function selfCheckI5(
  tl: StageTimeline,
  output: StageOutput,
): readonly {
  readonly rider: RiderIx
  readonly check: number | null
  readonly expectedDs: number
  readonly gotDs: number
}[] {
  const out: { rider: RiderIx; check: number | null; expectedDs: number; gotDs: number }[] = []
  const tt = tl.tt
  const ixOf = new Map(tl.riderIds.map((id, i) => [id, i] as const))
  for (const res of output.results) {
    const r = ixOf.get(res.riderId)
    if (r === undefined) continue
    const row = tt?.kmClockDs[r]
    const got = row?.[row.length - 1] ?? -1
    if (got !== 10 * res.tiempoS)
      out.push({ rider: r, check: null, expectedDs: 10 * res.tiempoS, gotDs: got })
  }
  for (const e of output.events) {
    if (e.plantilla !== 'tt_split') continue
    const r = ixOf.get(e.protagonistas[0] ?? '')
    const checkKm = e.datos?.checkKm
    const splitS = e.datos?.splitS
    if (r === undefined || typeof checkKm !== 'number' || typeof splitS !== 'number') continue
    const c = tt?.checksKm.findIndex((k) => Math.round(k) === checkKm) ?? -1
    const got = c < 0 ? -1 : (tt?.checkClockDs[r]?.[c] ?? -1)
    if (got !== 10 * splitS) out.push({ rider: r, check: c, expectedDs: 10 * splitS, gotDs: got })
  }
  return out
}
