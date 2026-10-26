import type { RaceStartlist, TeamListItem } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import {
  NO_TABLE_IDENTITY,
  identityFromStartlist,
  identityFromTeams,
  rowTeam,
} from './tableIdentity'

/**
 * Lo que una fila de clasificación no trae (E3, docs/visual.md §6.1; PR 12b; 17-q): el dorsal, de la lista
 * de salida de su carrera por `riderId`, y la semilla del dibujo de su equipo por `teamId`, de esa lista o
 * de `GET /api/teams`. Sin ellos, sin dorsal o sin maillot: nunca uno equivocado.
 */

const LISTA: RaceStartlist = {
  upcoming: false,
  daysUntil: -3,
  frozen: true,
  teams: [
    {
      id: 't1',
      name: 'Mistral Racing',
      country: 'FR',
      division: 'WT',
      jerseySeed: 'seed-t1',
      riders: [
        { id: 'r1', name: 'Luc Martin', country: 'FR', isBot: true, bib: 11 },
        { id: 'r2', name: 'Paul Roux', country: 'FR', isBot: true, bib: null },
      ],
    },
  ],
  freeAgents: [{ id: 'r9', name: 'José Quintáns', country: 'ES', isBot: false, bib: 214 }],
}

const EQUIPO = (id: string, jerseySeed: string): TeamListItem => ({
  id,
  name: `Team ${id}`,
  country: null,
  division: 'CON',
  budget: 0,
  pointsSeason: 0,
  jerseySeed,
  riderCount: 12,
})

describe('identityFromStartlist', () => {
  it('el dorsal por corredor, también el del agente libre; sin dorsal, null', () => {
    const id = identityFromStartlist(LISTA)
    expect(id.bibOf('r1')).toBe(11)
    expect(id.bibOf('r9')).toBe(214)
    expect(id.bibOf('r2')).toBeNull()
    expect(id.bibOf('nadie')).toBeNull()
  })

  it('la semilla por equipo', () => {
    const id = identityFromStartlist(LISTA)
    expect(id.seedOf('t1')).toBe('seed-t1')
    expect(id.seedOf('t2')).toBeNull()
  })

  it('sin lista, ni dorsal ni semilla', () => {
    expect(identityFromStartlist(undefined)).toBe(NO_TABLE_IDENTITY)
  })
})

describe('identityFromTeams', () => {
  it('fuera de una carrera: la semilla de GET /api/teams, y nunca dorsal', () => {
    const id = identityFromTeams([EQUIPO('t1', 'a'), EQUIPO('t2', 'b')])
    expect(id.seedOf('t2')).toBe('b')
    expect(id.seedOf('t3')).toBeNull()
    expect(id.bibOf('r1')).toBeNull()
  })
})

describe('rowTeam', () => {
  const id = identityFromStartlist(LISTA)

  it('con su equipo y su semilla, el dibujo de hoy', () => {
    expect(rowTeam('t1', 'Mistral Racing', id)).toEqual({
      name: 'Mistral Racing',
      legacySeed: 'seed-t1',
    })
  })

  it('un agente libre: null (Individual, con el hueco del maillot)', () => {
    expect(rowTeam(null, null, id)).toBeNull()
    expect(rowTeam(undefined, null, id)).toBeNull()
  })

  it('sin la semilla de su equipo, undefined: ni maillot ni hueco', () => {
    expect(rowTeam('t2', 'Otro', id)).toBeUndefined()
    expect(rowTeam(undefined, 'Sin id', id)).toBeUndefined()
  })

  it('mientras llega la lista, el hueco del maillot (null): al llegar, la fila no se mueve', () => {
    const esperando = identityFromTeams(undefined, true)
    expect(esperando.pending).toBe(true)
    expect(rowTeam('t1', 'Mistral Racing', esperando)).toBeNull()
    expect(identityFromTeams(undefined).pending).toBe(false)
    expect(identityFromStartlist(undefined, true).pending).toBe(true)
    expect(NO_TABLE_IDENTITY.pending).toBe(false)
  })
})
