/**
 * Países disponibles en el MVP (los que tienen dataset de nombres, Paso 13). Cada uno con su
 * bandera para el selector de creación (SPEC 3.6). El país por IP se preselecciona y es editable.
 */

export interface Country {
  /** Código ISO-3166 alpha-2 en mayúsculas. */
  code: string
  name: string
  flag: string
}

export const COUNTRIES: Country[] = [
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
]

const CODES = new Set(COUNTRIES.map((c) => c.code))

/** ¿Tenemos datos (nombres, selector) para este país? Acepta mayúsculas o minúsculas. */
export function isKnownCountry(code: string): boolean {
  return CODES.has(code.toUpperCase())
}
