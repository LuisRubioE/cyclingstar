import { describe, expect, it } from 'vitest'
import type { StageProfile } from '../stage/types.js'
import {
  CLIMB_MIN_KM,
  finalKindOf,
  kmAfterLastClimb,
  lastClimbKm,
  profileKm,
} from './finalKind.js'

/**
 * LA GEOMETRÍA DEL FINAL DE UNA REINA (docs/tactica.md §7.5, paso 0).
 *
 * Esta función la citaban tres sitios y no existía en ninguno, así que lo primero que hay que probar
 * es que contesta lo que los tres le preguntan —incluido «esto no es una etapa de montaña», que es
 * una respuesta y no un fallo—.
 */

const perfil = (
  segs: [number, StageProfile['segments'][number]['tipo']][],
  cimas: number[] = [],
): StageProfile => ({
  segments: segs.map(([km, tipo]) => ({ km, tipo })),
  banners: cimas.map((km) => ({ km, tipo: 'cima' as const })),
})

describe('routes: dónde está la última cota', () => {
  it('manda la PANCARTA si la hay: es la cota oficial con su km oficial', () => {
    // Perfil con dos puertos y dos cimas marcadas; la última pancarta es la que cuenta.
    const p = perfil(
      [
        [50, 'llano'],
        [10, 'puerto'],
        [20, 'descenso'],
        [8, 'puerto'],
        [12, 'llano'],
      ],
      [60, 88],
    )
    expect(lastClimbKm(p)).toBe(88)
  })

  it('…y si no hay pancartas, el final del último PUERTO de verdad', () => {
    const p = perfil([
      [50, 'llano'],
      [10, 'puerto'],
      [20, 'descenso'],
      [8, 'puerto'],
      [12, 'llano'],
    ])
    // 50 + 10 + 20 + 8 = 88: el final del segundo puerto.
    expect(lastClimbKm(p)).toBe(88)
  })

  it('una CUESTA no es un puerto: por debajo de la puerta no cuenta', () => {
    const corto = perfil([
      [50, 'llano'],
      [10, 'puerto'],
      [20, 'descenso'],
      [CLIMB_MIN_KM - 0.1, 'puerto'],
      [12, 'llano'],
    ])
    // La última cota sigue siendo el puerto largo del km 60, no el repecho.
    expect(lastClimbKm(corto)).toBe(60)
  })

  it('UNA LLANA NO TIENE ÚLTIMA COTA, y eso es `null` y no cero', () => {
    // Importa: con 0 la etapa saldría clasificada como final «alto», que es exactamente lo
    // contrario de lo que es. La pregunta no aplica y la respuesta lo dice.
    const llana = perfil([
      [100, 'llano'],
      [80, 'llano'],
    ])
    expect(lastClimbKm(llana)).toBeNull()
    expect(kmAfterLastClimb(llana)).toBeNull()
    expect(finalKindOf(llana)).toBeNull()
  })
})

describe('routes: en qué cubeta cae el final', () => {
  const conValle = (valleKm: number): StageProfile =>
    perfil(
      [
        [100, 'llano'],
        [10, 'puerto'],
        [valleKm, 'descenso'],
      ],
      [110],
    )

  it('los cuatro tipos, cada uno en su sitio', () => {
    expect(finalKindOf(conValle(0))).toBe('alto')
    expect(finalKindOf(conValle(3))).toBe('cima_cerca')
    expect(finalKindOf(conValle(12))).toBe('valle_corto')
    expect(finalKindOf(conValle(40))).toBe('valle_largo')
  })

  it('LOS BORDES ESTÁN ESCRITOS, porque medio kilómetro cambia la tabla', () => {
    // `queenFinalKindMix` compara repartos: un corte que se mueve sin que nadie lo decida mueve la
    // comparación entera. Los cortes van con ≤.
    expect(finalKindOf(conValle(0.5))).toBe('alto')
    expect(finalKindOf(conValle(0.6))).toBe('cima_cerca')
    expect(finalKindOf(conValle(5))).toBe('cima_cerca')
    expect(finalKindOf(conValle(5.1))).toBe('valle_corto')
    expect(finalKindOf(conValle(20))).toBe('valle_corto')
    expect(finalKindOf(conValle(20.1))).toBe('valle_largo')
  })

  it('un final en alto de verdad: se cruza la pancarta y se acaba', () => {
    const alto = perfil(
      [
        [140, 'llano'],
        [12, 'puerto'],
      ],
      [152],
    )
    expect(kmAfterLastClimb(alto)).toBe(0)
    expect(finalKindOf(alto)).toBe('alto')
    expect(profileKm(alto)).toBe(152)
  })

  it('nunca devuelve un valle negativo, aunque la pancarta venga pasada de km', () => {
    // Un dato real puede traer la cima al km 153 de una etapa de 152: se recorta a 0 en vez de
    // producir un valle de −1 que rompería cualquier mediana aguas abajo.
    const raro = perfil(
      [
        [140, 'llano'],
        [12, 'puerto'],
      ],
      [153],
    )
    expect(kmAfterLastClimb(raro)).toBe(0)
    expect(finalKindOf(raro)).toBe('alto')
  })
})
