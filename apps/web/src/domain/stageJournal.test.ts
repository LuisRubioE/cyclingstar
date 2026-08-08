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

// --- La crónica tiene que EXPLICAR la carrera (docs/motor.md §16) ---------------------------
// El dueño leyó dos crónicas y no se entendían: "de 81 corredores a 3 en tres kilómetros, con solo
// 2 descolgados narrados" y "hay 5 ciclistas, ¡podrías haber dicho cuáles!". Estos tests fijan lo
// que la frase tiene que decir para que eso no vuelva a pasar.

describe('la criba se cuenta de forma que se entienda', () => {
  const split = (datos: Record<string, number | string>, over: Partial<ChronicleEntry> = {}) =>
    chronicleLine(
      event({
        plantilla: 'peloton_split',
        km: 137,
        protagonists: ['Iker Zabala'],
        protagonistTeams: ['Summit Squad'],
        datos,
        ...over,
      }),
    )

  it('dice de cuántos a cuántos ha quedado el grupo, no solo cuántos cayeron', () => {
    const linea = split({ dropped: 41, remaining: 40, before: 81, chasing: 0 })
    expect(linea).toContain('81')
    expect(linea).toContain('40')
  })

  it('con un pelotón grande nombra al equipo que tira', () => {
    expect(split({ dropped: 41, remaining: 40, before: 81, chasing: 0 })).toContain('Summit Squad')
  })

  it('con un grupo pequeño nombra al CORREDOR: un equipo no tira con tres en cabeza', () => {
    const linea = split({ dropped: 2, remaining: 3, before: 5, chasing: 0 })
    expect(linea).toContain('Iker Zabala')
    expect(linea).not.toContain('Summit Squad')
  })

  it('si la fuga sigue delante, el grupo que se parte es el que persigue, no la cabeza', () => {
    const linea = split({ dropped: 41, remaining: 40, before: 81, chasing: 1 })
    expect(linea).toContain('chase')
    expect(linea).not.toContain('lead group')
  })

  it('cuando solo queda uno, se dice que se ha quedado solo', () => {
    const linea = split({ dropped: 4, remaining: 1, before: 5, chasing: 0 })
    expect(linea).toContain('alone')
    expect(linea).toContain('Iker Zabala')
  })

  it('una crónica guardada antes de v6 (sin `before`) se sigue narrando', () => {
    const linea = split({ dropped: 2, remaining: 81 })
    expect(linea).toContain('81')
    expect(linea.length).toBeGreaterThan(20)
  })
})

describe('quién va delante y con cuánta ventaja', () => {
  it('nombra a los corredores del grupo de cabeza', () => {
    const linea = chronicleLine(
      event({
        plantilla: 'front_group',
        km: 199,
        protagonists: ['Ana Ruiz', 'Bea Soler', 'Cris Vega'],
        datos: { size: 3, gapS: 90, toGo: 11 },
      }),
    )
    expect(linea).toContain('Ana Ruiz')
    expect(linea).toContain('Cris Vega')
    expect(linea).toContain('11 km to go')
    expect(linea).toContain('1:30')
  })

  it('un corredor solo en cabeza se narra como tal', () => {
    const linea = chronicleLine(
      event({
        plantilla: 'front_group',
        protagonists: ['Fredrik Eriksen'],
        datos: { size: 1, gapS: 435, toGo: 10 },
      }),
    )
    expect(linea).toContain('Fredrik Eriksen')
    expect(linea).toContain('alone')
    expect(linea).toContain('7:15')
  })

  it('el parte de boquete dice cuántos van delante', () => {
    expect(
      chronicleLine(event({ plantilla: 'time_gap', datos: { gapS: 90, trend: 0, leadSize: 5 } })),
    ).toContain('5 leaders')
    expect(
      chronicleLine(event({ plantilla: 'time_gap', datos: { gapS: 435, trend: 1, leadSize: 1 } })),
    ).toContain('lone leader')
  })

  it('un boquete guardado antes de v6 (sin `leadSize`) se sigue narrando como la fuga', () => {
    expect(
      chronicleLine(event({ plantilla: 'time_gap', datos: { gapS: 90, trend: 0 } })),
    ).toContain('1:30')
  })
})
