import { describe, expect, it } from 'vitest'
import {
  arrowSchema,
  barSchema,
  championTitleViewSchema,
  championsSchema,
  formResponseSchema,
  markSchema,
  myRiderResponseSchema,
  publicRiderDetailSchema,
  riderRaceReportSchema,
  riderSummarySchema,
  starsSchema,
  teamClassEntrySchema,
  trendResponseSchema,
  triggerCondViewSchema,
} from './contracts.js'
import { type ChampionTitle, championTitleView } from './jerseys.js'
import { type NewsPayload, newsPayloadView, newsPayloadViewSchema } from './news.js'
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

describe('lo que la pantalla pinta y nada más (§13.5; 19c)', () => {
  const titulo: ChampionTitle = {
    scope: 'national',
    country: 'IT',
    discipline: 'road',
    category: 'elite',
    season: 0,
    validFromDay: 179,
    validToDay: 543,
    source: { raceKey: 'nc-it-road:s0', stageDay: 1 },
    provisional: true,
  }
  const vista = {
    scope: 'national',
    country: 'IT',
    discipline: 'road',
    category: 'elite',
    season: 0,
    validFromDay: 179,
    source: { raceKey: 'nc-it-road:s0', stageDay: 1 },
  }

  // Lo que no se pinta de las rutas de la web de ayer (la ruta de etapa, las noticias y la última carrera)
  // fue opcional en el 19c, y se siguió mandando para la web del 19b; desde el 19d, que ya ninguna web lo
  // pide, no cruza (regla 6 de §17.1; D-50).
  it('el título de campeón cruza sin hasta cuándo vale ni si es provisional (19d)', () => {
    expect(championTitleView(titulo)).toEqual(vista)
    expect(championTitleViewSchema.parse(titulo)).toEqual(vista)
    expect(championsSchema.parse({ r1: titulo })).toEqual({ r1: vista })
  })

  it('la noticia cruza sin la salud de antes ni el equipo del que viene (19d)', () => {
    const lesion: NewsPayload = {
      kind: 'injury',
      raceId: 'race-france',
      season: 0,
      stageDay: 3,
      riderId: 'r1',
      teamId: 't1',
      days: 9,
      prevHealth: 'sano',
      prevUntilDay: null,
    }
    const fichaje: NewsPayload = {
      kind: 'contract',
      riderId: 'r1',
      toTeamId: 't2',
      fromTeamId: 't1',
      relocateCountry: null,
      housingCovered: false,
    }
    const lesionSin = {
      kind: 'injury',
      raceId: 'race-france',
      season: 0,
      stageDay: 3,
      riderId: 'r1',
      teamId: 't1',
      days: 9,
    }
    const fichajeSin = {
      kind: 'contract',
      riderId: 'r1',
      toTeamId: 't2',
      relocateCountry: null,
      housingCovered: false,
    }
    expect(newsPayloadView(lesion)).toEqual(lesionSin)
    expect(newsPayloadView(fichaje)).toEqual(fichajeSin)
    expect(newsPayloadViewSchema.parse(lesion)).toEqual(lesionSin)
    expect(newsPayloadViewSchema.parse(fichaje)).toEqual(fichajeSin)
    // las demás, enteras
    const victoria: NewsPayload = {
      kind: 'stage_win',
      raceId: 'race-france',
      season: 0,
      stageDay: 3,
      riderId: 'r1',
      teamId: 't1',
    }
    expect(newsPayloadView(victoria)).toEqual(victoria)
    // y lo demás de la noticia sigue pedido
    const { days, ...sinDias } = lesionSin
    expect(days).toBe(9)
    expect(pasa(newsPayloadViewSchema, sinDias)).toBe(false)
  })

  it('la clasificación por equipos cruza sin la suma de puestos, y la última carrera sin la bonificación (19d)', () => {
    const fila = {
      teamId: 't1',
      teamName: 'Team t1',
      country: 'ES',
      kit: null,
      tiempoS: 100,
      stagesScored: 1,
      out: false,
    }
    expect(teamClassEntrySchema.parse({ ...fila, sumaPuestos: 6 })).toEqual(fila)
    expect('bonusS' in riderRaceReportSchema.shape).toBe(false)
  })

  it('el disparo de una orden cruza sin el corredor que lo dispara: la web no ofrece `attack`', () => {
    expect(pasa(triggerCondViewSchema, { at: 'km', km: 12 })).toBe(true)
    expect(pasa(triggerCondViewSchema, { at: 'gap', overS: 60 })).toBe(true)
    expect(pasa(triggerCondViewSchema, { at: 'attack', byRiderId: 'r9' })).toBe(false)
  })
})
