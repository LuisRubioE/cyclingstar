import { ATTRIBUTE_GROWTH, ATTRIBUTES, type Attribute, VOCATIONS } from '@cyclingstar/shared'
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

  /**
   * SE SIGUE MEJORANDO DESPUÉS DE LOS 24, PERO EN COSAS DISTINTAS (docs/epics.md «G1»).
   *
   * Hasta la v49 el veterano tenía el techo clavado en su atributo y esta prueba lo sellaba
   * (`veteranRoom` igual a 0). Eso significaba que **el 90 % del pelotón no podía mejorar jamás**:
   * `kDim` devuelve 0 en cuanto el atributo alcanza el techo, así que entrenar les rendía CERO.
   *
   * El dueño: «hay que ser menos cartesianos… un ciclista sí mejora después de los 24, pero mejora
   * en cosas diferentes. Tactics debería mejorar siempre; otras como contrarreloj suben muy rápido
   * cuando eres joven, menos rápido según creces». Así que lo que se sella ahora son las tres
   * cosas que hacen que eso sea verdad y no una barra libre.
   */
  it('el joven crece en todo, y el veterano sigue creciendo en el OFICIO', () => {
    const margen = (g: ReturnType<typeof generateNpcRider>, attrs: readonly Attribute[]): number =>
      attrs.reduce((sum, attr) => sum + (g.hidden.ceilings[attr] - g.attributes[attr]), 0)
    const motor = ATTRIBUTES.filter((a) => ATTRIBUTE_GROWTH[a] === 'motor')
    const oficio = ATTRIBUTES.filter((a) => ATTRIBUTE_GROWTH[a] === 'oficio')

    // Media sobre muchos corredores: el techo lleva un dado y uno solo no dice nada.
    const medias = (edad: number): { motor: number; oficio: number } => {
      let m = 0
      let o = 0
      const n = 300
      for (let i = 0; i < n; i++) {
        const g = generateNpcRider(`e${edad}-${i}`, {
          division: 'WT',
          vocation: 'escalada',
          age: edad,
        })
        m += margen(g, motor)
        o += margen(g, oficio)
      }
      return { motor: m / n, oficio: o / n }
    }
    const joven = medias(21)
    const plenitud = medias(26)
    const veterano = medias(33)

    // 1) De joven se crece en todo, y es cuando más.
    expect(`joven crece de motor: ${joven.motor > 40}`).toBe('joven crece de motor: true')
    // 2) El motor se va cerrando con la edad y al veterano ya no le queda casi nada.
    expect(`el motor se cierra: ${plenitud.motor < joven.motor / 3}`).toBe(
      'el motor se cierra: true',
    )
    expect(`al veterano no le queda motor: ${veterano.motor < 8}`).toBe(
      'al veterano no le queda motor: true',
    )
    // 3) …pero el OFICIO sigue abierto a los 33, que es la mitad que faltaba.
    expect(`el veterano aprende oficio: ${veterano.oficio > 15}`).toBe(
      'el veterano aprende oficio: true',
    )
    // Y a esa edad ya se aprende más oficio que motor: es en lo único que puede mejorar.
    expect(`y más oficio que motor: ${veterano.oficio > veterano.motor}`).toBe(
      'y más oficio que motor: true',
    )
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
