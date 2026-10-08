import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CueCard } from './CueCard'
import { ProfileStrip } from './ProfileStrip'
import { castOf, headOf, instantOf, range } from './__fixtures__/screen'

/**
 * EL PLANO Y LOS CURSORES QUE SE VAN (docs/retransmision.md §6.1, §6.2 y §6.5; D-03, D-21, D-57; 6a):
 * render estático, como `GroupBar.test.tsx`. El rótulo va en una región viva educada que está siempre,
 * con o sin rótulo, y ocupa su sitio; y el cursor de un grupo que se va se pinta sin número.
 */

describe('CueCard · el rótulo del momento, uno a la vez (§6.5)', () => {
  it('sin rótulo, la región viva está y está vacía', () => {
    const html = renderToStaticMarkup(<CueCard cue={null} />)
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('min-h-[72px]')
    expect(html).not.toContain('data-cue-class')
  })

  it('con rótulo, la palabra de arriba y lo que la sigue, y su clase', () => {
    const html = renderToStaticMarkup(
      <CueCard cue={{ text: { title: 'ATTACK', detail: '21 Luca Bertolini' }, cls: 2, seq: 1 }} />,
    )
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('data-cue-class="2"')
    expect(html).toContain('>ATTACK<')
    expect(html).toContain('>21 Luca Bertolini<')
    const bare = renderToStaticMarkup(
      <CueCard cue={{ text: { title: 'CRASH', detail: null }, cls: 3, seq: 2 }} />,
    )
    expect(bare).toContain('>CRASH<')
    expect(bare).toContain('bg-red-700')
  })
})

describe('ProfileStrip · los cursores del reproductor (D-03)', () => {
  const cast = castOf(30)
  const head = headOf(cast, { clock: 'exact' })
  const instant = instantOf([
    { members: [0, 1, 2], km: 70.1 },
    { members: range(3, 30), km: 69.5, gapS: 30, kind: 'peloton' },
  ])

  it('sin cursores dados, uno por grupo con alguien dentro y su número', () => {
    const empty = instantOf([
      { members: [], km: 70.2 },
      { members: range(0, 30), km: 69.5, kind: 'peloton' },
    ])
    const html = renderToStaticMarkup(
      <ProfileStrip profile={head.profile} lengthKm={185.04} instant={empty} clock="exact" />,
    )
    expect(html.match(/data-cursor="/g)).toHaveLength(1)
    expect(html).toContain('data-cursor="1"')
  })

  it('el que se va, sin número y debajo de los demás', () => {
    const html = renderToStaticMarkup(
      <ProfileStrip
        profile={head.profile}
        lengthKm={185.04}
        instant={instant}
        clock="exact"
        cursors={[
          { key: 'peloton', g: 1, km: 69.5, number: 2, own: false, ghost: 0 },
          { key: 'mov-1', g: 0, km: 70.1, number: 1, own: false, ghost: 0 },
          { key: 'mov-3', g: 2, km: 69.5, number: 3, own: false, ghost: 1 },
        ]}
      />,
    )
    const order = [...html.matchAll(/data-cursor="([^"]+)"/g)].map((m) => m[1])
    expect(order).toEqual(['leaving', '2', '1'])
    // dos números, los de los grupos que están (los de los puertos van con otra letra)
    const numbers = [...html.matchAll(/font-size="8" text-anchor="middle" fill="[^"]+">(\d+)</g)]
    expect(numbers.map((m) => m[1])).toEqual(['2', '1'])
  })
})
