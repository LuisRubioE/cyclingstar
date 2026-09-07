import { describe, expect, it } from 'vitest'
import { resolveCountry } from '@cyclingstar/shared'

/**
 * EL PAÍS POR IP, Y LO QUE PASA CUANDO NO SE SABE (v58).
 *
 * El dueño entró sin cuenta desde una IP española y la pantalla le dijo que el juego no estaba
 * disponible en su país. España está soportada; lo que falló fue la detección. Estas pruebas sellan
 * las dos mitades de la regla: un código que llega se resuelve a un país jugable, y uno que NO es un
 * país —lo que Cloudflare manda cuando no lo sabe— no se convierte en uno por el camino.
 */
describe('el país por IP', () => {
  it('un país soportado se queda como está', () => {
    expect(resolveCountry('ES')).toBe('ES')
    expect(resolveCountry('es')).toBe('ES')
  })

  it('un país sin datos cae en el más cercano, no en la nada', () => {
    // El Vaticano no tiene lista de nombres propia: sus corredores son italianos.
    expect(resolveCountry('VA')).toBe('IT')
  })

  it('sin código no hay país: es «no lo sé», y la pantalla tiene que preguntar', () => {
    expect(resolveCountry(null)).toBeNull()
    expect(resolveCountry('')).toBeNull()
  })
})
