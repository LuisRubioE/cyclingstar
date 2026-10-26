import type { ArrivalLabel } from '@cyclingstar/shared'

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
