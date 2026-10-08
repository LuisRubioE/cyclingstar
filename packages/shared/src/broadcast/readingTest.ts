/**
 * LA PRUEBA DE LECTURA (E2, docs/retransmision.md §16.5; D-60, 16-i y 16-w; paso 10b, adelantado): lo
 * que el organizador prepara y comprueba, y que no lee nadie más. El sorteo de las tres etapas (punto
 * 3), de sus puntos (punto 4) y del punto de la fuga (punto 6), y la verdad de cada punto (punto 7):
 * lo que pintan la capa fija y la barra cuando la capa fija llega al km a meta del punto, sacado de la
 * línea grabada con las mismas funciones que la pantalla (`instantAt`, `pullingLineOf`, las palabras
 * de grupo y el `worn` de cada carta servida). Lo imprime `scripts/pl-truth.mjs`, que lee la base. Puro.
 *
 * La verdad es la de quien conoce la carrera hasta la etapa anterior, que es lo que D-37 exige para
 * verla: el reparto sin velo (`riderCardsOf` sobre el reparto congelado) y sin corredores propios, que
 * no cambian ni los grupos ni la diferencia ni quién tira, solo la marca del espectador.
 *
 * Las palabras de la pantalla (`toGoText`, `mainGapText`, `versusText`, `barLabelText`, `pullingText` y
 * `wornText`) son las de la web (`apps/web/src/domain/broadcast/screen.ts`, `GroupBar` y los iconos de
 * la barra), que un script de Node no puede importar: van aquí, con los casos de los tests de la web, y
 * la web puede pasar a importarlas de aquí en lugar de tener las suyas.
 */
import type { StageKind } from '../contracts.js'
import { JERSEY_LABEL, type RiderCard } from '../jerseys.js'
import type { NameResolver } from '../news.js'
import { seededRng } from '../rng.js'
import { riderCardsOf, startStateOf } from './cards.js'
import { BROADCAST } from './constants.js'
import {
  type GroupNow,
  type Instant,
  type InstantContext,
  instantAt,
  packOf,
  photoBlocksOf,
} from './instant.js'
import {
  COUNTRY_NAMES,
  PULL_MOTIVE_WORDS,
  type PullingLine,
  championTitleText,
  groupLabelText,
  pullingLineOf,
} from './names.js'
import {
  type Ds,
  type RaceS,
  type RiderIx,
  type StageTimeline,
  type TimelineCore,
  fromDs,
} from './timeline.js'

// --------------------------------------------------------------------------------- el sorteo

/**
 * EL SORTEO DE LOS PUNTOS (§16.5, punto 4): `points` km a meta por etapa, entre `edgeKm` y
 * `lengthKm − edgeKm`, separados al menos `minApartKm` y uno de ellos en los últimos `finaleKm`. Son del
 * protocolo de la prueba y no de la pantalla, así que no van en `BROADCAST` (16-v).
 */
export const READING_DRAW = {
  points: 3,
  edgeKm: 5,
  minApartKm: 20,
  finaleKm: 30,
} as const

/** El último km a meta entero del sorteo, sin que la coma flotante de la longitud (174,99999999999997) se lleve uno. */
function topKmOf(lengthKm: number): number {
  return Math.floor(lengthKm - READING_DRAW.edgeKm + 1e-9)
}

/**
 * LOS PUNTOS DE UNA ETAPA (§16.5, punto 4): `n` km a meta enteros, de mayor a menor (el orden en que la
 * capa fija llega a ellos), elegidos al azar entre todos los conjuntos que cumplen el punto 4, todos con
 * la misma probabilidad. Determinista: el azar es el generador sembrado de `rng.ts` (mulberry32 sobre
 * la semilla, en su subflujo `lectura`), nunca `Math.random`, así que la misma semilla da los mismos
 * puntos. El script pasa una semilla por etapa (la apuntada más la etapa), para que dos etapas de la
 * misma longitud no tengan los mismos. Lanza `RangeError` si en la etapa no caben (menos de 50 km con
 * tres puntos).
 *
 * Cómo: cuenta los conjuntos (`W(k, x)`, las maneras de poner k puntos en [x, último] separados al
 * menos `minApartKm`, con `W(k, x) = W(k, x + 1) + W(k − 1, x + minApartKm)`), saca un número entre 0
 * y el total y recorre los conjuntos en orden hasta él: el menor de los puntos es el de los últimos
 * `finaleKm` y los demás van subiendo.
 */
export function drawReadingPoints(
  seed: string,
  lengthKm: number,
  n: number = READING_DRAW.points,
): number[] {
  const { edgeKm: lo, minApartKm: apart, finaleKm } = READING_DRAW
  if (!Number.isInteger(n) || n < 1)
    throw new RangeError(`prueba de lectura: ${n} puntos por etapa no es un número de puntos`)
  const hi = topKmOf(lengthKm)
  const tooShort = () =>
    new RangeError(
      `prueba de lectura: en ${lengthKm} km no caben ${n} km a meta entre ${lo} y lengthKm − ${lo}, separados ${apart} y uno en los últimos ${finaleKm}`,
    )
  if (!(hi >= lo)) throw tooShort()
  // rows[k][x − lo] = W(k, x), de k = 1 a n − 1; W(0, x) = 1 y, pasado el último km, W(k ≥ 1, x) = 0
  const rows: number[][] = []
  const W = (k: number, x: number): number => (k === 0 ? 1 : x > hi ? 0 : rows[k]![x - lo]!)
  for (let k = 1; k < n; k++) {
    const row = new Array<number>(hi - lo + 1).fill(0)
    rows[k] = row
    for (let x = hi; x >= lo; x--)
      row[x - lo] = (x < hi ? row[x + 1 - lo]! : 0) + W(k - 1, x + apart)
  }
  const last = Math.min(finaleKm, hi)
  let total = 0
  for (let a = lo; a <= last; a++) total += W(n - 1, a + apart)
  if (total === 0) throw tooShort()
  let r = Math.floor(seededRng(`lectura:${seed}`)() * total)
  const picked: number[] = []
  // el menor, el de los últimos km
  for (let a = lo; a <= last; a++) {
    const w = W(n - 1, a + apart)
    if (r < w) {
      picked.push(a)
      break
    }
    r -= w
  }
  // y cada uno de los demás, desde el anterior más la separación
  for (let k = n - 1; k >= 1; k--) {
    for (let x = picked.at(-1)! + apart; x <= hi; x++) {
      const w = W(k - 1, x + apart)
      if (r < w) {
        picked.push(x)
        break
      }
      r -= w
    }
  }
  return picked.reverse()
}

/**
 * EL PUNTO DE LA FUGA (§16.5, punto 6): si en los nueve puntos no sale ninguna fuga de hasta
 * `BROADCAST.nameWholeGroupUpTo` delante del pelotón, uno más, al azar entre los km en que la hay
 * (`breakawayKmsOf` de las tres etapas, en un orden fijo). Con la semilla apuntada, en su propio subflujo
 * (`lectura:<semilla>:fuga`), así que no mueve los puntos de las etapas. null sin candidatos.
 */
export function drawBreakawayPoint<T>(seed: string, candidates: readonly T[]): T | null {
  if (candidates.length === 0) return null
  const r = Math.floor(seededRng(`lectura:${seed}:fuga`)() * candidates.length)
  return candidates[r] ?? null
}

// ------------------------------------------------------------------------- las tres etapas

/** Una etapa con línea (una fila de `stage_timelines` que no es lápida), con lo que la elección lee de ella. */
export interface ReadingStageCandidate {
  /** `${raceId}:s${season}` */
  readonly raceKey: string
  readonly day: number
  /** el día de juego en que se corrió (`stage_timelines.game_day`) */
  readonly gameDay: number
  /** el `StageKind` con que la sirve la API (el de la etapa que corre el mundo) */
  readonly kind: StageKind
  readonly timeTrial: boolean
  /** de una carrera de un día */
  readonly oneDay: boolean
  readonly lengthKm: number
}

/** Las tres etapas de la prueba; null la que no hay. */
export interface ReadingStages {
  readonly llana: ReadingStageCandidate | null
  readonly reina: ReadingStageCandidate | null
  readonly clasica: ReadingStageCandidate | null
  /** no hay ninguna clásica con línea: `clasica` es la carrera de un día más larga que la tiene */
  readonly clasicaFallback: boolean
}

/**
 * LAS TRES ETAPAS (§16.5, punto 3): la llana, la reina y la clásica más recientes con línea, por
 * `StageKind`, y si no hay ninguna clásica con línea, la carrera de un día más larga que la tenga (que
 * no sea ya la llana o la reina). Nunca una crono: la prueba pregunta por grupos. Más reciente es mayor
 * día de juego; a igual día, la primera por la clave de carrera, para que no dependa del orden de la
 * lista. Que ninguno de los dos las haya visto no lo sabe la línea: lo comprueba el organizador.
 */
export function pickReadingStages(candidates: readonly ReadingStageCandidate[]): ReadingStages {
  const recent = (a: ReadingStageCandidate, b: ReadingStageCandidate): number =>
    b.gameDay - a.gameDay ||
    (a.raceKey < b.raceKey ? -1 : a.raceKey > b.raceKey ? 1 : 0) ||
    a.day - b.day
  const road = candidates.filter((c) => !c.timeTrial)
  const latest = (kind: StageKind): ReadingStageCandidate | null =>
    road.filter((c) => c.kind === kind).sort(recent)[0] ?? null
  const llana = latest('llana')
  const reina = latest('reina')
  const clasica = latest('clasica')
  if (clasica !== null) return { llana, reina, clasica, clasicaFallback: false }
  const longest =
    road
      .filter((c) => c.oneDay && c !== llana && c !== reina)
      .sort((a, b) => b.lengthKm - a.lengthKm || recent(a, b))[0] ?? null
  return { llana, reina, clasica: longest, clasicaFallback: longest !== null }
}

// -------------------------------------------------------------------------- la verdad

/**
 * LO QUE LA PANTALLA LEE ADEMÁS DE LA LÍNEA, como lo arman la ruta de la cabecera y `StageWatch.tsx`:
 * las cartas servidas (`riderCardsOf`) y el contexto del instante (la salida de `startStateOf` y el
 * calendario de fotos). Sin velo y sin corredores propios: los de quien conoce la etapa anterior.
 */
export interface ReadingScreen {
  readonly cards: readonly RiderCard[]
  readonly ctx: InstantContext
}

/** La pantalla de una etapa para la prueba. `names`, los de hoy, como `getCastIdentities` en la ruta. */
export function readingScreenOf(
  tl: StageTimeline,
  names: Pick<NameResolver, 'rider' | 'team'>,
  dayCategory: 'elite' | 'u23' = 'elite',
): ReadingScreen {
  const none: ReadonlySet<RiderIx> = new Set()
  return {
    cards: riderCardsOf(tl.cast, names, none, dayCategory),
    ctx: {
      own: none,
      start: startStateOf(tl.cast, tl.riderIds.length),
      photoBlocks: photoBlocksOf(tl.lengthKm, tl.dx),
    },
  }
}

/**
 * CUÁNDO LLEGA LA CAPA FIJA A CADA KM A META (§16.5, punto 5: «cuando la capa fija llega al km a meta
 * del punto, el organizador pausa»): para cada km, la primera hora en que `Instant.toGoKm` es ≤ km; null
 * si no llega (la cabeza se pinta a medio bloque de la línea, así que por debajo de 50 m no llega). Una
 * pasada por segundos enteros de carrera para todos los km, y se afina a la décima dentro del segundo en
 * que llega cada uno. Por segundos y no por décimas porque la cabeza pintada puede volver atrás unos
 * metros, o unos km cuando su grupo muere y el sucesor aún no tiene marca (6a): lo que vuelve en menos
 * de un segundo de carrera no se ve, porque la capa fija se repinta a `overlayHz` y a ×60 un repintado
 * son seis segundos de carrera.
 */
export function readingCrossings(
  tl: StageTimeline,
  screen: ReadingScreen,
  kms: readonly number[],
): (RaceS | null)[] {
  const out: (RaceS | null)[] = kms.map(() => null)
  const order = kms.map((_, i) => i).sort((a, b) => kms[b]! - kms[a]!)
  const toGoAt = (ds: Ds): number => instantAt(tl, fromDs(ds), screen.ctx).toGoKm
  const lastS = Math.ceil(tl.finish.finishS)
  let p = 0
  for (let s = 0; s <= lastS && p < order.length; s++) {
    const now = toGoAt(s * 10)
    while (p < order.length && now <= kms[order[p]!]!) {
      const km = kms[order[p]!]!
      // el segundo anterior no había llegado: la primera décima de este en que llega
      let ds = s * 10
      for (let d = Math.max(0, s * 10 - 9); d < s * 10; d++)
        if (toGoAt(d) <= km) {
          ds = d
          break
        }
      out[order[p]!] = fromDs(ds)
      p++
    }
  }
  return out
}

/** LA VERDAD DE UN PUNTO (§16.5, punto 7): lo que pintan la capa fija y la barra en su instante. */
export interface ReadingTruth {
  /** el km a meta del punto */
  readonly kmToGo: number
  /** la hora de carrera del instante: el paso por el km (`readingCrossings`) u otra que se pida */
  readonly t: RaceS
  /** el instante entero: la capa fija lee `toGoKm`, `lapsToGo` y `mainGap` (con su referencia, D-17) */
  readonly instant: Instant
  /** la barra: los grupos con alguien dentro, renumerados por carretera (`shownGroupsOf` de la web, 6a) */
  readonly bar: readonly GroupNow[]
  /** quién va delante: la fila 1 de la barra */
  readonly front: GroupNow
  /** los de delante por dorsal, con su carta servida: su nombre, su equipo y el maillot que llevan (`worn`, §4.8) */
  readonly frontCards: readonly RiderCard[]
  /** sobre quién: el grupo contra el que mide la capa fija (`MainGap.behind`); null con un solo grupo */
  readonly behind: GroupNow | null
  /** el grupo 1 va por delante del pelotón con hasta `nameWholeGroupUpTo`: las dos preguntas más (punto 6, 16-w) */
  readonly breakaway: boolean
  /** quién tira detrás y por qué: la línea `Pulling:` del grupo que persigue, el de `behind` (§6.4) */
  readonly pulling: PullingLine | null
  /** las cartas servidas, por RiderIx: los nombres y los maillots con que se escriben las palabras */
  readonly cards: readonly RiderCard[]
}

/** LA BARRA: los grupos del instante con alguien dentro, renumerados (la regla de `shownGroupsOf`, web, 6a). */
function barOf(instant: Instant): readonly GroupNow[] {
  if (instant.groups.every((g) => g.size > 0)) return instant.groups
  return instant.groups.filter((g) => g.size > 0).map((g, i) => ({ ...g, number: i + 1 }))
}

/**
 * LA VERDAD A UNA HORA DADA: la del paso por el km (`readingTruthsOf`) o la que el organizador lea en la
 * segunda línea de la capa fija al pausar (el reloj de carrera, 6-f). «El grupo que persigue» es el de
 * la diferencia principal: con una fuga delante, el pelotón (D-17), que es de quien se pregunta quién
 * tira detrás.
 */
export function readingTruthAt(
  tl: TimelineCore,
  screen: ReadingScreen,
  kmToGo: number,
  t: RaceS,
): ReadingTruth {
  const instant = instantAt(tl, t, screen.ctx)
  const bar = barOf(instant)
  const front = bar[0]
  if (front === undefined) throw new Error(`prueba de lectura: nadie en carrera a la hora ${t}`)
  const gap = instant.mainGap
  const behind = gap === null ? null : (instant.groups.find((g) => g.g === gap.behind) ?? null)
  const pack = packOf(bar)
  return {
    kmToGo,
    t,
    instant,
    bar,
    front,
    frontCards: front.members.flatMap((r) => {
      const c = screen.cards[r]
      return c === undefined ? [] : [c]
    }),
    behind,
    breakaway: pack !== null && pack.g !== front.g && front.size <= BROADCAST.nameWholeGroupUpTo,
    pulling: behind === null ? null : pullingLineOf(behind.detail, behind.members, screen.cards),
    cards: screen.cards,
  }
}

/** LA VERDAD DE CADA PUNTO, en el instante en que la capa fija llega a su km (una pasada); null si no llega. */
export function readingTruthsOf(
  tl: StageTimeline,
  screen: ReadingScreen,
  kms: readonly number[],
): (ReadingTruth | null)[] {
  const ts = readingCrossings(tl, screen, kms)
  return kms.map((km, i) => {
    const t = ts[i]
    return t === null || t === undefined ? null : readingTruthAt(tl, screen, km, t)
  })
}

/**
 * LOS KM DE LA FUGA (§16.5, punto 6): los km a meta enteros del sorteo (de `edgeKm` a lengthKm − edgeKm),
 * de mayor a menor, en que el grupo 1 va por delante del pelotón con hasta `nameWholeGroupUpTo`
 * corredores al pasar por ellos. Los candidatos del punto de la fuga.
 */
export function breakawayKmsOf(tl: StageTimeline, screen: ReadingScreen): number[] {
  const kms: number[] = []
  for (let km = topKmOf(tl.lengthKm); km >= READING_DRAW.edgeKm; km--) kms.push(km)
  return readingTruthsOf(tl, screen, kms).flatMap((x, i) =>
    x?.breakaway === true ? [kms[i]!] : [],
  )
}

// ------------------------------------------------------------- las palabras de la pantalla

/** `m:ss`, y `h:mm:ss` desde la hora (`clockText` de la web). */
function clockText(totalS: number): string {
  const s = Math.max(0, Math.round(totalS))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** La distancia: un decimal, y dentro del último km los metros hacia abajo a la decena (§6.2). */
function distanceText(toGoKm: number): string {
  if (toGoKm < 1) return `${Math.floor(Math.max(0, toGoKm) * 100 + 1e-9) * 10} m`
  return `${toGoKm.toFixed(1)} km`
}

/** LOS KM A META DE LA CAPA FIJA (§6.2; `toGoText` de la web): `98.5 km to go`, `850 m to go`, `3 laps to go · 42.5 km`, `Last lap · 8.2 km to go`. */
export function toGoText(toGoKm: number, lapsToGo: number | null): string {
  if (lapsToGo !== null && lapsToGo > 1) return `${lapsToGo} laps to go · ${toGoKm.toFixed(1)} km`
  if (lapsToGo === 1) return `Last lap · ${distanceText(toGoKm)} to go`
  return `${distanceText(toGoKm)} to go`
}

/** LA DIFERENCIA PRINCIPAL (§6.2; `gapText` de la web): `+3:46`, `+1:02:10`; por debajo de `sameTimeS`, `s.t.`. */
export function mainGapText(gapS: number): string {
  return gapS < BROADCAST.sameTimeS ? 's.t.' : `+${clockText(gapS)}`
}

/** El nombre de un corredor en la pantalla: tal como está guardado (7-a; `nameOf` de la web). */
const nameOf =
  (cards: readonly RiderCard[]) =>
  (r: RiderIx): string =>
    cards[r]?.name ?? `#${r + 1}`

/** El corredor con su dorsal: `107 Andrea Rossi` (`riderShort` de la web). */
function riderShort(cards: readonly RiderCard[], r: RiderIx): string {
  const c = cards[r]
  if (c === undefined) return `#${r + 1}`
  return c.bib === null ? c.name : `${c.bib} ${c.name}`
}

/** CONTRA QUIÉN mide la capa fija: la palabra de voz de ese grupo, `on the bunch` (§6.2, 6-b; `versusText` de la web). */
export function versusText(behind: GroupNow, cards: readonly RiderCard[]): string {
  return `on ${groupLabelText('en', behind.label, behind.role, 'voice', nameOf(cards))}`
}

/**
 * LA FILA DE LA BARRA (§6.2, §6.3; `RowName` de `GroupBar`): los nombres de un grupo de tres o menos,
 * `A · B · C`, o la palabra de su papel con el tamaño, `Lead group · 7` (las mayúsculas de la barra son
 * presentación).
 */
export function barLabelText(g: GroupNow, cards: readonly RiderCard[]): string {
  const word = groupLabelText('en', g.label, g.role, 'bar', nameOf(cards))
  return g.label.k === 'names' ? word : `${word} · ${g.size}`
}

/**
 * QUIÉN TIRA (§6.4, 6-d; `pullingText` de la web): `Pulling: all 3 in turn` (`both in turn` con dos,
 * `4 of 5 in turn` si no están todos), o cada equipo con su porqué, `(for 107 Andrea Rossi)` si dos de
 * sus relevistas comparten destinatario y, si no, su motivo (`(chasing)`), y `+2 teams` si tiran más de
 * dos. `oneTeam`: la del móvil, con un equipo y `+N teams`.
 */
export function pullingText(
  line: PullingLine,
  cards: readonly RiderCard[],
  oneTeam = false,
): string {
  if (line.k === 'in_turn') {
    if (line.pulling < line.of) return `Pulling: ${line.pulling} of ${line.of} in turn`
    return `Pulling: ${line.of === 2 ? 'both' : `all ${line.of}`} in turn`
  }
  const teamName = (teamId: string): string => {
    if (teamId.startsWith('solo:')) return nameOf(cards)(Number(teamId.slice(5)))
    return cards.find((c) => c.team?.id === teamId)?.team?.name ?? teamId
  }
  const shown = oneTeam ? line.teams.slice(0, 1) : line.teams
  const more = line.moreTeams + (line.teams.length - shown.length)
  const parts = shown.map((t) => {
    const why =
      t.forRider !== null
        ? `for ${riderShort(cards, t.forRider)}`
        : t.motive === null
          ? null
          : PULL_MOTIVE_WORDS[t.motive]
    return `${teamName(t.teamId)}${why === null ? '' : ` (${why})`}`
  })
  return `Pulling: ${parts.join(', ')}${more > 0 ? ` +${more} ${more === 1 ? 'team' : 'teams'}` : ''}`
}

/**
 * EL MAILLOT QUE SE VE (§4.8, §7.4), con las palabras de su icono en la barra (`WornJerseyIcon`): el de
 * líder por su clasificación (`Race leader`, `Points leader`, `Mountains leader`, `JERSEY_LABEL`, también
 * el que lo lleva delegado), el de campeón por su título (`Champion of Italy`) o `Team jersey`.
 */
export function wornText(card: RiderCard): string {
  switch (card.worn.kind) {
    case 'leader':
      return JERSEY_LABEL[card.worn.jersey]
    case 'champion':
      return championTitleText('en', card.worn.title, COUNTRY_NAMES)
    case 'team':
      return 'Team jersey'
  }
}
