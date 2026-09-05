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

  /**
   * EL MAILLOT ES EL MEJOR COLOCADO, NO EL PRIMERO DEL ARRAY (v50).
   *
   * Esto era un `find`, así que con dos hombres del equipo en el podio provisional la carta salía
   * por ORDEN DE ARRAY —en producción, por dorsal— y el líder de la carrera se caía al reparto por
   * terreno. El dueño lo vio en la etapa 13 del Race Italy: «el líder… lo veo demasiado combativo;
   * se escapa, le pillan, lo vuelve a intentar… y curiosamente los que van segundo, tercero o
   * cuarto no lo hacen». Las dos mitades eran esta línea: el maillot salía de **cazaetapas** —el rol
   * que más ataca de todos— y sus rivales de `lider` con mentalidad `reservon`.
   *
   * Se prueba con el array en los DOS órdenes, porque el defecto era precisamente que el orden
   * decidiera: la respuesta tiene que ser la misma.
   */
  it('con dos hombres en el podio provisional, la carta es el líder de la carrera', () => {
    const conGc = (orden: 'maillot-primero' | 'maillot-segundo'): AutoOrderRider[] => {
      const t = team('a')
      const quinto = { ...t[1]!, gcRank: 5 }
      const maillot = { ...t[2]!, gcRank: 1 }
      const resto = [t[0]!, t[3]!, t[4]!, t[5]!, t[6]!]
      return orden === 'maillot-primero' ? [maillot, quinto, ...resto] : [quinto, maillot, ...resto]
    }
    for (const orden of ['maillot-primero', 'maillot-segundo'] as const) {
      for (const kind of ['llana', 'media', 'reina'] as const) {
        const out = autoStageOrders(conGc(orden), { kind, timeTrial: false })
        const maillot = out.get('a-rou')
        expect(`${orden}/${kind}: ${maillot?.role}`).toBe(`${orden}/${kind}: lider`)
        // Y no se le manda a la fuga del día, que es de donde salía el síntoma.
        expect(`${orden}/${kind}: ${maillot?.mentality}`).toBe(`${orden}/${kind}: reservon`)
        // El compañero peor colocado deja de ser la carta: es un gregario más.
        expect(`${orden}/${kind}: ${out.get('a-clm')?.role ?? 'libre'}`).not.toBe(
          `${orden}/${kind}: lider`,
        )
      }
    }
  })

  it('es determinista: misma entrada, misma salida', () => {
    const a = autoStageOrders(team('d'), { kind: 'llana', timeTrial: false })
    const b = autoStageOrders(team('d'), { kind: 'llana', timeTrial: false })
    expect([...a.entries()]).toEqual([...b.entries()])
  })
})
