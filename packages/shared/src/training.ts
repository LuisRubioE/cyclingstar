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

/**
 * EL ENTRENADOR BOT v2: razonable, nunca óptimo, y AHORA CON RAZONES (docs/entrenamiento.md §5.5).
 *
 * El de antes era un ciclo fijo de catorce días que no miraba nada: ni la frescura, ni la salud, ni
 * si había carrera el domingo. Daba igual que el corredor llegara fundido o que el Tour empezara en
 * tres días. «Razonable, nunca óptimo» era una frase, no una conducta: no era óptimo, pero tampoco
 * era razonable.
 *
 * Éste mira el estado del corredor y el calendario, y **dice por qué** hace lo que hace. Lo segundo
 * no es decoración: la pantalla del plan tiene que poder explicarle al jugador que hoy descansa
 * porque lleva tres días pasado de rosca, y sin la razón esa frase habría que reconstruirla fuera,
 * con otra copia de las mismas reglas.
 *
 * Y sigue sin ser óptimo a propósito: afina igual para una .2 que para el Tour, pone siempre el
 * énfasis en la carta, y nunca improvisa. Un jugador que planifique a mano tiene que poder ganarle.
 */
export type CoachBlock = 'recuperacion' | 'afinado' | 'especifico' | 'base' | 'construccion'

export type CoachReason =
  | 'enfermo'
  | 'molestias'
  | 'hundido'
  | 'cargado'
  | 'post_vuelta'
  | 'afinado'
  | 'aperturas'
  | 'especifico'
  | 'construccion'
  | 'base'
  | 'descarga'
  | 'pretemporada'
  | 'guardarrail'

export interface CoachContext {
  gameDay: number
  seasonDay: number
  archetype: RiderArchetype
  tsb: number
  health: 'sano' | 'molestias' | 'enfermo' | 'lesionado'
  strainDays: number
  /** Días hasta la próxima carrera, o `null` si no hay ninguna a la vista. */
  daysToNextRace: number | null
  /** Si esa carrera es objetivo del corredor (la marca el jugador) o del equipo. */
  nextRaceIsGoal: boolean
  nextRaceStages: number
  /** Días hasta el objetivo del EQUIPO. Un equipo bot que declara objetivo afina para él. */
  teamGoalInDays: number | null
  /** Días desde que acabó la última tanda de carreras, y cuánto duró. */
  daysSinceBlockEnd: number | null
  lastBlockDays: number
  /** Cuántas veces ha ido fuerte en los últimos siete días: el guardarraíl de la intensidad. */
  hardLast7: number
  /** Qué hizo ayer: para no repetir `muros` dos días seguidos. */
  yesterday: Session | null
}

/** La carta de cada arquetipo: lo que su entrenador afila cuando toca trabajo específico. */
export const ARCHETYPE_CARD: Record<RiderArchetype, Session> = {
  escalada: 'puertos',
  velocidad: 'sprint',
  puncheur: 'muros',
  clasicas: 'bajada_paves',
  crono: 'crono',
  rodador: 'umbral',
  fondo: 'umbral',
  // El gregario no tiene carta que afilar: lo suyo es aguantar y recuperar.
  gregario: 'fondo',
}

/** Qué bloque toca esta semana. La primera regla que aplica manda. */
export function coachBlock(ctx: CoachContext): { block: CoachBlock; reason: CoachReason } {
  // Volver de una tanda de carreras se hace poco a poco, y esto es lo que el ciclo fijo no sabía.
  if (
    ctx.daysSinceBlockEnd !== null &&
    ((ctx.lastBlockDays >= 5 && ctx.daysSinceBlockEnd <= 7) ||
      (ctx.lastBlockDays >= 3 && ctx.daysSinceBlockEnd <= 3))
  ) {
    return { block: 'recuperacion', reason: 'post_vuelta' }
  }
  // Afinar: para el objetivo del corredor, para el del equipo, o para cualquier carrera por etapas.
  const objetivoCerca =
    (ctx.daysToNextRace !== null &&
      ctx.daysToNextRace <= 7 &&
      (ctx.nextRaceIsGoal || ctx.nextRaceStages >= 3)) ||
    (ctx.teamGoalInDays !== null && ctx.teamGoalInDays <= 7)
  if (objetivoCerca) return { block: 'afinado', reason: 'afinado' }
  if (ctx.daysToNextRace !== null && ctx.daysToNextRace <= 14) {
    return { block: 'especifico', reason: 'especifico' }
  }
  // Sin nada a la vista en seis semanas: eso es pretemporada, y se construye base.
  if (ctx.daysToNextRace === null || ctx.daysToNextRace > 42) {
    return { block: 'base', reason: 'pretemporada' }
  }
  // Y si no, el mesociclo de siempre: dos semanas cargando y una descargando.
  const semana = Math.floor(ctx.seasonDay / 7) % 3
  return semana === 2
    ? { block: 'base', reason: 'descarga' }
    : { block: 'construccion', reason: 'construccion' }
}

/**
 * LA SEMANA DE CADA BLOQUE (docs/entrenamiento.md §5.4).
 *
 * ESTAS TABLAS SE REESCRIBEN EN LA v61 Y HAY QUE DECIR POR QUÉ, porque la historia importa. Las del
 * paso 8 eran una aproximación de las columnas del diseño; éstas son las columnas, con una
 * diferencia MEDIDA y declarada en el afinado (ver su comentario) y otra en el específico.
 *
 * Lo que trae de nuevo, además de cuadrar con §5.4: el énfasis (`E`) puede ser la carta del
 * arquetipo o el agujero que el jugador quiera tapar (D3), la intensidad del bloque es del jugador
 * (D4), la construcción distingue `puertos` de `muros` según a quién le sirva, y el específico
 * incluye `video_tactica`, que es el único sitio del catálogo donde se entrena TAC sin correr.
 *
 * Y una cosa que NO se hizo: creerse la aritmética del documento. Cada bloque se proyectó con
 * `projectLoad` —el mismo Banister del tick— antes de darlo por bueno, y dos de los cinco no hacían
 * lo que su columna prometía.
 */

/** `E`: la sesión de énfasis. El agujero que el jugador pida, o la carta de su arquetipo. */
export function emphasisSession(archetype: RiderArchetype, focus: Attribute | null): Session {
  if (focus === null) return ARCHETYPE_CARD[archetype]
  return sessionsForAttribute(focus)[0] ?? ARCHETYPE_CARD[archetype]
}

/**
 * El puerto largo o la rampa corta, según a quién le sirva: `puertos` para quien vive de subir
 * —escalada, fondo y gregario— y `muros` para el resto.
 */
function puertosOMuros(archetype: RiderArchetype): Session {
  return archetype === 'escalada' || archetype === 'fondo' || archetype === 'gregario'
    ? 'puertos'
    : 'muros'
}

/** Una casilla de la tabla: qué sesión y si ese día va suave pase lo que pase. */
interface Casilla {
  session: Session | 'E' | 'PM'
  /** `true` en los días cuyo propósito ES ir suave: no los sube la intensidad del bloque. */
  siempreSuave?: boolean
  /** `true` en el único día que aprieta de la construcción. */
  siempreFuerte?: boolean
}

const TABLA: Record<CoachBlock, Casilla[]> = {
  // L · M · X · J · V · S · D   (≈ 430 TSS a intensidad normal)
  base: [
    { session: 'fondo' },
    { session: 'descanso_activo' },
    { session: 'fondo' },
    { session: 'E' },
    { session: 'descanso_activo' },
    { session: 'fondo' },
    { session: 'descanso_total' },
  ],
  // ≈ 560 normal, ≈ 680 a fuerte: la única forma de llegar a TSB −35 entrenando (§5.6).
  construccion: [
    { session: 'umbral' },
    { session: 'E' },
    { session: 'descanso_activo' },
    { session: 'PM', siempreFuerte: true },
    { session: 'E' },
    { session: 'fondo' },
    { session: 'descanso_total' },
  ],
  /**
   * Afilar lo que pide el objetivo: tres días de énfasis y el vídeo, que es el único sitio del
   * catálogo donde se entrena la táctica sin correr.
   *
   * El MARTES es `fondo` y en §5.4 era `descanso_activo`, **porque la carta no cuesta lo mismo a
   * todo el mundo**: `puertos` son 115 TSS y `bajada_paves` 70, así que una semana montada sobre
   * tres cartas valía 450 para un escalador y 315 para un clasicómano. Con 315 el bloque de afinado
   * salía MÁS PESADO que el específico que lo precede, o sea un afinado que carga: el orden de los
   * bloques se invertía para dos de los ocho arquetipos. El fondo del martes nivela el suelo y deja
   * los tres bloques en orden para los ocho.
   */
  especifico: [
    { session: 'E' },
    { session: 'fondo' },
    { session: 'E' },
    { session: 'video_tactica' },
    { session: 'E' },
    { session: 'bajada_paves' },
    { session: 'descanso_total' },
  ],
  /**
   * LLEGAR A TSB +5/+15 EL DOMINGO, que es lo ÚNICO que este bloque promete.
   *
   * §5.4 pedía dos cosas a la vez y **no son compatibles con este Banister**: una semana de 215-250
   * TSS y una llegada a +5/+15. Medido con `projectLoad` sobre el régimen de temporada —cuatro
   * semanas de construcción y una de específico detrás—, la semana de 215-250 llega a **+26**, que
   * en `tsbFactor` ya no es afinar: es pasarse de fresco y perder rendimiento. La paradoja es que
   * cuanto MÁS se descarga, más sube el TSB, porque la ATL se va deprisa y la CTL despacio.
   *
   * Gana la llegada, no la cifra de TSS: +5/+15 es lo que el motor LEE el día de la carrera, y la
   * columna de TSS era una estimación hecha a mano. Esta semana vale 370-450 y llega a +12/+15 en
   * los ocho arquetipos. El sábado se queda `suave` —son las aperturas de la víspera— y el bloque
   * sigue siendo claramente más ligero que el específico que lo precede.
   */
  afinado: [
    { session: 'E' },
    { session: 'descanso_activo' },
    { session: 'umbral' },
    { session: 'fondo' },
    { session: 'descanso_activo' },
    { session: 'E', siempreSuave: true },
    { session: 'descanso_total' },
  ],
  // ≈ 200 TSS. Tras una vuelta: REC y fragilidad, que es lo que se repara rodando suave y en el gimnasio.
  recuperacion: [
    { session: 'descanso_total' },
    { session: 'descanso_activo' },
    { session: 'descanso_activo' },
    { session: 'fondo', siempreSuave: true },
    { session: 'descanso_activo' },
    { session: 'gimnasio' },
    { session: 'descanso_total' },
  ],
}

/**
 * Qué sesión toca el día `dayOfWeek` de un bloque.
 *
 * `focus` es el agujero que el jugador quiere tapar (D3) y `intensity` la intensidad que le pone al
 * bloque (D4); con `null` y `'normal'` sale exactamente la semana del entrenador bot.
 */
export function blockWeek(
  block: CoachBlock,
  archetype: RiderArchetype,
  dayOfWeek: number,
  focus: Attribute | null = null,
  intensity: Intensity = 'normal',
): TrainingChoice {
  const d = ((dayOfWeek % 7) + 7) % 7
  const casilla = TABLA[block][d] ?? { session: 'fondo' }
  const session =
    casilla.session === 'E'
      ? emphasisSession(archetype, focus)
      : casilla.session === 'PM'
        ? puertosOMuros(archetype)
        : casilla.session
  // Los días marcados mandan sobre la intensidad del bloque: son los que le dan su forma. Si un
  // `fuerte` pudiera subir el martes suave del afinado, el afinado dejaría de afinar otra vez.
  const elegida: Intensity = casilla.siempreSuave
    ? 'suave'
    : casilla.siempreFuerte
      ? intensity === 'suave'
        ? 'normal'
        : 'fuerte'
      : intensity
  return { session, intensity: elegida }
}

export function coachPlan(ctx: CoachContext): {
  session: Session
  intensity: Intensity
  reason: CoachReason
  detail?: string
} {
  // 1. La salud manda sobre todo lo demás.
  if (ctx.health === 'enfermo' || ctx.health === 'lesionado') {
    return { session: 'descanso_total', intensity: 'normal', reason: 'enfermo' }
  }
  if (ctx.health === 'molestias') {
    return { session: 'descanso_activo', intensity: 'normal', reason: 'molestias' }
  }
  // 2. Un entrenador no le manda series a un corredor fundido. Esto es lo que el ciclo fijo hacía.
  if (ctx.tsb < -40) {
    return { session: 'descanso_total', intensity: 'normal', reason: 'hundido' }
  }
  if (ctx.tsb < -30) {
    return { session: 'descanso_activo', intensity: 'normal', reason: 'cargado' }
  }

  const { block, reason } = coachBlock(ctx)
  const card = ARCHETYPE_CARD[ctx.archetype]

  // 3. Los dos días antes de competir: abrir las piernas y poco más.
  if (block === 'afinado' && ctx.daysToNextRace !== null) {
    if (ctx.daysToNextRace <= 1) {
      return { session: 'descanso_activo', intensity: 'normal', reason: 'aperturas' }
    }
    if (ctx.daysToNextRace === 2) {
      return { session: card, intensity: 'suave', reason: 'afinado' }
    }
  }

  const plan = blockWeek(block, ctx.archetype, ctx.gameDay)

  // 4. Los guardarraíles, que son lo que impide que el plan se vuelva una máquina de romper gente.
  if (ctx.strainDays >= 3 && plan.session !== 'descanso_total') {
    return { session: 'descanso_activo', intensity: 'normal', reason: 'guardarrail' }
  }
  if (plan.intensity === 'fuerte' && ctx.hardLast7 >= 1) {
    return { session: plan.session, intensity: 'normal', reason: 'guardarrail' }
  }
  if (plan.session === 'muros' && ctx.yesterday === 'muros') {
    return { session: 'fondo', intensity: 'normal', reason: 'guardarrail' }
  }
  return { ...plan, reason }
}
