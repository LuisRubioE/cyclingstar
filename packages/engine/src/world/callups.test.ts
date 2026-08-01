import type { Vocation } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import type { StageKind } from '../routes/testTour.js'
import {
  type CallupCandidate,
  type TeamPhilosophy,
  callupScore,
  raceVocationFit,
  selectSquad,
} from './callups.js'

function candidate(over: Partial<CallupCandidate> & { riderId: string }): CallupCandidate {
  return {
    archetype: 'fondo',
    pointsSeason: 0,
    formStars: 3,
    desire: false,
    teamTrust: 50,
    young: false,
    ...over,
  }
}

/** Cuántas veces entra un corredor en la escuadra al muestrear con muchas semillas. */
function selectionRate(
  target: string,
  candidates: CallupCandidate[],
  fit: Record<Vocation, number>,
  philosophy: TeamPhilosophy,
  size: number,
): number {
  let hits = 0
  const runs = 400
  for (let i = 0; i < runs; i++) {
    const { squad } = selectSquad(candidates, { raceFit: fit, philosophy, size, seed: `s${i}` })
    if (squad.includes(target)) hits++
  }
  return hits / runs
}

describe('engine: IA de convocatorias (SPEC 6.18, Paso 35)', () => {
  it('el encaje del recorrido favorece a la vocación adecuada', () => {
    const flat = raceVocationFit(['llana', 'llana', 'llana'])
    expect(flat.velocidad).toBeGreaterThan(flat.escalada)
    const mountain = raceVocationFit(['reina', 'reina', 'reina'] as StageKind[])
    expect(mountain.escalada).toBeGreaterThan(mountain.velocidad)
    const itt = raceVocationFit(['cri'])
    expect(itt.crono).toBeGreaterThan(itt.velocidad)
  })

  it('el score sube con puntos, forma, deseo y confianza', () => {
    const fit = raceVocationFit(['llana'])
    const base = candidate({ riderId: 'a' })
    const more = candidate({
      riderId: 'a',
      pointsSeason: 400,
      formStars: 5,
      desire: true,
      teamTrust: 100,
    })
    expect(callupScore(more, fit, 'equilibrado')).toBeGreaterThan(
      callupScore(base, fit, 'equilibrado'),
    )
  })

  it('la selección es determinista para la misma semilla', () => {
    const fit = raceVocationFit(['llana', 'reina'])
    const cands = [
      candidate({ riderId: 'a', archetype: 'velocidad' }),
      candidate({ riderId: 'b', archetype: 'escalada' }),
      candidate({ riderId: 'c', archetype: 'crono' }),
    ]
    const opts = { raceFit: fit, philosophy: 'equilibrado' as const, size: 2, seed: 'x' }
    expect(selectSquad(cands, opts).squad).toEqual(selectSquad(cands, opts).squad)
  })

  it('devuelve el tamaño pedido sin repetir y solo de los candidatos', () => {
    const fit = raceVocationFit(['media'])
    const cands = ['a', 'b', 'c', 'd', 'e'].map((id) => candidate({ riderId: id }))
    const { squad } = selectSquad(cands, {
      raceFit: fit,
      philosophy: 'general',
      size: 3,
      seed: 'k',
    })
    expect(squad).toHaveLength(3)
    expect(new Set(squad).size).toBe(3)
    for (const id of squad) expect(['a', 'b', 'c', 'd', 'e']).toContain(id)
  })

  it('marcar el deseo aumenta la probabilidad de convocatoria', () => {
    const fit = raceVocationFit(['media', 'media'])
    const withDesire = [
      candidate({ riderId: 'target', desire: true }),
      candidate({ riderId: 'b' }),
      candidate({ riderId: 'c' }),
      candidate({ riderId: 'd' }),
    ]
    const without = withDesire.map((c) => (c.riderId === 'target' ? { ...c, desire: false } : c))
    const rateWith = selectionRate('target', withDesire, fit, 'equilibrado', 2)
    const rateWithout = selectionRate('target', without, fit, 'equilibrado', 2)
    expect(rateWith).toBeGreaterThan(rateWithout)
  })

  it('la filosofía de sprints favorece al velocista', () => {
    const fit = raceVocationFit(['llana', 'media'])
    const cands = [
      candidate({ riderId: 'sprinter', archetype: 'velocidad' }),
      candidate({ riderId: 'climber', archetype: 'escalada' }),
      candidate({ riderId: 'allround', archetype: 'fondo' }),
      candidate({ riderId: 'tt', archetype: 'crono' }),
    ]
    const sprintsRate = selectionRate('sprinter', cands, fit, 'sprints', 2)
    const balancedRate = selectionRate('sprinter', cands, fit, 'equilibrado', 2)
    expect(sprintsRate).toBeGreaterThan(balancedRate)
  })
})
