/**
 * Calendario de temporada del MVP (SPEC 8, Paso 34). 28 carreras con nombre "Race + Geografía"
 * repartidas en los días de competición (15..290), en tres niveles (WT, Pro Series, Continental)
 * y con reglas de inscripción por división. Todo es autoría pura y determinista, reutilizando el
 * contrato de etapa del motor (StageProfile). Las tres grandes vueltas y Race France llevan sus
 * 21 etapas; los perfiles se componen de constructores reutilizables (llana, media, reina, crono,
 * clásica de adoquines) para dar variedad sin imitar recorridos reales.
 */
import { COUNTRIES, type Continent } from '@cyclingstar/shared'
import type { Division } from '../world/npc.js'
import type { Segment, StageProfile } from '../stage/types.js'
import type { StageKind } from './testTour.js'
import type { RaceClass } from './uci.js'

export type RaceLevel = 'WT' | 'PRS' | 'CON'
export type RaceFormat = 'gran-vuelta' | 'una-semana' | 'un-dia'

/** Especificación de un tipo de etapa antes de nombrarla y numerarla. */
export interface StageSpec {
  kind: StageKind
  /** Etiqueta corta para la web (Flat, Hills, Summit finish, ITT, Cobbles…). */
  label: string
  profile: StageProfile
  timeTrial?: boolean
}

export interface CalendarStage extends StageSpec {
  /** Número de etapa dentro de la carrera (1-based). */
  index: number
  name: string
}

export interface CalendarRace {
  id: string
  name: string
  level: RaceLevel
  /** Clase de carrera (.WT/.Pro/.1/.2/.NC): fija prestigio y baremo de puntos (SPEC 8). */
  raceClass: RaceClass
  format: RaceFormat
  /** Día de la temporada en que arranca (15..290). */
  startDay: number
  /** Divisiones cuyos equipos pueden inscribirse (SPEC 8). Vacío en carreras de campo nacional. */
  openTo: Division[]
  /**
   * Continente de una carrera del circuito continental: da preferencia a los equipos de la región,
   * dejando algunas plazas de wildcard a equipos de fuera. Sin región = carrera abierta (global).
   */
  region?: Continent
  /**
   * Si está, la carrera es un campeonato nacional (.NC): el pelotón es individual, formado por los
   * mejores corredores de ESE país (no por equipos). Código de país ISO alpha-2.
   */
  championshipCountry?: string
  stages: CalendarStage[]
  /** Descansos tras estas etapas (solo grandes vueltas). */
  restAfter?: number[]
}

/** Quién puede inscribirse según el nivel de la carrera: los inferiores entran como invitados. */
function enrollmentFor(level: RaceLevel): Division[] {
  if (level === 'WT') return ['WT', 'PRS']
  if (level === 'PRS') return ['WT', 'PRS', 'CON']
  return ['PRS', 'CON']
}

/** Coloca banners: una cima al final de cada puerto y, si se pide, una meta volante intermedia. */
function auto(segments: Segment[], sprintFrac?: number): StageProfile {
  const banners = []
  let cum = 0
  for (const s of segments) {
    cum += s.km
    if (s.tipo === 'puerto') banners.push({ km: Math.round(cum), tipo: 'cima' as const })
  }
  if (sprintFrac != null) {
    banners.push({ km: Math.round(cum * sprintFrac), tipo: 'meta_volante' as const })
  }
  banners.sort((a, b) => a.km - b.km)
  return { segments, banners }
}

// --- Constructores de etapa (km total -> perfil variado). Cada uno reserva un tramo de relleno. ---

const flat = (km: number): StageSpec => ({
  kind: 'llana',
  label: 'Flat',
  profile: auto([{ km, tipo: 'llano' }], 0.5),
})

const rolling = (km: number): StageSpec => {
  const fill = km - (6 + 30 + 6 + 15)
  return {
    kind: 'media',
    label: 'Rolling',
    profile: auto(
      [
        { km: fill, tipo: 'llano' },
        { km: 6, tipo: 'puerto', tramos: [{ km: 6, g: 5 }] },
        { km: 30, tipo: 'rompepiernas' },
        { km: 6, tipo: 'puerto', tramos: [{ km: 6, g: 6 }] },
        { km: 15, tipo: 'llano' },
      ],
      0.4,
    ),
  }
}

const hilly = (km: number): StageSpec => {
  const fill = km - (9 + 10 + 20 + 6 + 15)
  return {
    kind: 'media',
    label: 'Hills',
    profile: auto(
      [
        { km: fill, tipo: 'llano' },
        { km: 9, tipo: 'puerto', tramos: [{ km: 9, g: 6 }] },
        { km: 10, tipo: 'descenso', tramos: [{ km: 10, g: -5 }] },
        { km: 20, tipo: 'rompepiernas' },
        { km: 6, tipo: 'puerto', tramos: [{ km: 6, g: 5 }] },
        { km: 15, tipo: 'llano' },
      ],
      0.5,
    ),
  }
}

const mountain = (km: number): StageSpec => {
  const fill = km - (12 + 15 + 8 + 18)
  return {
    kind: 'reina',
    label: 'Summit finish',
    profile: auto([
      { km: fill, tipo: 'llano' },
      { km: 12, tipo: 'puerto', tramos: [{ km: 12, g: 7 }] },
      { km: 15, tipo: 'descenso', tramos: [{ km: 15, g: -6 }] },
      { km: 8, tipo: 'rompepiernas' },
      { km: 18, tipo: 'puerto', tramos: [{ km: 18, g: 8 }] }, // meta en alto (HC)
    ]),
  }
}

const itt = (km: number): StageSpec => ({
  kind: 'cri',
  label: 'ITT',
  timeTrial: true,
  profile: { segments: [{ km, tipo: 'llano' }] },
})

const cobbles = (km: number): StageSpec => {
  const fill = km - (4 + 20 + 5 + 15 + 3)
  return {
    kind: 'clasica',
    label: 'Cobbles',
    profile: auto(
      [
        { km: fill, tipo: 'llano' },
        { km: 4, tipo: 'paves', estrellas: 3 },
        { km: 20, tipo: 'llano' },
        { km: 5, tipo: 'paves', estrellas: 5 },
        { km: 15, tipo: 'llano' },
        { km: 3, tipo: 'paves', estrellas: 4 },
      ],
      0.6,
    ),
  }
}

const classic = (km: number): StageSpec => {
  // Clásica dura de un día: sucesión de repechos y un puerto medio, final quebrado.
  const fill = km - (8 + 25 + 6 + 12)
  return {
    kind: 'clasica',
    label: 'Classic',
    profile: auto(
      [
        { km: fill, tipo: 'llano' },
        { km: 8, tipo: 'puerto', tramos: [{ km: 8, g: 6 }] },
        { km: 25, tipo: 'rompepiernas' },
        { km: 6, tipo: 'puerto', tramos: [{ km: 6, g: 8 }] },
        { km: 12, tipo: 'rompepiernas' },
      ],
      0.55,
    ),
  }
}

/** Nombra y numera una lista de specs como las etapas de una carrera. */
function stagesFrom(specs: StageSpec[]): CalendarStage[] {
  return specs.map((spec, i) => ({
    ...spec,
    index: i + 1,
    name: `Stage ${i + 1} · ${spec.label}`,
  }))
}

/** Arco genérico de gran vuelta: 21 etapas variadas y dos descansos (tras la 9 y la 15). */
function grandTour(id: string, name: string, startDay: number): CalendarRace {
  const specs = [
    flat(198),
    flat(205),
    hilly(190),
    flat(210),
    mountain(180),
    rolling(184),
    flat(172),
    hilly(196),
    itt(32),
    // descanso
    mountain(175),
    flat(188),
    rolling(178),
    mountain(168),
    hilly(192),
    flat(186),
    // descanso
    mountain(170),
    mountain(142),
    hilly(178),
    itt(28),
    mountain(148),
    flat(120),
  ]
  return {
    id,
    name,
    level: 'WT',
    raceClass: 'WT',
    format: 'gran-vuelta',
    startDay,
    openTo: enrollmentFor('WT'),
    stages: stagesFrom(specs),
    restAfter: [9, 15],
  }
}

/** Race France: 21 etapas hechas a mano, con etapa de adoquines y dos cronos (SPEC 8). */
function raceFrance(): CalendarRace {
  const specs = [
    flat(195), // Grand Départ
    hilly(199),
    flat(210),
    cobbles(155), // etapa de pavé
    itt(33),
    rolling(180),
    flat(170),
    hilly(183),
    mountain(155), // primer alto
    // descanso
    flat(190),
    mountain(165),
    rolling(178),
    hilly(193),
    mountain(152),
    flat(188),
    // descanso
    mountain(168), // etapa reina (HC)
    mountain(130), // corta y explosiva
    hilly(175),
    itt(26), // crono decisiva
    mountain(145), // último alto
    flat(128), // paseo final
  ]
  return {
    id: 'race-france',
    name: 'Race France',
    level: 'WT',
    raceClass: 'WT',
    format: 'gran-vuelta',
    startDay: 175,
    openTo: enrollmentFor('WT'),
    stages: stagesFrom(specs),
    restAfter: [9, 15],
  }
}

const MONTH_CUM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]

/**
 * Día de temporada de la mayoría de campeonatos nacionales. En el ciclismo real casi todos se
 * disputan el MISMO fin de semana (el último de junio; 2026 ≈ 27 jun = día 178), por eso comparten
 * fecha. Las excepciones de calendario (hemisferio sur / Asia en enero) van en el mapa de abajo.
 */
const NATIONALS_DAY = 178

/**
 * Fecha real (mes, día) de los campeonatos que NO caen en el fin de semana de junio: hemisferio sur
 * y algún calendario asiático corren en enero. Ampliable país a país; el resto usa NATIONALS_DAY.
 */
const NATIONALS_DATE_OVERRIDE: Record<string, [number, number]> = {
  AU: [1, 10], // Australia
  NZ: [1, 11], // Nueva Zelanda
  TH: [1, 17], // Tailandia
}

/**
 * Campeonato nacional de un país (.NC): carrera de un día, pelotón individual de ese país. El
 * pelotón real lo arma la capa de datos con los mejores corredores de la nación (no por equipos).
 */
function nationalChampionship(code: string, name: string): CalendarRace {
  const raceName = `${name} National Championship`
  const override = NATIONALS_DATE_OVERRIDE[code]
  const startDay = override ? doy(override[0], override[1]) : NATIONALS_DAY
  return {
    id: `nc-${code.toLowerCase()}`,
    name: raceName,
    level: 'CON',
    raceClass: 'NC',
    format: 'un-dia',
    startDay,
    openTo: [],
    championshipCountry: code,
    stages: [{ ...classic(220), index: 1, name: raceName }],
  }
}

/** Los 92 campeonatos nacionales, uno por país registrado (SPEC 8). */
const NATIONAL_CHAMPIONSHIPS: CalendarRace[] = COUNTRIES.map((c) =>
  nationalChampionship(c.code, c.name),
)

// --- Calendario real (estructura 2026) por tabla de datos, con nombres NEUTROS por geografía. ---
// Solo se copian los HECHOS (fechas, clase, formato); los nombres de marca se sustituyen y los
// perfiles de etapa son autoría propia. Día de temporada = día del año (temporada ≈ año no bisiesto).

function doy(month: number, day: number): number {
  return MONTH_CUM[month - 1]! + day
}

type Terrain = 'flat' | 'hilly' | 'mountain' | 'cobbles' | 'classic' | 'itt'

interface RaceRow {
  id: string
  name: string
  /** Fecha de arranque real (mes 1-based, día): fija el día de temporada. */
  m: number
  d: number
  raceClass: RaceClass
  region?: Continent
  /** Nº de etapas si es vuelta por etapas; ausente/1 = carrera de un día. */
  stages?: number
  /** Terreno dominante para el perfil (autoría propia). */
  terrain?: Terrain
  /** Km de una carrera de un día (por defecto según terreno). */
  km?: number
}

/** Perfil de una carrera de un día según su terreno. */
function oneDaySpec(terrain: Terrain, km: number): StageSpec {
  if (terrain === 'cobbles') return cobbles(km)
  if (terrain === 'classic') return classic(km)
  if (terrain === 'mountain') return mountain(km)
  if (terrain === 'hilly') return hilly(km)
  if (terrain === 'itt') return itt(km)
  return flat(km)
}

/** Mezcla determinista de etapas para una vuelta de n etapas con sesgo de terreno (autoría propia). */
function stageMix(n: number, terrain: Terrain): StageSpec[] {
  const specs: StageSpec[] = []
  for (let i = 0; i < n; i++) {
    const first = i === 0
    const last = i === n - 1
    // Una crono hacia el final en vueltas de 6+ etapas (salvo terreno llano).
    if (n >= 6 && i === n - 2 && terrain !== 'flat') {
      specs.push(itt(22))
      continue
    }
    if (first) {
      specs.push(flat(180))
      continue
    }
    if (last) {
      specs.push(terrain === 'mountain' ? mountain(150) : flat(150))
      continue
    }
    if (terrain === 'mountain') specs.push(i % 2 === 0 ? hilly(175) : mountain(160))
    else if (terrain === 'hilly') specs.push(i % 2 === 0 ? flat(178) : hilly(172))
    else specs.push(i % 2 === 0 ? flat(185) : hilly(170))
  }
  return specs
}

/** Construye una carrera del calendario real desde su fila de datos. */
function buildRace(row: RaceRow): CalendarRace {
  const startDay = doy(row.m, row.d)
  const level: RaceLevel = row.raceClass === 'WT' ? 'WT' : row.raceClass === 'Pro' ? 'PRS' : 'CON'
  const common = {
    id: row.id,
    name: row.name,
    level,
    raceClass: row.raceClass,
    startDay,
    openTo: enrollmentFor(level),
    ...(row.region ? { region: row.region } : {}),
  }
  if (!row.stages || row.stages <= 1) {
    const spec = oneDaySpec(row.terrain ?? 'flat', row.km ?? 210)
    return { ...common, format: 'un-dia', stages: [{ ...spec, index: 1, name: row.name }] }
  }
  return {
    ...common,
    format: 'una-semana',
    stages: stagesFrom(stageMix(row.stages, row.terrain ?? 'flat')),
  }
}

/**
 * WorldTour real 2026 (35 carreras + las tres grandes vueltas), con nombres neutros por geografía y
 * fechas reales. Solo hechos; los recorridos son autoría propia.
 */
const WT_TABLE: RaceRow[] = [
  {
    id: 'race-down-under',
    name: 'Race Down Under',
    m: 1,
    d: 20,
    raceClass: 'WT',
    stages: 6,
    terrain: 'hilly',
  },
  {
    id: 'race-great-ocean',
    name: 'Race Great Ocean',
    m: 2,
    d: 1,
    raceClass: 'WT',
    terrain: 'hilly',
  },
  {
    id: 'race-emirates',
    name: 'Race Emirates',
    m: 2,
    d: 16,
    raceClass: 'WT',
    stages: 7,
    terrain: 'flat',
  },
  {
    id: 'race-opening-classic',
    name: 'Race Opening Classic',
    m: 2,
    d: 28,
    raceClass: 'WT',
    terrain: 'cobbles',
    km: 200,
  },
  {
    id: 'race-white-roads',
    name: 'Race White Roads',
    m: 3,
    d: 7,
    raceClass: 'WT',
    terrain: 'classic',
    km: 215,
  },
  {
    id: 'race-to-the-sun',
    name: 'Race to the Sun',
    m: 3,
    d: 8,
    raceClass: 'WT',
    stages: 8,
    terrain: 'mountain',
  },
  {
    id: 'race-two-seas',
    name: 'Race Two Seas',
    m: 3,
    d: 9,
    raceClass: 'WT',
    stages: 7,
    terrain: 'hilly',
  },
  {
    id: 'race-sanremo',
    name: 'Race Sanremo',
    m: 3,
    d: 21,
    raceClass: 'WT',
    terrain: 'hilly',
    km: 288,
  },
  {
    id: 'race-catalonia',
    name: 'Race Catalonia',
    m: 3,
    d: 23,
    raceClass: 'WT',
    stages: 7,
    terrain: 'mountain',
  },
  {
    id: 'race-bruges',
    name: 'Race Bruges',
    m: 3,
    d: 25,
    raceClass: 'WT',
    terrain: 'cobbles',
    km: 205,
  },
  {
    id: 'race-harelbeke',
    name: 'Race Harelbeke',
    m: 3,
    d: 27,
    raceClass: 'WT',
    terrain: 'cobbles',
    km: 205,
  },
  {
    id: 'race-wevelgem',
    name: 'Race Wevelgem',
    m: 3,
    d: 29,
    raceClass: 'WT',
    terrain: 'cobbles',
    km: 250,
  },
  {
    id: 'race-across-flanders',
    name: 'Race Across Flanders',
    m: 4,
    d: 1,
    raceClass: 'WT',
    terrain: 'cobbles',
    km: 185,
  },
  {
    id: 'race-flanders',
    name: 'Race Flanders',
    m: 4,
    d: 5,
    raceClass: 'WT',
    terrain: 'cobbles',
    km: 260,
  },
  {
    id: 'race-basque-country',
    name: 'Race Basque Country',
    m: 4,
    d: 6,
    raceClass: 'WT',
    stages: 6,
    terrain: 'mountain',
  },
  {
    id: 'race-roubaix',
    name: 'Race Roubaix',
    m: 4,
    d: 12,
    raceClass: 'WT',
    terrain: 'cobbles',
    km: 257,
  },
  {
    id: 'race-amstel',
    name: 'Race Amstel',
    m: 4,
    d: 19,
    raceClass: 'WT',
    terrain: 'hilly',
    km: 254,
  },
  {
    id: 'race-walloon-wall',
    name: 'Race Walloon Wall',
    m: 4,
    d: 22,
    raceClass: 'WT',
    terrain: 'mountain',
    km: 200,
  },
  {
    id: 'race-liege',
    name: 'Race Liège',
    m: 4,
    d: 26,
    raceClass: 'WT',
    terrain: 'classic',
    km: 255,
  },
  {
    id: 'race-romandy',
    name: 'Race Romandy',
    m: 4,
    d: 28,
    raceClass: 'WT',
    stages: 6,
    terrain: 'mountain',
  },
  {
    id: 'race-frankfurt',
    name: 'Race Frankfurt',
    m: 5,
    d: 1,
    raceClass: 'WT',
    terrain: 'hilly',
    km: 205,
  },
  {
    id: 'race-rhone-alpes',
    name: 'Race Rhône-Alpes',
    m: 6,
    d: 7,
    raceClass: 'WT',
    stages: 8,
    terrain: 'mountain',
  },
  {
    id: 'race-copenhagen',
    name: 'Race Copenhagen',
    m: 6,
    d: 14,
    raceClass: 'WT',
    terrain: 'flat',
    km: 210,
  },
  {
    id: 'race-switzerland',
    name: 'Race Switzerland',
    m: 6,
    d: 17,
    raceClass: 'WT',
    stages: 8,
    terrain: 'mountain',
  },
  {
    id: 'race-san-sebastian',
    name: 'Race San Sebastián',
    m: 8,
    d: 1,
    raceClass: 'WT',
    terrain: 'classic',
    km: 220,
  },
  {
    id: 'race-poland',
    name: 'Race Poland',
    m: 8,
    d: 3,
    raceClass: 'WT',
    stages: 7,
    terrain: 'hilly',
  },
  {
    id: 'race-hamburg',
    name: 'Race Hamburg',
    m: 8,
    d: 16,
    raceClass: 'WT',
    terrain: 'flat',
    km: 216,
  },
  {
    id: 'race-benelux',
    name: 'Race Benelux',
    m: 8,
    d: 19,
    raceClass: 'WT',
    stages: 5,
    terrain: 'flat',
  },
  {
    id: 'race-brittany',
    name: 'Race Brittany',
    m: 8,
    d: 30,
    raceClass: 'WT',
    terrain: 'hilly',
    km: 190,
  },
  {
    id: 'race-quebec',
    name: 'Race Québec',
    m: 9,
    d: 11,
    raceClass: 'WT',
    terrain: 'hilly',
    km: 201,
  },
  {
    id: 'race-montreal',
    name: 'Race Montréal',
    m: 9,
    d: 13,
    raceClass: 'WT',
    terrain: 'hilly',
    km: 209,
  },
  {
    id: 'race-lombardy',
    name: 'Race Lombardy',
    m: 10,
    d: 10,
    raceClass: 'WT',
    terrain: 'classic',
    km: 252,
  },
  {
    id: 'race-guangxi',
    name: 'Race Guangxi',
    m: 10,
    d: 13,
    raceClass: 'WT',
    stages: 6,
    terrain: 'flat',
  },
]

const WT_RACES: CalendarRace[] = [
  ...WT_TABLE.map(buildRace),
  grandTour('race-italy', 'Race Italy', doy(5, 8)),
  grandTour('race-spain', 'Race Spain', doy(8, 22)),
  { ...raceFrance(), startDay: doy(7, 4) },
]

/**
 * ProSeries real 2026 (~60 carreras, clase .Pro), con nombres neutros por geografía y fechas reales.
 * Un día = clase 1.Pro; por etapas = clase 2.Pro. Solo hechos; los recorridos son autoría propia.
 */
const PRO_TABLE: RaceRow[] = [
  {
    id: 'race-arabia',
    name: 'Race Arabia',
    m: 1,
    d: 27,
    raceClass: 'Pro',
    stages: 5,
    terrain: 'flat',
  },
  {
    id: 'race-surf-coast',
    name: 'Race Surf Coast',
    m: 1,
    d: 29,
    raceClass: 'Pro',
    terrain: 'hilly',
  },
  {
    id: 'race-valencia',
    name: 'Race Valencia',
    m: 2,
    d: 4,
    raceClass: 'Pro',
    stages: 5,
    terrain: 'hilly',
  },
  { id: 'race-muscat', name: 'Race Muscat', m: 2, d: 6, raceClass: 'Pro', terrain: 'flat' },
  {
    id: 'race-oman',
    name: 'Race Oman',
    m: 2,
    d: 7,
    raceClass: 'Pro',
    stages: 5,
    terrain: 'mountain',
  },
  { id: 'race-figueira', name: 'Race Figueira', m: 2, d: 14, raceClass: 'Pro', terrain: 'flat' },
  { id: 'race-almeria', name: 'Race Almería', m: 2, d: 15, raceClass: 'Pro', terrain: 'flat' },
  {
    id: 'race-algarve',
    name: 'Race Algarve',
    m: 2,
    d: 18,
    raceClass: 'Pro',
    stages: 5,
    terrain: 'mountain',
  },
  {
    id: 'race-andalusia',
    name: 'Race Andalusia',
    m: 2,
    d: 18,
    raceClass: 'Pro',
    stages: 5,
    terrain: 'mountain',
  },
  { id: 'race-ardeche', name: 'Race Ardèche', m: 2, d: 28, raceClass: 'Pro', terrain: 'hilly' },
  { id: 'race-drome', name: 'Race Drôme', m: 3, d: 1, raceClass: 'Pro', terrain: 'hilly' },
  {
    id: 'race-kuurne',
    name: 'Race Kuurne',
    m: 3,
    d: 1,
    raceClass: 'Pro',
    terrain: 'cobbles',
    km: 200,
  },
  {
    id: 'race-laigueglia',
    name: 'Race Laigueglia',
    m: 3,
    d: 4,
    raceClass: 'Pro',
    terrain: 'hilly',
  },
  {
    id: 'race-nokere',
    name: 'Race Nokere',
    m: 3,
    d: 18,
    raceClass: 'Pro',
    terrain: 'cobbles',
    km: 190,
  },
  { id: 'race-turin', name: 'Race Turin', m: 3, d: 18, raceClass: 'Pro', terrain: 'hilly' },
  {
    id: 'race-denain',
    name: 'Race Denain',
    m: 3,
    d: 19,
    raceClass: 'Pro',
    terrain: 'cobbles',
    km: 200,
  },
  { id: 'race-bredene', name: 'Race Bredene', m: 3, d: 20, raceClass: 'Pro', terrain: 'flat' },
  { id: 'race-navarre', name: 'Race Navarre', m: 4, d: 4, raceClass: 'Pro', terrain: 'hilly' },
  {
    id: 'race-loire',
    name: 'Race Loire',
    m: 4,
    d: 7,
    raceClass: 'Pro',
    stages: 4,
    terrain: 'flat',
  },
  { id: 'race-schelde', name: 'Race Schelde', m: 4, d: 8, raceClass: 'Pro', terrain: 'flat' },
  {
    id: 'race-hainan',
    name: 'Race Hainan',
    m: 4,
    d: 15,
    raceClass: 'Pro',
    stages: 5,
    terrain: 'flat',
  },
  { id: 'race-brabant', name: 'Race Brabant', m: 4, d: 17, raceClass: 'Pro', terrain: 'hilly' },
  {
    id: 'race-alps',
    name: 'Race Alps',
    m: 4,
    d: 20,
    raceClass: 'Pro',
    stages: 5,
    terrain: 'mountain',
  },
  {
    id: 'race-turkiye',
    name: 'Race Türkiye',
    m: 4,
    d: 26,
    raceClass: 'Pro',
    stages: 8,
    terrain: 'hilly',
  },
  { id: 'race-morbihan', name: 'Race Morbihan', m: 5, d: 9, raceClass: 'Pro', terrain: 'hilly' },
  {
    id: 'race-leon',
    name: 'Race Léon',
    m: 5,
    d: 10,
    raceClass: 'Pro',
    terrain: 'cobbles',
    km: 185,
  },
  {
    id: 'race-hungary',
    name: 'Race Hungary',
    m: 5,
    d: 13,
    raceClass: 'Pro',
    stages: 5,
    terrain: 'flat',
  },
  { id: 'race-dunkerque', name: 'Race Dunkerque', m: 5, d: 19, raceClass: 'Pro', terrain: 'flat' },
  {
    id: 'race-hauts-de-france',
    name: 'Race Hauts-de-France',
    m: 5,
    d: 20,
    raceClass: 'Pro',
    stages: 5,
    terrain: 'flat',
  },
  {
    id: 'race-mayenne',
    name: 'Race Mayenne',
    m: 5,
    d: 28,
    raceClass: 'Pro',
    stages: 4,
    terrain: 'hilly',
  },
  {
    id: 'race-norway',
    name: 'Race Norway',
    m: 5,
    d: 28,
    raceClass: 'Pro',
    stages: 4,
    terrain: 'hilly',
  },
  {
    id: 'race-wallonia',
    name: 'Race Wallonia',
    m: 6,
    d: 1,
    raceClass: 'Pro',
    stages: 5,
    terrain: 'hilly',
  },
  { id: 'race-brussels', name: 'Race Brussels', m: 6, d: 7, raceClass: 'Pro', terrain: 'flat' },
  {
    id: 'race-franco-belgian',
    name: 'Race Franco-Belgian',
    m: 6,
    d: 10,
    raceClass: 'Pro',
    terrain: 'flat',
  },
  {
    id: 'race-belgium',
    name: 'Race Belgium',
    m: 6,
    d: 17,
    raceClass: 'Pro',
    stages: 5,
    terrain: 'flat',
  },
  {
    id: 'race-slovenia',
    name: 'Race Slovenia',
    m: 6,
    d: 17,
    raceClass: 'Pro',
    stages: 5,
    terrain: 'mountain',
  },
  {
    id: 'race-qinghai',
    name: 'Race Qinghai',
    m: 7,
    d: 11,
    raceClass: 'Pro',
    stages: 8,
    terrain: 'mountain',
  },
  {
    id: 'race-denmark',
    name: 'Race Denmark',
    m: 7,
    d: 29,
    raceClass: 'Pro',
    stages: 5,
    terrain: 'flat',
  },
  {
    id: 'race-burgos',
    name: 'Race Burgos',
    m: 8,
    d: 4,
    raceClass: 'Pro',
    stages: 5,
    terrain: 'mountain',
  },
  {
    id: 'race-arctic',
    name: 'Race Arctic',
    m: 8,
    d: 13,
    raceClass: 'Pro',
    stages: 4,
    terrain: 'hilly',
  },
  {
    id: 'race-czechia',
    name: 'Race Czechia',
    m: 8,
    d: 13,
    raceClass: 'Pro',
    stages: 4,
    terrain: 'flat',
  },
  {
    id: 'race-germany',
    name: 'Race Germany',
    m: 8,
    d: 19,
    raceClass: 'Pro',
    stages: 5,
    terrain: 'hilly',
  },
  {
    id: 'race-britain',
    name: 'Race Britain',
    m: 9,
    d: 2,
    raceClass: 'Pro',
    stages: 5,
    terrain: 'hilly',
  },
  {
    id: 'race-maryland',
    name: 'Race Maryland',
    m: 9,
    d: 5,
    raceClass: 'Pro',
    stages: 3,
    terrain: 'hilly',
  },
  { id: 'race-prato', name: 'Race Prato', m: 9, d: 6, raceClass: 'Pro', terrain: 'hilly' },
  { id: 'race-peccioli', name: 'Race Peccioli', m: 9, d: 10, raceClass: 'Pro', terrain: 'hilly' },
  { id: 'race-fourmies', name: 'Race Fourmies', m: 9, d: 13, raceClass: 'Pro', terrain: 'flat' },
  { id: 'race-namur', name: 'Race Namur', m: 9, d: 16, raceClass: 'Pro', terrain: 'hilly' },
  {
    id: 'race-luxembourg',
    name: 'Race Luxembourg',
    m: 9,
    d: 16,
    raceClass: 'Pro',
    stages: 5,
    terrain: 'hilly',
  },
  {
    id: 'race-flandrien',
    name: 'Race Flandrien',
    m: 9,
    d: 19,
    raceClass: 'Pro',
    terrain: 'cobbles',
    km: 190,
  },
  {
    id: 'race-croatia',
    name: 'Race Croatia',
    m: 9,
    d: 22,
    raceClass: 'Pro',
    stages: 6,
    terrain: 'mountain',
  },
  {
    id: 'race-langkawi',
    name: 'Race Langkawi',
    m: 9,
    d: 27,
    raceClass: 'Pro',
    stages: 8,
    terrain: 'flat',
  },
  { id: 'race-emilia', name: 'Race Emilia', m: 10, d: 3, raceClass: 'Pro', terrain: 'hilly' },
  { id: 'race-munster', name: 'Race Münster', m: 10, d: 3, raceClass: 'Pro', terrain: 'flat' },
  { id: 'race-legnano', name: 'Race Legnano', m: 10, d: 5, raceClass: 'Pro', terrain: 'hilly' },
  { id: 'race-varese', name: 'Race Varese', m: 10, d: 6, raceClass: 'Pro', terrain: 'hilly' },
  { id: 'race-piedmont', name: 'Race Piedmont', m: 10, d: 8, raceClass: 'Pro', terrain: 'hilly' },
  {
    id: 'race-tours',
    name: 'Race Tours',
    m: 10,
    d: 11,
    raceClass: 'Pro',
    terrain: 'cobbles',
    km: 210,
  },
  { id: 'race-veneto', name: 'Race Veneto', m: 10, d: 14, raceClass: 'Pro', terrain: 'hilly' },
  { id: 'race-japan', name: 'Race Japan', m: 10, d: 18, raceClass: 'Pro', terrain: 'hilly' },
  {
    id: 'race-veneto-classic',
    name: 'Race Veneto Classic',
    m: 10,
    d: 18,
    raceClass: 'Pro',
    terrain: 'cobbles',
    km: 195,
  },
]

const PRO_RACES: CalendarRace[] = PRO_TABLE.map(buildRace)

/**
 * Circuitos continentales (.1/.2) por continente, selección representativa de la estructura 2026 con
 * región para la inscripción (preferencia a equipos de la región + wildcards). Nombres neutros por
 * geografía y fechas reales; recorridos de autoría propia.
 */
const CON_TABLE: RaceRow[] = [
  // Europa (circuito continental completo)
  { id: 'race-morvedre', name: 'Race Morvedre', m: 1, d: 23, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-castellon', name: 'Race Castellón', m: 1, d: 24, raceClass: '1', region: 'Europe', terrain: 'flat' },
  { id: 'race-valencia-gp', name: 'Race Valencia GP', m: 1, d: 25, raceClass: '1', region: 'Europe', terrain: 'flat' },
  { id: 'race-calvia', name: 'Race Calvià', m: 1, d: 28, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-ses-salines', name: 'Race Ses Salines', m: 1, d: 29, raceClass: '1', region: 'Europe', terrain: 'mountain' },
  { id: 'race-tramuntana', name: 'Race Tramuntana', m: 1, d: 30, raceClass: '1', region: 'Europe', terrain: 'mountain' },
  { id: 'race-andratx', name: 'Race Andratx', m: 1, d: 31, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-marseille', name: 'Race Marseille', m: 2, d: 1, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-palma', name: 'Race Palma', m: 2, d: 1, raceClass: '1', region: 'Europe', terrain: 'flat' },
  { id: 'race-besseges', name: 'Race Bessèges', m: 2, d: 4, raceClass: '1', region: 'Europe', stages: 5, terrain: 'hilly' },
  { id: 'race-antalya-gp', name: 'Race Antalya GP', m: 2, d: 7, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-aveiro', name: 'Race Aveiro', m: 2, d: 8, raceClass: '1', region: 'Europe', terrain: 'flat' },
  { id: 'race-provence', name: 'Race Provence', m: 2, d: 13, raceClass: '1', region: 'Europe', stages: 3, terrain: 'mountain' },
  { id: 'race-murcia', name: 'Race Murcia', m: 2, d: 13, raceClass: '1', region: 'Europe', stages: 2, terrain: 'mountain' },
  { id: 'race-jaen', name: 'Race Jaén', m: 2, d: 16, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-var', name: 'Race Var', m: 2, d: 21, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-alaiye', name: 'Race Alaiye', m: 2, d: 21, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-alpes-maritimes', name: 'Race Alpes-Maritimes', m: 2, d: 22, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-sardegna', name: 'Race Sardegna', m: 2, d: 25, raceClass: '1', region: 'Europe', stages: 5, terrain: 'hilly' },
  { id: 'race-aegean', name: 'Race Aegean', m: 2, d: 28, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-pedalia', name: 'Race Pedalia', m: 2, d: 28, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-dodecanese', name: 'Race Dodecanese', m: 3, d: 1, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-samyn', name: 'Race Samyn', m: 3, d: 3, raceClass: '1', region: 'Europe', terrain: 'cobbles', km: 200 },
  { id: 'race-umag', name: 'Race Umag', m: 3, d: 4, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-apollon', name: 'Race Apollon', m: 3, d: 7, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-communes', name: 'Race Communes', m: 3, d: 7, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-rhodes-gp', name: 'Race Rhodes GP', m: 3, d: 7, raceClass: '2', region: 'Europe', terrain: 'hilly' },
  { id: 'race-zwolle', name: 'Race Zwolle', m: 3, d: 7, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-rucphen', name: 'Race Rucphen', m: 3, d: 8, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-lillers', name: 'Race Lillers', m: 3, d: 8, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-porec', name: 'Race Poreč', m: 3, d: 8, raceClass: '2', region: 'Europe', terrain: 'hilly' },
  { id: 'race-istria', name: 'Race Istria', m: 3, d: 12, raceClass: '2', region: 'Europe', stages: 4, terrain: 'hilly' },
  { id: 'race-antalya', name: 'Race Antalya', m: 3, d: 12, raceClass: '2', region: 'Europe', stages: 4, terrain: 'flat' },
  { id: 'race-rhodes', name: 'Race Rhodes', m: 3, d: 12, raceClass: '2', region: 'Europe', stages: 4, terrain: 'hilly' },
  { id: 'race-popolarissima', name: 'Race Popolarissima', m: 3, d: 15, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-youngster', name: 'Race Youngster Coast', m: 3, d: 20, raceClass: '2', region: 'Europe', terrain: 'cobbles', km: 175 },
  { id: 'race-ebre', name: 'Race Ebre', m: 3, d: 21, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-monsere', name: 'Race Monseré', m: 3, d: 22, raceClass: '1', region: 'Europe', terrain: 'flat' },
  { id: 'race-slovenian-istria', name: 'Race Slovenian Istria', m: 3, d: 22, raceClass: '2', region: 'Europe', terrain: 'hilly' },
  { id: 'race-ontur', name: 'Race Ontur', m: 3, d: 22, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-arrabida', name: 'Race Arrábida', m: 3, d: 22, raceClass: '2', region: 'Europe', terrain: 'hilly' },
  { id: 'race-romagna', name: 'Race Romagna', m: 3, d: 25, raceClass: '1', region: 'Europe', stages: 5, terrain: 'hilly' },
  { id: 'race-olympia', name: 'Race Olympia', m: 3, d: 25, raceClass: '2', region: 'Europe', stages: 5, terrain: 'flat' },
  { id: 'race-alentejo', name: 'Race Alentejo', m: 3, d: 25, raceClass: '2', region: 'Europe', stages: 5, terrain: 'hilly' },
  { id: 'race-brda', name: 'Race Brda', m: 3, d: 26, raceClass: '2', region: 'Europe', terrain: 'hilly' },
  { id: 'race-loire-atlantique', name: 'Race Loire Atlantique', m: 3, d: 28, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-syedra', name: 'Race Syedra', m: 3, d: 28, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-emilia-gp', name: 'Race Emilia GP', m: 3, d: 29, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-tourangelle', name: 'Race Tourangelle', m: 3, d: 29, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-annemasse', name: 'Race Annemasse', m: 3, d: 29, raceClass: '2', region: 'Europe', terrain: 'hilly' },
  { id: 'race-novo-mesto', name: 'Race Novo Mesto', m: 3, d: 29, raceClass: '2', region: 'Europe', terrain: 'hilly' },
  { id: 'race-camembert', name: 'Race Camembert', m: 3, d: 31, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-vitre', name: 'Race Vitré', m: 4, d: 3, raceClass: '1', region: 'Europe', terrain: 'flat' },
  { id: 'race-alanya', name: 'Race Alanya', m: 4, d: 3, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-nxt', name: 'Race NXT', m: 4, d: 4, raceClass: '1', region: 'Europe', terrain: 'flat' },
  { id: 'race-artois', name: 'Race Artois', m: 4, d: 4, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-piva', name: 'Race Piva', m: 4, d: 5, raceClass: '2', region: 'Europe', terrain: 'hilly' },
  { id: 'race-belvedere', name: 'Race Belvedere', m: 4, d: 6, raceClass: '2', region: 'Europe', terrain: 'hilly' },
  { id: 'race-huy', name: 'Race Huy', m: 4, d: 6, raceClass: '2', region: 'Europe', terrain: 'mountain' },
  { id: 'race-recioto', name: 'Race Recioto', m: 4, d: 7, raceClass: '2', region: 'Europe', terrain: 'hilly' },
  { id: 'race-ardennes', name: 'Race Ardennes', m: 4, d: 8, raceClass: '2', region: 'Europe', stages: 5, terrain: 'hilly' },
  { id: 'race-mersin', name: 'Race Mersin', m: 4, d: 9, raceClass: '2', region: 'Europe', stages: 4, terrain: 'hilly' },
  { id: 'race-reggio', name: 'Race Reggio', m: 4, d: 10, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-magna-grecia', name: 'Race Magna Grecia', m: 4, d: 11, raceClass: '1', region: 'Europe', stages: 3, terrain: 'mountain' },
  { id: 'race-braakman', name: 'Race Braakman', m: 4, d: 11, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-pascua', name: 'Race Pascua', m: 4, d: 12, raceClass: '2', region: 'Europe', terrain: 'hilly' },
  { id: 'race-roubaix-espoirs', name: 'Race Roubaix Espoirs', m: 4, d: 12, raceClass: '2', region: 'Europe', terrain: 'cobbles', km: 190 },
  { id: 'race-slezanski', name: 'Race Ślężański', m: 4, d: 12, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-vendemiano', name: 'Race Vendemiano', m: 4, d: 12, raceClass: '2', region: 'Europe', terrain: 'hilly' },
  { id: 'race-galicia', name: 'Race Galicia', m: 4, d: 14, raceClass: '1', region: 'Europe', stages: 4, terrain: 'mountain' },
  { id: 'race-limburg', name: 'Race Limburg', m: 4, d: 15, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-loir-cher', name: 'Race Loir-et-Cher', m: 4, d: 15, raceClass: '2', region: 'Europe', stages: 5, terrain: 'flat' },
  { id: 'race-besancon', name: 'Race Besançon', m: 4, d: 17, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-bosnia', name: 'Race Bosnia', m: 4, d: 17, raceClass: '2', region: 'Europe', stages: 3, terrain: 'mountain' },
  { id: 'race-jura', name: 'Race Jura', m: 4, d: 18, raceClass: '1', region: 'Europe', terrain: 'mountain' },
  { id: 'race-liege-espoirs', name: 'Race Liège Espoirs', m: 4, d: 18, raceClass: '2', region: 'Europe', terrain: 'classic', km: 190 },
  { id: 'race-doubs', name: 'Race Doubs', m: 4, d: 19, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-biella', name: 'Race Biella', m: 4, d: 19, raceClass: '2', region: 'Europe', terrain: 'hilly' },
  { id: 'race-belgrade', name: 'Race Belgrade', m: 4, d: 22, raceClass: '2', region: 'Europe', stages: 4, terrain: 'hilly' },
  { id: 'race-asturias', name: 'Race Asturias', m: 4, d: 23, raceClass: '1', region: 'Europe', stages: 3, terrain: 'mountain' },
  { id: 'race-liberazione', name: 'Race Liberazione', m: 4, d: 25, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-bretagne', name: 'Race Bretagne', m: 4, d: 25, raceClass: '2', region: 'Europe', stages: 7, terrain: 'hilly' },
  { id: 'race-appennino', name: 'Race Appennino', m: 4, d: 26, raceClass: '1', region: 'Europe', terrain: 'mountain' },
  { id: 'race-rutland', name: 'Race Rutland', m: 4, d: 26, raceClass: '2', region: 'Europe', terrain: 'cobbles', km: 180 },
  { id: 'race-anicolor', name: 'Race Anicolor', m: 5, d: 1, raceClass: '1', region: 'Europe', stages: 3, terrain: 'hilly' },
  { id: 'race-vorarlberg', name: 'Race Vorarlberg', m: 5, d: 1, raceClass: '2', region: 'Europe', terrain: 'hilly' },
  { id: 'race-waasland', name: 'Race Waasland', m: 5, d: 1, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-herning', name: 'Race Herning', m: 5, d: 2, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-overijssel', name: 'Race Overijssel', m: 5, d: 2, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-famenne', name: 'Race Famenne', m: 5, d: 3, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-woensdrecht', name: 'Race Woensdrecht', m: 5, d: 3, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-funen', name: 'Race Funen', m: 5, d: 3, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-hellas', name: 'Race Hellas', m: 5, d: 6, raceClass: '1', region: 'Europe', stages: 5, terrain: 'hilly' },
  { id: 'race-fagnes', name: 'Race Fagnes', m: 5, d: 6, raceClass: '2', region: 'Europe', terrain: 'hilly' },
  { id: 'race-fleche-ardennaise', name: 'Race Ardennaise', m: 5, d: 7, raceClass: '2', region: 'Europe', terrain: 'hilly' },
  { id: 'race-beskid', name: 'Race Beskid', m: 5, d: 7, raceClass: '2', region: 'Europe', terrain: 'hilly' },
  { id: 'race-beskid-race', name: 'Race Beskid Classic', m: 5, d: 9, raceClass: '2', region: 'Europe', terrain: 'hilly' },
  { id: 'race-sundvolden', name: 'Race Sundvolden', m: 5, d: 9, raceClass: '2', region: 'Europe', terrain: 'hilly' },
  { id: 'race-baku', name: 'Race Baku', m: 5, d: 10, raceClass: '1', region: 'Europe', stages: 5, terrain: 'hilly' },
  { id: 'race-zaglebie', name: 'Race Zagłębie', m: 5, d: 10, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-ringerike', name: 'Race Ringerike', m: 5, d: 10, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-fleche-sud', name: 'Race Flèche du Sud', m: 5, d: 13, raceClass: '1', region: 'Europe', stages: 5, terrain: 'mountain' },
  { id: 'race-wallonie-circuit', name: 'Race Wallonie Circuit', m: 5, d: 14, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-finistere', name: 'Race Finistère', m: 5, d: 16, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-aulne', name: 'Race Aulne', m: 5, d: 17, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-koln', name: 'Race Köln', m: 5, d: 17, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-arvedi', name: 'Race Arvedi', m: 5, d: 17, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-kempen', name: 'Race Kempen', m: 5, d: 17, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-albania', name: 'Race Albania', m: 5, d: 18, raceClass: '2', region: 'Europe', stages: 5, terrain: 'hilly' },
  { id: 'race-estrela', name: 'Race Estrela', m: 5, d: 22, raceClass: '1', region: 'Europe', stages: 3, terrain: 'mountain' },
  { id: 'race-veenendaal', name: 'Race Veenendaal', m: 5, d: 23, raceClass: '1', region: 'Europe', terrain: 'flat' },
  { id: 'race-criquielion', name: 'Race Criquielion', m: 5, d: 24, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-antwerp', name: 'Race Antwerp', m: 5, d: 25, raceClass: '1', region: 'Europe', terrain: 'cobbles', km: 190 },
  { id: 'race-troyes', name: 'Race Troyes', m: 5, d: 25, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-isere', name: 'Race Isère', m: 5, d: 27, raceClass: '2', region: 'Europe', stages: 5, terrain: 'mountain' },
  { id: 'race-lithuania', name: 'Race Lithuania', m: 5, d: 27, raceClass: '2', region: 'Europe', stages: 5, terrain: 'flat' },
  { id: 'race-mercantour', name: 'Race Mercantour', m: 6, d: 3, raceClass: '1', region: 'Europe', terrain: 'mountain' },
  { id: 'race-estonia', name: 'Race Estonia', m: 6, d: 4, raceClass: '1', region: 'Europe', stages: 3, terrain: 'flat' },
  { id: 'race-oberosterreich', name: 'Race Oberösterreich', m: 6, d: 4, raceClass: '2', region: 'Europe', stages: 4, terrain: 'hilly' },
  { id: 'race-oise', name: 'Race Oise', m: 6, d: 4, raceClass: '2', region: 'Europe', stages: 4, terrain: 'flat' },
  { id: 'race-heist', name: 'Race Heist', m: 6, d: 6, raceClass: '1', region: 'Europe', terrain: 'flat' },
  { id: 'race-visegrad-cz', name: 'Race Visegrad', m: 6, d: 7, raceClass: '2', region: 'Europe', terrain: 'hilly' },
  { id: 'race-malopolska', name: 'Race Malopolska', m: 6, d: 11, raceClass: '2', region: 'Europe', stages: 3, terrain: 'hilly' },
  { id: 'race-elfsteden', name: 'Race Elfsteden', m: 6, d: 14, raceClass: '1', region: 'Europe', terrain: 'flat' },
  { id: 'race-gippingen', name: 'Race Gippingen', m: 6, d: 14, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-muur', name: 'Race Muur', m: 6, d: 14, raceClass: '1', region: 'Europe', terrain: 'cobbles', km: 190 },
  { id: 'race-occitanie', name: 'Race Occitanie', m: 6, d: 18, raceClass: '1', region: 'Europe', stages: 4, terrain: 'mountain' },
  { id: 'race-mazury', name: 'Race Mazury', m: 6, d: 19, raceClass: '2', region: 'Europe', stages: 3, terrain: 'flat' },
  { id: 'race-andorra-classic', name: 'Race Andorra Classic', m: 6, d: 21, raceClass: '1', region: 'Europe', terrain: 'mountain' },
  { id: 'race-lyon', name: 'Race Lyon', m: 7, d: 1, raceClass: '1', region: 'Europe', stages: 3, terrain: 'mountain' },
  { id: 'race-solidarnosc', name: 'Race Solidarnosc', m: 7, d: 1, raceClass: '2', region: 'Europe', stages: 4, terrain: 'hilly' },
  { id: 'race-sibiu', name: 'Race Sibiu', m: 7, d: 4, raceClass: '1', region: 'Europe', stages: 4, terrain: 'mountain' },
  { id: 'race-austria', name: 'Race Austria', m: 7, d: 8, raceClass: '1', region: 'Europe', stages: 5, terrain: 'mountain' },
  { id: 'race-torres-vedras', name: 'Race Torres Vedras', m: 7, d: 10, raceClass: '2', region: 'Europe', stages: 3, terrain: 'hilly' },
  { id: 'race-ordizia', name: 'Race Ordizia', m: 7, d: 25, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-castilla-leon', name: 'Race Castilla y León', m: 7, d: 26, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-ain', name: "Race Ain", m: 7, d: 28, raceClass: '1', region: 'Europe', stages: 3, terrain: 'mountain' },
  { id: 'race-alsace', name: 'Race Alsace', m: 7, d: 29, raceClass: '2', region: 'Europe', stages: 5, terrain: 'mountain' },
  { id: 'race-kreiz-breizh', name: 'Race Kreiz Breizh', m: 7, d: 31, raceClass: '2', region: 'Europe', stages: 4, terrain: 'hilly' },
  { id: 'race-getxo', name: 'Race Getxo', m: 8, d: 2, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-maras', name: 'Race Maraş', m: 8, d: 4, raceClass: '2', region: 'Europe', stages: 4, terrain: 'hilly' },
  { id: 'race-portugal', name: 'Race Portugal', m: 8, d: 5, raceClass: '1', region: 'Europe', stages: 10, terrain: 'mountain' },
  { id: 'race-szekler', name: 'Race Szeklerland', m: 8, d: 6, raceClass: '2', region: 'Europe', stages: 3, terrain: 'hilly' },
  { id: 'race-polynormande', name: 'Race Polynormande', m: 8, d: 16, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-limousin', name: 'Race Limousin', m: 8, d: 18, raceClass: '1', region: 'Europe', stages: 4, terrain: 'hilly' },
  { id: 'race-west-bohemia', name: 'Race West Bohemia', m: 8, d: 20, raceClass: '2', region: 'Europe', stages: 4, terrain: 'hilly' },
  { id: 'race-baltic', name: 'Race Baltic', m: 8, d: 21, raceClass: '2', region: 'Europe', stages: 3, terrain: 'flat' },
  { id: 'race-aquitaine', name: 'Race Aquitaine', m: 8, d: 25, raceClass: '1', region: 'Europe', stages: 4, terrain: 'flat' },
  { id: 'race-samsun', name: 'Race Samsun', m: 8, d: 27, raceClass: '2', region: 'Europe', stages: 4, terrain: 'hilly' },
  { id: 'race-bulgaria', name: 'Race Bulgaria', m: 8, d: 29, raceClass: '2', region: 'Europe', stages: 6, terrain: 'hilly' },
  { id: 'race-kranj', name: 'Race Kranj', m: 8, d: 30, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-plouay', name: 'Race Plouay', m: 8, d: 30, raceClass: '2', region: 'Europe', terrain: 'hilly' },
  { id: 'race-halle', name: 'Race Halle', m: 8, d: 30, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-achterhoek', name: 'Race Achterhoek', m: 8, d: 30, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-zlm', name: 'Race ZLM', m: 9, d: 2, raceClass: '1', region: 'Europe', stages: 5, terrain: 'flat' },
  { id: 'race-istanbul', name: 'Race Istanbul', m: 9, d: 3, raceClass: '1', region: 'Europe', stages: 4, terrain: 'hilly' },
  { id: 'race-friuli', name: 'Race Friuli', m: 9, d: 3, raceClass: '2', region: 'Europe', stages: 4, terrain: 'hilly' },
  { id: 'race-south-bohemia', name: 'Race South Bohemia', m: 9, d: 3, raceClass: '2', region: 'Europe', stages: 4, terrain: 'hilly' },
  { id: 'race-sauerland', name: 'Race Sauerland', m: 9, d: 3, raceClass: '2', region: 'Europe', stages: 4, terrain: 'hilly' },
  { id: 'race-kosovo', name: 'Race Kosovo', m: 9, d: 3, raceClass: '2', region: 'Europe', stages: 4, terrain: 'hilly' },
  { id: 'race-somme', name: 'Race Somme', m: 9, d: 6, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-toscana', name: 'Race Toscana', m: 9, d: 9, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-romania', name: 'Race Romania', m: 9, d: 9, raceClass: '2', region: 'Europe', stages: 5, terrain: 'hilly' },
  { id: 'race-pantani', name: 'Race Pantani', m: 9, d: 12, raceClass: '1', region: 'Europe', terrain: 'mountain' },
  { id: 'race-matteotti', name: 'Race Matteotti', m: 9, d: 13, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-abruzzo', name: 'Race Abruzzo', m: 9, d: 15, raceClass: '1', region: 'Europe', stages: 4, terrain: 'mountain' },
  { id: 'race-slovakia', name: 'Race Slovakia', m: 9, d: 16, raceClass: '1', region: 'Europe', stages: 5, terrain: 'hilly' },
  { id: 'race-serbie', name: 'Race Serbia', m: 9, d: 17, raceClass: '2', region: 'Europe', stages: 4, terrain: 'hilly' },
  { id: 'race-vlaanderen', name: 'Race Vlaanderen', m: 9, d: 18, raceClass: '1', region: 'Europe', terrain: 'flat' },
  { id: 'race-lazio', name: 'Race Lazio', m: 9, d: 19, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-romagna-giro', name: 'Race Romagna Classic', m: 9, d: 20, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-gooik', name: 'Race Gooik', m: 9, d: 20, raceClass: '1', region: 'Europe', terrain: 'flat' },
  { id: 'race-isbergues', name: 'Race Isbergues', m: 9, d: 20, raceClass: '1', region: 'Europe', terrain: 'flat' },
  { id: 'race-houtland', name: 'Race Houtland', m: 9, d: 23, raceClass: '1', region: 'Europe', terrain: 'flat' },
  { id: 'race-mirabelle', name: 'Race Mirabelle', m: 9, d: 25, raceClass: '2', region: 'Europe', terrain: 'hilly' },
  { id: 'race-cerami', name: 'Race Cerami', m: 9, d: 26, raceClass: '2', region: 'Europe', terrain: 'flat' },
  { id: 'race-chauny', name: 'Race Chauny', m: 9, d: 27, raceClass: '1', region: 'Europe', terrain: 'flat' },
  { id: 'race-euro-champs', name: 'Race Continental Championship', m: 10, d: 4, raceClass: '1', region: 'Europe', terrain: 'hilly', km: 210 },
  { id: 'race-cholet', name: 'Race Cholet', m: 10, d: 3, raceClass: '1', region: 'Europe', terrain: 'flat' },
  { id: 'race-agostoni', name: 'Race Agostoni', m: 10, d: 4, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-vendee', name: 'Race Vendée', m: 10, d: 4, raceClass: '1', region: 'Europe', terrain: 'flat' },
  { id: 'race-binche', name: 'Race Binche', m: 10, d: 6, raceClass: '1', region: 'Europe', terrain: 'hilly' },
  { id: 'race-san-daniele', name: 'Race San Daniele', m: 10, d: 6, raceClass: '2', region: 'Europe', terrain: 'hilly' },
  { id: 'race-oropa', name: 'Race Oropa', m: 10, d: 11, raceClass: '1', region: 'Europe', terrain: 'mountain' },
  { id: 'race-holland', name: 'Race Holland', m: 10, d: 13, raceClass: '1', region: 'Europe', stages: 6, terrain: 'flat' },
  { id: 'race-chrono', name: 'Race Chrono', m: 10, d: 18, raceClass: '1', region: 'Europe', terrain: 'itt', km: 45 },
  // Asia
  { id: 'race-pune', name: 'Race Pune', m: 1, d: 19, raceClass: '2', region: 'Asia', stages: 5, terrain: 'mountain' },
  { id: 'race-sharjah', name: 'Race Sharjah', m: 1, d: 23, raceClass: '2', region: 'Asia', stages: 5, terrain: 'flat' },
  { id: 'race-taiwan', name: 'Race Taiwan', m: 3, d: 15, raceClass: '1', region: 'Asia', stages: 5, terrain: 'hilly' },
  { id: 'race-thailand', name: 'Race Thailand', m: 3, d: 24, raceClass: '1', region: 'Asia', stages: 6, terrain: 'flat' },
  { id: 'race-kumano', name: 'Race Kumano', m: 5, d: 7, raceClass: '2', region: 'Asia', stages: 4, terrain: 'mountain' },
  { id: 'race-nippon', name: 'Race Nippon', m: 5, d: 24, raceClass: '2', region: 'Asia', stages: 8, terrain: 'mountain' },
  { id: 'race-korea', name: 'Race Korea', m: 8, d: 31, raceClass: '1', region: 'Asia', stages: 5, terrain: 'hilly' },
  { id: 'race-taihu', name: 'Race Taihu', m: 9, d: 12, raceClass: '1', region: 'Asia', stages: 5, terrain: 'flat' },
  { id: 'race-poyang', name: 'Race Poyang', m: 9, d: 20, raceClass: '2', region: 'Asia', stages: 6, terrain: 'flat' },
  { id: 'race-kyushu', name: 'Race Kyushu', m: 10, d: 10, raceClass: '1', region: 'Asia', stages: 3, terrain: 'hilly' },
  // África
  { id: 'race-rwanda', name: 'Race Rwanda', m: 2, d: 22, raceClass: '1', region: 'Africa', stages: 8, terrain: 'mountain' },
  { id: 'race-algeria', name: 'Race Algeria', m: 4, d: 17, raceClass: '2', region: 'Africa', stages: 6, terrain: 'hilly' },
  { id: 'race-benin', name: 'Race Benin', m: 4, d: 27, raceClass: '2', region: 'Africa', stages: 5, terrain: 'flat' },
  { id: 'race-mauritius', name: 'Race Mauritius', m: 6, d: 2, raceClass: '2', region: 'Africa', stages: 4, terrain: 'hilly' },
  { id: 'race-cameroon', name: 'Race Cameroon', m: 6, d: 3, raceClass: '2', region: 'Africa', stages: 8, terrain: 'hilly' },
  { id: 'race-morocco', name: 'Race Morocco', m: 9, d: 11, raceClass: '2', region: 'Africa', stages: 8, terrain: 'mountain' },
  { id: 'race-faso', name: 'Race Faso', m: 10, d: 30, raceClass: '2', region: 'Africa', stages: 5, terrain: 'flat' },
  // América
  { id: 'race-tachira', name: 'Race Táchira', m: 1, d: 9, raceClass: '2', region: 'America', stages: 9, terrain: 'mountain' },
  { id: 'race-colombia', name: 'Race Colombia', m: 2, d: 3, raceClass: '1', region: 'America', stages: 6, terrain: 'mountain' },
  { id: 'race-gila', name: 'Race Gila', m: 4, d: 29, raceClass: '2', region: 'America', stages: 5, terrain: 'mountain' },
  { id: 'race-guatemala', name: 'Race Guatemala', m: 4, d: 29, raceClass: '2', region: 'America', stages: 5, terrain: 'mountain' },
  { id: 'race-beauce', name: 'Race Beauce', m: 6, d: 10, raceClass: '2', region: 'America', stages: 5, terrain: 'hilly' },
  { id: 'race-venezuela', name: 'Race Venezuela', m: 7, d: 12, raceClass: '2', region: 'America', stages: 8, terrain: 'mountain' },
  { id: 'race-colombia-tour', name: 'Race Colombia Tour', m: 8, d: 8, raceClass: '2', region: 'America', stages: 9, terrain: 'mountain' },
  { id: 'race-philadelphia', name: 'Race Philadelphia', m: 8, d: 30, raceClass: '1', region: 'America', terrain: 'hilly' },
  { id: 'race-ecuador', name: 'Race Ecuador', m: 9, d: 7, raceClass: '2', region: 'America', stages: 6, terrain: 'mountain' },
  // Oceanía
  { id: 'race-victoria', name: 'Race Victoria', m: 2, d: 4, raceClass: '1', region: 'Oceania', stages: 5, terrain: 'hilly' },
]

const CON_RACES: CalendarRace[] = CON_TABLE.map(buildRace)

/**
 * Calendario completo de la temporada (SPEC 8): WorldTour real + ProSeries real + circuitos
 * continentales representativos (estructura 2026, nombres neutros) + los 92 campeonatos nacionales.
 * Ordenado por día de arranque (invariante que asumen los consumidores).
 */
export const SEASON_CALENDAR: CalendarRace[] = [
  ...WT_RACES,
  ...PRO_RACES,
  ...CON_RACES,
  ...NATIONAL_CHAMPIONSHIPS,
].sort((a, b) => a.startDay - b.startDay)
