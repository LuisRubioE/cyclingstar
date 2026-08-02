import { seededRng } from '@cyclingstar/shared'

/**
 * Nombres de equipo ficticios en el idioma de cada país (SPEC 7), romanizados (letras latinas) para
 * que se lean bien en cualquier navegador. Un nombre = una palabra evocadora + una palabra de
 * ciclismo/equipo, ambas en el idioma del país. Determinista por semilla; sin identidades reales.
 *
 * Los idiomas con alfabeto no latino (chino, japonés, coreano, tailandés, árabe, persa, armenio,
 * georgiano…) usan una romanización aproximada y de sabor, no una transliteración estricta: son
 * marcas inventadas al estilo del idioma.
 */

export type LangId =
  | 'es'
  | 'pt'
  | 'it'
  | 'fr'
  | 'de'
  | 'nl'
  | 'en'
  | 'sca'
  | 'fi'
  | 'sla'
  | 'tr'
  | 'gr'
  | 'he'
  | 'ko'
  | 'zh'
  | 'ja'
  | 'turkic'
  | 'et'
  | 'lt'
  | 'ro'
  | 'hu'
  | 'sq'
  | 'id'
  | 'rw'
  | 'ar'
  | 'fa'
  | 'am'
  | 'ka'
  | 'hy'
  | 'vi'
  | 'th'

interface Pack {
  first: string[]
  second: string[]
}

// Palabras de "equipo/ciclismo" compartidas (internacionalismos que se usan tal cual en muchos
// nombres reales); cada idioma añade además las suyas propias.
const INTL = ['Cycling', 'Racing', 'Pro Cycling']

const PACKS: Record<LangId, Pack> = {
  es: {
    first: [
      'Aurora',
      'Fuego',
      'Cumbre',
      'Halcón',
      'Relámpago',
      'Vendaval',
      'Toro',
      'Andes',
      'Sierra',
      'Lince',
      'Fénix',
      'Bravo',
    ],
    second: ['Ciclismo', 'Equipo Ciclista', 'Ruta', 'Escuadra', ...INTL],
  },
  pt: {
    first: [
      'Aurora',
      'Fogo',
      'Serra',
      'Falcão',
      'Relâmpago',
      'Atlântico',
      'Bravo',
      'Ibérico',
      'Fénix',
      'Onda',
      'Lince',
      'Corvo',
    ],
    second: ['Ciclismo', 'Equipa', 'Rota', 'Ciclista', ...INTL],
  },
  it: {
    first: [
      'Aurora',
      'Fuoco',
      'Vetta',
      'Falco',
      'Freccia',
      'Lampo',
      'Toro',
      'Aquila',
      'Fenice',
      'Onda',
      'Vento',
      'Cima',
    ],
    second: ['Ciclismo', 'Squadra', 'Corse', 'Velo', ...INTL],
  },
  fr: {
    first: [
      'Aurore',
      'Boréal',
      'Sommet',
      'Faucon',
      'Flèche',
      'Éclair',
      'Mistral',
      'Aigle',
      'Phénix',
      'Onde',
      'Vent',
      'Cime',
    ],
    second: ['Cyclisme', 'Équipe', 'Vélo', 'Course', ...INTL],
  },
  de: {
    first: [
      'Feuer',
      'Gipfel',
      'Falke',
      'Pfeil',
      'Blitz',
      'Adler',
      'Phönix',
      'Welle',
      'Nord',
      'Stein',
      'Sturm',
      'Berg',
    ],
    second: ['Radsport', 'Radteam', 'Velo', 'Team', ...INTL],
  },
  nl: {
    first: [
      'Noord',
      'Vuur',
      'Valk',
      'Pijl',
      'Bliksem',
      'Adelaar',
      'Feniks',
      'Golf',
      'Storm',
      'Duin',
      'Havik',
      'Berg',
    ],
    second: ['Wielrennen', 'Wielerteam', 'Velo', 'Team', ...INTL],
  },
  en: {
    first: [
      'Vanguard',
      'Summit',
      'Ironside',
      'Northwind',
      'Apex',
      'Falcon',
      'Granite',
      'Meridian',
      'Highland',
      'Frontier',
      'Beacon',
      'Titan',
    ],
    second: ['Cycling Team', 'Wheelers', 'Velo', ...INTL],
  },
  sca: {
    first: [
      'Nord',
      'Fjord',
      'Vinter',
      'Storm',
      'Falk',
      'Ørn',
      'Foss',
      'Bølge',
      'Frost',
      'Bjørn',
      'Vind',
      'Nova',
    ],
    second: ['Cykling', 'Sykkel', 'Velo', ...INTL],
  },
  fi: {
    first: [
      'Pohjola',
      'Tuli',
      'Huippu',
      'Haukka',
      'Salama',
      'Kotka',
      'Myrsky',
      'Aalto',
      'Routa',
      'Karhu',
      'Tuuli',
      'Nova',
    ],
    second: ['Pyöräily', 'Velo', 'Team', ...INTL],
  },
  sla: {
    first: [
      'Sever',
      'Oganj',
      'Vrh',
      'Sokol',
      'Strela',
      'Grom',
      'Orel',
      'Feniks',
      'Val',
      'Veter',
      'Zubr',
      'Bura',
    ],
    second: ['Kolo', 'Velo', 'Team', ...INTL],
  },
  tr: {
    first: [
      'Yıldız',
      'Ateş',
      'Zirve',
      'Şahin',
      'Şimşek',
      'Kartal',
      'Anka',
      'Dalga',
      'Rüzgar',
      'Boğa',
      'Doruk',
      'Bora',
    ],
    second: ['Bisiklet', 'Takım', 'Velo', ...INTL],
  },
  gr: {
    first: [
      'Astro',
      'Fotia',
      'Koryfi',
      'Geraki',
      'Velos',
      'Astrapi',
      'Aetos',
      'Kyma',
      'Anemos',
      'Tavros',
      'Vouno',
      'Nova',
    ],
    second: ['Podilasia', 'Velo', 'Team', ...INTL],
  },
  he: {
    first: [
      'Kochav',
      'Esh',
      'Pisga',
      'Nesher',
      'Barak',
      'Ayit',
      'Gal',
      'Ruach',
      'Ari',
      'Tsafon',
      'Sela',
      'Nova',
    ],
    second: ['Cycling', 'Velo', 'Team', ...INTL],
  },
  ko: {
    first: [
      'Baram',
      'Bit',
      'Yong',
      'Maebi',
      'Beongae',
      'Doksuri',
      'Bulsae',
      'Pado',
      'Bukpung',
      'Horang',
      'Sanmaru',
      'Nova',
    ],
    second: ['Cycling', 'Velo', 'Team', ...INTL],
  },
  zh: {
    first: [
      'Feilong',
      'Jinying',
      'Kuaiche',
      'Changcheng',
      'Xingchen',
      'Leiming',
      'Xiongying',
      'Fenghuang',
      'Jufeng',
      'Beifang',
      'Menghu',
      'Xunfeng',
    ],
    second: ['Che Dui', 'Cycling', 'Velo', ...INTL],
  },
  ja: {
    first: [
      'Kaze',
      'Hikari',
      'Ryu',
      'Taka',
      'Yajiri',
      'Inazuma',
      'Washi',
      'Nami',
      'Arashi',
      'Kita',
      'Hayabusa',
      'Nova',
    ],
    second: ['Jitensha', 'Velo', 'Team', ...INTL],
  },
  turkic: {
    first: [
      'Burkit',
      'Qyran',
      'Jebe',
      'Bora',
      'Qasqyr',
      'Tulpar',
      'Dala',
      'Boran',
      'Shyngys',
      'Altyn',
      'Samal',
      'Nova',
    ],
    second: ['Cycling', 'Velo', 'Team', ...INTL],
  },
  et: {
    first: [
      'Põhja',
      'Tuli',
      'Tipp',
      'Kotkas',
      'Nool',
      'Välk',
      'Orel',
      'Laine',
      'Torm',
      'Karu',
      'Tuul',
      'Nova',
    ],
    second: ['Rattaklubi', 'Velo', 'Team', ...INTL],
  },
  lt: {
    first: [
      'Šiaurė',
      'Ugnis',
      'Viršūnė',
      'Sakalas',
      'Strėlė',
      'Žaibas',
      'Erelis',
      'Banga',
      'Vėjas',
      'Lokys',
      'Audra',
      'Nova',
    ],
    second: ['Dviratis', 'Velo', 'Team', ...INTL],
  },
  ro: {
    first: [
      'Astru',
      'Foc',
      'Vârf',
      'Șoim',
      'Săgeata',
      'Fulger',
      'Vultur',
      'Fenix',
      'Val',
      'Vânt',
      'Taur',
      'Bora',
    ],
    second: ['Ciclism', 'Echipa', 'Velo', ...INTL],
  },
  hu: {
    first: [
      'Csillag',
      'Tűz',
      'Csúcs',
      'Sólyom',
      'Nyíl',
      'Villám',
      'Sas',
      'Főnix',
      'Hullám',
      'Szél',
      'Bika',
      'Nova',
    ],
    second: ['Kerékpár', 'Velo', 'Team', ...INTL],
  },
  sq: {
    first: [
      'Yll',
      'Zjarr',
      'Maja',
      'Skifter',
      'Shigjeta',
      'Vetëtima',
      'Shqiponja',
      'Vala',
      'Era',
      'Ariu',
      'Stuhia',
      'Nova',
    ],
    second: ['Çiklizëm', 'Ekipi', 'Velo', ...INTL],
  },
  id: {
    first: [
      'Garuda',
      'Api',
      'Puncak',
      'Elang',
      'Panah',
      'Petir',
      'Rajawali',
      'Ombak',
      'Angin',
      'Harimau',
      'Badai',
      'Nova',
    ],
    second: ['Balap', 'Velo', 'Team', ...INTL],
  },
  rw: {
    first: [
      'Intare',
      'Umuriro',
      'Impinga',
      'Inyenyeri',
      'Inkuba',
      'Izuba',
      'Umuraba',
      'Umuyaga',
      'Ingwe',
      'Umusozi',
      'Sakabaka',
      'Nova',
    ],
    second: ['Cycling', 'Velo', 'Team', ...INTL],
  },
  ar: {
    first: [
      'Al Nasr',
      'Al Saqr',
      'Al Assad',
      'Al Faris',
      'Al Barq',
      'Al Nesr',
      'Al Anka',
      'Al Mawj',
      'Al Riyah',
      'Al Jabal',
      'Al Shams',
      'Al Bahr',
    ],
    second: ['Cycling', 'Velo', 'Team', ...INTL],
  },
  fa: {
    first: [
      'Simorgh',
      'Atash',
      'Shahin',
      'Tir',
      'Raad',
      'Oghab',
      'Ghoghnoos',
      'Mowj',
      'Baad',
      'Kuh',
      'Shir',
      'Nova',
    ],
    second: ['Cycling', 'Velo', 'Team', ...INTL],
  },
  am: {
    first: [
      'Kokeb',
      'Isat',
      'Ras',
      'Nesir',
      'Mebrek',
      'Berhan',
      'Anbessa',
      'Mishig',
      'Nefas',
      'Terara',
      'Wanza',
      'Nova',
    ],
    second: ['Cycling', 'Velo', 'Team', ...INTL],
  },
  ka: {
    first: [
      'Varskvlavi',
      'Tsetskhli',
      'Mtsvervali',
      'Arcivi',
      'Tesli',
      'Elva',
      'Zgva',
      'Talga',
      'Kari',
      'Datvi',
      'Mze',
      'Nova',
    ],
    second: ['Cycling', 'Velo', 'Team', ...INTL],
  },
  hy: {
    first: [
      'Astgh',
      'Krak',
      'Sar',
      'Artsiv',
      'Nyet',
      'Kaydzak',
      'Arev',
      'Piunik',
      'Alik',
      'Kamin',
      'Arjuk',
      'Nova',
    ],
    second: ['Cycling', 'Velo', 'Team', ...INTL],
  },
  vi: {
    first: [
      'Rong',
      'Lua',
      'Dinh',
      'Chim Ung',
      'Mui Ten',
      'Set',
      'Dai Bang',
      'Song',
      'Gio',
      'Ho',
      'Bao',
      'Nova',
    ],
    second: ['Xe Dap', 'Velo', 'Team', ...INTL],
  },
  th: {
    first: [
      'Payu',
      'Fai',
      'Singha',
      'Krut',
      'Chang',
      'Wayu',
      'Suriya',
      'Insi',
      'Khiri',
      'Rung',
      'Nakhon',
      'Nova',
    ],
    second: ['Cycling', 'Velo', 'Team', ...INTL],
  },
}

/** País (ISO alpha-2) → idioma de sus nombres de equipo. Los no listados caen a inglés. */
const COUNTRY_LANG: Record<string, LangId> = {
  ES: 'es',
  CO: 'es',
  AR: 'es',
  MX: 'es',
  EC: 'es',
  CL: 'es',
  VE: 'es',
  UY: 'es',
  PE: 'es',
  CR: 'es',
  GT: 'es',
  BO: 'es',
  PA: 'es',
  DO: 'es',
  PY: 'es',
  CU: 'es',
  PT: 'pt',
  BR: 'pt',
  IT: 'it',
  FR: 'fr',
  LU: 'fr',
  DE: 'de',
  AT: 'de',
  CH: 'de',
  NL: 'nl',
  BE: 'nl',
  GB: 'en',
  US: 'en',
  AU: 'en',
  IE: 'en',
  CA: 'en',
  NZ: 'en',
  ZA: 'en',
  SG: 'en',
  PH: 'en',
  GU: 'en',
  IN: 'en',
  NG: 'en',
  KE: 'en',
  DK: 'sca',
  NO: 'sca',
  SE: 'sca',
  IS: 'sca',
  FI: 'fi',
  SI: 'sla',
  SK: 'sla',
  PL: 'sla',
  CZ: 'sla',
  HR: 'sla',
  UA: 'sla',
  RU: 'sla',
  RS: 'sla',
  BG: 'sla',
  BY: 'sla',
  MK: 'sla',
  TR: 'tr',
  GR: 'gr',
  IL: 'he',
  KR: 'ko',
  CN: 'zh',
  HK: 'zh',
  JP: 'ja',
  KZ: 'turkic',
  UZ: 'turkic',
  AZ: 'turkic',
  KG: 'turkic',
  EE: 'et',
  LT: 'lt',
  LV: 'lt',
  RO: 'ro',
  MD: 'ro',
  HU: 'hu',
  XK: 'sq',
  ID: 'id',
  MY: 'id',
  RW: 'rw',
  MA: 'ar',
  DZ: 'ar',
  EG: 'ar',
  TN: 'ar',
  AE: 'ar',
  SA: 'ar',
  QA: 'ar',
  BH: 'ar',
  IR: 'fa',
  ET: 'am',
  ER: 'am',
  GE: 'ka',
  AM: 'hy',
  VN: 'vi',
  TH: 'th',
}

/** Idioma de los nombres de equipo de un país (inglés por defecto). */
export function langForCountry(country: string): LangId {
  return COUNTRY_LANG[country.toUpperCase()] ?? 'en'
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!
}

/** Nombre candidato (determinista) en el idioma del país: primera + segunda palabra. */
export function teamNameCandidate(seed: string, country: string): string {
  const pack = PACKS[langForCountry(country)]
  const rng = seededRng(`${seed}:teamname`)
  return `${pick(pack.first, rng)} ${pick(pack.second, rng)}`
}

/**
 * Nombre de equipo único (frente a `used`) en el idioma del país. Reintenta con variantes de la
 * semilla; si tras muchos intentos sigue chocando, añade un numeral romano como desempate estable.
 */
export function makeLangTeamName(seed: string, country: string, used: Set<string>): string {
  const pack = PACKS[langForCountry(country)]
  for (let attempt = 0; attempt < 60; attempt++) {
    const rng = seededRng(`${seed}:teamname:${attempt}`)
    const name = `${pick(pack.first, rng)} ${pick(pack.second, rng)}`
    if (!used.has(name.toLowerCase())) {
      used.add(name.toLowerCase())
      return name
    }
  }
  const ROMAN = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
  const base = teamNameCandidate(seed, country)
  for (const r of ROMAN) {
    const name = `${base} ${r}`
    if (!used.has(name.toLowerCase())) {
      used.add(name.toLowerCase())
      return name
    }
  }
  // Último recurso (prácticamente inalcanzable): la propia semilla como sufijo.
  const fallback = `${base} ${seed.slice(-4)}`
  used.add(fallback.toLowerCase())
  return fallback
}
