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
  // Wave 5.
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'ER', name: 'Eritrea', flag: '🇪🇷' },
  // Wave 6.
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
  { code: 'GE', name: 'Georgia', flag: '🇬🇪' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  // Wave 7.
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦' },
  { code: 'MD', name: 'Moldova', flag: '🇲🇩' },
  // Wave 8.
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'AM', name: 'Armenia', flag: '🇦🇲' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸' },
  // Wave 9.
  { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿' },
  { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
  { code: 'MK', name: 'North Macedonia', flag: '🇲🇰' },
  // Wave 10 — territorios con federación UCI presentes en el pelotón Continental real.
  { code: 'KG', name: 'Kyrgyzstan', flag: '🇰🇬' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
  { code: 'GU', name: 'Guam', flag: '🇬🇺' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭' },
  { code: 'XK', name: 'Kosovo', flag: '🇽🇰' },
]

const CODES = new Set(COUNTRIES.map((c) => c.code))

/** ¿Tenemos datos (nombres, selector) para este país? Acepta mayúsculas o minúsculas. */
export function isKnownCountry(code: string): boolean {
  return CODES.has(code.toUpperCase())
}
