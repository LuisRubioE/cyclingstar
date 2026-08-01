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
