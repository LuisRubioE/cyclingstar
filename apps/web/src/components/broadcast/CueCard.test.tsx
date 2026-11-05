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
    // re-sellado en el 17a (E3, §14.5; 14-b): de 72 a 88 px, el título y dos renglones de 28 con maillot;
    // y en el 20, medido en Watch a 320 y a 360 px: las fichas de corredor llegan a 160 (`DROPPED` con su
    // maillot de líder), así que de 88 a 160; solo las tablas pasan de ahí (14-b, «la clase sube»)
    expect(html).toContain('min-h-40')
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
    // RE-SELLADO EN EL PR 20 (E3, docs/visual.md §14.5 y §16.3; 14-a): miraba `bg-red-700`; la tarjeta va
    // en el ámbito oscuro con los fondos `bad`, `navy-dark` y `navy`, y el test mira su clase y su ámbito
    expect(bare).toMatch(
      /data-cue-class="3"[^>]*data-surface="dark"|data-surface="dark"[^>]*data-cue-class="3"/,
    )
  })

  it('sobre bad, el secundario va en ink y nunca en ink-2, que ahí no está medido (14-a)', () => {
    const cast = castOf(30, {
      1: {
        lines: [
          { kind: 'gc', rank: 3, deficitS: 40, from: { raceKey: 'race-france:s0', stageDay: 6 } },
        ],
      },
    })
    const head = headOf(cast, { clock: 'exact' })
    const instant = instantOf([
      { members: [1, 2, 3], km: 70 },
      { members: range(4, 30), km: 69, gapS: 40, kind: 'peloton' },
    ])
    const { text, ...body } = cueBodyOf(
      { kind: 'rider', t: 100, rider: 1, context: 'break_round' },
      { cast, instant, profile: head.profile, own: new Set() },
    )
    const onBad = renderToStaticMarkup(<CueCard cue={{ text, cls: 3, seq: 1, body }} />)
    expect(onBad).toContain('data-rider-card="1"')
    expect(onBad).not.toMatch(/\btext-ink-2\b/)
    const onNavy = renderToStaticMarkup(<CueCard cue={{ text, cls: 2, seq: 1, body }} />)
    expect(onNavy).toMatch(/\btext-ink-2\b/)
  })

  it('las tres clases, en el ámbito oscuro: la meta, la caza y el corte; las de oscuro; y las demás (14-a)', () => {
    for (const cls of [1, 2, 3] as const) {
      const html = renderToStaticMarkup(
        <CueCard cue={{ text: { title: 'KOM', detail: 'Côte de Monteynard' }, cls, seq: cls }} />,
      )
      expect(html).toContain(`data-cue-class="${cls}"`)
      expect(html).toContain('data-surface="dark"')
    }
  })
})

/**
 * LO QUE NO SE CORTA (E3, docs/visual.md §14.5; H-07, Ruso-040; PR 20): el título más largo que puede salir
 * ([DOC 40]) va entero en el marcado, en dos renglones a 320 y a 360 px, que mira la prueba del teléfono en
 * `/_ui`; y el nombre de un corredor no se corta nunca (§6.4): parte de línea.
 */
describe('CueCard · el título más largo y un nombre que parte (§14.5)', () => {
  it('el título de 59 caracteres, entero, con la clase de la tarjeta', () => {
    const title = 'U23 time trial champion of Saint Vincent and the Grenadines'
    expect(title).toHaveLength(59)
    const html = renderToStaticMarkup(
      <CueCard cue={{ text: { title, detail: null }, cls: 2, seq: 1 }} />,
    )
    expect(html).toContain(`>${title}<`)
    expect(html).toContain('data-cue-class="2"')
    expect(html).not.toMatch(/\btruncate\b/)
  })

  it('un nombre de 28 caracteres en la carta del corredor, entero y sin truncate', () => {
    const long = 'Alexandros Papadimitropoulos'
    expect(long).toHaveLength(28)
    const cast = castOf(30, { 1: { name: long } })
    const head = headOf(cast, { clock: 'exact' })
    const instant = instantOf([
      { members: [1, 2, 3], km: 70 },
      { members: range(4, 30), km: 69, gapS: 40, kind: 'peloton' },
    ])
    const { text, ...body } = cueBodyOf(
      { kind: 'rider', t: 100, rider: 1, context: 'break_round' },
      { cast, instant, profile: head.profile, own: new Set() },
    )
    const html = renderToStaticMarkup(<CueCard cue={{ text, cls: 2, seq: 1, body }} />)
    expect(html).toContain(`>${long}<`)
    expect(html).not.toMatch(/\btruncate\b/)
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
    // dos números, los de los grupos que están. RE-SELLADO EN EL PR 20 (E3, docs/visual.md §14.4; 14-h):
    // los buscaba por su `font-size` de 8 unidades dentro del dibujo; las cotas salen del SVG escalado a
    // una capa sin `viewBox`, a 12 px, y se buscan por su `data-label`
    const numbers = [...html.matchAll(/data-label="cursor"[^>]*>(\d+)</g)]
    expect(numbers.map((m) => m[1])).toEqual(['2', '1'])
  })
})

/**
 * LAS COTAS, A 12 PX (E3, docs/visual.md §14.4; Ruso-039, 14-h; PR 20): el dibujo es un `viewBox` de 600 ×
 * 100 que se pinta a 310 px a 360, así que un `<text>` dentro no llegaba a 12 px con ningún `font-size`
 * razonable. Las categorías de los puertos y los números de los cursores van en una capa encima, sin
 * `viewBox`, colocadas con el mismo `x(km)` en porcentaje; el dibujo ya no lleva texto, y los colores
 * son tokens.
 */
describe('ProfileStrip · las cotas fuera del dibujo y los tokens (§14.4)', () => {
  const cast = castOf(30)
  const head = headOf(cast, { clock: 'exact' })
  const instant = instantOf([
    { members: [0, 1, 2], km: 70.1 },
    { members: range(3, 30), km: 69.5, gapS: 30, kind: 'peloton' },
  ])
  const html = renderToStaticMarkup(
    <ProfileStrip profile={head.profile} lengthKm={185.04} instant={instant} clock="exact" />,
  )
  const svgs = [...html.matchAll(/<svg[^>]*>[\s\S]*?<\/svg>/g)].map((m) => m[0])

  it('el dibujo, con su viewBox y sin un solo texto', () => {
    const drawing = svgs.find((s) => s.includes('viewBox="0 0 600 100"'))!
    expect(drawing).toContain('role="img"')
    expect(drawing).not.toContain('<text')
  })

  it('las cotas, en una capa sin viewBox y escondida del lector, en porcentaje del ancho', () => {
    const labels = svgs.find((s) => s.includes('data-label'))!
    expect(labels).not.toContain('viewBox')
    expect(labels).toMatch(/^<svg[^>]*aria-hidden="true"/)
    const climbs = [...labels.matchAll(/data-label="climb"[^>]*x="([\d.]+)%"[^>]*>([^<]+)</g)]
    // el de 2.ª en la cima del km 92 de 185,04 y el de 3.ª en la del 113
    expect(climbs.map((m) => [Number(m[1]).toFixed(1), m[2]])).toEqual([
      ['49.7', '2'],
      ['61.1', '3'],
    ])
    expect([...labels.matchAll(/data-label="cursor"[^>]*>(\d+)</g)].map((m) => m[1])).toEqual([
      '2',
      '1',
    ])
  })

  it('sin un color escrito a mano: todos son tokens', () => {
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b/i)
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

  // Re-sellado en el 17a (E3, docs/visual.md §14.1; D-00c): hasta entonces el rótulo abría con el
  // maillot y ponía la bandera tras el nombre; ahora el dorsal, la bandera, el nombre y el maillot, y el
  // equipo en el segundo renglón, con su maillot porque el corredor lleva el de campeón.
  it('el rótulo de corredor: el dorsal, la bandera, el nombre y el maillot de campeón; debajo, el equipo y el titular', () => {
    const html = card({ kind: 'rider', t: 100, rider: 1, context: 'break_round' })
    expect(html).toContain('data-rider-card="1"')
    const [bib, flag, name, jersey] = [
      html.indexOf('>#2<'),
      html.indexOf('data-ui="Flag"'),
      html.indexOf(cast[1]!.name),
      html.indexOf('data-ui="ChampionJersey"'),
    ]
    expect(bib).toBeGreaterThan(0)
    expect(bib < flag && flag < name && name < jersey).toBe(true)
    expect(html).toContain('aria-label="Champion of Italy"')
    // a 28 px y con el filete claro: el rótulo va sobre oscuro
    expect(html).toMatch(/data-ui="ChampionJersey"[^>]*width="28"/)
    expect(html).toContain('stroke="rgb(255 255 255 / 0.6)"')
    const team = html.slice(html.indexOf('data-rider-team'))
    expect(team).toContain('aria-label="Team 1 kit"')
    expect(team).toContain('Team 1')
    expect(html).toContain('Champion of Italy</span>')
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
