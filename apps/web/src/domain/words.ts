import { type ArrivalLabel, seasonPosition } from '@cyclingstar/shared'

/**
 * LAS PALABRAS DE PANTALLA (E3, docs/visual.md §4.10; D-15, I-19): una palabra por cosa, junto a
 * `labels.ts` y `format.ts`. Nace en el PR 9b con las de sus componentes; cada PR que pinte una cosa
 * nueva escribe aquí la suya, y la columna «Nunca» de §4.10 dice lo que no vuelve.
 */

/** Cómo se llega a la carrera (D-00n), en el orden de `Scale5`. Nunca `Rusty`, `Too tired` ni `Too fresh`. */
export const ARRIVAL_WORD: Readonly<Record<ArrivalLabel, string>> = {
  fundido: 'Cooked',
  cargado: 'Loaded',
  bien: 'Fine',
  perfecto: 'Spot on',
  oxidado: 'Undertrained',
}

/** Un abandono: sin puesto y al final de la tabla (§4.5). Nunca el nombre tachado. */
export const DNF_WORD = 'DNF'

/** Lo que falta, en minutos hacia arriba: nunca se dice de menos. */
function minutosQueFaltan(ms: number): number {
  return Math.ceil(Math.max(0, ms) / 60_000)
}

const plural = (n: number, una: string) => `${n} ${una}${n === 1 ? '' : 's'}`

/**
 * EL RELOJ DEL MUNDO de la cabecera (§6.3; PR 11): el día de la temporada, la temporada y lo que falta
 * para el próximo avance, en horas y minutos (`Day 50 · S1 · 4h 56m`), y para el lector la frase entera
 * (`Day 50 of season 1. Next update in 4 hours 56 minutes.`). Nunca el día absoluto ni `GD 50` (§4.10).
 */
export function worldClock(
  gameDay: number | null,
  remainingMs: number,
): { readonly text: string; readonly label: string } {
  const min = minutosQueFaltan(remainingMs)
  const h = Math.floor(min / 60)
  const m = min % 60
  const corto = min === 0 ? 'now' : h > 0 ? `${h}h ${m}m` : `${m}m`
  const partes = [h > 0 ? plural(h, 'hour') : '', m > 0 ? plural(m, 'minute') : '']
  const largo = min === 0 ? 'now' : `in ${partes.filter((p) => p !== '').join(' ')}`
  if (gameDay === null || gameDay < 1)
    return {
      text: `Not started · ${corto}`,
      label: `The world has not started yet. Next update ${largo}.`,
    }
  const { season, dayOfSeason } = seasonPosition(gameDay)
  return {
    text: `Day ${dayOfSeason} · S${season} · ${corto}`,
    label: `Day ${dayOfSeason} of season ${season}. Next update ${largo}.`,
  }
}

/**
 * UN DÍA (§4.10; PR 12a): el de la temporada, `Day 56`, y a siete días o menos, cuánto falta
 * (`Day 56 · in 6 days`, `Day 50 · today`). Nunca `GD 56` ni el día absoluto. `today`, el día de hoy en la
 * temporada; sin él, solo el día.
 */
export function formatGameDay(day: number, today: number | null): string {
  const n = today === null ? -1 : day - today
  if (n < 0 || n > 7) return `Day ${day}`
  return `Day ${day} · ${n === 0 ? 'today' : `in ${plural(n, 'day')}`}`
}
