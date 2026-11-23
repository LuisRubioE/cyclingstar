/**
 * EL NOMBRE DE UN APARATO (docs/cuenta.md §6.4; DD-06 A, 6-d): `<navegador> on <sistema>` a partir del
 * agente, calculado en la API; la web nunca ve el agente crudo ni la IP. `Unknown browser` si no reconoce
 * el navegador. El orden de las comprobaciones importa: `Edg/` antes que `Chrome/`; `SamsungBrowser/`,
 * `CriOS/` y `FxiOS/` antes que `Safari`; `iPad` antes que `Mac` (un iPad moderno puede anunciarse como
 * `Macintosh`: entonces sale `Safari on Mac`, y se acepta).
 */

/** Los navegadores, en el orden en que se miran. */
const NAVEGADORES: readonly (readonly [RegExp, string])[] = [
  [/Edg(A|iOS)?\//, 'Edge'],
  [/SamsungBrowser\//, 'Samsung Internet'],
  [/CriOS\//, 'Chrome'],
  [/FxiOS\//, 'Firefox'],
  [/Firefox\//, 'Firefox'],
  [/Chrome\//, 'Chrome'],
  [/Safari\//, 'Safari'],
]

/** Los sistemas, en el orden en que se miran. */
const SISTEMAS: readonly (readonly [RegExp, string])[] = [
  [/iPad/, 'iPad'],
  [/iPhone/, 'iPhone'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/Macintosh|Mac OS X/, 'Mac'],
  [/CrOS/, 'ChromeOS'],
  [/Linux/, 'Linux'],
]

export const UNKNOWN_BROWSER = 'Unknown browser'

export function deviceLabel(userAgent: string | null | undefined): string {
  const agente = userAgent ?? ''
  const navegador = NAVEGADORES.find(([re]) => re.test(agente))?.[1]
  if (navegador === undefined) return UNKNOWN_BROWSER
  const sistema = SISTEMAS.find(([re]) => re.test(agente))?.[1]
  return sistema === undefined ? navegador : `${navegador} on ${sistema}`
}
