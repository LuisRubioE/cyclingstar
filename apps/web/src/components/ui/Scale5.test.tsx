import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ARRIVAL_WORD } from '../../domain/words'
import { ARRIVAL_ORDER, Scale5, scale5Label } from './Scale5'

/**
 * `Scale5` (E3, docs/visual.md §4.8; PR 9b; D-00n): los cinco tramos de la llegada en su orden, con
 * `Undertrained` y los ejes `◀ Too much training` y `Too little training ▶`; el mejor, marcado siempre;
 * sin dato, `Not enough data yet`; con la carrera empezada, `Racing now`. Estos textos no los fijaba
 * ningún test de la web (§16.3): los fija este.
 */

const tramos = (s: string) =>
  [...s.matchAll(/<span data-arrival="([a-z]+)"([^>]*)>([^<]*)<\/span>/g)].map((m) => ({
    k: m[1],
    activo: (m[2] ?? '').includes('data-active'),
    mejor: (m[2] ?? '').includes('data-best'),
    texto: m[3],
  }))
const texto = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

describe('Scale5', () => {
  it('las cinco palabras, en el orden de ARRIVAL_ORDER, y Undertrained con su guion blando', () => {
    expect(ARRIVAL_ORDER.map((k) => ARRIVAL_WORD[k])).toEqual([
      'Cooked',
      'Loaded',
      'Fine',
      'Spot on',
      'Undertrained',
    ])
    const s = renderToStaticMarkup(<Scale5 value="cargado" race="Race Var" />)
    expect(tramos(s).map((t) => t.texto)).toEqual([
      'Cooked',
      'Loaded',
      'Fine',
      'Spot on',
      'Under­trained',
    ])
    expect(s).not.toMatch(/Rusty|Too tired|Too fresh/)
  })

  it('lista: un tramo activo, el suyo, y el nombre entero para el lector', () => {
    const s = renderToStaticMarkup(<Scale5 value="cargado" race="Race Var" />)
    expect(s).toMatch(/^<div data-ui="Scale5" data-variant="arrival" data-state="ready" role="img"/)
    expect(
      tramos(s)
        .filter((t) => t.activo)
        .map((t) => t.k),
    ).toEqual(['cargado'])
    expect(s).toContain(
      'aria-label="Race Var: you&#x27;ll arrive Loaded, 2 of 5, from too much training to too little training; best is Spot on"',
    )
  })

  it('el mejor se ve siempre: Spot on lleva su marca, activo o no', () => {
    for (const value of ['cargado', 'perfecto', null] as const)
      expect(
        tramos(renderToStaticMarkup(<Scale5 value={value} race="Race Var" />))
          .filter((t) => t.mejor)
          .map((t) => t.k),
      ).toEqual(['perfecto'])
  })

  it('los ejes dicen la causa', () => {
    const s = texto(renderToStaticMarkup(<Scale5 value="bien" race="Race Var" />))
    expect(s).toContain('◀︎ Too much training')
    expect(s).toContain('Too little training ▶︎')
  })

  it('vacía: ningún tramo y Not enough data yet', () => {
    const s = renderToStaticMarkup(<Scale5 value={null} race="Race Var" />)
    expect(s).toContain('data-state="empty"')
    expect(tramos(s).some((t) => t.activo)).toBe(false)
    expect(texto(s)).toContain('Not enough data yet')
  })

  it('con la carrera empezada: ninguno, y la etapa con su origen y su destino', () => {
    const racing = { stage: 3, stages: 5, route: { from: 'Gandia', to: 'Alcoi' } }
    const s = renderToStaticMarkup(<Scale5 value="bien" racing={racing} race="Race Var" />)
    expect(s).toContain('data-state="inactive"')
    expect(tramos(s).some((t) => t.activo)).toBe(false)
    expect(texto(s)).toContain('Racing now · stage 3 of 5, Gandia → Alcoi')
    expect(scale5Label({ value: 'bien', racing, race: 'Race Var' })).toBe(
      'Race Var: Racing now · stage 3 of 5, Gandia → Alcoi',
    )
  })
})
