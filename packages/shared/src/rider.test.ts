import { describe, expect, it } from 'vitest'
import {
  ATTRIBUTES,
  type Attribute,
  RIDER_ARCHETYPES,
  VOCATION_PROFILES,
  VOCATIONS,
  archetypeFromAttributes,
  attrStars,
  attrStarsWhole,
  stars,
} from './rider.js'

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

/** Un corredor plano al valor que se le diga, para luego levantarle solo lo que interese. */
const plano = (v: number, sobre: Partial<Record<Attribute, number>> = {}) =>
  Object.fromEntries(ATTRIBUTES.map((a) => [a, sobre[a] ?? v])) as Record<Attribute, number>

describe('shared: arquetipo derivado de los atributos', () => {
  it('`attrStarsWhole` es exactamente `attrStars`, valor a valor', () => {
    for (let x = 0; x <= 100; x++) expect(attrStarsWhole(x)).toBe(attrStars(x))
  })

  it('son ocho y ninguno se repite', () => {
    expect(RIDER_ARCHETYPES).toHaveLength(8)
    expect(new Set(RIDER_ARCHETYPES).size).toBe(8)
  })

  it('cada carta lleva a su especialidad', () => {
    const casos: [Attribute, string][] = [
      ['SPR', 'velocidad'],
      ['MON', 'escalada'],
      ['COL', 'puncheur'],
      ['PAV', 'clasicas'],
      ['CRI', 'crono'],
      ['LLA', 'rodador'],
    ]
    for (const [attr, arquetipo] of casos) {
      expect(archetypeFromAttributes(plano(60, { [attr]: 85 }))).toBe(arquetipo)
    }
  })

  it('el que no despunta en nada es fondo, y si además va flojo es gregario', () => {
    // Nadie se separa de su propia media: no hay especialidad.
    expect(archetypeFromAttributes(plano(70))).toBe('fondo')
    expect(archetypeFromAttributes(plano(55))).toBe('gregario')
    // El corte es la cuarta estrella de la carta, no la media del corredor.
    expect(archetypeFromAttributes(plano(66))).toBe('gregario')
    expect(archetypeFromAttributes(plano(67))).toBe('fondo')
  })

  it('no basta con ser el más alto: hay que separarse de la propia media', () => {
    // +7 sobre el resto NO es especialidad; +12 sí. Es lo que evita que un corredor plano quede
    // clasificado por un punto de ruido y el reparto del banco mida el sorteo y no la población.
    expect(archetypeFromAttributes(plano(70, { SPR: 77 }))).toBe('fondo')
    expect(archetypeFromAttributes(plano(70, { SPR: 82 }))).toBe('velocidad')
  })

  it('TAC no decide arquetipo: un veterano listo no es un especialista', () => {
    const conOficio = plano(70, { TAC: 95 })
    expect(archetypeFromAttributes(conOficio)).toBe('fondo')
  })
})
