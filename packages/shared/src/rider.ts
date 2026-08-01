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
 * El jugador ve estrellas, jamás el número interno.
 */
export function stars(x: number): number {
  return Math.min(5, Math.max(0.5, Math.round(x / 10) / 2))
}
