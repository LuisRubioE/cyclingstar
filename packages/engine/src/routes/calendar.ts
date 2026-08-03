/**
 * Calendario de temporada del MVP (SPEC 8, Paso 34). 28 carreras con nombre "Race + Geografía"
 * repartidas en los días de competición (15..290), en tres niveles (WT, Pro Series, Continental)
 * y con reglas de inscripción por división. Todo es autoría pura y determinista, reutilizando el
 * contrato de etapa del motor (StageProfile). Las tres grandes vueltas y Race France llevan sus
 * 21 etapas; los perfiles se componen de constructores reutilizables (llana, media, reina, crono,
 * clásica de adoquines) para dar variedad sin imitar recorridos reales.
 */
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
  /** Divisiones cuyos equipos pueden inscribirse (SPEC 8). */
  openTo: Division[]
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
  raceClass: RaceClass = classFromLevel(level),
): CalendarRace {
  return {
    id,
    name,
    level,
    raceClass,
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

/**
 * Las 28 carreras del calendario del MVP (SPEC 8), ordenadas por día de arranque. Nombres con el
 * esquema Race + Geografía, sin imitar identidades reales.
 */
export const SEASON_CALENDAR: CalendarRace[] = [
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
  weekRace('race-langkawi', 'Race Langkawi', 'CON', 70, [
    flat(160),
    flat(172),
    mountain(148),
    flat(168),
    hilly(155),
    flat(140),
  ]),
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
  weekRace('race-rwanda', 'Race Rwanda', 'CON', 120, [
    hilly(120),
    mountain(130),
    flat(125),
    hilly(115),
    mountain(110),
  ]),
  // Bloque de mitad de temporada (antes solo había carreras hasta el día 124 y luego nada hasta los
  // campeonatos del 150). Nivel PRS/CON para no competir por los líderes WT con la vuelta italiana.
  weekRace('race-norway', 'Race Norway', 'PRS', 134, [
    flat(168),
    hilly(175),
    mountain(150),
    rolling(160),
    flat(155),
  ]),
  weekRace('race-austria', 'Race Austria', 'CON', 140, [
    flat(160),
    hilly(170),
    mountain(148),
    mountain(140),
    flat(150),
  ]),
  oneDay('race-andorra', 'Race Andorra', 'PRS', 146, mountain(198)),
  oneDay('race-nationals', 'National Championships', 'CON', 150, flat(230), 'NC'),
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
  weekRace('race-portugal', 'Race Portugal', 'CON', 240, [
    flat(170),
    hilly(165),
    mountain(155),
    flat(178),
    rolling(160),
    mountain(148),
    itt(19),
    flat(150),
  ]),
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
  weekRace('race-japan', 'Race Japan', 'CON', 276, [
    flat(150),
    hilly(158),
    mountain(140),
    flat(145),
  ]),
  oneDay('race-lombardy', 'Race Lombardy', 'WT', 282, classic(252)),
]
