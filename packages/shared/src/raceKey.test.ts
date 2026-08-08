import { describe, expect, it } from 'vitest'
import { parseRaceKey, raceIdFromKey } from './raceKey.js'

/**
 * Regresión: el dashboard, «mis carreras», el perfil y la plantilla enlazaban con la clave de
 * almacenamiento (`race-flanders:s0`) en vez de con el id (`race-flanders`). Como la API valida el
 * id con forma de slug, los dos puntos lo rechazaban y las cuatro pantallas mostraban «Could not
 * load the stage.» para cualquier carrera real. Solo la vuelta de prueba funcionaba, porque su
 * clave no lleva sufijo de temporada: por eso pasó desapercibido.
 */
describe('clave de carrera frente a identificador', () => {
  it('separa la temporada de una clave real', () => {
    expect(parseRaceKey('race-flanders:s0')).toEqual({ raceId: 'race-flanders', season: 0 })
    expect(parseRaceKey('race-france:s12')).toEqual({ raceId: 'race-france', season: 12 })
  })

  it('deja intacta una clave sin temporada (la vuelta de prueba)', () => {
    expect(parseRaceKey('test-tour')).toEqual({ raceId: 'test-tour', season: null })
    expect(raceIdFromKey('test-tour')).toBe('test-tour')
  })

  it('el id resultante siempre tiene forma de slug, que es lo que valida la API', () => {
    const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    for (const key of ['race-flanders:s0', 'race-roubaix:s3', 'test-tour', 'race-france:s99']) {
      expect(raceIdFromKey(key)).toMatch(slug)
    }
  })

  it('no confunde un guion con el separador de temporada', () => {
    expect(raceIdFromKey('race-to-the-sun:s1')).toBe('race-to-the-sun')
  })
})
