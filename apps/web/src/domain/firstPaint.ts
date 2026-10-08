/**
 * LA PRIMERA PINTURA DE `Watch` (E2, paso 10b, los arreglos; docs/retransmision.md §18.5, D-56: ≤ 2 s con
 * «Fast 4G» y la CPU a ×4, medida en Chromium a 360 × 800). Puro.
 *
 * Una carga en frío de la página de etapa es una cadena: el HTML, los ficheros de la web, los de la página,
 * `/health` (los interruptores), el horizonte (el `rev` de las claves, §10.9), la ficha de la etapa, la
 * cabecera de `Watch` y el primer cuadro de la previa. Con la red del teléfono cada eslabón es un viaje de
 * unos 175 ms, y con HTTP/1.1 los que no caben en las seis conexiones esperan turno. Lo que la acorta sin
 * pedir nada nuevo ni cambiar lo que se pinta: los ficheros de la página de etapa se piden en cuanto se
 * evalúa la web (`isStagePagePath`, aquí, que lee `App.tsx`) y no en el primer render; la cabecera sale a la
 * vez que la ficha (`stageHeadQuery`, en `pages/stageView.tsx`) y no detrás de ella; y `/health` sale con el
 * HTML (una precarga de `index.html`). Este módulo lo importa solo `App.tsx`: si lo importara además una
 * página, el empaquetador lo sacaría a un fichero propio, una petición más en cada carga (nota 4 del 9b).
 */

/** ¿Es la URL de la página de una etapa (la de hoy o la vieja de `/races`), sin su acta? */
export function isStagePagePath(pathname: string): boolean {
  return /^\/(?:world\/)?races\/[^/]+\/stages\/[^/]+\/?$/.test(pathname)
}
