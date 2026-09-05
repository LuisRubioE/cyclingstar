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

  /**
   * EL TECHO, Y POR QUÉ NUEVE DE CADA DIEZ NPCs NACEN SIN NADA QUE GANAR.
   *
   * A los 23 años o menos el techo se pone por encima del atributo; a partir de ahí **el techo ES el
   * atributo**. Es deliberado —un NPC hecho ya viene formado— pero tiene una consecuencia que no lo
   * parece: `kDim` (progression.ts) vale 0 en cuanto el atributo alcanza el techo, así que para ese
   * corredor entrenar rinde exactamente CERO y será el mismo a los 26 que a los 30, salvo declive.
   *
   * Medido sobre 4.000 NPCs (banco de mundo, docs/epics.md «G1»): margen medio de 17 puntos hasta
   * los 23 y de CERO desde los 24, con el 90 % de la población del lado de cero. En un mundo recién
   * creado son cuatro de cada cinco corredores del pelotón que no pueden mejorar nunca; el mundo se
   * descongela solo hacia la temporada 15, cuando esos ya se han retirado.
   *
   * No se toca aquí: es una decisión de diseño del dueño (¿hay carreras deportivas en el mundo, o
   * el NPC es un número fijo?) y está anotada como tal. Queda dicho en el sitio para que nadie
   * vuelva a buscar el problema dentro de la fórmula de entrenamiento, que es donde no está.
   */
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
