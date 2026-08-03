import { describe, expect, it } from 'vitest'
import { RACE_CLASSES } from './uci.js'
import { SEASON_CALENDAR } from './calendar.js'

describe('engine: calendario de temporada (SPEC 8, Paso 34)', () => {
  it('tiene 35 carreras base + 92 campeonatos nacionales, con id único', () => {
    const nc = SEASON_CALENDAR.filter((r) => r.championshipCountry)
    const base = SEASON_CALENDAR.filter((r) => !r.championshipCountry)
    expect(base).toHaveLength(35)
    expect(nc).toHaveLength(92)
    expect(SEASON_CALENDAR).toHaveLength(127)
    const ids = new Set(SEASON_CALENDAR.map((r) => r.id))
    expect(ids.size).toBe(127)
  })

  it('cada carrera lleva una clase de carrera coherente con su nivel', () => {
    for (const race of SEASON_CALENDAR) {
      expect(RACE_CLASSES).toContain(race.raceClass)
      if (race.championshipCountry) expect(race.raceClass).toBe('NC')
      else if (race.level === 'WT') expect(race.raceClass).toBe('WT')
      else if (race.level === 'PRS') expect(race.raceClass).toBe('Pro')
    }
  })

  it('cada campeonato nacional es de un día, con país y sin inscripción por división', () => {
    const nc = SEASON_CALENDAR.filter((r) => r.championshipCountry)
    for (const race of nc) {
      expect(race.format).toBe('un-dia')
      expect(race.championshipCountry).toMatch(/^[A-Z]{2}$/)
      expect(race.openTo).toHaveLength(0)
    }
    // Un país por campeonato, sin duplicados.
    const countries = nc.map((r) => r.championshipCountry)
    expect(new Set(countries).size).toBe(nc.length)
  })

  it('todas arrancan en días de competición (15..290) y están ordenadas por día', () => {
    for (const race of SEASON_CALENDAR) {
      expect(race.startDay).toBeGreaterThanOrEqual(15)
      expect(race.startDay).toBeLessThanOrEqual(290)
    }
    const days = SEASON_CALENDAR.map((r) => r.startDay)
    expect([...days].sort((a, b) => a - b)).toEqual(days)
  })

  it('incluye las tres grandes vueltas con 21 etapas y dos descansos', () => {
    const grandTours = SEASON_CALENDAR.filter((r) => r.format === 'gran-vuelta')
    expect(grandTours.map((r) => r.id).sort()).toEqual(['race-france', 'race-italy', 'race-spain'])
    for (const gt of grandTours) {
      expect(gt.stages).toHaveLength(21)
      expect(gt.restAfter).toHaveLength(2)
    }
  })

  it('Race France tiene una etapa de adoquines y dos cronos, con perfiles variados', () => {
    const france = SEASON_CALENDAR.find((r) => r.id === 'race-france')
    expect(france).toBeDefined()
    expect(france?.stages).toHaveLength(21)
    const kinds = new Set(france?.stages.map((s) => s.kind))
    expect(kinds).toContain('llana')
    expect(kinds).toContain('reina')
    expect(kinds).toContain('cri')
    expect(kinds).toContain('clasica')
    expect(france?.stages.filter((s) => s.timeTrial)).toHaveLength(2)
  })

  it('cada etapa tiene un perfil con segmentos de km positivos', () => {
    for (const race of SEASON_CALENDAR) {
      expect(race.stages.length).toBeGreaterThan(0)
      for (const stage of race.stages) {
        expect(stage.profile.segments.length).toBeGreaterThan(0)
        for (const seg of stage.profile.segments) {
          expect(seg.km).toBeGreaterThan(0)
        }
        // Los banners caen dentro del recorrido.
        const total = stage.profile.segments.reduce((sum, s) => sum + s.km, 0)
        for (const banner of stage.profile.banners ?? []) {
          expect(banner.km).toBeGreaterThanOrEqual(0)
          expect(banner.km).toBeLessThanOrEqual(Math.round(total))
        }
      }
    }
  })

  it('las reglas de inscripción respetan la jerarquía de divisiones', () => {
    // Los campeonatos nacionales tienen pelotón individual (openTo vacío): fuera de esta regla.
    for (const race of SEASON_CALENDAR.filter((r) => !r.championshipCountry)) {
      if (race.level === 'WT') expect(race.openTo).toEqual(['WT', 'PRS'])
      if (race.level === 'PRS') expect(race.openTo).toEqual(['WT', 'PRS', 'CON'])
      if (race.level === 'CON') expect(race.openTo).toEqual(['PRS', 'CON'])
    }
  })

  it('cubre los tres niveles y los tres formatos', () => {
    const levels = new Set(SEASON_CALENDAR.map((r) => r.level))
    expect(levels).toEqual(new Set(['WT', 'PRS', 'CON']))
    const formats = new Set(SEASON_CALENDAR.map((r) => r.format))
    expect(formats).toEqual(new Set(['gran-vuelta', 'una-semana', 'un-dia']))
  })
})
