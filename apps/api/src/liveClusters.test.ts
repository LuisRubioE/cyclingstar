import { BROADCAST } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import type { ChronicleEvent } from './chronicle.js'
import { type ClusterClock, liveClusters } from './liveClusters.js'

/**
 * LOS RACIMOS EN VIVO (docs/retransmision.md §12.3; D-43, 12-d, DD-18). La regla B3 del dueño: «No
 * menciones uno a uno todos los ciclistas que se van descolgando: puedes mencionar muchos juntos con
 * número». En el acta la cumple `groupRuns`; en la voz esa pasada está apagada, porque convierte en
 * racimo una mención que ya se dijo suelta. El racimo en vivo se publica UNA vez, cuando su ventana
 * se cierra, y nunca antes de que se sepa ninguno de sus miembros. Nace apagado
 * (`BROADCAST.liveClusters`): aquí se sella la regla, y B19 (voicePrefix.test.ts) que con ella la voz
 * sigue siendo prefijo de sí misma.
 */

const IX: Readonly<Record<string, number>> = { r1: 0, r2: 1, r3: 2, r4: 3, r5: 4, r6: 5 }

/** La cabeza pasa el final del bloque b en el segundo b + 1; cada grupo, su retraso después. */
function clock(over: Partial<ClusterClock> & { lag?: Readonly<Record<number, number>> } = {}) {
  const { lag = { 0: 0, 1: 100 }, ...rest } = over
  const view: ClusterClock = {
    finishS: 10_000,
    riderIx: (id) => IX[id] ?? null,
    blockOfKm: (km) => Math.max(0, Math.round(km / 0.1 - 0.5)),
    // Todo el que se descuelga va, después, en el grupo 1.
    groupAt: () => 1,
    clockAt: (g, b) => (lag[g] === undefined ? null : b + 1 + lag[g]),
    ...rest,
  }
  return view
}

const suelto = (plantilla: string, km: number, id: string, toGo = 50): ChronicleEvent => ({
  km,
  tS: 10 * km,
  tipo: 'descuelgue',
  plantilla,
  protagonistas: [id],
  datos: { toGo },
})

/** Las horas de revelado, atadas por identidad como en la ruta del tramo (§14.3). */
const horas = (pares: readonly (readonly [ChronicleEvent, number])[]) => {
  const m = new Map(pares)
  return (e: ChronicleEvent): number => m.get(e) ?? Number.POSITIVE_INFINITY
}

describe('liveClusters · los racimos en vivo (§12.3)', () => {
  it('nace apagado (DD-18): solo se enciende con B19 en 0 con la política de nombres real', () => {
    expect(BROADCAST.liveClusters).toBe(false)
    expect(BROADCAST.liveClusterWindowKm).toBe(5)
    expect(BROADCAST.liveClusterMin).toBe(3)
  })

  it('tres descuelgues en 5 km son UN racimo: se publica cuando el grupo del último cruza el final de la ventana', () => {
    const a = suelto('rider_sits_up', 100.05, 'r1', 60)
    const b = suelto('rider_sits_up', 102.05, 'r2', 58)
    const c = suelto('rider_sits_up', 104.05, 'r3', 56)
    const [racimo, ...resto] = liveClusters(
      [a, b, c],
      clock(),
      horas([
        [a, 1000],
        [b, 1020],
        [c, 1040],
      ]),
    )
    expect(resto).toEqual([])
    // La ventana acaba en el km 105,05, el bloque 1.050: el grupo de Cris (el 1, 100 s) pasa en el 1.151.
    expect(racimo?.revealS).toBe(1151)
    expect(racimo?.members).toEqual([a, b, c])
    // Como lo arma groupRuns en el acta: en el km del último, con todos y el número.
    expect(racimo?.event).toEqual({
      km: c.km,
      tS: c.tS,
      tipo: 'descuelgue',
      plantilla: 'riders_sit_up',
      protagonistas: ['r1', 'r2', 'r3'],
      datos: { count: 3, toGo: 56, from: 100 },
    })
  })

  it('nunca antes del revelado de ninguno de sus miembros (12-d)', () => {
    const [a, b, c] = [100, 101, 102].map((km, i) => suelto('rider_sits_up', km, `r${i + 1}`))
    const [racimo] = liveClusters(
      [a!, b!, c!],
      clock(),
      horas([
        [a!, 1000],
        [b!, 5000],
        [c!, 1040],
      ]),
    )
    expect(racimo?.revealS).toBe(5000)
  })

  it('si el grupo del último ya no existe al final de la ventana, la hora del último', () => {
    const [a, b, c] = [100, 101, 102].map((km, i) => suelto('rider_sits_up', km, `r${i + 1}`))
    const reveal = horas([
      [a!, 1000],
      [b!, 1010],
      [c!, 1020],
    ])
    expect(liveClusters([a!, b!, c!], clock({ groupAt: () => null }), reveal)[0]?.revealS).toBe(
      1020,
    )
    expect(liveClusters([a!, b!, c!], clock({ lag: {} }), reveal)[0]?.revealS).toBe(1020)
  })

  it('con menos de liveClusterMin no hay racimo: los sueltos los cuenta la barra', () => {
    const a = suelto('rider_sits_up', 100, 'r1')
    const b = suelto('rider_sits_up', 103, 'r2')
    expect(liveClusters([a, b], clock(), () => 1000)).toEqual([])
  })

  it('las ventanas son voraces, como groupRuns: la siguiente empieza en el primero que quedó fuera', () => {
    const kms = [100, 104, 105, 106, 107, 113, 114, 115]
    const sueltos = kms.map((km, i) => suelto('rider_sits_up', km, `r${(i % 6) + 1}`))
    const racimos = liveClusters(sueltos, clock(), () => 1000)
    // [100, 105] tiene tres; [106, 111], dos, que no hacen racimo; [113, 118], tres.
    expect(racimos.map((r) => r.members.map((m) => m.km))).toEqual([
      [100, 104, 105],
      [113, 114, 115],
    ])
  })

  it('los que conservan su línea (la fuga, un maillot, los del espectador; 12-s) no entran en la cuenta', () => {
    const sueltos = [100, 101, 102].map((km, i) => suelto('rider_sits_up', km, `r${i + 1}`))
    const conservaR2 = (e: ChronicleEvent) => e.protagonistas.includes('r2')
    expect(liveClusters(sueltos, clock(), () => 1000, conservaR2)).toEqual([])
    // …ni un suceso que el motor no narra (`narra: 0`): tampoco sale en la voz.
    const callado = { ...sueltos[1]!, datos: { narra: 0 } }
    expect(liveClusters([sueltos[0]!, callado, sueltos[2]!], clock(), () => 1000)).toEqual([])
  })

  it('las pájaras y los abandonos hacen sus propios racimos, y no se mezclan con los descuelgues', () => {
    const bonks = [100, 101, 102].map((km, i) => suelto('rider_bonks', km, `r${i + 1}`))
    const fuera = [120, 121, 122].map((km, i) => suelto('rider_abandons', km, `r${i + 4}`))
    const mezcla = [
      suelto('rider_sits_up', 140, 'r1'),
      suelto('rider_sits_up', 141, 'r2'),
      suelto('rider_bonks', 142, 'r3'),
    ]
    const racimos = liveClusters([...bonks, ...fuera, ...mezcla], clock(), () => 1000)
    expect(racimos.map((r) => r.event.plantilla).sort()).toEqual(['riders_abandon', 'riders_bonk'])
  })

  it('un racimo que se cierra en la meta o después queda para el acta: su hora no entra en ningún tramo', () => {
    const sueltos = [100, 101, 102].map((km, i) => suelto('rider_sits_up', km, `r${i + 1}`))
    const [racimo] = liveClusters(sueltos, clock({ finishS: 1100 }), () => 1000)
    expect(racimo?.revealS).toBeGreaterThanOrEqual(1100)
  })
})
