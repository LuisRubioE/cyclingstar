import { ATTRIBUTES, VOCATIONS } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { generateRiderGenome } from './creation.js'

describe('engine: creación del genoma (SPEC 3.4-3.5)', () => {
  it('es determinista para la misma semilla y vocación', () => {
    const a = generateRiderGenome('rider-1', 'escalada')
    const b = generateRiderGenome('rider-1', 'escalada')
    expect(a).toEqual(b)
  })

  it('dos ciclistas de la misma vocación difieren en atributos y techos', () => {
    const a = generateRiderGenome('rider-1', 'escalada')
    const b = generateRiderGenome('rider-2', 'escalada')
    const attrsDiffer = ATTRIBUTES.some((attr) => a.attributes[attr] !== b.attributes[attr])
    const ceilingsDiffer = ATTRIBUTES.some(
      (attr) => a.hidden.ceilings[attr] !== b.hidden.ceilings[attr],
    )
    expect(attrsDiffer).toBe(true)
    expect(ceilingsDiffer).toBe(true)
  })

  it('respeta rangos e invariantes en muchos corredores y vocaciones', () => {
    for (let i = 0; i < 300; i++) {
      const vocation = VOCATIONS[i % VOCATIONS.length] ?? 'escalada'
      const genome = generateRiderGenome(`rider-${i}`, vocation)

      // Techos dentro de límites y ningún atributo por encima de su techo.
      let maxCeiling = 0
      for (const attr of ATTRIBUTES) {
        const ceiling = genome.hidden.ceilings[attr]
        expect(ceiling).toBeGreaterThanOrEqual(45)
        expect(ceiling).toBeLessThanOrEqual(96)
        expect(genome.attributes[attr]).toBeGreaterThanOrEqual(1)
        expect(genome.attributes[attr]).toBeLessThanOrEqual(ceiling)
        maxCeiling = Math.max(maxCeiling, ceiling)
      }

      // Don global: se garantiza que eres ciclista (mejor techo >= 82).
      expect(maxCeiling).toBeGreaterThanOrEqual(82)

      // TAC siempre inicia bajo (el oficio se aprende corriendo).
      expect(genome.attributes.TAC).toBeGreaterThanOrEqual(25)
      expect(genome.attributes.TAC).toBeLessThanOrEqual(32)

      // Atributos ocultos.
      expect(genome.hidden.talent).toBeGreaterThanOrEqual(0)
      expect(genome.hidden.talent).toBeLessThanOrEqual(100)
      expect(genome.hidden.fragility).toBeGreaterThanOrEqual(0.6)
      expect(genome.hidden.fragility).toBeLessThanOrEqual(1.8)
      expect(genome.hidden.peakAge).toBeGreaterThanOrEqual(26)
      expect(genome.hidden.peakAge).toBeLessThanOrEqual(31)
      expect(genome.hidden.declineAge).toBeGreaterThan(genome.hidden.peakAge)
    }
  })
})
