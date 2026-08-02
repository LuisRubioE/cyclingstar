/**
 * Modelo de regiones (SPEC 8, calendario UCI). Cada país pertenece a una de las cinco
 * confederaciones continentales de la UCI (UEC Europa, ACC Asia, CAC África, COPACI América, OCC
 * Oceanía). El calendario continental y las reglas de inscripción por región se apoyan en este mapa.
 */

export type Continent = 'Europe' | 'Asia' | 'Africa' | 'America' | 'Oceania'

export const CONTINENTS: Continent[] = ['Europe', 'Asia', 'Africa', 'America', 'Oceania']

/** Nombre de la confederación continental de la UCI para cada continente. */
export const CONFEDERATION: Record<Continent, string> = {
  Europe: 'UEC',
  Asia: 'ACC',
  Africa: 'CAC',
  America: 'COPACI',
  Oceania: 'OCC',
}

/** Confederación a la que la UCI adscribe cada país (código ISO alpha-2 en mayúsculas). */
const CONTINENT_BY_COUNTRY: Record<string, Continent> = {
  // Europa (UEC)
  ES: 'Europe',
  FR: 'Europe',
  IT: 'Europe',
  BE: 'Europe',
  NL: 'Europe',
  GB: 'Europe',
  DE: 'Europe',
  PT: 'Europe',
  DK: 'Europe',
  NO: 'Europe',
  SI: 'Europe',
  SK: 'Europe',
  CH: 'Europe',
  PL: 'Europe',
  AT: 'Europe',
  IE: 'Europe',
  CZ: 'Europe',
  SE: 'Europe',
  UA: 'Europe',
  EE: 'Europe',
  LV: 'Europe',
  LT: 'Europe',
  BY: 'Europe',
  FI: 'Europe',
  HR: 'Europe',
  HU: 'Europe',
  RO: 'Europe',
  RU: 'Europe',
  RS: 'Europe',
  BG: 'Europe',
  GR: 'Europe',
  TR: 'Europe',
  IL: 'Europe',
  LU: 'Europe',
  GE: 'Europe',
  MD: 'Europe',
  AM: 'Europe',
  IS: 'Europe',
  AZ: 'Europe',
  MK: 'Europe',
  XK: 'Europe',
  // Asia (ACC)
  JP: 'Asia',
  KZ: 'Asia',
  KR: 'Asia',
  CN: 'Asia',
  IR: 'Asia',
  IN: 'Asia',
  TH: 'Asia',
  ID: 'Asia',
  PH: 'Asia',
  MY: 'Asia',
  VN: 'Asia',
  AE: 'Asia',
  UZ: 'Asia',
  SA: 'Asia',
  QA: 'Asia',
  SG: 'Asia',
  KG: 'Asia',
  HK: 'Asia',
  BH: 'Asia',
  // África (CAC)
  ZA: 'Africa',
  MA: 'Africa',
  ER: 'Africa',
  RW: 'Africa',
  DZ: 'Africa',
  EG: 'Africa',
  ET: 'Africa',
  NG: 'Africa',
  KE: 'Africa',
  TN: 'Africa',
  // América (COPACI)
  CO: 'America',
  US: 'America',
  AR: 'America',
  MX: 'America',
  EC: 'America',
  CA: 'America',
  BR: 'America',
  CL: 'America',
  VE: 'America',
  UY: 'America',
  PE: 'America',
  CR: 'America',
  GT: 'America',
  BO: 'America',
  CU: 'America',
  PA: 'America',
  DO: 'America',
  PY: 'America',
  HN: 'America',
  // Oceanía (OCC)
  AU: 'Oceania',
  NZ: 'Oceania',
  GU: 'Oceania',
}

/** Continente (confederación UCI) de un país, o null si no está registrado. */
export function continentForCountry(code: string): Continent | null {
  return CONTINENT_BY_COUNTRY[code.toUpperCase()] ?? null
}
