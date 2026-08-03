import { describe, expect, it } from 'vitest'
import { DEFAULT_COUNTRY, isKnownCountry, resolveCountry } from './countries.js'

describe('shared: países y fallback de país', () => {
  it('todos los destinos de fallback son países registrados', () => {
    // resolveCountry nunca debe devolver un código sin registro (salvo null por entrada vacía).
    for (const code of ['PK', 'BD', 'AF', 'VA', 'FJ', 'KP', 'ZZ', 'QQ']) {
      const r = resolveCountry(code)
      expect(r).not.toBeNull()
      expect(isKnownCountry(r as string)).toBe(true)
    }
  })

  it('redirige a la nación jugable más cercana (correcciones del usuario)', () => {
    expect(resolveCountry('BD')).toBe('MY') // Bangladesh → Malasia, no India
    expect(resolveCountry('PK')).toBe('AE') // Pakistán → EAU
    expect(resolveCountry('KP')).toBe('CN') // Corea del Norte → China
    expect(resolveCountry('TM')).toBe('RU') // Turkmenistán → Rusia
    expect(resolveCountry('AO')).toBe('CV') // Angola → Cabo Verde
    expect(resolveCountry('FK')).toBe('GB') // Malvinas → Reino Unido
    expect(resolveCountry('AF')).toBe('IR') // Afganistán (sin campeonato) → Irán
    expect(resolveCountry('NP')).toBe('IN') // Nepal → India (sí)
  })

  it('un país registrado se resuelve a sí mismo; desconocido → por defecto; vacío → null', () => {
    expect(resolveCountry('ES')).toBe('ES')
    expect(resolveCountry('zz')).toBe(DEFAULT_COUNTRY)
    expect(resolveCountry(null)).toBeNull()
    expect(resolveCountry('')).toBeNull()
  })
})
