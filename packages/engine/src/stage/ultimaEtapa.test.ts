import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import { type UltimoDia, finDelPaseo, kmDelTodoONada, ultimoDiaDeVuelta } from './citas.js'

/**
 * R28.4 — LA ÚLTIMA ETAPA DE UNA VUELTA (paso 18b · S-075, S-270).
 *
 * El diseño escribe dos etapas debajo de la misma cabecera, y hasta aquí el motor las corría las dos
 * como un martes cualquiera:
 *
 * - general DECIDIDA: «paseo hasta el circuito (compromiso ≤ 0,45), sin fugas serias ni ataques de
 *   general durante ~80 km, y el sprint del circuito DE VERDAD».
 * - última etapa DECISIVA (final en alto o crono final): «todo o nada — se ataca desde el PENÚLTIMO
 *   puerto, los equipos se funden enteros y el maillot no deja ir nada».
 *
 * Lo que las separa es DÓNDE ACABA, y eso el motor ya lo sabía.
 */
describe('qué última etapa es ésta', () => {
  const dia = (stageDay: number, totalStages: number, bunch: boolean): UltimoDia =>
    ultimoDiaDeVuelta({ stageDay, totalStages }, bunch)

  it('la última al sprint es un paseo hasta el circuito', () => {
    expect(dia(21, 21, true)).toBe('paseo')
  })

  it('la última en alto es el todo o nada', () => {
    expect(dia(21, 21, false)).toBe('decisiva')
  })

  it('cualquier otra etapa de la vuelta es un martes', () => {
    expect(dia(20, 21, true)).toBe('ninguno')
    expect(dia(1, 21, false)).toBe('ninguno')
    expect(dia(11, 21, true)).toBe('ninguno')
  })

  /**
   * Y ÉSTA ES LA QUE IMPIDE QUE SE MUEVA NADA MEDIDO. En una carrera de un día no hay «última
   * etapa»: hay una etapa. Los escenarios canónicos son todos de un día, así que ni las cuatro
   * huellas ni las bandas pueden notar esta ley — y eso no es una esperanza, es esta línea.
   */
  it('una carrera de un día no tiene última etapa', () => {
    expect(dia(1, 1, true)).toBe('ninguno')
    expect(dia(1, 1, false)).toBe('ninguno')
  })

  /**
   * SIN CONTEXTO DE CARRERA TAMPOCO. Es el caso de TODOS los bancos de este repositorio —ni
   * `grandTour` ni `smallTours` ni los escenarios pasan `race`—, y por eso esta ley **hoy solo vive
   * en producción**, donde `buildRaceContext` sí lo manda. Queda dicho aquí en vez de disimularse.
   */
  it('sin contexto de carrera no se enciende', () => {
    expect(ultimoDiaDeVuelta(undefined, true)).toBe('ninguno')
    expect(ultimoDiaDeVuelta({}, true)).toBe('ninguno')
    expect(ultimoDiaDeVuelta({ stageDay: 21 }, true)).toBe('ninguno')
  })
})

/**
 * Y DÓNDE SE ACABA EL PASEO, que es la otra mitad de la regla y la que impide que el paseo se coma la
 * etapa. El diseño pide las dos cosas a la vez: «paseo hasta el circuito… **y el sprint del circuito
 * DE VERDAD**».
 */
describe('dónde se acaba el paseo y empieza el circuito', () => {
  const { paseoKm, circuitoMinKm } = STAGE.ultimaEtapa

  it('en una etapa larga el paseo dura lo que dice el diseño', () => {
    expect(finDelPaseo(180, paseoKm, circuitoMinKm)).toBe(paseoKm)
    expect(finDelPaseo(140, paseoKm, circuitoMinKm)).toBe(paseoKm)
  })

  /**
   * LA ÚLTIMA ETAPA ES CORTA A PROPÓSITO —el calendario la acorta con `lastStageKmFactor`— y ahí es
   * donde un paseo fijo de 80 km se la comería entera. Se recorta el paseo, no el circuito.
   */
  it('en una etapa corta se recorta el PASEO, no el circuito', () => {
    expect(finDelPaseo(100, paseoKm, circuitoMinKm)).toBe(100 - circuitoMinKm)
    expect(finDelPaseo(90, paseoKm, circuitoMinKm)).toBe(90 - circuitoMinKm)
  })

  it('y en una etapa más corta que el circuito no hay paseo en absoluto', () => {
    expect(finDelPaseo(30, paseoKm, circuitoMinKm)).toBe(0)
    expect(finDelPaseo(0, paseoKm, circuitoMinKm)).toBe(0)
  })

  /** El circuito nunca baja de su mínimo mientras la etapa dé para él. */
  it('el circuito nunca se queda por debajo de su mínimo', () => {
    for (const km of [60, 90, 110, 130, 160, 200]) {
      const circuito = km - finDelPaseo(km, paseoKm, circuitoMinKm)
      expect(circuito).toBeGreaterThanOrEqual(Math.min(km, circuitoMinKm))
    }
  })
})

/**
 * DÓNDE EMPIEZA EL TODO O NADA. «Se ataca desde el PENÚLTIMO puerto» — y el diseño no dice qué pasa
 * cuando la última etapa tiene un solo puerto, que es un final en alto normal y el caso más decisivo
 * que hay. La primera versión lo dejaba en `null` y **apagaba el brazo decisivo entero en esas
 * etapas sin que nadie se enterara**.
 */
describe('desde dónde se ataca en una última etapa decisiva', () => {
  const puertos = (...kms: number[]) => kms.map((desdeKm) => ({ desdeKm }))

  it('con dos puertos o más, el penúltimo', () => {
    expect(kmDelTodoONada(puertos(40, 90))).toBe(40)
    expect(kmDelTodoONada(puertos(30, 70, 120))).toBe(70)
    expect(kmDelTodoONada(puertos(10, 40, 80, 130))).toBe(80)
  })

  it('con UN solo puerto, ése: el penúltimo es el último', () => {
    expect(kmDelTodoONada(puertos(95))).toBe(95)
  })

  it('sin puertos no se inventa un kilómetro', () => {
    expect(kmDelTodoONada([])).toBeNull()
  })
})
