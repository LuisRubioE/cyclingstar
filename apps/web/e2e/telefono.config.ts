/**
 * LO QUE ES UN TELÉFONO PARA LA PRUEBA (E3, docs/visual.md §7.1, §7.6 y §15; PR 2b). Las constantes de la
 * prueba que no son de la web: los dos teléfonos, la respuesta, el pulgar, el alto de una herramienta y
 * la letra. Las de la letra y el dedo de la web viven en `src/components/ui/constants.ts` y la del
 * maillot en `@cyclingstar/shared`; la prueba las importa de allí y no las copia (D-02).
 */

/** El teléfono de referencia: 360 × 800 con tacto y relación de píxeles 2. */
export const PHONE_REF = {
  viewport: { width: 360, height: 800 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
} as const

/** El más estrecho que se mira: 320 × 640, el de un teléfono pequeño. */
export const PHONE_MIN = {
  viewport: { width: 320, height: 640 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
} as const

/** El borde de arriba de la respuesta de la pantalla, a 360 × 800 (la comprobación 7). */
export const ANSWER_MAX_TOP_PX = 520

/** La parte de abajo de la ventana que alcanza el pulgar, donde va la acción (la comprobación 8). */
export const THUMB_ZONE = 0.4

/** El alto de una pantalla de herramienta en su estado inicial (la comprobación 9). */
export const TOOL_PAGE_MAX_PX = 3200

/** La letra con que pinta Chromium en la prueba, la de `e2e/fonts.conf` (§7.6; 7-k). */
export const PHONE_FONT = 'DejaVu Sans'
