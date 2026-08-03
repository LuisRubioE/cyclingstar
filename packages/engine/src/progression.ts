import {
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

function kAge(age: number, peakAge: number, declineAge: number): number {
  if (age <= peakAge - 6) return 1.15
  if (age <= peakAge - 2) return 1.05
  if (age <= peakAge + 1) return 0.95
  if (age <= declineAge) return 0.75
  return 0.4
}

function kDim(attr: number, ceiling: number): number {
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
    if (ctx.rng() < illnessProbability(ctx.fragility, tsb)) {
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
    const kReady = tsb < TRAINING.kReadyTsbThreshold ? TRAINING.kReadyLow : 1
    const kInt = kIntensity(ctx.choice.intensity)
    const kTal = kTalent(ctx.talent)
    const kAg = kAge(ctx.age, ctx.peakAge, ctx.declineAge)
    for (const attr of ATTRIBUTES) {
      const gain = info.gains[attr]
      if (gain === undefined) continue
      const ceiling = ctx.ceilings[attr]
      const kGroup = ctx.kGroup ?? 1
      const delta =
        gain *
        kTal *
        kAg *
        kDim(attributes[attr], ceiling) *
        ctx.kInst *
        ctx.kStaff *
        kGroup *
        kReady *
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
      let ageLoss = ageDecay
      if (attr === 'DES' || attr === 'PAV') ageLoss *= TRAINING.desPavDecayFactor
      if (trainedToday.has(attr)) ageLoss *= TRAINING.trainedDecayFactor
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
