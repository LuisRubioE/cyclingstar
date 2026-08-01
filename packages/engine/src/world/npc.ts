/**
 * Generación del genoma de un corredor NPC (SPEC 10). Puro y determinista desde la semilla:
 * atributos por rol y división, atributos ocultos (talento, fragilidad, techos por edad).
 * A diferencia del corredor de usuario (creation.ts), el NPC ya está formado según su división.
 */
import {
  ATTRIBUTES,
  type Attribute,
  VOCATION_PROFILES,
  type Vocation,
  seededRng,
} from '@cyclingstar/shared'
import { CREATION, NPC } from './../constants.js'
import { beta, clamp, logNormal, normal, uniform, uniformInt } from './../random.js'

export type Division = 'WT' | 'PRS' | 'CON'

export interface NpcHidden {
  talent: number
  fragility: number
  peakAge: number
  declineAge: number
  ceilings: Record<Attribute, number>
}

export interface NpcGenome {
  attributes: Record<Attribute, number>
  hidden: NpcHidden
}

/** mu del atributo según sea primario, adyacente o del resto para la vocación (SPEC 10). */
function attributeMu(base: number, attr: Attribute, vocation: Vocation): number {
  // La táctica se aprende corriendo (SPEC 3.6): arranca por debajo del resto.
  if (attr === 'TAC') return base - NPC.restDrop
  const profile = VOCATION_PROFILES[vocation]
  if (profile.primary.includes(attr)) return base
  if (profile.adjacent.includes(attr)) return base - NPC.adjacentDrop
  return base - NPC.restDrop
}

/** Genera el genoma de un NPC de una división, vocación y edad dadas (SPEC 10). */
export function generateNpcRider(
  seed: string,
  opts: { division: Division; vocation: Vocation; age: number },
): NpcGenome {
  const rng = seededRng(seed)
  const base = NPC.divisionPrimaryMu[opts.division]

  const attributes = {} as Record<Attribute, number>
  for (const attr of ATTRIBUTES) {
    const mu = attributeMu(base, attr, opts.vocation)
    attributes[attr] = Math.round(clamp(normal(rng, mu, NPC.attrSd), NPC.attrMin, NPC.attrMax))
  }

  const talent = clamp(beta(rng, CREATION.talentAlpha, CREATION.talentBeta) * 100, 0, 100)
  const fragility = clamp(
    logNormal(rng, 0, CREATION.fragilitySigma),
    CREATION.fragilityMin,
    CREATION.fragilityMax,
  )
  const peakAge = uniformInt(rng, CREATION.peakAgeMin, CREATION.peakAgeMax)
  const declineAge = peakAge + uniformInt(rng, CREATION.declineOffsetMin, CREATION.declineOffsetMax)

  const ceilings = {} as Record<Attribute, number>
  for (const attr of ATTRIBUTES) {
    ceilings[attr] =
      opts.age <= NPC.youngAge
        ? Math.round(
            clamp(
              attributes[attr] + uniform(rng, NPC.ceilingBoostMin, NPC.ceilingBoostMax),
              attributes[attr],
              NPC.ceilingMax,
            ),
          )
        : attributes[attr]
  }

  return { attributes, hidden: { talent, fragility, peakAge, declineAge, ceilings } }
}

/** Edad NPC en [18,38] sesgada a 24..30, muestreada de una Beta reescalada (SPEC 10). */
export function sampleNpcAge(seed: string): number {
  const rng = seededRng(seed)
  const t = beta(rng, NPC.ageBetaAlpha, NPC.ageBetaBeta)
  return Math.round(NPC.ageMin + t * (NPC.ageMax - NPC.ageMin))
}
