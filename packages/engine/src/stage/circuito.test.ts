import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import { cuerdaDelCircuito } from './citas.js'

/**
 * R28.6 / S-227 — EL CIRCUITO (paso 18b), y su regla es una frase del diseño: **«la carrera arranca
 * a dos vueltas»**.
 *
 * El diseño lo escribe en tres trozos y los tres hablan de lo mismo, cuántas vueltas quedan: con más
 * de dos por delante no pasa nada serio; en la penúltima **se caza la fuga**, o sea se corre normal;
 * y en la última **sale el ataque decisivo**.
 *
 * «La criba se ACUMULA vuelta a vuelta» no necesita código: sale sola de pasar varias veces por los
 * mismos puertos, porque el recorrido los lleva ya desplegados.
 */
describe('la cuerda de un circuito', () => {
  const { antesDeDosVueltas, ultimaVuelta } = STAGE.circuito
  /** Un circuito de 200 km en 5 vueltas: 40 km cada una. */
  const cuerda = (km: number, laps = 5) =>
    cuerdaDelCircuito(km, 200, laps, antesDeDosVueltas, ultimaVuelta)

  it('sin vueltas declaradas no toca nada: es el calendario de hoy entero', () => {
    for (const km of [0, 50, 120, 199]) {
      expect(cuerdaDelCircuito(km, 200, undefined, antesDeDosVueltas, ultimaVuelta)).toBe(1)
      expect(cuerdaDelCircuito(km, 200, 1, antesDeDosVueltas, ultimaVuelta)).toBe(1)
    }
  })

  it('con más de dos vueltas por delante la carrera no ha arrancado', () => {
    // Quedan 5, 4 y algo más de 2 vueltas.
    expect(cuerda(0)).toBe(antesDeDosVueltas)
    expect(cuerda(40)).toBe(antesDeDosVueltas)
    expect(cuerda(119)).toBe(antesDeDosVueltas)
  })

  it('en la PENÚLTIMA se corre normal: ni se frena ni se dispara', () => {
    // Quedan dos vueltas justas (km 120) y una y pico (km 159).
    expect(cuerda(120)).toBe(1)
    expect(cuerda(159)).toBe(1)
  })

  it('y en la ÚLTIMA sale el ataque decisivo', () => {
    expect(cuerda(160)).toBe(ultimaVuelta)
    expect(cuerda(199)).toBe(ultimaVuelta)
  })

  /** La frontera es exacta y se comprueba, porque «a dos vueltas» es un sitio, no una sensación. */
  it('las dos fronteras caen donde el diseño dice', () => {
    expect(cuerda(119.9)).toBe(antesDeDosVueltas)
    expect(cuerda(120)).toBe(1)
    expect(cuerda(159.9)).toBe(1)
    expect(cuerda(160)).toBe(ultimaVuelta)
  })

  /** Un circuito de DOS vueltas arranca en el km 0: no hay «antes de dos vueltas» que valga. */
  it('con dos vueltas la carrera arranca desde el principio', () => {
    const dos = (km: number) => cuerdaDelCircuito(km, 100, 2, antesDeDosVueltas, ultimaVuelta)
    expect(dos(0)).toBe(1)
    expect(dos(49)).toBe(1)
    expect(dos(50)).toBe(ultimaVuelta)
  })

  it('un recorrido de cero km no rompe la cuenta', () => {
    expect(cuerdaDelCircuito(0, 0, 5, antesDeDosVueltas, ultimaVuelta)).toBe(1)
  })
})
