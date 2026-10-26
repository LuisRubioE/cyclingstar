import type { ChampionTitle, WornJersey } from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { RiderLabel, type RiderLabelProps, riderJerseyOf } from './RiderLabel'

/**
 * `RiderLabel` (E3, docs/visual.md §4.6; PR 9b; D-00c): el dorsal, la bandera, el nombre y el maillot, en
 * ese orden y contiguos; el equipo, o `Individual`, en el segundo renglón; el maillot que le toca en ese
 * sitio, a 28; el nombre, entero, con el maillot pegado a su última palabra.
 */

const JOSE = { id: 'r214', name: 'José Quintáns', human: true, country: 'ES' } as const
const MISTRAL = { name: 'Mistral Racing', legacySeed: 'cyclingstar-2:team:WT:3:jersey' } as const
const ITALIA: ChampionTitle = {
  scope: 'national',
  country: 'IT',
  discipline: 'road',
  category: 'elite',
  season: 0,
  validFromDay: 1,
  validToDay: 365,
  source: { raceKey: 'r:s0', stageDay: 1 },
  provisional: true,
}
const pinta = (p: Partial<RiderLabelProps> = {}) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <RiderLabel rider={JOSE} team={MISTRAL} {...p} />
    </MemoryRouter>,
  )
const texto = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

describe('RiderLabel', () => {
  it('el orden: el dorsal, la bandera, el nombre y el maillot, y después el equipo', () => {
    const s = pinta({ bib: 214 })
    const en = (x: string) => s.indexOf(x)
    expect(en('#214')).toBeGreaterThan(-1)
    expect(en('#214')).toBeLessThan(en('data-ui="Flag"'))
    expect(en('data-ui="Flag"')).toBeLessThan(en('José '))
    expect(en('Quintáns')).toBeLessThan(en('data-kit='))
    expect(en('data-kit=')).toBeLessThan(en('>Mistral Racing<'))
    expect(s).toMatch(/^<span data-ui="RiderLabel" data-variant="row" data-state="ready"/)
  })

  it('el nombre es un TextLink rider a su ficha; un humano y un bot se distinguen', () => {
    const s = pinta()
    expect(s).toMatch(/<a [^>]*data-ui="TextLink" data-variant="rider"[^>]*data-inline-link=""/)
    expect(s).toContain('href="/world/riders/r214"')
    expect(s).toContain('data-rider="human"')
    expect(pinta({ rider: { ...JOSE, human: false } })).toContain('data-rider="bot"')
  })

  it('sin enlace dentro de una celda que ya enlaza', () => {
    expect(pinta({ link: false })).not.toContain('<a ')
  })

  it('la equipación de hoy, a 28, con el nombre del equipo para el lector', () => {
    const s = pinta()
    expect(s).toMatch(
      /<svg data-ui="LegacyJersey"[^>]*width="28" height="28"[^>]*aria-label="Mistral Racing kit"[^>]*data-kit="team"/,
    )
    expect(s).toMatch(/<span data-clip-ok="" [^>]*>Mistral Racing<\/span>/)
  })

  it('el maillot, justo tras la última palabra del nombre: solo lo de delante parte', () => {
    expect(pinta()).toMatch(
      /<span[^>]*>José <\/span>Quintáns<\/a><\/span><span [^>]*><svg data-ui="LegacyJersey"/,
    )
    expect(pinta({ link: false })).toMatch(
      /<span[^>]*>José <\/span>Quintáns<\/span><span [^>]*><svg/,
    )
  })

  it('un agente libre: Individual y el hueco del maillot, que no se lee', () => {
    const s = pinta({ team: null })
    expect(s).not.toContain('data-kit=')
    expect(s).toMatch(
      /<\/span><span [^>]*><span aria-hidden="true" [^>]*style="width:28px;height:28px"/,
    )
    expect(texto(s)).toBe('José Quintáns Individual')
  })

  it('el de líder manda sobre la equipación; el que lleva ese día, sobre todos', () => {
    expect(pinta({ leader: 'gc' })).toContain('data-kit="leader-gc"')
    const worn: WornJersey = {
      kind: 'leader',
      jersey: 'kom',
      delegated: false,
      from: { raceKey: 'r:s0', stageDay: 2 },
    }
    expect(pinta({ leader: 'gc', worn })).toContain('data-kit="leader-kom"')
    expect(pinta({ leader: 'gc', worn: { kind: 'team' } })).toContain('data-kit="team"')
  })

  it('el de campeón, sin la bandera de al lado (D-00c): una sola bandera, la del corredor', () => {
    const s = pinta({ champion: ITALIA })
    expect(s).toContain('data-kit="champion"')
    expect(s).toContain('aria-label="Champion of Italy"')
    expect(s.match(/data-ui="Flag"/g)).toHaveLength(1)
  })

  it('riderJerseyOf: el que lleva, el de líder, el de campeón, la equipación', () => {
    expect(riderJerseyOf({ team: MISTRAL })).toEqual({ kind: 'team', team: MISTRAL })
    expect(riderJerseyOf({ team: MISTRAL, champion: ITALIA }).kind).toBe('champion')
    expect(riderJerseyOf({ team: MISTRAL, champion: ITALIA, leader: 'points' }).kind).toBe('leader')
    expect(riderJerseyOf({ team: null })).toEqual({ kind: 'none' })
    expect(riderJerseyOf({})).toEqual({ kind: 'unknown' })
    expect(riderJerseyOf({ team: MISTRAL, leader: null, champion: null }).kind).toBe('team')
  })

  it('en una frase: todo en un renglón, con el equipo entre paréntesis', () => {
    const s = pinta({ bib: 214, inline: true })
    expect(s).toMatch(/^<span data-ui="RiderLabel" data-variant="inline"/)
    expect(texto(s)).toBe('#214 José Quintáns (Mistral Racing)')
  })

  it('en una RankTable, sin el segundo renglón: el equipo es su columna', () => {
    expect(texto(pinta({ teamLine: false }))).toBe('José Quintáns')
  })
})
