import { describe, expect, it } from 'vitest'
import {
  arrowSchema,
  barSchema,
  formResponseSchema,
  markSchema,
  myRiderResponseSchema,
  publicRiderDetailSchema,
  riderSummarySchema,
  starsSchema,
  trendResponseSchema,
} from './contracts.js'
import { ATTRIBUTES, TREND_ARROWS, TREND_ARROW_CODE, trendArrow } from './rider.js'

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

/** Un corredor con sus diez atributos en la forma que se pida. */
const conAtributos = (v: unknown) => Object.fromEntries(ATTRIBUTES.map((a) => [a, v]))

describe('los contratos del corredor, en su forma de pantalla (§13.5; 19b)', () => {
  const propio = {
    id: 'r1',
    name: 'Ana Ruiz',
    country: 'ES',
    gender: 'F',
    archetype: 'escalada',
    birthSeason: 0,
  }

  it('el propio: estrellas y marca por atributo; un 63,4172 no pasa', () => {
    const rider = { ...propio, attributes: conAtributos({ stars: 3, mark: 1 }) }
    expect(myRiderResponseSchema.parse({ rider })).toEqual({ rider })
    const crudo = { ...propio, attributes: conAtributos(63.4172) }
    expect(pasa(myRiderResponseSchema, { rider: crudo })).toBe(false)
    const sinMarca = { ...propio, attributes: conAtributos({ stars: 3 }) }
    expect(pasa(myRiderResponseSchema, { rider: sinMarca })).toBe(false)
  })

  it('el de cualquiera: solo sus estrellas, y la marca no cruza', () => {
    const rider = {
      id: 'r2',
      name: 'Eva Sanz',
      country: 'ES',
      residence: 'ES',
      archetype: 'escalada',
      age: 24,
      isBot: true,
      teamId: null,
      teamName: null,
      seasonPoints: 0,
      seasonRank: 1,
      fieldSize: 1,
      fame: 0,
      attributes: conAtributos({ stars: 2.5, mark: 2 }),
      health: { state: 'sano', untilDay: null },
    }
    const leido = publicRiderDetailSchema.parse(rider)
    expect(leido.attributes.MON).toEqual({ stars: 2.5 })
    expect(
      pasa(publicRiderDetailSchema, { ...rider, attributes: conAtributos({ stars: 2.4 }) }),
    ).toBe(false)
  })

  it('/form: el diario en barras enteras y la carga en palabras; la condición de hoy con sus cerillos', () => {
    const dia = { gameDay: 52, fitness: 65, freshness: 41, load: 3, activity: 'fondo' }
    const r = { log: [dia], form: { stars: 3.5, freshness: 41, matches: 4 } }
    expect(formResponseSchema.parse(r).log[0]).toEqual({ ...dia, parte: null })
    expect(pasa(formResponseSchema, { ...r, log: [{ ...dia, fitness: 65.25 }] })).toBe(false)
    expect(pasa(formResponseSchema, { ...r, log: [{ ...dia, load: 5 }] })).toBe(false)
    expect(pasa(formResponseSchema, { ...r, form: { ...r.form, freshness: 41.47 } })).toBe(false)
    expect(pasa(formResponseSchema, { ...r, form: { ...r.form, matches: null } })).toBe(true)
    // lo que ya no cruza, el serializador lo quita: el contrato no lo declara
    const leido = formResponseSchema.parse({ ...r, log: [{ ...dia, ctl: 61.98765, tss: 105 }] })
    expect(leido.log[0]).not.toHaveProperty('ctl')
    expect(leido.log[0]).not.toHaveProperty('tss')
  })

  it('/trend: la flecha en su código; /summary: la moral en medias estrellas', () => {
    expect(trendResponseSchema.parse({ trend: [{ attr: 'MON', arrow: 'sube' }] })).toEqual({
      trend: [{ attr: 'MON', arrow: 'sube' }],
    })
    expect(pasa(trendResponseSchema, { trend: [{ attr: 'MON', delta28: 0.4 }] })).toBe(false)
    const resumen = {
      teamId: null,
      teamName: null,
      money: 0,
      moraleStars: 3,
      fame: 0,
      seasonPoints: 0,
      seasonRank: 1,
      fieldSize: 1,
      nationality: 'ES',
      residence: 'ES',
      housingCovered: false,
    }
    expect(riderSummarySchema.parse(resumen)).toEqual(resumen)
    expect(pasa(riderSummarySchema, { ...resumen, moraleStars: 57.31415 })).toBe(false)
  })
})
