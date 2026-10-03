import { describe, expect, it } from 'vitest'
import {
  type StoredRadioPhoto,
  type StoredStage,
  estimatedHeadClock,
  revealStoredEvents,
} from './broadcastSource.js'
import type { ChronicleEvent } from './chronicle.js'

/**
 * EL RELOJ ESTIMADO DE LAS ETAPAS SIN LÍNEA (docs/retransmision.md §3.8; D-07). Las etapas corridas
 * antes de que se grabe la línea (paso 5) no tienen reloj de grupo: la cabeza se estima integrando la
 * velocidad del grupo de cabeza de cada foto de la radio guardada y reescalando para que la meta
 * caiga en el tiempo del ganador. Sobre ese reloj, el adaptador fecha cada suceso guardado con las
 * reglas de revelado (`revealSOf`, §4.7), y con esa hora nace B19 (16-a, 17-d).
 */

type Group = StoredRadioPhoto['groups'][number]
const group = (over: Partial<Group> = {}): Group => ({
  kind: 'peloton',
  gapS: 0,
  speedKmh: 36,
  pulling: [],
  watching: [],
  ...over,
})
/** Una foto con solo la cabeza, a esa velocidad (null: la radio no pudo medirla). */
const head = (km: number, speedKmh: number | null): StoredRadioPhoto => ({
  km,
  groups: [group({ speedKmh })],
})

describe('estimatedHeadClock · el reloj de la cabeza (§3.8)', () => {
  it('desde la v90 la velocidad de una foto es la del km que acaba de recorrer: el tramo de la k a la k + 1 va con la de la k + 1', () => {
    // La primera foto mide el km siguiente (20 km/h, como la segunda) y la tercera, el que va del 1
    // al 2 (40 km/h): 180 s y 90 s. Con la velocidad de la foto k en el tramo siguiente, que era la
    // regla de la v89, el segundo tramo saldría a 20 km/h y la cabeza llegaría al km 1 a los 135 s.
    const clock = estimatedHeadClock([head(0, 20), head(1, 20), head(2, 40)], 2, 270)
    expect(clock).toEqual([0, 180, 270, 270])
  })

  it('con huecos de velocidad, un tramo sin ella toma la última conocida, y los anteriores al primero que la tiene, la de ése', () => {
    // Tramos: 0→1 sin dato (antes del primero: 30), 1→2 a 30, 2→3 sin dato (la última: 30), 3→4 a 60.
    const kms = [head(0, null), head(1, null), head(2, 30), head(3, null), head(4, 60)]
    // 120 + 120 + 120 + 60 = 420 s, que el ganador hizo en 840: todo se estira por dos.
    expect(estimatedHeadClock(kms, 4, 840)).toEqual([0, 240, 480, 720, 840, 840])
  })

  it('la meta cae exactamente en el tiempo del ganador, y el reloj no retrocede', () => {
    const kms = [head(0.1, 41.3), head(1.1, 37.9), head(2.1, null), head(2.9, 52.7)]
    const clock = estimatedHeadClock(kms, 3, 1234.5)
    expect(clock).not.toBeNull()
    expect(clock?.at(-1)).toBe(1234.5)
    for (let k = 1; k < (clock?.length ?? 0); k++)
      expect(clock?.[k]).toBeGreaterThanOrEqual(clock?.[k - 1] ?? 0)
  })

  it('una radio sin ninguna velocidad de cabeza no tiene reloj que estimar: null', () => {
    expect(estimatedHeadClock([head(0, null), head(1, null), head(2, 0)], 2, 300)).toBeNull()
    expect(estimatedHeadClock([], 2, 300)).toBeNull()
  })
})

/**
 * Una etapa de 3 km a 36 km/h: la cabeza pasa el final de cada km de foto 100 s después que el
 * anterior, sin reescalar (el ganador la hace en 290 s), y está en el km x en el segundo
 * 100 · (x − 0,1). Las fotos son las de la radio guardada: al final del bloque de 0,1, 1,1 y 2,1 km y
 * en la meta.
 */
function stage(over: Partial<StoredStage> = {}): StoredStage {
  // La entrada (el RiderIx): Ana, Bea, Cris y Dani. La radio solo nombra a tres: 0 Bea, 1 Ana, 2 Cris.
  // Cris sale sola en el km 0,55; en el 2,1 Ana ya se ha quedado en un tercer grupo.
  const fuga = group({ kind: 'fuga', pulling: [2] })
  return {
    riderIds: ['a', 'b', 'c', 'd'],
    lengthKm: 3,
    winnerS: 290,
    radio: {
      riders: ['b', 'a', 'c'],
      kms: [
        { km: 0.1, groups: [group({ pulling: [0], watching: [1, 2] })] },
        { km: 1.1, groups: [fuga, group({ gapS: 30, pulling: [0, 1] })] },
        {
          km: 2.1,
          groups: [
            fuga,
            group({ gapS: 50, pulling: [0] }),
            group({ kind: 'grupeto', gapS: 70, watching: [1] }),
          ],
        },
        { km: 3, groups: [fuga, group({ gapS: 60, pulling: [0, 1] })] },
      ],
    },
    ...over,
  }
}

const ev = (over: Partial<ChronicleEvent> & { plantilla: string }): ChronicleEvent => ({
  km: 1.55,
  tS: 0,
  tipo: '',
  protagonistas: [],
  ...over,
})

describe('revealStoredEvents · el revealS de lo guardado (§3.8, §4.7)', () => {
  it('por defecto, el reloj estimado del grupo de su primer protagonista al acabar el bloque del suceso', () => {
    // km 1,55: el bloque 15, que acaba en el km 1,6 (cabeza: 150 s). Ana va en el segundo grupo de la
    // última foto (la del km 1,1), a 30 s.
    const out = revealStoredEvents([ev({ plantilla: 'attack_go', protagonistas: ['a'] })], stage())
    expect(out?.revealS).toEqual([180])
  })

  it('…nunca antes de su tS, y en décimas, como la línea grabada (§3.8)', () => {
    const out = revealStoredEvents(
      [ev({ plantilla: 'attack_go', tS: 200.04, protagonistas: ['a'] })],
      stage(),
    )
    expect(out?.revealS).toEqual([200])
  })

  it('el que la radio no nombra en esa foto se revela con el reloj de la cabeza', () => {
    // km 2,55: el bloque 25, que acaba en el km 2,6 (cabeza: 250 s). Dani no está entre los
    // nombrados; Bea tira en el segundo grupo de la foto del km 2,1, a 50 s.
    const out = revealStoredEvents(
      [
        ev({ plantilla: 'attack_go', km: 2.55, protagonistas: ['d'] }),
        ev({ plantilla: 'attack_go', km: 2.55, protagonistas: ['b'] }),
      ],
      stage(),
    )
    expect(out?.revealS).toEqual([250, 300])
  })

  it('la fuga se revela al cuajar, cuando saca 45 s al pelotón en una foto, no en el km en que salió', () => {
    // Sale en el km 0,55 (bloque 5, cabeza en el 50 s); en la foto del km 1,1 saca 30 s al pelotón y
    // en la del 2,1, 50: ahí se confirma (STAGE.tacticBreakGapSeconds), con la cabeza en el 200 s.
    const formada = ev({ plantilla: 'breakaway_formed', km: 0.55, tS: 50, protagonistas: ['c'] })
    const colabora = { ...formada, plantilla: 'break_cooperation' }
    expect(revealStoredEvents([formada, colabora], stage())?.revealS).toEqual([200, 200])
    // Si ninguna foto la confirma (la radio no nombra a ninguno de los suyos), el km en que salió:
    // el bloque 5, que acaba en el km 0,6, con la cabeza en el 50 s.
    expect(revealStoredEvents([{ ...formada, protagonistas: ['d'] }], stage())?.revealS).toEqual([
      50,
    ])
  })

  it('el rebelde, con el siguiente suceso de su protagonista (next_emit)', () => {
    const rebelde = ev({ plantilla: 'rider_defies_team', km: 0.55, protagonistas: ['b'] })
    const ataque = ev({ plantilla: 'attack_go', km: 2.55, protagonistas: ['b'] })
    expect(revealStoredEvents([rebelde, ataque], stage())?.revealS).toEqual([300, 300])
  })

  it('un pinchazo de carretera, con el grupo en que iba al final del bloque anterior (incident)', () => {
    // km 2,05: el bloque 20, que acaba en el km 2,1. Al final del 19 Ana iba en el segundo grupo (la
    // foto del km 1,1), y ese puesto pasa el final del 20 a 50 s de la cabeza: 250 s. En esa foto ella
    // ya va en el tercero, a 70 s, porque se ha parado; pero se sabe cuando pasa su grupo (4-v).
    const pinchazo = ev({ plantilla: 'puncture', km: 2.05, protagonistas: ['a'] })
    expect(revealStoredEvents([pinchazo], stage())?.revealS).toEqual([250])
  })

  it('lo de la meta va al paquete de meta: nunca antes del reloj del ganador', () => {
    const out = revealStoredEvents(
      [ev({ plantilla: 'stage_win', km: 2.95, tS: 289, protagonistas: ['c'] })],
      stage(),
    )
    expect(out?.revealS).toEqual([290])
    expect(out?.view.finishS).toBe(290)
  })

  it('la vista: todos salen en el grupo 0, en el segundo 0; un grupo que no está en la foto no tiene reloj', () => {
    const view = revealStoredEvents([], stage())?.view
    expect(view?.groupAt(0, -1)).toBe(0)
    expect(view?.clockAt(0, -1)).toBe(0)
    expect(view?.clockAt(2, 15)).toBeNull()
    expect(view?.clockAt(2, 20)).toBe(270)
    expect(view?.headClockAt(29)).toBe(290)
    expect(view?.blockOfKm(1.55)).toBe(15)
  })

  it('sin velocidad de cabeza en ninguna foto, null: el adaptador no construye la línea', () => {
    const sinVelocidad = stage()
    const kms = sinVelocidad.radio.kms.map((k) => ({
      ...k,
      groups: k.groups.map((g) => ({ ...g, speedKmh: null })),
    }))
    expect(revealStoredEvents([], { ...sinVelocidad, radio: { ...sinVelocidad.radio, kms } })).toBe(
      null,
    )
  })
})
