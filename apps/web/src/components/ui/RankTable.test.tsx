import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { RankTable, type RankTableColumn, type RankTableProps, rankTableLines } from './RankTable'

/**
 * `RankTable` (E3, docs/visual.md §4.5 y §6.1; PR 9b): las 20 y `Show all N`; la fila propia anclada tras
 * un `…`; los abandonos al final, con `DNF` y sin contar; las prioridades, columna o segundo renglón; el
 * enlace en la celda de identidad entera; y velada, una fila con `Watch`.
 */

interface Fila {
  readonly id: string
  readonly name: string
  readonly team: string
  readonly rank: number | null
  readonly gap: string
}

const fila = (n: number, rank: number | null = n): Fila => ({
  id: `r${n}`,
  name: `Rider ${n}`,
  team: `Team ${n % 7}`,
  rank,
  gap: n === 1 ? '14:22:05' : `+${n}:00`,
})
const FILAS = Array.from({ length: 140 }, (_, i) => fila(i + 1))
const COLUMNAS: readonly RankTableColumn<Fila>[] = [
  { key: 'team', header: 'Team', priority: 'secondary', clip: true, render: (r) => r.team },
  { key: 'total', header: 'Total', priority: 'optional', numeric: true, render: (r) => `T${r.id}` },
  { key: 'time', header: 'Time', priority: 'primary', numeric: true, render: (r) => r.gap },
]
const BASE: RankTableProps<Fila> = {
  caption: 'General classification after stage 3, Gandia → Alcoi',
  rows: FILAS,
  rowKey: (r) => r.id,
  rank: (r) => r.rank,
  identity: (r) => r.name,
  href: (r) => `/world/riders/${r.id}`,
  columns: COLUMNAS,
  isOwn: (r) => r.id === 'r34',
}
const pinta = (p: Partial<RankTableProps<Fila>> = {}) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <RankTable {...BASE} {...p} />
    </MemoryRouter>,
  )
const filas = (s: string) => s.match(/<tbody>(.*)<\/tbody>/)?.[1]?.match(/<tr[ >]/g)?.length ?? 0

describe('RankTable: la tabla', () => {
  it('una table con su caption, oculto, y las cabeceras con scope="col"', () => {
    const s = pinta()
    expect(s).toMatch(/^<div data-ui="RankTable" data-variant="ranked" data-state="ready"/)
    expect(s).toContain(
      '<caption class="sr-only">General classification after stage 3, Gandia → Alcoi</caption>',
    )
    expect(s.match(/<th scope="col"/g)).toHaveLength(5)
    expect(s).toMatch(/<th scope="col"[^>]*>#<\/th>/)
    expect(s).toMatch(/<th scope="col"[^>]*>Rider<\/th>/)
  })

  it('el enlace es la celda de identidad entera: uno por fila, a la ficha', () => {
    const s = pinta()
    expect(s.match(/href="\/world\/riders\//g)).toHaveLength(21)
    expect(s).toMatch(
      /<a [^>]*href="\/world\/riders\/r1"[^>]*><span class="block">Rider 1<\/span><span data-second=""/,
    )
  })

  it('sin puesto, sin su columna', () => {
    const sinPuesto: RankTableProps<Fila> = {
      caption: BASE.caption,
      rows: BASE.rows,
      rowKey: BASE.rowKey,
      identity: BASE.identity,
      href: (r) => `/world/riders/${r.id}`,
      columns: BASE.columns,
    }
    const s = renderToStaticMarkup(
      <MemoryRouter>
        <RankTable {...sinPuesto} />
      </MemoryRouter>,
    )
    expect(s).toContain('data-variant="plain"')
    expect(s).not.toMatch(/>#<\/th>/)
  })
})

describe('RankTable: las 20, la propia y Show all', () => {
  it('140 filas con la propia en el 34: las 20, el hueco que no se lee y la propia', () => {
    const s = pinta()
    expect(filas(s)).toBe(22)
    expect(s).toMatch(
      /<tr aria-hidden="true"[^>]*><td colSpan="5"[^>]*>…<\/td><\/tr><tr data-state="ready" aria-current="true"/,
    )
    expect(s.match(/aria-current="true"/g)).toHaveLength(1)
    expect(s).toMatch(/<button type="button" aria-expanded="false"[^>]*>.*Show all 140/)
  })

  it('abierta, las 140 en su orden, sin hueco y con la propia en su sitio', () => {
    const lineas = rankTableLines(BASE, true)
    expect(lineas).toHaveLength(140)
    expect(lineas.some((l) => l.kind === 'gap')).toBe(false)
    expect(lineas.findIndex((l) => l.kind === 'row' && l.own)).toBe(33)
  })

  it('la propia dentro de las 20: sin hueco', () => {
    const s = pinta({ isOwn: (r) => r.id === 'r7' })
    expect(filas(s)).toBe(20)
    expect(s).not.toContain('aria-hidden="true" class="h-6')
    expect(s).toMatch(/aria-current="true"[^>]*>(?:(?!<\/tr>).)*Rider 7/)
  })

  it('con 20 o menos, sin Show all', () => {
    expect(pinta({ rows: FILAS.slice(0, 20) })).not.toContain('Show all')
  })

  it('total manda en el texto: Show all 140 con 25 filas', () => {
    expect(pinta({ rows: FILAS.slice(0, 25), total: 140 })).toContain('Show all 140')
  })

  it('lo que no tiene valor no sale en el segundo renglón, ni su punto: la llegada sin bonificación', () => {
    const columnas: readonly RankTableColumn<Fila>[] = [
      { key: 'team', header: 'Team', priority: 'secondary', clip: true, render: (r) => r.team },
      {
        key: 'bonus',
        header: 'Bonus',
        priority: 'secondary',
        numeric: true,
        render: (r) => (r.id === 'r1' ? '−10 s' : null),
      },
      { key: 'time', header: 'Time', priority: 'primary', numeric: true, render: (r) => r.gap },
    ]
    const s = pinta({ rows: FILAS.slice(0, 2), columns: columnas })
    const segundo = (id: string) =>
      new RegExp(
        `Rider ${id.slice(1)}</span><span data-second=""[^>]*>((?:(?!</a>).)*)</span></a>`,
      ).exec(s)?.[1] ?? ''
    expect(segundo('r1')).toContain('−10 s')
    expect(segundo('r1')).toContain('<span aria-hidden="true">·</span>')
    expect(segundo('r2')).not.toContain('data-column="bonus"')
    expect(segundo('r2')).not.toContain('·')
  })

  it('con all, todas y sin Show all: la plantilla (§6.1)', () => {
    const s = pinta({ rows: FILAS.slice(0, 26), all: true })
    expect(filas(s)).toBe(26)
    expect(s).not.toContain('Show all')
    expect(s).not.toContain('aria-hidden="true" class="h-6')
  })
})

describe('RankTable: los abandonos', () => {
  const conAbandonos = [...FILAS.slice(0, 22), fila(901, null), fila(902, null)]

  it('al final, tras la propia, sin puesto, con DNF donde va el valor y sin tachar', () => {
    const s = pinta({ rows: conAbandonos, isOwn: (r) => r.id === 'r22' })
    const lineas = rankTableLines(
      { ...BASE, rows: conAbandonos, isOwn: (r) => r.id === 'r22' },
      false,
    )
    expect(lineas.map((l) => (l.kind === 'gap' ? 'gap' : l.row.id)).slice(-4)).toEqual([
      'gap',
      'r22',
      'r901',
      'r902',
    ])
    expect(s.match(/data-state="inactive"/g)).toHaveLength(2)
    expect(s).toMatch(
      /data-state="inactive"(?:(?!<\/tr>).)*data-column="time"[^>]*><span[^>]*>DNF<\/span>/,
    )
    expect(s).not.toMatch(/line-through|<s>|<del>/)
  })

  it('no cuentan en Show all N, y salen todos', () => {
    const s = pinta({ rows: conAbandonos })
    expect(s).toContain('Show all 22')
    expect(s).toContain('Rider 901')
    expect(s).toContain('Rider 902')
  })
})

describe('RankTable: las prioridades', () => {
  it('cada columna, con su prioridad; la principal sin esconder', () => {
    const s = pinta()
    expect(s).toMatch(/<th scope="col" data-column="team" data-priority="secondary"/)
    expect(s).toMatch(/<th scope="col" data-column="total" data-priority="optional"/)
    expect(s).toMatch(/<th scope="col" data-column="time" data-priority="primary"/)
  })

  it('las secundarias y las opcionales, también en el segundo renglón; el equipo, cortado con …', () => {
    const s = pinta()
    expect(s).toMatch(
      /<span data-second=""[^>]*><span data-column="team" data-priority="secondary"[^>]*><span data-clip-ok=""[^>]*>Team 1<\/span><span aria-hidden="true">·<\/span><\/span><span data-column="total" data-priority="optional"[^>]*><span>Tr1<\/span><\/span><\/span>/,
    )
    expect(s).not.toMatch(/<span data-column="time"/)
  })
})

describe('RankTable: velada', () => {
  it('una fila a todo lo ancho con su porqué y Watch; ni filas ni Show all', () => {
    const s = pinta({
      veil: { stage: 3, route: { from: 'Gandia', to: 'Alcoi' }, href: '/races/r/stages/3/watch' },
    })
    expect(s).toContain('data-state="veiled"')
    expect(filas(s)).toBe(1)
    expect(s).toContain('Hidden until you watch stage 3, Gandia → Alcoi')
    expect(s).toMatch(/<a [^>]*href="\/races\/r\/stages\/3\/watch"[^>]*>.*Watch/)
    expect(s).not.toContain('Rider 1<')
    expect(s).not.toContain('Show all')
  })
})

describe('RankTable: la respuesta', () => {
  it('data-answer cuando lo pide la pantalla (§7.3)', () => {
    expect(pinta({ answer: true })).toMatch(/^<div data-ui="RankTable"[^>]*data-answer=""/)
  })
})

describe('RankTable: lo que piden las tablas del 12b', () => {
  it('sin href, la identidad no enlaza: los movimientos no llevan a ningún sitio (§6.1)', () => {
    const sinEnlace: RankTableProps<Fila> = {
      caption: BASE.caption,
      rows: FILAS.slice(0, 3),
      rowKey: BASE.rowKey,
      identity: BASE.identity,
      columns: BASE.columns,
    }
    const s = renderToStaticMarkup(
      <MemoryRouter>
        <RankTable {...sinEnlace} />
      </MemoryRouter>,
    )
    expect(s).not.toContain('<a ')
    expect(s).toMatch(
      /<td [^>]*><span data-identity="" class="block py-1"><span class="block">Rider 1<\/span><span data-second=""/,
    )
  })

  it('una fila sin puesto dice su porqué: OTL en la llegada, OUT en la de equipos', () => {
    const s = pinta({
      rows: [...FILAS.slice(0, 3), fila(901, null)],
      inactiveLabel: () => 'OTL',
    })
    expect(s).toMatch(
      /data-state="inactive"(?:(?!<\/tr>).)*data-column="time"[^>]*><span[^>]*>OTL<\/span>/,
    )
    expect(s).not.toContain('>DNF<')
  })

  it('una columna puede decir otra cosa en el segundo renglón: «2 overall» y, desde 640, «2»', () => {
    const columnas: readonly RankTableColumn<Fila>[] = [
      {
        key: 'gc',
        header: 'Overall',
        priority: 'secondary',
        numeric: true,
        render: (r) => r.rank,
        second: (r) => `${r.rank} overall`,
      },
      { key: 'time', header: 'Time', priority: 'primary', numeric: true, render: (r) => r.gap },
    ]
    const s = pinta({ rows: FILAS.slice(0, 3), columns: columnas })
    expect(s).toMatch(
      /<span data-column="gc" data-priority="secondary"[^>]*><span>2 overall<\/span>/,
    )
    expect(s).toMatch(/<td data-column="gc" data-priority="secondary"[^>]*>2<\/td>/)
  })
})
