import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import type { RaceMemory } from './views.js'
import {
  alreadyWonDamp,
  areRivals,
  customsMemoryFactor,
  dayWeight,
  desperation,
  desperationAttackGain,
  goodwillOf,
  moodCentre,
  moodSpread,
  relayDebtPenalty,
} from './memory.js'

const vacia: RaceMemory = { debts: [], winners: [], satisfiedTeams: [] }

describe('sin memoria, el motor corre como siempre', () => {
  it('ninguna de las reglas hace nada con la memoria ausente', () => {
    expect(customsMemoryFactor(undefined, 'eq-0', ['a'])).toBe(1)
    expect(desperation(undefined, 'eq-0')).toBe(0)
    expect(alreadyWonDamp(undefined, 'eq-0')).toBe(1)
    expect(areRivals(undefined, 'a', 'b')).toBe(false)
    expect(goodwillOf(undefined, 'eq-0')).toBe(0)
    expect(relayDebtPenalty(undefined, 'a', new Set(['b']))).toBe(0)
    expect(dayWeight(undefined)).toBe(1)
  })

  it('…y con una memoria vacía, tampoco', () => {
    expect(customsMemoryFactor(vacia, 'eq-0', ['a'])).toBe(1)
    expect(desperation(vacia, 'eq-0')).toBe(0)
    expect(areRivals(vacia, 'a', 'b')).toBe(false)
    expect(dayWeight(vacia)).toBe(1)
  })
})

describe('el humor tiene causa (R09.1)', () => {
  it('el día después de la reina el pelotón sale peor, y la víspera de un descanso mejor', () => {
    expect(moodCentre('reina_ayer', 0)).toBeLessThan(moodCentre('ninguno', 0))
    expect(moodCentre('vispera_descanso', 0)).toBeGreaterThan(moodCentre('ninguno', 0))
  })

  it('y el calor lo hunde aparte, porque no es una causa del calendario', () => {
    expect(moodCentre('ninguno', 1)).toBeCloseTo(STAGE.pelotonMoodCentre - 0.1, 9)
  })

  it('EL DADO NO SE RETIRA, SE ENCOGE: el dueño pidió que el pelotón pueda echar la hueva', () => {
    expect(moodSpread(true)).toBeGreaterThan(0)
    expect(moodSpread(true)).toBeCloseTo(STAGE.pelotonMoodSpread / 2, 6)
    expect(moodSpread(false)).toBe(STAGE.pelotonMoodSpread)
  })
})

describe('la memoria de la aduana (R09.2)', () => {
  const mem: RaceMemory = {
    ...vacia,
    yesterdayWinnerId: 'ganador',
    burnedTeams: ['eq-quemado'],
  }

  it('AL GANADOR DE AYER SE LE ACORTA LA CUERDA, no se le prohíbe irse', () => {
    const f = customsMemoryFactor(mem, 'eq-0', ['otro', 'ganador'])
    expect(f).toBe(STAGE.memory.customsYesterdayWinner)
    expect(f).toBeGreaterThan(1)
    expect(Number.isFinite(f)).toBe(true)
  })

  it('y el equipo al que le robaron la etapa ayer hoy no da cuerda a nadie', () => {
    expect(customsMemoryFactor(mem, 'eq-quemado', ['otro'])).toBe(STAGE.memory.customsBurnedUs)
  })

  it('las dos cosas a la vez se multiplican: es el peor día para irse', () => {
    const f = customsMemoryFactor(mem, 'eq-quemado', ['ganador'])
    expect(f).toBeCloseTo(STAGE.memory.customsYesterdayWinner * STAGE.memory.customsBurnedUs, 9)
  })
})

describe('la desesperación y la conformidad (R09.4)', () => {
  const mem: RaceMemory = {
    ...vacia,
    satisfiedTeams: ['eq-contento'],
    daysSinceResult: { 'eq-seco': 14, 'eq-tibio': 3 },
  }

  it('ESCALA, no es un binario', () => {
    expect(desperation(mem, 'eq-seco')).toBe(1)
    expect(desperation(mem, 'eq-tibio')).toBeCloseTo(3 / 7, 9)
    expect(desperation(mem, 'eq-nuevo')).toBe(0)
  })

  it('el desesperado ataca más y el que ya cumplió guarda a su gente', () => {
    expect(desperationAttackGain(1)).toBeGreaterThan(1)
    expect(desperationAttackGain(0)).toBe(1)
    expect(alreadyWonDamp(mem, 'eq-contento')).toBeLessThan(1)
    expect(alreadyWonDamp(mem, 'eq-seco')).toBe(1)
  })
})

describe('rivalidades, reputación y deudas (R09.3 y R09.5)', () => {
  const mem: RaceMemory = {
    ...vacia,
    rivalries: [['eq-1', 'eq-2']],
    goodwill: { 'eq-1': 2, 'eq-3': -1 },
    debts: [{ from: 'moroso', to: 'acreedor', km: 12 }],
  }

  it('una rivalidad vale en los dos sentidos, que es lo que la hace una rivalidad', () => {
    expect(areRivals(mem, 'eq-1', 'eq-2')).toBe(true)
    expect(areRivals(mem, 'eq-2', 'eq-1')).toBe(true)
    expect(areRivals(mem, 'eq-1', 'eq-3')).toBe(false)
  })

  it('la reputación se gana y se pierde, y el que no tiene historia parte de cero', () => {
    expect(goodwillOf(mem, 'eq-1')).toBe(2)
    expect(goodwillOf(mem, 'eq-3')).toBe(-1)
    expect(goodwillOf(mem, 'eq-9')).toBe(0)
  })

  it('LA FACTURA SE PASA CUANDO OS VOLVÉIS A ENCONTRAR, no en abstracto', () => {
    expect(relayDebtPenalty(mem, 'moroso', new Set(['acreedor']))).toBe(
      STAGE.memory.relayDebtPenalty,
    )
    expect(relayDebtPenalty(mem, 'moroso', new Set(['otro']))).toBe(0)
    expect(relayDebtPenalty(mem, 'acreedor', new Set(['moroso']))).toBe(0)
  })
})
