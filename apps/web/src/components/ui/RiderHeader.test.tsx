import type { ChampionTitle } from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { RiderHeader, type RiderHeaderProps } from './RiderHeader'

/**
 * `RiderHeader` (E3, docs/visual.md §4.6; PR 9b): la bandera a 24, el nombre como `h1` y el maillot a 40,
 * contiguos y en ese orden (D-00c); debajo, `Player`, la salud y el papel. Y sus tres estados de consulta:
 * cargando, no encontrado y el fallo.
 */

const JOSE = { id: 'r214', name: 'José Quintáns', human: true, country: 'ES' } as const
const pinta = (p: RiderHeaderProps) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <RiderHeader {...p} />
    </MemoryRouter>,
  )
const texto = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
const LISTA = {
  rider: JOSE,
  team: { name: 'Mistral Racing', legacySeed: 'seed' },
  player: true,
  role: 'Climber',
} as const

describe('RiderHeader', () => {
  it('lista: la bandera a 24, el h1 y el maillot a 40, en ese orden', () => {
    const s = pinta(LISTA)
    expect(s).toMatch(/^<header data-ui="RiderHeader" data-variant="player" data-state="ready"/)
    const en = (x: string) => s.indexOf(x)
    expect(en('data-ui="Flag"')).toBeLessThan(en('<h1'))
    expect(en('<h1')).toBeLessThan(en('data-kit="team"'))
    expect(s).toContain('aria-label="Spain"')
    expect(s).toContain('width:32px;height:24px')
    expect(s).toMatch(/<h1[^>]*><span[^>]*>José <\/span>Quintáns<\/h1><span/)
    expect(s).toMatch(/data-kit="team"/)
    expect(s).toMatch(/width="40" height="40"[^>]*aria-label="Mistral Racing kit"/)
  })

  it('debajo: Player, la salud si no está sano y el papel', () => {
    expect(texto(pinta(LISTA))).toBe('José Quintáns Player Climber')
    const s = pinta({ ...LISTA, health: { text: 'Injured', tone: 'bad' } })
    expect(texto(s)).toBe('José Quintáns Player Injured Climber')
    expect(s).toMatch(/data-ui="Chip" data-variant="bad"/)
    expect(texto(pinta({ ...LISTA, player: false }))).toBe('José Quintáns Climber')
  })

  it('con un título vigente, el maillot de campeón, sin la bandera de al lado', () => {
    const titulo: ChampionTitle = {
      scope: 'national',
      country: 'ES',
      discipline: 'road',
      category: 'elite',
      season: 0,
      validFromDay: 1,
      validToDay: 365,
      source: { raceKey: 'r:s0', stageDay: 1 },
      provisional: true,
    }
    const s = pinta({ ...LISTA, champion: titulo })
    expect(s).toContain('data-kit="champion"')
    expect(s.match(/data-ui="Flag"/g)).toHaveLength(1)
  })

  it('un agente libre: el hueco del maillot, de 40', () => {
    const s = pinta({ ...LISTA, team: null })
    expect(s).not.toContain('data-kit=')
    expect(s).toContain('style="width:40px;height:40px"')
  })

  it('cargando: el esqueleto, con su estado para el lector', () => {
    const s = pinta({ state: 'loading' })
    expect(s).toMatch(
      /^<header data-ui="RiderHeader" data-variant="default" data-state="loading"[^>]*role="status" aria-label="Loading the rider"/,
    )
    expect(s).toContain('data-ui="Skeleton" data-variant="header"')
    expect(texto(s)).toBe('')
  })

  it("no encontrado: This rider doesn't exist.", () => {
    const s = pinta({ state: 'notFound' })
    expect(s).toContain('data-state="error"')
    expect(s).toContain('data-kind="notFound"')
    expect(texto(s)).toContain('This rider doesn&#x27;t exist.')
  })

  it('con un fallo: ErrorState con Try again', () => {
    const s = pinta({ state: 'error', onRetry: () => undefined })
    expect(s).toContain('data-kind="server"')
    expect(texto(s)).toContain('Try again')
  })
})
