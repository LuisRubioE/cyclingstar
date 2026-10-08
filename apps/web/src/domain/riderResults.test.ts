import type { RiderRaceResult } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import {
  hasStageBreakdown,
  ordinal,
  placeTone,
  raceResultKind,
  raceResultPlace,
  stagesSummary,
  stagesToWatchText,
} from './riderResults'

/** Carrera de ejemplo; cada test cambia solo lo que le interesa. */
function race(over: Partial<RiderRaceResult> = {}): RiderRaceResult {
  return {
    raceId: 'race-france',
    raceName: 'Race France',
    raceClass: 'WT',
    season: 1,
    stageCount: 21,
    isOneDay: false,
    gcPuesto: 3,
    dnf: false,
    finished: true,
    stages: [
      { stageDay: 1, puesto: 1 },
      { stageDay: 2, puesto: 1 },
      { stageDay: 3, puesto: 3 },
    ],
    ...over,
  }
}

describe('ordinal', () => {
  it('numera como en inglés, incluidos los del 11 al 13', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 103, 111].map(ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '103rd',
      '111th',
    ])
  })
})

describe('resultado de una carrera en la ficha', () => {
  it('el titular de una carrera por etapas es la general, se gane o no', () => {
    expect(raceResultPlace(race())).toBe('3rd')
    expect(raceResultKind(race())).toBe('Overall')
    expect(raceResultPlace(race({ gcPuesto: 1 }))).toBe('1st')
  })

  it('una carrera aún en marcha dice que el puesto es provisional', () => {
    expect(raceResultKind(race({ finished: false }))).toBe('Overall so far')
  })

  it('el abandono se dice, no se disfraza de puesto', () => {
    const dnf = race({ dnf: true, gcPuesto: 140 })
    expect(raceResultPlace(dnf)).toBe('DNF')
    expect(raceResultKind(dnf)).toBe('Overall — abandoned')
  })

  it('sin general calculada no se inventa un puesto', () => {
    expect(raceResultPlace(race({ gcPuesto: null }))).toBe('—')
  })

  it('en una carrera de un día el puesto ES el de la carrera y no hay desglose', () => {
    const clasica = race({
      raceId: 'race-sanremo',
      isOneDay: true,
      stageCount: 1,
      gcPuesto: 5,
      stages: [{ stageDay: 1, puesto: 5 }],
    })
    expect(raceResultPlace(clasica)).toBe('5th')
    expect(raceResultKind(clasica)).toBe('One-day race')
    expect(hasStageBreakdown(clasica)).toBe(false)
    expect(stagesSummary(clasica)).toBe('')
  })
})

describe('desglose de etapas', () => {
  it('resume cuántas etapas corrió y cuántas ganó', () => {
    expect(stagesSummary(race())).toBe('3 stages · 2 wins')
    expect(stagesSummary(race({ stages: [{ stageDay: 1, puesto: 4 }] }))).toBe('1 stage')
    expect(
      stagesSummary(
        race({
          stages: [
            { stageDay: 1, puesto: 1 },
            { stageDay: 2, puesto: 9 },
          ],
        }),
      ),
    ).toBe('2 stages · 1 win')
  })

  it('hay desglose siempre que la vuelta tenga etapas corridas', () => {
    expect(hasStageBreakdown(race())).toBe(true)
    expect(hasStageBreakdown(race({ stages: [] }))).toBe(false)
  })
})

describe('color del puesto', () => {
  it('el oro es solo de la victoria y el podio se destaca', () => {
    expect(placeTone(race({ gcPuesto: 1 }))).toBe('text-amber-500')
    expect(placeTone(race({ gcPuesto: 3 }))).toBe('text-slate-700')
    expect(placeTone(race({ gcPuesto: 40 }))).toBe('text-slate-500')
  })

  it('un abandono o una general sin calcular se apagan', () => {
    expect(placeTone(race({ dnf: true, gcPuesto: 1 }))).toBe('text-slate-400')
    expect(placeTone(race({ gcPuesto: null }))).toBe('text-slate-400')
  })
})

/**
 * LA CARRERA CON ETAPAS POR VER (E2, docs/retransmision.md §11.6, punto 2; sups. P4 y H7; paso 9b). La API
 * manda `stagesToWatch` en la carrera con etapas en el velo de quien mira, para todos los de su lista de
 * salida, abandonaran o no (8a); la fila lo dice, `Race France · 3 stages to watch`, y el puesto es el de
 * lo conocido (o ninguno).
 */
describe('stagesToWatchText (9b)', () => {
  it('cuenta las etapas por ver, en singular y en plural; sin ellas, null', () => {
    expect(stagesToWatchText(race({ stagesToWatch: 3 }))).toBe('3 stages to watch')
    expect(stagesToWatchText(race({ stagesToWatch: 1 }))).toBe('1 stage to watch')
    expect(stagesToWatchText(race())).toBeNull()
  })

  it('una carrera sin ninguna etapa conocida no tiene puesto que enseñar', () => {
    const veiled = race({ stages: [], gcPuesto: null, finished: false, stagesToWatch: 21 })
    expect(raceResultPlace(veiled)).toBe('—')
    expect(stagesToWatchText(veiled)).toBe('21 stages to watch')
  })
})
