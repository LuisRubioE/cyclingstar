/**
 * EL MAILLOT EN PANTALLA: SU TAMAÑO (E3, docs/visual.md §8.3 y §15; PR 2b). Ningún maillot se pinta por
 * debajo de `KIT_MIN_PX` (D-00b; el dueño: «los maillots creo que nunca deberian mostrarse a 13 o 16
 * pixels, minimo 28 pixels»), y siempre a uno de los tamaños con nombre de `KIT_PX`, que `KitSize` obliga.
 *
 * Nace en el PR 2b con solo esto, porque la comprobación 10 de la prueba del teléfono importa
 * `KIT_MIN_PX` (§7.1) antes de que exista el vocabulario del maillot, que llega a este fichero con el PR
 * 16a (15-a). Las dos vistas grandes, `showcase` (160) y `poster` (320), entran con el 17c (D-00g, §8.10).
 */

/** El maillot más pequeño que se pinta, en píxeles CSS, de alto y de ancho (D-00b). */
export const KIT_MIN_PX = 28

/** Los tamaños con nombre: la fila de una lista, la tarjeta, el equipo, la página y la cabecera. */
export const KIT_PX = { row: 28, card: 40, team: 48, page: 72, hero: 96 } as const

/** Un tamaño de maillot: uno de `KIT_PX`, ninguno por debajo de `KIT_MIN_PX`. */
export type KitSize = (typeof KIT_PX)[keyof typeof KIT_PX]
