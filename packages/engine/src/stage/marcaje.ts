/**
 * Marcaje: la capa 4 de las órdenes (SPEC 6.18). El marcador intenta vivir en la rueda del rival;
 * cuando el objetivo ataca, la respuesta es automática y quema un cerillo. Puro y determinista.
 * Es la capa "recortable" del motor: aquí viven las fórmulas; su integración plena en la carrera
 * llega cuando el balance de marcaje (invariante 6.17) entre en juego.
 */
import { STAGE } from '../constants.js'
import { clamp } from '../random.js'

/**
 * Probabilidad de que el marcador viva en la rueda del objetivo (SPEC 6.18):
 * clamp(0.35 + (TAC_m − TAC_t)/80 − 0.10·marcadores_extra, 0.15, 0.90).
 */
export function wheelProbability(tacMarker: number, tacTarget: number, extraMarkers = 0): number {
  return clamp(
    STAGE.markWheelBase +
      (tacMarker - tacTarget) / STAGE.markWheelTacScale -
      STAGE.markWheelExtraPenalty * extraMarkers,
    STAGE.markWheelMin,
    STAGE.markWheelMax,
  )
}

/**
 * Margen de respuesta cuando el objetivo ataca y el marcador está a rueda (SPEC 6.18):
 * (eff_m + 10) − (eff_t + 10) + 4, con el +4 del rebufo del ataque.
 */
export function markingMargin(effAttrMarker: number, effAttrTarget: number): number {
  return effAttrMarker - effAttrTarget + STAGE.markDraftTolerance
}

export type MarkingOutcome =
  { kind: 'stuck' } | { kind: 'gives'; secondsLost: number } | { kind: 'dropped' }

/**
 * Resuelve la respuesta del marcador a un ataque (SPEC 6.18):
 * margen ≥ 0 → pegado; −6 ≤ margen < 0 → cede 1.2·|margen| s pero mantiene contacto;
 * margen < −6 → se suelta y rueda a su velocidad (el boquete se integra).
 */
export function resolveMarking(margin: number): MarkingOutcome {
  if (margin >= 0) return { kind: 'stuck' }
  if (margin >= STAGE.markDropMargin)
    return { kind: 'gives', secondsLost: STAGE.markGiveScale * -margin }
  return { kind: 'dropped' }
}
