import type { ChronicleEntry, StageResultEntry } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { chronicleLine, fmtGap, listNames, timeTrialStory, variantIndex } from './stageJournal'

function event(partial: Partial<ChronicleEntry> & { plantilla: string }): ChronicleEntry {
  return { km: 100, protagonists: [], ...partial } as ChronicleEntry
}

function result(name: string, puesto: number, tiempoS: number): StageResultEntry {
  return {
    riderId: `r${puesto}`,
    name,
    country: 'ES',
    teamName: null,
    isBot: true,
    puesto,
    tiempoS,
    bonificacionS: 0,
    puntosVolante: 0,
    puntosMontana: 0,
  }
}

describe('formato del journal', () => {
  it('las diferencias por debajo del minuto van en segundos', () => {
    expect(fmtGap(45)).toBe('45s')
    expect(fmtGap(90)).toBe('1:30')
    expect(fmtGap(725)).toBe('12:05')
  })

  it('enumera nombres como lo haría un narrador', () => {
    expect(listNames([])).toBe('')
    expect(listNames(['A'])).toBe('A')
    expect(listNames(['A', 'B'])).toBe('A and B')
    expect(listNames(['A', 'B', 'C'])).toBe('A, B and C')
  })

  it('la variante es determinista y cae dentro del rango', () => {
    expect(variantIndex('semilla', 4)).toBe(variantIndex('semilla', 4))
    expect(variantIndex('semilla', 4)).toBeLessThan(4)
    expect(variantIndex('semilla', 0)).toBe(0)
  })
})

describe('crónica de la etapa', () => {
  it('cuenta la misma historia cada vez que se pinta el mismo evento', () => {
    const e = event({ plantilla: 'breakaway_formed', protagonists: ['Ana', 'Bea'] })
    expect(chronicleLine(e)).toBe(chronicleLine(e))
  })

  it('nombra a los protagonistas y a su equipo en la victoria', () => {
    const linea = chronicleLine(
      event({
        plantilla: 'stage_win',
        protagonists: ['Ana Ruiz'],
        protagonistTeams: ['Team Sol'],
        datos: { won: 'sprint' },
      }),
    )
    expect(linea).toContain('Ana Ruiz')
    expect(linea).toContain('Team Sol')
  })

  it('la fuga sin nombres no deja la frase coja', () => {
    expect(chronicleLine(event({ plantilla: 'breakaway_formed' }))).not.toMatch(/^\s|\s{2}/)
  })

  it('un evento desconocido no revienta: se narra en crudo', () => {
    expect(chronicleLine(event({ plantilla: 'meteorito', protagonists: ['Ana'] }))).toBe(
      'meteorito: Ana',
    )
  })
})

describe('crónica de una contrarreloj', () => {
  it('sin resultados no hay nada que contar', () => {
    expect(timeTrialStory([])).toEqual([])
  })

  it('cuenta el mejor tiempo, quién se acercó y lo apretada que quedó', () => {
    const lineas = timeTrialStory([
      result('Ana', 1, 3600),
      result('Bea', 2, 3612),
      result('Cris', 3, 3700),
    ])
    expect(lineas[0]).toContain('Ana')
    expect(lineas[1]).toContain('+12s')
    expect(lineas[2]).toContain('+1:40')
    // Ana y Bea entran en el minuto; Cris no.
    expect(lineas[3]).toContain('2 riders')
  })
})
