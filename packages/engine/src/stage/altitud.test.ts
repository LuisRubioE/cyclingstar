import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import { altitudesDelPerfil } from './citas.js'
import { altitudeCost, tacticalCostFactor } from './cost.js'
import type { Block } from './types.js'

/**
 * LA ALTITUD (paso 18d, R28.7 · S-479).
 *
 * Es el quinto multiplicador del coste del bloque y **el único que no es de suma cero por grupo**:
 * los otros cuatro redistribuyen —el que empuja paga, el que se esconde ahorra— y éste encarece a
 * todo el que sube. Por eso va en PR propio, con `ENGINE_VERSION++` y con su propio tope.
 *
 * Y va con **dos sustitutos declarados**, porque el repositorio no tiene los datos que la regla pide:
 *
 * 1. **No hay altitud absoluta.** El calendario guarda pendientes, no cotas. Entra `startM` con
 *    defecto 0, así que hoy la ley **no cobra nada** y despierta sola el día que los recorridos
 *    traigan su cota. Eso es lo que mide la última prueba, y es el brazo A/B de este paso.
 * 2. **No hay peso de corredor.** El diseño dice «el corpulento y el que no ha hecho altura pierden
 *    más que el escalador ligero»; de esa frase este modelo solo sabe lo segundo, así que la carga
 *    sale de la capacidad de subir invertida. Es un sustituto, no el dato.
 */

const b = (g: number): Block => ({ g, tipo: g > 0 ? 'subida' : 'llano', estrellas: 0 })

describe('la altitud de un recorrido', () => {
  it('se integra desde la cota de salida: 5 % durante 2 km son 100 m', () => {
    expect(altitudesDelPerfil([b(5), b(5)], 1, 0)).toEqual([50, 100])
  })

  it('y parte de donde diga el perfil, no siempre del mar', () => {
    expect(altitudesDelPerfil([b(5)], 1, 1800)).toEqual([1850])
  })

  it('bajar resta', () => {
    expect(altitudesDelPerfil([b(10), b(-10)], 1, 2000)).toEqual([2100, 2000])
  })
})

describe('lo que cuesta el aire fino', () => {
  it('por debajo del umbral no cuesta NADA, y es cero exacto', () => {
    expect(altitudeCost(STAGE.altitudeThresholdM, 50)).toBe(0)
    expect(altitudeCost(1999, 20)).toBe(0)
    expect(altitudeCost(0, 20)).toBe(0)
  })

  /**
   * EL QUE PEOR SUBE PAGA MÁS, que es la frase entera de la regla: un puerto a 2.500 m no es el
   * mismo puerto para todos, y por eso «el equipo lo cuenta al elegir dónde ataca y a quién lleva a
   * la reina».
   */
  it('a la misma altura, el que peor sube paga más', () => {
    const escalador = altitudeCost(2500, 90)
    const rodador = altitudeCost(2500, 20)
    expect(rodador).toBeGreaterThan(escalador)
    expect(escalador).toBeGreaterThan(0)
  })

  it('cuanto más alto, más caro', () => {
    expect(altitudeCost(2500, 50)).toBeGreaterThan(altitudeCost(2100, 50))
  })

  /**
   * Y EL TOPE, que en éste importa más que en los otros cuatro precisamente porque no redistribuye:
   * sin él, una etapa muy alta dejaría de ser una etapa dura para pasar a decidirse sola.
   */
  it('tiene tope, y ni el puerto más alto del mundo lo rebasa', () => {
    expect(altitudeCost(5000, 0)).toBe(STAGE.altitudeCap)
    expect(altitudeCost(2758, 0)).toBeLessThanOrEqual(STAGE.altitudeCap)
  })
})

/**
 * EL BRAZO A/B DE ESTE PASO, y la razón por la que se puede mezclar sin mover una sola banda: con
 * los recorridos que el calendario tiene HOY —ninguno con cota— el término vale cero, y el factor
 * del bloque vuelve a ser 1 exacto. La ley está puesta y dormida, no puesta y funcionando a medias.
 */
describe('con los recorridos de hoy, la ley no cobra nada', () => {
  it('un perfil sin cota de salida no llega nunca al umbral', () => {
    // Una reina de 3.000 m de desnivel ACUMULADO que arranca en el mar: sube y baja, y su punto más
    // alto queda muy por debajo de 2.000. El desnivel acumulado no es la altitud, y ésa es la
    // diferencia que hace que este paso sea inocuo hasta que haya cotas.
    const reina = [b(8), b(8), b(-8), b(8), b(8), b(-8)]
    const alturas = altitudesDelPerfil(reina, 1, 0)
    expect(Math.max(...alturas)).toBeLessThan(STAGE.altitudeThresholdM)
    for (const m of alturas) expect(altitudeCost(m, 50)).toBe(0)
  })

  it('y sin ningún término, el factor del bloque es 1 exacto', () => {
    expect(tacticalCostFactor({ push: 0, accordion: 0, altitude: 0 }, 0)).toBe(1)
  })
})
