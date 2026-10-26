/**
 * LAS REGLAS DEL TRINQUETE (E3, docs/visual.md §7.4; PR 2b). Puras, para que la prueba las pruebe con
 * cifras de mentira antes de usarlas con las de verdad (`telefono.spec.ts`).
 *
 * El trinquete compara dos medidas de la misma ejecución, sobre el mismo mundo: la web de la base del PR
 * (`r`) y la del PR (`m`). Y dos ficheros: `telefono-baseline.json` en la base (`b`) y en el PR (`h`). El
 * mundo cambia de una construcción a otra, así que los ficheros no se comparan con la medida cifra a
 * cifra; dicen hacia dónde va cada una, y tienen que ir hacia donde va la medida.
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
 * Lo que está mal de un PR frente a su base, en una pantalla y un ancho; vacío si nada.
 *
 * - Ninguna cifra sube sobre la base medida (`m > r`).
 * - Si una baja, el fichero del PR la baja también (`h < b`): el PR apunta lo que mejora.
 * - Si no cambia, el fichero tampoco: no se apunta una bajada que no se mide.
 * - Si una comprobación empieza o deja de correr (una pantalla gana su edición, §7.4 regla 3), el fichero
 *   lo dice igual: un número donde la medida da un número y `null` donde da `null`.
 *
 * Sin medida de la base (`r` sin definir: una pantalla nueva, o una que la base no pudo abrir) no hay con
 * qué comparar; sin fichero en la base (`b` sin definir: el PR que lo crea), o con `instrumentoCambia`
 * (el PR toca las comprobaciones o las pantallas, o cambia la clave del mundo: §7.4, regla 1), el fichero
 * se reescribe y solo cuenta que no suba.
 */
export function faltasDelTrinquete(
  m: Cifras,
  r: Cifras | undefined,
  h: Cifras | undefined,
  b: Cifras | undefined,
  opciones: { readonly instrumentoCambia: boolean },
): string[] {
  if (h === undefined) return ['no está en telefono-baseline.json']
  if (r === undefined) return []
  return COMPROBACIONES.flatMap((nombre, i) => {
    const mi = m[i] ?? null
    const ri = r[i] ?? null
    const hi = h[i] ?? null
    const bi = b === undefined ? undefined : (b[i] ?? null)
    if (mi !== null && ri !== null && mi > ri)
      return [`${nombre}: sube de ${ri} a ${mi} sobre la base`]
    if (bi === undefined || opciones.instrumentoCambia) return []
    if (mi === ri)
      return hi === bi
        ? []
        : [`${nombre}: el fichero cambia de ${bi} a ${hi} y la medida no (${mi})`]
    if (mi === null || ri === null)
      return (hi === null) === (mi === null)
        ? []
        : [`${nombre}: la medida pasa de ${ri} a ${mi} y el fichero dice ${hi}`]
    return hi !== null && bi !== null && hi < bi
      ? []
      : [
          `${nombre}: baja de ${ri} a ${mi} y el fichero no lo apunta (${bi} en la base, ${hi} en el PR)`,
        ]
  })
}
