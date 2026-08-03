import { SEASON_CALENDAR } from '@cyclingstar/engine'
import { describe, expect, it } from 'vitest'
import { type AttendanceTeam, isNaturalRace, ownedTeamAttendance } from './teamPlan.js'

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

describe('db: asistencia de equipos con dueño (ownedTeamAttendance)', () => {
  // Un continental venezolano (América) y otro europeo, ambos con dueño; un bot americano.
  const veTeam: AttendanceTeam = { id: 've', division: 'CON', country: 'VE', ownerUserId: 'u1' }
  const euTeam: AttendanceTeam = { id: 'eu', division: 'CON', country: 'FR', ownerUserId: 'u2' }
  const botTeam: AttendanceTeam = { id: 'bot', division: 'CON', country: 'CO', ownerUserId: null }
  const teams = [veTeam, euTeam, botTeam]

  it('sin excepciones, cada equipo con dueño corre su calendario natural (su continente)', () => {
    const { forcedIn, forcedOut } = ownedTeamAttendance(teams, conAmerica, new Map())
    expect(forcedIn.has('ve')).toBe(true) // venezolano en carrera americana: natural → dentro
    expect(forcedOut.has('eu')).toBe(true) // europeo en carrera americana: no natural → fuera
    expect(forcedIn.has('bot')).toBe(false) // los bots no se tocan
    expect(forcedOut.has('bot')).toBe(false)
  })

  it('un override attend=false saca al equipo de una carrera natural', () => {
    const { forcedIn, forcedOut } = ownedTeamAttendance(teams, conAmerica, new Map([['ve', false]]))
    expect(forcedOut.has('ve')).toBe(true)
    expect(forcedIn.has('ve')).toBe(false)
  })

  it('un override attend=true mete al equipo en una carrera de fuera (viaje)', () => {
    const { forcedIn } = ownedTeamAttendance(teams, conEurope, new Map([['ve', true]]))
    expect(forcedIn.has('ve')).toBe(true) // venezolano que se apunta a una carrera europea
  })
})
