import {
  ATTRIBUTES,
  type Attribute,
  CEILING_OPINIONS,
  type CeilingOpinion,
  VOCATIONS,
  VOCATION_PROFILES,
} from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import {
  COACH_NOTE,
  OPINION_AGE_SABE,
  ceilingOpinions,
  coachNotes,
  coachReading,
  facilitiesTier,
  isDeclining,
  opinionSd,
} from './coachView.js'
import { generateRiderGenome } from './creation.js'

/**
 * LA OPINIÓN DEL ENTRENADOR (docs/agenda.md §4.20, docs/entrenamiento.md §2.3, SPEC 5.6).
 *
 * Lo que hay que probar no es que acierte —no siempre debe—, sino las propiedades que la hacen útil
 * y honrada: que NO dice un nivel (es relativa y no habla en estrellas), que se AFINA con los años,
 * que puede EQUIVOCARSE al principio y que lo que transmite es el orden de los atributos del propio
 * corredor.
 */

const attrs = (v: number): Record<Attribute, number> =>
  Object.fromEntries(ATTRIBUTES.map((a) => [a, v])) as Record<Attribute, number>

/** Un corredor de verdad, de los que crea el jugador. */
const genoma = (i: number) =>
  generateRiderGenome(`opinion-${i}`, VOCATIONS[i % VOCATIONS.length] ?? 'velocidad')

const mejorDe = (c: Record<Attribute, number>): Attribute =>
  ATTRIBUTES.reduce((a, b) => (c[b] > c[a] ? b : a))

/** Los códigos que señalan el MEJOR sitio del corredor en cada lectura. */
const ARRIBA: CeilingOpinion[] = ['asoma', 'lo_tuyo']

const LECTURAS: Record<'primera' | 'formandose' | 'clara', CeilingOpinion[]> = {
  primera: ['asoma', 'pronto'],
  formandose: ['apunta', 'quiza', 'no_parece'],
  clara: ['lo_tuyo', 'fuerte', 'normal', 'flojo'],
}

describe('engine: lo que el entrenador cree ver', () => {
  it('NO HABLA EN ESTRELLAS NI EN NÚMEROS: ningún código nombra un nivel', () => {
    // Los códigos viajan por la API tal cual, así que son lo que se lee en la pestaña de red.
    for (const code of CEILING_OPINIONS) {
      expect(code).not.toMatch(/\d|tres|cuatro|cinco|estrella|star|★/i)
    }
    // …y el motor solo devuelve códigos del contrato.
    for (let i = 0; i < 50; i++) {
      for (const age of [18, 19, 21, 24, 30]) {
        const o = ceilingOpinions(genoma(i).hidden.ceilings, age, `r${i}`)
        for (const a of ATTRIBUTES) expect(CEILING_OPINIONS).toContain(o[a])
      }
    }
  })

  it('ES RELATIVA: subir todos los techos a la vez no cambia ni una opinión', () => {
    // La prueba de que no dice un nivel: el mismo corredor con diez, veinte o treinta puntos más de
    // techo en TODO recibe exactamente lo mismo. Comparar dos cuentas no saca nada.
    for (let i = 0; i < 40; i++) {
      const c = genoma(i).hidden.ceilings
      for (const age of [19, 21, 25]) {
        const base = ceilingOpinions(c, age, `rel${i}`)
        for (const d of [-15, 12, 30]) {
          const subido = Object.fromEntries(ATTRIBUTES.map((a) => [a, c[a] + d])) as Record<
            Attribute,
            number
          >
          expect(ceilingOpinions(subido, age, `rel${i}`)).toEqual(base)
        }
      }
    }
  })

  it('lo que transmite es el ORDEN de los propios atributos', () => {
    // Un corredor maduro con el techo en escalera: el entrenador lo lee de arriba abajo.
    const escalera = Object.fromEntries(ATTRIBUTES.map((a, i) => [a, 95 - 6 * i])) as Record<
      Attribute,
      number
    >
    const o = ceilingOpinions(escalera, 30, 'escalera')
    expect(ATTRIBUTES.map((a) => o[a])).toEqual([
      'lo_tuyo',
      'fuerte',
      'fuerte',
      'normal',
      'normal',
      'normal',
      'normal',
      'flojo',
      'flojo',
      'flojo',
    ])
    // Y todo corredor tiene exactamente UN mejor sitio, sea un fenómeno o un gregario.
    for (let i = 0; i < 40; i++) {
      for (const age of [19, 25]) {
        const op = ceilingOpinions(genoma(i).hidden.ceilings, age, `uno${i}`)
        expect(ATTRIBUTES.filter((a) => ARRIBA.includes(op[a])).length).toBe(1)
      }
    }
  })

  it('AL PRINCIPIO ES VAGO: una sola pista y «es pronto» para todo lo demás', () => {
    for (let i = 0; i < 40; i++) {
      const c = genoma(i).hidden.ceilings
      for (const age of [18, 19]) {
        const o = ceilingOpinions(c, age, `pronto${i}`)
        const usadas = new Set(ATTRIBUTES.map((a) => o[a]))
        expect([...usadas].every((x) => LECTURAS.primera.includes(x))).toBe(true)
        expect(ATTRIBUTES.filter((a) => o[a] === 'pronto').length).toBe(ATTRIBUTES.length - 1)
      }
      // A medio camino dice arriba, medio y abajo; a partir de los 23 habla claro.
      const medio = ceilingOpinions(c, 21, `pronto${i}`)
      expect(ATTRIBUTES.every((a) => LECTURAS.formandose.includes(medio[a]))).toBe(true)
      const claro = ceilingOpinions(c, 26, `pronto${i}`)
      expect(ATTRIBUTES.every((a) => LECTURAS.clara.includes(claro[a]))).toBe(true)
    }
    expect(coachReading(19)).toBe('primera')
    expect(coachReading(20)).toBe('formandose')
    expect(coachReading(23)).toBe('clara')
  })

  it('SE AFINA CON LOS AÑOS: acierta tu mejor sitio más a menudo cuanto más te conoce', () => {
    const acierto = (age: number): number => {
      let ok = 0
      const n = 400
      for (let i = 0; i < n; i++) {
        const c = genoma(i).hidden.ceilings
        const o = ceilingOpinions(c, age, `afina${i}`)
        if (ARRIBA.includes(o[mejorDe(c)])) ok++
      }
      return ok / n
    }
    const temprano = acierto(19)
    const tarde = acierto(OPINION_AGE_SABE)
    // Medido: ~0,72 a los 19 y ~0,98 a los 27.
    expect(`afina: ${temprano < tarde} (${temprano.toFixed(2)} → ${tarde.toFixed(2)})`).toBe(
      `afina: true (${temprano.toFixed(2)} → ${tarde.toFixed(2)})`,
    )
    // PUEDE EQUIVOCARSE de verdad al principio: si acertara siempre, la primera lectura valdría para
    // repescar cuentas hasta que saliera un fenómeno…
    expect(`se equivoca al principio: ${temprano < 0.85}`).toBe('se equivoca al principio: true')
    // …pero no es ruido puro: si no informara de nada, no serviría para decidir qué entrenar.
    expect(`informa al principio: ${temprano > 0.5}`).toBe('informa al principio: true')
    expect(`casi lo sabe al final: ${tarde > 0.9}`).toBe('casi lo sabe al final: true')
    // El error encoge con la edad y no llega a cero nunca.
    expect(opinionSd(18)).toBeGreaterThan(opinionSd(23))
    expect(opinionSd(23)).toBeGreaterThan(opinionSd(OPINION_AGE_SABE))
    expect(opinionSd(40)).toBeGreaterThan(0)
  })

  it('el chaval recién creado oye hablar de SU especialidad casi siempre', () => {
    // El caso del dueño: un velocista nuevo al que el entrenador solo veía potencial en la táctica.
    // Con el don en la especialidad elegida, la pista de la primera lectura cae en un primario la
    // gran mayoría de las veces, sin dejar de poder equivocarse.
    let enSuEspecialidad = 0
    const n = 400
    for (let i = 0; i < n; i++) {
      const vocation = VOCATIONS[i % VOCATIONS.length] ?? 'velocidad'
      const g = generateRiderGenome(`especialidad-${i}`, vocation)
      const o = ceilingOpinions(g.hidden.ceilings, 19, `esp${i}`)
      const pista = ATTRIBUTES.find((a) => o[a] === 'asoma')!
      if (VOCATION_PROFILES[vocation].primary.includes(pista)) enSuEspecialidad++
    }
    const p = enSuEspecialidad / n
    expect(`en su especialidad: ${p > 0.6} (${p.toFixed(2)})`).toBe(
      `en su especialidad: true (${p.toFixed(2)})`,
    )
  })

  it('es DETERMINISTA y estable: misma semilla y edad, misma opinión', () => {
    const c = genoma(3).hidden.ceilings
    expect(ceilingOpinions(c, 21, 'mundo:rider:ojeador')).toEqual(
      ceilingOpinions(c, 21, 'mundo:rider:ojeador'),
    )
    // Con los diez techos iguales también hay un solo «lo tuyo»: lo decide el error sembrado del
    // entrenador, no el capricho del sort, y por eso sale igual en todas las ejecuciones.
    const plano = ceilingOpinions(attrs(70), 30, 'plano')
    expect(Object.values(plano).filter((x) => x === 'lo_tuyo').length).toBe(1)
  })
})

describe('engine: las frases por regla', () => {
  const base = {
    age: 27,
    declineAge: 33,
    talent: 50,
    fragility: 1,
    rec: 50,
    carta: 'MON' as Attribute,
    attributes: attrs(60),
    ceilings: attrs(90),
  }

  it('un corredor del montón no recibe ninguna, y eso está bien', () => {
    // Si todo el mundo recibiera frases, las frases no dirían nada de nadie.
    expect(coachNotes(base)).toEqual([])
  })

  it('cada oculto enciende la suya y solo la suya', () => {
    expect(coachNotes({ ...base, talent: 70, age: 21 })).toEqual(['progresa_rapido'])
    expect(coachNotes({ ...base, rec: 75 })).toEqual(['recupera_rapido'])
    expect(coachNotes({ ...base, fragility: 1.5 })).toEqual(['fragil'])
    expect(coachNotes({ ...base, age: 34 })).toEqual(['declive'])
  })

  it('el talento solo se le cuenta al JOVEN: al de treinta ya no es noticia', () => {
    expect(coachNotes({ ...base, talent: 70, age: 30 })).toEqual([])
  })

  it('«estás cerca de tu techo» mira la CARTA, no el montón', () => {
    // Clavado en el techo de montaña pero con margen de sobra en todo lo demás: si la regla mirara
    // la media no diría nada, y el escalador se pasaría el año entrenando lo que ya no sube.
    const casi = coachNotes({
      ...base,
      attributes: { ...attrs(40), MON: 89.5 },
      ceilings: attrs(90),
    })
    expect(casi).toEqual(['techo_cerca'])
    // Y el mismo corredor, si su carta fuera el esprint, no la recibe.
    expect(
      coachNotes({
        ...base,
        carta: 'SPR',
        attributes: { ...attrs(40), MON: 89.5 },
        ceilings: attrs(90),
      }),
    ).toEqual([])
  })

  it('se pueden encender varias a la vez, en su orden', () => {
    const viejo = coachNotes({ ...base, age: 35, rec: 80, fragility: 1.6 })
    expect(viejo).toEqual(['recupera_rapido', 'fragil', 'declive'])
  })

  it('el umbral de margen es el de `kDim`, no un número suelto', () => {
    expect(COACH_NOTE.margenAgotado).toBeLessThan(1)
    expect(isDeclining(33, 33)).toBe(true)
    expect(isDeclining(32, 33)).toBe(false)
  })
})

describe('engine: el gimnasio del equipo, en tres palabras', () => {
  it('los extremos del rango son «bajo» y «alto», y el centro «normal»', () => {
    expect(facilitiesTier(0.9)).toBe('bajo')
    expect(facilitiesTier(1.05)).toBe('normal')
    expect(facilitiesTier(1.2)).toBe('alto')
  })

  it('un equipo sin instalaciones declaradas (×1) sale «normal», no «bajo»', () => {
    // Importa: `kInst = 1` es el valor por defecto de la columna, y marcar de «bajo» a todo equipo
    // que aún no tenga fila sería mentirle al jugador sobre su equipo.
    expect(facilitiesTier(1)).toBe('normal')
  })
})
