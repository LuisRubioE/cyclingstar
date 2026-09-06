import { ATTRIBUTES, type Attribute } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { LEARNING } from '../constants.js'
import { raceLearning } from './learning.js'

/**
 * LO QUE SE APRENDE CORRIENDO (docs/epics.md «G1», cuarta pata).
 *
 * El dueño: «de una carrera puedes aprender más que de un entrenamiento, e **incluso variará según
 * el nivel de la carrera**». La regla existía en `packages/db` con un factor PLANO de 0,5 —una .2
 * enseñaba exactamente lo mismo que el Tour— y ninguna de las dos mitades se cumplía.
 */

const attrs = (v: number): Record<Attribute, number> =>
  Object.fromEntries(ATTRIBUTES.map((a) => [a, v])) as Record<Attribute, number>

describe('engine: lo que enseña una carrera', () => {
  const base = { attributes: attrs(60), ceilings: attrs(90) }

  it('enseña lo que pide el terreno, y la TÁCTICA siempre', () => {
    const reina = raceLearning({ ...base, raceClass: 'WT', kind: 'reina' })
    expect(Object.keys(reina).sort()).toEqual(['COL', 'MON', 'TAC'])
    const llana = raceLearning({ ...base, raceClass: 'WT', kind: 'llana' })
    expect(Object.keys(llana).sort()).toEqual(['LLA', 'SPR', 'TAC'])
    // Una crono no enseña a subir, pero sigue enseñando a correr.
    const cri = raceLearning({ ...base, raceClass: 'WT', kind: 'cri' })
    expect(Object.keys(cri).sort()).toEqual(['CRI', 'TAC'])
  })

  it('un terreno que no existe sigue enseñando táctica y nada más', () => {
    // Es el caso degenerado que importa: correr SIEMPRE enseña algo, aunque el kind no se conozca.
    const raro = raceLearning({ ...base, raceClass: 'WT', kind: 'lo-que-sea' })
    expect(Object.keys(raro)).toEqual(['TAC'])
  })

  it('EL TOUR ENSEÑA MÁS QUE UNA .2, que es lo que faltaba', () => {
    const wt = raceLearning({ ...base, raceClass: 'WT', kind: 'reina' }).MON ?? 0
    const pro = raceLearning({ ...base, raceClass: 'Pro', kind: 'reina' }).MON ?? 0
    const uno = raceLearning({ ...base, raceClass: '1', kind: 'reina' }).MON ?? 0
    const dos = raceLearning({ ...base, raceClass: '2', kind: 'reina' }).MON ?? 0
    expect(`escala: ${wt > pro && pro > uno && uno > dos}`).toBe('escala: true')
    // Y la .2 se queda EXACTAMENTE donde estaba antes de la v54: nada empeora.
    expect(dos).toBeCloseTo(LEARNING.raceBase * (30 / LEARNING.raceMarginRef), 10)
    expect(wt / dos).toBeCloseTo(LEARNING.raceClassFactor.WT!, 10)
  })

  it('al que está en su techo no le enseña nada, corra donde corra', () => {
    // Es el mismo `kDim` del entrenamiento dicho de otra forma: sin margen no se aprende.
    const lleno = raceLearning({
      attributes: attrs(90),
      ceilings: attrs(90),
      raceClass: 'WT',
      kind: 'reina',
    })
    expect(Object.keys(lleno)).toEqual([])
  })

  it('y nunca pasa del techo, ni en el Tour a un dedo de él', () => {
    const casi = raceLearning({
      attributes: { ...attrs(60), MON: 89.9 },
      ceilings: attrs(90),
      raceClass: 'WT',
      kind: 'reina',
    })
    expect(`no se pasa: ${(casi.MON ?? 0) <= 0.1 + 1e-9}`).toBe('no se pasa: true')
  })

  it('cuanto menos margen queda, menos se aprende', () => {
    const mucho = raceLearning({
      attributes: { ...attrs(60), MON: 50 },
      ceilings: attrs(90),
      raceClass: 'WT',
      kind: 'reina',
    }).MON!
    const poco = raceLearning({
      attributes: { ...attrs(60), MON: 85 },
      ceilings: attrs(90),
      raceClass: 'WT',
      kind: 'reina',
    }).MON!
    expect(`decrece: ${mucho > poco}`).toBe('decrece: true')
  })
})
