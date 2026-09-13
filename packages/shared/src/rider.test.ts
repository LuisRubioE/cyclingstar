import { describe, expect, it } from 'vitest'
import {
  ATTRIBUTES,
  type Attribute,
  RIDER_ARCHETYPES,
  VOCATION_PROFILES,
  VOCATIONS,
  archetypeFromAttributes,
  attrProgress,
  attrStars,
  attrStarsWhole,
  formStarsScale,
  trendArrow,
} from './rider.js'
import { SESSION_CATALOG, SESSIONS } from './training.js'

describe('shared: formStarsScale, la escala de la FORMA (SPEC 3.2)', () => {
  it('mapea 85.64 a 4.5 estrellas', () => {
    expect(formStarsScale(85.64)).toBe(4.5)
  })

  it('respeta el suelo de 0.5 y el techo de 5', () => {
    expect(formStarsScale(0)).toBe(0.5)
    expect(formStarsScale(3)).toBe(0.5)
    expect(formStarsScale(100)).toBe(5)
    expect(formStarsScale(99)).toBe(5)
  })

  it('redondea de media en media', () => {
    expect(formStarsScale(50)).toBe(2.5)
    expect(formStarsScale(44)).toBe(2) // round(4.4)=4 -> 2
    expect(formStarsScale(46)).toBe(2.5) // round(4.6)=5 -> 2.5
  })

  it('attrStarsWhole: estrellas enteras por bandas (0-16→0 … 84-100→5)', () => {
    // Las doce aserciones heredadas viven ahora en `attrStarsWhole`, que es la escala con la que se
    // cuenta el mundo. `attrStars` pasó a tener medias porque es la que ve el jugador.
    expect(attrStarsWhole(16)).toBe(0)
    expect(attrStarsWhole(17)).toBe(1)
    expect(attrStarsWhole(33)).toBe(1)
    expect(attrStarsWhole(34)).toBe(2)
    expect(attrStarsWhole(50)).toBe(2)
    expect(attrStarsWhole(51)).toBe(3)
    expect(attrStarsWhole(66)).toBe(3)
    expect(attrStarsWhole(67)).toBe(4)
    expect(attrStarsWhole(83)).toBe(4)
    expect(attrStarsWhole(84)).toBe(5)
    expect(attrStarsWhole(94)).toBe(5) // ahora 94 = 5 estrellas, como querías
    expect(attrStarsWhole(100)).toBe(5)
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
  it('la escala fina nunca contradice a la gruesa', () => {
    // `attrStars` tiene medias y `attrStarsWhole` no, pero la media cae SIEMPRE dentro de su banda
    // entera. Si esto se rompiera, la ficha del jugador y el recuento del mundo dirían cosas
    // distintas del mismo corredor, que es exactamente lo que separar las dos funciones evita.
    for (let x = 0; x <= 100; x++) expect(Math.floor(attrStars(x))).toBe(attrStarsWhole(x))
    // Y la media estrella existe de verdad: a mitad de banda sube medio punto.
    expect(attrStars(76)).toBe(4.5)
    expect(attrStarsWhole(76)).toBe(4)
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

describe('shared: el catálogo de sesiones cubre todos los atributos (v55)', () => {
  it('cada atributo físico tiene al menos DOS sesiones que lo entrenan', () => {
    // Con un solo camino, una mala racha del entrenador deja un atributo sin tocar todo el año. COL
    // era ese caso hasta que entró `muros`, y MON lo seguía siendo hasta que `umbral` lo tocó.
    //
    // TAC queda FUERA a propósito y no por comodidad: su segundo camino no es una sesión, es
    // CORRER. `raceLearning` reparte TAC en toda carrera, corras donde corras, y el vídeo es el
    // complemento. Meterlo aquí obligaría a inventar una sesión que el diseño no quiere.
    for (const attr of ATTRIBUTES.filter((a) => a !== 'TAC')) {
      const caminos = SESSIONS.filter((s) => (SESSION_CATALOG[s].gains[attr] ?? 0) > 0)
      expect(`${attr}: ${caminos.length} caminos`).toBe(`${attr}: ${caminos.length} caminos`)
      expect(caminos.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('las sesiones de carga variable reparten entre 0,55 y 0,65 puntos', () => {
    // El rango se afirma SOLO de éstas: gimnasio, vídeo y descanso activo quedan fuera por
    // definición, y la versión anterior del diseño los metía en el mismo saco.
    const variables = SESSIONS.filter((s) => SESSION_CATALOG[s].variableIntensity)
    for (const s of variables) {
      const total = Object.values(SESSION_CATALOG[s].gains).reduce((a, b) => a + (b ?? 0), 0)
      expect(`${s}: ${total.toFixed(2)}`).toBe(`${s}: ${total.toFixed(2)}`)
      expect(total).toBeGreaterThanOrEqual(0.55)
      expect(total).toBeLessThanOrEqual(0.65)
    }
  })
})

/**
 * LA FICHA DEL CORREDOR: marca de progreso y flecha de tendencia (docs/entrenamiento.md §2.3).
 *
 * Las dos existen para contestar a la misma queja del dueño —«hice descanso activo y no mejoró»—
 * sin enseñar el número interno, así que lo que hay que probar de ellas es justamente eso: que se
 * MUEVEN cuando el atributo se mueve, y que no dicen más de lo que deben.
 */
describe('shared: la marca de progreso dentro de la banda', () => {
  it('parte de cero al entrar en la banda y llega a tres antes de salir', () => {
    expect(attrProgress(17)).toBe(0) // recién llegado a 1★
    expect(attrProgress(33)).toBe(3) // a punto de ser 2★
    expect(attrProgress(34)).toBe(0) // y vuelta a empezar
  })

  it('reparte la banda en cuatro cuartos y nunca se sale de 0..3', () => {
    for (let x = 0; x <= 100; x += 0.5) {
      const p = attrProgress(x)
      expect(`${x}: ${Number.isInteger(p) && p >= 0 && p <= 3}`).toBe(`${x}: true`)
    }
    // Los cuatro cuartos de la banda de 3★ (51..66): 51-54 · 55-58 · 59-62 · 63-66.
    expect([51, 55, 59, 63].map(attrProgress)).toEqual([0, 1, 2, 3])
  })

  it('las cinco estrellas se pintan llenas: no hay banda por encima', () => {
    expect(attrProgress(84)).toBe(3)
    expect(attrProgress(100)).toBe(3)
  })

  it('LA MARCA NO PUEDE RESOLVER EL NÚMERO, que es su razón de ser', () => {
    // Con estrella + marca hay 4 valores por banda de 16-17 puntos: el jugador nunca puede deducir
    // el atributo a menos de cuatro puntos. Una barra continua lo habría resuelto a menos de uno.
    const porCelda = new Map<string, number>()
    for (let x = 0; x < 84; x += 1) {
      const clave = `${attrStars(x)}|${attrProgress(x)}`
      porCelda.set(clave, (porCelda.get(clave) ?? 0) + 1)
    }
    const minimo = Math.min(...porCelda.values())
    expect(`nunca resuelve a menos de 3 puntos: ${minimo >= 3}`).toBe(
      'nunca resuelve a menos de 3 puntos: true',
    )
  })
})

describe('shared: la flecha de tendencia sobre 28 días', () => {
  it('los cinco niveles, en sus cortes', () => {
    expect(trendArrow(1)).toBe('↑')
    expect(trendArrow(0.99)).toBe('↗')
    expect(trendArrow(0.3)).toBe('↗')
    expect(trendArrow(0.29)).toBe('→')
    expect(trendArrow(0)).toBe('→')
    expect(trendArrow(-0.29)).toBe('→')
    expect(trendArrow(-0.3)).toBe('↘')
    expect(trendArrow(-0.99)).toBe('↘')
    expect(trendArrow(-1)).toBe('↓')
  })

  it('es simétrica: lo que sube con `x` baja con `−x`', () => {
    const opuesta: Record<string, string> = { '↑': '↓', '↗': '↘', '→': '→', '↘': '↗', '↓': '↑' }
    for (const d of [0, 0.1, 0.3, 0.7, 1, 2.5]) {
      expect(`${d}: ${trendArrow(-d)}`).toBe(`${d}: ${opuesta[trendArrow(d)]}`)
    }
  })
})
