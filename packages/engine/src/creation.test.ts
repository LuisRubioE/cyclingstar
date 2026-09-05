import { ATTRIBUTES, VOCATIONS } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { CREATION } from './constants.js'
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

  /**
   * SE EMPIEZA SIENDO UN DON NADIE (v48). El dueño: «yo diría que empiecen con 18 años… con stats
   * casi a cero, sin equipo… y así para cuando cumplan 19 y 20 ya pueden tener mejores stats, quizás
   * un equipo».
   *
   * Lo que se sella aquí son las DOS mitades, porque cualquiera de ellas sola arruina la otra:
   *
   * - **no eres nadie todavía**: un corredor recién creado entra por debajo del suelo de una
   *   plantilla continental (`rating` 0,50 en su percentil 10), así que el mercado no le ficha —ver
   *   `MIN_RATING_FOR_OFFERS` en packages/db— y el contrato hay que ganárselo;
   * - **pero eres ciclista**: los TECHOS no bajan. Lo que se recorta es lo que TIENES, no lo que
   *   puedes llegar a ser, y por eso la primera temporada recupera casi todo (medido: `rating` 0,21
   *   a los 18 y 0,43 al cumplir 19, que ya cruza el listón de la ficha).
   *
   * El «casi a cero» no se toma literal y el motor dice por qué: al nivel 5, siete de cada diez
   * carreras se terminan fuera de control. Los números y la tabla, en `CREATION.primaryMean`.
   */
  it('un corredor nuevo empieza por debajo del suelo del pelotón profesional', () => {
    // La misma cuenta que usa el mercado (`riderRating`): media de sus cinco mejores atributos.
    const rating = (g: ReturnType<typeof generateRiderGenome>): number => {
      const top = ATTRIBUTES.map((a) => g.attributes[a])
        .sort((x, y) => y - x)
        .slice(0, 5)
      return top.reduce((x, y) => x + y, 0) / top.length / 100
    }
    for (let i = 0; i < 200; i++) {
      const g = generateRiderGenome(`novato-${i}`, VOCATIONS[i % VOCATIONS.length] ?? 'escalada')
      // Por debajo del percentil 10 de una plantilla continental (0,496), con margen.
      expect(`${i}: ${rating(g) < 0.35}`).toBe(`${i}: true`)
      // …y por encima de lo que hace imposible acabar una carrera: al nivel 5 el 70 % son DNF.
      expect(`${i}: ${rating(g) > 0.12}`).toBe(`${i}: true`)
      // El TECHO no se toca: sigues pudiendo llegar a lo más alto.
      const mejorTecho = Math.max(...ATTRIBUTES.map((a) => g.hidden.ceilings[a]))
      expect(`${i}: ${mejorTecho >= 82}`).toBe(`${i}: true`)
    }
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
      expect(genome.attributes.TAC).toBeGreaterThanOrEqual(CREATION.tacInitialMin)
      expect(genome.attributes.TAC).toBeLessThanOrEqual(CREATION.tacInitialMax)

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
