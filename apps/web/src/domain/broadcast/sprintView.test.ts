import type { SprintFrame } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { marginWords, sameSprint, sprintGapText, sprintNowAt, sprintPanelAt } from './sprintView'

/**
 * EL ÚLTIMO KM EN PANTALLA (W5c): los fotogramas a la hora del reloj. Entre dos, en línea recta por la
 * hora; antes del primero, el primero; después del último, el último (la línea la trae la meta).
 */

const frames: SprintFrame[] = [
  {
    atDs: 1000,
    toGoM: 300,
    spots: [
      { rider: 5, behindM: 0, role: 'leadOut' },
      { rider: 1, behindM: 2, role: 'bunch' },
      { rider: 2, behindM: 4, role: 'bunch' },
    ],
  },
  {
    atDs: 1100,
    toGoM: 200,
    spots: [
      { rider: 1, behindM: 0, role: 'launched' },
      { rider: 5, behindM: 1, role: 'bunch' },
      { rider: 3, behindM: 3, role: 'launched' },
    ],
  },
]

describe('el final a la hora del reloj (sprintNowAt)', () => {
  it('sin fotogramas, nada; antes del primero, el primero; después del último, el último', () => {
    expect(sprintNowAt([], 50)).toBeNull()
    expect(sprintNowAt(frames, 90)!.rows.map((r) => r.rider)).toEqual([5, 1, 2])
    expect(sprintNowAt(frames, 90)!.toGoM).toBe(300)
    expect(sprintNowAt(frames, 200)!.rows.map((r) => r.rider)).toEqual([1, 5, 3])
  })

  it('en el fotograma justo, el fotograma', () => {
    expect(sprintNowAt(frames, 100)!.rows).toEqual(frames[0]!.spots)
  })

  it('a mitad de camino, a mitad de metros, en el orden que dan, con el papel del más cercano', () => {
    const mid = sprintNowAt(frames, 105)!
    expect(mid.toGoM).toBe(250)
    // el 5 de 0 a 1 (0,5) y el 1 de 2 a 0 (1): el 5 sigue delante; el 2 solo está en el primero (4)
    expect(mid.rows.map((r) => [r.rider, r.behindM])).toEqual([
      [5, 0],
      [1, 0.5],
      [3, 2.5],
    ])
    expect(mid.rows.find((r) => r.rider === 1)!.role).toBe('launched')
    expect(sprintNowAt(frames, 104)!.rows.find((r) => r.rider === 1)!.role).toBe('bunch')
  })

  it('no desordena los fotogramas: da igual el orden en que lleguen', () => {
    expect(sprintNowAt([frames[1]!, frames[0]!], 105)).toEqual(sprintNowAt(frames, 105))
  })
})

describe('las palabras', () => {
  it('el hueco en metros, y el primero sin nada', () => {
    expect(sprintGapText(0)).toBe('')
    expect(sprintGapText(1.4)).toBe('+1.4 m')
  })

  it('el margen de la llegada, como la tele', () => {
    expect([0.1, 0.3, 0.7, 1.9, 5.4].map(marginWords)).toEqual([
      'by a tyre',
      'by half a wheel',
      'by a wheel',
      'by a bike length',
      'by 3 bike lengths',
    ])
  })
})

describe('lo mismo en pantalla (sameSprint)', () => {
  it('la misma distancia y las mismas filas; null solo con null', () => {
    const a = sprintNowAt(frames, 105)!
    expect(sameSprint(a, sprintNowAt(frames, 105))).toBe(true)
    expect(sameSprint(a, sprintNowAt(frames, 106))).toBe(false)
    expect(sameSprint(a, { ...a, toGoM: a.toGoM - 10 })).toBe(false)
    const otro = {
      ...a,
      rows: a.rows.map((r, i) => (i === 1 ? { ...r, behindM: r.behindM + 0.1 } : r)),
    }
    expect(sameSprint(a, otro)).toBe(false)
    expect(sameSprint(null, null)).toBe(true)
    expect(sameSprint(a, null)).toBe(false)
  })
})

describe('si sale el panel (sprintPanelAt)', () => {
  const at = { lastKm: true, phase: 'playing', timeTrial: false, toGoKm: 0.234 }

  it('en el último km, jugando o en pausa, con fotogramas', () => {
    expect(sprintPanelAt(frames, 105, at)).toEqual({ ...sprintNowAt(frames, 105), toGoM: 230 })
    expect(sprintPanelAt(frames, 105, { ...at, phase: 'paused' })).not.toBeNull()
  })

  it('fuera del último km, en la llegada, en el cierre, en crono o sin fotogramas, la barra', () => {
    expect(sprintPanelAt(frames, 105, { ...at, lastKm: false })).toBeNull()
    expect(sprintPanelAt(frames, 105, { ...at, phase: 'arrival' })).toBeNull()
    expect(sprintPanelAt(frames, 105, { ...at, phase: 'closing' })).toBeNull()
    expect(sprintPanelAt(frames, 105, { ...at, timeTrial: true })).toBeNull()
    expect(sprintPanelAt([], 105, at)).toBeNull()
  })

  it('la distancia, la de la capa fija y como la escribe ella (a la decena hacia abajo)', () => {
    for (const [km, m] of [
      [0.999, 990],
      [0.234, 230],
      [0.05, 50],
      [0.0099, 0],
      [-0.01, 0],
    ] as const)
      expect(sprintPanelAt(frames, 105, { ...at, toGoKm: km })?.toGoM, `${km}`).toBe(m)
  })

  it('el que llega solo, sin panel: la barra, con lo que les saca a los de detrás', () => {
    const solo: SprintFrame[] = frames.map((f) => ({ ...f, spots: f.spots.slice(0, 1) }))
    expect(sprintNowAt(solo, 105)?.rows).toHaveLength(1)
    expect(sprintPanelAt(solo, 105, at)).toBeNull()
    // si le cazan, el panel sale desde que van dos
    const cazado = [solo[0]!, frames[1]!]
    expect(sprintPanelAt(cazado, 100, at)).toBeNull()
    expect(sprintPanelAt(cazado, 110, at)).not.toBeNull()
  })
})

describe('el título: un sprint cuando se ve', () => {
  it('alguien tira, lanza, cede o va encerrado: un sprint; todos en el grupo, el último km', () => {
    expect(sprintNowAt(frames, 100)!.sprint).toBe(true)
    expect(sprintNowAt(frames, 110)!.sprint).toBe(true)
    const quietos: SprintFrame[] = frames.map((f) => ({
      ...f,
      spots: f.spots.map((s) => ({ ...s, role: 'bunch' as const })),
    }))
    expect(sprintNowAt(quietos, 100)!.sprint).toBe(false)
    expect(sprintNowAt(quietos, 105)!.sprint).toBe(false)
    for (const role of ['leadOut', 'launched', 'fading', 'boxed'] as const) {
      const uno: SprintFrame[] = [
        { ...quietos[0]!, spots: quietos[0]!.spots.map((s, i) => (i === 2 ? { ...s, role } : s)) },
      ]
      expect(sprintNowAt(uno, 100)!.sprint, role).toBe(true)
    }
    expect(
      sameSprint(sprintNowAt(frames, 100), { ...sprintNowAt(frames, 100)!, sprint: false }),
    ).toBe(false)
  })
})
