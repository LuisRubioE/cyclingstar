import { describe, expect, it } from 'vitest'
import type { Attribute } from '@cyclingstar/shared'
import { autoStageOrders, type AutoOrderRider } from './autoOrders.js'

function attrs(over: Partial<Record<Attribute, number>> = {}): Record<Attribute, number> {
  return {
    RES: 50,
    REC: 50,
    LLA: 50,
    MON: 50,
    COL: 50,
    CRI: 50,
    SPR: 50,
    DES: 50,
    PAV: 50,
    TAC: 50,
    ...over,
  }
}

/** Un equipo de 7 con un sprinter claro, un escalador, un rodador y relleno. */
function team(id: string): AutoOrderRider[] {
  return [
    { riderId: `${id}-spr`, teamId: id, attrs: attrs({ SPR: 85, LLA: 72 }) },
    { riderId: `${id}-clm`, teamId: id, attrs: attrs({ MON: 84, COL: 78 }) },
    { riderId: `${id}-rou`, teamId: id, attrs: attrs({ TAC: 74, LLA: 76, RES: 70 }) },
    { riderId: `${id}-d1`, teamId: id, attrs: attrs({ LLA: 66 }) },
    { riderId: `${id}-d2`, teamId: id, attrs: attrs({ RES: 64 }) },
    { riderId: `${id}-d3`, teamId: id, attrs: attrs({ REC: 60 }) },
    { riderId: `${id}-d4`, teamId: id, attrs: attrs({ DES: 60 }) },
  ]
}

describe('autoStageOrders (SPEC 6.18)', () => {
  it('en llano nombra sprinter + lanzador y siembra un baroudeur', () => {
    const out = autoStageOrders(team('a'), { kind: 'llana', timeTrial: false })
    expect(out.get('a-spr')?.role).toBe('sprinter')
    const launcher = [...out.values()].find((o) => o.role === 'lanzador')
    expect(launcher?.targetRiderId).toBe('a-spr')
    expect([...out.values()].some((o) => o.role === 'cazaetapas')).toBe(true)
    // Los gregarios apuntan al líder (el sprinter).
    const gregs = [...out.values()].filter((o) => o.role === 'gregario')
    expect(gregs.length).toBeGreaterThan(0)
    for (const g of gregs) expect(g.targetRiderId).toBe('a-spr')
  })

  it('en montaña el jefe de filas es el escalador y no hay lanzador', () => {
    const out = autoStageOrders(team('b'), { kind: 'reina', timeTrial: false })
    expect(out.get('b-clm')?.role).toBe('lider')
    expect(out.get('b-clm')?.contestClimbs).toBe(true)
    expect([...out.values()].some((o) => o.role === 'lanzador')).toBe(false)
    expect([...out.values()].some((o) => o.role === 'cazaetapas')).toBe(true)
  })

  it('la contrarreloj no reparte roles (todos libres)', () => {
    expect(autoStageOrders(team('c'), { kind: 'cri', timeTrial: true }).size).toBe(0)
  })

  it('varios equipos generan varios candidatos a la fuga', () => {
    const field = [...team('x'), ...team('y'), ...team('z')]
    const out = autoStageOrders(field, { kind: 'llana', timeTrial: false })
    const baroudeurs = [...out.values()].filter(
      (o) => o.role === 'cazaetapas' || o.mentality === 'combativo',
    )
    expect(baroudeurs.length).toBeGreaterThanOrEqual(3)
  })

  it('un agente libre con buena fuga se pone combativo por su cuenta', () => {
    const out = autoStageOrders(
      [{ riderId: 'lone', teamId: null, attrs: attrs({ TAC: 72, LLA: 70, RES: 66 }) }],
      { kind: 'media', timeTrial: false },
    )
    expect(out.get('lone')?.mentality).toBe('combativo')
  })

  it('es determinista: misma entrada, misma salida', () => {
    const a = autoStageOrders(team('d'), { kind: 'llana', timeTrial: false })
    const b = autoStageOrders(team('d'), { kind: 'llana', timeTrial: false })
    expect([...a.entries()]).toEqual([...b.entries()])
  })
})
