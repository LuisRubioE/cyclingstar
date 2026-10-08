import type { StageWinner } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { stageRowLink, stageRowState } from './raceStages'

/**
 * LAS FILAS DE `Stages` (E2, docs/retransmision.md §11.17; sup. C4; paso 9b). Cada fila enseña lo que el
 * servidor manda, sin mirar lo que pasó en la etapa: con ganador servido, `report` (el ganador y su acta);
 * corrida y sin ganador servido, `watch` (`Ready to watch`); sin correr, `not_raced`. Hasta aquí la fila sin
 * ganador decía `Not raced yet`, que en una etapa corrida y velada es falso.
 */

const winner = (stageDay: number): StageWinner => ({
  stageDay,
  riderId: `r${stageDay}`,
  name: `Rider ${stageDay}`,
  country: 'ES',
  teamName: null,
  isBot: true,
})
const winnersOf = (days: readonly number[]): ReadonlyMap<number, StageWinner> =>
  new Map(days.map((d) => [d, winner(d)]))

describe('stageRowState (sup. C4)', () => {
  it('con ganador servido, report; corrida sin ganador servido, watch; sin correr, not_raced', () => {
    const winners = winnersOf([1])
    expect(stageRowState({ index: 1 }, winners, [1, 2])).toBe('report')
    expect(stageRowState({ index: 2 }, winners, [1, 2])).toBe('watch')
    expect(stageRowState({ index: 3 }, winners, [1, 2])).toBe('not_raced')
  })

  it('una vuelta en guardia conocida hasta la 9 con la 12 corrida: report de 1 a 9, watch de 10 a 12, not_raced después', () => {
    const runDays = Array.from({ length: 12 }, (_, i) => i + 1)
    const winners = winnersOf(runDays.slice(0, 9))
    const states = Array.from({ length: 21 }, (_, i) =>
      stageRowState({ index: i + 1 }, winners, runDays),
    )
    expect(states.slice(0, 9).every((s) => s === 'report')).toBe(true)
    expect(states.slice(9, 12)).toEqual(['watch', 'watch', 'watch'])
    expect(states.slice(12).every((s) => s === 'not_raced')).toBe(true)
  })

  it('fuera de guardia el servidor manda todos los ganadores: toda etapa corrida es report (11-u)', () => {
    const runDays = [1, 2, 3]
    const winners = winnersOf(runDays)
    expect(runDays.map((d) => stageRowState({ index: d }, winners, runDays))).toEqual([
      'report',
      'report',
      'report',
    ])
  })

  it('no mira el ganador: dos ganadores distintos dan el mismo estado (B1c)', () => {
    const a = new Map([[1, winner(1)]])
    const b = new Map([[1, { ...winner(1), riderId: 'otro', name: 'Otro' }]])
    expect(stageRowState({ index: 1 }, a, [1])).toBe(stageRowState({ index: 1 }, b, [1]))
  })
})

describe('stageRowLink: a dónde lleva cada fila', () => {
  it('report lleva al acta con Watch encendido y a la ficha de la etapa en Story con él apagado (§20.5)', () => {
    expect(stageRowLink('race-france', 4, 'report', true)).toEqual({
      to: '/world/races/race-france/stages/4/report',
      label: 'Report →',
    })
    expect(stageRowLink('race-france', 4, 'report', false)).toEqual({
      to: '/world/races/race-france/stages/4?tab=report',
      label: 'Read the story →',
    })
  })

  it('watch lleva a la página de la etapa, que abre en Watch; not_raced no lleva a ninguna parte', () => {
    expect(stageRowLink('race-france', 10, 'watch', true)).toEqual({
      to: '/world/races/race-france/stages/10',
      label: 'Watch →',
    })
    // con el velo y sin `Watch` (SPOILER_MODE sin BROADCAST_WATCH), la página de la etapa, con su puerta
    expect(stageRowLink('race-france', 10, 'watch', false)).toEqual({
      to: '/world/races/race-france/stages/10',
      label: 'Open stage →',
    })
    expect(stageRowLink('race-france', 13, 'not_raced', true)).toBeNull()
  })
})
