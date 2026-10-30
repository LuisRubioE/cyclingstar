import type { FormPoint } from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { RaceEffortLog } from './RaceEffortLog'

/**
 * EL DIARIO DE CARRERA, SIN TSS (E3, docs/visual.md §10.7 y §13.7; D-41, D-00o; PR 19b): el TSS sale de la
 * pantalla y de la API, y el día de carrera dice su carga en palabras, como el cuadro (`Load: hard`).
 *
 * Con el sistema desde el 21h: el día de la temporada (`Day 52`), el título de la etapa sin la clave cruda, la
 * barra de los cinco conceptos en un SVG con tokens y sin `title`, con su porqué en palabras para el lector, y
 * la leyenda en `caption`.
 */

const etapa: FormPoint = {
  gameDay: 52,
  fitness: 65,
  freshness: 41,
  load: 3,
  activity: 'carrera:race-france:e3',
  parte: {
    kmAlFrente: 12.5,
    kmEnFuga: 0,
    kmDescolgado: 0,
    ataques: 1,
    saltos: 0,
    cerillos: 2,
    reservaGastadaS: 40,
    gasto: { rodar: 30, relevo: 20, reserva: 5, cerillos: 10, banderas: 0 },
    pajaraKm: null,
    descuelgueKm: null,
  },
  from: 'Lyon',
  to: 'Grenoble',
}

const pinta = (points: FormPoint[]) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <RaceEffortLog points={points} />
    </MemoryRouter>,
  )

describe('el diario de carrera (§10.7; 19b)', () => {
  it('cada día de carrera dice su carga en palabras, y ninguno su TSS', () => {
    const html = pinta([
      etapa,
      { ...etapa, gameDay: 53, load: 4, activity: 'carrera:race-france:e4' },
    ])
    expect(html).toContain('Day 52 · Load: hard')
    expect(html).toContain('Day 53 · Load: very hard')
    expect(html).not.toContain('TSS')
  })

  it('el título de la etapa, de su clave: France · Stage 3, con su recorrido; nunca la clave', () => {
    const html = pinta([etapa])
    expect(html).toContain('France · Stage 3')
    expect(html).toContain('Lyon → Grenoble')
    expect(html).not.toContain('carrera:')
    expect(html).not.toContain('capitalize')
  })

  it('la barra: un SVG con un tramo por concepto con gasto, en sus tokens, sin title; y lo que dice, en palabras', () => {
    const html = pinta([etapa])
    const barra = /<svg[\s\S]*?<\/svg>/.exec(html)?.[0] ?? ''
    // rodar 30, relevo 20, cerillos 10, reserva 5; las banderas, a cero, sin tramo
    expect(barra.match(/<rect/g)).toHaveLength(4)
    for (const f of ['fill-line-strong', 'fill-accent', 'fill-bad', 'fill-gold'])
      expect(barra).toContain(f)
    expect(barra).not.toContain('fill-good')
    expect(html).not.toContain('title=')
    expect(html).not.toContain('style=')
    expect(html).toContain(
      'Where it went, most first: riding in the bunch, on the front, attacks &amp; jumps, digging deep',
    )
  })

  it('lo que dice la barra, del concepto que más gastó al que menos, sea cual sea su orden en la leyenda', () => {
    const html = pinta([
      {
        ...etapa,
        parte: {
          ...etapa.parte!,
          gasto: { rodar: 5, relevo: 20, reserva: 10, cerillos: 30, banderas: 0 },
        },
      },
    ])
    expect(html).toContain(
      'Where it went, most first: attacks &amp; jumps, on the front, digging deep, riding in the bunch',
    )
  })

  it('la leyenda, en caption y con los tokens de la barra', () => {
    const html = pinta([etapa])
    expect(html).not.toContain('text-[11px]')
    for (const f of ['bg-line-strong', 'bg-accent', 'bg-bad', 'bg-gold', 'bg-good'])
      expect(html).toContain(f)
    expect(html).not.toMatch(
      /\\b(?:bg|text|border|ring|fill|stroke|from|to|divide)-(?:slate|indigo|emerald|amber|rose|cyan|red|orange)-\\d/,
    )
  })

  it('los días de entrenamiento no salen: no tienen parte', () => {
    const html = pinta([{ ...etapa, activity: 'fondo', parte: null, from: null, to: null }])
    expect(html).toContain('No race days logged yet')
  })
})
