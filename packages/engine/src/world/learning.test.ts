import { ATTRIBUTES, type Attribute } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { LEARNING } from '../constants.js'
import { raceLearning, tourSupercompensation } from './learning.js'

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
    // Los terrenos ganan atributos en la v2, y va anotado: DES entra en las de montaña —lo que baja
    // un puerto es lo que enseña a bajarlo— y LLA en la crono y en la clásica, que son kilómetros de
    // rodar a tope. Antes: reina COL+MON, crono CRI a secas.
    const reina = raceLearning({ ...base, raceClass: 'WT', kind: 'reina' })
    expect(Object.keys(reina).sort()).toEqual(['COL', 'DES', 'MON', 'TAC'])
    const llana = raceLearning({ ...base, raceClass: 'WT', kind: 'llana' })
    expect(Object.keys(llana).sort()).toEqual(['LLA', 'SPR', 'TAC'])
    // Una crono no enseña a subir, pero sigue enseñando a correr.
    const cri = raceLearning({ ...base, raceClass: 'WT', kind: 'cri' })
    expect(Object.keys(cri).sort()).toEqual(['CRI', 'LLA', 'TAC'])
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
    // La PROPORCIÓN entre clases se conserva intacta, que es lo que esta prueba vigila. El valor
    // absoluto de la .2 ya NO es `raceBase · margen/30`: la v2 multiplica además por talento, edad y
    // el freno al techo, y eso es el cambio, no un efecto colateral. Lo que no puede moverse es que
    // el Tour siga valiendo el doble.
    expect(wt / dos).toBeCloseTo(LEARNING.raceClassFactor.WT!, 10)
    expect(pro / dos).toBeCloseTo(LEARNING.raceClassFactor.Pro!, 10)
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

function corredor(
  valor: number,
  techo: number,
): { attributes: Record<Attribute, number>; ceilings: Record<Attribute, number> } {
  const attributes = {} as Record<Attribute, number>
  const ceilings = {} as Record<Attribute, number>
  for (const a of ATTRIBUTES) {
    attributes[a] = valor
    ceilings[a] = techo
  }
  return { attributes, ceilings }
}

describe('learning: lo que enseña la carrera, v2', () => {
  it('el veterano con margen aprende poco, y el joven con talento llega al techo del día', () => {
    // La frase del dueño en números: aprende el joven, no el veterano.
    const c = corredor(60, 80)
    const viejo = raceLearning({
      raceClass: 'WT',
      kind: 'reina',
      ...c,
      talent: 50,
      age: 31,
      declineAge: 33,
    })
    const joven = raceLearning({
      raceClass: 'WT',
      kind: 'reina',
      ...c,
      talent: 80,
      age: 22,
      declineAge: 33,
      depletion: 1,
    })
    expect(viejo.MON!).toBeLessThanOrEqual(0.15)
    expect(joven.MON!).toBeGreaterThan(viejo.MON!)
    // Y nada pasa del techo diario, por muchos factores que se multipliquen.
    for (const v of Object.values(joven)) expect(v!).toBeLessThanOrEqual(0.8)
  })

  it('`kDim` está en la cadena: a un punto del techo casi no se aprende', () => {
    // Ésta es la prueba de que el freno superlineal ENTRÓ. Con solo `margen/30` un corredor a un
    // punto de su techo seguiría aprendiendo 0,033/día, que es lo que clavaba a todo el mundo en su
    // techo a los 22-24.
    const casi = raceLearning({
      raceClass: 'WT',
      kind: 'reina',
      ...corredor(79, 80),
      talent: 80,
      age: 22,
      declineAge: 33,
    })
    expect(casi.MON!).toBeLessThan(0.01)
  })

  it('el que se baja aprende la mitad, y el que no llegó a correr no aprende nada', () => {
    const base = {
      raceClass: 'WT' as const,
      kind: 'reina',
      ...corredor(60, 80),
      age: 24,
      talent: 50,
    }
    const termina = raceLearning({ ...base, estado: 'finish' })
    const abandona = raceLearning({ ...base, estado: 'abandon' })
    const enfermo = raceLearning({ ...base, estado: 'enfermo' })
    expect(abandona.MON!).toBeCloseTo(termina.MON! * 0.5, 6)
    expect(enfermo.MON).toBeUndefined()
  })

  it('ganar enseña táctica, y solo táctica', () => {
    const base = {
      raceClass: 'WT' as const,
      kind: 'llana',
      ...corredor(60, 80),
      age: 24,
      talent: 50,
    }
    const anonimo = raceLearning({ ...base, puesto: 150 })
    const gana = raceLearning({ ...base, puesto: 1 })
    const gregario = raceLearning({ ...base, puesto: 80, trabajoParaOtro: true })
    expect(gana.TAC!).toBeCloseTo(anonimo.TAC! * 1.8, 6)
    expect(gregario.TAC!).toBeCloseTo(anonimo.TAC! * 1.3, 6)
    // El esfuerzo del día no cambia por ganar: lo que cambia es lo que aprendes de él.
    expect(gana.LLA!).toBeCloseTo(anonimo.LLA!, 6)
  })

  it('la recuperación se aprende encadenando días, no corriendo uno', () => {
    const base = {
      raceClass: 'WT' as const,
      kind: 'llana',
      ...corredor(60, 80),
      age: 24,
      talent: 50,
    }
    expect(raceLearning({ ...base, stageIndex: 2 }).REC).toBeUndefined()
    expect(raceLearning({ ...base, stageIndex: 5 }).REC!).toBeGreaterThan(0)
  })

  it('la vuelta entera deja fondo, y una carrera de tres días no', () => {
    const c = corredor(60, 80)
    expect(tourSupercompensation({ stages: 3, ...c, talent: 50, age: 24 })).toBe(0)
    const tour = tourSupercompensation({ stages: 21, ...c, talent: 50, age: 24, declineAge: 33 })
    expect(tour).toBeGreaterThan(0.5)
    expect(tour).toBeLessThan(2.5)
  })
})
