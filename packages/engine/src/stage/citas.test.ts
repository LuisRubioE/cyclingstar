import { describe, expect, it } from 'vitest'
import { kmDeLaCita, tramosDelPerfil } from './citas.js'
import type { Block } from './types.js'

/**
 * LAS CITAS DE R22 SOBRE EL PERFIL (paso 17b).
 *
 * Lo que estas pruebas vigilan no es la aritmética sino la promesa: que las cinco formas de decir
 * «cuándo» que R22 añadió dejen de ser letra muerta. El jugador las rellenaba desde el paso 17a, la
 * base las guardaba, y en la carretera no pasaba nada — el defecto de la v58 con otra cara.
 */

const b = (tipo: Block['tipo'], g = 0): Block => ({ g, tipo, estrellas: 0 })

/** Diez bloques de 1 km: llano, PUERTO(2-4), llano, PUERTO(6-8, más duro), llano. */
const perfil: Block[] = [
  b('llano'),
  b('llano'),
  b('subida', 5),
  b('subida', 9),
  b('subida', 4),
  b('llano'),
  b('subida', 6),
  b('subida', 11),
  b('subida', 7),
  b('llano'),
]

describe('las citas que solo dependen del recorrido', () => {
  const tramos = tramosDelPerfil(perfil, 1)

  it('encuentra los puertos como tiradas seguidas de subida', () => {
    expect(tramos.puertos).toEqual([
      { desdeKm: 2, hastaKm: 5, duroKm: 3 },
      { desdeKm: 6, hastaKm: 9, duroKm: 7 },
    ])
  })

  it('«al pie del último puerto» es el principio del último, no del primero', () => {
    expect(kmDeLaCita({ at: 'climb', which: 'last', part: 'pie' }, tramos)).toBe(6)
    expect(kmDeLaCita({ at: 'climb', which: 'penultimate', part: 'pie' }, tramos)).toBe(2)
  })

  it('«en lo más duro» es el bloque de más pendiente, no el del medio', () => {
    // El último puerto sube 6, 11 y 7: lo más duro es el segundo kilómetro, no el central por
    // posición. Con el criterio de «el del medio» habrían coincidido y la prueba no diría nada.
    expect(kmDeLaCita({ at: 'climb', which: 'last', part: 'duro' }, tramos)).toBe(7)
    expect(kmDeLaCita({ at: 'climb', which: 'penultimate', part: 'duro' }, tramos)).toBe(3)
  })

  it('«cerca de la cima» cae dentro del puerto y por encima de lo más duro', () => {
    const cima = kmDeLaCita({ at: 'climb', which: 'last', part: 'cima' }, tramos)!
    expect(cima).toBeGreaterThan(7)
    expect(cima).toBeLessThan(9)
  })

  /**
   * UNA CITA QUE NO SE PUEDE CUMPLIR NO SE INVENTA. Pedir el penúltimo puerto de una etapa con uno
   * solo devuelve `null`, y entonces el hombre corre con su mentalidad. Devolver el único puerto
   * sería darle una cita que él no pidió, y encima en el sitio contrario al que quería.
   */
  it('el penúltimo puerto de una etapa con un solo puerto no existe', () => {
    const uno = tramosDelPerfil([b('llano'), b('subida', 5), b('llano')], 1)
    expect(kmDeLaCita({ at: 'climb', which: 'penultimate', part: 'pie' }, uno)).toBeNull()
    expect(kmDeLaCita({ at: 'climb', which: 'last', part: 'pie' }, uno)).toBe(1)
  })

  it('los sectores de pavés se cuentan por tiradas, y el índice empieza en uno', () => {
    const roubaix = tramosDelPerfil(
      [b('llano'), b('paves'), b('paves'), b('llano'), b('paves'), b('llano')],
      1,
    )
    expect(kmDeLaCita({ at: 'sector', index: 1 }, roubaix)).toBe(1)
    expect(kmDeLaCita({ at: 'sector', index: 2 }, roubaix)).toBe(4)
    expect(kmDeLaCita({ at: 'sector', index: 3 }, roubaix)).toBeNull()
  })

  it('el kilómetro a secas sigue siendo un kilómetro', () => {
    expect(kmDeLaCita({ at: 'km', km: 42 }, tramos)).toBe(42)
  })

  /**
   * Y LAS DOS QUE NO SON POSICIONALES devuelven `null` aquí a propósito: el hueco y el ataque de Z
   * dependen de lo que hagan los demás y no se pueden convertir en un kilómetro antes de empezar.
   * Que esta función las ignore es la frontera, no un olvido.
   */
  it('el hueco y el ataque de otro no son posicionales', () => {
    expect(kmDeLaCita({ at: 'gap', overS: 120 }, tramos)).toBeNull()
    expect(kmDeLaCita({ at: 'attack', byRiderId: 'z' }, tramos)).toBeNull()
    expect(kmDeLaCita({ at: 'weather', cond: 'lluvia' }, tramos)).toBeNull()
  })

  it('sin cita, no hay cita', () => {
    expect(kmDeLaCita(null, tramos)).toBeNull()
    expect(kmDeLaCita(undefined, tramos)).toBeNull()
  })
})
