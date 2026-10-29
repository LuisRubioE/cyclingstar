import { describe, expect, it } from 'vitest'
import { arrowSchema, barSchema, markSchema, starsSchema } from './contracts.js'
import { TREND_ARROWS, TREND_ARROW_CODE, trendArrow } from './rider.js'

/**
 * LA RESOLUCIÓN EN EL TIPO (E3, docs/visual.md §13.2; D-54; PR 19a): un campo que la pantalla pinta como
 * estrellas, barra, flecha o marca se declara con su forma, y un valor interno con decimales no pasa el
 * contrato.
 */

const pasa = (s: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) =>
  s.safeParse(v).success

describe('la resolución en el tipo (§13.2)', () => {
  it('starsSchema: medias estrellas de 0 a 5; un 63,4172 no pasa', () => {
    for (const v of [0, 0.5, 3.5, 5]) expect(pasa(starsSchema, v), String(v)).toBe(true)
    for (const v of [-0.5, 5.5, 3.25, 63.4172]) expect(pasa(starsSchema, v), String(v)).toBe(false)
  })

  it('barSchema: una barra entera de 0 a 100', () => {
    for (const v of [0, 16, 100]) expect(pasa(barSchema, v), String(v)).toBe(true)
    for (const v of [-1, 101, 61.98765]) expect(pasa(barSchema, v), String(v)).toBe(false)
  })

  it('markSchema: el cuarto de banda de un atributo propio, de 0 a 3', () => {
    for (const v of [0, 1, 2, 3]) expect(pasa(markSchema, v), String(v)).toBe(true)
    for (const v of [-1, 4, 1.5]) expect(pasa(markSchema, v), String(v)).toBe(false)
  })

  it('arrowSchema y TREND_ARROW_CODE: un código por glifo, los cinco (13-a)', () => {
    expect(Object.keys(TREND_ARROW_CODE).sort()).toEqual([...TREND_ARROWS].sort())
    expect(Object.values(TREND_ARROW_CODE).sort()).toEqual([...arrowSchema.options].sort())
    expect(TREND_ARROW_CODE[trendArrow(0)]).toBe('igual')
    expect(pasa(arrowSchema, '↗')).toBe(false)
  })
})
