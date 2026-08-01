import { describe, expect, it } from 'vitest'
import { generateName, isBlockedName, regenerateName } from './names.js'

describe('names: servicio de nombres (SPEC 3.6)', () => {
  it('genera 1000 nombres españoles sin colisión con la lista de bloqueo', () => {
    for (let i = 0; i < 1000; i++) {
      const gender = i % 2 === 0 ? 'M' : 'F'
      const name = generateName(`rider-${i}`, { country: 'ES', gender })
      expect(name.fullName.length).toBeGreaterThan(0)
      expect(isBlockedName(name.fullName)).toBe(false)
    }
  })

  it('es determinista para la misma semilla', () => {
    const a = generateName('same-seed', { country: 'ES', gender: 'M' })
    const b = generateName('same-seed', { country: 'ES', gender: 'M' })
    expect(a).toEqual(b)
  })

  it('regenerar produce un nombre distinto al original en la mayoría de los casos', () => {
    const base = generateName('rider-x', { country: 'FR', gender: 'F' })
    const variants = new Set<string>()
    for (let i = 1; i <= 10; i++) {
      variants.add(regenerateName('rider-x', { country: 'FR', gender: 'F' }, i).fullName)
    }
    // Al menos una regeneración difiere del original.
    expect([...variants].some((name) => name !== base.fullName)).toBe(true)
  })
})
