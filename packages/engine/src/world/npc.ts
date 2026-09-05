/**
 * Generación del genoma de un corredor NPC (SPEC 10). Puro y determinista desde la semilla:
 * atributos por rol y división, atributos ocultos (talento, fragilidad, techos por edad).
 * A diferencia del corredor de usuario (creation.ts), el NPC ya está formado según su división.
 */
import {
  ATTRIBUTE_GROWTH,
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

/**
 * CUÁNTO MARGEN AL TECHO LE TOCA A ESTE ATRIBUTO A ESTA EDAD (docs/epics.md «G1»).
 *
 * Antes esto era un interruptor —margen hasta los 23, cero a partir de los 24— y dejaba al 90 % del
 * pelotón sin poder mejorar nunca, porque `kDim` (progression.ts) devuelve 0 en cuanto el atributo
 * alcanza el techo. El dueño lo mandó abrir «siendo menos cartesianos»: no es que a los 24 se acabe
 * todo, es que a partir de ahí se mejora en COSAS DISTINTAS.
 *
 * De ahí las dos entradas: la edad, en tres tramos, y la clase del atributo (`ATTRIBUTE_GROWTH`).
 * Lo que da el cuerpo se cierra pronto; lo que da la cabeza y las manos —táctica, descenso,
 * adoquín— sigue abierto a los 34. Los rangos y el porqué, en `NPC.ceilingBoost`.
 */
function ceilingBoostRange(age: number, attr: Attribute): readonly [number, number] {
  const porClase = NPC.ceilingBoost[ATTRIBUTE_GROWTH[attr]]
  const tramo =
    age <= NPC.youngAge ? porClase.joven : age <= NPC.primeAge ? porClase.plenitud : porClase.veterano
  return [tramo[0], tramo[1]] as const
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
    const [min, max] = ceilingBoostRange(opts.age, attr)
    ceilings[attr] = Math.round(
      clamp(attributes[attr] + uniform(rng, min, max), attributes[attr], NPC.ceilingMax),
    )
  }

  return { attributes, hidden: { talent, fragility, peakAge, declineAge, ceilings } }
}

/** Edad NPC en [18,38] sesgada a 24..30, muestreada de una Beta reescalada (SPEC 10). */
export function sampleNpcAge(seed: string): number {
  const rng = seededRng(seed)
  const t = beta(rng, NPC.ageBetaAlpha, NPC.ageBetaBeta)
  return Math.round(NPC.ageMin + t * (NPC.ageMax - NPC.ageMin))
}
