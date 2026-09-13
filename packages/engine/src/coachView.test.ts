import { ATTRIBUTES, type Attribute } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { COACH_NOTE, ceilingOpinion, coachNotes, facilitiesTier, isDeclining } from './coachView.js'
import { seededRng } from '@cyclingstar/shared'

/**
 * LA OPINIÓN DEL ENTRENADOR (docs/entrenamiento.md §2.3, SPEC 5.6).
 *
 * Lo que hay que probar no es que acierte —no debe—, sino las dos propiedades que la hacen útil:
 * que CORRELACIONA con el techo (si no, es ruido puro y no informa de nada) y que NO lo delata
 * (si acertara siempre, sería enseñar el número y se acabó la exploración).
 */

const attrs = (v: number): Record<Attribute, number> =>
  Object.fromEntries(ATTRIBUTES.map((a) => [a, v])) as Record<Attribute, number>

const opiniones = (ceiling: number, age: number, n = 400): Record<string, number> => {
  const cuenta: Record<string, number> = { tres: 0, cuatro: 0, cinco: 0 }
  for (let i = 0; i < n; i++) {
    const o = ceilingOpinion(ceiling, age, seededRng(`op:${ceiling}:${age}:${i}`))
    cuenta[o] = (cuenta[o] ?? 0) + 1
  }
  return cuenta
}

describe('engine: lo que el entrenador cree ver', () => {
  it('el que tiene más techo recibe mejores opiniones, que es para lo que sirve', () => {
    const bajo = opiniones(55, 20)
    const medio = opiniones(75, 20)
    const alto = opiniones(90, 20)
    expect(`crece el 5★: ${bajo.cinco! < medio.cinco! && medio.cinco! < alto.cinco!}`).toBe(
      'crece el 5★: true',
    )
    expect(`el de 55 casi nunca es 5★: ${bajo.cinco! / 400 < 0.02}`).toBe(
      'el de 55 casi nunca es 5★: true',
    )
  })

  it('…PERO NO LO DELATA: en la frontera se equivoca de verdad', () => {
    // Un techo de 84 está exactamente en el corte del 5★. Si la opinión fuera el techo leído, diría
    // «cinco» el 100 % de las veces; con ruido dice «cuatro» aproximadamente la mitad.
    const frontera = opiniones(84, 20)
    const reparto = frontera.cinco! / 400
    expect(`duda en la frontera: ${reparto > 0.3 && reparto < 0.7} (${reparto.toFixed(2)})`).toBe(
      `duda en la frontera: true (${reparto.toFixed(2)})`,
    )
  })

  it('a partir de los 24 se equivoca MENOS, porque ya te ha visto correr', () => {
    // Mismo techo, dos edades: el reparto del veterano tiene que estar más concentrado.
    const joven = opiniones(78, 20)
    const veterano = opiniones(78, 26)
    const disperso = (c: Record<string, number>): number =>
      1 - Math.max(c.tres!, c.cuatro!, c.cinco!) / 400
    expect(`el veterano duda menos: ${disperso(veterano) < disperso(joven)}`).toBe(
      'el veterano duda menos: true',
    )
  })

  it('es DETERMINISTA: la misma semilla da la misma opinión', () => {
    const a = ceilingOpinion(72, 21, seededRng('mundo:rider:ojeador:3'))
    const b = ceilingOpinion(72, 21, seededRng('mundo:rider:ojeador:3'))
    expect(a).toBe(b)
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
