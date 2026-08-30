import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import { stageRng, stageSeed } from './rng.js'
import { stageWeather, weatherForecast } from './weather.js'

const seeds = (n: number): string[] =>
  Array.from({ length: n }, (_, i) =>
    stageSeed({ worldSeed: `clima-${i}`, raceId: 'clima', stageDay: 1, engineVersion: 1 }),
  )

/** Bélgica en abril (Flandes) y España en agosto (la Vuelta): los dos extremos del calendario. */
const FLANDES = { pais: 'BE', dia: 95 }
const VUELTA = { pais: 'ES', dia: 234 }

describe('el tiempo de una etapa (v42)', () => {
  it('la mayoría de los días no llueve, y el sitio decide cuántos', () => {
    const mojados = (lugar: { pais: string; dia: number }): number =>
      seeds(200).filter((s) => stageWeather(s, lugar).lluvia > 0).length
    const belgica = mojados(FLANDES)
    const espana = mojados(VUELTA)
    // La primavera belga se corre mojada y la Vuelta seca: es el EPIC entero en una línea.
    expect(belgica).toBeGreaterThan(espana * 2)
    // Y en los dos sitios llover sigue siendo la excepción, no la norma.
    expect(belgica).toBeLessThan(120)
  })

  it('y el calor lo pone la fecha: en agosto en España aprieta y en abril en Bélgica no', () => {
    const calor = (lugar: { pais: string; dia: number }): number =>
      seeds(200).reduce((acc, s) => acc + stageWeather(s, lugar).calor, 0) / 200
    expect(calor(VUELTA)).toBeGreaterThan(calor(FLANDES))
    expect(calor(FLANDES)).toBe(0)
  })

  it('es el MISMO sorteo que hace la etapa: mismo subflujo y mismos dados', () => {
    // La prueba de que sacar el clima de `simulateStage` no movió un dígito: se rehace la cuenta a
    // mano sobre el subflujo `clima` y tiene que dar exactamente lo mismo.
    for (const seed of seeds(5)) {
      const rng = stageRng(seed)('clima')
      const bruta = Math.pow(rng(), STAGE.rainDayShape)
      const umbral = Math.pow(1 - STAGE.rainDayProb, STAGE.rainDayShape)
      const lluvia = bruta < umbral ? 0 : (bruta - umbral) / (1 - umbral)
      expect(stageWeather(seed).lluvia).toBeCloseTo(lluvia, 12)
    }
  })
})

describe('la previsión (v42)', () => {
  /**
   * El dueño, al delegar el EPIC: «estaría bien también que pueda existir para los ciclistas y
   * managers una previsión del clima… que además puede cambiar, y con eso tomar diferentes
   * decisiones».
   */
  it('el día de la etapa la previsión ES el tiempo: ya no se prevé, se mira', () => {
    for (const seed of seeds(20)) {
      const real = stageWeather(seed, FLANDES)
      const parte = weatherForecast(seed, FLANDES, 0)
      expect(parte.lluvia).toBeCloseTo(real.lluvia, 12)
      expect(parte.fiabilidad).toBe(1)
    }
  })

  it('y cuanto más lejos, más se parece al almanaque y menos al cielo', () => {
    // Sobre los días que de verdad se mojan, que es donde un parte tiene algo que acertar.
    const mojados = seeds(200).filter((s) => stageWeather(s, FLANDES).lluvia > 0.5)
    expect(mojados.length).toBeGreaterThan(5)
    const errorA = (dias: number): number =>
      mojados.reduce(
        (acc, s) =>
          acc +
          Math.abs(weatherForecast(s, FLANDES, dias).lluvia - stageWeather(s, FLANDES).lluvia),
        0,
      ) / mojados.length
    // Monótono: cada día que se acerca, el parte se acerca. Es lo que hace que CAMBIE.
    expect(errorA(1)).toBeLessThan(errorA(3))
    expect(errorA(3)).toBeLessThan(errorA(5))
    expect(errorA(5)).toBeLessThan(errorA(7))
  })

  it('…pero el tiempo REAL no cambia nunca porque alguien mire el parte', () => {
    // La previsión es una lectura, no un sorteo: consultarla no toca el día.
    for (const seed of seeds(10)) {
      const antes = stageWeather(seed, FLANDES)
      for (const d of [7, 3, 1, 0]) weatherForecast(seed, FLANDES, d)
      expect(stageWeather(seed, FLANDES)).toEqual(antes)
    }
  })

  it('y consultarla dos veces el mismo día da lo mismo: es un parte, no ruido', () => {
    for (const seed of seeds(10)) {
      expect(weatherForecast(seed, FLANDES, 4)).toEqual(weatherForecast(seed, FLANDES, 4))
    }
  })

  it('ni el parte más lejano es una moneda: saber dónde y cuándo ya es saber algo', () => {
    for (const seed of seeds(10)) {
      expect(weatherForecast(seed, FLANDES, 30).fiabilidad).toBe(STAGE.forecastFloor)
    }
  })
})
