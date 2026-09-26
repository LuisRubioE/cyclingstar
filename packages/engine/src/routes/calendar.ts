/**
 * Calendario de temporada (SPEC 8, Paso 34; E1, docs/generador.md). 842 carreras con nombre "Race +
 * Geografía" repartidas en los días de competición: 310 de equipos en tres niveles (WT con las tres
 * grandes vueltas, Pro Series y circuitos continentales), con reglas de inscripción por división, y
 * 532 campeonatos nacionales. Todo es autoría pura y determinista sobre el contrato de etapa del
 * motor (StageProfile). Desde la v87 cada etapa sale de una de tres ramas, en este orden (sección 11
 * §11.1): rasgos reales (`STAGE_FEATURES`, `routeSource: 'real'`), edición real sin rasgos (ciudades y
 * km reales, relieve de la gramática, `'edicion'`) o la gramática entera (`routes/grammar/`,
 * `'generado'`). El calendario de cada temporada lo construye `calendarForSeason`, y
 * `SEASON_CALENDAR` es la temporada `BASE_SEASON`.
 */
import { COUNTRIES, type Continent } from '@cyclingstar/shared'
import { ARCH, type EdicionCfg } from '../constants.js'
import type { Division } from '../world/npc.js'
import type { Segment, StageProfile } from '../stage/types.js'
import { type RaceEdition, RACE_EDITIONS } from './editions.js'
import { type RouteTerrain, type StageFeatures, buildFeatureProfile } from './featureProfile.js'
// La gramática. Ningún `grammar/*.ts` importa un valor de este fichero (`routes/arranque.test.ts`),
// así que no hay ciclo de carga.
import { BASE_SEASON } from './grammar/edition.js'
import {
  generateStage,
  raceRouteSourceOf,
  type GeneratedStage,
  type RaceRouteSource,
  type RouteSource,
  type StageRequest,
} from './grammar/generate.js'
import { ZONAS, zonaDe } from './grammar/geo.js'
import { regionOf } from './grammar/regions.js'
import { POR_TERRENO_EDICION, SKELETONS, cabe, type SkeletonId } from './grammar/skeletons.js'
import {
  DEFAULT_ROUTE_CONTEXT,
  composeTour,
  kmDe,
  type KmRole,
  type RouteContext,
} from './grammar/tour.js'
import { routeRng } from './profileGen.js'
import { STAGE_FEATURES } from './stageFeatures.js'
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
  /**
   * De dónde sale el recorrido (§3.11): rasgos reales (`real`), edición real sin rasgos (`edicion`) o
   * inventado (`generado`). OBLIGATORIO desde la v87: el compilador es el test de que ninguna etapa
   * se construye sin decirlo.
   */
  routeSource: RouteSource
  /** La ficha del generador (esqueleto, zona, motivos, frase): solo en lo no real (§3.11). */
  arch?: GeneratedStage['arch']
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
  /** Categoría del campeonato nacional: 'elite' (todas las edades) o 'u23' (sub-23). */
  championshipCategory?: 'elite' | 'u23'
  /**
   * País donde se disputa (ISO alpha-2): base del sistema de viajes (coste de desplazamiento del
   * corredor/equipo). Se abstrae a un solo país por carrera. Si falta, se cae al continente (region).
   */
  country?: string
  stages: CalendarStage[]
  /** Origen del recorrido de la carrera, `raceRouteSourceOf(stages)` (§3.11). */
  routeSource: RaceRouteSource
  /** Descansos tras estas etapas (solo grandes vueltas). */
  restAfter?: number[]
  /**
   * SEMIETAPAS (R28.6, S-431 · paso 18b): tras estas etapas, la SIGUIENTE se corre **el mismo día**.
   *
   * Es el espejo exacto de `restAfter` —aquél mete un día entre dos etapas, éste lo quita—, y por eso
   * se escribe igual: la lista de etapas tras las cuales pasa. Una jornada partida en dos mitades
   * —la clásica mañana en línea, tarde en crono— son dos `StageInput` el mismo día, con el depósito
   * encadenado: la segunda mitad se corre con lo que dejó la primera, porque no hay noche en medio.
   *
   * HOY NO LA USA NINGUNA CARRERA DEL CALENDARIO, y se dice aquí en vez de disimularse. Poner una
   * semietapa de verdad es una decisión de calendario que mueve resultados de producción, y ésa es
   * del dueño; lo que esta rama trae es que el motor y el tick SEPAN correrla cuando la haya, con su
   * prueba, en vez de que el dato no se pueda ni expresar.
   */
  doubleAfter?: number[]
}

/** Quién puede inscribirse según el nivel de la carrera: los inferiores entran como invitados. */
export function enrollmentFor(level: RaceLevel): Division[] {
  if (level === 'WT') return ['WT', 'PRS']
  if (level === 'PRS') return ['WT', 'PRS', 'CON']
  return ['PRS', 'CON']
}

/**
 * Coloca banners a partir del terreno: una cima al final de cada puerto. NO inventa metas volantes /
 * sprints intermedios: no todas las carreras los tienen y no tenemos el dato real de dónde caen, así
 * que no los fabricamos (solo se marca lo que se deriva del propio recorrido: los puertos).
 *
 * Desde la v87 ninguna etapa del calendario la usa: lo generado lleva las pancartas de
 * `emitirPancartas` (gramática) y lo real las de `bannersFromFeatures`. Se exporta para el generador
 * viejo de `sim/legacy/profileGenLegacy.ts`, que vive hasta el paso 9 (§15.10).
 */
export function auto(segments: Segment[]): StageProfile {
  const banners = []
  let cum = 0
  for (const s of segments) {
    cum += s.km
    if (s.tipo === 'puerto') banners.push({ km: Math.round(cum), tipo: 'cima' as const })
  }
  banners.sort((a, b) => a.km - b.km)
  return { segments, banners }
}

/**
 * Nombra y numera una lista de specs como las etapas de una carrera. Genérica en el spec para que el
 * generador viejo de `sim/legacy/`, cuyos constructores no llevan `routeSource`, la comparta.
 */
export function stagesFrom<S extends { label: string }>(
  specs: readonly S[],
): (S & { index: number; name: string })[] {
  return specs.map((spec, i) => ({
    ...spec,
    index: i + 1,
    name: `Stage ${i + 1} · ${spec.label}`,
  }))
}

/** Tipo de etapa (color y etiqueta) según el terreno; base común del perfil por terreno y por rasgos. */
const TERRAIN_KIND: Record<Terrain, { kind: StageKind; label: string; timeTrial?: boolean }> = {
  flat: { kind: 'llana', label: 'Flat' },
  hilly: { kind: 'media', label: 'Hills' },
  mountain: { kind: 'reina', label: 'Summit finish' },
  itt: { kind: 'cri', label: 'ITT', timeTrial: true },
  cobbles: { kind: 'clasica', label: 'Cobbles' },
  classic: { kind: 'clasica', label: 'Classic' },
}

/**
 * Etapa construida con sus RASGOS REALES (puertos y sprints reales): el relieve reproduce la etapa
 * de verdad, no un perfil inventado por terreno. El tipo/etiqueta (color en la web) sigue al terreno.
 * Es la rama `real` (§11.1): el perfil no pasa por la gramática y la huella de
 * `routes/realFingerprint.test.ts` lo sella.
 */
export function featureSpec(
  terrain: Terrain,
  km: number,
  features: StageFeatures,
  seed: string,
): StageSpec {
  const t = TERRAIN_KIND[terrain]
  return {
    kind: t.kind,
    label: t.label,
    ...(t.timeTrial ? { timeTrial: true } : {}),
    profile: buildFeatureProfile(km, features, seed, terrain),
    routeSource: 'real',
  }
}

const MONTH_CUM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]

/**
 * Día de temporada de la mayoría de campeonatos nacionales. En el ciclismo real casi todos se
 * disputan el MISMO fin de semana (el último de junio; 2026 ≈ 27 jun = día 178), por eso comparten
 * fecha. Las excepciones de calendario (hemisferio sur / Asia en enero) van en el mapa de abajo.
 */
/** Día (del año) de la prueba en RUTA Elite. La mayoría cae el último fin de semana de junio. */
export const NATIONALS_ROAD_DAY = doy(6, 28)

/**
 * Día real (mes, día) de la RUTA Elite de los países cuyo campeonato NO cae el fin de semana de
 * junio: hemisferio sur (enero-febrero) y algún calendario propio. La crono y el sub-23 se colocan
 * en los días previos de la misma semana. El resto de países usan NATIONALS_ROAD_DAY.
 */
export const NATIONALS_ROAD_OVERRIDE: Record<string, [number, number]> = {
  AU: [1, 11], // Australia
  TH: [1, 18], // Tailandia
  NZ: [2, 7], // Nueva Zelanda
  CO: [2, 8], // Colombia
  ZA: [2, 8], // Sudáfrica
  ZW: [2, 7], // Zimbabue
  NA: [2, 8], // Namibia
  UY: [2, 8], // Uruguay
  PH: [2, 27], // Filipinas
  BO: [3, 1], // Bolivia
  CL: [3, 8], // Chile
  AE: [4, 12], // Emiratos
  CR: [4, 19], // Costa Rica
  EG: [4, 25], // Egipto
  PA: [4, 26], // Panamá
  EC: [6, 12], // Ecuador
  MO: [6, 21], // Macao
  IR: [6, 30], // Irán
  MN: [7, 4], // Mongolia
  JM: [7, 5], // Jamaica
  KG: [8, 23], // Kirguistán
  MY: [9, 13], // Malasia
}

/** Hash entero estable de una cadena (para variar de forma determinista por país). */
export function ncHash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// --- Calendario real (estructura 2026) por tabla de datos, con nombres NEUTROS por geografía. ---
// Solo se copian los HECHOS (fechas, clase, formato); los nombres de marca se sustituyen y los
// perfiles de etapa son autoría propia. Día de temporada = día del año (temporada ≈ año no bisiesto).

export function doy(month: number, day: number): number {
  return MONTH_CUM[month - 1]! + day
}

// El terreno dominante de una etapa: da color y etiqueta en el calendario y, en un perfil
// reconstruido, la amplitud del relieve anónimo entre dificultades (ver featureProfile.ts).
type Terrain = RouteTerrain

export interface RaceRow {
  id: string
  name: string
  /** Fecha de arranque real (mes 1-based, día): fija el día de temporada. */
  m: number
  d: number
  raceClass: RaceClass
  region?: Continent
  /** País donde se disputa (ISO alpha-2). Si falta, se toma de RACE_COUNTRY por id. */
  country?: string
  /** Nº de etapas si es vuelta por etapas; ausente/1 = carrera de un día. */
  stages?: number
  /** Terreno dominante para el perfil (autoría propia). */
  terrain?: Terrain
  /** Km de una carrera de un día (por defecto según terreno). */
  km?: number
}

/**
 * Una vuelta generada de `n` etapas con sesgo de terreno (docs/generador.md §3.6 y §7.5; decisión 19).
 * Conserva la firma de siempre y delega en `composeTour`: itinerario por el territorio, papeles,
 * kilómetros por clase y una `generateStage` por etapa. `raceId` es la identidad de la vuelta
 * (`arch|raceId`), la clave de `itinerarioDe` y la de `RACE_REGION`; sin `ctx.raceId` es `seedBase`.
 * Con el contexto por defecto (país desconocido, .2, una semana, temporada base) el territorio es
 * `generico`: es lo que usan los tests. `buildRace` no pasa por aquí, llama a `composeTour` con el
 * contexto de la fila.
 */
export function stageMix(
  n: number,
  terrain: Terrain,
  seedBase: string,
  ctx: RouteContext = DEFAULT_ROUTE_CONTEXT,
): StageSpec[] {
  return composeTour(ctx.raceId ?? seedBase, n, terrain, ctx)
}

/**
 * País (ISO alpha-2) donde se disputa cada carrera global (WorldTour y ProSeries) y las grandes
 * vueltas, por su geografía real (solo el hecho, no la marca). Base del sistema de viajes. Las
 * continentales llevan su país en la propia fila (o, si falta, se usa el continente).
 */
export const RACE_COUNTRY: Record<string, string> = {
  // WorldTour + grandes vueltas
  'race-down-under': 'AU',
  'race-great-ocean': 'AU',
  'race-emirates': 'AE',
  'race-opening-classic': 'BE',
  'race-white-roads': 'IT',
  'race-to-the-sun': 'FR',
  'race-two-seas': 'IT',
  'race-sanremo': 'IT',
  'race-catalonia': 'ES',
  'race-bruges': 'BE',
  'race-harelbeke': 'BE',
  'race-wevelgem': 'BE',
  'race-across-flanders': 'BE',
  'race-flanders': 'BE',
  'race-basque-country': 'ES',
  'race-roubaix': 'FR',
  'race-amstel': 'NL',
  'race-walloon-wall': 'BE',
  'race-liege': 'BE',
  'race-romandy': 'CH',
  'race-frankfurt': 'DE',
  'race-italy': 'IT',
  'race-rhone-alpes': 'FR',
  'race-copenhagen': 'DK',
  'race-switzerland': 'CH',
  'race-france': 'FR',
  'race-san-sebastian': 'ES',
  'race-poland': 'PL',
  'race-hamburg': 'DE',
  'race-benelux': 'BE',
  'race-spain': 'ES',
  'race-brittany': 'FR',
  'race-quebec': 'CA',
  'race-montreal': 'CA',
  'race-lombardy': 'IT',
  'race-guangxi': 'CN',
  // ProSeries
  'race-arabia': 'SA',
  'race-surf-coast': 'AU',
  'race-valencia': 'ES',
  'race-muscat': 'OM',
  'race-oman': 'OM',
  'race-figueira': 'PT',
  'race-almeria': 'ES',
  'race-algarve': 'PT',
  'race-andalusia': 'ES',
  'race-ardeche': 'FR',
  'race-drome': 'FR',
  'race-kuurne': 'BE',
  'race-laigueglia': 'IT',
  'race-nokere': 'BE',
  'race-turin': 'IT',
  'race-denain': 'FR',
  'race-bredene': 'BE',
  'race-navarre': 'ES',
  'race-loire': 'FR',
  'race-schelde': 'BE',
  'race-hainan': 'CN',
  'race-brabant': 'BE',
  'race-alps': 'IT',
  'race-turkiye': 'TR',
  'race-morbihan': 'FR',
  'race-leon': 'ES',
  'race-hungary': 'HU',
  'race-dunkerque': 'FR',
  'race-hauts-de-france': 'FR',
  'race-mayenne': 'FR',
  'race-norway': 'NO',
  'race-wallonia': 'BE',
  'race-brussels': 'BE',
  'race-franco-belgian': 'FR',
  'race-belgium': 'BE',
  'race-slovenia': 'SI',
  'race-qinghai': 'CN',
  'race-denmark': 'DK',
  'race-burgos': 'ES',
  'race-arctic': 'NO',
  'race-czechia': 'CZ',
  'race-germany': 'DE',
  'race-britain': 'GB',
  'race-maryland': 'US',
  'race-prato': 'IT',
  'race-peccioli': 'IT',
  'race-fourmies': 'FR',
  'race-namur': 'BE',
  'race-luxembourg': 'LU',
  'race-flandrien': 'BE',
  'race-croatia': 'HR',
  'race-langkawi': 'MY',
  'race-emilia': 'IT',
  'race-munster': 'DE',
  'race-legnano': 'IT',
  'race-varese': 'IT',
  'race-piedmont': 'IT',
  'race-tours': 'FR',
  'race-veneto': 'IT',
  'race-japan': 'JP',
  'race-veneto-classic': 'IT',
  // Circuito continental — África
  'race-rwanda': 'RW',
  'race-algeria': 'DZ',
  'race-benin': 'BJ',
  'race-mauritius': 'MU',
  'race-cameroon': 'CM',
  'race-morocco': 'MA',
  'race-faso': 'BF',
  // Circuito continental — América
  'race-tachira': 'VE',
  'race-colombia': 'CO',
  'race-gila': 'US',
  'race-guatemala': 'GT',
  'race-beauce': 'CA',
  'race-venezuela': 'VE',
  'race-colombia-tour': 'CO',
  'race-philadelphia': 'US',
  'race-ecuador': 'EC',
  // Circuito continental — Asia
  'race-pune': 'IN',
  'race-sharjah': 'AE',
  'race-taiwan': 'TW',
  'race-thailand': 'TH',
  'race-kumano': 'JP',
  'race-nippon': 'JP',
  'race-korea': 'KR',
  'race-taihu': 'CN',
  'race-poyang': 'CN',
  'race-kyushu': 'JP',
  // Circuito continental — Oceanía
  'race-victoria': 'AU',
  // Circuito continental — Europa
  'race-morvedre': 'ES',
  'race-castellon': 'ES',
  'race-valencia-gp': 'ES',
  'race-calvia': 'ES',
  'race-ses-salines': 'ES',
  'race-tramuntana': 'ES',
  'race-andratx': 'ES',
  'race-marseille': 'FR',
  'race-palma': 'ES',
  'race-besseges': 'FR',
  'race-antalya-gp': 'TR',
  'race-aveiro': 'PT',
  'race-provence': 'FR',
  'race-murcia': 'ES',
  'race-jaen': 'ES',
  'race-var': 'FR',
  'race-alaiye': 'TR',
  'race-alpes-maritimes': 'FR',
  'race-sardegna': 'IT',
  'race-aegean': 'TR',
  'race-pedalia': 'GR',
  'race-dodecanese': 'GR',
  'race-samyn': 'BE',
  'race-umag': 'HR',
  'race-apollon': 'CY',
  'race-communes': 'BE',
  'race-rhodes-gp': 'GR',
  'race-zwolle': 'NL',
  'race-rucphen': 'NL',
  'race-lillers': 'FR',
  'race-porec': 'HR',
  'race-istria': 'HR',
  'race-antalya': 'TR',
  'race-rhodes': 'GR',
  'race-popolarissima': 'IT',
  'race-youngster': 'BE',
  'race-ebre': 'ES',
  'race-monsere': 'BE',
  'race-slovenian-istria': 'SI',
  'race-ontur': 'ES',
  'race-arrabida': 'PT',
  'race-romagna': 'IT',
  'race-olympia': 'NL',
  'race-alentejo': 'PT',
  'race-brda': 'SI',
  'race-loire-atlantique': 'FR',
  'race-syedra': 'TR',
  'race-emilia-gp': 'IT',
  'race-tourangelle': 'FR',
  'race-annemasse': 'FR',
  'race-novo-mesto': 'SI',
  'race-camembert': 'FR',
  'race-vitre': 'FR',
  'race-alanya': 'TR',
  'race-nxt': 'NL',
  'race-artois': 'FR',
  'race-piva': 'IT',
  'race-belvedere': 'IT',
  'race-huy': 'BE',
  'race-recioto': 'IT',
  'race-ardennes': 'BE',
  'race-mersin': 'TR',
  'race-reggio': 'IT',
  'race-magna-grecia': 'IT',
  'race-braakman': 'NL',
  'race-pascua': 'ES',
  'race-roubaix-espoirs': 'FR',
  'race-slezanski': 'PL',
  'race-vendemiano': 'IT',
  'race-galicia': 'ES',
  'race-limburg': 'NL',
  'race-loir-cher': 'FR',
  'race-besancon': 'FR',
  'race-bosnia': 'BA',
  'race-jura': 'FR',
  'race-liege-espoirs': 'BE',
  'race-doubs': 'FR',
  'race-biella': 'IT',
  'race-belgrade': 'RS',
  'race-asturias': 'ES',
  'race-liberazione': 'IT',
  'race-bretagne': 'FR',
  'race-appennino': 'IT',
  'race-rutland': 'GB',
  'race-anicolor': 'PT',
  'race-vorarlberg': 'AT',
  'race-waasland': 'BE',
  'race-herning': 'DK',
  'race-overijssel': 'NL',
  'race-famenne': 'BE',
  'race-woensdrecht': 'NL',
  'race-funen': 'DK',
  'race-hellas': 'GR',
  'race-fagnes': 'BE',
  'race-fleche-ardennaise': 'BE',
  'race-beskid': 'PL',
  'race-beskid-race': 'PL',
  'race-sundvolden': 'NO',
  'race-baku': 'AZ',
  'race-zaglebie': 'PL',
  'race-ringerike': 'NO',
  'race-fleche-sud': 'LU',
  'race-wallonie-circuit': 'BE',
  'race-finistere': 'FR',
  'race-aulne': 'FR',
  'race-koln': 'DE',
  'race-arvedi': 'IT',
  'race-kempen': 'BE',
  'race-albania': 'AL',
  'race-estrela': 'PT',
  'race-veenendaal': 'NL',
  'race-criquielion': 'BE',
  'race-antwerp': 'BE',
  'race-troyes': 'FR',
  'race-isere': 'FR',
  'race-lithuania': 'LT',
  'race-mercantour': 'FR',
  'race-estonia': 'EE',
  'race-oberosterreich': 'AT',
  'race-oise': 'FR',
  'race-heist': 'BE',
  'race-visegrad-cz': 'CZ',
  'race-malopolska': 'PL',
  'race-elfsteden': 'NL',
  'race-gippingen': 'CH',
  'race-muur': 'BE',
  'race-occitanie': 'FR',
  'race-mazury': 'PL',
  'race-andorra-classic': 'AD',
  'race-lyon': 'FR',
  'race-solidarnosc': 'PL',
  'race-sibiu': 'RO',
  'race-austria': 'AT',
  'race-torres-vedras': 'PT',
  'race-ordizia': 'ES',
  'race-castilla-leon': 'ES',
  'race-ain': 'FR',
  'race-alsace': 'FR',
  'race-kreiz-breizh': 'FR',
  'race-getxo': 'ES',
  'race-maras': 'TR',
  'race-portugal': 'PT',
  'race-szekler': 'RO',
  'race-polynormande': 'FR',
  'race-limousin': 'FR',
  'race-west-bohemia': 'CZ',
  'race-baltic': 'LT',
  'race-aquitaine': 'FR',
  'race-samsun': 'TR',
  'race-bulgaria': 'BG',
  'race-kranj': 'SI',
  'race-plouay': 'FR',
  'race-halle': 'BE',
  'race-achterhoek': 'NL',
  'race-zlm': 'NL',
  'race-istanbul': 'TR',
  'race-friuli': 'IT',
  'race-south-bohemia': 'CZ',
  'race-sauerland': 'DE',
  'race-kosovo': 'XK',
  'race-somme': 'FR',
  'race-toscana': 'IT',
  'race-romania': 'RO',
  'race-pantani': 'IT',
  'race-matteotti': 'IT',
  'race-abruzzo': 'IT',
  'race-slovakia': 'SK',
  'race-serbie': 'RS',
  'race-vlaanderen': 'BE',
  'race-lazio': 'IT',
  'race-romagna-giro': 'IT',
  'race-gooik': 'BE',
  'race-isbergues': 'FR',
  'race-houtland': 'BE',
  'race-mirabelle': 'FR',
  'race-cerami': 'BE',
  'race-chauny': 'FR',
  'race-cholet': 'FR',
  'race-euro-champs': 'FR',
  'race-agostoni': 'IT',
  'race-vendee': 'FR',
  'race-binche': 'BE',
  'race-san-daniele': 'IT',
  'race-oropa': 'IT',
  'race-holland': 'NL',
  'race-chrono': 'FR',
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
    km: 187.6, // distancia oficial (ver classicRoutes.ts)
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
    km: 202.2, // distancia oficial (ver classicRoutes.ts)
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
    km: 208.8, // distancia oficial (ver classicRoutes.ts)
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
    km: 188.6, // distancia oficial (ver classicRoutes.ts)
  },
  {
    id: 'race-flanders',
    name: 'Race Flanders',
    m: 4,
    d: 5,
    raceClass: 'WT',
    terrain: 'cobbles',
    km: 278.2, // distancia oficial (ver classicRoutes.ts)
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
    km: 258.3, // distancia oficial (ver classicRoutes.ts)
  },
  {
    id: 'race-amstel',
    name: 'Race Amstel',
    m: 4,
    d: 19,
    raceClass: 'WT',
    terrain: 'hilly',
    km: 255.9, // distancia oficial (ver classicRoutes.ts)
  },
  {
    id: 'race-walloon-wall',
    name: 'Race Walloon Wall',
    m: 4,
    d: 22,
    raceClass: 'WT',
    terrain: 'mountain',
    km: 205.2, // distancia oficial (ver classicRoutes.ts)
  },
  {
    id: 'race-liege',
    name: 'Race Liège',
    m: 4,
    d: 26,
    raceClass: 'WT',
    terrain: 'classic',
    km: 252, // distancia oficial (ver classicRoutes.ts)
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
    km: 203.8, // distancia oficial (ver classicRoutes.ts)
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
    km: 221,
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
    km: 198.5, // distancia oficial (ver classicRoutes.ts)
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
    km: 216, // distancia oficial (ver classicRoutes.ts)
  },
  {
    id: 'race-montreal',
    name: 'Race Montréal',
    m: 9,
    d: 13,
    raceClass: 'WT',
    terrain: 'hilly',
    km: 209.1, // distancia oficial (ver classicRoutes.ts)
  },
  {
    id: 'race-lombardy',
    name: 'Race Lombardy',
    m: 10,
    d: 10,
    raceClass: 'WT',
    terrain: 'classic',
    km: 241.5, // distancia oficial (ver classicRoutes.ts)
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
    km: 192,
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
  {
    id: 'race-brabant',
    name: 'Race Brabant',
    m: 4,
    d: 17,
    raceClass: 'Pro',
    terrain: 'hilly',
    km: 163,
  },
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

/**
 * Circuitos continentales (.1/.2) por continente, selección representativa de la estructura 2026 con
 * región para la inscripción (preferencia a equipos de la región + wildcards). Nombres neutros por
 * geografía y fechas reales; recorridos de autoría propia.
 */
const CON_TABLE: RaceRow[] = [
  // Europa (circuito continental completo)
  {
    id: 'race-morvedre',
    name: 'Race Morvedre',
    m: 1,
    d: 23,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-castellon',
    name: 'Race Castellón',
    m: 1,
    d: 24,
    raceClass: '1',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-valencia-gp',
    name: 'Race Valencia GP',
    m: 1,
    d: 25,
    raceClass: '1',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-calvia',
    name: 'Race Calvià',
    m: 1,
    d: 28,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-ses-salines',
    name: 'Race Ses Salines',
    m: 1,
    d: 29,
    raceClass: '1',
    region: 'Europe',
    terrain: 'mountain',
  },
  {
    id: 'race-tramuntana',
    name: 'Race Tramuntana',
    m: 1,
    d: 30,
    raceClass: '1',
    region: 'Europe',
    terrain: 'mountain',
  },
  {
    id: 'race-andratx',
    name: 'Race Andratx',
    m: 1,
    d: 31,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-marseille',
    name: 'Race Marseille',
    m: 2,
    d: 1,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-palma',
    name: 'Race Palma',
    m: 2,
    d: 1,
    raceClass: '1',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-besseges',
    name: 'Race Bessèges',
    m: 2,
    d: 4,
    raceClass: '1',
    region: 'Europe',
    stages: 5,
    terrain: 'hilly',
  },
  {
    id: 'race-antalya-gp',
    name: 'Race Antalya GP',
    m: 2,
    d: 7,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-aveiro',
    name: 'Race Aveiro',
    m: 2,
    d: 8,
    raceClass: '1',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-provence',
    name: 'Race Provence',
    m: 2,
    d: 13,
    raceClass: '1',
    region: 'Europe',
    stages: 3,
    terrain: 'mountain',
  },
  {
    id: 'race-murcia',
    name: 'Race Murcia',
    m: 2,
    d: 13,
    raceClass: '1',
    region: 'Europe',
    stages: 2,
    terrain: 'mountain',
  },
  {
    id: 'race-jaen',
    name: 'Race Jaén',
    m: 2,
    d: 16,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-var',
    name: 'Race Var',
    m: 2,
    d: 21,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-alaiye',
    name: 'Race Alaiye',
    m: 2,
    d: 21,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-alpes-maritimes',
    name: 'Race Alpes-Maritimes',
    m: 2,
    d: 22,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-sardegna',
    name: 'Race Sardegna',
    m: 2,
    d: 25,
    raceClass: '1',
    region: 'Europe',
    stages: 5,
    terrain: 'hilly',
  },
  {
    id: 'race-aegean',
    name: 'Race Aegean',
    m: 2,
    d: 28,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-pedalia',
    name: 'Race Pedalia',
    m: 2,
    d: 28,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-dodecanese',
    name: 'Race Dodecanese',
    m: 3,
    d: 1,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-samyn',
    name: 'Race Samyn',
    m: 3,
    d: 3,
    raceClass: '1',
    region: 'Europe',
    terrain: 'cobbles',
    km: 200,
  },
  {
    id: 'race-umag',
    name: 'Race Umag',
    m: 3,
    d: 4,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-apollon',
    name: 'Race Apollon',
    m: 3,
    d: 7,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-communes',
    name: 'Race Communes',
    m: 3,
    d: 7,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-rhodes-gp',
    name: 'Race Rhodes GP',
    m: 3,
    d: 7,
    raceClass: '2',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-zwolle',
    name: 'Race Zwolle',
    m: 3,
    d: 7,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-rucphen',
    name: 'Race Rucphen',
    m: 3,
    d: 8,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-lillers',
    name: 'Race Lillers',
    m: 3,
    d: 8,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-porec',
    name: 'Race Poreč',
    m: 3,
    d: 8,
    raceClass: '2',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-istria',
    name: 'Race Istria',
    m: 3,
    d: 12,
    raceClass: '2',
    region: 'Europe',
    stages: 4,
    terrain: 'hilly',
  },
  {
    id: 'race-antalya',
    name: 'Race Antalya',
    m: 3,
    d: 12,
    raceClass: '2',
    region: 'Europe',
    stages: 4,
    terrain: 'flat',
  },
  {
    id: 'race-rhodes',
    name: 'Race Rhodes',
    m: 3,
    d: 12,
    raceClass: '2',
    region: 'Europe',
    stages: 4,
    terrain: 'hilly',
  },
  {
    id: 'race-popolarissima',
    name: 'Race Popolarissima',
    m: 3,
    d: 15,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-youngster',
    name: 'Race Youngster Coast',
    m: 3,
    d: 20,
    raceClass: '2',
    region: 'Europe',
    terrain: 'cobbles',
    km: 175,
  },
  {
    id: 'race-ebre',
    name: 'Race Ebre',
    m: 3,
    d: 21,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-monsere',
    name: 'Race Monseré',
    m: 3,
    d: 22,
    raceClass: '1',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-slovenian-istria',
    name: 'Race Slovenian Istria',
    m: 3,
    d: 22,
    raceClass: '2',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-ontur',
    name: 'Race Ontur',
    m: 3,
    d: 22,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-arrabida',
    name: 'Race Arrábida',
    m: 3,
    d: 22,
    raceClass: '2',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-romagna',
    name: 'Race Romagna',
    m: 3,
    d: 25,
    raceClass: '1',
    region: 'Europe',
    stages: 5,
    terrain: 'hilly',
  },
  {
    id: 'race-olympia',
    name: 'Race Olympia',
    m: 3,
    d: 25,
    raceClass: '2',
    region: 'Europe',
    stages: 5,
    terrain: 'flat',
  },
  {
    id: 'race-alentejo',
    name: 'Race Alentejo',
    m: 3,
    d: 25,
    raceClass: '2',
    region: 'Europe',
    stages: 5,
    terrain: 'hilly',
  },
  {
    id: 'race-brda',
    name: 'Race Brda',
    m: 3,
    d: 26,
    raceClass: '2',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-loire-atlantique',
    name: 'Race Loire Atlantique',
    m: 3,
    d: 28,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-syedra',
    name: 'Race Syedra',
    m: 3,
    d: 28,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-emilia-gp',
    name: 'Race Emilia GP',
    m: 3,
    d: 29,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-tourangelle',
    name: 'Race Tourangelle',
    m: 3,
    d: 29,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-annemasse',
    name: 'Race Annemasse',
    m: 3,
    d: 29,
    raceClass: '2',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-novo-mesto',
    name: 'Race Novo Mesto',
    m: 3,
    d: 29,
    raceClass: '2',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-camembert',
    name: 'Race Camembert',
    m: 3,
    d: 31,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-vitre',
    name: 'Race Vitré',
    m: 4,
    d: 3,
    raceClass: '1',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-alanya',
    name: 'Race Alanya',
    m: 4,
    d: 3,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-nxt',
    name: 'Race NXT',
    m: 4,
    d: 4,
    raceClass: '1',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-artois',
    name: 'Race Artois',
    m: 4,
    d: 4,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-piva',
    name: 'Race Piva',
    m: 4,
    d: 5,
    raceClass: '2',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-belvedere',
    name: 'Race Belvedere',
    m: 4,
    d: 6,
    raceClass: '2',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-huy',
    name: 'Race Huy',
    m: 4,
    d: 6,
    raceClass: '2',
    region: 'Europe',
    terrain: 'mountain',
  },
  {
    id: 'race-recioto',
    name: 'Race Recioto',
    m: 4,
    d: 7,
    raceClass: '2',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-ardennes',
    name: 'Race Ardennes',
    m: 4,
    d: 8,
    raceClass: '2',
    region: 'Europe',
    stages: 5,
    terrain: 'hilly',
  },
  {
    id: 'race-mersin',
    name: 'Race Mersin',
    m: 4,
    d: 9,
    raceClass: '2',
    region: 'Europe',
    stages: 4,
    terrain: 'hilly',
  },
  {
    id: 'race-reggio',
    name: 'Race Reggio',
    m: 4,
    d: 10,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-magna-grecia',
    name: 'Race Magna Grecia',
    m: 4,
    d: 11,
    raceClass: '1',
    region: 'Europe',
    stages: 3,
    terrain: 'mountain',
  },
  {
    id: 'race-braakman',
    name: 'Race Braakman',
    m: 4,
    d: 11,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-pascua',
    name: 'Race Pascua',
    m: 4,
    d: 12,
    raceClass: '2',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-roubaix-espoirs',
    name: 'Race Roubaix Espoirs',
    m: 4,
    d: 12,
    raceClass: '2',
    region: 'Europe',
    terrain: 'cobbles',
    km: 190,
  },
  {
    id: 'race-slezanski',
    name: 'Race Ślężański',
    m: 4,
    d: 12,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-vendemiano',
    name: 'Race Vendemiano',
    m: 4,
    d: 12,
    raceClass: '2',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-galicia',
    name: 'Race Galicia',
    m: 4,
    d: 14,
    raceClass: '1',
    region: 'Europe',
    stages: 4,
    terrain: 'mountain',
  },
  {
    id: 'race-limburg',
    name: 'Race Limburg',
    m: 4,
    d: 15,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-loir-cher',
    name: 'Race Loir-et-Cher',
    m: 4,
    d: 15,
    raceClass: '2',
    region: 'Europe',
    stages: 5,
    terrain: 'flat',
  },
  {
    id: 'race-besancon',
    name: 'Race Besançon',
    m: 4,
    d: 17,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-bosnia',
    name: 'Race Bosnia',
    m: 4,
    d: 17,
    raceClass: '2',
    region: 'Europe',
    stages: 3,
    terrain: 'mountain',
  },
  {
    id: 'race-jura',
    name: 'Race Jura',
    m: 4,
    d: 18,
    raceClass: '1',
    region: 'Europe',
    terrain: 'mountain',
  },
  {
    id: 'race-liege-espoirs',
    name: 'Race Liège Espoirs',
    m: 4,
    d: 18,
    raceClass: '2',
    region: 'Europe',
    terrain: 'classic',
    km: 190,
  },
  {
    id: 'race-doubs',
    name: 'Race Doubs',
    m: 4,
    d: 19,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-biella',
    name: 'Race Biella',
    m: 4,
    d: 19,
    raceClass: '2',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-belgrade',
    name: 'Race Belgrade',
    m: 4,
    d: 22,
    raceClass: '2',
    region: 'Europe',
    stages: 4,
    terrain: 'hilly',
  },
  {
    id: 'race-asturias',
    name: 'Race Asturias',
    m: 4,
    d: 23,
    raceClass: '1',
    region: 'Europe',
    stages: 3,
    terrain: 'mountain',
  },
  {
    id: 'race-liberazione',
    name: 'Race Liberazione',
    m: 4,
    d: 25,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-bretagne',
    name: 'Race Bretagne',
    m: 4,
    d: 25,
    raceClass: '2',
    region: 'Europe',
    stages: 7,
    terrain: 'hilly',
  },
  {
    id: 'race-appennino',
    name: 'Race Appennino',
    m: 4,
    d: 26,
    raceClass: '1',
    region: 'Europe',
    terrain: 'mountain',
  },
  {
    id: 'race-rutland',
    name: 'Race Rutland',
    m: 4,
    d: 26,
    raceClass: '2',
    region: 'Europe',
    terrain: 'cobbles',
    km: 180,
  },
  {
    id: 'race-anicolor',
    name: 'Race Anicolor',
    m: 5,
    d: 1,
    raceClass: '1',
    region: 'Europe',
    stages: 3,
    terrain: 'hilly',
  },
  {
    id: 'race-vorarlberg',
    name: 'Race Vorarlberg',
    m: 5,
    d: 1,
    raceClass: '2',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-waasland',
    name: 'Race Waasland',
    m: 5,
    d: 1,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-herning',
    name: 'Race Herning',
    m: 5,
    d: 2,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-overijssel',
    name: 'Race Overijssel',
    m: 5,
    d: 2,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-famenne',
    name: 'Race Famenne',
    m: 5,
    d: 3,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-woensdrecht',
    name: 'Race Woensdrecht',
    m: 5,
    d: 3,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-funen',
    name: 'Race Funen',
    m: 5,
    d: 3,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-hellas',
    name: 'Race Hellas',
    m: 5,
    d: 6,
    raceClass: '1',
    region: 'Europe',
    stages: 5,
    terrain: 'hilly',
  },
  {
    id: 'race-fagnes',
    name: 'Race Fagnes',
    m: 5,
    d: 6,
    raceClass: '2',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-fleche-ardennaise',
    name: 'Race Ardennaise',
    m: 5,
    d: 7,
    raceClass: '2',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-beskid',
    name: 'Race Beskid',
    m: 5,
    d: 7,
    raceClass: '2',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-beskid-race',
    name: 'Race Beskid Classic',
    m: 5,
    d: 9,
    raceClass: '2',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-sundvolden',
    name: 'Race Sundvolden',
    m: 5,
    d: 9,
    raceClass: '2',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-baku',
    name: 'Race Baku',
    m: 5,
    d: 10,
    raceClass: '1',
    region: 'Europe',
    stages: 5,
    terrain: 'hilly',
  },
  {
    id: 'race-zaglebie',
    name: 'Race Zagłębie',
    m: 5,
    d: 10,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-ringerike',
    name: 'Race Ringerike',
    m: 5,
    d: 10,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-fleche-sud',
    name: 'Race Flèche du Sud',
    m: 5,
    d: 13,
    raceClass: '1',
    region: 'Europe',
    stages: 5,
    terrain: 'mountain',
  },
  {
    id: 'race-wallonie-circuit',
    name: 'Race Wallonie Circuit',
    m: 5,
    d: 14,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-finistere',
    name: 'Race Finistère',
    m: 5,
    d: 16,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-aulne',
    name: 'Race Aulne',
    m: 5,
    d: 17,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-koln',
    name: 'Race Köln',
    m: 5,
    d: 17,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-arvedi',
    name: 'Race Arvedi',
    m: 5,
    d: 17,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-kempen',
    name: 'Race Kempen',
    m: 5,
    d: 17,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-albania',
    name: 'Race Albania',
    m: 5,
    d: 18,
    raceClass: '2',
    region: 'Europe',
    stages: 5,
    terrain: 'hilly',
  },
  {
    id: 'race-estrela',
    name: 'Race Estrela',
    m: 5,
    d: 22,
    raceClass: '1',
    region: 'Europe',
    stages: 3,
    terrain: 'mountain',
  },
  {
    id: 'race-veenendaal',
    name: 'Race Veenendaal',
    m: 5,
    d: 23,
    raceClass: '1',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-criquielion',
    name: 'Race Criquielion',
    m: 5,
    d: 24,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-antwerp',
    name: 'Race Antwerp',
    m: 5,
    d: 25,
    raceClass: '1',
    region: 'Europe',
    terrain: 'cobbles',
    km: 190,
  },
  {
    id: 'race-troyes',
    name: 'Race Troyes',
    m: 5,
    d: 25,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-isere',
    name: 'Race Isère',
    m: 5,
    d: 27,
    raceClass: '2',
    region: 'Europe',
    stages: 5,
    terrain: 'mountain',
  },
  {
    id: 'race-lithuania',
    name: 'Race Lithuania',
    m: 5,
    d: 27,
    raceClass: '2',
    region: 'Europe',
    stages: 5,
    terrain: 'flat',
  },
  {
    id: 'race-mercantour',
    name: 'Race Mercantour',
    m: 6,
    d: 3,
    raceClass: '1',
    region: 'Europe',
    terrain: 'mountain',
  },
  {
    id: 'race-estonia',
    name: 'Race Estonia',
    m: 6,
    d: 4,
    raceClass: '1',
    region: 'Europe',
    stages: 3,
    terrain: 'flat',
  },
  {
    id: 'race-oberosterreich',
    name: 'Race Oberösterreich',
    m: 6,
    d: 4,
    raceClass: '2',
    region: 'Europe',
    stages: 4,
    terrain: 'hilly',
  },
  {
    id: 'race-oise',
    name: 'Race Oise',
    m: 6,
    d: 4,
    raceClass: '2',
    region: 'Europe',
    stages: 4,
    terrain: 'flat',
  },
  {
    id: 'race-heist',
    name: 'Race Heist',
    m: 6,
    d: 6,
    raceClass: '1',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-visegrad-cz',
    name: 'Race Visegrad',
    m: 6,
    d: 7,
    raceClass: '2',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-malopolska',
    name: 'Race Malopolska',
    m: 6,
    d: 11,
    raceClass: '2',
    region: 'Europe',
    stages: 3,
    terrain: 'hilly',
  },
  {
    id: 'race-elfsteden',
    name: 'Race Elfsteden',
    m: 6,
    d: 14,
    raceClass: '1',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-gippingen',
    name: 'Race Gippingen',
    m: 6,
    d: 14,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-muur',
    name: 'Race Muur',
    m: 6,
    d: 14,
    raceClass: '1',
    region: 'Europe',
    terrain: 'cobbles',
    km: 190,
  },
  {
    id: 'race-occitanie',
    name: 'Race Occitanie',
    m: 6,
    d: 18,
    raceClass: '1',
    region: 'Europe',
    stages: 4,
    terrain: 'mountain',
  },
  {
    id: 'race-mazury',
    name: 'Race Mazury',
    m: 6,
    d: 19,
    raceClass: '2',
    region: 'Europe',
    stages: 3,
    terrain: 'flat',
  },
  {
    id: 'race-andorra-classic',
    name: 'Race Andorra Classic',
    m: 6,
    d: 21,
    raceClass: '1',
    region: 'Europe',
    terrain: 'mountain',
  },
  {
    id: 'race-lyon',
    name: 'Race Lyon',
    m: 7,
    d: 1,
    raceClass: '1',
    region: 'Europe',
    stages: 3,
    terrain: 'mountain',
  },
  {
    id: 'race-solidarnosc',
    name: 'Race Solidarnosc',
    m: 7,
    d: 1,
    raceClass: '2',
    region: 'Europe',
    stages: 4,
    terrain: 'hilly',
  },
  {
    id: 'race-sibiu',
    name: 'Race Sibiu',
    m: 7,
    d: 4,
    raceClass: '1',
    region: 'Europe',
    stages: 4,
    terrain: 'mountain',
  },
  {
    id: 'race-austria',
    name: 'Race Austria',
    m: 7,
    d: 8,
    raceClass: '1',
    region: 'Europe',
    stages: 5,
    terrain: 'mountain',
  },
  {
    id: 'race-torres-vedras',
    name: 'Race Torres Vedras',
    m: 7,
    d: 10,
    raceClass: '2',
    region: 'Europe',
    stages: 3,
    terrain: 'hilly',
  },
  {
    id: 'race-ordizia',
    name: 'Race Ordizia',
    m: 7,
    d: 25,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-castilla-leon',
    name: 'Race Castilla y León',
    m: 7,
    d: 26,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-ain',
    name: 'Race Ain',
    m: 7,
    d: 28,
    raceClass: '1',
    region: 'Europe',
    stages: 3,
    terrain: 'mountain',
  },
  {
    id: 'race-alsace',
    name: 'Race Alsace',
    m: 7,
    d: 29,
    raceClass: '2',
    region: 'Europe',
    stages: 5,
    terrain: 'mountain',
  },
  {
    id: 'race-kreiz-breizh',
    name: 'Race Kreiz Breizh',
    m: 7,
    d: 31,
    raceClass: '2',
    region: 'Europe',
    stages: 4,
    terrain: 'hilly',
  },
  {
    id: 'race-getxo',
    name: 'Race Getxo',
    m: 8,
    d: 2,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-maras',
    name: 'Race Maraş',
    m: 8,
    d: 4,
    raceClass: '2',
    region: 'Europe',
    stages: 4,
    terrain: 'hilly',
  },
  {
    id: 'race-portugal',
    name: 'Race Portugal',
    m: 8,
    d: 5,
    raceClass: '1',
    region: 'Europe',
    stages: 10,
    terrain: 'mountain',
  },
  {
    id: 'race-szekler',
    name: 'Race Szeklerland',
    m: 8,
    d: 6,
    raceClass: '2',
    region: 'Europe',
    stages: 3,
    terrain: 'hilly',
  },
  {
    id: 'race-polynormande',
    name: 'Race Polynormande',
    m: 8,
    d: 16,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-limousin',
    name: 'Race Limousin',
    m: 8,
    d: 18,
    raceClass: '1',
    region: 'Europe',
    stages: 4,
    terrain: 'hilly',
  },
  {
    id: 'race-west-bohemia',
    name: 'Race West Bohemia',
    m: 8,
    d: 20,
    raceClass: '2',
    region: 'Europe',
    stages: 4,
    terrain: 'hilly',
  },
  {
    id: 'race-baltic',
    name: 'Race Baltic',
    m: 8,
    d: 21,
    raceClass: '2',
    region: 'Europe',
    stages: 3,
    terrain: 'flat',
  },
  {
    id: 'race-aquitaine',
    name: 'Race Aquitaine',
    m: 8,
    d: 25,
    raceClass: '1',
    region: 'Europe',
    stages: 4,
    terrain: 'flat',
  },
  {
    id: 'race-samsun',
    name: 'Race Samsun',
    m: 8,
    d: 27,
    raceClass: '2',
    region: 'Europe',
    stages: 4,
    terrain: 'hilly',
  },
  {
    id: 'race-bulgaria',
    name: 'Race Bulgaria',
    m: 8,
    d: 29,
    raceClass: '2',
    region: 'Europe',
    stages: 6,
    terrain: 'hilly',
  },
  {
    id: 'race-kranj',
    name: 'Race Kranj',
    m: 8,
    d: 30,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-plouay',
    name: 'Race Plouay',
    m: 8,
    d: 30,
    raceClass: '2',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-halle',
    name: 'Race Halle',
    m: 8,
    d: 30,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-achterhoek',
    name: 'Race Achterhoek',
    m: 8,
    d: 30,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-zlm',
    name: 'Race ZLM',
    m: 9,
    d: 2,
    raceClass: '1',
    region: 'Europe',
    stages: 5,
    terrain: 'flat',
  },
  {
    id: 'race-istanbul',
    name: 'Race Istanbul',
    m: 9,
    d: 3,
    raceClass: '1',
    region: 'Europe',
    stages: 4,
    terrain: 'hilly',
  },
  {
    id: 'race-friuli',
    name: 'Race Friuli',
    m: 9,
    d: 3,
    raceClass: '2',
    region: 'Europe',
    stages: 4,
    terrain: 'hilly',
  },
  {
    id: 'race-south-bohemia',
    name: 'Race South Bohemia',
    m: 9,
    d: 3,
    raceClass: '2',
    region: 'Europe',
    stages: 4,
    terrain: 'hilly',
  },
  {
    id: 'race-sauerland',
    name: 'Race Sauerland',
    m: 9,
    d: 3,
    raceClass: '2',
    region: 'Europe',
    stages: 4,
    terrain: 'hilly',
  },
  {
    id: 'race-kosovo',
    name: 'Race Kosovo',
    m: 9,
    d: 3,
    raceClass: '2',
    region: 'Europe',
    stages: 4,
    terrain: 'hilly',
  },
  {
    id: 'race-somme',
    name: 'Race Somme',
    m: 9,
    d: 6,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-toscana',
    name: 'Race Toscana',
    m: 9,
    d: 9,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-romania',
    name: 'Race Romania',
    m: 9,
    d: 9,
    raceClass: '2',
    region: 'Europe',
    stages: 5,
    terrain: 'hilly',
  },
  {
    id: 'race-pantani',
    name: 'Race Pantani',
    m: 9,
    d: 12,
    raceClass: '1',
    region: 'Europe',
    terrain: 'mountain',
  },
  {
    id: 'race-matteotti',
    name: 'Race Matteotti',
    m: 9,
    d: 13,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-abruzzo',
    name: 'Race Abruzzo',
    m: 9,
    d: 15,
    raceClass: '1',
    region: 'Europe',
    stages: 4,
    terrain: 'mountain',
  },
  {
    id: 'race-slovakia',
    name: 'Race Slovakia',
    m: 9,
    d: 16,
    raceClass: '1',
    region: 'Europe',
    stages: 5,
    terrain: 'hilly',
  },
  {
    id: 'race-serbie',
    name: 'Race Serbia',
    m: 9,
    d: 17,
    raceClass: '2',
    region: 'Europe',
    stages: 4,
    terrain: 'hilly',
  },
  {
    id: 'race-vlaanderen',
    name: 'Race Vlaanderen',
    m: 9,
    d: 18,
    raceClass: '1',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-lazio',
    name: 'Race Lazio',
    m: 9,
    d: 19,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-romagna-giro',
    name: 'Race Romagna Classic',
    m: 9,
    d: 20,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-gooik',
    name: 'Race Gooik',
    m: 9,
    d: 20,
    raceClass: '1',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-isbergues',
    name: 'Race Isbergues',
    m: 9,
    d: 20,
    raceClass: '1',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-houtland',
    name: 'Race Houtland',
    m: 9,
    d: 23,
    raceClass: '1',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-mirabelle',
    name: 'Race Mirabelle',
    m: 9,
    d: 25,
    raceClass: '2',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-cerami',
    name: 'Race Cerami',
    m: 9,
    d: 26,
    raceClass: '2',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-chauny',
    name: 'Race Chauny',
    m: 9,
    d: 27,
    raceClass: '1',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-euro-champs',
    name: 'Race Continental Championship',
    m: 10,
    d: 4,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
    km: 210,
  },
  {
    id: 'race-cholet',
    name: 'Race Cholet',
    m: 10,
    d: 3,
    raceClass: '1',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-agostoni',
    name: 'Race Agostoni',
    m: 10,
    d: 4,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-vendee',
    name: 'Race Vendée',
    m: 10,
    d: 4,
    raceClass: '1',
    region: 'Europe',
    terrain: 'flat',
  },
  {
    id: 'race-binche',
    name: 'Race Binche',
    m: 10,
    d: 6,
    raceClass: '1',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-san-daniele',
    name: 'Race San Daniele',
    m: 10,
    d: 6,
    raceClass: '2',
    region: 'Europe',
    terrain: 'hilly',
  },
  {
    id: 'race-oropa',
    name: 'Race Oropa',
    m: 10,
    d: 11,
    raceClass: '1',
    region: 'Europe',
    terrain: 'mountain',
  },
  {
    id: 'race-holland',
    name: 'Race Holland',
    m: 10,
    d: 13,
    raceClass: '1',
    region: 'Europe',
    stages: 6,
    terrain: 'flat',
  },
  {
    id: 'race-chrono',
    name: 'Race Chrono',
    m: 10,
    d: 18,
    raceClass: '1',
    region: 'Europe',
    terrain: 'itt',
    km: 45,
  },
  // Asia
  {
    id: 'race-pune',
    name: 'Race Pune',
    m: 1,
    d: 19,
    raceClass: '2',
    region: 'Asia',
    stages: 5,
    terrain: 'mountain',
  },
  {
    id: 'race-sharjah',
    name: 'Race Sharjah',
    m: 1,
    d: 23,
    raceClass: '2',
    region: 'Asia',
    stages: 5,
    terrain: 'flat',
  },
  {
    id: 'race-taiwan',
    name: 'Race Taiwan',
    m: 3,
    d: 15,
    raceClass: '1',
    region: 'Asia',
    stages: 5,
    terrain: 'hilly',
  },
  {
    id: 'race-thailand',
    name: 'Race Thailand',
    m: 3,
    d: 24,
    raceClass: '1',
    region: 'Asia',
    stages: 6,
    terrain: 'flat',
  },
  {
    id: 'race-kumano',
    name: 'Race Kumano',
    m: 5,
    d: 7,
    raceClass: '2',
    region: 'Asia',
    stages: 4,
    terrain: 'mountain',
  },
  {
    id: 'race-nippon',
    name: 'Race Nippon',
    m: 5,
    d: 24,
    raceClass: '2',
    region: 'Asia',
    stages: 8,
    terrain: 'mountain',
  },
  {
    id: 'race-korea',
    name: 'Race Korea',
    m: 8,
    d: 31,
    raceClass: '1',
    region: 'Asia',
    stages: 5,
    terrain: 'hilly',
  },
  {
    id: 'race-taihu',
    name: 'Race Taihu',
    m: 9,
    d: 12,
    raceClass: '1',
    region: 'Asia',
    stages: 5,
    terrain: 'flat',
  },
  {
    id: 'race-poyang',
    name: 'Race Poyang',
    m: 9,
    d: 20,
    raceClass: '2',
    region: 'Asia',
    stages: 6,
    terrain: 'flat',
  },
  {
    id: 'race-kyushu',
    name: 'Race Kyushu',
    m: 10,
    d: 10,
    raceClass: '1',
    region: 'Asia',
    stages: 3,
    terrain: 'hilly',
  },
  // África
  {
    id: 'race-rwanda',
    name: 'Race Rwanda',
    m: 2,
    d: 22,
    raceClass: '1',
    region: 'Africa',
    stages: 8,
    terrain: 'mountain',
  },
  {
    id: 'race-algeria',
    name: 'Race Algeria',
    m: 4,
    d: 17,
    raceClass: '2',
    region: 'Africa',
    stages: 6,
    terrain: 'hilly',
  },
  {
    id: 'race-benin',
    name: 'Race Benin',
    m: 4,
    d: 27,
    raceClass: '2',
    region: 'Africa',
    stages: 5,
    terrain: 'flat',
  },
  {
    id: 'race-mauritius',
    name: 'Race Mauritius',
    m: 6,
    d: 2,
    raceClass: '2',
    region: 'Africa',
    stages: 4,
    terrain: 'hilly',
  },
  {
    id: 'race-cameroon',
    name: 'Race Cameroon',
    m: 6,
    d: 3,
    raceClass: '2',
    region: 'Africa',
    stages: 8,
    terrain: 'hilly',
  },
  {
    id: 'race-morocco',
    name: 'Race Morocco',
    m: 9,
    d: 11,
    raceClass: '2',
    region: 'Africa',
    stages: 8,
    terrain: 'mountain',
  },
  {
    id: 'race-faso',
    name: 'Race Faso',
    m: 10,
    d: 30,
    raceClass: '2',
    region: 'Africa',
    stages: 5,
    terrain: 'flat',
  },
  // América
  {
    id: 'race-tachira',
    name: 'Race Táchira',
    m: 1,
    d: 9,
    raceClass: '2',
    region: 'America',
    stages: 9,
    terrain: 'mountain',
  },
  {
    id: 'race-colombia',
    name: 'Race Colombia',
    m: 2,
    d: 3,
    raceClass: '1',
    region: 'America',
    stages: 6,
    terrain: 'mountain',
  },
  {
    id: 'race-gila',
    name: 'Race Gila',
    m: 4,
    d: 29,
    raceClass: '2',
    region: 'America',
    stages: 5,
    terrain: 'mountain',
  },
  {
    id: 'race-guatemala',
    name: 'Race Guatemala',
    m: 4,
    d: 29,
    raceClass: '2',
    region: 'America',
    stages: 5,
    terrain: 'mountain',
  },
  {
    id: 'race-beauce',
    name: 'Race Beauce',
    m: 6,
    d: 10,
    raceClass: '2',
    region: 'America',
    stages: 5,
    terrain: 'hilly',
  },
  {
    id: 'race-venezuela',
    name: 'Race Venezuela',
    m: 7,
    d: 12,
    raceClass: '2',
    region: 'America',
    stages: 8,
    terrain: 'mountain',
  },
  {
    id: 'race-colombia-tour',
    name: 'Race Colombia Tour',
    m: 8,
    d: 8,
    raceClass: '2',
    region: 'America',
    stages: 9,
    terrain: 'mountain',
  },
  {
    id: 'race-philadelphia',
    name: 'Race Philadelphia',
    m: 8,
    d: 30,
    raceClass: '1',
    region: 'America',
    terrain: 'hilly',
  },
  {
    id: 'race-ecuador',
    name: 'Race Ecuador',
    m: 9,
    d: 7,
    raceClass: '2',
    region: 'America',
    stages: 6,
    terrain: 'mountain',
  },
  // Oceanía
  {
    id: 'race-victoria',
    name: 'Race Victoria',
    m: 2,
    d: 4,
    raceClass: '1',
    region: 'Oceania',
    stages: 5,
    terrain: 'hilly',
  },
]

/**
 * Las filas de las tres tablas de carreras de equipos, en su orden (WT, Pro, continentales), SIN los
 * nacionales, que no tienen fila. La leen los tests de la gramática (`grammar/skeletons.test.ts`,
 * docs/generador.md §5.9 y §15.6: «para toda fila del calendario y las cinco clases, `candidatos` no
 * devuelve vacío»). Se escribe aquí, donde las tres tablas ya están inicializadas.
 */
export const RACE_ROWS: readonly RaceRow[] = [...WT_TABLE, ...PRO_TABLE, ...CON_TABLE]

/**
 * Las tres tablas por separado, para el generador viejo de `sim/legacy/profileGenLegacy.ts`, que
 * reconstruye el calendario de la v86 en el orden de entonces (§3.11 y §15.10). No cambia nada de lo
 * que el calendario construye.
 */
export const RACE_TABLES: { WT_TABLE: RaceRow[]; PRO_TABLE: RaceRow[]; CON_TABLE: RaceRow[] } = {
  WT_TABLE,
  PRO_TABLE,
  CON_TABLE,
}

// ===================================================================================================
// LA TEMPORADA (docs/generador.md §3.8, §10.5, §14.5 y §15.10).
//
// Las tres ramas de `buildRace` (edición real, rasgos reales, generado) llaman a la gramática. Desde la
// v87 es el ÚNICO calendario: `calendarForSeason(s, cfg)` lo construye por temporada y
// `SEASON_CALENDAR` es la temporada `BASE_SEASON`, la misma referencia.
// ===================================================================================================

/** Una temporada y la configuración de edición con que se construye. */
interface Temporada {
  season: number
  cfg: EdicionCfg
}

/** `edicion` solo viaja si la configuración no es `ARCH.edicion` (§10.5): se esparce en cada `StageRequest`. */
const edicionDe = (t: Temporada): { edicion?: EdicionCfg } =>
  t.cfg === ARCH.edicion ? {} : { edicion: t.cfg }

/** El `StageSpec` de una etapa generada: `timeTrial` solo cuando es `true`, como en lo real. */
const specDe = (g: GeneratedStage): StageSpec => ({
  kind: g.kind,
  label: g.label,
  profile: g.profile,
  ...(g.timeTrial ? { timeTrial: true } : {}),
  routeSource: g.routeSource,
  arch: g.arch,
})

/** Nombra y numera una etapa de vuelta como `stagesFrom`. */
const etapaDe = (spec: StageSpec, i: number): CalendarStage => ({
  ...spec,
  index: i + 1,
  name: `Stage ${i + 1} · ${spec.label}`,
})

/**
 * Las etapas `real` no dependen de la temporada ni de la configuración (una edición real es un año
 * concreto, sección 11): se construyen una vez por proceso y se comparten por REFERENCIA entre
 * temporadas (§14.5 punto 1), así que una temporada adicional solo dibuja lo generado y la edición.
 */
const REALES = new Map<string, CalendarStage>()
function etapaReal(clave: string, construir: () => CalendarStage): CalendarStage {
  const hecha = REALES.get(clave)
  if (hecha) return hecha
  const nueva = construir()
  REALES.set(clave, nueva)
  return nueva
}

/**
 * Etapas de una edición real (sección 11 §11.1): el terreno y la distancia de cada etapa vienen de la
 * edición verificada. Con rasgos en `STAGE_FEATURES`, `featureSpec` con la semilla
 * `${from}|${to}|${km}` (`routeSource: 'real'`, sin `arch`); sin rasgos, `generateStage` con el km de
 * la edición como contrato, el papel y los candidatos de `POR_TERRENO_EDICION`, la zona de la etapa
 * (`regionOf`) y la semilla de edición separada por carrera (`editionKey`, decisión 22), con
 * `routeSource: 'edicion'`.
 */
function stagesFromEdition(
  id: string,
  edition: RaceEdition,
  country: string | null,
  raceClass: RaceClass,
  format: RaceFormat,
  t: Temporada,
): CalendarStage[] {
  const features = STAGE_FEATURES[id]
  const peticion = (i: number): StageRequest => {
    const s = edition.stages[i]!
    return {
      raceId: id,
      stageIndex: i + 1,
      season: t.season,
      km: s.km,
      role: POR_TERRENO_EDICION[s.terrain].papel,
      terrain: s.terrain,
      geo: ZONAS[regionOf(id, i + 1, country)],
      raceClass,
      format,
      routeSource: 'edicion',
      editionKey: `${s.from}|${s.to}|${s.km}`,
      ...edicionDe(t),
    }
  }
  const stages = edition.stages.map((s, i) => {
    const f = features?.[i]
    if (f)
      return etapaReal(`${id}|${i + 1}`, () =>
        etapaDe(featureSpec(s.terrain, s.km, f, `${s.from}|${s.to}|${s.km}`), i),
      )
    return etapaDe(specDe(generateStage(peticion(i))), i)
  })
  return conFinalesVariados(stages, peticion)
}

/** Las reinas que no acaban en alto, en el orden en que se prueban para la de `conFinalesVariados`. */
const REINAS_SIN_ALTO: readonly SkeletonId[] = ['et_reina_cima_cerca', 'et_reina_valle']

/**
 * UNA VUELTA DE EDICIÓN NO TIENE TODAS SUS REINAS EN ALTO (v87, banda `variedad.finalesPorVuelta`
 * del censo, §13.3: «vueltas con ≥ 3 reinas y todas `alto`: 0»; mapa 04 §5.2). Las etapas `edicion`
 * eligen esqueleto una a una, sin saber de las otras, y tres reinas seguidas en alto salían en
 * `race-burgos`, `race-portugal` y `race-langkawi`. Las vueltas compuestas no lo necesitan (sus reinas
 * las reparte `itinerarioDe`). Si una vuelta de edición tiene tres o más reinas generadas y todas
 * acaban en alto, la ÚLTIMA se dibuja con la primera de `REINAS_SIN_ALTO` que cabe en su zona y su km
 * (`cabe`), con la misma petición y el esqueleto fijado: sin dados nuevos, y lo real no se toca.
 */
function conFinalesVariados(
  stages: CalendarStage[],
  peticion: (i: number) => StageRequest,
): CalendarStage[] {
  const reinas = stages.filter((s) => s.routeSource === 'edicion' && s.kind === 'reina')
  if (reinas.length < 3 || reinas.some((s) => s.arch?.finalKind !== 'alto')) return stages
  const i = reinas.at(-1)!.index - 1
  const req = peticion(i)
  const id = REINAS_SIN_ALTO.find(
    (sk) => cabe(sk, req) && req.km >= SKELETONS[sk].km[0] && req.km <= SKELETONS[sk].km[1],
  )
  if (id === undefined) return stages
  const out = [...stages]
  out[i] = etapaDe(specDe(generateStage({ ...req, fixed: { skeleton: id } })), i)
  return out
}

/**
 * Gran vuelta reconstruida a su edición REAL (Tour, Giro y Vuelta 2026): las etapas de la edición,
 * clase WT, formato de gran vuelta y los días de descanso reales (el Giro lleva tres por la salida
 * desde Bulgaria). El "de dónde a dónde" de cada etapa sale de la misma edición (ver raceRoutes).
 */
function editionGrandTour(
  id: string,
  name: string,
  startDay: number,
  country: string,
  t: Temporada,
): CalendarRace {
  const edition = RACE_EDITIONS[id]
  if (!edition) throw new Error(`Falta la edición real de ${id}`)
  const stages = stagesFromEdition(id, edition, country, 'WT', 'gran-vuelta', t)
  return {
    id,
    name,
    level: 'WT',
    raceClass: 'WT',
    format: 'gran-vuelta',
    startDay,
    openTo: enrollmentFor('WT'),
    country,
    stages,
    routeSource: raceRouteSourceOf(stages),
    restAfter: edition.restAfter,
  }
}

/**
 * Construye una carrera del calendario desde su fila de datos, con las tres ramas en su orden (edición
 * real > rasgos reales > generado, sección 11 §11.1). (1) Con edición, `stagesFromEdition`. (2) Un
 * día: con rasgos, `featureSpec` (km `row.km ?? 210`, `real`); sin rasgos, `generateStage` con
 * `role: 'un_dia'` y el km de la fila o, si no lo tiene, el de `kmDe` en `firma|${id}|km` (decisión
 * 36). (3) Vuelta: `composeTour` con el país y la clase de la fila. La carrera lleva
 * `routeSource: raceRouteSourceOf(stages)`.
 */
function buildRace(row: RaceRow, season: number, cfg: EdicionCfg): CalendarRace {
  const t: Temporada = { season, cfg }
  const startDay = doy(row.m, row.d)
  const level: RaceLevel = row.raceClass === 'WT' ? 'WT' : row.raceClass === 'Pro' ? 'PRS' : 'CON'
  const country = row.country ?? RACE_COUNTRY[row.id]
  const common = {
    id: row.id,
    name: row.name,
    level,
    raceClass: row.raceClass,
    startDay,
    openTo: enrollmentFor(level),
    ...(row.region ? { region: row.region } : {}),
    ...(country ? { country } : {}),
  }
  // Carrera por etapas reconstruida a su edición real (p.ej. la Volta a Portugal, con su día de
  // descanso): el km y los descansos salen de la edición verificada, no de la composición.
  const edition = RACE_EDITIONS[row.id]
  if (edition) {
    const stages = stagesFromEdition(
      row.id,
      edition,
      country ?? null,
      row.raceClass,
      'una-semana',
      t,
    )
    return {
      ...common,
      format: 'una-semana',
      stages,
      routeSource: raceRouteSourceOf(stages),
      restAfter: edition.restAfter,
    }
  }
  if (!row.stages || row.stages <= 1) {
    // Una clásica con rasgos reales autorizados (puertos y cotas de verdad) usa su altimetría fiel;
    // el resto lo dibuja la gramática. Sigue siendo una prueba de un día.
    const terrain = row.terrain ?? 'flat'
    const f = STAGE_FEATURES[row.id]?.[0]
    let stage: CalendarStage
    if (f)
      stage = etapaReal(`${row.id}|1`, () => ({
        ...featureSpec(terrain, row.km ?? 210, f, row.id),
        index: 1,
        name: row.name,
      }))
    else {
      const km = row.km ?? kmDe('un_dia', row.raceClass, 1, false, routeRng(`firma|${row.id}|km`))
      const g = generateStage({
        raceId: row.id,
        stageIndex: 1,
        season,
        km,
        role: 'un_dia',
        terrain,
        geo: ZONAS[regionOf(row.id, 1, country ?? null)],
        raceClass: row.raceClass,
        format: 'un-dia',
        routeSource: 'generado',
        ...edicionDe(t),
      })
      stage = { ...specDe(g), index: 1, name: row.name }
    }
    const stages = [stage]
    return { ...common, format: 'un-dia', stages, routeSource: raceRouteSourceOf(stages) }
  }
  const stages = composeTour(row.id, row.stages, row.terrain ?? 'flat', {
    raceId: row.id,
    country: country ?? null,
    raceClass: row.raceClass,
    format: 'una-semana',
    season,
    ...edicionDe(t),
  }).map(etapaDe)
  return {
    ...common,
    format: 'una-semana',
    stages,
    routeSource: raceRouteSourceOf(stages),
  }
}

/**
 * Campeonatos nacionales de un país: hasta 4 pruebas (Elite y Sub-23, en Crono y en Ruta) durante la
 * semana del campeonato. Cada una es de un día con pelotón individual del país (lo arma la capa de
 * datos con los mejores; el Sub-23 filtra por edad).
 *
 * Como en la realidad, la semana del campeonato reparte las CRONOS entre semana y las RUTAS el fin de
 * semana, con hueco entre unas y otras (no cuatro pruebas en cuatro días seguidos). Que el Sub-23
 * comparta día con la Elite o tenga el suyo propio VARÍA por país (las grandes federaciones lo
 * separan; muchas pequeñas lo juntan): la RUTA Elite es el domingo ancla, y según el país las cronos
 * y la ruta Sub-23 caen el mismo día que la Elite o un día antes. Determinista por código de país.
 *
 * El recorrido lo dibuja la gramática (decisión 15): una etapa de `generateStage` en la zona del país
 * (`zonaDe`), clase `NC`, con el km de `kmDe` en `firma|${id}|km` y el papel de km `cri`, `cri_u23`,
 * `un_dia_u23` y `un_dia` en ese orden. El esqueleto (`nc_crono` o `nc_ruta`) lo eligen `candidatos`
 * y el sesgo del terreno (§5.7).
 */
function nationalChampionships(
  code: string,
  name: string,
  season: number,
  cfg: EdicionCfg,
): CalendarRace[] {
  const t: Temporada = { season, cfg }
  const override = NATIONALS_ROAD_OVERRIDE[code]
  const roadDay = override ? doy(override[0], override[1]) : NATIONALS_ROAD_DAY
  // Tres patrones reales de reparto de la semana (por país):
  //  0 → todo doblado: Elite y Sub-23 comparten día por disciplina (crono jueves, ruta domingo) = 2 días.
  //  1 → ruta Sub-23 el sábado; cronos juntas el jueves = 3 días.
  //  2 → todo separado: crono Elite miércoles, crono Sub-23 jueves, ruta Sub-23 sábado, ruta Elite domingo = 4 días.
  const pattern = ncHash(code) % 3
  const eliteIttDay = pattern === 2 ? roadDay - 4 : roadDay - 3 // crono Elite: jueves (miércoles si todo separado)
  const u23IttDay = roadDay - 3 // crono Sub-23: jueves (casi siempre el mismo día que la Elite)
  const u23RoadDay = pattern === 0 ? roadDay : roadDay - 1 // ruta Sub-23: domingo (con Elite) o sábado
  const geo = ZONAS[zonaDe(code)]
  const base = (
    id: string,
    label: string,
    startDay: number,
    category: 'elite' | 'u23',
    rolKm: KmRole,
    ruta: boolean,
  ): CalendarRace => {
    const raceName = `${name} ${label}`
    const g = generateStage({
      raceId: id,
      stageIndex: 1,
      season,
      km: kmDe(rolKm, 'NC', 1, false, routeRng(`firma|${id}|km`)),
      role: 'un_dia',
      terrain: ruta ? 'classic' : 'itt',
      geo,
      raceClass: 'NC',
      format: 'un-dia',
      routeSource: 'generado',
      ...edicionDe(t),
    })
    const stages = [{ ...specDe(g), index: 1, name: raceName }]
    return {
      id,
      name: raceName,
      level: 'CON',
      raceClass: 'NC',
      format: 'un-dia',
      startDay,
      openTo: [],
      championshipCountry: code,
      championshipCategory: category,
      country: code,
      stages,
      routeSource: raceRouteSourceOf(stages),
    }
  }
  const cc = code.toLowerCase()
  return [
    base(`nc-${cc}-itt`, 'ITT Championship', eliteIttDay, 'elite', 'cri', false),
    base(`nc-${cc}-u23-itt`, 'U23 ITT Championship', u23IttDay, 'u23', 'cri_u23', false),
    base(`nc-${cc}-u23-road`, 'U23 Road Championship', u23RoadDay, 'u23', 'un_dia_u23', true),
    base(`nc-${cc}-road`, 'Road Championship', roadDay, 'elite', 'un_dia', true),
  ]
}

/**
 * El calendario entero de una temporada (SPEC 8): WorldTour real con las tres grandes vueltas,
 * ProSeries real, circuitos continentales representativos (estructura 2026, nombres neutros) y los
 * campeonatos nacionales, en ese orden y ordenado por día de arranque con un `sort` estable
 * (invariante que asumen los consumidores).
 */
function construirTemporada(season: number, cfg: EdicionCfg): CalendarRace[] {
  const t: Temporada = { season, cfg }
  const fila = (row: RaceRow): CalendarRace => buildRace(row, season, cfg)
  return [
    ...WT_TABLE.map(fila),
    editionGrandTour('race-italy', 'Race Italy', doy(5, 8), 'IT', t),
    editionGrandTour('race-spain', 'Race Spain', doy(8, 22), 'ES', t),
    editionGrandTour('race-france', 'Race France', doy(7, 4), 'FR', t),
    ...PRO_TABLE.map(fila),
    ...CON_TABLE.map(fila),
    ...COUNTRIES.flatMap((c) => nationalChampionships(c.code, c.name, season, cfg)),
  ].sort((a, b) => a.startDay - b.startDay)
}

/**
 * El memo de temporadas (§14.5): por REFERENCIA de la configuración y por temporada. El mapa de
 * `ARCH.edicion` es el de producción; cualquier otra configuración (un test con `activa: false`) tiene
 * el suyo, así que no hace falta vaciarlo. El índice por id de cada calendario va aparte, en un
 * `WeakMap`, y se libera con él.
 */
const MEMO = new Map<EdicionCfg, Map<number, CalendarRace[]>>()
const INDICE = new WeakMap<CalendarRace[], Map<string, CalendarRace>>()

/**
 * El calendario de la temporada `season` (§3.8 y §10.5), determinista y memoizado: dos llamadas con
 * la misma temporada y la misma configuración devuelven la MISMA referencia. Con `cfg.activa` false,
 * toda temporada es la `BASE_SEASON` de esa configuración (misma referencia, no copia). Cada lectura
 * de una temporada distinta de la 0 la lleva al final del memo, y al pasar de
 * `ARCH.arranque.maxTemporadasEnMemoria` se expulsa la de acceso más antiguo; la 0 nunca se expulsa
 * (§14.5 punto 2). `calendarForSeason(BASE_SEASON)` es `SEASON_CALENDAR`, la misma referencia.
 */
export function calendarForSeason(season: number, cfg: EdicionCfg = ARCH.edicion): CalendarRace[] {
  if (!Number.isInteger(season) || season < BASE_SEASON)
    throw new RangeError(`temporada inválida: ${season}`)
  if (!cfg.activa && season !== BASE_SEASON) return calendarForSeason(BASE_SEASON, cfg)
  let memo = MEMO.get(cfg)
  if (!memo) {
    memo = new Map()
    MEMO.set(cfg, memo)
  }
  const hecho = memo.get(season)
  if (hecho) {
    if (season !== BASE_SEASON) {
      memo.delete(season) // LRU: la lectura la lleva al final
      memo.set(season, hecho)
    }
    return hecho
  }
  const cal = construirTemporada(season, cfg)
  memo.set(season, cal)
  const otras = [...memo.keys()].filter((s) => s !== BASE_SEASON)
  if (otras.length > ARCH.arranque.maxTemporadasEnMemoria) memo.delete(otras[0]!)
  return cal
}

/** La carrera `raceId` de la temporada `season`, por un índice por id; lanza si no existe (un error de datos, no un caso). */
export function raceForSeason(
  raceId: string,
  season: number,
  cfg: EdicionCfg = ARCH.edicion,
): CalendarRace {
  const cal = calendarForSeason(season, cfg)
  let indice = INDICE.get(cal)
  if (!indice) {
    indice = new Map(cal.map((r) => [r.id, r]))
    INDICE.set(cal, indice)
  }
  const race = indice.get(raceId)
  if (!race) throw new Error(`carrera desconocida: ${raceId}`)
  return race
}

/** Las etapas de `raceId` en la temporada `season`: `raceForSeason(raceId, season, cfg).stages`, por referencia. */
export function stagesForSeason(
  raceId: string,
  season: number,
  cfg: EdicionCfg = ARCH.edicion,
): CalendarStage[] {
  return raceForSeason(raceId, season, cfg).stages
}

/**
 * Calendario completo de la temporada `BASE_SEASON` (SPEC 8), ordenado por día de arranque: la
 * entrada del memo que se paga al cargar el módulo (§14.5) y la que corre todo mundo que no pide otra
 * temporada. Va al final del fichero porque `calendarForSeason` lee el memo y las tablas de arriba.
 */
export const SEASON_CALENDAR: CalendarRace[] = calendarForSeason(BASE_SEASON)
