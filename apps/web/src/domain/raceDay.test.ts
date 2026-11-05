import { describe, expect, it } from 'vitest'
import { raceDayTitle, raceNamesOf } from './raceDay'

describe('raceDayTitle (E3, PR 21h)', () => {
  it('un día de carrera, con la carrera de su clave y su etapa: nunca la clave cruda', () => {
    expect(raceDayTitle('carrera:race-jaen:e1')).toBe('Jaen · Stage 1')
    expect(raceDayTitle('carrera:race-great-ocean:e12')).toBe('Great Ocean · Stage 12')
    // una de un día, o una clave sin etapa
    expect(raceDayTitle('carrera:race-sanremo')).toBe('Sanremo')
  })

  it('con el nombre de la carrera de los resultados del corredor, el suyo, con su tilde y su Race (la revisión del 21h)', () => {
    const nombres = raceNamesOf([
      { raceId: 'race-liege', raceName: 'Race Liège' },
      { raceId: 'race-to-the-sun', raceName: 'Race to the Sun' },
    ])
    expect(raceDayTitle('carrera:race-liege:e2', nombres)).toBe('Race Liège · Stage 2')
    expect(raceDayTitle('carrera:race-to-the-sun', nombres)).toBe('Race to the Sun')
    // la que no está en ellos, de su clave
    expect(raceDayTitle('carrera:race-jaen:e1', nombres)).toBe('Jaen · Stage 1')
  })

  it('lo que no es un día de carrera, null', () => {
    expect(raceDayTitle('fondo')).toBeNull()
    expect(raceDayTitle('carrera')).toBeNull()
  })
})
