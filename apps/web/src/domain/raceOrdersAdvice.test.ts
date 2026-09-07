import { describe, expect, it } from 'vitest'
import { orderAdvice } from './raceOrdersAdvice'

const orden = (over: Partial<Parameters<typeof orderAdvice>[0]> = {}) => ({
  role: 'libre' as const,
  mentality: 'reservon' as const,
  effort: 'normal' as const,
  triggerKm: null,
  targetRiderId: null,
  contestSprints: false,
  ...over,
})
const etapa = (over: Partial<Parameters<typeof orderAdvice>[1]> = {}) => ({
  kind: 'llana',
  km: 180,
  timeTrial: false,
  ...over,
})

describe('los avisos de las órdenes de etapa (v58)', () => {
  it('una orden normal no dice nada: esto avisa, no da la lata', () => {
    expect(orderAdvice(orden(), etapa())).toEqual([])
  })

  it('un sprinter en una etapa reina se avisa, pero no se prohíbe', () => {
    const avisos = orderAdvice(
      orden({ role: 'sprinter', contestSprints: true }),
      etapa({ kind: 'reina' }),
    )
    expect(avisos.some((a) => a.level === 'warn')).toBe(true)
  })

  it('los roles que necesitan a alguien lo dicen cuando no lo tienen', () => {
    for (const role of ['lanzador', 'gregario', 'marcador'] as const) {
      const avisos = orderAdvice(orden({ role }), etapa())
      expect(`${role}: ${avisos.some((a) => a.level === 'warn')}`).toBe(`${role}: true`)
    }
  })

  it('un ataque marcado más allá de meta es un error, no una táctica', () => {
    const avisos = orderAdvice(orden({ triggerKm: 200 }), etapa({ km: 180 }))
    expect(avisos.some((a) => a.level === 'warn' && a.text.includes('past the finish'))).toBe(true)
  })

  it('guardar fuerzas y atacarlo todo son órdenes contrarias', () => {
    const avisos = orderAdvice(orden({ effort: 'ahorrar', mentality: 'supercombativo' }), etapa())
    expect(avisos.some((a) => a.level === 'warn')).toBe(true)
  })

  it('en una crono no hay nada que aconsejar: no hay táctica de grupo', () => {
    const avisos = orderAdvice(orden({ role: 'sprinter' }), etapa({ kind: 'cri', timeTrial: true }))
    expect(avisos).toEqual([])
  })
})
