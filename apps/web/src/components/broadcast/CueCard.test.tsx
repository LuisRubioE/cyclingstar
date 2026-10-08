import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { cueBodyOf } from '../../domain/broadcast/screen'
import { CueCard } from './CueCard'
import { ProfileStrip } from './ProfileStrip'
import { castOf, headOf, instantOf, leaderWorn, range } from './__fixtures__/screen'

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

describe('CueCard · la carta del corredor, la lista de la fuga y el cuadro de diferencias (§6.7, §7.1; 6b)', () => {
  const italy = {
    kind: 'champion' as const,
    title: {
      scope: 'national' as const,
      country: 'IT',
      discipline: 'road' as const,
      category: 'elite' as const,
      season: 0,
      validFromDay: 179,
      validToDay: 543,
      source: { raceKey: 'nc-it-road:s0', stageDay: 1 },
      provisional: true,
    },
  }
  const from = { raceKey: 'race-france:s0', stageDay: 6 }
  const cast = castOf(30, {
    1: { worn: italy, country: 'IT', notoriety: 4 },
    2: { worn: leaderWorn('kom'), notoriety: 2 },
    3: { lines: [{ kind: 'gc', rank: 14, deficitS: 242, from }], own: true },
  })
  const head = headOf(cast, { clock: 'exact' })
  const instant = instantOf([
    { members: [1, 2, 3, 4, 5], km: 70 },
    { members: range(6, 28), km: 69, gapS: 226, kind: 'peloton', jerseys: ['gc'] },
    { members: [28, 29], km: 66, gapS: 400 },
  ])
  const ctx = { cast, instant, profile: head.profile, own: new Set([3]) }
  const card = (cue: Parameters<typeof cueBodyOf>[0]) => {
    const { text, ...body } = cueBodyOf(cue, ctx)
    return renderToStaticMarkup(<CueCard cue={{ text, cls: 2, seq: 1, body }} />)
  }

  it('el rótulo de corredor: el maillot de campeón, dorsal, nombre, bandera, equipo y titular', () => {
    const html = card({ kind: 'rider', t: 100, rider: 1, context: 'break_round' })
    expect(html).toContain('data-rider-card="1"')
    expect(html).toContain('data-champion-mark')
    expect(html).toContain('aria-label="Champion of Italy"')
    expect(html).toContain('Team 1')
    expect(html).toContain('>Champion of Italy<')
    // el corredor propio, con su marca y su línea de la general
    const own = card({ kind: 'rider', t: 100, rider: 3, context: 'own' })
    expect(own).toContain('Your rider')
    expect(own).toContain('14th overall +4:02')
  })

  it('la lista de la fuga: los cinco maillots a la vez, por dorsal', () => {
    const html = card({ kind: 'break_formed', t: 100, group: 0, riders: [5, 1, 4, 3, 2], gapS: 48 })
    const list = html.slice(html.indexOf('data-cue-riders'))
    expect(list.match(/<li/g)).toHaveLength(5)
    expect(list).toContain('aria-label="Champion of Italy"')
    expect(list).toContain('aria-label="Mountains leader"')
    expect(list.indexOf(cast[1]!.name)).toBeLessThan(list.indexOf(cast[5]!.name))
  })

  it('la frase de la fuga, con el campeón por su título', () => {
    const html = card({
      kind: 'break_presented',
      t: 100,
      group: 0,
      named: [2, 1],
      others: 3,
      riders: [1, 2, 3, 4, 5],
    })
    expect(html).toContain('The mountains leader and the champion of Italy go clear with')
  })

  it('el cuadro de diferencias: hasta el pelotón, y lo de detrás en una fila', () => {
    const html = card({
      kind: 'time_check',
      t: 100,
      rows: [
        { number: 1, group: 0, size: 5, gapS: 0, jerseys: [], names: null },
        { number: 2, group: 1, size: 22, gapS: 226, jerseys: ['gc'], names: null },
      ],
    })
    const rows = html.slice(html.indexOf('data-cue-rows'))
    expect(rows).toContain('BUNCH · 22')
    expect(rows).toContain('+3:46')
    expect(rows).toContain('+1 group behind · 2 riders')
    expect(rows).toContain('aria-label="Race leader"')
  })
})
