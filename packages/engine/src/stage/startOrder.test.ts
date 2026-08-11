/**
 * LA REGLA DEL ORDEN DE SALIDA (v18). Es una función pura y este es su banco: los dos casos del
 * encargo y los bordes que de verdad ocurren en producción —dorsales nulos, empates en la general
 * (tras una etapa llana el pelotón ENTERO comparte tiempo) y huecos en la numeración—.
 */
import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import { timeTrialStartOrder, type StartOrderRider } from './startOrder.js'

/** Un corredor de la rampa: solo lo que la regla mira. */
function r(riderId: string, bib: number | null, gcDeficitSeconds = 0): StartOrderRider {
  return { riderId, bib, gcDeficitSeconds }
}

/** Los ids en orden de salida, que es lo que la regla decide. */
const order = (riders: StartOrderRider[]): string[] =>
  timeTrialStartOrder(riders).slots.map((s) => s.riderId)

/** Los dorsales en orden de salida. */
const bibs = (riders: StartOrderRider[]): (number | null)[] => {
  const byId = new Map(riders.map((x) => [x.riderId, x.bib]))
  return order(riders).map((id) => byId.get(id) ?? null)
}

describe('caso A · etapa de vuelta que no es la primera: orden inverso de la general', () => {
  const field = [
    r('lider', 1, 0),
    r('segundo', 11, 34),
    r('tercero', 21, 210),
    r('colista', 31, 4021),
  ]

  it('el último de la general sale primero y el líder, el último', () => {
    expect(order(field)).toEqual(['colista', 'tercero', 'segundo', 'lider'])
  })

  it('salen de dos en dos minutos', () => {
    const plan = timeTrialStartOrder(field)
    expect(plan.mode).toBe('general')
    expect(plan.intervalS).toBe(STAGE.ttStartIntervalGcS)
    expect(plan.slots.map((s) => s.startS)).toEqual([0, 120, 240, 360])
  })

  it('basta con que UNO haya perdido tiempo para que haya general', () => {
    expect(timeTrialStartOrder([r('a', 11, 0), r('b', 21, 1)]).mode).toBe('general')
  })

  it('los empatados en la general los desempata el dorsal, con los jefes de filas al final', () => {
    // Tras una etapa llana el pelotón entero comparte tiempo: en Race Colombia, después de la
    // etapa 2, 58 corredores empatan a un tiempo y 54 a otro. Sin desempate estable el orden lo
    // decidiría el azar del array; con el del dorsal, dentro del grupo empatado siguen cerrando
    // los acabados en 1.
    const pack = [r('a', 12, 90), r('b', 21, 90), r('c', 11, 90), r('d', 22, 90), r('z', 31, 300)]
    expect(bibs(pack)).toEqual([31, 22, 12, 21, 11])
  })
})

describe('caso B · primera etapa o carrera de un día: por dorsales', () => {
  // El enunciado del dueño, hacia delante: …29, 19, 9 → …28, 18, 8 → … → 22, 12, 2 → 21, 11, 1.
  const three = [1, 2, 8, 9, 11, 12, 18, 19, 21, 22, 28, 29].map((b) => r(`d${b}`, b))

  it('agrupa por la última cifra y dentro del grupo va del dorsal más alto al más bajo', () => {
    expect(bibs(three)).toEqual([29, 19, 9, 28, 18, 8, 22, 12, 2, 21, 11, 1])
  })

  it('el dorsal 1 cierra siempre la contrarreloj', () => {
    const b = bibs(three)
    expect(b[b.length - 1]).toBe(1)
  })

  it('salen de minuto en minuto', () => {
    const plan = timeTrialStartOrder(three)
    expect(plan.mode).toBe('dorsales')
    expect(plan.intervalS).toBe(STAGE.ttStartIntervalBibS)
    expect(plan.slots.map((s) => s.startS)).toEqual([
      0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660,
    ])
  })

  it('una carrera de un día (todos a 0 en la general) también sale por dorsales', () => {
    expect(timeTrialStartOrder([r('a', 11), r('b', 21)]).mode).toBe('dorsales')
  })

  it('los acabados en 0 salen por delante de los acabados en 9', () => {
    // En un campeonato nacional se numera 1..N corrido (`calendarRun.ts::assignBibs`), así que el
    // 10, el 20 y el 30 existen. El 10 es el DÉCIMO de su decena, no el primero: sale antes que el 9.
    expect(bibs([1, 9, 10, 19, 20, 29].map((b) => r(`d${b}`, b)))).toEqual([20, 10, 29, 19, 9, 1])
  })
})

describe('bordes', () => {
  it('un pelotón vacío no rompe la regla', () => {
    expect(timeTrialStartOrder([]).slots).toEqual([])
  })

  it('un corredor solo sale a la hora cero', () => {
    expect(timeTrialStartOrder([r('uno', 1)]).slots).toEqual([
      { riderId: 'uno', order: 0, startS: 0 },
    ])
  })

  it('los que no traen dorsal salen los primeros, y no le quitan el hueco al dorsal 1', () => {
    const mixed = [
      r('sin-a', null),
      r('con-11', 11),
      r('sin-b', null),
      r('con-1', 1),
      r('con-9', 9),
    ]
    expect(bibs(mixed)).toEqual([null, null, 9, 11, 1])
  })

  it('un campo ENTERO sin dorsales sigue teniendo un orden, y es el mismo cada vez', () => {
    const anon = [r('c', null), r('a', null), r('b', null)]
    expect(order(anon)).toEqual(['a', 'b', 'c'])
    expect(order(anon)).toEqual(order([...anon].reverse()))
  })

  it('con huecos en la numeración el reparto no deja huecos en la rampa', () => {
    // Equipos incompletos: faltan dorsales sueltos por medio. Los que quedan salen seguidos.
    const gappy = [3, 7, 13, 25, 41, 52].map((b) => r(`d${b}`, b))
    const plan = timeTrialStartOrder(gappy)
    expect(plan.slots.map((s) => s.startS)).toEqual([0, 60, 120, 180, 240, 300])
    // Los grupos son 7 · 5 · 3 · 2 · 1, y dentro del 3 el 13 sale antes que el 3.
    expect(bibs(gappy)).toEqual([7, 25, 13, 3, 52, 41])
  })

  it('el orden no depende de cómo venga ordenado el array de entrada', () => {
    const field = [r('a', 21, 30), r('b', 11, 0), r('c', 31, 120)]
    expect(order(field)).toEqual(order([...field].reverse()))
  })

  it('dos corredores con el mismo dorsal (roster roto) se desempatan por id, sin perder a nadie', () => {
    const clashing = [r('z', 11), r('a', 11), r('m', 21)]
    expect(order(clashing)).toEqual(['m', 'a', 'z'])
  })
})
