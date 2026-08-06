/**
 * Traducción del vocabulario de dominio (interno, en español) a la UI (en inglés).
 *
 * ÚNICO lugar donde vive este diccionario. Antes estaba duplicado y divergente en varios clientes
 * de api/ (roles en `lastRace` y `market` con claves distintas, mentalidades en `lastRace` y en la
 * página de órdenes, tipos de apunte en `finances` y en `rankings`), con el riesgo de que una
 * página tradujera y otra mostrara la clave interna en crudo.
 */

import type { Effort, Mentality, RaceClass, RaceFormat, StageRole } from '@cyclingstar/shared'

/**
 * Roles: cubre tanto los del CONTRATO (líder, colíder, gregario, libre) como los de la ORDEN de
 * etapa (sprinter, lanzador, cazaetapas, marcador). Antes el mercado no traducía estos últimos.
 */
const ROLE_LABEL: Record<string, string> = {
  lider: 'Leader',
  colider: 'Co-leader',
  gregario: 'Domestique',
  libre: 'Free role',
  lanzador: 'Lead-out',
  sprinter: 'Sprinter',
  cazaetapas: 'Break hunter',
  marcador: 'Marker',
}

/** Nombre visible de un rol; si es desconocido se muestra tal cual (nunca se oculta el dato). */
export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role
}

/** Etiqueta de la mentalidad como opción de formulario (capitalizada). */
export const MENTALITY_LABEL: Record<Mentality, string> = {
  reservon: 'Conservative',
  oportunista: 'Opportunist',
  combativo: 'Aggressive',
  supercombativo: 'Super-aggressive',
}

/** Misma mentalidad dentro de una frase ("you rode conservative…"): en minúscula. */
const MENTALITY_INLINE: Record<string, string> = {
  reservon: 'conservative',
  oportunista: 'opportunistic',
  combativo: 'aggressive',
  supercombativo: 'all-out aggressive',
}

export function mentalityLabel(mentality: string): string {
  return MENTALITY_INLINE[mentality] ?? mentality
}

/** Qué hace cada mentalidad (ayuda de la consola de órdenes). */
export const MENTALITY_DESC: Record<Mentality, string> = {
  reservon: 'Conservative — saves energy and only reacts.',
  oportunista: 'Opportunist — takes a good chance when it appears.',
  combativo: 'Aggressive — attacks and forces the race.',
  supercombativo: 'Super-aggressive — attacks early and often (burns through energy).',
}

/** Orden en el que se ofrecen las mentalidades en la consola de órdenes. */
export const MENTALITY_OPTIONS: Mentality[] = [
  'reservon',
  'oportunista',
  'combativo',
  'supercombativo',
]

/** Orden en el que se ofrecen los roles de etapa (el rol libre primero, es el valor por defecto). */
export const STAGE_ROLE_OPTIONS: StageRole[] = [
  'libre',
  'lider',
  'sprinter',
  'lanzador',
  'gregario',
  'cazaetapas',
  'marcador',
]

/** Etiqueta y descripción de cada rol de etapa (consola de órdenes). */
export const STAGE_ROLE_LABEL: Record<StageRole, string> = {
  libre: 'Free',
  lider: 'Leader',
  sprinter: 'Sprinter',
  lanzador: 'Lead-out',
  gregario: 'Domestique',
  cazaetapas: 'Stage hunter',
  marcador: 'Marker',
}

export const STAGE_ROLE_DESC: Record<StageRole, string> = {
  libre: 'Rides on instinct with no special job — a free role.',
  lider: 'Your protected leader: teammates shelter and pace them, saving them for the finish.',
  sprinter: 'Sits in for the finish and contests a bunch sprint.',
  lanzador: 'Lead-out: delivers a teammate to the sprint at top speed, then swings off.',
  gregario: 'Domestique: works for a teammate — shelters them, sets the pace, fetches bottles.',
  cazaetapas: 'Stage hunter: gets in the breakaway to fight for the stage win.',
  marcador: "Marker: shadows a RIVAL and follows their attacks so they can't get away.",
}

export const EFFORT_OPTIONS: Effort[] = ['ahorrar', 'normal', 'a_tope']

export const EFFORT_LABEL: Record<Effort, string> = {
  ahorrar: 'Save',
  normal: 'Normal',
  a_tope: 'All-in',
}

export const EFFORT_DESC: Record<Effort, string> = {
  ahorrar: 'Save — ride within yourself to keep energy for later.',
  normal: 'Normal — a balanced effort for the day.',
  a_tope: 'All-in — empty the tank today.',
}

/** Tipos de apunte del libro de cuentas del corredor (SPEC 9). */
const LEDGER_KIND_LABEL: Record<string, string> = {
  salario: 'Salary',
  premio: 'Prize',
  staff: 'Staff',
  patrocinador: 'Sponsor',
  viaje: 'Travel',
  vivienda: 'Housing',
  otro: 'Other',
}

export function ledgerKindLabel(kind: string): string {
  return LEDGER_KIND_LABEL[kind] ?? kind
}

/** Tipos de entrada del palmarés. */
const PALMARES_KIND_LABEL: Record<string, string> = {
  gc: 'Overall win',
  stage: 'Stage win',
  kom: 'Mountains classification',
  points: 'Points classification',
}

export function palmaresLabel(kind: string): string {
  return PALMARES_KIND_LABEL[kind] ?? kind
}

/** Icono del tipo de titular del feed de noticias. */
const NEWS_KIND_ICON: Record<string, string> = {
  stage_win: '🏆',
  tt_win: '⏱️',
  breakaway_win: '🚀',
  one_day_win: '🏆',
  one_day_tt_win: '⏱️',
  kom: '⛰️',
  gc_win: '👑',
  contract: '✍️',
  injury: '🚑',
  retirement: '👋',
}

export function newsIcon(kind: string): string {
  return NEWS_KIND_ICON[kind] ?? '📰'
}

/** Clase de la carrera tal como se escribe en el ciclismo real (.WT, .Pro, .1…). */
const RACE_CLASS_LABEL: Record<RaceClass, string> = {
  WT: '.WT',
  Pro: '.Pro',
  '1': '.1',
  '2': '.2',
  NC: '.NC',
}

export function raceClassLabel(cls: RaceClass): string {
  return RACE_CLASS_LABEL[cls] ?? cls
}

const FORMAT_LABEL: Record<RaceFormat, string> = {
  'gran-vuelta': 'Grand tour',
  'una-semana': 'Stage race',
  'un-dia': 'One-day',
}

export function formatLabel(format: RaceFormat): string {
  return FORMAT_LABEL[format]
}
