/**
 * Regla común de tablas del juego (docs/navegacion.md §7.3).
 *
 * Una sola convención en todo el juego: se ven las 20 primeras filas y SIEMPRE hay salida para ver
 * el resto. Ni truncar sin remedio —la página de etapa cortaba a 15/15/10 y no se podía consultar
 * un resultado completo— ni volcar las 176 filas de una gran vuelta encima del jugador.
 */

/** Filas visibles antes de pedir "Show all" (el botón es `ui/ShowAllRows`; el de antes se fue en el 21m). */
export const TOP_ROWS = 20
