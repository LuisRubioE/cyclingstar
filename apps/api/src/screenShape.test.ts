import { type Eff, eff0, fitnessFactor, formStars, matchCount } from '@cyclingstar/engine'
import {
  ATTRIBUTES,
  type Attribute,
  arrowSchema,
  attributeStarsSchema,
  barSchema,
  formPointSchema,
  loadLevelSchema,
  ownAttributeSchema,
  starsSchema,
} from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import {
  attributeStars,
  conditionDay,
  conditionToday,
  moraleStars,
  orderView,
  ownAttributes,
  trendCode,
} from './screenShape.js'

/**
 * LA FORMA DE PANTALLA, EN EL SERVIDOR (E3, docs/visual.md §13.5 y §13.7; D-55; PR 19b). Lo que la web
 * calculaba con los números internos (las estrellas y la marca de cada atributo, las dos barras del diario,
 * los cerillos del día) lo calcula la API, con las funciones del motor, y cruza ya en su forma.
 */

/** Los diez atributos, con el MON del testigo del canario (63,4172) y el resto en un valor redondo. */
const ATTRS = Object.fromEntries(ATTRIBUTES.map((a) => [a, a === 'MON' ? 63.4172 : 40])) as Record<
  Attribute,
  number
>

const pasa = (s: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) =>
  s.safeParse(v).success

describe('la forma de pantalla (§13.5; 19b)', () => {
  it('los atributos de cualquier corredor: sus medias estrellas, y nada más', () => {
    const a = attributeStars(ATTRS)
    expect(Object.keys(a).sort()).toEqual([...ATTRIBUTES].sort())
    expect(a.MON).toEqual({ stars: 3 })
    expect(a.RES).toEqual({ stars: 2 })
    for (const v of Object.values(a)) expect(pasa(attributeStarsSchema, v)).toBe(true)
    expect(JSON.stringify(a)).not.toContain('63.4172')
  })

  it('los del corredor propio: sus estrellas y la marca de cuarto de banda (13-b)', () => {
    const a = ownAttributes(ATTRS)
    // 63,4172: tres estrellas (de más de 55 a 75) y en el segundo cuarto de su banda (de 60 a 65)
    expect(a.MON).toEqual({ stars: 3, mark: 1 })
    // 40: dos estrellas (de más de 35 a 55) y en el primer cuarto de su banda (de más de 35 a 40)
    expect(a.RES).toEqual({ stars: 2, mark: 0 })
    for (const v of Object.values(a)) expect(pasa(ownAttributeSchema, v)).toBe(true)
    // las cinco estrellas se pintan siempre llenas
    expect(ownAttributes({ ...ATTRS, MON: 99 }).MON).toEqual({ stars: 5, mark: 3 })
  })

  it('un día del diario: el fondo y la frescura en barras enteras y la carga en palabras, sin ctl, atl, tsb ni tss', () => {
    const row = {
      gameDay: 52,
      ctl: 61.98765,
      atl: 74.2,
      tsb: -12.3,
      tss: 105,
      activity: 'carrera:race-france:e3',
      parte: null,
      from: 'Lyon',
      to: 'Grenoble',
    }
    const day = conditionDay(row)
    expect(day).toEqual({
      gameDay: 52,
      fitness: Math.round(100 * fitnessFactor(61.98765)),
      freshness: 41, // 55 + 1,1 · (−12,3) = 41,47, por encima de la rodilla
      load: 3, // `Hard`: 105 pasa de 80 y no de 110 (§10.7)
      activity: 'carrera:race-france:e3',
      parte: null,
      from: 'Lyon',
      to: 'Grenoble',
    })
    expect(day.fitness).toBe(65)
    expect(pasa(barSchema, day.fitness) && pasa(barSchema, day.freshness)).toBe(true)
    expect(pasa(loadLevelSchema, day.load)).toBe(true)
    expect(formPointSchema.parse(day)).toEqual(day)
    // un día de entrenamiento no lleva ciudades
    const entreno = {
      gameDay: 53,
      ctl: 62,
      atl: 60,
      tsb: 2,
      tss: 40,
      activity: 'fondo',
      parte: null,
    }
    expect(conditionDay(entreno)).not.toHaveProperty('from')
    expect(conditionDay(entreno)).not.toHaveProperty('to')
  })

  it('la frescura cruza entera y de 0 a 100, con cualquier tsb de −200 a 250', () => {
    for (let tsb = -200; tsb <= 250; tsb += 0.25) {
      const { freshness } = conditionDay({
        gameDay: 1,
        ctl: 50,
        atl: 50,
        tsb,
        tss: 0,
        activity: 'descanso',
        parte: null,
      })
      expect(pasa(barSchema, freshness), String(tsb)).toBe(true)
    }
  })

  it('el fondo sale acotado a 0-100 por mucho que suba el ctl interno (lo que hacía conditionBars en la web)', () => {
    const fondo = (ctl: number) =>
      conditionDay({ gameDay: 1, ctl, atl: 0, tsb: 0, tss: 0, activity: 'descanso', parte: null })
        .fitness
    expect(fondo(0)).toBe(0)
    // 118 es un valor interno real del diario: la barra no puede pasar de 100
    expect(fondo(118)).toBe(100)
    expect(fondo(47.5)).toBe(50)
  })

  it('en fatiga profunda la barra sigue distinguiendo un día de otro, ya entera', () => {
    // Correr lleva el tsb a −80 o −100, y la barra se quedaba en 0 durante días: el jugador descansaba y
    // no veía moverse nada. Redondeada en el servidor, sigue bajando punto a punto en esa banda.
    const at = (tsb: number) =>
      conditionDay({ gameDay: 1, ctl: 80, atl: 0, tsb, tss: 0, activity: 'descanso', parte: null })
        .freshness
    expect(at(-40)).toBeGreaterThan(at(-60))
    expect(at(-60)).toBeGreaterThan(at(-80))
    expect(at(-80)).toBeGreaterThan(at(-110))
  })

  it('la condición de hoy: la forma en estrellas, la frescura en barra y los cerillos del motor (SPEC 6.6)', () => {
    const day = { ctl: 61.98765, tsb: -12.3 }
    const today = conditionToday(day, 'molestias', 57.31415, ATTRS)
    const eff = Object.fromEntries(
      ATTRIBUTES.map((a) => [a, eff0(ATTRS[a], day.ctl, day.tsb, 'molestias', 57.31415)]),
    ) as Eff
    expect(today).toEqual({
      stars: formStars(day.ctl, day.tsb),
      freshness: 41,
      matches: matchCount(eff, day.tsb),
    })
    expect(pasa(starsSchema, today.stars)).toBe(true)
    // sin la salud o sin la moral no se cuentan: la ficha dice `—`
    expect(conditionToday(day, null, 57.31415, ATTRS).matches).toBeNull()
    expect(conditionToday(day, 'sano', null, ATTRS).matches).toBeNull()
  })

  it('los cerillos cambian con la condición como en la salida: un corredor fuerte y fresco tiene más que uno roto', () => {
    const fuerte = Object.fromEntries(ATTRIBUTES.map((a) => [a, 90])) as Record<Attribute, number>
    const fresco = conditionToday({ ctl: 90, tsb: 10 }, 'sano', 80, fuerte).matches!
    const roto = conditionToday({ ctl: 90, tsb: -60 }, 'enfermo', 20, fuerte).matches!
    expect(fresco).toBeGreaterThan(roto)
  })

  it('la flecha de 28 días, en su código (13-a)', () => {
    expect([1, 0.3, 0.29, 0, -0.29, -0.3, -1, -2.5].map((d) => [d, trendCode(d)])).toEqual([
      [1, 'sube_mucho'],
      [0.3, 'sube'],
      [0.29, 'igual'],
      [0, 'igual'],
      [-0.29, 'igual'],
      [-0.3, 'baja'],
      [-1, 'baja_mucho'],
      [-2.5, 'baja_mucho'],
    ])
    for (const d of [3, 0.5, 0, -0.5, -3]) expect(pasa(arrowSchema, trendCode(d))).toBe(true)
  })

  it('la moral en medias estrellas, con la escala de la forma: siempre hay algo (DD-12)', () => {
    expect(moraleStars(57.31415)).toBe(3)
    expect(moraleStars(60)).toBe(3)
    expect(moraleStars(64.9)).toBe(3)
    expect(moraleStars(65)).toBe(3.5)
    expect(moraleStars(0)).toBe(0.5)
    expect(moraleStars(100)).toBe(5)
    for (let m = 0; m <= 100; m += 0.5)
      expect(pasa(starsSchema, moraleStars(m)), String(m)).toBe(true)
  })
})

describe('lo que no tiene lector se queda en la API (§13.5; 19c)', () => {
  it('una orden con el disparo `attack`, que la web no ofrece y pinta como ninguno, sale sin él', () => {
    const orden = {
      stageDay: 3,
      role: 'libre' as const,
      targetRiderId: null,
      mentality: 'oportunista' as const,
      effort: 'normal' as const,
      triggerKm: null,
      contestSprints: false,
      contestClimbs: true,
    }
    expect(
      orderView({ ...orden, triggerOn: { at: 'attack', byRiderId: 'r9' } }).triggerOn,
    ).toBeNull()
    expect(orderView({ ...orden, triggerOn: { at: 'km', km: 12 } }).triggerOn).toEqual({
      at: 'km',
      km: 12,
    })
    expect(orderView({ ...orden, triggerOn: null }).triggerOn).toBeNull()
    expect(orderView(orden)).toEqual(orden)
  })
})
