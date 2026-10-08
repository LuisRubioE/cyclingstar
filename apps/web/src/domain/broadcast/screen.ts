/**
 * LAS PALABRAS Y LAS CIFRAS DE `Watch` (E2, docs/retransmision.md §6.2, §6.3, 6-c, 6-e y 6-f). Puro:
 * sin React. Lo que dicen la capa fija, la barra de grupos y el perfil sobre un instante (`Instant`,
 * §4.5); los componentes de `components/broadcast/` solo lo pintan.
 *
 * Nace en el 3c. Las palabras de grupo son las de `GROUP_WORDS` (`shared`, D-18 y DD-04); los textos
 * de pantalla, los de §21.6 F.3, en inglés.
 */
import {
  BROADCAST,
  type Cue,
  type GroupCatalogEntry,
  type GroupIx,
  GROUP_WORDS,
  type GroupNow,
  type Instant,
  type JerseyKind,
  type ProfileStrip,
  type RiderCard,
  type RiderIx,
  type StartState,
  groupLabelText,
} from '@cyclingstar/shared'

/** `m:ss`, y `h:mm:ss` desde la hora. */
export function clockText(totalS: number): string {
  const s = Math.max(0, Math.round(totalS))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** El reloj de carrera de la segunda línea: siempre con las horas, `2:09:00` (6-f). */
export function raceClockText(t: number): string {
  const s = Math.max(0, Math.floor(t))
  const h = Math.floor(s / 3600)
  return `${h}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** Un hueco: `+3:46`, `+1:02:10`; por debajo de `sameTimeS`, `s.t.` (§6.2). */
export function gapText(gapS: number): string {
  return gapS < BROADCAST.sameTimeS ? 's.t.' : `+${clockText(gapS)}`
}

/** En los últimos `quietFinalM`, solo la distancia: ni huecos ni voz (§6.9). */
export function isQuietFinal(toGoKm: number): boolean {
  return toGoKm * 1000 < BROADCAST.quietFinalM
}

/** La distancia: un decimal, y dentro del último km los metros hacia abajo a la decena (§6.2). */
function distanceText(toGoKm: number): string {
  if (toGoKm < 1) return `${Math.floor(Math.max(0, toGoKm) * 100 + 1e-9) * 10} m`
  return `${toGoKm.toFixed(1)} km`
}

/** Los km a meta de la capa fija: `98.5 km to go`, `850 m to go`, `3 laps to go · 42.5 km`, `Last lap · 8.2 km to go`. */
export function toGoText(toGoKm: number, lapsToGo: number | null): string {
  if (lapsToGo !== null && lapsToGo > 1) return `${lapsToGo} laps to go · ${toGoKm.toFixed(1)} km`
  if (lapsToGo === 1) return `Last lap · ${distanceText(toGoKm)} to go`
  return `${distanceText(toGoKm)} to go`
}

/** El nombre que la pantalla pone a un corredor: tal como está guardado (7-a). */
export function nameOf(cast: readonly RiderCard[]): (r: RiderIx) => string {
  return (r) => cast[r]?.name ?? `#${r + 1}`
}

/** Contra quién se mide la diferencia principal: la palabra de voz de su grupo, `on the bunch` (§6.2, 6-b). */
export function versusText(behind: GroupNow, cast: readonly RiderCard[]): string {
  return `on ${groupLabelText('en', behind.label, behind.role, 'voice', nameOf(cast))}`
}

/** La pendiente del km en que va la cabeza, de la cota de la cabecera; null fuera del perfil. */
export function slopePct(profile: ProfileStrip, km: number): number | null {
  const k = Math.floor(Math.max(0, km))
  const a = profile.altM[k]
  const b = profile.altM[k + 1]
  return a === undefined || b === undefined ? null : (b - a) / 10
}

/** Una cifra con signo y un decimal, sin `-0.0`. */
const oneDecimal = (x: number): string => (Math.abs(x) < 0.05 ? '0.0' : x.toFixed(1))

/**
 * La segunda línea de la capa fija (6-f): el reloj de carrera, la velocidad de la cabeza en su último
 * km de foto (si se midió), la pendiente del km en que va, la temperatura y, si toca, `rain` y
 * `crosswind` del tramo del tiempo en que va, y el detalle de la tendencia, `▲ 0:24 in 5 km`.
 */
export function overlayDetailText(
  instant: Instant,
  head: {
    readonly profile: ProfileStrip
    readonly weather: {
      readonly tempC: number
      readonly spans: readonly { fromKm: number; rain: number; crosswind: boolean }[]
    }
  },
): string {
  const parts = [raceClockText(instant.t)]
  const speed = instant.groups[0]?.detail?.speedKmh ?? null
  if (speed !== null) parts.push(`${speed.toFixed(1)} km/h`)
  const slope = slopePct(head.profile, instant.headKm)
  if (slope !== null) parts.push(`${oneDecimal(slope)}%`)
  parts.push(`${Math.round(head.weather.tempC)}°C`)
  const span = [...head.weather.spans].reverse().find((s) => s.fromKm <= instant.headKm)
  if (span !== undefined && span.rain > 0) parts.push('rain')
  if (span?.crosswind === true) parts.push('crosswind')
  const trend = instant.mainGap?.trend ?? null
  if (trend !== null && trend.arrow !== 'flat')
    parts.push(
      `${trend.arrow === 'up' ? '▲' : '▼'} ${clockText(Math.abs(trend.deltaS))} in ${trend.windowKm} km`,
    )
  return parts.join(' · ')
}

/** La categoría de un puerto: `HC`, `Cat. 2` (de la `ClimbCategory` del motor). */
export function climbCatText(cat: string): string {
  return cat.startsWith('cat') ? `Cat. ${cat.slice(3)}` : cat
}

/**
 * El puerto que viene, bajo el perfil (§6.2): si la cabeza va por él, `Côte de Monteynard · Cat. 2 ·
 * summit in 5.5 km`; si no, `Next: Côte des Terrasses · Cat. 3 · in 26.5 km`, con los km que le quedan
 * hasta la cima; sin nombre, `Cat. 3 climb`. Null si no quedan puertos.
 */
export function climbAheadText(profile: ProfileStrip, headKm: number): string | null {
  const next = profile.climbs.find((c) => c.topKm > headKm)
  if (next === undefined) return null
  const name =
    next.name === null
      ? `${climbCatText(next.cat)} climb`
      : `${next.name} · ${climbCatText(next.cat)}`
  const toTop = (next.topKm - headKm).toFixed(1)
  return headKm >= next.footKm
    ? `${name} · summit in ${toTop} km`
    : `Next: ${name} · in ${toTop} km`
}

/**
 * LAS FILAS DEL MÓVIL (6-c): como mucho `mobileGroupRows`, elegidas en este orden (la 1, la del
 * pelotón, las del espectador, las que llevan un maillot y después las siguientes por carretera) y
 * pintadas en el de carretera. Devuelve los `GroupIx` elegidos. «El pelotón» es el grupo con papel
 * `bunch` y, si ninguno llega a dos tercios, el del título (6-b).
 */
export function mobileRowsOf(groups: readonly GroupNow[]): ReadonlySet<number> {
  const max = BROADCAST.mobileGroupRows
  const chosen = new Set<number>()
  const add = (g: GroupNow | undefined): void => {
    if (g !== undefined && chosen.size < max) chosen.add(g.g)
  }
  add(groups[0])
  add(groups.find((g) => g.role === 'bunch') ?? groups.find((g) => g.kind === 'peloton'))
  for (const g of groups) if (g.own) add(g)
  for (const g of groups) if (g.jerseys.length > 0) add(g)
  for (const g of groups) add(g)
  return chosen
}

/** Los que van en tránsito desde un grupo (6-e): hacia atrás (`↓ 3 dropping back`) y hacia delante. */
export interface TransitCount {
  readonly back: number
  readonly across: number
}

/** Por `GroupIx` del grupo que dejaron: cuántos van hacia un grupo de detrás y cuántos hacia uno de delante. */
export function transitOf(instant: Instant): ReadonlyMap<number, TransitCount> {
  const numberOf = new Map(instant.groups.map((g) => [g.g, g.number] as const))
  const out = new Map<number, { back: number; across: number }>()
  for (const x of instant.inTransit) {
    const from = numberOf.get(x.from)
    if (from === undefined) continue
    const to = numberOf.get(x.to)
    // sin destino en carretera (un grupo que ya no se ve) no se sabe hacia dónde va: no se cuenta
    if (to === undefined || to === from) continue
    const c = out.get(x.from) ?? { back: 0, across: 0 }
    if (to < from) c.across += 1
    else c.back += 1
    out.set(x.from, c)
  }
  return out
}

/**
 * ¿Callaría la voz el descuelgue de este corredor? (`inVoice`, `domain/voice.ts`). La política de a
 * quién se nombra es `namedRidersOf` (§7.7), del 6b; hasta entonces, provisional, se nombra a los que
 * llevan un maillot de líder, a los `namedGcTop` primeros de la general de salida y a los del
 * espectador, que es lo que §7.7 nombra en un grupo grande sin contar a los que tiran ni a los
 * protagonistas de lo ya dicho.
 */
export function unnamedFor(
  cast: readonly RiderCard[],
  start: StartState,
): (riderId: string) => boolean {
  const named = new Set<string>()
  for (const c of cast) if (c.worn.kind === 'leader' || c.own) named.add(c.id)
  for (const row of start.gcTop)
    if (row.rank <= BROADCAST.namedGcTop) {
      const id = cast[row.rider]?.id
      if (id !== undefined) named.add(id)
    }
  return (riderId) => !named.has(riderId)
}

// ------------------------------------------------------------- los grupos que se pintan (6a)

/**
 * LOS GRUPOS QUE PINTAN LA BARRA Y EL PERFIL: los del instante con alguien dentro, renumerados por
 * carretera. Un grupo recién nacido cuyos corredores aún se pintan en el de detrás (los que salen en
 * dos grupos van en el de atrás y en tránsito, 3-b) va vacío en el instante unos segundos de carrera,
 * hasta que se ve su marca siguiente: en las cinco congeladas, del 0,3 al 0,8 % de los segundos, y en
 * la mitad de ellos es el primero de la carretera. El instante lo conserva (I2 lo cuenta); la pantalla
 * no pinta una fila ni un cursor sin nadie, y el número de carretera (que renumera y no es identidad,
 * §6.2) es el de lo pintado.
 */
export function shownGroupsOf(instant: Instant): readonly GroupNow[] {
  if (instant.groups.every((g) => g.size > 0)) return instant.groups
  return instant.groups.filter((g) => g.size > 0).map((g, i) => ({ ...g, number: i + 1 }))
}

/**
 * LA IDENTIDAD DE UN GRUPO EN PANTALLA (D-03, §3.7): el id del motor y, en un cambio de etiqueta (todos
 * los de un grupo pasan juntos a uno que nace en el bloque de su muerte o en el siguiente: en Colombia,
 * de 10 a 19 veces por etapa), la del grupo que murió, por la cadena de `successor`. Así la fila de la
 * barra y el cursor del perfil son los mismos de un eslabón al siguiente. Por `GroupIx` del catálogo.
 */
export function screenKeysOf(catalog: readonly GroupCatalogEntry[]): readonly string[] {
  const keys: string[] = catalog.map((g) => g.id)
  // el catálogo va por nacimiento (4-a): el antecesor de un grupo siempre va antes que él
  const inherited = new Set<GroupIx>()
  catalog.forEach((g, i) => {
    const s = g.successor
    if (s === null || g.diedB === null || inherited.has(s)) return
    const next = catalog[s]
    if (next !== undefined && s > i && (next.bornB === g.diedB || next.bornB === g.diedB + 1)) {
      keys[s] = keys[i]!
      inherited.add(s)
    }
  })
  return keys
}

/** Un cursor del perfil: su identidad en pantalla, dónde se pinta y si es un grupo que ya no está. */
export interface Cursor {
  readonly key: string
  readonly g: GroupIx
  readonly km: number
  readonly number: number
  readonly own: boolean
  /** 0, un grupo del instante; n > 0, uno que se fue hace n repintados y se pinta aún (abajo) */
  readonly ghost: number
}

/** Cuántos repintados del perfil (a `barHz`, 4 por segundo) sigue un cursor cuyo grupo se ha ido. */
export const CURSOR_GHOST_PAINTS = 2

/**
 * LOS CURSORES DEL PERFIL QUE SIGUEN AL GRUPO POR SU SUCESOR (D-03; 6a). Los del instante, cada uno con
 * su identidad en pantalla (`screenKeysOf`), y los que estaban en el repintado anterior y ya no están,
 * durante `CURSOR_GHOST_PAINTS` repintados: si su cadena de sucesores llega a un grupo del instante,
 * se pintan en su km (una fuga cazada se funde con el cursor de su cazador, en lugar de desaparecer); si
 * no, se quedan donde iban (en un cambio de etiqueta, el sucesor nace un bloque después, y su cursor,
 * con la misma identidad, sigue desde ahí sin saltar).
 */
export function cursorsOf(
  groups: readonly GroupNow[],
  catalog: readonly GroupCatalogEntry[],
  keys: readonly string[],
  before: readonly Cursor[],
): Cursor[] {
  const used = new Set<string>()
  const live: Cursor[] = groups.map((x) => {
    let key = keys[x.g] ?? `g${x.g}`
    if (used.has(key)) key = `${key}~${x.g}`
    used.add(key)
    return { key, g: x.g, km: x.km, number: x.number, own: x.own, ghost: 0 }
  })
  const byG = new Map(groups.map((x) => [x.g, x] as const))
  const ghosts: Cursor[] = []
  for (const c of before) {
    if (used.has(c.key) || c.ghost >= CURSOR_GHOST_PAINTS) continue
    let s = catalog[c.g]?.successor ?? null
    for (let hops = 0; s !== null && !byG.has(s) && hops < catalog.length; hops++)
      s = catalog[s]?.successor ?? null
    const to = s === null ? undefined : byG.get(s)
    ghosts.push({ ...c, km: to === undefined ? c.km : Math.max(c.km, to.km), ghost: c.ghost + 1 })
  }
  return [...ghosts, ...live]
}

// ------------------------------------------------------------------- los rótulos (§6.5; 6a)

/** Un rótulo en pantalla: la palabra de arriba, en mayúsculas, y lo que la sigue. */
export interface CueText {
  readonly title: string
  readonly detail: string | null
}

/** Lo que el rótulo lee además del `Cue`: el reparto servido, el instante que se pinta y el perfil. */
export interface CueTextContext {
  readonly cast: readonly RiderCard[]
  readonly instant: Instant
  readonly profile: ProfileStrip
}

/** El corredor en un rótulo: el dorsal y el nombre, `45 Jules Moreau` (§6.5). */
function riderShort(cast: readonly RiderCard[], r: RiderIx): string {
  const c = cast[r]
  if (c === undefined) return `#${r + 1}`
  return c.bib === null ? c.name : `${c.bib} ${c.name}`
}

/** El maillot de líder en un rótulo, `Race leader` (§6.5, `DROPPED`). */
const LEADER_WORDS: Readonly<Record<JerseyKind, string>> = {
  gc: 'Race leader',
  points: 'Points leader',
  kom: 'Mountains leader',
}

/** La causa de un corte (§6.5, F.3), por `datos.causa`. */
const SPLIT_CAUSE_WORDS: Readonly<Record<string, string>> = {
  caida: 'after a crash',
  viento: 'in the crosswind',
  sector: 'on the cobbles',
  puerto: 'on the climb',
  caza: 'in the chase',
}

const join = (parts: readonly (string | null | undefined | false)[]): string | null => {
  const kept = parts.filter((p): p is string => typeof p === 'string' && p.length > 0)
  return kept.length === 0 ? null : kept.join(' · ')
}
const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`

/**
 * EL TEXTO DE UN RÓTULO (§6.5, los textos de §21.6 F.3, en inglés). Puro. El 6a dice lo que sale de los
 * sucesos y del estado (`cuesBetween`), con el corredor por su dorsal y su nombre; el rótulo de corredor
 * entero (§7.1, la bandera, el equipo y sus títulos), la presentación de la fuga, la crono y los de la
 * llegada son del 6b y del 10a, y aquí llevan solo su palabra.
 */
export function cueText(cue: Cue, ctx: CueTextContext): CueText {
  const { cast, instant } = ctx
  const rider = (r: RiderIx): string => riderShort(cast, r)
  const groupNow = (g: GroupIx): GroupNow | undefined => instant.groups.find((x) => x.g === g)
  const voiceWord = (g: GroupNow): string =>
    groupLabelText('en', g.label, g.role, 'voice', nameOf(cast))
  switch (cue.kind) {
    case 'attack': {
      const [first, ...rest] = [...cue.riders].sort(
        (a, b) =>
          (cast[a]?.notoriety ?? 8) - (cast[b]?.notoriety ?? 8) ||
          (cast[a]?.bib ?? a) - (cast[b]?.bib ?? b),
      )
      return {
        title: 'ATTACK',
        detail:
          first === undefined
            ? null
            : `${rider(first)}${rest.length > 0 ? ` and ${plural(rest.length, 'other', 'others')}` : ''}`,
      }
    }
    case 'break_formed': {
      const gap = instant.mainGap
      const behind = gap !== null && gap.ahead === cue.group ? groupNow(gap.behind) : undefined
      return {
        title: 'BREAKAWAY',
        detail: join([
          plural(cue.riders.length, 'rider', 'riders'),
          cue.gapS >= BROADCAST.sameTimeS
            ? `${gapText(cue.gapS)}${behind === undefined ? '' : ` ${versusText(behind, cast)}`}`
            : null,
        ]),
      }
    }
    case 'break_presented':
      return { title: 'BREAKAWAY', detail: null }
    case 'caught': {
      const was = groupNow(cue.caught)
      return {
        title: 'CAUGHT',
        detail: join([
          was === undefined ? GROUP_WORDS.role.lead[1] : voiceWord(was),
          `${cue.toGoKm.toFixed(1)} km to go`,
        ]),
      }
    }
    case 'split':
      // el abanico es su propio rótulo (F.3): `echelon` dice que viene de echelon_split (6b)
      if (cue.echelon) return { title: 'ECHELONS', detail: null }
      return {
        title: 'SPLIT IN THE BUNCH',
        detail: cue.cause === null ? null : (SPLIT_CAUSE_WORDS[cue.cause] ?? null),
      }
    case 'banner_result': {
      const b = instant.banners[cue.banner]
      if (b === undefined) return { title: 'INTERMEDIATE SPRINT', detail: null }
      const order = b.order
        .slice(0, 3)
        .map(
          (o, i) =>
            `${i + 1}. ${cast[o.rider]?.name ?? rider(o.rider)} ${o.points}${i === 0 ? ' pts' : ''}`,
        )
      if (b.kind === 'cima')
        return {
          title: 'KOM',
          detail: join([
            b.name === null
              ? b.cat === null
                ? null
                : climbCatText(b.cat)
              : `${b.name}${b.cat === null ? '' : ` (${climbCatText(b.cat)})`}`,
            ...order,
          ]),
        }
      return { title: 'INTERMEDIATE SPRINT', detail: join(order) }
    }
    case 'crash':
      return {
        title: 'CRASH',
        detail: cue.riders === null ? null : join(cue.riders.map(rider)),
      }
    case 'last_km': {
      const head = shownGroupsOf(instant)[0]
      return {
        title: 'FLAMME ROUGE · 1 KM',
        detail: join([
          head === undefined ? null : `${head.size} in front`,
          cue.leadGapS === null ? null : gapText(cue.leadGapS),
        ]),
      }
    }
    case 'group_changed': {
      const g = groupNow(cue.group)
      const kept = g === undefined ? null : g.size
      if (cue.gained.length > 0 && cue.gained.length >= cue.lost.length) {
        if (g?.kind === 'peloton' || g?.role === 'bunch')
          return {
            title: 'BACK TOGETHER',
            detail: `${plural(cue.gained.length, 'rider rejoins', 'riders rejoin')} the bunch`,
          }
        return {
          title: 'CONTACT',
          detail: `${plural(cue.gained.length, 'rider bridges', 'riders bridge')} across`,
        }
      }
      return {
        title: g === undefined ? 'GROUP' : voiceWord(g).replace(/^the /, '').toUpperCase(),
        detail:
          kept === null
            ? null
            : `${kept} of the ${kept + cue.lost.length - cue.gained.length} remain`,
      }
    }
    case 'mishap':
      return {
        title: cue.mishap === 'averia' ? 'MECHANICAL' : 'PUNCTURE',
        detail: rider(cue.rider),
      }
    case 'dropped': {
      const c = cast[cue.rider]
      return {
        title: 'DROPPED',
        detail: join([
          rider(cue.rider),
          c?.worn.kind === 'leader' ? LEADER_WORDS[c.worn.jersey] : null,
          cue.gapS === null ? null : gapText(cue.gapS),
        ]),
      }
    }
    case 'abandon':
      return {
        title: 'ABANDON',
        detail: join([rider(cue.rider), cast[cue.rider]?.team?.name ?? null]),
      }
    case 'climb_ahead': {
      const c = ctx.profile.climbs[cue.banner]
      return {
        title: c?.name ?? (c === undefined ? 'CLIMB' : `${climbCatText(c.cat)} climb`),
        detail:
          c === undefined
            ? null
            : `${climbCatText(c.cat)} · summit in ${Math.max(0, c.topKm - instant.headKm).toFixed(1)} km`,
      }
    }
    case 'time_check':
      return { title: 'TIME CHECK', detail: `${instant.toGoKm.toFixed(1)} km to go` }
    case 'virtual_gc':
      return { title: 'VIRTUAL GC', detail: null }
    case 'rider':
      return { title: rider(cue.rider), detail: cast[cue.rider]?.team?.name ?? null }
    case 'finish':
      return { title: 'STAGE WINNER', detail: null }
    case 'group_finish':
      return { title: 'FINISH', detail: null }
    case 'time_cut':
      return { title: 'TIME CUT', detail: null }
    case 'tt_start_order':
      return { title: 'START ORDER', detail: null }
    case 'tt_split':
      return { title: `SPLIT ${cue.check + 1}`, detail: rider(cue.rider) }
    case 'tt_finish':
      return { title: cue.hotSeat ? 'FINISH · HOT SEAT' : 'FINISH', detail: rider(cue.rider) }
  }
}
