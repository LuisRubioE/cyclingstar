/**
 * LO QUE ESTE BANCO VIGILA, Y LO QUE NO (v44).
 *
 * LA BANDA ES UNA VIGILANCIA, NO UN OBJETIVO DE CARRETERA, y por decisión explícita del dueño: se le
 * enseñó el número medido —la fuga gana el 18,1 % de las etapas de montaña del calendario— y dijo
 * «está bien así». Lo que se vigila, entonces, es que no se hunda ni se desmadre; el ancho sale de la
 * muestra y está razonado en `targets.ts`.
 *
 * Y fija además las dos cosas que hacen que el banco SIRVA, y que son las que fallaron cuando no
 * existía: que la muestra representa al calendario, y que el resultado se lee por desnivel.
 */
import { describe, expect, it } from 'vitest'
import { TARGETS } from './targets.js'
import {
  BANDAS_DESNIVEL,
  allCalendarQueens,
  analyzeCalendarQueens,
  calendarQueenSample,
  estratos,
} from './calendarQueens.js'

/** El mismo ayudante que usa `invariants.test.ts`: un estadístico contra su rango objetivo. */
function expectInRange(value: number, target: { min: number; max: number }): void {
  expect(value).toBeGreaterThanOrEqual(target.min)
  expect(value).toBeLessThanOrEqual(target.max)
}

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

  // Paso 9 de E1 (§13.4 punto 1 y §13.8): estratificada por finalKind × banda, ~30 etapas.
  it('la muestra estratificada cubre los estratos poblados y conserva los extremos', () => {
    const todas = allCalendarQueens()
    const muestra = calendarQueenSample(todas)
    expect(muestra.length).toBeGreaterThanOrEqual(25)
    expect(muestra.length).toBeLessThanOrEqual(34)
    expect(muestra[0]!.dPlus).toBeLessThanOrEqual(todas[5]!.dPlus)
    expect(muestra.at(-1)!.dPlus).toBeGreaterThanOrEqual(todas.at(-6)!.dPlus)
    for (const e of estratos(todas))
      if (e.n > 0)
        expect(
          muestra.some((q) => e.contiene(q)),
          `${e.finalKind} × ${e.banda}`,
        ).toBe(true)
  })

  it('la cubeta [1.500; 2.500) la sostiene el diseño, no el test (decisión 8)', () => {
    const muestra = calendarQueenSample()
    const blandas = muestra.filter((q) => q.dPlus >= 1500 && q.dPlus < 2500)
    expect(blandas.length, 'cubeta [1.500; 2.500) despoblada').toBeGreaterThanOrEqual(3)
    expect(blandas.some((q) => q.skeleton === 'et_reina_blanda')).toBe(true)
    // Re-sellado desde < 1500 (§13.4 punto 4 b): la reina blanda empieza en 1.500.
    expect(Math.min(...muestra.map((q) => q.dPlus))).toBeLessThan(1700)
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
   * cuatro— y la máquina libre da **126 s** para 27 etapas por 4 semillas; cargada da 370. Desde el
   * paso 9 la muestra es estratificada y ronda las 30 etapas (§13.4): 140 s libre y 411 cargada; con el
   * factor de instrumentación del nocturno (2,26) son 929 s, y la regla de `sim/invariants.test.ts`
   * pide cuatro veces eso: 3.716. Reloj, 4.000.000 ms (§13.4 punto 5; era 3.600.000).
   *
   * Y CUATRO SEMILLAS Y NO OCHO porque lo que se afirma es una diferencia ENORME —más de cuarenta
   * puntos entre las dos bandas—, no un porcentaje fino. El número fino se saca a mano con más
   * semillas cuando hace falta; el banco de CI solo tiene que cazar que el HECHO desaparezca.
   */
  it(
    'el desnivel decide: la fuga llega en la montaña blanda y no en la dura',
    { timeout: 4_000_000 },
    () => {
      const stats = analyzeCalendarQueens(4)
      // Paso 9 (§13.4 punto 4 a, D6 por defecto): `facil` es la banda más baja con ≥ 3 etapas en la
      // muestra y `dura` la `>3500` si tiene ≥ 3 (si no, `2500-3500`). Con el calendario de la v87:
      // `<1500` (casi todas reales) contra `>3500`.
      const poblada = (nombre: string): boolean =>
        (stats.porBanda.find((b) => b.nombre === nombre)?.stages ?? 0) >= 3
      const facilNombre = BANDAS_DESNIVEL.map((b) => b.nombre).find(poblada) ?? '<1500'
      const duraNombre = poblada('>3500') ? '>3500' : '2500-3500'
      const facil = stats.porBanda.find((b) => b.nombre === facilNombre)!
      const dura = stats.porBanda.find((b) => b.nombre === duraNombre)!
      const cubetas = `fácil ${facilNombre}, dura ${duraNombre}`
      expect(facil.races, cubetas).toBeGreaterThan(0)
      expect(dura.races, cubetas).toBeGreaterThan(0)
      expect(facil.wonFromMovePct, cubetas).toBeGreaterThan(dura.wonFromMovePct + 10)
      // Y el calendario trae de las dos: un banco de montaña que solo tuviera una no diría nada.
      // Re-sellado en el paso 9 (§13.4 punto 4 b): < 1700 desde < 1500, la reina blanda empieza en 1.500.
      expect(stats.dPlus.min).toBeLessThan(1700)
      expect(stats.dPlus.max).toBeGreaterThan(2500)
      // Y el conjunto contra su banda de vigilancia (D6: se mantiene [6; 30]). Se comprueba aquí y no
      // en una prueba aparte para no pagar dos veces la campaña, que es lo caro de este banco.
      console.info(
        `[calendarQueens] ${stats.stages} etapas × ${stats.runsPerStage}: fuga ${stats.wonFromMovePct.toFixed(1)} %; ` +
          [...stats.porBanda, ...stats.porFinalKind, ...stats.porEstrato]
            .map((b) => `${b.nombre} ${b.stages}/${b.wonFromMovePct.toFixed(1)}`)
            .join(' · '),
      )
      expectInRange(stats.wonFromMovePct, TARGETS.calendarQueens.breakawayWinPct)
    },
  )
})
