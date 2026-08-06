import { DAYS_PER_SEASON, currentSeason, seasonPosition } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'

/**
 * La API calculaba la temporada de DOS formas distintas en el mismo archivo:
 * `Math.floor(world.currentDay / 364)` y `seasonPosition(world.currentDay).season`. No son la
 * misma cosa: `seasonPosition` es 1-indexada (el día 1 es "temporada 1") y toda la persistencia
 * —claves `${raceId}:s${season}`, `palmares.season`, `raceCallups.season`, `birthSeason` y la
 * edad `20 - birthSeason + season`— usa la 0-indexada del tick.
 *
 * Se unifica en `currentSeason` (0-indexada), no en `seasonPosition`, porque la 1-indexada era la
 * equivocada en el backend: consultaba las convocatorias de la temporada siguiente y daba 19 años
 * (en vez de 20) a los corredores recién creados. Estos tests fijan la convención.
 */
describe('api: convención de temporada', () => {
  it('la temporada es 0-indexada, como la guarda la base de datos', () => {
    expect(currentSeason(0)).toBe(0)
    expect(currentSeason(1)).toBe(0)
    expect(currentSeason(DAYS_PER_SEASON - 1)).toBe(0)
    expect(currentSeason(DAYS_PER_SEASON)).toBe(1)
    expect(currentSeason(DAYS_PER_SEASON * 2)).toBe(2)
  })

  it('coincide con floor(gameDay/364), la fórmula del tick y de las raceKey', () => {
    for (const day of [0, 1, 5, 363, 364, 365, 727, 728, 1000]) {
      expect(currentSeason(day)).toBe(Math.floor(day / DAYS_PER_SEASON))
    }
  })

  it('seasonPosition NO sirve aquí: va desfasada una temporada respecto a la base', () => {
    expect(seasonPosition(1).season).toBe(currentSeason(1) + 1)
    expect(seasonPosition(400).season).toBe(currentSeason(400) + 1)
  })
})
