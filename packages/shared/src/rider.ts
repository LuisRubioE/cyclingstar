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
 * Estrellas de un ATRIBUTO (0..5, de media en media). Como en la realidad, no ves el número: un
 * corredor flojo en algo sale casi vacío (0), un especialista llena las 5 estrellas. Sin suelo 0.5.
 */
export function attrStars(x: number): number {
  return Math.min(5, Math.max(0, Math.round(x / 10) / 2))
}
