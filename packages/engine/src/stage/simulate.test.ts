import { describe, expect, it } from 'vitest'
import type { Attribute } from '@cyclingstar/shared'
import { simulateStage } from './simulate.js'
import { stageSeed } from './rng.js'
import type { StageInput, StageOrders, StageRider } from './types.js'

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

const orders = (o: Partial<StageOrders>): StageOrders => ({
  role: 'libre',
  mentality: 'reservon',
  contestSprints: false,
  contestClimbs: false,
  ...o,
})

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

/** Una etapa llana de 100 km con una meta volante, un puñado de sprinters y candidatos a fuga. */
function flatStageInput(): StageInput {
  const riders: StageRider[] = []
  // 3 sprinters de nivel.
  for (let i = 0; i < 3; i++) {
    riders.push(
      rider(`spr-${i}`, {
        eff0: eff(55, { SPR: 85, LLA: 70 }),
        orders: orders({ role: 'sprinter', contestSprints: true }),
      }),
    )
  }
  // 4 cazaetapas combativos.
  for (let i = 0; i < 4; i++) {
    riders.push(
      rider(`brk-${i}`, {
        eff0: eff(55, { TAC: 62, LLA: 72 }),
        orders: orders({ role: 'cazaetapas', mentality: 'combativo', contestSprints: true }),
      }),
    )
  }
  // Relleno del pelotón.
  for (let i = 0; i < 33; i++) {
    riders.push(rider(`pel-${i}`, { eff0: eff(48 + (i % 7)) }))
  }
  return {
    profile: {
      segments: [{ km: 100, tipo: 'llano' }],
      banners: [{ km: 50, tipo: 'meta_volante' }],
    },
    riders,
  }
}

describe('simulateStage — etapa llana (Paso 24)', () => {
  const seed = stageSeed({ worldSeed: 'w', raceId: 'vuelta-test', stageDay: 1, engineVersion: 1 })
  const out = simulateStage(flatStageInput(), seed)

  it('produce una crónica coherente de principio a fin', () => {
    const tipos = out.events.map((e) => e.tipo)
    expect(tipos).toContain('fuga_formada')
    expect(tipos).toContain('meta') // se declara un ganador de etapa
    // Los eventos están ordenados cronológicamente.
    for (let i = 1; i < out.events.length; i++) {
      expect(out.events[i]!.tS).toBeGreaterThanOrEqual(out.events[i - 1]!.tS)
    }
  })

  it('clasifica a los 40 corredores con puestos únicos de 1 a 40', () => {
    expect(out.results).toHaveLength(40)
    const puestos = out.results.map((r) => r.puesto).sort((a, b) => a - b)
    expect(puestos).toEqual(Array.from({ length: 40 }, (_, i) => i + 1))
    // El primero llega antes que el último.
    expect(out.results[0]!.tiempoS).toBeLessThanOrEqual(out.results[39]!.tiempoS)
  })

  it('reparte bonificaciones 10/6/4 a los tres primeros', () => {
    expect(out.results[0]!.bonificacionS).toBe(10)
    expect(out.results[1]!.bonificacionS).toBe(6)
    expect(out.results[2]!.bonificacionS).toBe(4)
    expect(out.results[3]!.bonificacionS).toBe(0)
  })

  it('la meta volante reparte puntos', () => {
    const totalVolante = out.results.reduce((sum, r) => sum + r.puntosVolante, 0)
    expect(totalVolante).toBeGreaterThan(0)
  })

  it('registra el gasto (workUnits) de cada corredor', () => {
    expect(out.workUnits.size).toBe(40)
    for (const units of out.workUnits.values()) expect(units).toBeGreaterThan(0)
  })

  it('es determinista: la misma semilla da el mismo ganador', () => {
    const again = simulateStage(flatStageInput(), seed)
    expect(again.results[0]!.riderId).toBe(out.results[0]!.riderId)
  })
})

describe('trabajo de equipo (SPEC 6.18)', () => {
  // Dos sprinters idénticos; solo uno lleva un tren de dos lanzadores que le lanzan en meta.
  function leadOutInput(): StageInput {
    const riders: StageRider[] = []
    for (const id of ['spr-train', 'spr-alone']) {
      riders.push(
        rider(id, {
          eff0: eff(55, { SPR: 82, LLA: 70 }),
          orders: orders({ role: 'sprinter', contestSprints: false }),
        }),
      )
    }
    // Dos lanzadores para spr-train (buen llano para no descolgarse del grupo de meta).
    for (let i = 0; i < 2; i++) {
      riders.push(
        rider(`lead-${i}`, {
          eff0: eff(58, { LLA: 74 }),
          orders: orders({ role: 'lanzador', targetRiderId: 'spr-train' }),
        }),
      )
    }
    for (let i = 0; i < 36; i++) riders.push(rider(`pel-${i}`, { eff0: eff(50 + (i % 6)) }))
    return { profile: { segments: [{ km: 100, tipo: 'llano' }] }, riders }
  }

  it('un sprinter con tren de lanzadores gana la llegada masiva más que uno idéntico sin tren', { timeout: 30000 }, () => {
    let train = 0
    let alone = 0
    for (let s = 0; s < 60; s++) {
      const seed = stageSeed({ worldSeed: `lo-${s}`, raceId: 'lo', stageDay: 1, engineVersion: 1 })
      const out = simulateStage(leadOutInput(), seed)
      const posTrain = out.results.find((r) => r.riderId === 'spr-train')!.puesto
      const posAlone = out.results.find((r) => r.riderId === 'spr-alone')!.puesto
      if (posTrain < posAlone) train++
      else alone++
    }
    // El tren no es garantía (piernas del día, ruido del sprint) pero inclina claramente la balanza.
    expect(train).toBeGreaterThan(alone)
    expect(train).toBeGreaterThanOrEqual(38) // ≳63% de las etapas
  })

  // Dos líderes idénticos; solo uno lleva tres gregarios que le arropan en el pelotón.
  function domestiqueInput(): StageInput {
    const riders: StageRider[] = []
    for (let i = 0; i < 3; i++) {
      riders.push(rider(`greg-${i}`, { orders: orders({ role: 'gregario', targetRiderId: 'cap-a' }) }))
    }
    for (let i = 0; i < 34; i++) riders.push(rider(`pel-${i}`, { eff0: eff(50 + (i % 6)) }))
    // Los dos capitanes al final del campo: quedan fuera de la fracción que releva (25%), así ambos
    // van protegidos y la única diferencia es la protección extra de los gregarios de cap-a.
    for (const id of ['cap-a', 'cap-b']) {
      riders.push(rider(id, { eff0: eff(62, { LLA: 66 }), orders: orders({ role: 'lider' }) }))
    }
    return { profile: { segments: [{ km: 120, tipo: 'llano' }] }, riders }
  }

  it('un líder arropado por gregarios gasta menos energía que uno idéntico sin equipo', () => {
    const seed = stageSeed({ worldSeed: 'dom', raceId: 'dom', stageDay: 1, engineVersion: 1 })
    const out = simulateStage(domestiqueInput(), seed)
    const workA = out.workUnits.get('cap-a')!
    const workB = out.workUnits.get('cap-b')!
    expect(workA).toBeLessThan(workB)
  })
})
