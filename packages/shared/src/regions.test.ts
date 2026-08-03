import { describe, expect, it } from 'vitest'
import { CONTINENTS, continentForCountry } from './regions.js'
import { COUNTRIES } from './countries.js'

describe('shared: modelo de regiones (continentes)', () => {
  it('cada país registrado tiene un continente válido', () => {
    for (const c of COUNTRIES) {
      const cont = continentForCountry(c.code)
      expect(cont, `${c.code} sin continente`).not.toBeNull()
      expect(CONTINENTS).toContain(cont)
    }
  })

  it('asigna continentes conocidos correctamente', () => {
    expect(continentForCountry('FR')).toBe('Europe')
    expect(continentForCountry('JP')).toBe('Asia')
    expect(continentForCountry('KZ')).toBe('Asia') // Kazajistán en Asia
    expect(continentForCountry('TR')).toBe('Europe') // Turquía en Europa
    expect(continentForCountry('ZA')).toBe('Africa')
    expect(continentForCountry('CO')).toBe('America')
    expect(continentForCountry('AU')).toBe('Oceania')
    expect(continentForCountry('GU')).toBe('Oceania') // Guam en Oceanía
  })

  it('es indiferente a mayúsculas y devuelve null para desconocidos', () => {
    expect(continentForCountry('fr')).toBe('Europe')
    expect(continentForCountry('ZZ')).toBeNull()
  })
})
