import { describe, expect, it } from 'vitest'
import { pullIdentity, pullReason } from './simulate.js'

/**
 * EL INDICADOR DEL PARTE DE RELEVOS (v79) — el defecto que tenía bloqueadas las cinco capas.
 *
 * La puerta que decide si la crónica cuenta quién tira hace DOS preguntas, y la rotación de relevos
 * rompía las dos **en sentidos opuestos**:
 *
 *  - «¿hay trabajo?» miraba a UN hombre (`pull.best`), y con una rotación de verdad la respuesta es
 *    «nadie»: cada uno da la cara seiscientos metros y se va al final de la fila;
 *  - «¿esto es noticia?» miraba una IDENTIDAD que caía en un nombre que rota.
 *
 * Por eso las seis propuestas anteriores fallaban: subir el listón compensaba el sobre-disparo de la
 * segunda mitad apretando la primera, y eso mataba el banco donde la segunda mitad no estaba rota.
 *
 * Aquí se sella la segunda. La primera vive en `pullMinTotalWork` y en el barrido de las cuatro
 * celdas.
 */
describe('la identidad de un parte de relevos', () => {
  const equipo = (n: number) => `casa-${n}`

  /**
   * LA PRUEBA QUE DESCRIBE EL DEFECTO. Los mismos tres hombres rotando dan tres listas distintas de
   * nombres —eso es lo que una rotación ES— y el parte no tiene por qué contarse tres veces.
   */
  it('con los mismos equipos tirando, rotar los hombres NO cambia la identidad', () => {
    const casas = [equipo(1), equipo(2)]
    const why = { kind: 'alianza' as const }
    const a = pullIdentity(why, casas, 'firme', true)
    const b = pullIdentity(why, [...casas].reverse(), 'firme', true)
    expect(a).toBe(b)
  })

  it('…y cambiar de equipo SÍ la cambia, que es lo que el lector lee', () => {
    const why = { kind: 'alianza' as const }
    expect(pullIdentity(why, [equipo(1), equipo(2)], 'firme', true)).not.toBe(
      pullIdentity(why, [equipo(1), equipo(3)], 'firme', true),
    )
  })

  /**
   * SIN EQUIPOS NO QUEDA NINGÚN NOMBRE, y ésa es la mitad que faltaba: el banco de atribución corre
   * agentes libres, así que allí la identidad tiene que salir de lo que se hace, no de quién lo hace.
   */
  it('sin equipos, la identidad NO depende de ningún corredor', () => {
    const why = { kind: 'libre' as const }
    expect(pullIdentity(why, ['', '', ''], 'firme', true)).toBe(
      pullIdentity(why, ['', ''], 'firme', true),
    )
  })

  it('…pero sigue distinguiendo el trabajo, el esfuerzo y si hay algo delante', () => {
    const why = { kind: 'libre' as const }
    const base = pullIdentity(why, [], 'firme', true)
    expect(pullIdentity(why, [], 'tope', true)).not.toBe(base)
    expect(pullIdentity(why, [], 'firme', false)).not.toBe(base)
    expect(pullIdentity({ kind: 'tren' }, [], 'firme', true)).not.toBe(base)
  })

  /** Con un jefe único al que servir manda él, que es la respuesta más específica que hay. */
  it('con un jefe único manda el jefe, y los equipos no le enmiendan', () => {
    const why = { kind: 'gregarios' as const, targetId: 'jefe-1' }
    expect(pullIdentity(why, [equipo(1)], 'firme', true)).toBe(
      pullIdentity(why, [equipo(9)], 'firme', true),
    )
    expect(pullIdentity(why, [equipo(1)], 'firme', true)).not.toBe(
      pullIdentity({ ...why, targetId: 'jefe-2' }, [equipo(1)], 'firme', true),
    )
  })

  /**
   * Y EL CONTROL DEL CONTROL: que `pullReason` deja `targetId` indefinido en LOS DOS casos que
   * activaban el respaldo del nombre. Si algún día dejara de hacerlo, esta regla dejaría de tener
   * sentido y nadie se enteraría.
   */
  it('`pullReason` deja sin jefe tanto al campo libre como a la alianza', () => {
    const vacio = new Map<string, { targetId: string; role: 'gregario' | 'lanzador' }>()
    expect(pullReason(['a', 'b'], vacio).targetId).toBeUndefined()
    const alianza = new Map<string, { targetId: string; role: 'gregario' | 'lanzador' }>([
      ['a', { targetId: 'jefe-1', role: 'gregario' }],
      ['b', { targetId: 'jefe-2', role: 'gregario' }],
    ])
    const why = pullReason(['a', 'b'], alianza)
    expect(why.kind).toBe('alianza')
    expect(why.targetId).toBeUndefined()
  })
})
