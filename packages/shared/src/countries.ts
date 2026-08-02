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
  // Wave 1 of the rollout to all cycling-federation countries (#1), each with a real name pool.
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'CZ', name: 'Czechia', flag: '🇨🇿' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿' },
  // Wave 2.
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹' },
  { code: 'BY', name: 'Belarus', flag: '🇧🇾' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  // Wave 3.
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  // Wave 4.
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
]

const CODES = new Set(COUNTRIES.map((c) => c.code))

/** ¿Tenemos datos (nombres, selector) para este país? Acepta mayúsculas o minúsculas. */
export function isKnownCountry(code: string): boolean {
  return CODES.has(code.toUpperCase())
}
