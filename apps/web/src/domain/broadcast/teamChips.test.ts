import type { ChampionTitle } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { castOf, leaderWorn } from '../../components/broadcast/__fixtures__/screen'
import { TEAM_KIT_LINES_MAX, fitTeamChips, teamLineOf } from './teamChips'

/**
 * LA LÍNEA DE EQUIPOS (E3, docs/visual.md §14.4; PR 17a; 14-d, 14-f; Ruso-023 y Ruso-037): las fichas de
 * un grupo y cuántas caben con el ancho medido.
 */

const ITALY: ChampionTitle = {
  scope: 'national',
  country: 'IT',
  discipline: 'road',
  category: 'elite',
  season: 0,
  validFromDay: 179,
  validToDay: 543,
  source: { raceKey: 'nc-it-road:s0', stageDay: 1 },
  provisional: true,
}

describe('teamLineOf', () => {
  it('delante los de líder y campeón, sin cuenta y el nacional con sus letras; después un equipo por ficha, de más a menos', () => {
    // el reparto de prueba: el corredor ix va en el equipo ix % 3
    const cast = castOf(12, {
      3: { worn: leaderWorn('gc') },
      7: { worn: { kind: 'champion', title: ITALY } },
      9: { worn: { kind: 'champion', title: { ...ITALY, scope: 'world', country: null } } },
    })
    const line = teamLineOf([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], cast)
    expect(line.slice(0, 3)).toEqual([
      { kind: 'front', rider: 3, worn: leaderWorn('gc'), letters: null },
      { kind: 'front', rider: 7, worn: { kind: 'champion', title: ITALY }, letters: 'IT' },
      expect.objectContaining({ kind: 'front', rider: 9, letters: null }),
    ])
    // sin los de delante: el equipo 1 lleva 1, 4 y 10; el 2, 2, 5 y 8; el 0, 0 y 6. Los dos de tres, por
    // el dorsal más bajo (el 2 del corredor 1 antes que el 3 del corredor 2)
    expect(line.slice(3)).toEqual([
      { kind: 'team', teamId: 'team-1', riders: [1, 4, 10] },
      { kind: 'team', teamId: 'team-2', riders: [2, 5, 8] },
      { kind: 'team', teamId: 'team-0', riders: [0, 6] },
    ])
    // las cuentas y los de delante suman el grupo
    const sum = line.reduce((n, c) => n + (c.kind === 'front' ? 1 : c.riders.length), 0)
    expect(sum).toBe(11)
  })

  it('a igualdad de corredores, el del dorsal más bajo; los que van sin equipo, en su propia ficha', () => {
    const cast = castOf(6, { 5: { team: null } })
    const line = teamLineOf([1, 2, 4, 5], cast)
    expect(line).toEqual([
      { kind: 'team', teamId: 'team-1', riders: [1, 4] },
      { kind: 'team', teamId: 'team-2', riders: [2] },
      { kind: 'team', teamId: null, riders: [5] },
    ])
  })
})

describe('fitTeamChips', () => {
  // una ficha mide 50,4 px con DejaVu Sans (el maillot, 4 de hueco y la cuenta); `+N teams`, más
  const chip = 50.4
  const twelve = Array(12).fill(chip)

  it(`a 310 px (360 de pantalla): cinco por renglón en ${TEAM_KIT_LINES_MAX} renglones, y el segundo con cuatro y +N teams`, () => {
    expect(fitTeamChips(310, Array(5).fill(chip))).toBe(5)
    expect(fitTeamChips(310, Array(10).fill(chip))).toBe(10)
    expect(fitTeamChips(310, twelve)).toBe(9)
  })

  it('a 270 px (320 de pantalla): cinco en el primero y tres y +N teams en el segundo', () => {
    expect(fitTeamChips(270, Array(5).fill(chip))).toBe(5)
    expect(fitTeamChips(270, twelve)).toBe(8)
  })

  it('con otra letra la cuenta mide más, y caben menos: por eso se mide y no se fija', () => {
    expect(fitTeamChips(310, Array(12).fill(62))).toBe(7) // cuatro por renglón, y tres y +N teams
    expect(fitTeamChips(310, [chip, chip], { lines: 1 })).toBe(2)
    expect(fitTeamChips(100, [chip, chip, chip], { lines: 1, moreWidthPx: 60 })).toBe(0)
  })
})
