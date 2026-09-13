import {
  ATTRIBUTES,
  type Attribute,
  VOCATION_PROFILES,
  type Vocation,
  seededRng,
} from '@cyclingstar/shared'
import { CREATION } from './constants.js'
import { beta, clamp, logNormal, normal, uniform, uniformInt } from './random.js'

/**
 * Creación del genoma del ciclista (SPEC 3.4 y 3.5). La vocación sesga valores iniciales y
 * techos sin garantizar élite; el don global garantiza que "eres ciclista". Determinista a
 * partir de la semilla del corredor.
 */

export interface RiderHidden {
  talent: number
  fragility: number
  peakAge: number
  declineAge: number
  ceilings: Record<Attribute, number>
}

export interface RiderGenome {
  attributes: Record<Attribute, number>
  hidden: RiderHidden
}

type Category = 'primary' | 'adjacent' | 'rest'

function categoryOf(attr: Attribute, vocation: Vocation): Category {
  const profile = VOCATION_PROFILES[vocation]
  if (profile.primary.includes(attr)) return 'primary'
  if (profile.adjacent.includes(attr)) return 'adjacent'
  return 'rest'
}

export function generateRiderGenome(seed: string, vocation: Vocation): RiderGenome {
  const rng = seededRng(`genome:${seed}`)

  const attributes = {} as Record<Attribute, number>
  const ceilings = {} as Record<Attribute, number>

  for (const attr of ATTRIBUTES) {
    const category = categoryOf(attr, vocation)

    // Techo (SPEC 3.5): mu = base + peso * bias.
    const bias = category === 'primary' ? 1 : category === 'adjacent' ? 0.5 : 0
    const mu = CREATION.ceilingBase + CREATION.ceilingBiasWeight * bias
    const ceiling = clamp(
      normal(rng, mu, CREATION.ceilingSd),
      CREATION.ceilingMin,
      CREATION.ceilingMax,
    )
    ceilings[attr] = ceiling

    /**
     * VALOR INICIAL CON SUELO (SPEC 3.5, docs/entrenamiento.md §3.4).
     *
     * La media sigue saliendo del mismo escalón de `bias` que el techo —carta 1 · segunda 0,5 ·
     * resto 0—, pero ahora con un SUELO: `max(startFloorMu, 15 + 9·bias)`, o sea 24 / 19,5 / 18.
     *
     * El suelo hace falta y no es cosmético: sin él, el «resto» arrancaba en 15, cinco puntos por
     * debajo del «20 es el suelo que sí funciona» con el que la propia v48 justificó su número. Y
     * lo sufría justamente el arquetipo con menos sesgo, o sea el que elige ser todoterreno: no
     * elegía «sin punta», elegía empezar peor que nadie en las diez casillas.
     */
    let value: number
    if (attr === 'TAC') {
      value = uniform(rng, CREATION.tacInitialMin, CREATION.tacInitialMax)
    } else {
      const bias = category === 'primary' ? 1 : category === 'adjacent' ? 0.5 : 0
      const mu = Math.max(CREATION.startFloorMu, CREATION.restMean + 9 * bias)
      value = normal(rng, mu, CREATION.valueSd)
    }
    attributes[attr] = clamp(value, 1, ceiling)
  }

  // Don global: si el mejor techo no llega al umbral, se eleva el argmax (SPEC 3.5).
  if (CREATION.globalGift) {
    let best: Attribute = ATTRIBUTES[0]
    for (const attr of ATTRIBUTES) {
      if (ceilings[attr] > ceilings[best]) best = attr
    }
    if (ceilings[best] < CREATION.giftThreshold) {
      ceilings[best] = uniform(rng, CREATION.giftMin, CREATION.giftMax)
    }
  }

  const talent = beta(rng, CREATION.talentAlpha, CREATION.talentBeta) * 100
  const fragility = clamp(
    logNormal(rng, 0, CREATION.fragilitySigma),
    CREATION.fragilityMin,
    CREATION.fragilityMax,
  )
  const peakAge = uniformInt(rng, CREATION.peakAgeMin, CREATION.peakAgeMax)
  const declineAge = peakAge + uniformInt(rng, CREATION.declineOffsetMin, CREATION.declineOffsetMax)

  return {
    attributes,
    hidden: { talent, fragility, peakAge, declineAge, ceilings },
  }
}
