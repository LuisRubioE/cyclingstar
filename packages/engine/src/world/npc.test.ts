import { ATTRIBUTES, VOCATIONS } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { type Division, generateNpcRider, sampleNpcAge } from './npc.js'

const DIVISIONS: Division[] = ['WT', 'PRS', 'CON']

describe('engine: génesis del genoma NPC (SPEC 10)', () => {
  it('es determinista para la misma semilla, división, vocación y edad', () => {
    const a = generateNpcRider('npc-1', { division: 'WT', vocation: 'escalada', age: 27 })
    const b = generateNpcRider('npc-1', { division: 'WT', vocation: 'escalada', age: 27 })
    expect(a).toEqual(b)
  })

  it('respeta rangos e invariantes en muchos NPC de todas las divisiones y vocaciones', () => {
    for (let i = 0; i < 300; i++) {
      const division = DIVISIONS[i % DIVISIONS.length] ?? 'WT'
      const vocation = VOCATIONS[i % VOCATIONS.length] ?? 'escalada'
      const age = sampleNpcAge(`npc-${i}:age`)
      const genome = generateNpcRider(`npc-${i}`, { division, vocation, age })

      for (const attr of ATTRIBUTES) {
        expect(genome.attributes[attr]).toBeGreaterThanOrEqual(20)
        expect(genome.attributes[attr]).toBeLessThanOrEqual(95)
        // Ningún atributo por encima de su techo.
        expect(genome.attributes[attr]).toBeLessThanOrEqual(genome.hidden.ceilings[attr])
        expect(genome.hidden.ceilings[attr]).toBeLessThanOrEqual(96)
      }

      expect(genome.hidden.talent).toBeGreaterThanOrEqual(0)
      expect(genome.hidden.talent).toBeLessThanOrEqual(100)
      expect(genome.hidden.declineAge).toBeGreaterThan(genome.hidden.peakAge)
    }
  })

  it('un NPC de WorldTour es más fuerte que uno Continental en su atributo primario', () => {
    let wtSum = 0
    let conSum = 0
    const n = 200
    for (let i = 0; i < n; i++) {
      const wt = generateNpcRider(`wt-${i}`, { division: 'WT', vocation: 'escalada', age: 27 })
      const con = generateNpcRider(`con-${i}`, { division: 'CON', vocation: 'escalada', age: 27 })
      wtSum += wt.attributes.MON
      conSum += con.attributes.MON
    }
    expect(wtSum / n).toBeGreaterThan(conSum / n + 10)
  })

  it('un NPC joven tiene margen de techo; un veterano ya está formado', () => {
    const young = generateNpcRider('y', { division: 'WT', vocation: 'escalada', age: 21 })
    const veteran = generateNpcRider('v', { division: 'WT', vocation: 'escalada', age: 33 })
    const youngRoom = ATTRIBUTES.reduce(
      (sum, attr) => sum + (young.hidden.ceilings[attr] - young.attributes[attr]),
      0,
    )
    const veteranRoom = ATTRIBUTES.reduce(
      (sum, attr) => sum + (veteran.hidden.ceilings[attr] - veteran.attributes[attr]),
      0,
    )
    expect(youngRoom).toBeGreaterThan(0)
    expect(veteranRoom).toBe(0)
  })

  it('la táctica arranca por debajo del atributo primario (se aprende corriendo)', () => {
    let tacBelowPrimary = 0
    const n = 200
    for (let i = 0; i < n; i++) {
      const g = generateNpcRider(`tac-${i}`, { division: 'WT', vocation: 'escalada', age: 27 })
      if (g.attributes.TAC < g.attributes.MON) tacBelowPrimary++
    }
    expect(tacBelowPrimary).toBeGreaterThan(n * 0.85)
  })

  it('sampleNpcAge está en [18,38] y sesgada al centro', () => {
    let inCore = 0
    const n = 2000
    for (let i = 0; i < n; i++) {
      const age = sampleNpcAge(`age-${i}`)
      expect(age).toBeGreaterThanOrEqual(18)
      expect(age).toBeLessThanOrEqual(38)
      if (age >= 24 && age <= 30) inCore++
    }
    // El grueso (>50%) de la población está en la franja central 24-30.
    expect(inCore).toBeGreaterThan(n * 0.5)
  })
})
