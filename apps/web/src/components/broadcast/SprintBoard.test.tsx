import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { SprintNow } from '../../domain/broadcast/sprintView'
import { SprintBoard } from './SprintBoard'
import { castOf, leaderWorn } from './__fixtures__/screen'

/**
 * EL ÚLTIMO KM COMO EN LA TELE (W5c): el panel que sustituye a la barra de grupos. Render estático, con
 * un momento del final escrito a mano: el 3 lanzado delante, el 5 tirando de su velocista, el 1 (del
 * espectador) encerrado, el 4 cediendo.
 */

const cast = castOf(10, { 1: { own: true }, 3: { worn: leaderWorn('points') } })
const now: SprintNow = {
  toGoM: 180,
  rows: [
    { rider: 3, behindM: 0, role: 'launched' },
    { rider: 5, behindM: 0.6, role: 'leadOut' },
    { rider: 1, behindM: 1.3, role: 'boxed' },
    { rider: 4, behindM: 2.2, role: 'fading' },
    { rider: 0, behindM: 3, role: 'bunch' },
    { rider: 2, behindM: 3.4, role: 'bunch' },
    { rider: 6, behindM: 4.1, role: 'bunch' },
  ],
}

const textOf = (m: string): string =>
  m
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

describe('SprintBoard · el último km (W5c)', () => {
  const html = renderToStaticMarkup(<SprintBoard now={now} cast={cast} />)

  it('la distancia, y cada uno en su orden con su nombre, lo que hace y sus metros', () => {
    const text = textOf(html)
    expect(text).toContain('Final sprint 180 m to go')
    // el maillot de líder dice su nombre (su título accesible)
    expect(text).toContain(`1 ${cast[3]!.name} Points leader Sprinting`)
    expect(text).toContain(`2 ${cast[5]!.name} Lead-out +0.6 m`)
    expect(text).toContain(`3 ${cast[1]!.name} Boxed in +1.3 m`)
    expect(text).toContain(`4 ${cast[4]!.name} Fading +2.2 m`)
    expect(text).toContain(`5 ${cast[0]!.name} +3.0 m`)
  })

  it('una fila por corredor, con su papel; en el teléfono, las seis primeras', () => {
    const rows = [...html.matchAll(/<li[^>]*data-sprint-row="([a-zA-Z]+)"[^>]*class="([^"]*)"/g)]
    expect(rows.map((m) => m[1])).toEqual(now.rows.map((r) => r.role))
    expect(rows.slice(0, 6).every((m) => !m[2]!.includes('hidden'))).toBe(true)
    expect(rows[6]![2]).toContain('hidden sm:flex')
  })

  it('el del espectador, en negrita y en oro en la carretera; el primero, en el acento', () => {
    expect(html).toMatch(/data-sprint-row="boxed"[^>]*class="[^"]*font-semibold/)
    expect(html).toMatch(/<circle[^>]*data-dot="1"[^>]*class="fill-gold-ink"/)
    expect(html).toMatch(/<circle[^>]*data-dot="3"[^>]*class="fill-accent"/)
    expect([...html.matchAll(/<circle/g)]).toHaveLength(now.rows.length)
  })

  it('la carretera: el primero, junto a la línea; el último de la lista, el más lejos', () => {
    const cx = (r: number): number =>
      Number(new RegExp(`<circle[^>]*data-dot="${r}"[^>]*cx="([0-9.]+)"`).exec(html)![1])
    expect(cx(3)).toBeGreaterThan(cx(5))
    expect(cx(5)).toBeGreaterThan(cx(6))
  })

  it('el maillot de líder del primero, con su nombre, y no es una región viva', () => {
    expect(html).toMatch(/^<div[^>]*data-ui="SprintBoard"[^>]*aria-live="off"/)
    expect(html).toContain('data-kit')
  })
})
