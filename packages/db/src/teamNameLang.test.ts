import { COUNTRIES } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { langForCountry, makeLangTeamName, teamNameCandidate } from './teamNameLang.js'

describe('db: nombres de equipo por idioma (SPEC 7)', () => {
  it('es determinista para la misma semilla y país', () => {
    expect(teamNameCandidate('t1', 'IT')).toBe(teamNameCandidate('t1', 'IT'))
    expect(teamNameCandidate('t1', 'FR')).not.toBe(teamNameCandidate('t2', 'FR'))
  })

  it('usa el idioma del país (palabra de ciclismo propia del idioma)', () => {
    // 200 semillas por país: alguna cae en la palabra nativa característica.
    const sampleSecondWords = (country: string) =>
      new Set(
        Array.from({ length: 200 }, (_, i) => teamNameCandidate(`s${i}`, country).split(' ').pop()),
      )
    expect(sampleSecondWords('IT')).toContain('Squadra')
    expect(sampleSecondWords('FR')).toContain('Équipe')
    expect(sampleSecondWords('ES')).toContain('Ciclismo')
    expect(sampleSecondWords('DE')).toContain('Radsport')
    expect(sampleSecondWords('NL')).toContain('Wielrennen')
  })

  it('genera nombres únicos aunque haya muchos equipos del mismo país (China x15)', () => {
    const used = new Set<string>()
    const names = Array.from({ length: 15 }, (_, i) => makeLangTeamName(`cn:${i}`, 'CN', used))
    expect(new Set(names.map((n) => n.toLowerCase())).size).toBe(15)
  })

  it('respeta los nombres ya usados (no colisiona con equipos humanos)', () => {
    const used = new Set<string>()
    const taken = teamNameCandidate('x', 'FR')
    used.add(taken.toLowerCase())
    const name = makeLangTeamName('x', 'FR', used)
    expect(name.toLowerCase()).not.toBe(taken.toLowerCase())
  })

  it('cada país registrado tiene un idioma con pack (o cae a inglés) y produce nombre', () => {
    for (const c of COUNTRIES) {
      const lang = langForCountry(c.code)
      expect(typeof lang).toBe('string')
      const name = teamNameCandidate('seed', c.code)
      expect(name.length).toBeGreaterThan(0)
      expect(name).toContain(' ')
    }
  })
})
