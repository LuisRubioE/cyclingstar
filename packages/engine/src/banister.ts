import { type HealthState, stars } from '@cyclingstar/shared'
import { BANISTER, HEALTH, MORALE, TANK } from './constants.js'
import { clamp } from './random.js'

/**
 * Modelo de Banister (SPEC 4). Puro: la forma es la consecuencia contable de la carga.
 * CTL (condición, media lenta), ATL (fatiga, media rápida), TSB (balance).
 */

export interface Load {
  ctl: number
  atl: number
}

/** Constante de tiempo de la fatiga según Recuperación (SPEC 4): 5 días si REC=100, 10 si REC=0. */
export function tauFatigue(recovery: number): number {
  return BANISTER.tauFatigueBase + BANISTER.tauFatigueRecScale * (1 - recovery / 100)
}

/**
 * Aplica la carga del día. TSB se calcula ANTES de aplicar la carga de hoy (SPEC 4).
 * Devuelve el nuevo CTL/ATL y el TSB del día.
 */
export function applyDailyLoad(
  prev: Load,
  tss: number,
  recovery: number,
): { ctl: number; atl: number; tsb: number } {
  const tsb = prev.ctl - prev.atl
  const atl = prev.atl + (tss - prev.atl) / tauFatigue(recovery)
  const ctl = prev.ctl + (tss - prev.ctl) / BANISTER.tauFitness
  return { ctl, atl, tsb }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Rendimiento por frescura relativa tsbF(TSB) (SPEC 4.1). */
export function tsbFactor(tsb: number): number {
  if (tsb <= -35) return 0
  if (tsb <= -10) return lerp(0, 0.55, (tsb + 35) / 25)
  if (tsb <= 5) return lerp(0.55, 0.95, (tsb + 10) / 15)
  if (tsb <= 18) return 1
  if (tsb <= 35) return lerp(1, 0.65, (tsb - 18) / 17)
  return 0.55
}

export function fitnessFactor(ctl: number): number {
  return clamp(ctl / BANISTER.fitnessCap, 0, 1)
}

/** Índice de forma en [0,1] (SPEC 4.1). */
export function formIndex(ctl: number, tsb: number): number {
  return 0.55 * tsbFactor(tsb) + 0.45 * fitnessFactor(ctl)
}

/** Multiplicador de rendimiento por forma, en [0.92, 1.05] (SPEC 4.1). */
export function mForm(ctl: number, tsb: number): number {
  return BANISTER.mFormBase + BANISTER.mFormScale * formIndex(ctl, tsb)
}

/** Forma en estrellas (SPEC 4.1). */
export function formStars(ctl: number, tsb: number): number {
  return stars(100 * formIndex(ctl, tsb))
}

/** Barra de frescura 0..100 para la UI (nunca estrellas) (SPEC 4.1). */
export function freshnessBar(tsb: number): number {
  return clamp(BANISTER.freshnessBase + BANISTER.freshnessSlope * tsb, 0, 100)
}

/** Multiplicador de salud (SPEC 4.2). */
export function mHealth(health: HealthState): number {
  switch (health) {
    case 'sano':
      return HEALTH.mSano
    case 'molestias':
      return HEALTH.mMolestias
    case 'enfermo':
    case 'lesionado':
      return HEALTH.mEnfermo
  }
}

/** Multiplicador de moral (SPEC 4.2). */
export function mMorale(morale: number): number {
  return MORALE.mMoralBase + MORALE.mMoralScale * (morale / 100)
}

/** Rendimiento efectivo de un atributo al tomar la salida (SPEC 4.2). */
export function eff0(
  attr: number,
  ctl: number,
  tsb: number,
  health: HealthState,
  morale: number,
): number {
  return attr * mForm(ctl, tsb) * mHealth(health) * mMorale(morale)
}

// --- Depósito inicial E0 (docs/motor.md §VI.1) ---------------------------------------------

/**
 * Multiplicador del depósito por CONDICIÓN (docs/motor.md §VI.1). El fondo acumulado (CTL) da
 * tanque: quien lleva meses de trabajo aguanta más kilómetros duros antes de vaciarse.
 */
export function mTankFitness(ctl: number): number {
  return clamp(TANK.fitnessBase + TANK.fitnessScale * (ctl / 100), TANK.fitnessMin, TANK.fitnessMax)
}

/**
 * Multiplicador del depósito por FRESCURA (docs/motor.md §VI.1). Es la pieza que hace que una gran
 * vuelta se sienta como una gran vuelta: `applyDailyLoad` sube el ATL con el TSS de cada etapa, el
 * TSB baja día tras día y el depósito mengua solo, sin ningún estado paralelo de "fatiga de carrera".
 */
export function mTankFreshness(tsb: number): number {
  return clamp(TANK.freshnessBase + TANK.freshnessSlope * tsb, TANK.freshnessMin, TANK.freshnessMax)
}

/**
 * Depósito de energía E0 con que el corredor toma la salida (docs/motor.md §VI.1):
 * E0 = 100 · clamp( mTankFitness(CTL) · mTankFreshness(TSB) · mHealth(salud), 0.70, 1.08 ).
 * Un corredor fresco y en forma sale con ~105; uno hundido en la tercera semana, con ~72.
 */
export function initialEnergy(ctl: number, tsb: number, health: HealthState): number {
  return (
    TANK.base * clamp(mTankFitness(ctl) * mTankFreshness(tsb) * mHealth(health), TANK.min, TANK.max)
  )
}

/** Probabilidad diaria de enfermar (SPEC 4.3). */
export function illnessProbability(fragility: number, tsb: number): number {
  return (
    HEALTH.illnessBase *
    fragility *
    Math.exp(Math.max(0, -tsb - HEALTH.illnessTsbOffset) / HEALTH.illnessTsbScale)
  )
}

/** Regresión diaria de la moral a la media (SPEC 4.4). */
export function regressMorale(morale: number): number {
  return morale + (MORALE.mean - morale) * MORALE.regression
}
