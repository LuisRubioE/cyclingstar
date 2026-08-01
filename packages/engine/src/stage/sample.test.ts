import { describe, expect, it } from 'vitest'
import { deriveClimbCategory, isWall, sampleProfile, stageLengthKm } from './sample.js'
import { stageRng, stageSeed } from './rng.js'
import type { StageProfile } from './types.js'

describe('sampleProfile', () => {
  it('muestrea un recorrido de tres segmentos bloque a bloque', () => {
    const profile: StageProfile = {
      segments: [
        { km: 1, tipo: 'llano' },
        {
          km: 1,
          tipo: 'puerto',
          tramos: [
            { km: 0.5, g: 6 },
            { km: 0.5, g: 10 },
          ],
        },
        { km: 1, tipo: 'descenso', tramos: [{ km: 1, g: -7 }] },
      ],
      banners: [{ km: 2, tipo: 'cima' }],
    }

    const blocks = sampleProfile(profile, 0.1)

    // 3 km a 0,1 km/bloque = 30 bloques.
    expect(blocks).toHaveLength(30)

    // Bloques 0..9: llano a pendiente 0.
    expect(blocks[0]).toMatchObject({ tipo: 'llano', g: 0, estrellas: 0 })
    expect(blocks[9]).toMatchObject({ tipo: 'llano', g: 0 })

    // Bloques 10..14: primera mitad del puerto (g = 6); 15..19: segunda (g = 10).
    expect(blocks[10]).toMatchObject({ tipo: 'subida', g: 6 })
    expect(blocks[14]).toMatchObject({ tipo: 'subida', g: 6 })
    expect(blocks[15]).toMatchObject({ tipo: 'subida', g: 10 })
    expect(blocks[19]).toMatchObject({ tipo: 'subida', g: 10 })

    // Bloques 20..29: descenso a -7.
    expect(blocks[20]).toMatchObject({ tipo: 'descenso', g: -7 })
    expect(blocks[29]).toMatchObject({ tipo: 'descenso', g: -7 })

    // El banner de la cima cae en el bloque que cruza el km 2 (floor(2 / 0.1) = 20).
    expect(blocks[20]?.banner).toBe('cima')
    expect(blocks.filter((b) => b.banner).length).toBe(1)
  })

  it('rompepiernas rueda como llano pero con g = 1.5 (SPEC 6.4)', () => {
    const profile: StageProfile = { segments: [{ km: 0.5, tipo: 'rompepiernas' }] }
    const blocks = sampleProfile(profile)
    expect(blocks).toHaveLength(5)
    for (const b of blocks) expect(b).toMatchObject({ tipo: 'llano', g: 1.5 })
  })

  it('propaga las estrellas de dureza solo en el pavés (SPEC 6.5)', () => {
    const profile: StageProfile = {
      segments: [
        { km: 0.3, tipo: 'paves', estrellas: 4 },
        { km: 0.2, tipo: 'llano' },
      ],
    }
    const blocks = sampleProfile(profile)
    expect(blocks[0]).toMatchObject({ tipo: 'paves', estrellas: 4 })
    expect(blocks[4]).toMatchObject({ tipo: 'llano', estrellas: 0 })
  })

  it('stageLengthKm suma los segmentos', () => {
    const profile: StageProfile = {
      segments: [
        { km: 1.5, tipo: 'llano' },
        { km: 2.5, tipo: 'puerto' },
      ],
    }
    expect(stageLengthKm(profile)).toBe(4)
  })
})

describe('deriveClimbCategory', () => {
  it('deriva la categoría del score de dureza y solo cuenta g > 2', () => {
    // score = sum(km·g^2) con g > 2.
    expect(deriveClimbCategory([{ km: 1, g: 2 }])).toBeNull() // g no supera 2
    expect(deriveClimbCategory([{ km: 5, g: 3 }])).toBe('cat4') // 5·9 = 45 >= 40
    expect(deriveClimbCategory([{ km: 10, g: 6 }])).toBe('cat2') // 10·36 = 360 >= 300
    expect(deriveClimbCategory([{ km: 15, g: 9 }])).toBe('hc'.toUpperCase()) // 15·81 = 1215 >= 1000
  })
})

describe('isWall', () => {
  it('reconoce un muro corto y empinado (SPEC 6.4)', () => {
    expect(isWall([{ km: 1.5, g: 12 }])).toBe(true)
    expect(isWall([{ km: 4, g: 12 }])).toBe(false) // demasiado largo
    expect(isWall([{ km: 1.5, g: 5 }])).toBe(false) // no lo bastante empinado
  })
})

describe('stageRng', () => {
  it('los subflujos nominales son independientes y reproducibles (SPEC 6.1)', () => {
    const seed = stageSeed({ worldSeed: 'w', raceId: 'r', stageDay: 3, engineVersion: 1 })
    const rngA = stageRng(seed)
    const rngB = stageRng(seed)

    const hazard1 = rngA('hazard')()
    const hazard2 = rngB('hazard')()
    expect(hazard1).toBe(hazard2) // mismo nombre, misma secuencia

    const sprint = rngA('sprint')()
    expect(sprint).not.toBe(hazard1) // distinto nombre, distinto flujo
  })

  it('la semilla cambia con cualquiera de sus partes', () => {
    const base = stageSeed({ worldSeed: 'w', raceId: 'r', stageDay: 3, engineVersion: 1 })
    const otherDay = stageSeed({ worldSeed: 'w', raceId: 'r', stageDay: 4, engineVersion: 1 })
    expect(base).not.toBe(otherDay)
  })
})
