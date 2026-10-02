import { CEILING_OPINIONS } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { COACH_OPINION_TEXT } from './coachOpinion'

/**
 * EL ENTRENADOR NO HABLA EN ESTRELLAS (docs/agenda.md §4.20). El dueño creó un velocista y el
 * entrenador le dijo que no pasaría de tres estrellas en nada. Lo que se sella aquí es la mitad de
 * la pantalla: ninguna frase puede volver a dar un nivel.
 */
describe('web: las frases del entrenador', () => {
  it('cada código del contrato tiene su frase', () => {
    for (const code of CEILING_OPINIONS) expect(COACH_OPINION_TEXT[code]).toBeTruthy()
  })

  it('ninguna menciona estrellas ni números', () => {
    for (const code of CEILING_OPINIONS) {
      expect(COACH_OPINION_TEXT[code]).not.toMatch(/★|☆|star|\d/i)
    }
  })

  it('las de la primera lectura son vagas: dudan en voz alta', () => {
    expect(COACH_OPINION_TEXT.pronto).toMatch(/too early/i)
    expect(COACH_OPINION_TEXT.asoma).toMatch(/seems/i)
    expect(COACH_OPINION_TEXT.asoma).toMatch(/too early/i)
  })
})
