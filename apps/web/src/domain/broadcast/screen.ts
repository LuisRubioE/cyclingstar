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
  type GroupNow,
  type Instant,
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
