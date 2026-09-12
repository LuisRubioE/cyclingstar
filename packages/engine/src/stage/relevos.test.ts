import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import { advanceQueue, emptyQueue, pullKmFor } from './relayQueue.js'

/**
 * EL TURNO COMO COLA (docs/tactica.md R18.1, paso 7).
 *
 * Lo que se prueba aquí es **la memoria**, que es lo que hoy no existe: `relayTurn` se rehace desde
 * cero cada cien metros, así que los mismos hombres van al frente kilómetro tras kilómetro hasta que
 * la frescura les cambia el orden por sí sola. Un relevo es lo contrario: das tu turno, te apartas y
 * no vuelves a cabeza hasta que la cola gire entera.
 */
describe('engine: la cola del turno de relevos', () => {
  it('EL QUE AGOTA SU TURNO SE VA AL FINAL, y no vuelve hasta que la cola gire', () => {
    const q = emptyQueue()
    const gente = ['a', 'b', 'c', 'd']
    // Ventana de uno: la cola es literal y el reparto se ve a simple vista.
    const vistos: string[] = []
    const km = pullKmFor('llano')
    // Cinco turnos completos: los cuatro de la cola y el giro.
    for (let i = 0; i < (5 * km) / STAGE.dx; i++) {
      const dando = advanceQueue(q, gente, 1, STAGE.dx, 'llano')
      const uno = [...dando][0]!
      if (vistos.at(-1) !== uno) vistos.push(uno)
    }
    expect(vistos.slice(0, 4)).toEqual(['a', 'b', 'c', 'd'])
    // …y al quinto vuelve el primero: la cola ha girado entera.
    expect(vistos[4]).toBe('a')
  })

  it('el que entra nuevo lo hace POR EL FINAL, no de cabeza', () => {
    const q = emptyQueue()
    advanceQueue(q, ['a', 'b'], 1, STAGE.dx, 'llano')
    const dando = advanceQueue(q, ['a', 'b', 'nuevo'], 1, STAGE.dx, 'llano')
    // El que acaba de decidir que colabora no se pone a tirar por delante de quien ya estaba.
    expect(dando.has('nuevo')).toBe(false)
    expect(q.order.at(-1)).toBe('nuevo')
  })

  it('el que se va del grupo desaparece de la cola', () => {
    const q = emptyQueue()
    advanceQueue(q, ['a', 'b', 'c'], 2, STAGE.dx, 'llano')
    advanceQueue(q, ['a', 'c'], 2, STAGE.dx, 'llano')
    expect(q.order).not.toContain('b')
    expect(q.kmLeft.has('b')).toBe(false)
  })

  it('en cuesta y en abanico el turno dura menos', () => {
    expect(pullKmFor('subida')).toBeLessThan(pullKmFor('llano'))
    expect(pullKmFor('abanico')).toBeLessThan(pullKmFor('subida'))
  })

  it('con la ventana más ancha que la cola, tiran todos y nadie se queda fuera', () => {
    const q = emptyQueue()
    const dando = advanceQueue(q, ['a', 'b'], 8, STAGE.dx, 'llano')
    expect(dando).toEqual(new Set(['a', 'b']))
  })

  it('sin nadie elegible no da la cara nadie, y no revienta', () => {
    const q = emptyQueue()
    expect(advanceQueue(q, [], 4, STAGE.dx, 'llano').size).toBe(0)
  })

  it('EL REPARTO SE IGUALA, que es el defecto que esto viene a matar', () => {
    // Con el turno rehecho desde cero cada bloque, el orden lo decide el deber y los mismos van
    // delante todo el día. Con cola, ocho hombres se reparten el trabajo casi a partes iguales.
    const q = emptyQueue()
    const gente = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const cuenta = new Map<string, number>(gente.map((id) => [id, 0]))
    for (let i = 0; i < 2000; i++) {
      for (const id of advanceQueue(q, gente, 2, STAGE.dx, 'llano')) {
        cuenta.set(id, (cuenta.get(id) ?? 0) + 1)
      }
    }
    const valores = [...cuenta.values()]
    const min = Math.min(...valores)
    const max = Math.max(...valores)
    expect(max / min).toBeLessThan(1.15)
  })

  it('el juego de equipo nace apagado', () => {
    expect(STAGE.teamPlay.enabled).toBe(false)
  })
})
