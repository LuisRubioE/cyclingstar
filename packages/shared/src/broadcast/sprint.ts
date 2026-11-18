/**
 * EL ÚLTIMO KM DEL PRIMER GRUPO, COMO EN LA TELE (W5b, la revisión de `Watch`;
 * docs/diseno/e3-visual/implementacion.md). La meta del motor decide el orden y los huecos, y W5a-2 los
 * guarda en la meta de la línea (`FinishSprint`); esto los pone en escena: dónde va cada uno del primer
 * grupo cuando a su cabeza le quedan unos metros, de forma que en la línea quede EXACTAMENTE la llegada.
 * No es física ni decide nada: el tren va delante de su velocista hasta que este abre, cada uno sale en
 * el metro en que abre su sprint, el que abre más lejos de lo que aguanta sube y cede, el encerrado no
 * sale hasta el final, y entre los que llegan juntos el margen sale de su remate.
 *
 * NADA DEL RESULTADO ANTES DE `revealFromM` (la revisión de W5b): hasta ahí cada uno va en su sitio de
 * salida, que no depende de cómo llega, con un vaivén que tampoco (`approachSpotsM`), y la escena solo se
 * acerca a la llegada en los últimos metros, donde la carrera de verdad ya lo está decidiendo. Un
 * fotograma de antes no deja despejar el orden, ni el de la lista: los empates van por RiderIx.
 *
 * Es de la meta: lee `FinishRecord.sprint`, que nunca va en un tramo (D-06). A la web viajan los
 * fotogramas de antes de la línea, cada uno con su hora, la de la marca de reloj del grupo en ese bloque
 * (`sprintFrames`), y la foto de la línea solo con la meta (`sprintPhoto`, `POST …/broadcast/finish`).
 * Puro y determinista.
 */
import { BROADCAST } from './constants.js'
import { visibilityOf } from './cut.js'
import { clockMarksOf, photoAt } from './reduce.js'
import type { Block, Ds, FinishSprint, GroupIx, RiderIx, StageTimeline } from './timeline.js'

const S = BROADCAST.sprint

/** Lo que hace cada uno en ese metro: en el grupo, tirando de su velocista, lanzado, cediendo o encerrado. */
export type SprintRole = 'bunch' | 'leadOut' | 'launched' | 'fading' | 'boxed'

/** Un corredor en un fotograma del final: sus metros tras el primero del grupo, a décimas, y lo que hace. */
export interface SprintSpot {
  readonly rider: RiderIx
  readonly behindM: number
  readonly role: SprintRole
}

/** Un fotograma del final: la hora en que la cabeza del grupo pasa a `toGoM` de la línea, y los de delante. */
export interface SprintFrame {
  /** la marca de reloj del grupo en ese punto: su hora de visibilidad (D-06) */
  readonly atDs: Ds
  readonly toGoM: number
  /** los `BROADCAST.sprint.frameRiders` de delante del grupo, en el orden de la carretera */
  readonly spots: readonly SprintSpot[]
}

const round1 = (x: number): number => Math.round(x * 10) / 10 + 0
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x))
/** Arranca y llega suave: ni salta al lanzar ni frena de golpe en la línea. */
const smooth = (x: number): number => {
  const t = clamp01(x)
  return t * t * (3 - 2 * t)
}

/**
 * Dónde cruza cada uno la línea, en m tras el primero y en el orden de llegada: entre los que llegan con
 * el mismo hueco, un margen que sale de la diferencia de remate (entre media rueda y dos bicicletas); el
 * primero de un hueco mayor, a su hueco por la velocidad de la línea.
 */
export function lineSpotsM(sprint: FinishSprint, lineSpeedMs: number): number[] {
  const out: number[] = []
  sprint.riders.forEach((r, i) => {
    const prev = sprint.riders[i - 1]
    const prevM = out[i - 1]
    if (prev === undefined || prevM === undefined) {
      out.push(0)
      return
    }
    if (r.gapDs > prev.gapDs) {
      out.push(Math.max(prevM + S.minMarginM, (r.gapDs / 10) * lineSpeedMs))
      return
    }
    const margin = S.marginPerScoreM * Math.max(0, prev.score - r.score)
    out.push(prevM + Math.min(S.maxMarginM, Math.max(S.minMarginM, margin)))
  })
  return out
}

/**
 * Dónde va cada uno al empezar el último km, en m tras la cabeza: por su sitio en el grupo, con los
 * hombres de su tren justo delante de su velocista, en filas de `lanes`.
 */
export function startSpotsM(sprint: FinishSprint): number[] {
  const key = sprint.riders.map((r) => r.place)
  const index = new Map(sprint.riders.map((r, i) => [r.rider, i] as const))
  for (const r of sprint.riders)
    r.train.forEach((man, k) => {
      const j = index.get(man)
      // por delante de su velocista, el primero de su lista el más adelantado; menos que una milésima
      if (j !== undefined) key[j] = r.place - (r.train.length - k) * 1e-4
    })
  // los empates, por RiderIx: el índice de `riders` es el orden de llegada
  const order = key
    .map((_, i) => i)
    .sort((a, b) => key[a]! - key[b]! || sprint.riders[a]!.rider - sprint.riders[b]!.rider)
  const out = sprint.riders.map(() => 0)
  order.forEach((i, rank) => (out[i] = Math.floor(rank / S.lanes) * S.rowM))
  return out
}

/** El vaivén de un corredor en la aproximación: dos ondas, con la fase de su RiderIx (nada del resultado). */
function jostleOf(rider: RiderIx, toGoM: number): number {
  const [w1, w2] = S.jostleWavesM
  const p1 = ((rider * 0.618034) % 1) * 2 * Math.PI
  const p2 = ((rider * 0.414214) % 1) * 2 * Math.PI
  return (
    (S.jostleM *
      (Math.sin((2 * Math.PI * toGoM) / w1 + p1) + Math.sin((2 * Math.PI * toGoM) / w2 + p2))) /
    2
  )
}

/**
 * LA APROXIMACIÓN: dónde va cada uno cuando a la cabeza le quedan `toGoM` metros, en m desde la fila de
 * delante, antes de nada del resultado: su sitio de salida (`startSpotsM`) y un vaivén que no sale de cómo
 * llega (la fase, de su RiderIx); el hombre de tren va y viene con su velocista. Por debajo de
 * `revealFromM`, de aquí parte el camino de cada uno hacia la llegada.
 */
export function approachSpotsM(sprint: FinishSprint, toGoM: number): number[] {
  const start = startSpotsM(sprint)
  const unitOf = new Map<RiderIx, RiderIx>()
  for (const r of sprint.riders) for (const man of r.train) unitOf.set(man, r.rider)
  return sprint.riders.map((r, i) => start[i]! + jostleOf(unitOf.get(r.rider) ?? r.rider, toGoM))
}

/**
 * El metro en que abre en la escena: el encerrado no sale antes de `boxedLaunchM`, y nadie antes de
 * `revealFromM` (el que abre más lejos, ahí); null, sin sprint.
 */
function launchOf(r: FinishSprint['riders'][number]): number | null {
  if (r.launchM === null) return null
  return Math.min(S.revealFromM, r.boxed ? Math.min(r.launchM, S.boxedLaunchM) : r.launchM)
}

/**
 * EL FINAL EN UN METRO: dónde va cada uno del primer grupo cuando a su cabeza le quedan `toGoM` metros
 * (de `BROADCAST.sprint.fromM` a 0), en el orden de la carretera, con sus metros tras el primero. A 0 m
 * es la llegada exacta: el orden de `sprint.riders` y sus márgenes (`lineSpotsM`). Desde `revealFromM`
 * para arriba, la aproximación (`approachSpotsM`): nada del resultado, tampoco en el orden de la lista.
 */
export function sprintSpots(
  sprint: FinishSprint,
  toGoM: number,
  lineSpeedMs: number = S.lineSpeedMs,
): SprintSpot[] {
  const d = Math.max(0, Math.min(S.fromM, toGoM))
  const fin = lineSpotsM(sprint, lineSpeedMs)
  // la aproximación, desde su cabeza: de ahí sale cada uno, y hacia ella sube el que cede
  const approach = approachSpotsM(sprint, d)
  const front = Math.min(...approach)
  const start = approach.map((x) => x - front)
  const sprinterOf = new Map<RiderIx, number>()
  sprint.riders.forEach((r, i) => r.train.forEach((man) => sprinterOf.set(man, i)))

  const placed = sprint.riders.map((r, i) => {
    const s = start[i]!
    const f = fin[i]!
    const own = launchOf(r)
    const j = sprinterOf.get(r.rider)
    const boss = j === undefined ? null : launchOf(sprint.riders[j]!)
    // el hombre de tren suelta cuando abre su velocista; los demás, en el metro en que abren; y el
    // encerrado no se ve encerrado antes de `revealFromM`, que también es del resultado
    const release = j !== undefined && boss !== null ? boss : own
    const hold = r.holdM ?? release
    let role: SprintRole = 'bunch'
    if (release !== null)
      role =
        d > release
          ? j !== undefined && boss !== null
            ? 'leadOut'
            : r.boxed && d <= S.revealFromM
              ? 'boxed'
              : 'bunch'
          : j === undefined
            ? 'launched'
            : 'bunch'
    let at: number
    if (d === 0) at = f
    else if (release !== null && hold !== null && j === undefined && release - hold >= S.fadeMinM) {
      // abrió más lejos de lo que aguanta: en su sitio hasta abrir, sube hacia la cabeza hasta `hold` y
      // cede después; cuánto sube, en proporción a lo que abrió de más
      const reach = S.fadeReach * Math.min(1, (release - hold) / S.fadeFullM)
      const peak = Math.min(s, f) * (1 - reach)
      if (d >= release) at = s
      else if (d > hold) at = s + (peak - s) * smooth((release - d) / (release - hold))
      else {
        at = peak + (f - peak) * smooth((hold - d) / hold)
        role = 'fading'
      }
    } else {
      // hacia su sitio de llegada, con el camino que pide lo que se mueve (sin saltos) y nunca antes de
      // `revealFromM` (nada del resultado); sin sprint, desde ahí
      const from =
        release === null
          ? S.revealFromM
          : Math.min(S.revealFromM, Math.max(release, S.smoothPerM * Math.abs(f - s)))
      at = d >= from ? s : s + (f - s) * smooth((from - d) / from)
    }
    return { rider: r.rider, at, role }
  })
  // los empates, por RiderIx, nunca por el orden de llegada
  placed.sort((a, b) => a.at - b.at || a.rider - b.rider)
  const head = placed[0]?.at ?? 0
  return placed.map((p) => ({ rider: p.rider, behindM: round1(p.at - head), role: p.role }))
}

/** La marca exacta de un grupo en un bloque, o null si no la tiene. */
function markAt(marks: readonly (readonly [Block, Ds])[], b: Block): Ds | null {
  for (const [mb, ds] of marks) if (mb === b) return ds
  return null
}

interface SprintScene {
  readonly sprint: FinishSprint
  readonly group: GroupIx
  readonly lineSpeedMs: number
  readonly blockM: number
  readonly last: Block
  /** la hora en que se ve cada marca del grupo, por bloque: la de `visibilityOf`, la del corte (D-06) */
  readonly seen: ReadonlyMap<Block, Ds>
}

/** La hora en que se ve cada marca de reloj de un grupo, por bloque (`visibilityOf`, como el corte de `chunkOf`). */
function seenMarksOf(tl: StageTimeline, g: GroupIx): Map<Block, Ds> {
  const vis = visibilityOf(tl)
  const out = new Map<Block, Ds>()
  tl.stateEvents.forEach((e, i) => {
    if (e.t !== 'clock') return
    e.marks.forEach(([mg], j) => {
      const at = vis.clockMarkDs[i]?.[j]
      if (mg === g && at !== null && at !== undefined) out.set(e.b, at)
    })
  })
  return out
}

/** Lo que el final necesita de la línea: el grupo del ganador en la línea, sus marcas y la velocidad. */
function sceneOf(tl: StageTimeline): SprintScene | null {
  const sprint = tl.finish.sprint
  if (sprint === null || tl.timeTrial || sprint.riders.length === 0) return null
  const last = tl.blocks - 1
  const group = photoAt(tl, last).groupOf[sprint.riders[0]!.rider]
  if (group === undefined || group < 0) return null
  const marks = clockMarksOf(tl, group)
  const blockM = Math.round(tl.dx * 1000)
  const tLast = markAt(marks, last)
  const tPrev = markAt(marks, last - 1)
  const measured =
    tLast !== null && tPrev !== null && tLast > tPrev
      ? blockM / ((tLast - tPrev) / 10)
      : S.lineSpeedMs
  const lineSpeedMs = Math.max(S.lineSpeedMinMs, Math.min(S.lineSpeedMaxMs, measured))
  return { sprint, group, lineSpeedMs, blockM, last, seen: seenMarksOf(tl, group) }
}

const framesCache = new WeakMap<StageTimeline, readonly SprintFrame[]>()

/**
 * LOS FOTOGRAMAS DEL FINAL, de `fromM` a la línea sin llegar a ella: uno en cada marca de reloj del grupo
 * del ganador en el último km (cada bloque, `TIMELINE.lastKmMarkBlocks`) y los de `frameExtraM`, con la
 * hora entre las dos marcas que los rodean. Cada uno con los de delante que van en ese grupo en la última
 * marca que ya se ve a su hora (`photoAt`): un fugado al que cazan a 400 m entra en el fotograma de 300, y
 * el que enlaza en los últimos 100 m no sale en el de 50 (eso, con la meta). La hora de cada uno es la de
 * su marca en el corte (`visibilityOf`), siempre antes de la línea; la línea, con la meta
 * (`sprintPhoto`). Vacío sin final.
 */
export function sprintFrames(tl: StageTimeline): readonly SprintFrame[] {
  const hit = framesCache.get(tl)
  if (hit !== undefined) return hit
  const scene = sceneOf(tl)
  const frames: SprintFrame[] = []
  if (scene !== null) {
    const { sprint, group, lineSpeedMs, blockM, last, seen } = scene
    const points: { toGoM: number; atDs: Ds; b: Block }[] = []
    for (let k = Math.floor(S.fromM / blockM); k >= 1; k--) {
      const atDs = seen.get(last - k)
      if (atDs !== undefined) points.push({ toGoM: k * blockM, atDs, b: last - k })
    }
    for (const m of S.frameExtraM) {
      const k = Math.floor(m / blockM)
      const t0 = seen.get(last - k - 1)
      const t1 = seen.get(last - k)
      if (t0 === undefined || t1 === undefined || k * blockM === m) continue
      const share = ((k + 1) * blockM - m) / blockM
      // la composición, la de la marca de antes, la que ya se ve a su hora
      points.push({ toGoM: m, atDs: Math.round(t0 + (t1 - t0) * share), b: last - k - 1 })
    }
    points.sort((a, b) => b.toGoM - a.toGoM)
    for (const p of points) {
      const groupOf = photoAt(tl, p.b).groupOf
      const inGroup = sprintSpots(sprint, p.toGoM, lineSpeedMs).filter(
        (s) => groupOf[s.rider] === group,
      )
      const head = inGroup[0]?.behindM ?? 0
      frames.push({
        atDs: p.atDs,
        toGoM: p.toGoM,
        spots: inGroup
          .slice(0, S.frameRiders)
          .map((s) => ({ ...s, behindM: round1(s.behindM - head) })),
      })
    }
  }
  framesCache.set(tl, frames)
  return frames
}

/** LA FOTO DE LA LÍNEA: los `frameRiders` primeros del grupo, con sus márgenes. Solo con la meta (D-06). */
export function sprintPhoto(tl: StageTimeline): readonly SprintSpot[] {
  const scene = sceneOf(tl)
  if (scene === null) return []
  return sprintSpots(scene.sprint, 0, scene.lineSpeedMs).slice(0, S.frameRiders)
}

/** Lo que hace cada uno, en el contrato: un código cerrado y atado a su unión (un papel nuevo no compila). */
export const SPRINT_ROLE_CODE = {
  bunch: 0,
  leadOut: 1,
  launched: 2,
  fading: 3,
  boxed: 4,
} as const satisfies Record<SprintRole, number>
const SPRINT_ROLE_OF_CODE: ReadonlyMap<number, SprintRole> = new Map(
  (Object.entries(SPRINT_ROLE_CODE) as [SprintRole, number][]).map(([role, code]) => [code, role]),
)

/**
 * LOS FOTOGRAMAS DE UN TRAMO, en el contrato (`BroadcastChunk.sprint`): los que tienen su hora en
 * (fromDs, toDs] ([0, toDs] el primero) y antes de la meta, el filtro de `chunkOf`, en registros
 * [atDs, toGoM, n, (rider, behindDm, SPRINT_ROLE_CODE) × n]. Los tramos seguidos traen cada fotograma
 * una vez, y ninguno el de la línea (D-06).
 */
export function sprintFramesWire(tl: StageTimeline, fromDs: Ds, toDs: Ds): number[] {
  const { finishDs } = visibilityOf(tl)
  const out: number[] = []
  for (const f of sprintFrames(tl)) {
    const d = f.atDs
    if (!((fromDs === 0 ? d >= 0 : d > fromDs) && d <= toDs && d < finishDs)) continue
    out.push(d, f.toGoM, f.spots.length)
    for (const s of f.spots) out.push(s.rider, Math.round(s.behindM * 10), SPRINT_ROLE_CODE[s.role])
  }
  return out
}

/** La inversa, para la web: los registros de uno o varios tramos, en fotogramas. Un papel que no conoce, en el grupo. */
export function sprintFramesOfWire(flat: readonly number[]): SprintFrame[] {
  const out: SprintFrame[] = []
  let i = 0
  while (i + 3 <= flat.length) {
    const atDs = flat[i]!
    const toGoM = flat[i + 1]!
    const n = flat[i + 2]!
    i += 3
    const spots: SprintSpot[] = []
    for (let k = 0; k < n && i + 3 <= flat.length; k++, i += 3)
      spots.push({
        rider: flat[i]!,
        behindM: flat[i + 1]! / 10,
        role: SPRINT_ROLE_OF_CODE.get(flat[i + 2]!) ?? 'bunch',
      })
    out.push({ atDs, toGoM, spots })
  }
  return out
}
