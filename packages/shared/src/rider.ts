/**
 * Modelo visible del ciclista (SPEC 3): atributos, vocaciones, géneros y el mapeo a
 * estrellas. Puro y compartido; el jugador nunca ve el valor interno (SPEC 3.2).
 */

/** Los 10 atributos internos (escala [1,99]); ver SPEC 3.1. */
export const ATTRIBUTES = [
  'RES',
  'REC',
  'LLA',
  'MON',
  'COL',
  'CRI',
  'SPR',
  'DES',
  'PAV',
  'TAC',
] as const
export type Attribute = (typeof ATTRIBUTES)[number]

/**
 * OFICIO CONTRA MOTOR: qué se puede seguir aprendiendo toda la vida y qué no (docs/epics.md «G1»).
 *
 * El dueño, cuando se le enseñó que un NPC de 24 años no podía mejorar jamás: «yo creo que quizás
 * hay que ser menos cartesianos… en la realidad un ciclista sí mejora después de los 24 años, pero
 * mejora en cosas diferentes. Por ejemplo Tactics… eso debería mejorar siempre después de los 24.
 * Otras como contrarreloj suben muy rápido cuando eres joven, menos rápido según creces».
 *
 * Así que los atributos se parten en dos y la edad les afecta distinto:
 *
 * - **motor** — lo que da el cuerpo: RES, REC, LLA, MON, COL, CRI, SPR. Sube rápido de joven, muy
 *   poco entre los 24 y la plenitud, y después ya no sube: se defiende.
 * - **oficio** — lo que da la cabeza y las manos: TAC, DES, PAV. Se aprende corriendo y se sigue
 *   aprendiendo a los 34. Un veterano baja de puerto y pasa el adoquín mejor que un neoprofesional,
 *   y eso no es una concesión: es lo que se ve en la carretera.
 *
 * DES y PAV van en «oficio» y no es una clasificación nueva sacada de la nada: el motor YA los
 * trataba aparte al decaer (`TRAINING.desPavDecayFactor` les baja el declive por edad al 25 %,
 * mientras el resto se lleva el 100 %). Esta constante solo le pone nombre a una decisión que ya
 * estaba tomada y la extiende al otro lado, el de crecer. TAC además no decae nunca: está fuera de
 * los atributos físicos desde siempre.
 *
 * El caso discutible es RES: el fondo se sigue construyendo hasta bien entrados los veinte. Va en
 * «motor» porque al final es cuerpo, y porque su ventana de crecimiento ya es la más larga por la
 * vía normal. Si algún día se quiere mover, se mueve aquí y en un solo sitio.
 */
export const ATTRIBUTE_GROWTH: Record<Attribute, 'motor' | 'oficio'> = {
  RES: 'motor',
  REC: 'motor',
  LLA: 'motor',
  MON: 'motor',
  COL: 'motor',
  CRI: 'motor',
  SPR: 'motor',
  DES: 'oficio',
  PAV: 'oficio',
  TAC: 'oficio',
}

/** Nombres legibles (en inglés, UI del MVP) de cada atributo. */
export const ATTRIBUTE_LABELS: Record<Attribute, string> = {
  RES: 'Endurance',
  REC: 'Recovery',
  LLA: 'Flat',
  MON: 'Mountain',
  COL: 'Hills',
  CRI: 'Time trial',
  SPR: 'Sprint',
  DES: 'Descending',
  PAV: 'Cobbles',
  TAC: 'Tactics',
}

/** Qué es cada atributo y para qué sirve (ayuda del perfil, #8). */
export const ATTRIBUTE_DESCRIPTIONS: Record<Attribute, string> = {
  RES: 'Stamina over long distances. Keeps you strong deep into a race and resists fading in the finale.',
  REC: 'How fast you shed fatigue between efforts and days. Higher recovery lets you absorb more training and race harder back-to-back.',
  LLA: 'Power on flat roads. Matters for tempo on the flat, holding a wheel, and lead-outs.',
  MON: 'Sustained climbing on long ascents — the key to winning mountain stages and grand tours.',
  COL: 'Punch on short, steep climbs and walls, where accelerations decide the move.',
  CRI: 'Solo effort against the clock: the decisive skill in time trials.',
  SPR: 'Top-end speed for the bunch sprint and the final metres of any finish.',
  DES: 'Handling and nerve on descents — extend a gap downhill or catch back on.',
  PAV: 'Skill and strength over cobbles and rough roads, in the spring classics.',
  TAC: 'Race intelligence: positioning, timing a move, reading the finish. Learned by racing, not just training.',
}

export const VOCATIONS = ['escalada', 'velocidad', 'clasicas', 'crono', 'fondo'] as const
export type Vocation = (typeof VOCATIONS)[number]

export const VOCATION_LABELS: Record<Vocation, string> = {
  escalada: 'Climber',
  velocidad: 'Sprinter',
  clasicas: 'Classics rider',
  crono: 'Time trialist',
  fondo: 'All-rounder',
}

export interface VocationProfile {
  primary: Attribute[]
  adjacent: Attribute[]
}

/** Sesgo de cada vocación sobre valores iniciales y techos (SPEC 3.5). */
export const VOCATION_PROFILES: Record<Vocation, VocationProfile> = {
  escalada: { primary: ['MON', 'RES'], adjacent: ['COL', 'REC'] },
  velocidad: { primary: ['SPR', 'LLA'], adjacent: ['TAC', 'REC'] },
  clasicas: { primary: ['COL', 'PAV'], adjacent: ['LLA', 'DES'] },
  crono: { primary: ['CRI', 'LLA'], adjacent: ['RES', 'REC'] },
  fondo: { primary: ['RES', 'REC'], adjacent: ['MON', 'LLA'] },
}

export const GENDERS = ['M', 'F'] as const
export type Gender = (typeof GENDERS)[number]

/** Estados de salud (SPEC 3.3, 4.3). */
export const HEALTH_STATES = ['sano', 'molestias', 'enfermo', 'lesionado'] as const
export type HealthState = (typeof HEALTH_STATES)[number]

/** Vista pública del ciclista propio (contrato api/web). Valores internos solo para estrellas. */
export interface PublicRider {
  id: string
  name: string
  country: string
  gender: Gender
  archetype: Vocation
  birthSeason: number
  attributes: Record<Attribute, number>
}

/**
 * Mapeo a estrellas de media en media (SPEC 3.2): stars(x) = clamp(round(x/10)/2, 0.5, 5).
 * El jugador ve estrellas, jamás el número interno. Suelo 0.5 (forma, siempre hay algo).
 */
export function stars(x: number): number {
  return Math.min(5, Math.max(0.5, Math.round(x / 10) / 2))
}

/**
 * Estrellas ENTERAS de un atributo (0..5). Como en la realidad no ves el número: un flojo sale
 * vacío, un especialista llena las 5. Bandas: 0-16→0, 17-33→1, 34-50→2, 51-66→3, 67-83→4, 84-100→5.
 */
export function attrStars(x: number): number {
  if (x < 17) return 0
  if (x < 34) return 1
  if (x < 51) return 2
  if (x < 67) return 3
  if (x < 84) return 4
  return 5
}
