import {
  ATTRIBUTE_CLASS,
  ATTRIBUTES,
  type Attribute,
  type HealthState,
  SESSION_CATALOG,
  type TrainingChoice,
  sessionTss,
} from '@cyclingstar/shared'
import { applyDailyLoad, illnessProbability, regressMorale } from './banister.js'
import { TRAINING } from './constants.js'
import { uniformInt } from './random.js'

/**
 * Simulación diaria de un corredor (SPEC 5.2, 5.5, 4.3, 4.4). Pura y determinista dado el
 * RNG. Aplica la carga del entrenamiento, las ganancias con la cadena completa de factores
 * hacia el techo personal, los decaimientos, el riesgo de enfermedad, Banister y la moral.
 * El tick la invoca por corredor y por día; también es el terreno de test del Paso 19.
 */

export interface RiderDayState {
  attributes: Record<Attribute, number>
  ctl: number
  atl: number
  morale: number
  health: HealthState
  healthUntilDay: number | null
}

export interface RiderDayContext {
  gameDay: number
  age: number
  ceilings: Record<Attribute, number>
  talent: number
  fragility: number
  peakAge: number
  declineAge: number
  choice: TrainingChoice
  kInst: number
  kStaff: number
  /** Multiplicador por entrenar en grupo con compañeros (1 = solo/sin bonus). */
  kGroup?: number
  /**
   * Atributos que este corredor movió —entrenando o corriendo— en los últimos 7 días. Amortiguan su
   * declive por edad. Opcional: sin él se comporta como antes, mirando solo lo de hoy.
   */
  trainedLast7?: ReadonlySet<Attribute>
  rng: () => number
}

export interface DailyLog {
  tss: number
  ctl: number
  atl: number
  tsb: number
  activity: string
}

export interface RiderDayResult {
  state: RiderDayState
  log: DailyLog
}

const PHYSICAL_ATTRIBUTES: Attribute[] = ATTRIBUTES.filter((attr) => attr !== 'TAC')

function kTalent(talent: number): number {
  return TRAINING.kTalentBase + talent / 100
}

function kIntensity(intensity: TrainingChoice['intensity']): number {
  if (intensity === 'suave') return TRAINING.kIntSuave
  if (intensity === 'fuerte') return TRAINING.kIntFuerte
  return TRAINING.kIntNormal
}

/** Lo que la intensidad le hace al riesgo de romperse. La otra mitad del intercambio. */
function kRiesgo(intensity: TrainingChoice['intensity']): number {
  if (intensity === 'suave') return TRAINING.kRiesgoSuave
  if (intensity === 'fuerte') return TRAINING.kRiesgoFuerte
  return TRAINING.kRiesgoNormal
}

/**
 * LA FRESCURA, EN RAMPA Y NO EN ESCALÓN (docs/entrenamiento.md §4.3). Entre −15 y −35 se pierde
 * ganancia de forma continua, que es lo que permite dosificar: antes, a −29 se rendía como fresco y
 * a −31 se perdía el 75 % de golpe.
 */
export function kReady(tsb: number): number {
  if (tsb >= TRAINING.kReadyTsbFull) return 1
  if (tsb <= TRAINING.kReadyTsbRamp) return TRAINING.kReadyLow
  const t = (tsb - TRAINING.kReadyTsbFull) / (TRAINING.kReadyTsbRamp - TRAINING.kReadyTsbFull)
  return 1 + t * (TRAINING.kReadyRampEnd - 1)
}

/** La sesión que no cabe en la base que uno tiene. */
function kAbsorb(tssHoy: number, ctl: number): number {
  return tssHoy > TRAINING.kAbsorbCtlWeight * ctl + TRAINING.kAbsorbCtlOffset
    ? TRAINING.kAbsorbFactor
    : 1
}

/** Entrenar con el cuerpo a medias rinde a medias. */
function kSalud(health: RiderDayState['health']): number {
  if (health === 'molestias') return TRAINING.kSaludMolestias
  return health === 'sano' ? 1 : 0
}

/**
 * EL RELOJ DE EDAD, AHORA POR CLASE DE ATRIBUTO (docs/entrenamiento.md §4.1).
 *
 * Antes era un solo tramo para todo el corredor, anclado a `peakAge`: el mismo número para el
 * esprint y para el fondo. Eso no podía representar lo que el dueño describió —«un ciclista sí
 * mejora después de los 24, pero mejora en cosas diferentes»— porque el reloj no sabía de qué
 * atributo estaba hablando.
 *
 * `peakAge` deja de entrar en la cuenta y no es un descuido: los tramos son absolutos y el que
 * marca el final es `declineAge`, que es el que de verdad varía de un corredor a otro. `peakAge`
 * sigue usándose en el resto del motor.
 */
export function kAge(attr: Attribute, age: number, declineAge: number): number {
  const t = TRAINING.kAgeByClass[ATTRIBUTE_CLASS[attr]]!
  if (age <= 21) return t.hasta21
  if (age <= 24) return t.hasta24
  if (age <= 27) return t.hasta27
  if (age <= 30) return t.hasta30
  if (age <= declineAge) return t.hastaDeclive
  return t.despues
}

/**
 * EL FRENO AL ACERCARSE AL TECHO, y por qué está exportado.
 *
 * Es el mismo `kDim` que usa el entrenamiento, sin segunda forma. Se saca del fichero porque el
 * banco de mundo necesita PROBARLO en la rama de carrera antes de que nadie lo enchufe ahí: el
 * rediseño de entrenamiento propone meterlo en `raceLearning`, y eso tiene un precio grande —correr
 * enseñaría alrededor de la mitad de puntos brutos—, así que se mide con el brazo del banco antes de
 * comprometer una línea del motor. Reimplementarlo en el banco habría sido más fácil y habría medido
 * otra cosa.
 *
 * No cambia nada: es la misma función en el mismo sitio, con `export` delante.
 */
export function kDim(attr: number, ceiling: number): number {
  if (attr >= ceiling) return 0
  const denom = Math.max(TRAINING.kDimDenomFloor, ceiling - TRAINING.kDimCeilingRef)
  return Math.min(TRAINING.kDimCap, Math.pow((ceiling - attr) / denom, TRAINING.kDimExponent))
}

export function simulateRiderDay(state: RiderDayState, ctx: RiderDayContext): RiderDayResult {
  const tsb = state.ctl - state.atl
  const attributes = { ...state.attributes }
  const trainedToday = new Set<Attribute>()

  // Salud: ¿se recuperó?
  let health = state.health
  let healthUntilDay = state.healthUntilDay
  if (
    (health === 'enfermo' || health === 'lesionado') &&
    healthUntilDay !== null &&
    ctx.gameDay > healthUntilDay
  ) {
    health = 'sano'
    healthUntilDay = null
  }
  let ill = health === 'enfermo' || health === 'lesionado'

  // Riesgo de enfermar si está sano (SPEC 4.3): el sobreentrenamiento duele por aquí.
  if (!ill) {
    // El riesgo lleva ya el precio de la intensidad: apretar el día que estás hundido cuesta más.
    if (ctx.rng() < illnessProbability(ctx.fragility, tsb) * kRiesgo(ctx.choice.intensity)) {
      health = 'enfermo'
      healthUntilDay = ctx.gameDay + uniformInt(ctx.rng, TRAINING.illDaysMin, TRAINING.illDaysMax)
      ill = true
    }
  }

  // Carga y ganancias del día.
  let tss = 0
  let activity = 'enfermo'
  if (!ill) {
    const info = SESSION_CATALOG[ctx.choice.session]
    tss = sessionTss(ctx.choice)
    activity = ctx.choice.session
    const listo = kReady(tsb)
    const absorbe = kAbsorb(tss, state.ctl)
    const salud = kSalud(health)
    const kInt = kIntensity(ctx.choice.intensity)
    const kTal = kTalent(ctx.talent)
    for (const attr of ATTRIBUTES) {
      const gain = info.gains[attr]
      if (gain === undefined) continue
      const ceiling = ctx.ceilings[attr]
      const kGroup = ctx.kGroup ?? 1
      const delta =
        gain *
        kTal *
        kAge(attr, ctx.age, ctx.declineAge) *
        kDim(attributes[attr], ceiling) *
        ctx.kInst *
        ctx.kStaff *
        kGroup *
        listo *
        absorbe *
        salud *
        kInt
      if (delta > 0) {
        attributes[attr] = Math.min(ceiling, attributes[attr] + delta)
        trainedToday.add(attr)
      }
    }
  }

  // Decaimientos (SPEC 5.5).
  const detraining = state.ctl < TRAINING.detrainingCtlThreshold
  const ageDecay =
    ctx.age > ctx.declineAge
      ? TRAINING.ageDecayBase + TRAINING.ageDecaySlope * (ctx.age - ctx.declineAge)
      : 0
  for (const attr of PHYSICAL_ATTRIBUTES) {
    let loss = 0
    if (detraining) loss += TRAINING.detrainingLoss
    if (ageDecay > 0) {
      /**
       * EL DECLIVE TAMBIÉN ES POR CLASE: la punta se va antes que el fondo. Hasta aquí solo DES y
       * PAV tenían trato aparte; ahora un esprínter de 35 pierde su remate más deprisa de lo que
       * pierde su fondo, que es lo que hace que un veterano siga siendo útil en algo.
       */
      let ageLoss = ageDecay * (TRAINING.decayClassFactor[ATTRIBUTE_CLASS[attr]] ?? 1)
      /**
       * …Y LA SEMANA, NO EL DÍA. El SPEC dice «lo que se entrenó esa semana» y esto miraba solo hoy:
       * un veterano que trabaja un atributo tres veces por semana lo veía decaer entero los otros
       * cuatro días. `trainedLast7` lo trae ya calculado —de la bitácora en producción, del registro
       * en memoria en el banco— y cubre tanto lo entrenado como lo aprendido corriendo.
       */
      if (trainedToday.has(attr) || ctx.trainedLast7?.has(attr) === true) {
        ageLoss *= TRAINING.trainedDecayFactor
      }
      loss += ageLoss
    }
    if (loss > 0) attributes[attr] = Math.max(1, attributes[attr] - loss)
  }

  // Banister: la recuperación (REC) acorta la constante de tiempo de la fatiga.
  const load = applyDailyLoad({ ctl: state.ctl, atl: state.atl }, tss, attributes.REC)
  const morale = regressMorale(state.morale)

  return {
    state: { attributes, ctl: load.ctl, atl: load.atl, morale, health, healthUntilDay },
    log: { tss, ctl: load.ctl, atl: load.atl, tsb: load.tsb, activity },
  }
}
