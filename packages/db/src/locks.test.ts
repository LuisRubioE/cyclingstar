import { SEASON_CALENDAR } from '@cyclingstar/engine'
import { describe, expect, it } from 'vitest'
import { LOCK_CLASS, hashInt, raceLockKey, toInt32 } from './locks.js'

describe('db: espacio de claves de los advisory locks', () => {
  it('las clases son distintas entre sí (espacios de nombres disjuntos)', () => {
    const values = Object.values(LOCK_CLASS)
    expect(new Set(values).size).toBe(values.length)
  })

  it('las claves de carrera caben en int4, que es lo que admite pg_advisory_lock(clase, clave)', () => {
    for (const race of SEASON_CALENDAR) {
      for (const season of [0, 1, 7]) {
        const key = raceLockKey(`${race.id}:s${season}`)
        expect(Number.isInteger(key)).toBe(true)
        expect(key).toBeGreaterThanOrEqual(-(2 ** 31))
        expect(key).toBeLessThanOrEqual(2 ** 31 - 1)
      }
    }
  })

  it('la clave de una carrera es estable y distinta entre temporadas', () => {
    expect(raceLockKey('race-france:s0')).toBe(raceLockKey('race-france:s0'))
    expect(raceLockKey('race-france:s0')).not.toBe(raceLockKey('race-france:s1'))
  })

  it('toInt32 dobla el rango sin signo al rango con signo sin perder información', () => {
    expect(toInt32(0)).toBe(0)
    expect(toInt32(2 ** 31 - 1)).toBe(2 ** 31 - 1)
    expect(toInt32(2 ** 32 - 1)).toBe(-1)
    // Distintos hashes sin signo siguen dando distintas claves con signo.
    expect(toInt32(hashInt('a'))).not.toBe(toInt32(hashInt('b')))
  })
})
