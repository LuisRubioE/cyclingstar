import { SEASON_CALENDAR } from '@cyclingstar/engine'
import { describe, expect, it } from 'vitest'
import { isNaturalRace } from './teamPlan.js'

/** Localiza carreras representativas del calendario para las aserciones. */
const champ = SEASON_CALENDAR.find((r) => r.championshipCountry)!
const wtRace = SEASON_CALENDAR.find((r) => r.raceClass === 'WT')!
const proRace = SEASON_CALENDAR.find((r) => r.raceClass === 'Pro')!
const conAmerica = SEASON_CALENDAR.find((r) => r.region === 'America' && !r.championshipCountry)!
const conEurope = SEASON_CALENDAR.find((r) => r.region === 'Europe' && !r.championshipCountry)!

describe('db: calendario natural del equipo (isNaturalRace)', () => {
  it('un continental corre las continentales de SU continente, no las de otros', () => {
    expect(isNaturalRace(conAmerica, 'CON', 'America')).toBe(true)
    expect(isNaturalRace(conAmerica, 'CON', 'Europe')).toBe(false)
    expect(isNaturalRace(conEurope, 'CON', 'Europe')).toBe(true)
  })

  it('un WorldTour/Pro NO corre las continentales por defecto (las añade si quiere)', () => {
    expect(isNaturalRace(conAmerica, 'WT', 'America')).toBe(false)
    expect(isNaturalRace(conAmerica, 'PRS', 'America')).toBe(false)
  })

  it('las carreras globales son naturales de su división de casa', () => {
    expect(isNaturalRace(wtRace, 'WT', 'Europe')).toBe(true)
    expect(isNaturalRace(wtRace, 'PRS', 'Europe')).toBe(false)
    expect(isNaturalRace(proRace, 'PRS', 'Europe')).toBe(true)
    expect(isNaturalRace(proRace, 'WT', 'Europe')).toBe(false)
    expect(isNaturalRace(proRace, 'CON', 'Europe')).toBe(false)
  })

  it('un campeonato nacional nunca es carrera de equipo (pelotón individual)', () => {
    expect(isNaturalRace(champ, 'CON', 'Europe')).toBe(false)
    expect(isNaturalRace(champ, 'WT', 'Europe')).toBe(false)
  })
})
