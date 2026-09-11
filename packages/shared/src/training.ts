import type { Attribute, RiderArchetype } from './rider.js'

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
  'muros',
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
  /**
   * …Y AQUÍ SE ENTRENA LA RECUPERACIÓN (v53). Hasta aquí **ninguna sesión del catálogo tocaba REC**,
   * ni una: no es que el entrenador bot no la programara, es que no existía forma de entrenarla
   * para nadie, tampoco para un jugador planificando a mano. Y REC no es decorado — le acorta la
   * constante de tiempo de la fatiga en Banister (`applyDailyLoad`) y cuenta cerillas
   * (`matchCount`)—, así que era un atributo real congelado de por vida en su valor de nacimiento.
   *
   * Va en el descanso ACTIVO y no en el total porque es donde va en la carretera: la capacidad de
   * recuperar se construye rodando suave, no tumbado. Y por eso el descanso total sigue dando cero:
   * descansar del todo repara, pero no enseña al cuerpo a reparar más rápido.
   */
  descanso_activo: {
    label: 'Active rest',
    tss: fixed(25),
    gains: { REC: 0.25 },
    variableIntensity: false,
  },
  fondo: {
    label: 'Endurance ride',
    tss: { suave: 70, normal: 90, fuerte: 110 },
    gains: { RES: 0.4, LLA: 0.15, REC: 0.1 },
    variableIntensity: true,
    group: true,
  },
  umbral: {
    label: 'Threshold',
    tss: { suave: 85, normal: 105, fuerte: 125 },
    /**
     * MON 0,05 NO ESTABA EN LA TABLA DEL DISEÑO, y hacía falta: su propia regla dice que cada
     * atributo físico tiene que tener al menos DOS sesiones que lo toquen, y con el catálogo tal
     * como venía escrito **MON quedaba con una sola** (`puertos`). Un atributo con un solo camino
     * es un atributo que una mala racha del entrenador deja sin tocar en todo el año, que es
     * justamente lo que la regla existe para impedir.
     *
     * Va en `umbral` y no en otra parte porque el trabajo de umbral construye capacidad de subir, y
     * porque es la única sesión donde cabía sin romper el presupuesto: sale de LLA (0,35 → 0,30),
     * que tiene cuatro caminos, y el total de la sesión se queda en 0,60.
     */
    gains: { LLA: 0.3, CRI: 0.15, COL: 0.1, MON: 0.05 },
    variableIntensity: true,
    group: true,
  },
  puertos: {
    label: 'Climbing',
    tss: { suave: 90, normal: 115, fuerte: 140 },
    gains: { MON: 0.4, RES: 0.15, DES: 0.05 },
    variableIntensity: true,
    group: true,
  },
  /**
   * LOS MUROS, que es la sesión que faltaba (v55). El catálogo tenía `puertos` para el puerto largo
   * y `sprint` para el embalaje, y entre los dos hay un tipo de esfuerzo entero —la rampa corta y
   * brutal de una clásica— que no se podía entrenar: COL solo tenía UN camino (`umbral`, y de
   * refilón) y un puncheur no tenía dónde trabajar lo suyo.
   *
   * Es también la pieza que hace verdad la regla nueva del catálogo: **cada atributo físico tiene
   * al menos dos sesiones que lo tocan**. Con un solo camino, una mala tirada del entrenador dejaba
   * un atributo sin entrenar en todo el año.
   */
  muros: {
    label: 'Punchy climbs',
    tss: { suave: 75, normal: 95, fuerte: 115 },
    gains: { COL: 0.4, SPR: 0.1, PAV: 0.05 },
    variableIntensity: true,
    group: true,
  },
  sprint: {
    label: 'Sprint intervals',
    tss: { suave: 60, normal: 75, fuerte: 90 },
    gains: { SPR: 0.45, COL: 0.1, LLA: 0.05 },
    variableIntensity: true,
  },
  crono: {
    label: 'Time-trial work',
    tss: { suave: 60, normal: 80, fuerte: 100 },
    gains: { CRI: 0.45, LLA: 0.1 },
    variableIntensity: true,
  },
  bajada_paves: {
    label: 'Descending & cobbles',
    tss: { suave: 55, normal: 70, fuerte: 85 },
    gains: { DES: 0.3, PAV: 0.3 },
    variableIntensity: true,
    group: true,
  },
  gimnasio: {
    label: 'Gym',
    tss: fixed(50),
    gains: { SPR: 0.15, COL: 0.1 },
    variableIntensity: false,
  },
  video_tactica: {
    label: 'Video & tactics',
    tss: fixed(10),
    gains: { TAC: 0.2 },
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
 * LA SESIÓN QUE LE TOCA A CADA CUAL (v53). El entrenador bot no puede darle la misma semana a un
 * velocista que a un escalador: es lo que hacía, y el resultado era que un velocista no entrenaba
 * el sprint en toda su carrera.
 */
const VOCATION_SESSION: Record<RiderArchetype, Session> = {
  velocidad: 'sprint',
  crono: 'crono',
  escalada: 'puertos',
  clasicas: 'bajada_paves',
  // El completo no tiene una carta que afilar, así que insiste en lo que sostiene todo lo demás.
  fondo: 'umbral',
  // Los tres nuevos, cada uno con lo suyo: el puncheur afila los muros, el rodador el llano, y el
  // gregario lo que de verdad le da de comer, que es aguantar y recuperar.
  puncheur: 'muros',
  rodador: 'umbral',
  gregario: 'fondo',
}

/**
 * PLAN DEL ENTRENADOR POR DEFECTO cuando no hay orden del jugador (SPEC 5.2): razonable, nunca
 * óptimo. Rota un ciclo de catorce días según el día de juego.
 *
 * HASTA LA v53 ESTO ENTRENABA CUATRO ATRIBUTOS DE DIEZ, y no es una forma de hablar. La microsemana
 * eran siete días con cinco sesiones —fondo, umbral, puertos y los dos descansos— y de las once del
 * catálogo no aparecían nunca `sprint`, `crono`, `bajada_paves`, `gimnasio` ni `video_tactica`.
 * Medido sobre un neoprofesional de 20 años, un año entero con este plan:
 *
 *   RES +8,2   LLA +11,1   MON +3,6   COL +2,2
 *   REC  0,0   CRI   0,0   SPR  0,0   DES  0,0   PAV 0,0   TAC 0,0
 *
 * O sea que un velocista jamás mejoraba su sprint entrenando, y un contrarrelojista jamás su crono.
 * Con la táctica hay un matiz que hay que decir bien: **correr sí la enseña** —`STAGE_XP_ATTRS`, en
 * packages/db, se la da a todo el que termina una etapa— así que el que compite la sube. Lo que no
 * había era forma de trabajarla ENTRENANDO, y eso deja al que no compite sin ella.
 *
 * «Razonable, nunca óptimo» significa que un jugador que planifique bien debe ganarle al bot. No
 * significa que haya atributos que no se puedan mover: eso no es un entrenador mediocre, es un
 * agujero. El ciclo de ahora toca lo que TODO ciclista trabaja, más la carta de su vocación, más el
 * oficio —descenso y adoquín, y vídeo de táctica—, y sigue estando lejos de lo óptimo: reparte por
 * igual sin mirar el calendario, la forma ni el objetivo del mes.
 */
const DEFAULT_CYCLE: readonly (TrainingChoice | 'vocacion')[] = [
  { session: 'fondo', intensity: 'normal' },
  { session: 'umbral', intensity: 'normal' },
  { session: 'descanso_activo', intensity: 'normal' },
  { session: 'puertos', intensity: 'normal' },
  'vocacion',
  { session: 'fondo', intensity: 'fuerte' },
  { session: 'descanso_total', intensity: 'normal' },
  { session: 'fondo', intensity: 'normal' },
  'vocacion',
  { session: 'descanso_activo', intensity: 'normal' },
  { session: 'umbral', intensity: 'normal' },
  { session: 'bajada_paves', intensity: 'normal' },
  { session: 'video_tactica', intensity: 'normal' },
  { session: 'descanso_total', intensity: 'normal' },
]

/**
 * `vocation` es opcional para no romper a quien no la tenga a mano —la web lo usa como respaldo del
 * planificador del jugador—, y sin ella se entrena como un corredor completo.
 */
export function defaultCoachPlan(gameDay: number, vocation?: RiderArchetype): TrainingChoice {
  const n = DEFAULT_CYCLE.length
  const index = ((gameDay % n) + n) % n
  const slot = DEFAULT_CYCLE[index] ?? {
    session: 'descanso_activo' as const,
    intensity: 'normal' as const,
  }
  if (slot === 'vocacion') {
    return { session: VOCATION_SESSION[vocation ?? 'fondo'], intensity: 'normal' }
  }
  return slot
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
