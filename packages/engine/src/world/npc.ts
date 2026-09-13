/**
 * Generación del genoma de un corredor NPC (SPEC 10). Puro y determinista desde la semilla:
 * atributos por rol y división, atributos ocultos (talento, fragilidad, techos por edad).
 * A diferencia del corredor de usuario (creation.ts), el NPC ya está formado según su división.
 */
import {
  ARCHETYPE_CEILING_OFFSETS,
  ATTRIBUTE_CLASS,
  ATTRIBUTE_GROWTH,
  ATTRIBUTES,
  type Attribute,
  RIDER_ARCHETYPES,
  type RiderArchetype,
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
    age <= NPC.youngAge
      ? porClase.joven
      : age <= NPC.primeAge
        ? porClase.plenitud
        : porClase.veterano
  return [tramo[0], tramo[1]] as const
}

/** Genera el genoma de un NPC de una división, vocación y edad dadas (SPEC 10). */
/**
 * CUÁNTO DE SU TECHO HA REALIZADO YA, por clase y edad efectiva. Interpolación lineal entre las
 * columnas de la tabla, porque un corredor de 24 años y medio no está en un escalón.
 */
export function maturity(clase: string, edadEfectiva: number): number {
  const fila = NPC.maturity[clase]!
  const i = edadEfectiva - NPC.maturityAgeFrom
  if (i <= 0) return fila[0]!
  if (i >= fila.length - 1) return fila[fila.length - 1]!
  const bajo = Math.floor(i)
  return fila[bajo]! + (i - bajo) * (fila[bajo + 1]! - fila[bajo]!)
}

/**
 * EL SORTEO DEL ARQUETIPO, con las cuotas de su división. No es uniforme a propósito: un pelotón de
 * verdad es un cuarto de gregarios y un puñado de cronistas, no cinco vocaciones a partes iguales.
 */
export function sampleArchetype(rng: () => number, division: Division): RiderArchetype {
  const cuotas = NPC.archetypeShare[division]!
  const total = RIDER_ARCHETYPES.reduce((a, k) => a + (cuotas[k] ?? 0), 0)
  let x = rng() * total
  for (const k of RIDER_ARCHETYPES) {
    x -= cuotas[k] ?? 0
    if (x <= 0) return k
  }
  return 'gregario'
}

/**
 * LA GÉNESIS v2 (docs/entrenamiento.md §3.3): primero HASTA DÓNDE puede llegar, después cuánto de
 * eso ha realizado a su edad.
 *
 * El orden importa y es el cambio de fondo. La legacy sorteaba el ATRIBUTO y le añadía un margen
 * hacia arriba, así que la distribución de techos del mundo dependía de lo que cada uno hubiera
 * entrenado ya: en la temporada 25 no se parecía a la de la temporada 1. Aquí el techo es genético y
 * absoluto —se sortea una vez y no se mueve— y la edad solo decide qué parte de él está realizada.
 */
function generarV2(
  rng: () => number,
  division: Division,
  age: number,
  arq: RiderArchetype,
): NpcGenome {
  const L = clamp(normal(rng, NPC.levelMu[division]!, NPC.levelSd), 40, 92)
  const pureza = uniform(rng, NPC.purityMin, NPC.purityMax)
  const talent = clamp(beta(rng, CREATION.talentAlpha, CREATION.talentBeta) * 100, 0, 100)
  const fragility = clamp(
    logNormal(rng, 0, CREATION.fragilitySigma),
    CREATION.fragilityMin,
    CREATION.fragilityMax,
  )
  const peakAge = uniformInt(rng, CREATION.peakAgeMin, CREATION.peakAgeMax)
  const declineAge = peakAge + uniformInt(rng, CREATION.declineOffsetMin, CREATION.declineOffsetMax)

  const offsets = ARCHETYPE_CEILING_OFFSETS[arq]
  const ceilings = {} as Record<Attribute, number>
  for (const attr of ATTRIBUTES) {
    let c = Math.round(
      clamp(L + offsets[attr] * pureza + normal(rng, 0, NPC.ceilingNoiseSd), 30, NPC.ceilingMax),
    )
    // La red del arquetipo: lo que su arquetipo penaliza de verdad no pasa de aquí.
    if (offsets[attr] <= -14) c = Math.min(c, NPC.ceilingCapOffTrade)
    ceilings[attr] = c
  }

  /**
   * EL PRESUPUESTO DE DISPERSIÓN. Se mide sobre el NIVEL DEL PROPIO CORREDOR y solo con los nueve
   * físicos: TAC queda fuera porque no compite por el mismo cuerpo. Si el ruido le ha regalado a uno
   * más excedente del que su talento puede pagar, se le escala hacia su nivel de forma proporcional
   * —no se le recorta el mejor y ya—, que es lo que conserva la FORMA de su perfil.
   */
  const fisicos = ATTRIBUTES.filter((a) => a !== 'TAC')
  const exceso = fisicos.reduce((acc, a) => acc + Math.max(0, ceilings[a] - L), 0)
  const presupuesto = CREATION.talentBudgetBase + CREATION.talentBudgetSlope * talent
  if (exceso > presupuesto) {
    const escala = presupuesto / exceso
    for (const a of fisicos) {
      if (ceilings[a] > L) ceilings[a] = Math.round(L + (ceilings[a] - L) * escala)
    }
  }

  /**
   * LA MADUREZ. `madurez` desplaza el reloj: un corredor de pico tardío madura tarde, y es el mismo
   * reloj que usa `kAge`. Y el `C − 2` garantiza que NADIE nace con un físico en su techo: en el
   * techo el freno vale cero y ese corredor no podría mejorar jamás, que es el defecto que la v50
   * mandó abrir.
   */
  const madurez = clamp(peakAge - 28, -2, 3)
  const attributes = {} as Record<Attribute, number>
  for (const attr of ATTRIBUTES) {
    const clase = ATTRIBUTE_CLASS[attr]
    let m = maturity(clase, age - madurez)
    if (age > declineAge) {
      const desde = clase === 'oficio' ? declineAge + NPC.veteranOficioDelay : declineAge
      const anios = Math.max(0, age - desde)
      m -= (attr === 'TAC' ? 0 : NPC.veteranDropPerYear[clase]!) * anios
    }
    const base = Math.round(
      clamp(ceilings[attr] * m * (1 + normal(rng, 0, 0.03)), 20, ceilings[attr]),
    )
    attributes[attr] = attr === 'TAC' ? base : Math.min(ceilings[attr] - NPC.ceilingHeadroom, base)
  }

  return { attributes, hidden: { talent, fragility, peakAge, declineAge, ceilings } }
}

export function generateNpcRider(
  seed: string,
  opts: {
    division: Division
    vocation: Vocation
    age: number
    /** La génesis v2. Sin esto se usa la legacy, que queda hasta que su fixture la selle. */
    v2?: boolean
    /** El arquetipo, si ya está decidido; si no, se sortea con las cuotas de su división. */
    archetype?: RiderArchetype
  },
): NpcGenome {
  const rng = seededRng(seed)
  if (opts.v2 === true) {
    return generarV2(
      rng,
      opts.division,
      opts.age,
      opts.archetype ?? sampleArchetype(rng, opts.division),
    )
  }
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

/**
 * Edad NPC sesgada a 24..30, muestreada de una Beta reescalada (SPEC 10).
 *
 * En v2 el rango empieza en **19** y no en 18: los 18 son del humano, que es quien empieza antes de
 * ser profesional. Un NPC de 18 años en el pelotón era un artefacto del rango, no una decisión.
 */
export function sampleNpcAge(seed: string, opts: { v2?: boolean } = {}): number {
  const rng = seededRng(seed)
  const t = beta(rng, NPC.ageBetaAlpha, NPC.ageBetaBeta)
  const min = opts.v2 === true ? NPC.ageMinV2 : NPC.ageMin
  return Math.round(min + t * (NPC.ageMax - min))
}
