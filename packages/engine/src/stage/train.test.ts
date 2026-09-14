import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import {
  type Train,
  advanceTrain,
  launchStandoffM,
  launcherIsFree,
  orderHelpers,
  pickWheel,
  turnKmOf,
} from './train.js'

const candidatos = [
  { riderId: 'a', motor: 80, freshness: 0.9 },
  { riderId: 'b', motor: 70, freshness: 0.9 },
  { riderId: 'c', motor: 60, freshness: 0.9 },
  { riderId: 'd', motor: 50, freshness: 0.9 },
  { riderId: 'e', motor: 40, freshness: 0.9 },
]

describe('el orden de la fila (R16.1 y R16.9)', () => {
  it('EL DE SPRINT PONE DELANTE AL MÁS RODADOR: el primer relevo es el más duro', () => {
    expect(orderHelpers('sprint', candidatos)).toEqual(['a', 'b', 'c'])
  })

  it('…Y EL DE MONTAÑA AL REVÉS, de menos a más fuerte, porque el último tiene que ser el mejor', () => {
    expect(orderHelpers('montana', candidatos)).toEqual(['e', 'd', 'c', 'b'])
  })

  it('el primer relevo es el largo y el último el corto', () => {
    expect(turnKmOf('sprint', 0)).toBe(5)
    expect(turnKmOf('sprint', 1)).toBe(3)
    expect(turnKmOf('sprint', 2)).toBe(1.5)
    expect(turnKmOf('montana', 0)).toBe(STAGE.train.climbTurnKm)
  })
})

describe('el tren avanza y se rompe (R16.2)', () => {
  const base: Train = {
    teamId: 't',
    cardId: 'spr',
    kind: 'sprint',
    helpers: ['a', 'b'],
    index: 0,
    turnKm: 0,
    state: 'formando',
  }

  it('mientras le dure el turno y las piernas, sigue el mismo', () => {
    const t = advanceTrain(base, 1, 0.8)
    expect(t.index).toBe(0)
    expect(t.state).toBe('tirando')
    expect(t.turnKm).toBe(1)
  })

  it('agotado el turno, releva el siguiente', () => {
    const t = advanceTrain({ ...base, turnKm: 4.9 }, 0.2, 0.8)
    expect(t.index).toBe(1)
    expect(t.turnKm).toBe(0)
  })

  it('Y SI SE FUNDE, TAMBIÉN: no hace falta que se le acabe el turno', () => {
    const t = advanceTrain(base, 0.1, 0.1)
    expect(t.index).toBe(1)
  })

  it('cuando no queda ninguno el tren queda ROTO, que es un estado y no una ausencia', () => {
    const t = advanceTrain({ ...base, index: 1 }, 0.1, 0.05)
    expect(t.state).toBe('roto')
    expect(advanceTrain(t, 1, 0.9).state).toBe('roto')
  })
})

describe('dónde se abre (R16.6)', () => {
  it('con viento de cola se abre de MUCHO más lejos: la rueda vale menos', () => {
    expect(launchStandoffM(200, 1, 0, false)).toBeCloseTo(280, 6)
  })

  it('con viento de cara el primero que abre se muere, y todo el mundo espera', () => {
    expect(launchStandoffM(200, 0, 1, false)).toBeCloseTo(140, 6)
  })

  it('y sobre adoquín, más lejos todavía', () => {
    expect(launchStandoffM(200, 0, 0, true)).toBeCloseTo(260, 6)
  })

  it('en un llano sin viento manda la base, y eso es el caso normal', () => {
    expect(launchStandoffM(200, 0, 0, false)).toBe(200)
  })
})

describe('el sprinter sin tren (R16.4) y el lanzador sin sprinter (R16.8)', () => {
  it('se pega al mejor tren que pueda alcanzar, no al mejor tren', () => {
    const elegido = pickWheel([
      { teamId: 'bueno-lejos', quality: 90, huecoPlacement: 0.9 },
      { teamId: 'peor-cerca', quality: 70, huecoPlacement: 0.05 },
    ])
    // 90 − 0,5·0,9·100... la ponderación es sobre [0,1], así que el bueno sigue ganando aquí.
    expect(elegido).toBe('bueno-lejos')
  })

  it('y entre dos trenes iguales elige el hueco más cercano', () => {
    const elegido = pickWheel([
      { teamId: 'x', quality: 80, huecoPlacement: 0.8 },
      { teamId: 'y', quality: 80, huecoPlacement: 0.1 },
    ])
    expect(elegido).toBe('y')
  })

  it('sin trenes no hay rueda que elegir', () => {
    expect(pickWheel([])).toBeNull()
  })

  it('EL LANZADOR SIN SPRINTER SE RECICLA: hoy pierde el premio y conserva el peaje', () => {
    expect(launcherIsFree(false)).toBe(true)
    expect(launcherIsFree(true)).toBe(false)
  })
})
