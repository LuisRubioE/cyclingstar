import { describe, expect, it } from 'vitest'
import type { CalendarRace } from './calendar.js'
import {
  raceLastDay,
  scheduledStageIndex,
  scheduledStageIndices,
  stageDayOfSeason,
} from './schedule.js'

/**
 * R28.6 / S-431 — LA SEMIETAPA (paso 18b): «dos `StageInput` el mismo día, con depósito encadenado».
 *
 * Dos cosas hacían falta y ninguna existía. La primera es que el dato **se pudiera expresar**: el
 * calendario sabía meter un día entre dos etapas (`restAfter`) y no sabía quitarlo. La segunda está
 * en `packages/db` y es la que de verdad cuesta — ver `StageRunSpec.cargaDelDia`.
 *
 * NINGUNA CARRERA DEL CALENDARIO DECLARA HOY UNA SEMIETAPA, y por eso estas pruebas montan la suya:
 * poner una de verdad es una decisión de calendario que mueve resultados de producción. Lo que esta
 * rama trae es que el motor y el tick sepan correrla cuando la haya.
 */
const etapa = (km: number) => ({
  name: `e${km}`,
  kind: 'flat' as const,
  profile: { segments: [{ km, tipo: 'llano' as const }] },
})

const carrera = (extra: Partial<CalendarRace>): CalendarRace =>
  ({
    id: 'x',
    name: 'X',
    level: 'PRS',
    raceClass: '.1',
    format: 'vuelta',
    startDay: 100,
    openTo: [],
    stages: [etapa(180), etapa(120), etapa(30), etapa(150)],
    ...extra,
  }) as CalendarRace

describe('la semietapa: dos etapas el mismo día', () => {
  it('sin `doubleAfter` cada etapa ocupa su día, como siempre', () => {
    const r = carrera({})
    expect([1, 2, 3, 4].map((i) => stageDayOfSeason(r, i))).toEqual([100, 101, 102, 103])
    expect(raceLastDay(r)).toBe(103)
  })

  /** La 3 se corre por la tarde del día de la 2: a partir de ahí la carrera va un día por delante. */
  it('con `doubleAfter` la siguiente cae el MISMO día, y la carrera acaba un día antes', () => {
    const r = carrera({ doubleAfter: [2] })
    expect([1, 2, 3, 4].map((i) => stageDayOfSeason(r, i))).toEqual([100, 101, 101, 102])
    expect(raceLastDay(r)).toBe(102)
  })

  it('el día partido devuelve SUS DOS etapas, en orden', () => {
    const r = carrera({ doubleAfter: [2] })
    expect(scheduledStageIndices(r, 101)).toEqual([2, 3])
    expect(scheduledStageIndices(r, 100)).toEqual([1])
    expect(scheduledStageIndices(r, 102)).toEqual([4])
    expect(scheduledStageIndices(r, 99)).toEqual([])
  })

  /**
   * Y ÉSTA ES LA QUE EXPLICA POR QUÉ HACÍA FALTA UNA FUNCIÓN NUEVA: `scheduledStageIndex` devuelve
   * la PRIMERA, así que quien la use para correr la jornada **no correría nunca la segunda mitad** y
   * nadie se enteraría. Se conserva para preguntar «¿corre hoy esta carrera?», que es lo que hace.
   */
  it('el singular devuelve solo la primera, y por eso no vale para correr el día', () => {
    const r = carrera({ doubleAfter: [2] })
    expect(scheduledStageIndex(r, 101)).toBe(2)
    expect(scheduledStageIndices(r, 101)).toHaveLength(2)
  })

  /** Los descansos y las semietapas van a los dos lados de la misma suma y conviven. */
  it('descanso y semietapa en la misma carrera', () => {
    const r = carrera({ restAfter: [1], doubleAfter: [3] })
    // e1 el 100, descanso el 101, e2 el 102, e3 el 103 y e4 ESE MISMO 103.
    expect([1, 2, 3, 4].map((i) => stageDayOfSeason(r, i))).toEqual([100, 102, 103, 103])
    expect(scheduledStageIndices(r, 101)).toEqual([])
    expect(scheduledStageIndices(r, 103)).toEqual([3, 4])
  })

  /** Tres mitades el mismo día es raro pero la cuenta no tiene por qué romperse. */
  it('tres etapas el mismo día también', () => {
    const r = carrera({ doubleAfter: [1, 2] })
    expect([1, 2, 3, 4].map((i) => stageDayOfSeason(r, i))).toEqual([100, 100, 100, 101])
    expect(scheduledStageIndices(r, 100)).toEqual([1, 2, 3])
  })
})
