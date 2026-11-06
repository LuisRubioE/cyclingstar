import { BROADCAST, type GroupDetail, type PullMotive } from '@cyclingstar/shared'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ClockNotice } from './ClockNotice'
import { Jersey } from '../Jersey'
import { ChampionJersey } from '../ui/ChampionJersey'
import { Kit } from '../ui/Kit'
import { LeaderJersey } from '../ui/LeaderJersey'
import { jerseyStyle } from '../visuals'
import { CueCard } from './CueCard'
import { GroupBar, GroupRow, sameBar } from './GroupBar'
import { ProfileStrip } from './ProfileStrip'
import { WornJerseyIcon } from './WornJerseyIcon'
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
    // los de tres o menos, por sus nombres, con el dorsal delante (D-00c, desde el 17a); el pelotón y los
    // grupetos, por su papel con su tamaño
    expect(text[0]).toContain(`#1 ${CAST[0]!.name} · #2 ${CAST[1]!.name} · #3 ${CAST[2]!.name}`)
    expect(text[3]).toContain('Bunch · 124')
    expect(text[4]).toContain('Gruppetto · 35')
    expect(text[5]).toContain('Gruppetto · 5')
    expect(text[6]).toContain(CAST[172]!.name)
    // la palabra es de GROUP_WORDS y las mayúsculas, presentación (§6.3). RE-SELLADO EN EL PR 20 (E3,
    // docs/visual.md §14.4 y §16.3): miraba la clase `uppercase`; el rótulo pasa a `caption` 600 en
    // versales con los tokens, y el test mira `data-caps`, que dice lo mismo sin depender de las clases
    expect(rows[3]).toMatch(/data-caps=""[^>]*>Bunch</)
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

/** Las equipaciones que se pintan, por su texto: `Team 1 kit` (`LegacyJersey` y `Kit`, §9.10). */
const kits = (markup: string): number => (markup.match(/aria-label="Team \d kit"/g) ?? []).length

/** Las fichas de equipo de la línea, por su texto: `Team 1, 2 riders`. */
const chips = (markup: string): string[] =>
  [...markup.matchAll(/data-chip="team" role="img" aria-label="([^"]+)"/g)].map((m) => m[1]!)

describe('GroupBar · quién va y con qué maillot (§6.2; [DUEÑO 3]; E3, §14.4)', () => {
  // Re-sellado en el 17a (E3, docs/visual.md §14.4 y §16.3; D-00b): hasta entonces, bajo un grupo de 4 a
  // 12, un maillot de 13 px por corredor; doce a 28 no caben en la barra a 360, así que va un `Kit` por
  // equipo con su cuenta y, delante, los de líder y campeón. Los nombres, en la lista del grupo.
  it('un grupo de hasta nameWholeGroupUpTo lleva su línea de equipos: el líder delante y un Kit por equipo con su cuenta', () => {
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
    // el líder con su maillot, dos veces: en la fila (el maillot que va dentro) y delante en la línea
    expect(count(fuga, 'Race leader')).toBe(2)
    // los otros cuatro, por equipo (el corredor ix va en el equipo ix % 3): de más a menos, y a
    // igualdad por el dorsal más bajo
    expect(chips(fuga)).toEqual(['Team 1, 2 riders', 'Team 2, 1 rider', 'Team 0, 1 rider'])
    expect(kits(fuga)).toBe(3)
    // la línea no nombra a nadie: los nombres van en la lista, al tocar la fila
    for (const r of [40, 41, 42, 43]) expect(fuga).not.toContain(CAST[r]!.name)
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
    // once por equipo y el líder delante: las cuentas y los de delante suman el grupo
    expect(chips(named)).toEqual(['Team 1, 4 riders', 'Team 2, 4 riders', 'Team 0, 3 riders'])
    const counted = rowsOf(html(<GroupBar instant={of(thirteen)} cast={CAST} clock="exact" />))[0]!
    expect(chips(counted)).toEqual([])
    expect(kits(counted)).toBe(0)
    expect(count(counted, 'Race leader')).toBe(1)
  })

  it('un grupo de tres o menos se nombra en la propia fila: el dorsal, la bandera, el nombre y su maillot (D-00c)', () => {
    const rows = rowsOf(html(<GroupBar instant={sixPointOne()} cast={CAST} clock="exact" />))
    expect(count(rows[1]!, 'Race leader')).toBe(1) // el líder, tras su nombre
    expect(kits(rows[1]!)).toBe(2)
    expect(kits(rows[6]!)).toBe(1)
    // en el orden de D-00c, y sin cortar el nombre: la fila parte de línea
    const uno = rows[6]!
    const [bib, flag, name, kit] = [
      uno.indexOf('#173'),
      uno.indexOf('data-ui="Flag"'),
      uno.indexOf(CAST[172]!.name),
      uno.indexOf('aria-label="Team 1 kit"'),
    ]
    expect(bib).toBeGreaterThan(0)
    expect(bib < flag && flag < name && name < kit).toBe(true)
    expect(rows[1]).toContain('flex-wrap')
  })

  it('en el móvil, la línea de equipos solo bajo la fila 1 y las del espectador (6-c)', () => {
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
  })

  // Los 44 px de la fila y de cada corredor de su lista no se miran aquí, que serían clases (D-10): los
  // cuenta la comprobación 5 de la prueba del teléfono en las pantallas 08, 09 y 35.
  it('cada fila es un botón con aria-expanded y aria-controls, y su lista, cerrada, no se pinta (Ruso-036)', () => {
    const rows = rowsOf(html(<GroupBar instant={sixPointOne()} cast={CAST} clock="exact" />))
    for (const row of rows) {
      // la fila, un `Expander` del catálogo (PR 21n): el mismo botón, con su `data-ui`
      const boton =
        /<button type="button" data-ui="Expander"[^>]*aria-expanded="false" aria-controls="([^"]+)"/.exec(
          row,
        )
      expect(boton).not.toBeNull()
      // y dice que se pulsa: la variante de fila, con su flecha (punto 2 del dueño)
      expect(row).toMatch(/<button type="button" data-ui="Expander" data-variant="row"/)
      expect(row.match(/data-variant="chevron-down"/g)?.length).toBe(1)
      expect(row).toContain(`<ul id="${boton?.[1]}"`)
      expect(row).toMatch(/<ul id="[^"]+" data-group-list="\d+" hidden="">/)
      expect(row).not.toContain('data-ui="RiderLabel"')
    }
  })
})

describe('GroupBar · la lista de un grupo, abierta (Ruso-036; E3, §14.4)', () => {
  const inst = instantOf(
    [
      { members: [3, 40, 41, 42, 43], km: 60, jerseys: ['gc'] },
      { members: [...range(0, 3), ...range(4, 40), ...range(44, 176)], km: 59, gapS: 95 },
    ],
    { racing: 176 },
  )
  const fila = (open: boolean) =>
    html(
      <GroupRow
        group={inst.groups[0]!}
        cast={CAST}
        clock="exact"
        quiet={false}
        folded={false}
        transit={undefined}
        open={open}
        onToggle={() => {}}
      />,
    )

  it('abierta, una fila por corredor con su RiderLabel: el dorsal, la bandera, el nombre, el maillot y el equipo', () => {
    const s = fila(true)
    expect(s).toContain('aria-expanded="true"')
    const lista = s.slice(s.indexOf('data-group-list'))
    expect(lista).not.toMatch(/^[^>]*hidden=""/)
    expect(lista.split('data-ui="RiderLabel"').length - 1).toBe(5)
    expect(lista.split('<li').length - 1).toBe(5)
    for (const r of [3, 40, 41, 42, 43]) expect(textOf(lista)).toContain(CAST[r]!.name)
    // el líder con el suyo; los demás con su equipación y su equipo debajo
    expect(count(lista, 'Race leader')).toBe(1)
    expect(kits(lista)).toBe(4)
    expect(lista).toContain('#41')
    // sin enlace: la retransmisión no se deja a medias por tocar un nombre
    expect(lista).not.toContain('<a ')
  })

  it('cerrada, sin corredores en la lista', () => {
    expect(fila(false)).not.toContain('data-ui="RiderLabel"')
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

  // LA REVISIÓN DE `Watch` DEL DUEÑO (W1, su punto 3): «en todo momento saber estos maillots donde van». Una fila
  // con un maillot de líder no se pliega nunca: el tope de mobileGroupRows es para las demás
  it('una fila con un maillot de líder no se pliega nunca, aunque pasen de mobileGroupRows', () => {
    const base = sixPointOne()
    const two = {
      ...base,
      groups: base.groups.map((g) =>
        g.number === 6
          ? { ...g, own: true }
          : g.number === 7
            ? { ...g, jerseys: ['kom' as const] }
            : g,
      ),
    }
    const markup = html(<GroupBar instant={two} cast={CAST} clock="exact" />)
    const hidden = rowsOf(markup).map((r) => /data-mobile="folded"/.test(r.slice(0, 200)))
    // la 1, la del líder (2), el pelotón con los puntos (4), la del espectador (6) y la de la montaña (7):
    // cinco; se pliegan la 3 (2 corredores) y la 5 (35)
    expect(hidden).toEqual([false, false, true, false, true, false, false])
    expect(textOf(markup)).toContain('+2 groups · 37 riders')
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
    // la flecha, el icono `trend` girado y no un glifo (ui/10; PR 21n): las palabras lo dicen
    expect(rows[3]).toContain('3 dropping back')
    expect(rows[2]).toContain('2 bridging across')
    expect(rows.join('')).not.toMatch(/[↓↑]/)
    const filas = rowsOf(html(<GroupBar instant={inst} cast={CAST} clock="exact" />))
    expect(filas[3]).toMatch(/data-variant="trend"[^>]*>(?:(?!<\/svg>)[\s\S])*rotate\(90 12 12\)/)
    expect(filas[2]).toMatch(/data-variant="trend"[^>]*>(?:(?!<\/svg>)[\s\S])*rotate\(-90 12 12\)/)
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

describe('ProfileStrip · los cursores se mueven sin style (E3, ui/9; PR 21n)', () => {
  it('ningún style, con movimiento o sin él; y con menos movimiento, los cursores sin transición', () => {
    const head = headOf(CAST)
    const pinta = (reducedMotion: boolean) =>
      renderToStaticMarkup(
        <ProfileStrip
          profile={head.profile}
          lengthKm={head.stage.lengthKm}
          instant={sixPointOne()}
          clock="exact"
          reducedMotion={reducedMotion}
        />,
      )
    expect(pinta(false)).not.toContain('style=')
    expect(pinta(true)).not.toContain('style=')
    // con menos movimiento, quietos (WCAG 2.3.3): la transición solo la expresa una clase, la propia de
    // index.css (`transition-center`), y por eso, como `sr-only` en Button.test, se mira aquí; comparar los
    // dos marcados no basta, porque con menos movimiento el km de cada cursor también se redondea
    const conMovimiento = pinta(false).match(/<circle [^>]*data-cursor="[^"]*"[^>]*>/g) ?? []
    expect(conMovimiento.length).toBeGreaterThan(0)
    for (const c of conMovimiento) expect(c).toMatch(/\btransition-center\b/)
    expect(pinta(true)).not.toContain('transition-center')
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

// ------------------------------------------------------------------------- lo del 6b (§16.6)

const ITALY = {
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

describe('GroupBar · el campeón lleva su maillot (ChampionJersey, §7.4; 6b; E3, §9.1)', () => {
  it('en una fila nombrada y en la línea de un grupo, con el texto de su título y, delante, las letras de su país', () => {
    const cast = castOf(30, { 1: { worn: ITALY, country: 'IT' } })
    const named = html(
      <GroupBar
        instant={instantOf([
          { members: [0, 1], km: 70 },
          { members: range(2, 30), km: 69, gapS: 60, kind: 'peloton' },
        ])}
        cast={cast}
        clock="exact"
      />,
    )
    expect(named).toContain('data-ui="ChampionJersey"')
    expect(count(named, 'Champion of Italy')).toBe(1)
    const line = html(
      <GroupBar
        instant={instantOf([
          { members: [0, 1, 2, 3, 4], km: 70 },
          { members: range(5, 30), km: 69, gapS: 60, kind: 'peloton' },
        ])}
        cast={cast}
        clock="exact"
      />,
    )
    expect(count(line, 'Champion of Italy')).toBe(1)
    // en la línea va delante, sin cuenta, con las dos letras de su país (a 28 px, varias banderas son
    // gemelas: Italia y Perú a 2,3; Ruso-037)
    expect(line).toMatch(/data-chip="front"[^]*?>IT<\/span>/)
  })
})

describe('GroupBar · quién tira (Pulling:, §6.4, 6-d; 6b)', () => {
  const cast = castOf(30)
  const detail = (
    pullers: { rider: number; motive: string | null; forRider: number | null }[],
  ): GroupDetail => ({
    g: 1,
    speedKmh: 44,
    pullingTotal: pullers.length,
    pullers: pullers.map((p) => ({ ...p, motive: p.motive as PullMotive | null })),
    mishap: null,
  })

  it('la fuga que colabora, all 3 in turn; el pelotón, sus equipos con el porqué', () => {
    const markup = html(
      <GroupBar
        instant={instantOf([
          {
            members: [0, 1, 2],
            km: 70,
            detail: detail([
              { rider: 0, motive: 'fuga', forRider: null },
              { rider: 1, motive: 'fuga', forRider: null },
              { rider: 2, motive: 'fuga', forRider: null },
            ]),
          },
          {
            members: range(3, 30),
            km: 69,
            gapS: 60,
            kind: 'peloton',
            detail: detail([
              { rider: 3, motive: 'persecucion', forRider: null },
              { rider: 6, motive: 'persecucion', forRider: null },
              { rider: 4, motive: 'equipo_etapa', forRider: 10 },
              { rider: 7, motive: 'equipo_etapa', forRider: 10 },
              { rider: 5, motive: 'rol', forRider: null },
            ]),
          },
        ])}
        cast={cast}
        clock="exact"
      />,
    )
    const [front, pack] = rowsOf(markup)
    expect(textOf(front!)).toContain('Pulling: all 3 in turn')
    // en escritorio, los dos equipos con más relevistas y su porqué; en el móvil, uno y +N teams
    expect(textOf(pack!)).toContain('Pulling: Team 0 (chasing), Team 1 (for 11 Rider K10) +1 team')
    expect(pack).toContain('data-pulling="mobile"')
    expect(front).not.toContain('data-pulling="mobile"')
  })
})

describe('GroupBar · tu corredor (§6.2, 6-l; 6b)', () => {
  const road = [
    { members: [0, 1, 2, 3], km: 70 },
    { members: range(4, 26), km: 69, gapS: 134, kind: 'peloton' as const },
    { members: range(26, 30), km: 66, gapS: 600 },
  ]
  const bar = (own: number[], inTransit: { rider: number; from: number; to: number }[] = []) =>
    textOf(
      html(
        <GroupBar
          instant={instantOf(road, {
            inTransit: inTransit.map((x) => ({
              ...x,
              gap: { toHeadS: 134, toAheadS: null, atKm: 69, trend: null },
            })),
          })}
          cast={castOf(32, Object.fromEntries(own.map((r) => [r, { own: true }])))}
          clock="exact"
        />,
      ),
    )

  it('Your rider · in the bunch · +2:14, con la palabra de voz y el hueco de su grupo', () => {
    expect(bar([10])).toContain('Your rider · in the bunch · +2:14')
    expect(bar([1])).toContain('Your rider · in the lead group')
    expect(bar([1])).not.toContain('Your rider · in the lead group ·')
  })

  it('en tránsito, dropping back from o bridging to; fuera de carrera, out of the race', () => {
    expect(bar([10], [{ rider: 10, from: 1, to: 2 }])).toContain(
      'Your rider · dropping back from the bunch · +2:14',
    )
    expect(bar([10], [{ rider: 10, from: 1, to: 0 }])).toContain(
      'Your rider · bridging to the lead group',
    )
    expect(bar([31])).toContain('Your rider · out of the race')
  })

  it('con varios, una cuenta por papel: Your team · 1 in front · 2 in the bunch', () => {
    expect(bar([1, 10, 11])).toContain('Your team · 1 in front · 2 in the bunch')
    expect(bar([])).not.toContain('Your')
  })
})

/**
 * LO QUE CAMBIA A `barHz` NO SE PINTA OTRA VEZ A `overlayHz` (10b, los arreglos; §18.5). La pantalla
 * se pinta a `overlayHz` con la capa fija; la barra, el perfil y sus cursores cambian a `barHz` y el
 * rótulo con la cola. Pintarlos de nuevo con lo mismo era trabajo de más en cada commit de React, el
 * que, con el estilo y la maquetación, llenaba las tareas largas de `Highlights`. Lo que se pinta no
 * cambia (los tests de arriba).
 */
describe('la barra, el perfil y el rótulo, sin pintarse otra vez con lo mismo (10b)', () => {
  const memoType = Symbol.for('react.memo')
  it('los tres van memorizados, y los maillots de sus filas y sus rótulos también', () => {
    for (const c of [
      GroupBar,
      ProfileStrip,
      CueCard,
      WornJerseyIcon,
      Jersey,
      Kit,
      LeaderJersey,
      ChampionJersey,
    ])
      expect((c as unknown as { $$typeof: symbol }).$$typeof).toBe(memoType)
  })

  it('el estilo de una equipación se calcula una vez por semilla', () => {
    expect(jerseyStyle('rq-team-3')).toBe(jerseyStyle('rq-team-3'))
    expect(jerseyStyle('rq-team-3')).not.toBe(jerseyStyle('rq-team-4'))
  })

  it('la barra se pinta otra vez si cambia lo que enseña, no por otro onExpand (siempre abre)', () => {
    const props = {
      instant: instantOf([{ members: range(0, 10), km: 12, kind: 'peloton' }]),
      cast: castOf(10),
      clock: 'exact' as const,
      expanded: false,
      onExpand: () => {},
      keys: ['0'],
    }
    expect(sameBar(props, { ...props, onExpand: () => {} })).toBe(true)
    for (const changed of [
      { instant: instantOf([{ members: range(0, 10), km: 13, kind: 'peloton' }]) },
      { cast: castOf(10) },
      { clock: 'estimated' as const },
      { expanded: true },
      { keys: ['0'] },
    ])
      expect(sameBar(props, { ...props, ...changed }), Object.keys(changed)[0]).toBe(false)
  })
})
