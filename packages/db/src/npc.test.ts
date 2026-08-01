import { ATTRIBUTES } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { fillerRiderSpec } from './npc.js'

describe('NPC de relleno (Paso 32)', () => {
  it('es determinista: el mismo mundo e índice dan el mismo corredor', () => {
    const a = fillerRiderSpec('world-seed', 3, 10)
    const b = fillerRiderSpec('world-seed', 3, 10)
    expect(a).toEqual(b)
  })

  it('genera corredores distintos para índices distintos', () => {
    const names = new Set(Array.from({ length: 20 }, (_, i) => fillerRiderSpec('w', i, 0).name))
    // Casi todos deberían ser únicos (algún choque ocasional es admisible).
    expect(names.size).toBeGreaterThanOrEqual(18)
  })

  it('reparte vocaciones y produce atributos y techos válidos', () => {
    const spec = fillerRiderSpec('w', 7, 5)
    expect(spec.name.length).toBeGreaterThan(0)
    expect(['escalada', 'velocidad', 'clasicas', 'crono', 'fondo']).toContain(spec.archetype)
    for (const attr of ATTRIBUTES) {
      expect(spec.attributes[attr]).toBeGreaterThan(0)
      expect(spec.attributes[attr]).toBeLessThanOrEqual(100)
      expect(spec.hidden.ceilings[attr]).toBeGreaterThanOrEqual(spec.attributes[attr] - 1)
    }
  })

  it('asigna edades de neoprofesional (20-27) por índice', () => {
    // birthSeason = currentSeason - (index % 8); con la temporada actual la edad sale 20-27.
    expect(fillerRiderSpec('w', 0, 5).birthSeason).toBe(5)
    expect(fillerRiderSpec('w', 7, 5).birthSeason).toBe(-2)
  })
})
