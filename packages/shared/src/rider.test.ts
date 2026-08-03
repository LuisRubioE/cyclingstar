import { describe, expect, it } from 'vitest'
import { ATTRIBUTES, VOCATION_PROFILES, VOCATIONS, attrStars, stars } from './rider.js'

describe('shared: stars (SPEC 3.2)', () => {
  it('mapea 85.64 a 4.5 estrellas', () => {
    expect(stars(85.64)).toBe(4.5)
  })

  it('respeta el suelo de 0.5 y el techo de 5', () => {
    expect(stars(0)).toBe(0.5)
    expect(stars(3)).toBe(0.5)
    expect(stars(100)).toBe(5)
    expect(stars(99)).toBe(5)
  })

  it('redondea de media en media', () => {
    expect(stars(50)).toBe(2.5)
    expect(stars(44)).toBe(2) // round(4.4)=4 -> 2
    expect(stars(46)).toBe(2.5) // round(4.6)=5 -> 2.5
  })

  it('attrStars: estrellas enteras por bandas (0-16→0 … 84-100→5)', () => {
    expect(attrStars(16)).toBe(0)
    expect(attrStars(17)).toBe(1)
    expect(attrStars(33)).toBe(1)
    expect(attrStars(34)).toBe(2)
    expect(attrStars(50)).toBe(2)
    expect(attrStars(51)).toBe(3)
    expect(attrStars(66)).toBe(3)
    expect(attrStars(67)).toBe(4)
    expect(attrStars(83)).toBe(4)
    expect(attrStars(84)).toBe(5)
    expect(attrStars(94)).toBe(5) // ahora 94 = 5 estrellas, como querías
    expect(attrStars(100)).toBe(5)
  })
})

describe('shared: modelo del ciclista', () => {
  it('tiene 10 atributos y 5 vocaciones', () => {
    expect(ATTRIBUTES).toHaveLength(10)
    expect(VOCATIONS).toHaveLength(5)
  })

  it('cada vocación define 2 primarios y 2 adyacentes', () => {
    for (const vocation of VOCATIONS) {
      const profile = VOCATION_PROFILES[vocation]
      expect(profile.primary).toHaveLength(2)
      expect(profile.adjacent).toHaveLength(2)
    }
  })
})
