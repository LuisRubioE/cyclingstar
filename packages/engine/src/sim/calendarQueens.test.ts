/**
 * LO QUE ESTE BANCO VIGILA, Y LO QUE NO (v44).
 *
 * NO lleva una banda para «gana la fuga». La tendría que traer de la carretera —cuántas etapas de
 * montaña se lleva la fuga en una temporada real— y ese número no lo tengo, así que ponerlo a ojo
 * sería exactamente el vicio que docs/balance.md lleva cinco versiones corrigiendo. Queda como
 * medida documentada (18,1 % cuando se escribió esto) y la banda entra cuando haya con qué.
 *
 * Lo que sí fija son las dos cosas que hacen que el banco SIRVA, y que son las que fallaron cuando
 * no existía: que la muestra representa al calendario, y que el resultado se lee por desnivel.
 */
import { describe, expect, it } from 'vitest'
import { allCalendarQueens, analyzeCalendarQueens, calendarQueenSample } from './calendarQueens.js'

describe('la montaña que de verdad se corre (v44)', () => {
  it('la muestra es sistemática y conserva la forma de la distribución', () => {
    const todas = allCalendarQueens()
    const muestra = calendarQueenSample()
    expect(todas.length).toBeGreaterThan(100)
    expect(muestra.length).toBeGreaterThan(15)
    // Cubre los dos extremos: la más fácil y la más dura del calendario entran en la rejilla o
    // están a un paso de ella. Sin esto la muestra podría quedarse en el medio y mentir.
    expect(muestra[0]!.dPlus).toBeLessThanOrEqual(todas[5]!.dPlus)
    expect(muestra.at(-1)!.dPlus).toBeGreaterThanOrEqual(todas.at(-6)!.dPlus)
  })

  /**
   * EL HECHO QUE HAY QUE NO PERDER: la dureza de la etapa decide si la fuga llega, y con una
   * pendiente enorme. Medido al escribir esto: 43,8 % por debajo de 1.500 m contra 1,6 % por encima
   * de 2.500. Si algún día esto se aplana, el motor habrá dejado de distinguir una etapa de montaña
   * de otra, y eso es una noticia aunque el porcentaje total siga igual.
   */
  /*
   * EL RELOJ, con la aritmética HECHA y no estimada, que es justo lo que rompió el nocturno de la
   * v43. Medido: el coste escala lineal con las semillas —32,5 s con una, 60,6 con dos, 125,9 con
   * cuatro— y la máquina libre da **126 s** para estas 27 etapas por 4 semillas. Cargada da 370, y
   * ése es el caso que hay que presupuestar porque un runner de CI va cargado. Con el factor de
   * instrumentación medido en el propio nocturno (2,26 sobre el local: 5.597 s de pruebas contra
   * 2.477 s en local) el caso malo son ~840 s en CI, y la regla de `sim/invariants.test.ts` pide
   * cuatro veces eso: 3.600.
   *
   * Y CUATRO SEMILLAS Y NO OCHO porque lo que se afirma es una diferencia ENORME —más de cuarenta
   * puntos entre las dos bandas—, no un porcentaje fino. El número fino se saca a mano con más
   * semillas cuando hace falta; el banco de CI solo tiene que cazar que el HECHO desaparezca.
   */
  it(
    'el desnivel decide: la fuga llega en la montaña blanda y no en la dura',
    { timeout: 3600000 },
    () => {
      const stats = analyzeCalendarQueens(4)
      const facil = stats.porBanda.find((b) => b.nombre === '<1500')!
      const dura = stats.porBanda.find((b) => b.nombre === '2500-3500')!
      expect(facil.races).toBeGreaterThan(0)
      expect(dura.races).toBeGreaterThan(0)
      expect(facil.wonFromMovePct).toBeGreaterThan(dura.wonFromMovePct + 10)
      // Y el calendario trae de las dos: un banco de montaña que solo tuviera una no diría nada.
      expect(stats.dPlus.min).toBeLessThan(1500)
      expect(stats.dPlus.max).toBeGreaterThan(2500)
    },
  )
})
