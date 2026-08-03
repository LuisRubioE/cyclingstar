import { describe, expect, it } from 'vitest'
import { selectFieldTeams } from './calendarRun.js'

type Div = 'WT' | 'PRS' | 'CON'
/** Equipos de prueba, ya "ordenados por presupuesto" (el orden de entrada). */
function team(id: string, country: string, division: Div = 'CON') {
  return { id, country, division }
}

describe('db: selección del pelotón por nivel y región (SPEC 8)', () => {
  it('sin región ni prioridad toma los mejores por presupuesto hasta el cupo', () => {
    const eligible = [team('a', 'FR'), team('b', 'IT'), team('c', 'JP'), team('d', 'CO')]
    const chosen = selectFieldTeams(eligible, 2)
    expect(chosen.map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('.WT: los equipos WorldTour entran garantizados y el resto son wildcards Pro', () => {
    const eligible = [
      team('prs1', 'ES', 'PRS'), // más presupuesto, pero no es WT
      team('wt1', 'BE', 'WT'),
      team('prs2', 'IT', 'PRS'),
      team('wt2', 'FR', 'WT'),
      team('con1', 'CO', 'CON'),
    ]
    // Cupo 3: los dos WT primero (garantizados) + una wildcard Pro (la de más presupuesto).
    const chosen = selectFieldTeams(eligible, 3, undefined, ['WT', 'PRS', 'CON'])
    expect(chosen.map((t) => t.id)).toEqual(['wt1', 'wt2', 'prs1'])
  })

  it('.Pro: el núcleo son los ProTeams, con WorldTour de invitados', () => {
    const eligible = [
      team('wt1', 'BE', 'WT'),
      team('prs1', 'ES', 'PRS'),
      team('wt2', 'FR', 'WT'),
      team('prs2', 'IT', 'PRS'),
    ]
    const chosen = selectFieldTeams(eligible, 3, undefined, ['PRS', 'WT', 'CON'])
    expect(chosen.map((t) => t.id)).toEqual(['prs1', 'prs2', 'wt1'])
  })

  it('carrera regional: la región es mayoría y se reserva ~1 plaza de wildcard', () => {
    const eligible = [
      ...Array.from({ length: 10 }, (_, i) => team(`as${i}`, 'CN')),
      team('eu1', 'FR'),
      team('eu2', 'IT'),
    ]
    const chosen = selectFieldTeams(eligible, 8, 'Asia')
    expect(chosen).toHaveLength(8)
    const foreign = chosen.filter((t) => t.country !== 'CN')
    // 7 región + 1 wildcard reservada (un invitado de fuera), no un pelotón forzado de extranjeros.
    expect(foreign).toHaveLength(1)
  })

  it('carrera regional: si la región no llena el cupo, las wildcards completan', () => {
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
    const asians = chosen.filter((t) => ['JP', 'CN', 'KR', 'TH', 'ID'].includes(t.country))
    const foreign = chosen.filter((t) => !['JP', 'CN', 'KR', 'TH', 'ID'].includes(t.country))
    expect(chosen).toHaveLength(8)
    expect(asians.length).toBe(5) // los 5 asiáticos disponibles
    expect(foreign.length).toBe(3) // + 3 wildcards que completan
  })

  it('sin equipos de la región, las wildcards llenan lo que pueden', () => {
    const eligible = [team('eu1', 'FR'), team('eu2', 'IT'), team('eu3', 'ES')]
    const chosen = selectFieldTeams(eligible, 8, 'Oceania')
    expect(chosen).toHaveLength(3)
  })
})
