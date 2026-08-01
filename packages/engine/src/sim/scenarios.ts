/**
 * Escenarios canónicos para el balance del motor (SPEC 6.17). Campos de corredores realistas y
 * reproducibles; la varianza entre corridas entra por la semilla de la etapa (composición de la
 * fuga, cooperación, ruido del sprint), no por los atributos.
 */
import type { Attribute } from '@cyclingstar/shared'
import { stageSeed } from '../stage/rng.js'
import type { StageInput, StageOrders, StageRider } from '../stage/types.js'

function eff(
  base: number,
  over: Partial<Record<Attribute, number>> = {},
): Record<Attribute, number> {
  return {
    RES: base,
    REC: base,
    LLA: base,
    MON: base,
    COL: base,
    CRI: base,
    SPR: base,
    DES: base,
    PAV: base,
    TAC: base,
    ...over,
  }
}

function orders(o: Partial<StageOrders>): StageOrders {
  return { role: 'libre', mentality: 'reservon', contestSprints: false, contestClimbs: false, ...o }
}

function rider(id: string, over: Partial<StageRider>): StageRider {
  return {
    riderId: id,
    eff0: eff(50),
    energy: 100,
    matches: 4,
    tsb: 0,
    orders: orders({}),
    gcDeficitSeconds: 0,
    ...over,
  }
}

export interface Scenario {
  name: string
  input: StageInput
  /** El mejor sprinter del campo (para el invariante "mejor sprinter 30-45%"). */
  bestSprinterId: string
}

/**
 * Etapa llana de 180 km con una meta volante: 3 sprinters de nivel, un puñado de cazaetapas y un
 * pelotón de rodadores (SPEC 6.17). El campo es fijo; la semilla mueve el resto.
 */
export function flatScenario(): Scenario {
  const riders: StageRider[] = []
  for (let i = 0; i < 3; i++) {
    riders.push(
      rider(`spr-${i}`, {
        eff0: eff(55, { SPR: 84 + i, LLA: 68 }),
        orders: orders({ role: 'sprinter', contestSprints: true }),
      }),
    )
  }
  for (let i = 0; i < 6; i++) {
    riders.push(
      rider(`brk-${i}`, {
        eff0: eff(55, { TAC: 60, LLA: 68 }),
        orders: orders({ role: 'cazaetapas', mentality: 'combativo', contestSprints: true }),
      }),
    )
  }
  for (let i = 0; i < 31; i++) {
    riders.push(rider(`pel-${i}`, { eff0: eff(56, { LLA: 62 + (i % 8) }) }))
  }
  return {
    name: 'llana-180',
    input: {
      profile: {
        segments: [{ km: 180, tipo: 'llano' }],
        banners: [{ km: 100, tipo: 'meta_volante' }],
      },
      riders,
    },
    bestSprinterId: 'spr-2',
  }
}

/**
 * Etapa reina (SPEC 6.17): 135 km de llano y un puerto final de 15 km al 8% con meta en alto.
 * Líderes de la general en el pelotón (reservones: no fugan), baroudeurs combativos que forman
 * la fuga, sprinters que se descuelgan y gregarios de relleno.
 */
export function queenScenario(): Scenario {
  const riders: StageRider[] = []
  for (let i = 0; i < 4; i++) {
    riders.push(
      rider(`gc-${i}`, {
        eff0: eff(60, { MON: 84 + i, COL: 80, LLA: 64 }),
        orders: orders({ role: 'lider', contestClimbs: true }),
      }),
    )
  }
  for (let i = 0; i < 6; i++) {
    riders.push(
      rider(`bar-${i}`, {
        eff0: eff(56, { MON: 72 + (i % 4), COL: 70, LLA: 66, TAC: 60 }),
        orders: orders({ role: 'cazaetapas', mentality: 'combativo', contestClimbs: true }),
      }),
    )
  }
  for (let i = 0; i < 3; i++) {
    riders.push(rider(`spr-${i}`, { eff0: eff(52, { SPR: 84, LLA: 66, MON: 42 }) }))
  }
  for (let i = 0; i < 27; i++) {
    riders.push(rider(`pel-${i}`, { eff0: eff(55, { MON: 54 + (i % 12), LLA: 60 }) }))
  }
  return {
    name: 'reina-150',
    input: {
      profile: {
        segments: [
          { km: 135, tipo: 'llano' },
          { km: 15, tipo: 'puerto', tramos: [{ km: 15, g: 8 }] },
        ],
        banners: [{ km: 150, tipo: 'cima' }],
      },
      riders,
    },
    bestSprinterId: 'gc-3',
  }
}

/** Semillas deterministas de una campaña de N etapas del mismo escenario. */
export function campaignSeeds(scenario: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) =>
    stageSeed({ worldSeed: `${scenario}-${i}`, raceId: scenario, stageDay: 1, engineVersion: 1 }),
  )
}
