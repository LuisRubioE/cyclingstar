import { BROADCAST } from '@cyclingstar/shared'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ClockNotice } from './ClockNotice'
import { GroupBar } from './GroupBar'
import { ProfileStrip } from './ProfileStrip'
import { castOf, headOf, instantOf, leaderWorn, range } from './__fixtures__/screen'

/**
 * LA BARRA DE GRUPOS DE `Watch` (docs/retransmision.md §6.2, §6.3, 6-c y 6-e; paso 3c), con lo
 * estimado marcado (§3.8): render estático con `renderToStaticMarkup`, como `leaderJerseys.test.tsx`.
 * Una fila por grupo en orden de carretera, con su número, sus palabras (`GROUP_WORDS`), su tamaño y
 * su hueco; en el móvil, `mobileGroupRows` filas elegidas por prioridad y el resto plegado en
 * `+3 groups · 41 riders`; un grupo de hasta `nameWholeGroupUpTo` dice quién va, cada uno con el
 * maillot de su `RiderCard.worn`; y con el reloj estimado del adaptador, el km de todo grupo que no es
 * la cabeza con `~`, su cursor hueco en el perfil y el aviso. El 6b la amplía (§16.6).
 */

const html = (node: ReactElement): string => renderToStaticMarkup(node)

/** El texto que se lee, sin etiquetas y con las entidades de React deshechas. */
function textOf(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Las filas de la barra, en el orden en que se pintan: el HTML de cada una. */
function rowsOf(markup: string): string[] {
  return markup.split('data-group-row=').slice(1)
}

/** Cuántas veces sale un texto alternativo. */
const count = (markup: string, label: string): number =>
  markup.split(`aria-label="${label}"`).length - 1

const CAST = castOf(176, { 3: { worn: leaderWorn('gc') }, 150: { worn: leaderWorn('points') } })

/**
 * El instante de §6.1: tres, tres y dos delante, el pelotón de 124 con el título, un grupeto de 35,
 * otro de 5 y uno suelto, de 176 en carrera.
 */
function sixPointOne() {
  return instantOf(
    [
      { members: [0, 1, 2], km: 86.51 },
      { members: [3, 4, 5], km: 86.2, gapS: 20, jerseys: ['gc'] },
      { members: [6, 7], km: 85.9, gapS: 40 },
      { members: range(8, 132), km: 84.97, gapS: 226, kind: 'peloton', jerseys: ['points'] },
      { members: range(132, 167), km: 84.6, gapS: 256 },
      { members: range(167, 172), km: 83.5, gapS: 525 },
      { members: [172], km: 82.2, gapS: 803 },
    ],
    { racing: 176 },
  )
}

describe('GroupBar · una fila por grupo (§6.2, §6.3)', () => {
  it('en orden de carretera, con su número y sus palabras; el tamaño detrás de una palabra', () => {
    const markup = html(<GroupBar instant={sixPointOne()} cast={CAST} clock="exact" />)
    const rows = rowsOf(markup)
    expect(rows).toHaveLength(7)
    rows.forEach((row, i) => expect(row.startsWith(`"${i + 1}"`)).toBe(true))
    const text = rows.map((r) => textOf(`<x ${r}`))
    expect(text[0]).toMatch(/^1 /)
    // los de tres o menos, por sus nombres; el pelotón y los grupetos, por su papel con su tamaño
    expect(text[0]).toContain(`${CAST[0]!.name} · ${CAST[1]!.name} · ${CAST[2]!.name}`)
    expect(text[3]).toContain('Bunch · 124')
    expect(text[4]).toContain('Gruppetto · 35')
    expect(text[5]).toContain('Gruppetto · 5')
    expect(text[6]).toContain(CAST[172]!.name)
    // la palabra es de GROUP_WORDS y las mayúsculas, presentación (§6.3)
    expect(rows[3]).toMatch(/class="[^"]*uppercase[^"]*">Bunch</)
  })

  it('el hueco a la cabeza: la fila 1 sin hueco, s.t. por debajo de sameTimeS', () => {
    const inst = instantOf(
      [
        { members: [0, 1, 2], km: 100 },
        { members: [3, 4, 5, 6], km: 99.99, gapS: BROADCAST.sameTimeS - 1 },
        { members: range(7, 176), km: 99.5, gapS: 20, kind: 'peloton' },
      ],
      { racing: 176 },
    )
    const rows = rowsOf(html(<GroupBar instant={inst} cast={CAST} clock="exact" />)).map((r) =>
      textOf(`<x ${r}`),
    )
    expect(rows[0]).not.toMatch(/\+\d|s\.t\./)
    expect(rows[1]).toContain('s.t.')
    expect(rows[1]).not.toMatch(/\+\d/)
    expect(rows[2]).toContain('+0:20')
  })

  it('el grupo del maillot se llama por el maillot, y la fila lleva los maillots de líder que van dentro', () => {
    const inst = instantOf(
      [
        { members: range(20, 30), km: 120 },
        { members: range(0, 20), km: 119, gapS: 75, jerseys: ['gc'] },
        { members: range(30, 176), km: 118, gapS: 140, kind: 'peloton', jerseys: ['points'] },
      ],
      { racing: 176 },
    )
    const markup = html(<GroupBar instant={inst} cast={CAST} clock="exact" />)
    const rows = rowsOf(markup)
    expect(textOf(`<x ${rows[1]!}`)).toContain('Race leader’s group · 20')
    expect(count(rows[1]!, 'Race leader')).toBe(1)
    expect(count(rows[2]!, 'Points leader')).toBe(1)
  })

  it('un solo grupo: Bunch together, con todos', () => {
    const inst = instantOf([{ members: range(0, 176), km: 12, kind: 'peloton' }])
    expect(textOf(html(<GroupBar instant={inst} cast={CAST} clock="exact" />))).toContain(
      'Bunch together · 176',
    )
  })
})

describe('GroupBar · quién va y con qué maillot (§6.2; [DUEÑO 3], en parte)', () => {
  it('un grupo de hasta nameWholeGroupUpTo dice quién va, cada uno con el maillot de su RiderCard.worn', () => {
    // la fuga de cinco con el líder de la general dentro, y el pelotón detrás
    const inst = instantOf(
      [
        { members: [3, 40, 41, 42, 43], km: 60, jerseys: ['gc'] },
        { members: [...range(0, 3), ...range(4, 40), ...range(44, 176)], km: 59, gapS: 95 },
      ],
      { racing: 176 },
    )
    const rows = rowsOf(html(<GroupBar instant={inst} cast={CAST} clock="exact" />))
    const fuga = rows[0]!
    for (const r of [3, 40, 41, 42, 43]) expect(fuga).toContain(CAST[r]!.name)
    // el líder con su maillot, dos veces: en la fila (el maillot que va dentro) y delante de su nombre
    expect(count(fuga, 'Race leader')).toBe(2)
    // los otros cuatro, con la equipación de su equipo
    expect(count(fuga, 'Team jersey')).toBe(4)
    // por dorsal
    const order = [3, 40, 41, 42, 43].map((r) => fuga.indexOf(CAST[r]!.name))
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    // un pelotón de 171 no se nombra entero
    expect(rows[1]).not.toContain(CAST[0]!.name)
  })

  it(`hasta ${BROADCAST.nameWholeGroupUpTo} sí; con uno más, solo los maillots de líder que van dentro`, () => {
    const twelve = range(0, BROADCAST.nameWholeGroupUpTo)
    const thirteen = range(0, BROADCAST.nameWholeGroupUpTo + 1)
    const of = (members: number[]) =>
      instantOf([
        { members, km: 50, jerseys: ['gc'] },
        { members: range(members.length, 176), km: 49, gapS: 60, kind: 'peloton' },
      ])
    const named = rowsOf(html(<GroupBar instant={of(twelve)} cast={CAST} clock="exact" />))[0]!
    expect(count(named, 'Team jersey')).toBe(BROADCAST.nameWholeGroupUpTo - 1)
    const counted = rowsOf(html(<GroupBar instant={of(thirteen)} cast={CAST} clock="exact" />))[0]!
    expect(count(counted, 'Team jersey')).toBe(0)
    expect(count(counted, 'Race leader')).toBe(1)
  })

  it('un grupo de tres o menos se nombra en la propia fila, cada uno con su maillot', () => {
    const rows = rowsOf(html(<GroupBar instant={sixPointOne()} cast={CAST} clock="exact" />))
    expect(count(rows[1]!, 'Race leader')).toBe(1) // el líder, delante de su nombre
    expect(count(rows[1]!, 'Team jersey')).toBe(2)
    expect(count(rows[6]!, 'Team jersey')).toBe(1)
  })

  it('en el móvil, la línea de iconos solo bajo la fila 1 y las del espectador, y los nombres solo en escritorio (6-c)', () => {
    const inst = instantOf(
      [
        { members: range(0, 5), km: 70 },
        { members: range(5, 10), km: 69.5, gapS: 30 },
        { members: range(10, 16), km: 69, gapS: 50, own: true },
        { members: range(16, 176), km: 68, gapS: 90, kind: 'peloton' },
      ],
      { racing: 176 },
    )
    const rows = rowsOf(html(<GroupBar instant={inst} cast={CAST} clock="exact" />))
    const line = (row: string) => row.match(/data-riders-line="([^"]*)"/)?.[1]
    expect(line(rows[0]!)).toBe('mobile')
    expect(line(rows[1]!)).toBe('desktop')
    expect(line(rows[2]!)).toBe('mobile')
    expect(line(rows[3]!)).toBeUndefined()
    // el nombre de cada uno, escondido en el móvil
    expect(rows[0]).toMatch(/class="hidden sm:inline[^"]*">Rider A0</)
  })
})

describe('GroupBar · el móvil: mobileGroupRows filas y el resto plegado (6-c)', () => {
  it(`por encima de ${BROADCAST.mobileGroupRows}, +3 groups · 41 riders, y en carretera las elegidas: la 1, el pelotón y las siguientes`, () => {
    const markup = html(<GroupBar instant={sixPointOne()} cast={CAST} clock="exact" />)
    expect(textOf(markup)).toContain('+3 groups · 41 riders')
    const hidden = rowsOf(markup).map((r) => /data-mobile="folded"/.test(r.slice(0, 200)))
    expect(hidden).toEqual([false, false, false, false, true, true, true])
  })

  it('las del espectador y las que llevan un maillot van antes que las siguientes por carretera', () => {
    const base = sixPointOne()
    const own = {
      ...base,
      groups: base.groups.map((g) => (g.number === 6 ? { ...g, own: true } : g)),
    }
    const markup = html(<GroupBar instant={own} cast={CAST} clock="exact" />)
    const hidden = rowsOf(markup).map((r) => /data-mobile="folded"/.test(r.slice(0, 200)))
    // la 1, el pelotón (4), la del espectador (6) y la del líder (2); se pliegan la 3, la 5 y la 7
    expect(hidden).toEqual([false, false, true, false, true, false, true])
    expect(textOf(markup)).toContain('+3 groups · 38 riders')
  })

  it('desplegada, ninguna plegada; con cuatro grupos o menos, nada que plegar', () => {
    const open = html(<GroupBar instant={sixPointOne()} cast={CAST} clock="exact" expanded />)
    expect(open).not.toContain('data-mobile="folded"')
    expect(textOf(open)).not.toContain('groups ·')
    const four = instantOf([
      { members: [0, 1, 2], km: 10 },
      { members: [3, 4], km: 9.9, gapS: 5 },
      { members: [5], km: 9.8, gapS: 8 },
      { members: range(6, 176), km: 9.5, gapS: 30, kind: 'peloton' },
    ])
    const markup = html(<GroupBar instant={four} cast={CAST} clock="exact" />)
    expect(markup).not.toContain('data-mobile="folded"')
    expect(textOf(markup)).not.toContain('groups ·')
  })
})

describe('GroupBar · los que van en tránsito (6-e)', () => {
  it('se cuentan bajo la fila del grupo que dejaron, hacia atrás o hacia delante', () => {
    const base = sixPointOne()
    const inst = {
      ...base,
      inTransit: [
        // tres que se descuelgan del pelotón (g 3) hacia el grupeto (g 4), y dos que saltan del 2 al 1
        ...[130, 131, 129].map((rider) => ({ rider, from: 3, to: 4, gap: base.groups[3]!.gap })),
        ...[6, 7].map((rider) => ({ rider, from: 2, to: 1, gap: base.groups[2]!.gap })),
      ],
    }
    const rows = rowsOf(html(<GroupBar instant={inst} cast={CAST} clock="exact" />)).map((r) =>
      textOf(`<x ${r}`),
    )
    expect(rows[3]).toContain('↓ 3 dropping back')
    expect(rows[2]).toContain('↑ 2 bridging across')
    expect(rows[0]).not.toMatch(/dropping|bridging/)
  })
})

describe('lo estimado, marcado (§3.8): el km con ~, el cursor hueco y el aviso', () => {
  const head = headOf(CAST)

  it("con clock: 'estimated', el km de todo grupo que no es la cabeza lleva ~", () => {
    const rows = rowsOf(html(<GroupBar instant={sixPointOne()} cast={CAST} clock="estimated" />))
    expect(rows[0]).toContain('km 86.5')
    expect(rows[0]).not.toContain('~')
    for (const row of rows.slice(1)) expect(row).toMatch(/km ~\d+\.\d/)
    expect(rows[3]).toContain('km ~85.0')
  })

  it("con clock: 'exact', ninguno", () => {
    const markup = html(<GroupBar instant={sixPointOne()} cast={CAST} clock="exact" />)
    expect(markup).not.toContain('~')
    expect(rowsOf(markup)[3]).toContain('km 85.0')
  })

  it('en el perfil, el cursor de todo grupo que no es la cabeza va hueco con el reloj estimado, y lleno con el exacto', () => {
    const cursors = (markup: string) => [
      ...markup.matchAll(/<circle[^>]*data-cursor="(\d+)"[^>]*>/g),
    ]
    const est = html(
      <ProfileStrip
        profile={head.profile}
        lengthKm={head.stage.lengthKm}
        instant={sixPointOne()}
        clock="estimated"
      />,
    )
    const estCursors = cursors(est)
    expect(estCursors).toHaveLength(7)
    for (const [tag, n] of estCursors.map((m) => [m[0], m[1]] as const))
      if (n === '1') expect(tag).not.toContain('fill="none"')
      else expect(tag).toContain('fill="none"')
    const exact = html(
      <ProfileStrip
        profile={head.profile}
        lengthKm={head.stage.lengthKm}
        instant={sixPointOne()}
        clock="exact"
      />,
    )
    expect(cursors(exact)).toHaveLength(7)
    expect(exact).not.toContain('fill="none"')
  })

  it('el aviso: Recorded before full race data, y debajo, Positions of the groups behind are estimated', () => {
    const text = textOf(html(<ClockNotice clock="estimated" />))
    expect(text).toBe('Recorded before full race data Positions of the groups behind are estimated')
    expect(html(<ClockNotice clock="exact" />)).toBe('')
  })
})

describe('ProfileStrip · el perfil con un cursor por grupo y el puerto que viene (§6.2)', () => {
  const head = headOf(CAST)
  const at = (km: number) =>
    html(
      <ProfileStrip
        profile={head.profile}
        lengthKm={head.stage.lengthKm}
        instant={instantOf([{ members: range(0, 176), km, kind: 'peloton' }])}
        clock="exact"
      />,
    )

  it('con la cabeza subiendo: el nombre, la categoría y los km hasta la cima', () => {
    expect(textOf(at(86.5))).toContain('Côte de Monteynard · Cat. 2 · summit in 5.5 km')
  })

  it('antes del puerto: Next, con los km hasta la cima; sin nombre, la categoría sola', () => {
    expect(textOf(at(40))).toContain('Next: Côte de Monteynard · Cat. 2 · in 52.0 km')
    expect(textOf(at(95))).toContain('Next: Cat. 3 climb · in 18.0 km')
    expect(textOf(at(120))).not.toContain('Next:')
  })

  it('el cursor de cada grupo lleva su número de carretera', () => {
    const markup = html(
      <ProfileStrip
        profile={head.profile}
        lengthKm={head.stage.lengthKm}
        instant={sixPointOne()}
        clock="exact"
      />,
    )
    for (let n = 1; n <= 7; n++) expect(markup).toContain(`data-cursor="${n}"`)
  })
})
