import {
  BASE_SEASON,
  SEASON_CALENDAR,
  type StageProfile,
  calendarForSeason,
  renderAltimetrySvg,
  stagesForSeason,
} from '@cyclingstar/engine'
import { describe, expect, it } from 'vitest'
import {
  frozenFromCalendar,
  raceRouteSource,
  stageCardRoute,
  stagePlanEntry,
} from './stageRoute.js'

/**
 * LA FICHA DE LA ETAPA ENSEÑA EL ORIGEN, LA FRASE Y LA EDICIÓN (docs/generador.md §10.8, §11.4 y
 * §15.12; D10 con su valor por defecto). Sin base: `frozen` es lo que `raceStagesForWorld` devuelve,
 * y aquí se construye a mano para poder trucarlo.
 */

describe('api: el origen y la edición de cada etapa', () => {
  it('temporada base: una real es real y sin ficha; ninguna generada lleva la frase vacía', () => {
    const cuenta = { real: 0, edicion: 0, generado: 0 }
    for (const race of SEASON_CALENDAR) {
      for (const st of race.stages) {
        const card = stageCardRoute(race.id, BASE_SEASON, frozenFromCalendar(st), null)
        cuenta[card.routeSource] += 1
        expect(card.edicion).toBe(1)
        expect(card.cambiosRespectoAnterior).toEqual([])
        if (card.routeSource === 'real') expect(card.arch).toBeNull()
        else {
          expect(card.arch?.frase.length ?? 0).toBeGreaterThan(0)
          expect(card.arch?.skeleton).toBe(st.arch?.skeleton)
          expect(card.arch?.geo).toBe(st.arch?.geo)
        }
      }
    }
    expect(cuenta.real).toBeGreaterThan(0)
    expect(cuenta.edicion).toBeGreaterThan(0)
    expect(cuenta.generado).toBeGreaterThan(0)
  })

  it('la ficha no promete física que el motor no hace (decisión 17)', () => {
    for (const race of SEASON_CALENDAR)
      for (const st of race.stages) {
        const frase = st.arch?.frase ?? ''
        for (const palabra of ['abanico', 'oxígeno', 'hipoxia', 'falta de aire'])
          expect(frase).not.toContain(palabra)
      }
  })

  it('temporada 1: edición 2 y cambios solo en lo generado', () => {
    let conCambios = 0
    for (const race of calendarForSeason(1)) {
      const anteriores = stagesForSeason(race.id, 0)
      for (const [i, st] of race.stages.entries()) {
        const card = stageCardRoute(
          race.id,
          1,
          frozenFromCalendar(st),
          frozenFromCalendar(anteriores[i]!),
        )
        expect(card.edicion).toBe(2)
        if (st.routeSource !== 'generado') expect(card.cambiosRespectoAnterior).toEqual([])
        else if (card.cambiosRespectoAnterior.length > 0) conCambios += 1
      }
    }
    // La edición mueve el km (± 6 %), las vueltas y la opción de final: algo tiene que anunciarse.
    expect(conCambios).toBeGreaterThan(0)
  })

  it('una fila congelada sin arch (anterior a la columna) toma la ficha de la edición', () => {
    const race = SEASON_CALENDAR.find((r) => r.stages.every((s) => s.routeSource === 'generado'))!
    const st = race.stages[0]!
    const card = stageCardRoute(race.id, 0, { ...frozenFromCalendar(st), arch: null }, null)
    expect(card.arch?.frase).toBe(st.arch?.frase)
  })

  it('el agregado de carrera sigue la regla de raceRouteSourceOf', () => {
    for (const race of SEASON_CALENDAR) expect(raceRouteSource(race.stages)).toBe(race.routeSource)
  })
})

describe('api: la altimetría de una etapa no corrida es la del mundo', () => {
  const race = SEASON_CALENDAR.find(
    (r) => r.stages.length >= 3 && r.stages.every((s) => s.routeSource === 'generado'),
  )!
  const trucado: StageProfile = {
    segments: [
      { km: 60, tipo: 'llano' },
      { km: 10, tipo: 'puerto', tramos: [{ km: 10, g: 8 }] },
    ],
  }

  it('lee el congelado y no la temporada 0 (run?.profile ?? frozen.profile)', () => {
    const deLaTemporada = stagesForSeason(race.id, 1)[1]!
    const frozen = { ...frozenFromCalendar(deLaTemporada), profile: trucado }
    const entry = stagePlanEntry({
      raceId: race.id,
      season: 1,
      deLaTemporada,
      frozen,
      anterior: frozenFromCalendar(stagesForSeason(race.id, 0)[1]!),
      run: undefined,
      ends: null,
    })
    expect(entry.altimetry).toBe(renderAltimetrySvg(trucado))
    expect(entry.km).toBe(70)
    expect(entry.edicion).toBe(2)
    expect(entry.routeSource).toBe('generado')
  })

  it('sin congelar, la edición de la temporada del mundo', () => {
    const deLaTemporada = stagesForSeason(race.id, 1)[0]!
    const entry = stagePlanEntry({
      raceId: race.id,
      season: 1,
      deLaTemporada,
      frozen: frozenFromCalendar(deLaTemporada),
      anterior: null,
      run: undefined,
      ends: null,
    })
    expect(entry.altimetry).toBe(renderAltimetrySvg(deLaTemporada.profile))
    expect(entry.arch?.frase).toBe(deLaTemporada.arch?.frase)
  })

  it('lo corrido manda sobre lo congelado', () => {
    const deLaTemporada = stagesForSeason(race.id, 1)[0]!
    const entry = stagePlanEntry({
      raceId: race.id,
      season: 1,
      deLaTemporada,
      frozen: frozenFromCalendar(deLaTemporada),
      anterior: null,
      run: { profile: trucado, timeTrial: false, km: 70 },
      ends: null,
    })
    expect(entry.altimetry).toBe(renderAltimetrySvg(trucado))
  })
})
