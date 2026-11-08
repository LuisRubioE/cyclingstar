/**
 * LA REGLA DE LA PRUEBA DEL TELÉFONO, DESDE EL PASO 24 (E3, docs/visual.md §7.4 y §17.24): cero. Hasta el
 * cierre, `telefono-baseline.json` guardaba las faltas de cada pantalla y ancho, y un trinquete contra la
 * base del PR, sobre el mismo mundo, no dejaba subir ninguna. E3 terminó con el fichero a cero, y el paso
 * 24 lo borra: cada comprobación da cero en cada pantalla, ancho y modo, sobre cualquier mundo, o no corre
 * (`null`). Pura, para que la prueba la pruebe con cifras de mentira antes de usarla con las de verdad
 * (`telefono.spec.ts`).
 */

/** Las faltas de una pantalla a un ancho, en el orden de §7.1; `null` donde la comprobación no corre. */
export type Cifras = readonly (number | null)[]

/** Los nombres de las diez comprobaciones de §7.1, para los mensajes. */
export const COMPROBACIONES = [
  '1 · el reflujo',
  '2 · los recortes',
  '3 · la letra',
  '4 · los campos',
  '5 · los objetivos',
  '6 · axe-core',
  '7 · la respuesta',
  '8 · la acción',
  '9 · el alto',
  '10 · el maillot',
] as const

/**
 * La comprobación propia de la 09 (§7.3; Rcobertura-040, 14-g; PR 17a): el borde de abajo de la barra de
 * grupos, medida aparte, a 360, con su cifra sola.
 */
export const COMPROBACION_DE_LA_BARRA = ['la barra de grupos'] as const

/**
 * Lo que está mal de una medida, vacío si nada: cada comprobación que no da cero, con su cifra. Una medida
 * con más o menos cifras que comprobaciones también es una falta: una cifra que falta no puede pasar por
 * una que no corre.
 */
export function faltasDeCero(
  cifras: Cifras,
  nombres: readonly string[] = COMPROBACIONES,
): string[] {
  if (cifras.length !== nombres.length)
    return [`la medida trae ${cifras.length} cifras y las comprobaciones son ${nombres.length}`]
  return nombres.flatMap((nombre, i) => {
    const c = cifras[i] ?? null
    return c === null || c === 0 ? [] : [`${nombre}: ${c}`]
  })
}
