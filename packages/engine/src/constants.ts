/**
 * Hogar único de todas las constantes de juego del motor (CLAUDE.md, SPEC 6).
 * Cada constante se documenta con su intención y todo cambio se anota en docs/balance.md
 * con la razón y la corrida de Montecarlo que lo justifica.
 *
 * Paso 3: solo se fija la convención y la versión del motor. Las constantes del SPEC 6
 * (ley de velocidad, drafting, cerillos, erosión, intensidades...) se poblarán en el Paso 21.
 */

/**
 * Versión del comportamiento del motor. Se incrementa ante CUALQUIER cambio de
 * comportamiento del motor (CLAUDE.md) y entra en la semilla del RNG (SPEC 6.1:
 * seed = sha256(worldSeed, raceId, stageDay, engineVersion)).
 */
export const ENGINE_VERSION = 1 as const

/**
 * Constantes de creación del ciclista (SPEC 3.4 y 3.5). El muestreo es determinista a
 * partir de la semilla del corredor.
 */
export const CREATION = {
  // Valores iniciales por categoría de la vocación (SPEC 3.5).
  primaryMean: 46,
  adjacentMean: 38,
  restMean: 30,
  valueSd: 3,
  // TAC inicia siempre bajo: el oficio se aprende corriendo (SPEC 3.5, 3.6).
  tacInitialMin: 25,
  tacInitialMax: 32,

  // Techos: mu_a = ceilingBase + ceilingBiasWeight * bias. El peso 12 es LA perilla
  // entre fantasía y lotería (SPEC 3.5); su ajuste va a docs/balance.md.
  ceilingBase: 58,
  ceilingBiasWeight: 12,
  ceilingSd: 9,
  ceilingMin: 45,
  ceilingMax: 96,

  // Don global: garantiza que eres ciclista, no que seas de élite en tu vocación (SPEC 3.5).
  globalGift: true,
  giftThreshold: 82,
  giftMin: 82,
  giftMax: 90,

  // Atributos ocultos (SPEC 3.4).
  talentAlpha: 2,
  talentBeta: 4.5,
  fragilitySigma: 0.25,
  fragilityMin: 0.6,
  fragilityMax: 1.8,
  peakAgeMin: 26,
  peakAgeMax: 31,
  declineOffsetMin: 3,
  declineOffsetMax: 6,
} as const
