import { describe, expect, it } from 'vitest'
import { SEASON_CALENDAR } from './calendar.js'
import { scheduledStageIndex, stageDayOfSeason } from './schedule.js'

const france = SEASON_CALENDAR.find((r) => r.id === 'race-france')!

describe('engine: calendario a días de juego (Paso 44)', () => {
  it('la primera etapa cae en el día de arranque', () => {
    expect(stageDayOfSeason(france, 1)).toBe(france.startDay)
  })

  it('los descansos empujan las etapas posteriores', () => {
    // Race France descansa tras la 9 y la 15. La etapa 10 cae un día después de lo normal.
    expect(stageDayOfSeason(france, 10)).toBe(france.startDay + 9 + 1)
    // La etapa 16 lleva dos descansos por delante.
    expect(stageDayOfSeason(france, 16)).toBe(france.startDay + 15 + 2)
  })

  it('scheduledStageIndex es la inversa de stageDayOfSeason', () => {
    for (let i = 1; i <= france.stages.length; i++) {
      expect(scheduledStageIndex(france, stageDayOfSeason(france, i))).toBe(i)
    }
  })

  it('devuelve null en un día sin etapa (descanso)', () => {
    const restDay = france.startDay + 9 // el primer día de descanso
    expect(scheduledStageIndex(france, restDay)).toBeNull()
  })

  it('una carrera de un día solo corre en su día de arranque', () => {
    const oneDay = SEASON_CALENDAR.find((r) => r.format === 'un-dia')!
    expect(scheduledStageIndex(oneDay, oneDay.startDay)).toBe(1)
    expect(scheduledStageIndex(oneDay, oneDay.startDay + 1)).toBeNull()
  })
})
