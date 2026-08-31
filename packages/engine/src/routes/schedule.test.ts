import { describe, expect, it } from 'vitest'
import { SEASON_CALENDAR } from './calendar.js'
import { scheduledStageIndex, stageDayOfSeason, stagePlace } from './schedule.js'

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

/**
 * EL SITIO DE UNA ETAPA, que es de donde sale su clima (v44). Estas dos pruebas no vigilan una
 * cuenta —es una suma— sino un CONTRATO entre dos paquetes: `packages/db` corre la etapa con este
 * sitio y la API da el parte meteorológico de antes con el mismo. Si alguien cambiara uno de los dos
 * lados, el parte anunciaría el tiempo de otra carrera y nadie se enteraría, porque las dos cosas
 * seguirían funcionando por separado.
 */
describe('el sitio de una etapa (v44)', () => {
  it('avanza un día por etapa desde el arranque de la carrera', () => {
    expect(stagePlace(france, 1).dia).toBe(france.startDay)
    expect(stagePlace(france, 5).dia).toBe(france.startDay + 4)
  })

  it('lleva el país cuando la carrera lo tiene, y no lo inventa cuando no', () => {
    const conPais = SEASON_CALENDAR.find((r) => r.country != null)!
    expect(stagePlace(conPais, 1).pais).toBe(conPais.country)
    const sinPais = SEASON_CALENDAR.find((r) => r.country == null)
    if (sinPais) expect(stagePlace(sinPais, 1).pais).toBeUndefined()
  })
})
