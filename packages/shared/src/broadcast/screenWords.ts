/**
 * LAS PALABRAS DE LA PANTALLA DE `Watch` (E2, docs/retransmision.md §6.2, §6.3, §6.4, §7.4; D-17, D-18,
 * D-27): lo que escriben la capa fija y la barra de grupos sobre un instante, y qué grupos pinta la barra.
 * Puro y en inglés, como la pantalla (los textos de §21.6 F.3).
 *
 * Una sola copia (paso 10a): nacieron en la web (`apps/web/src/domain/broadcast/screen.ts`, 3c y 6b), y la
 * prueba de lectura (`readingTest.ts`, 10b adelantado) las copió porque un script de Node no puede
 * importar la web. Desde el 10a la web las importa de aquí y su copia se borró: la verdad que imprime
 * `scripts/pl-truth.mjs` y la pantalla no pueden decir cosas distintas (nota 1 del 10b, preparación).
 */
import { JERSEY_LABEL, type RiderCard } from '../jerseys.js'
import { BROADCAST } from './constants.js'
import type { GroupNow, Instant } from './instant.js'
import {
  COUNTRY_NAMES,
  PULL_MOTIVE_WORDS,
  type PullingLine,
  championTitleText,
  groupLabelText,
} from './names.js'
import type { RiderIx } from './timeline.js'

/** `m:ss`, y `h:mm:ss` desde la hora. */
export function clockText(totalS: number): string {
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

/** LOS KM A META DE LA CAPA FIJA (§6.2): `98.5 km to go`, `850 m to go`, `3 laps to go · 42.5 km`, `Last lap · 8.2 km to go`. */
export function toGoText(toGoKm: number, lapsToGo: number | null): string {
  if (lapsToGo !== null && lapsToGo > 1) return `${lapsToGo} laps to go · ${toGoKm.toFixed(1)} km`
  if (lapsToGo === 1) return `Last lap · ${distanceText(toGoKm)} to go`
  return `${distanceText(toGoKm)} to go`
}

/**
 * UN HUECO DE CARRETERA (§6.2): la diferencia principal de la capa fija y el hueco de cada fila de la
 * barra, `+3:46`, `+1:02:10`; por debajo de `sameTimeS`, `s.t.`. Era `gapText` en la web.
 */
export function mainGapText(gapS: number): string {
  return gapS < BROADCAST.sameTimeS ? 's.t.' : `+${clockText(gapS)}`
}

/** El nombre de un corredor en la pantalla: tal como está guardado (7-a). */
export function nameOf(cards: readonly RiderCard[]): (r: RiderIx) => string {
  return (r) => cards[r]?.name ?? `#${r + 1}`
}

/** El corredor con su dorsal: `107 Andrea Rossi` (§6.5). */
export function riderShort(cards: readonly RiderCard[], r: RiderIx): string {
  const c = cards[r]
  if (c === undefined) return `#${r + 1}`
  return c.bib === null ? c.name : `${c.bib} ${c.name}`
}

/** CONTRA QUIÉN mide la capa fija: la palabra de voz de ese grupo, `on the bunch` (§6.2, 6-b). */
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
 * QUIÉN TIRA (§6.4; D-27, I-46, 6-d): `Pulling: all 3 in turn` (`both in turn` con dos; `4 of 5 in turn`
 * si no están todos), o cada equipo con su porqué, `(for 107 Andrea Rossi)` si dos de sus relevistas
 * comparten destinatario y, si no, su motivo (`(chasing)`), y `+2 teams` si tiran más de dos.
 * `oneTeam`: en el móvil, solo el primero (`+N teams` con el resto).
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

/**
 * LOS GRUPOS QUE PINTAN LA BARRA Y EL PERFIL (6a): los del instante con alguien dentro, renumerados por
 * carretera. Un grupo recién nacido cuyos corredores aún se pintan en el de detrás (los que salen en dos
 * grupos van en el de atrás y en tránsito, 3-b) va vacío en el instante unos segundos de carrera, hasta
 * que se ve su marca siguiente: en las cinco congeladas, del 0,1 al 0,3 % de los segundos, y en la mitad
 * de ellos es el primero de la carretera. El instante lo conserva (I2 lo cuenta); la pantalla no pinta
 * una fila ni un cursor sin nadie, y el número de carretera (que renumera y no es identidad, §6.2) es el
 * de lo pintado. Desde el 10a, la capa fija lee de la fila 1 de esta lista y no del grupo 1 del instante
 * (`instantAt`, la cabeza de la pantalla).
 */
export function shownGroupsOf(instant: Pick<Instant, 'groups'>): readonly GroupNow[] {
  if (instant.groups.every((g) => g.size > 0)) return instant.groups
  return instant.groups.filter((g) => g.size > 0).map((g, i) => ({ ...g, number: i + 1 }))
}
