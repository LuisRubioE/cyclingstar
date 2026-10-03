import { describe, expect, it } from 'vitest'
import {
  type Horizon,
  type VeiledStage,
  anonHorizon,
  isVeiled,
  stageGateOf,
  throughStage,
  worldHorizon,
} from './horizon.js'

/**
 * LOS GEMELOS DEL PREDICADO DEL VELO (docs/retransmision.md §10.6, punto 3; D-37, 10-j). Nacen en el
 * 3a con los tipos y las funciones puras (17-g); `computeHorizon`, que llena el velo, llega en el 7a,
 * y hasta entonces los dos horizontes que existen lo tienen vacío.
 */

const KEY = 'race-france:s0'
const veiled = (stageDay: number, raceKey = KEY): VeiledStage => ({
  raceKey,
  stageDay,
  gameDay: 100 + stageDay,
  reason: 'headline',
})
const viewer = (veil: readonly VeiledStage[]): Horizon => ({
  kind: 'viewer',
  userId: '00000000-0000-4000-8000-000000000001',
  readOnly: false,
  rev: '200.3',
  knownThrough: new Map([[KEY, 4]]),
  veil,
  watching: new Map(),
})

describe('los dos horizontes sin espectador (10-h)', () => {
  it('el del mundo y el del visitante tienen el velo vacío y se distinguen por kind y rev', () => {
    expect(worldHorizon).toMatchObject({
      kind: 'world',
      userId: null,
      readOnly: true,
      rev: 'world',
    })
    expect(anonHorizon()).toMatchObject({ kind: 'anon', userId: null, readOnly: true, rev: 'anon' })
    for (const h of [worldHorizon, anonHorizon()]) {
      expect(h.veil).toEqual([])
      expect(stageGateOf(h, KEY, 7)).toBeNull()
      expect(throughStage(h, KEY, 9)).toBe(9)
    }
  })
})

describe('throughStage, isVeiled y stageGateOf (§10.6)', () => {
  const h = viewer([veiled(5), veiled(6), veiled(2, 'race-italy:s0')])

  it('throughStage sirve hasta la anterior a la primera velada de ESA carrera', () => {
    expect(throughStage(h, KEY, 6)).toBe(4)
    expect(throughStage(h, KEY, 3)).toBe(3) // lo corrido manda si es menor
    expect(throughStage(h, 'race-italy:s0', 8)).toBe(1)
    expect(throughStage(h, 'race-spain:s0', 8)).toBe(8)
  })

  it('isVeiled mira la carrera y la etapa', () => {
    expect(isVeiled(h, KEY, 5)).toBe(true)
    expect(isVeiled(h, KEY, 4)).toBe(false)
    expect(isVeiled(h, 'race-italy:s0', 5)).toBe(false)
  })

  it('la puerta: not_seen para la propia, y una anterior velada manda sobre la propia (10-j)', () => {
    expect(stageGateOf(h, KEY, 4)).toBeNull()
    expect(stageGateOf(h, KEY, 5)).toEqual({ k: 'not_seen' })
    expect(stageGateOf(h, KEY, 6)).toEqual({ k: 'previous_unseen', firstUnseen: 5 })
    expect(stageGateOf(h, KEY, 9)).toEqual({ k: 'previous_unseen', firstUnseen: 5 })
    expect(stageGateOf(h, 'race-italy:s0', 3)).toEqual({ k: 'previous_unseen', firstUnseen: 2 })
  })
})
