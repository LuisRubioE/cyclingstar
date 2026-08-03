import { describe, expect, it } from 'vitest'
import { selectFieldTeams } from './calendarRun.js'

/** Equipos de prueba, ya "ordenados por presupuesto" (el orden de entrada). */
function team(id: string, country: string) {
  return { id, country }
}

describe('db: selección del pelotón por región + wildcards (SPEC 8)', () => {
  it('sin región toma los mejores por presupuesto hasta el cupo', () => {
    const eligible = [team('a', 'FR'), team('b', 'IT'), team('c', 'JP'), team('d', 'CO')]
    const chosen = selectFieldTeams(eligible, 2)
    expect(chosen.map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('carrera regional: mayoría de la región y unas pocas wildcards de fuera', () => {
    const eligible = [
      team('as1', 'JP'),
      team('eu1', 'FR'),
      team('as2', 'CN'),
      team('as3', 'KR'),
      team('eu2', 'IT'),
      team('as4', 'TH'),
      team('af1', 'MA'),
      team('as5', 'ID'),
    ]
    const chosen = selectFieldTeams(eligible, 8, 'Asia')
    // Cupo 8: los 5 asiáticos disponibles + las 3 wildcards que completan el pelotón.
    const asians = chosen.filter((t) => ['JP', 'CN', 'KR', 'TH', 'ID'].includes(t.country))
    const foreign = chosen.filter((t) => !['JP', 'CN', 'KR', 'TH', 'ID'].includes(t.country))
    expect(chosen).toHaveLength(8)
    expect(asians.length).toBe(5)
    expect(foreign.length).toBe(3)
  })

  it('si la región llena el cupo, deja exactamente las plazas de wildcard a los de fuera', () => {
    const eligible = [
      ...Array.from({ length: 10 }, (_, i) => team(`as${i}`, 'CN')),
      team('eu1', 'FR'),
      team('eu2', 'IT'),
    ]
    const chosen = selectFieldTeams(eligible, 8, 'Asia')
    expect(chosen).toHaveLength(8)
    const foreign = chosen.filter((t) => t.country !== 'CN')
    expect(foreign).toHaveLength(2) // 6 región + 2 wildcard
  })

  it('sin equipos de la región, las wildcards llenan todo el pelotón', () => {
    const eligible = [team('eu1', 'FR'), team('eu2', 'IT'), team('eu3', 'ES')]
    const chosen = selectFieldTeams(eligible, 8, 'Oceania')
    expect(chosen).toHaveLength(3)
  })
})
