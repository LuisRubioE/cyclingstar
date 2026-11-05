import type { ChampionTitle, RiderCard, WornJersey } from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WornJerseyIcon, wornTeamOf } from './WornJerseyIcon'

/**
 * `WornJerseyIcon` (E3, docs/visual.md §9.10; PR 17a): elige el dibujo y el texto por `WornJersey`, con
 * la firma del contrato de E2 más el tamaño y la superficie, y `wornTeamOf` traduce `RiderCard.team`.
 */

const TITLE: ChampionTitle = {
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
const leader: WornJersey = {
  kind: 'leader',
  jersey: 'kom',
  delegated: false,
  from: { raceKey: 'race-france:s0', stageDay: 6 },
}
const team = { name: 'Mistral Racing', kit: 'halves.red.blue' as const }

describe('WornJerseyIcon', () => {
  it('el de líder pinta LeaderJersey; el de campeón, ChampionJersey; los dos con su texto', () => {
    const l = renderToStaticMarkup(<WornJerseyIcon worn={leader} team={team} size={28} />)
    expect(l).toContain('data-ui="LeaderJersey"')
    expect(l).toContain('aria-label="Mountains leader"')
    const c = renderToStaticMarkup(
      <WornJerseyIcon worn={{ kind: 'champion', title: TITLE }} team={team} size={28} />,
    )
    expect(c).toContain('data-ui="ChampionJersey"')
    expect(c).toContain('aria-label="Champion of Italy"')
  })

  it('el de equipo pinta su Kit, o el dibujo de hoy si llega la semilla, con el nombre del equipo', () => {
    const k = renderToStaticMarkup(<WornJerseyIcon worn={{ kind: 'team' }} team={team} size={28} />)
    expect(k).toContain('data-ui="Kit"')
    expect(k).toContain('data-kit="halves.red.blue"')
    expect(k).toContain('aria-label="Mistral Racing kit"')
    const legacy = renderToStaticMarkup(
      <WornJerseyIcon
        worn={{ kind: 'team' }}
        team={{ name: 'Mistral Racing', legacySeed: 'seed-1' }}
        size={28}
      />,
    )
    expect(legacy).toContain('data-ui="LegacyJersey"')
    expect(legacy).toContain('aria-label="Mistral Racing kit"')
  })

  it('sin equipo, el hueco de su ancho, que no se lee', () => {
    const s = renderToStaticMarkup(<WornJerseyIcon worn={{ kind: 'team' }} team={null} size={28} />)
    expect(s).toMatch(/^<span aria-hidden="true"[^>]* style="width:28px;height:28px"><\/span>$/)
  })

  it('surface llega al filete de los tres dibujos nuevos', () => {
    for (const worn of [
      leader,
      { kind: 'champion', title: TITLE } as const,
      { kind: 'team' } as const,
    ])
      expect(
        renderToStaticMarkup(<WornJerseyIcon worn={worn} team={team} size={28} surface="dark" />),
      ).toContain('stroke="rgb(255 255 255 / 0.6)"')
  })

  it('wornTeamOf: el código del día si lo trae, y si no la semilla; null sin equipo', () => {
    const card = (t: RiderCard['team']): RiderCard => ({
      ix: 0,
      id: 'r0',
      name: 'Rider',
      bib: 1,
      country: 'IT',
      gender: 'M',
      team: t,
      worn: { kind: 'team' },
      lines: [],
      notoriety: 8,
      own: false,
    })
    expect(
      wornTeamOf(card({ id: 't', name: 'Mistral', jerseySeed: 's', kit: 'plain.navy' })),
    ).toEqual({ name: 'Mistral', kit: 'plain.navy' })
    expect(wornTeamOf(card({ id: 't', name: 'Mistral', jerseySeed: 's', kit: null }))).toEqual({
      name: 'Mistral',
      legacySeed: 's',
    })
    expect(wornTeamOf(card(null))).toBeNull()
  })
})
