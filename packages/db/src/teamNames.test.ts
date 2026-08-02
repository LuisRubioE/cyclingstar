import { describe, expect, it } from 'vitest'
import { generateUniqueName } from './names.js'
import { makeUniqueTeamName } from './teamNames.js'

describe('db: nombres únicos (validación de duplicados)', () => {
  it('makeUniqueTeamName nunca repite dentro de un mismo mundo', () => {
    const used = new Set<string>()
    const names: string[] = []
    for (let i = 0; i < 120; i++) {
      names.push(makeUniqueTeamName(`world:team:${i}`, used))
    }
    expect(new Set(names.map((n) => n.toLowerCase())).size).toBe(names.length)
  })

  it('makeUniqueTeamName es determinista para la misma secuencia de semillas', () => {
    const build = () => {
      const used = new Set<string>()
      return Array.from({ length: 60 }, (_, i) => makeUniqueTeamName(`w:${i}`, used))
    }
    expect(build()).toEqual(build())
  })

  it('generateUniqueName evita colisiones de nombre completo aunque comparta país', () => {
    const used = new Set<string>()
    const names: string[] = []
    for (let i = 0; i < 150; i++) {
      names.push(generateUniqueName(`seed:${i}`, { country: 'fr', gender: 'M' }, used).fullName)
    }
    expect(new Set(names.map((n) => n.toLowerCase())).size).toBe(names.length)
  })
})
