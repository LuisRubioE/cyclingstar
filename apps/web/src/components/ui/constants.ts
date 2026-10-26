/**
 * LAS CONSTANTES VISUALES DE LA WEB (E3, docs/visual.md §2.5, §6.4 y §15; PR 2b). Las cuatro de la letra
 * y el dedo las importa la prueba del teléfono (`e2e/telefono.spec.ts`, las comprobaciones 3, 4 y 5) y
 * no las copia (D-02); los componentes del catálogo (`ui/*`, desde el PR 9a) las usan para sus tamaños.
 */

/** Ningún texto por debajo de 12 px, tampoco dentro de un SVG (la comprobación 3). */
export const MIN_FONT_PX = 12

/** Ningún campo de texto por debajo de 16 px: iOS amplía la página al tocarlo (la comprobación 4). */
export const MIN_FIELD_FONT_PX = 16

/** El objetivo de un control, 44 × 44 px (la comprobación 5). */
export const MIN_TARGET_PX = 44

/**
 * El de un enlace de frase: 24 × 24 px, o un círculo de 24 px sobre su caja que no toque otro objetivo
 * (WCAG 2.5.8; la comprobación 5).
 */
export const MIN_INLINE_TARGET_PX = 24

/**
 * EL ESQUELETO QUE NO PARPADEA (§4.2; PR 10): `QueryView` lo pinta invisible y lo enseña con su pulso a los
 * 300 ms. En caliente la web contesta en 1,07 a 1,18 s (telefono §8.2), y uno pintado desde el primer
 * instante destellaría en cada respuesta rápida; invisible, ya ocupa el alto de lo que viene.
 */
export const LOADING_DELAY_MS = 300

/** A los 8 s cargando, o con un 429, el aviso de red lenta: `Still loading. Slow connection?` · `Retry`. */
export const SLOW_HINT_MS = 8_000
