import type { Attribute, HealthState } from './rider.js'

/**
 * LO QUE LA WEB LEE DEL MOTOR, COPIADO Y ATADO POR TEST (E2, paso 10b, los arreglos; docs/retransmision.md
 * §15.5 y §18.5, D-56).
 *
 * `@cyclingstar/engine` no declara `sideEffects`, así que una página de la web que importara de él una
 * sola constante lo cargaba entero, con el calendario que se genera al cargar: medido en el 10b, 354 kB y
 * una tarea de 2,6 s con la CPU a ×4 antes de la primera pintura de `Watch` (umbral, 2 s). La web lee de
 * aquí lo poco que necesita: las dos constantes del diario (`stageJournal.ts`) y la condición del
 * corredor (`condition.ts` y el perfil: las dos barras y los cerillos del día). Son COPIAS, como las de
 * `BROADCAST` (§15.5): el valor de verdad sigue en `packages/engine/src/constants.ts` y en
 * `banister.ts` y `stage/physics.ts`, con su comentario de intención, y `apps/api/src/engineCopies.test.ts`
 * comprueba que cada campo y cada función dan lo mismo que los del motor, al bit. Un cambio en el motor
 * que no se copie aquí rompe ese test, no una carrera. El motor no las lee: no cambian nada de lo que corre.
 */

/** Los campos de `STAGE` que lee la web (el diario y los cerillos). */
export const ENGINE_STAGE = {
  /** el grupo de cabeza deja de ser «un pelotón» y la crónica nombra a los que van delante */
  frontNamesMaxRiders: 8,
  /** el boquete mínimo para contar la ventaja de cabeza en el diario */
  gapReportMinSeconds: 20,
  matchCompMonWeight: 0.5,
  matchCompResWeight: 0.3,
  matchCompLlaWeight: 0.2,
  matchBase: 2,
  matchThresholds: [55, 72, 88],
  matchMin: 1,
  matchTsbPenaltyBase: -25,
  matchTsbPenaltyRecScale: 0.2,
} as const

/** Los campos de `BANISTER` de la forma y de la barra de frescura. */
export const ENGINE_BANISTER = {
  fitnessCap: 95,
  mFormBase: 0.92,
  mFormScale: 0.13,
  freshnessBase: 55,
  freshnessSlope: 1.1,
  freshnessKneeTsb: -20,
} as const

/** Los multiplicadores de salud de `HEALTH` (SPEC 4.2). */
export const ENGINE_HEALTH = { mSano: 1, mMolestias: 0.96, mEnfermo: 0.9 } as const

/** Los de moral de `MORALE` (SPEC 4.2). */
export const ENGINE_MORALE = { mMoralBase: 0.98, mMoralScale: 0.04 } as const

/** Rendimiento efectivo por atributo, como `Eff` de `stage/physics.ts`. */
export type Eff = Record<Attribute, number>

const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x))
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** Rendimiento por frescura relativa (SPEC 4.1), `tsbFactor` de `banister.ts`. */
function tsbFactor(tsb: number): number {
  if (tsb <= -35) return 0
  if (tsb <= -10) return lerp(0, 0.55, (tsb + 35) / 25)
  if (tsb <= 5) return lerp(0.55, 0.95, (tsb + 10) / 15)
  if (tsb <= 18) return 1
  if (tsb <= 35) return lerp(1, 0.65, (tsb - 18) / 17)
  return 0.55
}

/** El fondo en [0, 1] (`fitnessFactor` de `banister.ts`). */
export function fitnessFactor(ctl: number): number {
  return clamp(ctl / ENGINE_BANISTER.fitnessCap, 0, 1)
}

/** La barra de frescura 0..100 (`freshnessBar` de `banister.ts`; SPEC 4.1), con su cola exponencial. */
export function freshnessBar(tsb: number): number {
  const knee = ENGINE_BANISTER.freshnessKneeTsb
  const kneeValue = ENGINE_BANISTER.freshnessBase + ENGINE_BANISTER.freshnessSlope * knee
  if (tsb >= knee)
    return clamp(ENGINE_BANISTER.freshnessBase + ENGINE_BANISTER.freshnessSlope * tsb, 0, 100)
  const decay = kneeValue / ENGINE_BANISTER.freshnessSlope
  return clamp(kneeValue * Math.exp((tsb - knee) / decay), 0, 100)
}

function mForm(ctl: number, tsb: number): number {
  const formIndex = 0.55 * tsbFactor(tsb) + 0.45 * fitnessFactor(ctl)
  return ENGINE_BANISTER.mFormBase + ENGINE_BANISTER.mFormScale * formIndex
}

function mHealth(health: HealthState): number {
  switch (health) {
    case 'sano':
      return ENGINE_HEALTH.mSano
    case 'molestias':
      return ENGINE_HEALTH.mMolestias
    case 'enfermo':
    case 'lesionado':
      return ENGINE_HEALTH.mEnfermo
  }
}

function mMorale(morale: number): number {
  return ENGINE_MORALE.mMoralBase + ENGINE_MORALE.mMoralScale * (morale / 100)
}

/** El rendimiento efectivo de un atributo al tomar la salida (`eff0` de `banister.ts`; SPEC 4.2). */
export function eff0(
  attr: number,
  ctl: number,
  tsb: number,
  health: HealthState,
  morale: number,
): number {
  return attr * mForm(ctl, tsb) * mHealth(health) * mMorale(morale)
}

/** El techo de cerillos (`maxMatchCount` de `stage/physics.ts`): la base más los umbrales. */
export function maxMatchCount(): number {
  return ENGINE_STAGE.matchBase + ENGINE_STAGE.matchThresholds.length
}

/** Los cerillos de la salida (`matchCount` de `stage/physics.ts`; SPEC 6.6), sobre el `eff0` del día. */
export function matchCount(eff: Eff, tsb: number, deepDepleted = false): number {
  const comp =
    ENGINE_STAGE.matchCompMonWeight * Math.max(eff.MON, eff.COL) +
    ENGINE_STAGE.matchCompResWeight * eff.RES +
    ENGINE_STAGE.matchCompLlaWeight * eff.LLA
  let matches: number = ENGINE_STAGE.matchBase
  for (const threshold of ENGINE_STAGE.matchThresholds) if (comp >= threshold) matches += 1
  const penaltyTsb =
    ENGINE_STAGE.matchTsbPenaltyBase - ENGINE_STAGE.matchTsbPenaltyRecScale * (eff.REC - 50)
  if (tsb < penaltyTsb) matches -= 1
  if (deepDepleted) matches -= 1
  return Math.max(ENGINE_STAGE.matchMin, matches)
}
