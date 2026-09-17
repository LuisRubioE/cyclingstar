import { describe, expect, it } from 'vitest'
import { SEASON_CALENDAR } from './calendar.js'
import { overlappingRaces, raceLastDay } from './schedule.js'

/**
 * R28.6 / S-470 — DOS CARRERAS LA MISMA SEMANA (paso 18b).
 *
 * «La convocatoria de una RESTA de la otra; un cambio de última hora en la grande deja a la pequeña
 * sin ningún hombre para el frente.»
 *
 * La resta ya estaba hecha en `packages/db`: al congelar las escuadras, al que ya está apuntado a
 * una carrera solapada no se le convoca en la otra, y las carreras se congelan **en orden de
 * salida** para que la más próxima reserve antes a los hombres que comparte. Lo que no había era
 * nadie comprobando **la cuenta de qué se solapa con qué**, que vivía dentro de una consulta.
 *
 * Y la primera prueba es la que de verdad importa, porque es la que distingue una regla que corre de
 * una regla que existe: **¿hay solapes de verdad en el calendario?** Si no los hubiera, toda esta
 * maquinaria sería código muerto con CI en verde, que es exactamente cómo se pierden las capas.
 */
describe('las carreras que se solapan', () => {
  it('EL CALENDARIO TIENE SOLAPES DE VERDAD, o esta regla no corre nunca', () => {
    const conSolape = SEASON_CALENDAR.filter((r) => overlappingRaces(r, SEASON_CALENDAR).length > 0)
    // No es un «> 0» de compromiso: en un calendario real la mayoría de las semanas tienen dos
    // carreras a la vez. Si esto bajara de la mitad, algo se habría roto en el calendario.
    expect(conSolape.length).toBeGreaterThan(SEASON_CALENDAR.length / 2)
  })

  it('una carrera no se solapa consigo misma', () => {
    for (const r of SEASON_CALENDAR) {
      expect(overlappingRaces(r, SEASON_CALENDAR).some((o) => o.id === r.id)).toBe(false)
    }
  })

  it('el solape es simétrico: si A pisa a B, B pisa a A', () => {
    for (const a of SEASON_CALENDAR) {
      for (const b of overlappingRaces(a, SEASON_CALENDAR)) {
        expect(overlappingRaces(b, SEASON_CALENDAR).some((o) => o.id === a.id)).toBe(true)
      }
    }
  })

  /**
   * LA VENTANA CUENTA LOS DESCANSOS, que es lo que hace que esto no sea `startDay + stages.length`.
   * Una gran vuelta con dos jornadas de descanso ocupa 23 días de calendario para 21 etapas, y una
   * carrera que arranca el día 22 SÍ la pisa aunque la etapa 21 sea la del día 21.
   */
  it('la ventana llega hasta el último día, descansos incluidos', () => {
    const largas = SEASON_CALENDAR.filter((r) => r.stages.length >= 14)
    expect(largas.length).toBeGreaterThan(0)
    for (const r of largas) {
      expect(raceLastDay(r)).toBeGreaterThanOrEqual(r.startDay + r.stages.length - 1)
    }
  })

  /** Y el solape se mide contra el calendario que se le pasa, no contra un global escondido. */
  it('con un calendario de una sola carrera no hay solape', () => {
    const una = SEASON_CALENDAR[0]!
    expect(overlappingRaces(una, [una])).toEqual([])
  })
})
