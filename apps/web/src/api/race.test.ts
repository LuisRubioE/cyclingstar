import { describe, expect, it } from 'vitest'
import { type RaceView, daysUntilStart, endDay } from './race'

/** Vista mínima de carrera para las pruebas: solo lo que miran los cálculos de fechas. */
function view(partial: Partial<RaceView> = {}): RaceView {
  return {
    race: {
      id: 'race-x',
      name: 'Race X',
      level: 'WT',
      raceClass: 'WT',
      format: 'una-semana',
      stageCount: 7,
      country: 'ES',
      startDay: 100,
    },
    dayOfSeason: null,
    status: 'upcoming',
    runDays: [],
    stages: [],
    restAfter: [],
    gc: [],
    points: [],
    kom: [],
    stageWinners: [],
    history: [],
    ...partial,
  }
}

describe('días hasta la salida', () => {
  it('resta el día actual de la temporada al día de salida', () => {
    expect(daysUntilStart(view({ dayOfSeason: 90 }))).toBe(10)
  })

  it('es negativo si la carrera ya salió', () => {
    expect(daysUntilStart(view({ dayOfSeason: 103 }))).toBe(-3)
  })

  it('es null si aún no hay mundo y por tanto no hay "hoy"', () => {
    expect(daysUntilStart(view({ dayOfSeason: null }))).toBeNull()
  })
})

describe('último día de la carrera', () => {
  it('una carrera de una semana ocupa tantos días como etapas', () => {
    // 7 etapas desde el día 100: del 100 al 106.
    expect(endDay(view())).toBe(106)
  })

  it('los días de descanso alargan la carrera', () => {
    const granVuelta = view({
      race: { ...view().race, stageCount: 21, format: 'gran-vuelta' },
      restAfter: [9, 15],
    })
    // 21 etapas + 2 descansos desde el día 100: termina el 122.
    expect(endDay(granVuelta)).toBe(122)
  })

  it('una carrera de un día empieza y acaba el mismo día', () => {
    const unDia = view({ race: { ...view().race, stageCount: 1, format: 'un-dia' } })
    expect(endDay(unDia)).toBe(100)
  })
})
