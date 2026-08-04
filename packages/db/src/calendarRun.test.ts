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

  it('.WT: las wildcards Pro rotan por carrera (no siempre las mismas)', () => {
    const eligible = [
      team('wt1', 'BE', 'WT'),
      team('wt2', 'FR', 'WT'),
      ...Array.from({ length: 6 }, (_, i) => team(`prs${i}`, 'ES', 'PRS')),
    ]
    // Cupo 4: 2 WT garantizados + 2 wildcards Pro que dependen de la semilla de rotación.
    const wildsFor = (seed: number) =>
      selectFieldTeams(eligible, 4, undefined, ['WT', 'PRS', 'CON'], undefined, seed)
        .filter((t) => t.division === 'PRS')
        .map((t) => t.id)
        .join(',')
    // Los dos WT siempre entran, en cualquier semilla.
    for (const seed of [0, 1, 2, 3]) {
      const chosen = selectFieldTeams(eligible, 4, undefined, ['WT', 'PRS', 'CON'], undefined, seed)
      expect(chosen.filter((t) => t.division === 'WT')).toHaveLength(2)
      expect(chosen.filter((t) => t.division === 'PRS')).toHaveLength(2)
    }
    // Distintas semillas producen distintos conjuntos de wildcards (rotan, no son fijas).
    const variety = new Set([0, 1, 2, 3].map(wildsFor))
    expect(variety.size).toBeGreaterThan(1)
  })

  it('.WT: las wildcards se acotan (no se llena el pelotón de invitados)', () => {
    const eligible = [
      ...Array.from({ length: 18 }, (_, i) => team(`wt${i}`, 'BE', 'WT')),
      ...Array.from({ length: 20 }, (_, i) => team(`prs${i}`, 'ES', 'PRS')),
    ]
    // Cupo amplio (25), pero solo 3 plazas de wildcard: 18 WT garantizados + 3 Pro, no 7.
    const chosen = selectFieldTeams(eligible, 25, undefined, ['WT', 'PRS', 'CON'], 3, 0)
    expect(chosen.filter((t) => t.division === 'WT')).toHaveLength(18)
    expect(chosen.filter((t) => t.division === 'PRS')).toHaveLength(3)
    expect(chosen).toHaveLength(21)
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

  it('carrera regional: si la región no llena el cupo, NO se completa con más extranjeros', () => {
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
    // Solo 5 asiáticos: el pelotón NO se rellena con los 3 extranjeros hasta el cupo. Las wildcards
    // siguen acotadas (reserva por defecto ~1); el resto lo completarían corredores individuales del
    // continente (relleno regional), no un aluvión de equipos de otros continentes.
    const chosen = selectFieldTeams(eligible, 8, 'Asia')
    const asians = chosen.filter((t) => ['JP', 'CN', 'KR', 'TH', 'ID'].includes(t.country))
    const foreign = chosen.filter((t) => !['JP', 'CN', 'KR', 'TH', 'ID'].includes(t.country))
    expect(asians.length).toBe(5) // los 5 asiáticos disponibles
    expect(foreign.length).toBe(1) // wildcards acotadas, no las 3 de fuera
  })

  it('sin equipos de la región, entran solo las wildcards permitidas (no se llena de extranjeros)', () => {
    const eligible = [team('eu1', 'FR'), team('eu2', 'IT'), team('eu3', 'ES')]
    // Reserva de 2 wildcards: aunque el cupo sea 8 y no haya equipos de la región, solo entran 2 de
    // fuera (el resto lo completaría el relleno individual del continente), no los 3 disponibles.
    const chosen = selectFieldTeams(eligible, 8, 'Oceania', undefined, 2)
    expect(chosen).toHaveLength(2)
  })
})
