import { describe, expect, it } from 'vitest'
import type { Attribute } from '@cyclingstar/shared'
import { autoStageOrders, sprinterThreshold, type AutoOrderRider } from './autoOrders.js'

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

/**
 * ¿QUIÉN TIENE BAZA DE SPRINT? UN PERCENTIL, NO UN NÚMERO (v63, decisión 25 del dueño).
 *
 * Lo que hay que probar del cambio es la propiedad que el 68 absoluto perdió con la génesis v2:
 * **que el reparto no dependa del NIVEL del campo**. Un continental modesto tiene que tener sus
 * velocistas en su carrera, igual que el WorldTour tiene los suyos en la suya.
 */
describe('el listón de velocista es del campo del día, no un 68 escrito a mano', () => {
  const campo = (sprs: number[]): AutoOrderRider[] =>
    sprs.map((spr, i) => ({
      riderId: `r${i}`,
      teamId: `e${Math.floor(i / 8)}`,
      attrs: attrs({ SPR: spr }),
    }))

  it('es el p75: un cuarto del campo lo supera, valga lo que valga el campo', () => {
    const flojo = campo([30, 32, 34, 36, 38, 40, 42, 44])
    const bueno = campo([70, 72, 74, 76, 78, 80, 82, 84])
    const uFlojo = sprinterThreshold(flojo)
    const uBueno = sprinterThreshold(bueno)
    // El listón SUBE con el campo, que es justo lo que el 68 fijo no sabía hacer.
    expect(`el listón sigue al campo: ${uBueno > uFlojo}`).toBe('el listón sigue al campo: true')
    const pasan = (f: AutoOrderRider[], u: number): number =>
      f.filter((r) => r.attrs.SPR >= u).length
    // Y LOS DOS CAMPOS DAN EL MISMO REPARTO, que es toda la propiedad: el cuarto de arriba de cada
    // carrera, sea la carrera que sea. Con el 68 absoluto, el campo flojo daba CERO.
    expect(`flojo: ${pasan(flojo, uFlojo)}`).toBe('flojo: 2')
    expect(`bueno: ${pasan(bueno, uBueno)}`).toBe('bueno: 2')
    expect(`mismo reparto: ${pasan(flojo, uFlojo) === pasan(bueno, uBueno)}`).toBe(
      'mismo reparto: true',
    )
  })

  it('EN UN CAMPO MODESTO SIGUE HABIENDO VELOCISTAS, que es lo que el 68 se cargaba', () => {
    // Un continental entero por debajo de 68: con el umbral absoluto, CERO sprinters en toda la
    // carrera y ningún equipo con tren. Con el percentil, los hay.
    const continental = campo([40, 44, 48, 52, 55, 58, 60, 62, 42, 46, 50, 54, 56, 59, 61, 63])
    expect(`ninguno pasa de 68: ${continental.every((r) => r.attrs.SPR < 68)}`).toBe(
      'ninguno pasa de 68: true',
    )
    const out = autoStageOrders(continental, { kind: 'llana', timeTrial: false })
    const sprinters = [...out.values()].filter((o) => o.role === 'sprinter').length
    expect(`hay velocistas: ${sprinters > 0}`).toBe('hay velocistas: true')
  })

  it('con un campo de tres gatos no manda nadie: el mejor del equipo es su velocista', () => {
    // Con menos de cuatro corredores no hay campo del que sacar percentiles, y exigir uno sería
    // decidir con ruido. El umbral es 0 y el mejor manda.
    expect(sprinterThreshold(campo([50, 60, 70]))).toBe(0)
  })

  it('el listón es del CAMPO y no de cada plantilla', () => {
    // Si cada equipo lo sacara de los suyos, «superar el p75» sería «ser el mejor de tu equipo» y lo
    // cumplirían los veintidós. Dos equipos de nivel muy distinto en la misma carrera:
    const fuerte = campo([80, 82, 84, 86, 78, 76, 74, 72]).map((r) => ({ ...r, teamId: 'fuerte' }))
    const debil = campo([40, 42, 44, 46, 38, 36, 34, 32]).map((r, i) => ({
      ...r,
      riderId: `d${i}`,
      teamId: 'debil',
    }))
    const out = autoStageOrders([...fuerte, ...debil], { kind: 'llana', timeTrial: false })
    const conRol = (equipo: AutoOrderRider[]): boolean =>
      equipo.some((r) => out.get(r.riderId)?.role === 'sprinter')
    expect(`el fuerte pone velocista: ${conRol(fuerte)}`).toBe('el fuerte pone velocista: true')
    expect(`el débil no: ${conRol(debil)}`).toBe('el débil no: false')
  })
})
