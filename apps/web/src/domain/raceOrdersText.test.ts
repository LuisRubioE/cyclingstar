import { describe, expect, it } from 'vitest'
import {
  clashSummary,
  forecastText,
  forecastWord,
  isOutlook,
  ordersConsequence,
  orderStageTitle,
  raceOptionLabel,
} from './raceOrdersText'

/**
 * LO QUE DICE LA PANTALLA DE ÓRDENES (E3, docs/visual.md §4.10 y 3-d; PR 21i): el parte en palabras, sin
 * emoji (`Rain`, `Showers`, `Dry`); la etapa como toda etapa (`Stage 3 · Gandia → Alcoi`), y la de un día, por
 * el nombre de su carrera; el resumen de arriba sin el `⚠`; y lo que cambia al guardar, para la barra.
 */

describe('el parte, en palabras (3-d)', () => {
  it('Rain desde el 50 %, Showers desde el 20 % y Dry por debajo', () => {
    expect(forecastWord(80)).toBe('Rain')
    expect(forecastWord(50)).toBe('Rain')
    expect(forecastWord(49)).toBe('Showers')
    expect(forecastWord(20)).toBe('Showers')
    expect(forecastWord(19)).toBe('Dry')
    expect(forecastWord(0)).toBe('Dry')
  })

  it('la palabra donde iba el emoji, con la probabilidad y los grados', () => {
    expect(forecastText({ lluvia: 60, grados: 14, fiabilidad: 90 })).toBe('Rain 60% · 14°C')
    expect(forecastText({ lluvia: 5, grados: 22, fiabilidad: 90 })).toBe('Dry 5% · 22°C')
  })

  it('un parte poco fiable, por debajo del 60 %, es una perspectiva', () => {
    expect(isOutlook({ lluvia: 30, grados: 10, fiabilidad: 59 })).toBe(true)
    expect(isOutlook({ lluvia: 30, grados: 10, fiabilidad: 60 })).toBe(false)
  })
})

describe('la etapa, como toda etapa (§4.10)', () => {
  const etapa = { name: 'Stage 3', from: 'Gandia', to: 'Alcoi' }

  it('su nombre y su recorrido tras su ·; sin ciudades, su nombre', () => {
    expect(orderStageTitle(etapa, 'Race Valencia', false)).toBe('Stage 3 · Gandia → Alcoi')
    expect(orderStageTitle({ ...etapa, from: null, to: null }, 'Race Valencia', false)).toBe(
      'Stage 3',
    )
  })

  it('la de un día, por el nombre de su carrera, sin su Stage 1', () => {
    expect(orderStageTitle({ ...etapa, name: 'Stage 1' }, 'Race Var', true)).toBe(
      'Race Var · Gandia → Alcoi',
    )
  })
})

describe('el resumen de arriba, sin glifos', () => {
  it('sin choques, lo dice; con ellos, cuántos y dónde mirar', () => {
    expect(clashSummary(3, 0)).toBe('3 road stages, no clashing orders.')
    expect(clashSummary(1, 0)).toBe('1 road stage, no clashing orders.')
    // el texto de la pantalla que fija 3-d (docs/visual.md §3.7)
    expect(clashSummary(5, 2)).toBe(
      '5 road stages · 2 with orders that clash. Look for the warning below.',
    )
    expect(clashSummary(5, 2)).not.toMatch(/[⚠—]/)
  })
})

describe('lo que cambia al guardar, para la barra (§4.9)', () => {
  it('la carrera, y las etapas que cambian, hasta tres por su nombre y de cuatro en adelante por su número', () => {
    expect(ordersConsequence('Race Var', [])).toBe('Race Var')
    expect(ordersConsequence('Race France', ['Stage 2'])).toBe('Race France: Stage 2')
    expect(ordersConsequence('Race France', ['Stage 2', 'Stage 5'])).toBe(
      'Race France: Stage 2 and Stage 5',
    )
    expect(ordersConsequence('Race France', ['Stage 1', 'Stage 2', 'Stage 4'])).toBe(
      'Race France: Stage 1, Stage 2 and Stage 4',
    )
    expect(ordersConsequence('Race France', ['Stage 1', 'Stage 2', 'Stage 4', 'Stage 9'])).toBe(
      'Race France: 4 stages',
    )
  })
})

describe('la carrera del selector (§4.10)', () => {
  it('con sus días; la que se corre, racing now; la que empieza hoy, su nombre solo', () => {
    expect(raceOptionLabel({ raceName: 'Race France', ongoing: false, daysUntil: 2 })).toBe(
      'Race France · in 2 days',
    )
    expect(raceOptionLabel({ raceName: 'Race France', ongoing: false, daysUntil: 1 })).toBe(
      'Race France · in 1 day',
    )
    expect(raceOptionLabel({ raceName: 'Race Var', ongoing: true, daysUntil: 0 })).toBe(
      'Race Var · racing now',
    )
    expect(raceOptionLabel({ raceName: 'Race Var', ongoing: false, daysUntil: 0 })).toBe('Race Var')
  })
})
