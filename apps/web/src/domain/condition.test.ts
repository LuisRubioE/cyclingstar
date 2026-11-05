import { describe, expect, it } from 'vitest'
import { conditionLabel, conditionLevel } from './condition'

/**
 * La condición que ve el jugador. Las dos barras del diario salen ya hechas de la API desde el 19b (E3,
 * docs/visual.md §13.5; `screenShape.test.ts` en `apps/api`): aquí queda lo que la web pone encima, la
 * palabra y los segmentos del medidor.
 */
describe('la condición que ve el jugador', () => {
  it('la etiqueta cualitativa cubre toda la escala', () => {
    expect(conditionLabel(95)).toBe('Excellent')
    expect(conditionLabel(65)).toBe('Good')
    expect(conditionLabel(45)).toBe('Fair')
    expect(conditionLabel(25)).toBe('Low')
    expect(conditionLabel(5)).toBe('Very low')
  })

  it('el medidor de cuatro segmentos dice lo mismo que la palabra: ninguno en `Very low`, los cuatro en `Excellent` (§4.8; 19b)', () => {
    expect([5, 25, 45, 65, 95].map(conditionLevel)).toEqual([0, 1, 2, 3, 4])
    expect([0, 19, 20, 39, 40, 59, 60, 79, 80, 100].map(conditionLevel)).toEqual([
      0, 0, 1, 1, 2, 2, 3, 3, 4, 4,
    ])
    for (let v = 0; v <= 100; v++) {
      const palabra = ['Very low', 'Low', 'Fair', 'Good', 'Excellent'][conditionLevel(v)]
      expect(palabra, String(v)).toBe(conditionLabel(v))
    }
  })
})
