import { describe, expect, it } from 'vitest'
import { inactiveSince, isAway } from './inactivity.js'

/**
 * `inactiveSince` en sus cuatro casos e `isAway` en el borde exacto de `away_until` (docs/cuenta.md §14.4 y
 * §17; PR 13 de E4): la ausencia congela la inactividad para E7, no la rellena.
 */
const VISITA = new Date('2026-11-01T10:00:00Z')
const VUELTA = new Date('2026-11-20T00:00:00Z')

describe('db: inactiveSince (§14.4)', () => {
  it('las dos nulas: nula', () => {
    expect(inactiveSince(null, null)).toBeNull()
  })

  it('una de cada: la que hay', () => {
    expect(inactiveSince(VISITA, null)).toBe(VISITA)
    expect(inactiveSince(null, VUELTA)).toBe(VUELTA)
  })

  it('las dos, en cada orden: la más tardía (la ausencia congela el reloj hasta la vuelta)', () => {
    expect(inactiveSince(VISITA, VUELTA)).toBe(VUELTA)
    const tarde = new Date('2026-11-22T09:00:00Z')
    expect(inactiveSince(tarde, VUELTA)).toBe(tarde)
  })

  it('con la ausencia viva, en el futuro: ningún reloj corre', () => {
    const ahora = new Date('2026-11-10T00:00:00Z')
    expect(inactiveSince(VISITA, VUELTA)!.getTime()).toBeGreaterThan(ahora.getTime())
  })
})

describe('db: isAway (§14.2)', () => {
  it('ausente hasta el instante de la vuelta, que ya no lo es', () => {
    expect(isAway({ awayUntil: null }, VUELTA)).toBe(false)
    expect(isAway({ awayUntil: VUELTA }, new Date(VUELTA.getTime() - 1))).toBe(true)
    expect(isAway({ awayUntil: VUELTA }, VUELTA)).toBe(false)
    expect(isAway({ awayUntil: VUELTA }, new Date(VUELTA.getTime() + 1))).toBe(false)
  })
})
