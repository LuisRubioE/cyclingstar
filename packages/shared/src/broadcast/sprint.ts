/**
 * EL ÚLTIMO KM DEL PRIMER GRUPO, COMO EN LA TELE (W5b, la revisión de `Watch`;
 * docs/diseno/e3-visual/implementacion.md). La meta del motor decide el orden y los huecos, y W5a-2 los
 * guarda en la meta de la línea (`FinishSprint`); esto los pone en escena: dónde va cada uno del primer
 * grupo cuando a su cabeza le quedan unos metros, de forma que en la línea quede EXACTAMENTE la llegada.
 * No es física ni decide nada: el tren va delante de su velocista hasta que este abre, cada uno sale en
 * el metro en que abre su sprint, el que abre más lejos de lo que aguanta sube y cede, el encerrado no
 * sale hasta el final, y entre los que llegan juntos el margen sale de su remate.
 *
 * NADA DEL RESULTADO ANTES DE `revealFromM` (las revisiones de W5b y W5c): hasta ahí cada uno va en una
 * fila que sale de su RiderIx, con un vaivén que tampoco sale de cómo llega (`approachOfM`): ni su sitio
 * en el final, ni su tren, ni su remate; nadie tira, abre, cede ni va encerrado, y los empates van por
 * RiderIx. La escena solo se acerca a la llegada en los últimos metros, donde la carrera de verdad ya lo
 * está decidiendo.
 *
 * EL GRUPO DE CABEZA DE LA CARRETERA (la revisión de W5c): cada fotograma lleva a los del grupo que va
 * delante en ese bloque, el que ve la barra, y no a los del que llegará primero. A una fuga que cazan
 * dentro del último km se la ve, con su aproximación, hasta que la cazan; solo el grupo que gana tiene
 * puesta en escena. Así, ni que salga el panel ni quién va en él dicen si la cazan.
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

/** Un fotograma del final: la hora en que la capa fija pone a la cabeza a `toGoM` de la línea, y los de delante. */
export interface SprintFrame {
  /**
   * la hora de las marcas de reloj de la cabeza en ese punto, ya vistas (D-06): la capa la pone en el
   * centro de su bloque, y en el último bloque se sigue a la velocidad de antes, sin la marca de la línea
   */
  readonly atDs: Ds
  readonly toGoM: number
  /** los `BROADCAST.sprint.frameRiders` de delante del grupo de cabeza, en el orden de la carretera */
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

/** Una tirada fija por RiderIx y etapa (`salt`), de 0 a 1: no sale del resultado. */
function saltedKey(rider: RiderIx, salt: number): number {
  let h = Math.imul(rider + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca77)
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** El orden de la salida de la aproximación: menor, más adelante. */
export type ApproachKey = (rider: RiderIx) => number

/** Sin reparto (las pruebas): la tirada fija de la etapa 0. */
const plainKey: ApproachKey = (rider) => saltedKey(rider, 0)

/** Lo que el orden de la aproximación lee del reparto: todo es de antes de correr (D-15). */
export interface ApproachCast {
  readonly riders: readonly {
    readonly rider: RiderIx
    readonly team: number | null
    readonly start: { readonly gcRank: number | null }
  }[]
  readonly favourites: readonly { readonly rider: RiderIx }[]
}

/**
 * EL ORDEN PÚBLICO DE LA APROXIMACIÓN, como lo pinta la tele sin saber cómo acaba: delante, los favoritos
 * de la etapa (los de la previa, 8-g), cada uno con `approachMates` de su equipo por delante, como un
 * tren; luego los de la general hasta `approachGc`; y los demás, por una tirada fija de la etapa (`salt`,
 * sus bloques). Nada del final: ni el sitio, ni el tren del motor, ni el remate.
 */
export function approachKeyOf(cast: ApproachCast, salt: number): ApproachKey {
  const key = new Map<RiderIx, number>()
  const put = (r: RiderIx, k: number): void => {
    const now = key.get(r)
    if (now === undefined || k < now) key.set(r, k)
  }
  cast.favourites.forEach((f, i) => {
    put(f.rider, i * 10 + 5)
    const team = cast.riders[f.rider]?.team
    if (team === null || team === undefined) return
    cast.riders
      .filter((c) => c.team === team && c.rider !== f.rider)
      .sort((a, b) => saltedKey(a.rider, salt) - saltedKey(b.rider, salt) || a.rider - b.rider)
      .slice(0, S.approachMates)
      .forEach((c, k) => put(c.rider, i * 10 + 1 + k))
  })
  for (const c of cast.riders)
    if (c.start.gcRank !== null && c.start.gcRank <= S.approachGc)
      put(c.rider, 100 + c.start.gcRank)
  return (rider) => key.get(rider) ?? 1000 + saltedKey(rider, salt)
}

/**
 * LAS FILAS DE UN GRUPO al empezar el último km, en m tras la de delante, de `lanes` en `lanes`, por el
 * orden público de la aproximación (`approachKeyOf`; sin él, una tirada fija): nunca por el final.
 */
export function startRowsM(
  riders: readonly RiderIx[],
  key: ApproachKey = plainKey,
): Map<RiderIx, number> {
  const order = [...riders].sort((a, b) => key(a) - key(b) || a - b)
  return new Map(order.map((r, rank) => [r, Math.floor(rank / S.lanes) * S.rowM] as const))
}

/** Las de los del final, en su orden de `riders`. */
export function startSpotsM(sprint: FinishSprint, key: ApproachKey = plainKey): number[] {
  const rows = startRowsM(
    sprint.riders.map((r) => r.rider),
    key,
  )
  return sprint.riders.map((r) => rows.get(r.rider)!)
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
 * LA APROXIMACIÓN DE UN GRUPO: dónde va cada uno cuando a su cabeza le quedan `toGoM` metros, en m tras
 * el de delante: su fila (`startRowsM`) y un vaivén con la fase de su RiderIx. Nada del resultado: vale
 * igual para el grupo que gana que para una fuga a la que cazan. Por debajo de `revealFromM`, de aquí
 * parte el camino de cada uno del grupo que gana hacia la llegada.
 */
export function approachOfM(
  riders: readonly RiderIx[],
  toGoM: number,
  key: ApproachKey = plainKey,
): Map<RiderIx, number> {
  const rows = startRowsM(riders, key)
  const at = new Map(riders.map((r) => [r, rows.get(r)! + jostleOf(r, toGoM)] as const))
  const front = Math.min(...at.values())
  for (const [r, x] of at) at.set(r, x - front)
  return at
}

/** La de los del final, en su orden de `riders`. */
export function approachSpotsM(
  sprint: FinishSprint,
  toGoM: number,
  key: ApproachKey = plainKey,
): number[] {
  const at = approachOfM(
    sprint.riders.map((r) => r.rider),
    toGoM,
    key,
  )
  return sprint.riders.map((r) => at.get(r.rider)!)
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
 * EL FINAL EN UN METRO: dónde va cada uno del grupo que gana cuando a su cabeza le quedan `toGoM` metros
 * (de `BROADCAST.sprint.fromM` a 0), en el orden de la carretera, con sus metros tras el primero. A 0 m
 * es la llegada exacta: el orden de `sprint.riders` y sus márgenes (`lineSpotsM`). Desde `revealFromM`
 * para arriba, la aproximación (`approachOfM`): nada del resultado, tampoco en el orden de la lista ni
 * en los papeles. `among`, los que van en el grupo a esa hora (por defecto, los de la llegada): quien va
 * y no llega con él se queda, desde `revealFromM`, detrás del último; quien aún no va, no sale.
 */
export function sprintSpots(
  sprint: FinishSprint,
  toGoM: number,
  lineSpeedMs: number = S.lineSpeedMs,
  among?: readonly RiderIx[],
  key: ApproachKey = plainKey,
): SprintSpot[] {
  const d = Math.max(0, Math.min(S.fromM, toGoM))
  const fin = lineSpotsM(sprint, lineSpeedMs)
  const inFinal = new Map(sprint.riders.map((r, i) => [r.rider, i] as const))
  // la aproximación del grupo que se ve, desde su cabeza: de ahí sale cada uno, y hacia ella sube el que cede
  const start = approachOfM(among ?? sprint.riders.map((r) => r.rider), d, key)
  const sprinterOf = new Map<RiderIx, number>()
  sprint.riders.forEach((r, i) => r.train.forEach((man) => sprinterOf.set(man, i)))
  // adonde se va, en los últimos metros, quien va en el grupo y no llega con él: detrás del último
  const tail = Math.max(0, ...fin) + S.rowM

  const placed = [...start].map(([rider, s]) => {
    const i = inFinal.get(rider)
    if (i === undefined) {
      const at =
        d >= S.revealFromM ? s : s + (tail - s) * smooth((S.revealFromM - d) / S.revealFromM)
      return { rider, at, role: 'bunch' as SprintRole }
    }
    const r = sprint.riders[i]!
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
      // nadie tira ni va encerrado antes de `revealFromM`: el tren también es del final
      role =
        d > release
          ? d > S.revealFromM
            ? 'bunch'
            : j !== undefined && boss !== null
              ? 'leadOut'
              : r.boxed
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
          : Math.min(S.revealFromM, Math.max(release, S.settleM + S.smoothPerM * Math.abs(f - s)))
      const settle = Math.min(S.settleM, from / 2)
      at = d >= from ? s : s + (f - s) * smooth((from - d) / (from - settle))
    }
    return { rider, at, role }
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
  /** el grupo que gana: el del primero en la línea */
  readonly winner: GroupIx
  readonly lineSpeedMs: number
  readonly blockM: number
  readonly last: Block
  /** por bloque: el grupo de cabeza (el primero en cruzarlo) y la hora en que se ve su marca (D-06) */
  readonly heads: ReadonlyMap<Block, { readonly g: GroupIx; readonly seenDs: Ds }>
}

/**
 * El grupo de cabeza de cada bloque con marcas, el que lo cruza primero, y la hora en que se ve su marca
 * (`visibilityOf`, como el corte de `chunkOf`). En el último km cada grupo lleva marca en cada bloque.
 */
function headsOf(tl: StageTimeline): Map<Block, { g: GroupIx; seenDs: Ds }> {
  const vis = visibilityOf(tl)
  const best = new Map<Block, { g: GroupIx; ds: Ds; seenDs: Ds }>()
  tl.stateEvents.forEach((e, i) => {
    if (e.t !== 'clock') return
    e.marks.forEach(([g, ds], j) => {
      const seenDs = vis.clockMarkDs[i]?.[j]
      if (seenDs === null || seenDs === undefined) return
      const now = best.get(e.b)
      if (now === undefined || ds < now.ds || (ds === now.ds && g < now.g))
        best.set(e.b, { g, ds, seenDs })
    })
  })
  return new Map([...best].map(([b, x]) => [b, { g: x.g, seenDs: x.seenDs }] as const))
}

/**
 * Lo que el final necesita de la línea: el grupo que gana, la cabeza de cada bloque y la velocidad de la
 * línea, medida en el bloque de antes del último: la marca de la línea es de la meta (D-06).
 */
function sceneOf(tl: StageTimeline): SprintScene | null {
  const sprint = tl.finish.sprint
  if (sprint === null || tl.timeTrial || sprint.riders.length === 0) return null
  const last = tl.blocks - 1
  const winner = photoAt(tl, last).groupOf[sprint.riders[0]!.rider]
  if (winner === undefined || winner < 0) return null
  const marks = clockMarksOf(tl, winner)
  const blockM = Math.round(tl.dx * 1000)
  const t1 = markAt(marks, last - 1)
  const t0 = markAt(marks, last - 2)
  const measured = t1 !== null && t0 !== null && t1 > t0 ? blockM / ((t1 - t0) / 10) : S.lineSpeedMs
  const lineSpeedMs = Math.max(S.lineSpeedMinMs, Math.min(S.lineSpeedMaxMs, measured))
  return { sprint, winner, lineSpeedMs, blockM, last, heads: headsOf(tl) }
}

/**
 * El ritmo de un grupo al llegar al bloque `b`, en Ds por bloque: el de sus marcas de antes (la última
 * anterior a `b`), que ya se ven; sin ninguna, el de `lineSpeedMs`.
 */
function paceDsOf(tl: StageTimeline, g: GroupIx, b: Block, blockM: number): number {
  const marks = clockMarksOf(tl, g)
  const now = markAt(marks, b)
  let prev: readonly [Block, Ds] | undefined
  for (const m of marks) if (m[0] < b && (prev === undefined || m[0] > prev[0])) prev = m
  if (now === null || prev === undefined || now <= prev[1]) return (blockM / S.lineSpeedMs) * 10
  return (now - prev[1]) / (b - prev[0])
}

/** Un grupo de cabeza que no es el que gana (una fuga a la que cazan): su aproximación, sin papeles. */
function approachSpots(riders: readonly RiderIx[], toGoM: number, key: ApproachKey): SprintSpot[] {
  return [...approachOfM(riders, toGoM, key)]
    .sort((a, b) => a[1] - b[1] || a[0] - b[0])
    .map(([rider, x]) => ({ rider, behindM: round1(x), role: 'bunch' }))
}

const framesCache = new WeakMap<StageTimeline, readonly SprintFrame[]>()

/**
 * LOS FOTOGRAMAS DEL FINAL, de `fromM` a la línea sin llegar a ella: uno cada 100 m y los de
 * `frameExtraM`, cada uno con los `frameRiders` de delante del GRUPO DE CABEZA de la carretera en la
 * última marca que ya se ve a su hora (`photoAt`), el que ve la barra: el grupo que gana, con su puesta
 * en escena (`sprintSpots`); otro (una fuga a la que cazan), con su aproximación y nada más. Su hora, la
 * de la capa fija: la cabeza en el centro de su bloque, entre las marcas que la rodean, y en el último
 * bloque a la velocidad del de antes, porque la marca de la línea es de la meta y ningún fotograma deja
 * calcularla (D-06). La línea, con la meta (`sprintPhoto`). Vacío sin final.
 */
export function sprintFrames(tl: StageTimeline): readonly SprintFrame[] {
  const hit = framesCache.get(tl)
  if (hit !== undefined) return hit
  const scene = sceneOf(tl)
  const frames: SprintFrame[] = []
  if (scene !== null) {
    const { sprint, winner, lineSpeedMs, blockM, last, heads } = scene
    const key = approachKeyOf(tl.cast, tl.blocks)
    const seenAt = (b: Block): Ds | undefined => heads.get(b)?.seenDs
    // desde el primer bloque con todas las marcas del último km
    const firstBlock = last - Math.floor(S.fromM / blockM) + 1
    const metres = new Set<number>(S.frameExtraM)
    for (let k = Math.floor(S.fromM / blockM); k >= 1; k--) metres.add(k * blockM)
    for (const d of [...metres].sort((a, b) => b - a)) {
      // la capa fija pone a la cabeza en el centro de su bloque: `x`, el bloque (con decimales) en que la ve a `d`
      const x = last + 0.5 - d / blockM
      const k0 = Math.floor(x + 1e-9)
      const share = Math.max(0, x - k0)
      // a menos de medio bloque la capa ya está en la línea: eso es la meta
      if (k0 < firstBlock || x >= last - 1e-9) continue
      // la composición y la hora, de la última marca de la cabeza que ya se ve (la de `k0`, nunca la
      // de la línea): desde ella, a su ritmo de antes; con la marca de después, el fotograma diría antes
      // de tiempo cuándo pasa la cabeza por el bloque siguiente, y quién es (una fuga a la que cazan)
      const cb = k0
      const head = heads.get(cb)
      const t0 = seenAt(cb)
      if (head === undefined || t0 === undefined) continue
      const t = t0 + share * paceDsOf(tl, head.g, cb, blockM)
      const members = Array.from(photoAt(tl, cb).groupOf).flatMap((g, r) =>
        g === head.g ? [r] : [],
      )
      if (members.length === 0) continue
      const spots =
        head.g === winner
          ? sprintSpots(sprint, d, lineSpeedMs, members, key)
          : approachSpots(members, d, key)
      const top = spots[0]?.behindM ?? 0
      frames.push({
        atDs: Math.round(t),
        toGoM: d,
        spots: spots
          .slice(0, S.frameRiders)
          .map((x2) => ({ ...x2, behindM: round1(x2.behindM - top) })),
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
