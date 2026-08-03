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

/** Clase por defecto de una carrera según su nivel del MVP (WT→.WT, PRS→.Pro, CON→.1). */
function classFromLevel(level: RaceLevel): RaceClass {
  if (level === 'WT') return 'WT'
  if (level === 'PRS') return 'Pro'
  return '1'
}

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

/** Una carrera de un día (monumento, clásica, campeonato): una sola "etapa". */
function oneDay(
  id: string,
  name: string,
  level: RaceLevel,
  startDay: number,
  spec: StageSpec,
  raceClass: RaceClass = classFromLevel(level),
): CalendarRace {
  return {
    id,
    name,
    level,
    raceClass,
    format: 'un-dia',
    startDay,
    openTo: enrollmentFor(level),
    stages: [{ ...spec, index: 1, name }],
  }
}

/** Una carrera por etapas de una semana. */
function weekRace(
  id: string,
  name: string,
  level: RaceLevel,
  startDay: number,
  specs: StageSpec[],
  opts: { raceClass?: RaceClass; region?: Continent } = {},
): CalendarRace {
  return {
    id,
    name,
    level,
    raceClass: opts.raceClass ?? classFromLevel(level),
    ...(opts.region ? { region: opts.region } : {}),
    format: 'una-semana',
    startDay,
    openTo: enrollmentFor(level),
    stages: stagesFrom(specs),
  }
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

/** Día de temporada en que se disputan todos los campeonatos nacionales (fin de junio ciclista). */
const NATIONALS_DAY = 150

/**
 * Campeonato nacional de un país (.NC): carrera de un día, pelotón individual de ese país. El
 * pelotón real lo arma la capa de datos con los mejores corredores de la nación (no por equipos).
 */
function nationalChampionship(code: string, name: string): CalendarRace {
  const raceName = `${name} National Championship`
  return {
    id: `nc-${code.toLowerCase()}`,
    name: raceName,
    level: 'CON',
    raceClass: 'NC',
    format: 'un-dia',
    startDay: NATIONALS_DAY,
    openTo: [],
    championshipCountry: code,
    stages: [{ ...classic(220), index: 1, name: raceName }],
  }
}

/** Los 92 campeonatos nacionales, uno por país registrado (SPEC 8). */
const NATIONAL_CHAMPIONSHIPS: CalendarRace[] = COUNTRIES.map((c) =>
  nationalChampionship(c.code, c.name),
)

/**
 * Carreras base del calendario del MVP (SPEC 8), con el esquema Race + Geografía, sin imitar
 * identidades reales.
 */
const BASE_RACES: CalendarRace[] = [
  // --- Una semana / grandes vueltas (WT) ---
  weekRace('race-down-under', 'Race Down Under', 'WT', 16, [
    flat(145),
    flat(150),
    hilly(148),
    mountain(140),
    flat(152),
    flat(90),
  ]),
  weekRace('race-emirates', 'Race Emirates', 'WT', 30, [
    flat(176),
    flat(184),
    itt(17),
    mountain(150),
    flat(170),
    hilly(165),
    flat(160),
  ]),
  weekRace('race-provence', 'Race Provence', 'PRS', 40, [
    flat(170),
    hilly(175),
    mountain(155),
    flat(140),
  ]),
  weekRace('race-riviera', 'Race Riviera', 'WT', 48, [
    flat(166),
    flat(188),
    itt(15),
    rolling(190),
    mountain(160),
    hilly(180),
    flat(175),
    flat(120),
  ]),
  oneDay('race-sanremo', 'Race Sanremo', 'WT', 55, rolling(288)),
  weekRace('race-two-seas', 'Race Two Seas', 'WT', 62, [
    flat(190),
    flat(200),
    rolling(210),
    hilly(185),
    mountain(158),
    itt(18),
    flat(154),
  ]),
  weekRace(
    'race-langkawi',
    'Race Langkawi',
    'CON',
    70,
    [flat(160), flat(172), mountain(148), flat(168), hilly(155), flat(140)],
    { region: 'Asia' },
  ),
  weekRace('race-basque-country', 'Race Basque Country', 'WT', 80, [
    hilly(165),
    hilly(178),
    mountain(150),
    rolling(160),
    mountain(145),
    itt(16),
  ]),
  oneDay('race-flanders', 'Race Flanders', 'WT', 88, cobbles(260)),
  oneDay('race-roubaix', 'Race Roubaix', 'WT', 95, cobbles(257)),
  oneDay('race-liege', 'Race Liège', 'WT', 105, classic(255)),
  grandTour('race-italy', 'Race Italy', 110),
  weekRace(
    'race-rwanda',
    'Race Rwanda',
    'CON',
    120,
    [hilly(120), mountain(130), flat(125), hilly(115), mountain(110)],
    { region: 'Africa' },
  ),
  // Bloque de mitad de temporada (antes solo había carreras hasta el día 124 y luego nada hasta los
  // campeonatos del 150). Nivel PRS/CON para no competir por los líderes WT con la vuelta italiana.
  weekRace('race-norway', 'Race Norway', 'PRS', 134, [
    flat(168),
    hilly(175),
    mountain(150),
    rolling(160),
    flat(155),
  ]),
  weekRace(
    'race-austria',
    'Race Austria',
    'CON',
    140,
    [flat(160), hilly(170), mountain(148), mountain(140), flat(150)],
    { region: 'Europe' },
  ),
  oneDay('race-andorra', 'Race Andorra', 'PRS', 146, mountain(198)),
  oneDay('race-worlds', 'World Championship', 'WT', 155, classic(268)),
  weekRace('race-switzerland', 'Race Switzerland', 'WT', 158, [
    flat(185),
    hilly(178),
    mountain(160),
    itt(24),
    mountain(152),
    rolling(190),
    flat(170),
    mountain(148),
  ]),
  weekRace('race-alps', 'Race Alps', 'WT', 165, [
    flat(178),
    rolling(184),
    mountain(155),
    itt(20),
    mountain(150),
    hilly(172),
    mountain(142),
  ]),
  weekRace('race-slovenia', 'Race Slovenia', 'PRS', 170, [
    flat(160),
    hilly(168),
    mountain(150),
    flat(155),
    rolling(158),
  ]),
  raceFrance(),
  weekRace('race-poland', 'Race Poland', 'PRS', 190, [
    flat(195),
    flat(200),
    hilly(180),
    itt(22),
    mountain(158),
    flat(165),
  ]),
  oneDay('race-san-sebastian', 'Race San Sebastián', 'PRS', 195, classic(220)),
  weekRace('race-britain', 'Race Britain', 'PRS', 200, [
    flat(180),
    rolling(188),
    hilly(175),
    flat(190),
    mountain(150),
    flat(160),
  ]),
  oneDay('race-hamburg', 'Race Hamburg', 'PRS', 205, flat(216)),
  oneDay('race-quebec', 'Race Québec', 'PRS', 210, classic(201)),
  oneDay('race-montreal', 'Race Montréal', 'PRS', 213, classic(209)),
  grandTour('race-spain', 'Race Spain', 225),
  weekRace(
    'race-portugal',
    'Race Portugal',
    'CON',
    240,
    [
      flat(170),
      hilly(165),
      mountain(155),
      flat(178),
      rolling(160),
      mountain(148),
      itt(19),
      flat(150),
    ],
    { region: 'Europe' },
  ),
  // Tramo de otoño asiático + clásicas (antes había un vacío de un mes entre Portugal y Lombardía).
  weekRace('race-guangxi', 'Race Guangxi', 'WT', 250, [
    flat(168),
    flat(175),
    hilly(160),
    mountain(150),
    flat(165),
    flat(140),
  ]),
  oneDay('race-tuscany', 'Race Tuscany', 'PRS', 258, cobbles(184)),
  oneDay('race-emilia', 'Race Emilia', 'PRS', 264, classic(215)),
  weekRace('race-turkey', 'Race Turkey', 'PRS', 268, [
    flat(170),
    flat(182),
    hilly(165),
    mountain(150),
    flat(160),
    flat(155),
  ]),
  weekRace(
    'race-japan',
    'Race Japan',
    'CON',
    276,
    [flat(150), hilly(158), mountain(140), flat(145)],
    {
      region: 'Asia',
    },
  ),
  oneDay('race-lombardy', 'Race Lombardy', 'WT', 282, classic(252)),
]

// --- Calendario real (estructura 2026) por tabla de datos, con nombres NEUTROS por geografía. ---
// Solo se copian los HECHOS (fechas, clase, formato); los nombres de marca se sustituyen y los
// perfiles de etapa son autoría propia. Día de temporada = día del año (temporada ≈ año no bisiesto).

const MONTH_CUM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
/** Día del año (Ene 1 = 1) para una fecha (mes 1-based, día). */
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
 * Calendario completo de la temporada (SPEC 8): WorldTour real + ProSeries real (estructura 2026,
 * nombres neutros) + las carreras continentales regionales que aún quedan por migrar + los 92
 * campeonatos nacionales. De BASE_RACES solo se conserva algún continental regional cuyo id no lo
 * use ya el WT/Pro real. Ordenado por día de arranque (invariante que asumen los consumidores).
 */
const USED_IDS = new Set([...WT_RACES, ...PRO_RACES].map((r) => r.id))
export const SEASON_CALENDAR: CalendarRace[] = [
  ...WT_RACES,
  ...PRO_RACES,
  ...BASE_RACES.filter((r) => r.level === 'CON' && r.region != null && !USED_IDS.has(r.id)),
  ...NATIONAL_CHAMPIONSHIPS,
].sort((a, b) => a.startDay - b.startDay)
