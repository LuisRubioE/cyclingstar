import { describe, expect, it } from 'vitest'
import { raceDayTitle } from './raceDay'

describe('raceDayTitle (E3, PR 21h)', () => {
  it('un día de carrera, con la carrera de su clave y su etapa: nunca la clave cruda', () => {
    expect(raceDayTitle('carrera:race-jaen:e1')).toBe('Jaen · Stage 1')
    expect(raceDayTitle('carrera:race-great-ocean:e12')).toBe('Great Ocean · Stage 12')
    // una de un día, o una clave sin etapa
    expect(raceDayTitle('carrera:race-sanremo')).toBe('Sanremo')
  })

  it('lo que no es un día de carrera, null', () => {
    expect(raceDayTitle('fondo')).toBeNull()
    expect(raceDayTitle('carrera')).toBeNull()
  })
})
