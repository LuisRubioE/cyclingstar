/**
 * LA FRONTERA (E3, docs/visual.md §13; D-53, D-54, D-55; PR 19a a 19d). Toda respuesta de la API es un
 * subconjunto de lo que una pantalla enseña a quien la pide, en su forma de pantalla: un número interno no
 * cruza nunca, y lo que cruza, alguien lo lee en la web. `frontera.test.ts` recorre los esquemas de
 * respuesta del registro hoja por hoja y lo comprueba. Lo que no cumplía iba aquí, con su motivo y su PR de
 * salida, y la lista solo encogía: desde el 19d está vacía, y su tope es 0.
 */

/** Los nombres de los números internos: una hoja que se llama así no cruza (§13.2, punto 3). */
export const INTERNAL_NUMBER_NAMES = [
  'ctl',
  'atl',
  'tsb',
  'tss',
  'ceiling',
  'talent',
  'fragility',
] as const

/** Lo que una hoja de una respuesta rompe de la regla. */
export type FronteraBreak =
  /** nadie la lee en `apps/web/src` */
  | 'sin_lector'
  /** se llama como un número interno */
  | 'numero_interno'
  /** cruza con más resolución de la que enseña la pantalla: un número de un `attributes` sin su forma */
  | 'resolucion'

/**
 * Una excepción: las rutas, las hojas (con `[]` por cada array y `.*` por cada registro) y lo que rompen,
 * con su porqué y el PR que la quita. Una fila de la tabla de §13.2 es una excepción, aunque nombre varias
 * rutas o varias hojas.
 */
export interface FronteraException {
  readonly routes: readonly [string, ...string[]]
  readonly fields: readonly [string, ...string[]]
  readonly breaks: FronteraBreak
  readonly why: string
  /** el PR que la quita */
  readonly until: string
}

/**
 * Solo encoge: añadir una entrada pide subir el tope, y eso se revisa en el PR (13-e). 22 en el 19a, 16 en el
 * 19b, 4 en el 19c y 0 desde el 19d.
 */
export const FRONTERA_SIN_USO_MAX = 0

/**
 * La tabla de §13.2, con lo que el 19a encontró además al entrar. El 19b quitó las seis primeras (los
 * atributos, la condición, la flecha y la moral cruzan en su forma), el 19c doce de las dieciséis que
 * quedaban y el 19d las cuatro de las rutas de la web de ayer, que el 19c había dejado opcionales para la web
 * del 19b (regla 6 de §17.1; D-50). Si alguna vuelve, sus campos van con `[]` por cada array, `*` por un
 * tramo cualquiera y `**` por los que sean.
 */
export const FRONTERA_SIN_USO: readonly FronteraException[] = []

/**
 * Si una hoja casa con el campo de una excepción: `*` casa con un tramo cualquiera y `**` con los que sean.
 * Lo usan `frontera.test.ts` y el canario (`spoilerCanary.test.ts`).
 */
export function fieldMatches(field: string, pattern: string): boolean {
  const a = field.split('.')
  const b = pattern.split('.')
  const desde = (i: number, j: number): boolean => {
    if (j === b.length) return i === a.length
    if (b[j] === '**') return desde(i, j + 1) || (i < a.length && desde(i + 1, j))
    return i < a.length && (b[j] === '*' || b[j] === a[i]) && desde(i + 1, j + 1)
  }
  return desde(0, 0)
}

/** Si `FRONTERA_SIN_USO` todavía deja pasar esa hoja en esa ruta. */
export const excused = (route: string, field: string): boolean =>
  FRONTERA_SIN_USO.some(
    (x) => x.routes.includes(route) && x.fields.some((p) => fieldMatches(field, p)),
  )
