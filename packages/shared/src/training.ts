import type { Attribute } from './rider.js'

/**
 * Catálogo de sesiones de entrenamiento (SPEC 5.1) y plan por defecto del entrenador.
 * Puro y compartido: la web lo usa en el planificador y el tick para calcular carga y ganancias.
 */

export const INTENSITIES = ['suave', 'normal', 'fuerte'] as const
export type Intensity = (typeof INTENSITIES)[number]

export const INTENSITY_LABELS: Record<Intensity, string> = {
  suave: 'Easy',
  normal: 'Normal',
  fuerte: 'Hard',
}

export const SESSIONS = [
  'descanso_total',
  'descanso_activo',
  'fondo',
  'umbral',
  'puertos',
  'sprint',
  'crono',
  'bajada_paves',
  'gimnasio',
  'video_tactica',
  'viaje',
] as const
export type Session = (typeof SESSIONS)[number]

export interface SessionInfo {
  label: string
  /** Carga TSS por intensidad. En sesiones de intensidad fija los tres valores coinciden. */
  tss: Record<Intensity, number>
  /** Ganancia base G (puntos internos/día) por atributo, intensidad normal (SPEC 5.1). */
  gains: Partial<Record<Attribute, number>>
  /** Si la intensidad (suave/normal/fuerte) altera la carga. */
  variableIntensity: boolean
  /**
   * Si la sesión rinde más entrenada EN GRUPO con compañeros de equipo (rodar a rueda, tirar por
   * turnos, táctica): fondo, umbral, puertos, adoquines/bajada y vídeo. Las específicas (sprint,
   * crono, gimnasio) son trabajo individual y no llevan bonus.
   */
  group?: boolean
}

function fixed(value: number): Record<Intensity, number> {
  return { suave: value, normal: value, fuerte: value }
}

export const SESSION_CATALOG: Record<Session, SessionInfo> = {
  descanso_total: { label: 'Full rest', tss: fixed(0), gains: {}, variableIntensity: false },
  descanso_activo: { label: 'Active rest', tss: fixed(25), gains: {}, variableIntensity: false },
  fondo: {
    label: 'Endurance ride',
    tss: { suave: 70, normal: 90, fuerte: 110 },
    gains: { RES: 0.45, LLA: 0.15 },
    variableIntensity: true,
    group: true,
  },
  umbral: {
    label: 'Threshold',
    tss: { suave: 85, normal: 105, fuerte: 125 },
    gains: { LLA: 0.4, COL: 0.2 },
    variableIntensity: true,
    group: true,
  },
  puertos: {
    label: 'Climbing',
    tss: { suave: 90, normal: 115, fuerte: 140 },
    gains: { MON: 0.45, RES: 0.15 },
    variableIntensity: true,
    group: true,
  },
  sprint: {
    label: 'Sprint intervals',
    tss: { suave: 60, normal: 75, fuerte: 90 },
    gains: { SPR: 0.45, COL: 0.1 },
    variableIntensity: true,
  },
  crono: {
    label: 'Time-trial work',
    tss: { suave: 60, normal: 80, fuerte: 100 },
    gains: { CRI: 0.45 },
    variableIntensity: true,
  },
  bajada_paves: {
    label: 'Descending & cobbles',
    tss: { suave: 55, normal: 70, fuerte: 85 },
    gains: { DES: 0.3, PAV: 0.3 },
    variableIntensity: true,
    group: true,
  },
  gimnasio: { label: 'Gym', tss: fixed(50), gains: { SPR: 0.2 }, variableIntensity: false },
  video_tactica: {
    label: 'Video & tactics',
    tss: fixed(10),
    gains: { TAC: 0.3 },
    variableIntensity: false,
    group: true,
  },
  viaje: { label: 'Travel', tss: fixed(15), gains: {}, variableIntensity: false },
}

export interface TrainingChoice {
  session: Session
  intensity: Intensity
}

/**
 * Plan del entrenador por defecto cuando no hay orden del jugador (SPEC 5.2): razonable,
 * nunca óptimo. Rota una microsemana según el día de juego.
 */
const DEFAULT_WEEK: TrainingChoice[] = [
  { session: 'fondo', intensity: 'normal' },
  { session: 'umbral', intensity: 'normal' },
  { session: 'descanso_activo', intensity: 'normal' },
  { session: 'puertos', intensity: 'normal' },
  { session: 'descanso_activo', intensity: 'normal' },
  { session: 'fondo', intensity: 'fuerte' },
  { session: 'descanso_total', intensity: 'normal' },
]

export function defaultCoachPlan(gameDay: number): TrainingChoice {
  const index = ((gameDay % 7) + 7) % 7
  return DEFAULT_WEEK[index] ?? { session: 'descanso_activo', intensity: 'normal' }
}

/** Carga TSS de una elección de entrenamiento. */
export function sessionTss(choice: TrainingChoice): number {
  return SESSION_CATALOG[choice.session].tss[choice.intensity]
}

/** Sesiones que entrenan un atributo, de mayor a menor ganancia (ayuda del perfil, #8). */
export function sessionsForAttribute(attr: Attribute): Session[] {
  return SESSIONS.filter((s) => (SESSION_CATALOG[s].gains[attr] ?? 0) > 0).sort(
    (a, b) => (SESSION_CATALOG[b].gains[attr] ?? 0) - (SESSION_CATALOG[a].gains[attr] ?? 0),
  )
}

/** Atributos que entrena una sesión, de mayor a menor ganancia (ayuda de entrenamiento, #7). */
export function attributesTrainedBy(session: Session): Attribute[] {
  const gains = SESSION_CATALOG[session].gains
  return (Object.keys(gains) as Attribute[]).sort((a, b) => (gains[b] ?? 0) - (gains[a] ?? 0))
}

/** Bonus de ganancia por cada compañero que entrena la MISMA sesión de grupo el mismo día. */
export const GROUP_TRAINING_BONUS_PER_MATE = 0.03
/** Tope del bonus de entrenamiento en grupo (4+ compañeros). */
export const GROUP_TRAINING_BONUS_CAP = 0.12

/**
 * Multiplicador de ganancia por entrenar en grupo. `mates` = nº de COMPAÑEROS (sin contarse) que
 * hacen la misma sesión de grupo ese día. Solo aplica a sesiones marcadas `group`; el resto = 1.
 */
export function groupTrainingMultiplier(session: Session, mates: number): number {
  if (!SESSION_CATALOG[session].group || mates <= 0) return 1
  return 1 + Math.min(GROUP_TRAINING_BONUS_CAP, GROUP_TRAINING_BONUS_PER_MATE * mates)
}
