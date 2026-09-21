/**
 * Invariantes de las TRES SEMANAS (SPEC 6.17): los abandonos de una gran vuelta y la cola de las
 * etapas reina reales. Salieron de `invariants.test.ts` en la v83 para que la matriz del CI pueda
 * correrlos en paralelo: ver la nota de reparto allí.
 *
 * Aquí vive una de las tres pruebas caras del banco: «el pelotón adelgaza entre un 12 % y un 20 % en
 * tres semanas».
 */
import { describe, expect, it } from 'vitest'
import { type GrandTourStats, abandonMix, analyzeGrandTour, runGrandTour } from './grandTour.js'
import {
  REAL_QUEENS,
  type RealQueenStats,
  analyzeRealQueens,
  colombiaRegressionTails,
  italy9SummitFinishes,
} from './realQueens.js'
import { STAGE } from '../constants.js'
import { TARGETS, type Target } from './targets.js'

/** Comprueba un estadístico contra su rango objetivo compartido. */
function expectInRange(value: number, target: Target): void {
  expect(value).toBeGreaterThanOrEqual(target.min)
  expect(value).toBeLessThanOrEqual(target.max)
}

describe('abandonos en una gran vuelta (docs/motor.md §VI.3)', () => {
  /**
   * El criterio de éxito de la v14, y el único invariante del banco que no se mide sobre una etapa
   * suelta: «una gran vuelta de 21 etapas empieza con ~176 y termina con entre 140 y 155».
   *
   * Se mide sobre la MEDIA de varias vueltas y no sobre una. Una vuelta suelta oscila entre el 12 %
   * y el 21 % según le caigan las caídas (medido, 8 semillas), así que un invariante sobre una sola
   * sería intermitente.
   */
  /**
   * DOCE VUELTAS Y NO SEIS (v46), y el motivo es que con seis esto era una MONEDA AL AIRE.
   *
   * Está medido abajo con detalle en el invariante de la cola, que es el que lo sufría: con seis
   * vueltas el 11 % de las muestras caían por debajo del suelo **sin que nada del motor cambiara**.
   * Un test que falla una de cada nueve noches no vigila nada; entrena a que se ignore el nocturno,
   * que es peor que no tenerlo.
   *
   * Medido remuestreando 24 vueltas del motor de hoy:
   *
   *     vueltas   media    sd     mínimo   % que fallan
   *        6      8,603   0,530    7,54       11 %
   *        8      8,584   0,327    8,14        0 %
   *       12      8,636   0,212    8,39        0 %
   *
   * Se eligen DOCE y no ocho porque esas muestras son ventanas SOLAPADAS: el sd real es mayor que el
   * de la tabla y las tasas de fallo son optimistas. Con ocho el mínimo queda a catorce centésimas
   * del suelo, demasiado justo para un estimador que se sabe optimista; con doce, a 0,39.
   *
   * La banda NO se toca: lo que cambia es cuánta carrera se mira antes de opinar.
   */
  // Las doce vueltas se corren UNA vez y las comparten los CINCO invariantes que salen de ellas:
  // medir dos veces lo mismo solo multiplica el reloj de CI. El coste se paga en el primer test que
  // las pide, y por eso su reloj es el que sube.
  let shared: GrandTourStats | null = null
  const tours = (): GrandTourStats => (shared ??= analyzeGrandTour(12))

  /**
   * EL RELOJ DE LAS DOCE VUELTAS, y lo paga ESTE test porque es el primero que las pide: los otros
   * cuatro se encuentran el resultado ya calculado y no cuestan nada.
   *
   * Doce vueltas de 21 etapas con 176 corredores son **~682 s en local**, y el factor local→CI
   * medido en este repositorio es ~1,8, o sea **~1.230 s**. La regla de la casa —el presupuesto es
   * al menos CUATRO VECES el coste de CI— pide 4.920 s, y se redondea a 5.400.000 ms.
   *
   * Parece desmesurado al lado del tiempo real y lo es a propósito: absorbe la instrumentación del
   * nocturno (x1,75-2,02) y el humor del runner (x1,3) compuestos, que es exactamente lo que ya tiró
   * dos nocturnos seguidos por estimar a ojo en vez de medir.
   */
  it('el pelotón adelgaza entre un 12% y un 20% en tres semanas', { timeout: 5400000 }, () => {
    const stats = tours()
    expect(stats.runs).toBe(12)
    expectInRange(stats.abandonPct, TARGETS.grandTour.abandonPct)
  })

  /**
   * EL CRITERIO DE ÉXITO DEL MODELO DE PERSECUCIÓN (v16, docs/motor.md §9). En una etapa reina de
   * gran vuelta el último grupo entra entre el 8 % y el 14 % del tiempo del ganador, que es lo que
   * hace el grupeto en carretera. Con menos, el corte de tiempo de §VI.3 (8-18 %) no señala a nadie
   * y la causa «fuera de control» no puede llegar a su 45 %; con más, el corte se llevaría por
   * delante media carrera todos los días.
   */
  /**
   * ESTA PRUEBA ES UNA MONEDA AL AIRE, Y ESTÁ MEDIDO (v42). Cuatro muestras INDEPENDIENTES de seis
   * giras cada una —el tamaño que corre este test— con la MISMA física dan 7,86 · 8,28 · 7,64 ·
   * 8,49: media **8,07** y desviación **0,39**, contra un suelo de 8. La mitad de las muestras pasan
   * y la mitad fallan sin que nada haya cambiado.
   *
   * Y con eso se caen tres atribuciones que se dieron por buenas antes, las tres hechas comparando
   * UNA muestra contra UNA muestra:
   *
   *  - «el viento acorta la cola» (v41: 8,42 sin viento contra 7,88 con) — dentro del ruido;
   *  - «la lluvia la arregla» (v42: 8,64) — dentro del ruido;
   *  - «el calor la vuelve a romper» (v42: 7,86 contra 9,11) — medido en serio, cuatro muestras
   *    contra cuatro, la diferencia es de 0,22 con un error estándar de 0,45: **medio sigma**.
   *
   * Lo que de verdad pasaba era más simple y más incómodo: la muestra era demasiado pequeña para el
   * ancho de la distribución. La cola de una reina va de 3,7 % a 17,7 % según el día, y la MEDIANA
   * de 42 etapas es un solo valor de orden —el de la etapa 21— así que salta a trompicones.
   *
   * RESUELTO EN LA v46 SUBIENDO LA MUESTRA, no la banda. Con doce vueltas el ruido baja de 0,530 a
   * 0,212 y ninguna muestra cae por debajo del suelo (tabla arriba, en la nota de las doce vueltas).
   * La v46 además subió el centro —el maillot deja de atacar y sus rivales le atacan más, y la reina
   * típica estira algo más el campo—, así que el margen es doble: más centro y menos ruido.
   *
   * SE MANTIENE LA FRASE QUE IMPORTA, porque sigue siendo la regla de la casa: lo que NO se hace es
   * mover una constante física —ni una banda— para que un dado caiga del lado bueno. Lo que se
   * arregló aquí fue el dado, mirando más carrera antes de opinar.
   */
  it('el último grupo de una etapa reina entra al 8-14%', { timeout: 900000 }, () => {
    const stats = tours()
    expect(stats.tails.reina.stages).toBeGreaterThanOrEqual(6 * 7)
    expectInRange(stats.tails.reina.medianLastGroupPct, TARGETS.grandTour.queenLastGroupPct)
  })

  /**
   * …y la otra mitad, que es la que pedía el dueño con sus palabras («hay 23 ciclistas en el mismo
   * tiempo y luego todos los demás llegan a 1 segundo... lo cual es técnicamente imposible»): una
   * etapa reina NO puede terminar con el pelotón entero al mismo segundo. En una llana sí —y por eso
   * esto no se comprueba sobre las llanas—, pero una etapa de montaña que llega en bloque es un
   * defecto, no un resultado.
   */
  it(
    'ninguna etapa reina termina con el pelotón entero al mismo segundo',
    { timeout: 300000 },
    () => {
      expect(tours().tails.reina.oneGroupPct).toBe(0)
    },
  )

  /**
   * EL REPARTO DE CAUSAS (v20, docs/motor.md §VI.3). El invariante que faltaba: hasta aquí solo se
   * vigilaba el TOTAL, así que una gran vuelta podía cuadrar el 12-20 % perdiendo a los 24
   * corredores por la misma puerta — y lo hacía, con el colapso en el 0 % y el fuera de control en el
   * 1-5 % durante tres tandas seguidas sin que ningún objetivo se pusiera rojo.
   *
   * Las bandas salen de las listas de abandonos de grandes vueltas REALES (ver `sim/targets.ts`), no
   * de la tabla vieja de §VI.3, que asignaba al fuera de control el 45 % y ha quedado corregida.
   */
  it('…y se van por las tres puertas, no por una sola', { timeout: 300000 }, () => {
    const stats = tours()
    const mix = abandonMix(stats.causes)
    expectInRange(mix.crashPct, TARGETS.abandonCauses.crashPct)
    expectInRange(mix.illnessPct, TARGETS.abandonCauses.illnessPct)
    expectInRange(mix.outOfTimePct, TARGETS.abandonCauses.outOfTimePct)
    /**
     * …Y LA GUILLOTINA SE MIDE EN HOMBRES, NO EN FRACCIONES (v81). El reparto de arriba se mueve
     * cuando cambia CUALQUIERA de las tres causas: si mañana se doblan las caídas, el porcentaje del
     * corte cae a la mitad sin que el corte haya cambiado nada. Lo que vigila de verdad que el corte
     * no sea una guillotina es cuántos se lleva. Ver `TARGETS.abandonCauses.outOfTimePerTour` para
     * el control de capas encendidas contra apagadas que obligó a separar las dos medidas.
     */
    expectInRange(stats.causes.fueraControl / stats.runs, TARGETS.abandonCauses.outOfTimePerTour)
    // Y las tres suman el reparto entero: si alguien añade una causa nueva y no la mete aquí, esto
    // lo dice en vez de dejarla fuera del invariante en silencio.
    expect(mix.crashPct + mix.illnessPct + mix.outOfTimePct).toBeCloseTo(100, 6)
  })

  /**
   * EL CORREDOR EN APUROS EXISTE (v20). La otra mitad del reparto, y la que hace falta comprobar
   * aparte porque el porcentaje de arriba la esconde: el colapso —bajarse de la bici EN CARRETERA—
   * era código muerto desde la v15 (0 en 6 vueltas) y §VI.3 lo pone como una de sus causas.
   */
  it('alguien se baja de la bici en carretera, y no son multitudes', { timeout: 300000 }, () => {
    const stats = tours()
    expect(stats.causes.colapso).toBeGreaterThan(0)
    // Un tope holgado: si el colapso pasara de aquí, dejaría de ser la excepción del que va roto.
    expect(stats.causes.colapso).toBeLessThan(stats.causes.lesion)
  })

  it('el tope del 4% por etapa nunca se rebasa', { timeout: 300000 }, () => {
    // Salvaguarda 1 de §VI.3, y la que de verdad protege la carrera: la hemorragia es el riesgo
    // real de esta mecánica. Se comprueba etapa a etapa sobre una vuelta entera.
    const tour = runGrandTour('tope-4pct')
    const gone = tour.starters - tour.finishers
    expect(gone).toBeGreaterThan(0)
    // 21 etapas × 4 % de un pelotón que mengua: la cota superior holgada es 21 · 0,04 · 176.
    expect(gone).toBeLessThan(Math.ceil(21 * 0.04 * tour.starters))
  })
})

/**
 * LAS ETAPAS REINA REALES (v17, docs/motor.md §9 y docs/balance.md «v17»). La cobertura que le
 * faltaba a la batería y la lección de la regresión de la v16.
 *
 * `grandTour.queenLastGroupPct` estaba en verde mientras Race Colombia e5 metía en producción a 126
 * de 130 corredores a más de 74 minutos. No porque el invariante estuviera mal medido, sino porque
 * **mide siempre la misma forma**: las siete reinas de `race-france`, todas finales en alto de
 * 170-185 km. La de Colombia son 232 km con el último puerto a 62 km de meta y 47 km rodadores
 * hasta la línea. El banco nuevo corre ocho reinas REALES elegidas por forma, y esa entre ellas.
 */
describe('la cola en las etapas reina REALES (v17)', () => {
  let shared: RealQueenStats | null = null
  const bench = (): RealQueenStats => (shared ??= analyzeRealQueens(6))

  it('el banco cubre formas distintas, y el caso de la regresión está dentro', () => {
    // No es decorado: el defecto se coló porque el banco no tenía ninguna reina con esta forma.
    expect(REAL_QUEENS.some((q) => q.raceId === 'race-colombia' && q.stageIndex === 5)).toBe(true)
    expect(REAL_QUEENS.length).toBeGreaterThanOrEqual(6)
    expect(new Set(REAL_QUEENS.map((q) => q.raceId)).size).toBe(REAL_QUEENS.length)
  })

  it('el último grupo entra al 8-14% del tiempo del ganador', { timeout: 900000 }, () => {
    const stats = bench()
    expect(stats.all.stages).toBe(REAL_QUEENS.length * 6)
    expectInRange(stats.all.medianLastGroupPct, TARGETS.realQueens.lastGroupPct)
  })

  it('…y NINGUNA etapa suelta deja a su cola fuera del corte', { timeout: 300000 }, () => {
    // El techo es `timeCutQueen` (18 %), el corte de §VI.3, y no un número de calibración: por
    // encima de él el corte deja de ser un riesgo y pasa a ser una eliminación en bloque que solo
    // frena el tope del 4 %. Es lo que Race Colombia e5 hacía en producción con un 22 %.
    expectInRange(bench().worst.medianLastGroupPct, TARGETS.realQueens.worstStagePct)
  })

  /**
   * EL CASO DE LA REGRESIÓN, CON EL CAMPO CON EL QUE SE VIO. El banco de arriba genera campos con
   * `generateNpcRider` y sale un CONTINUO de niveles; lo que rompía la carrera es el ESCALÓN —ocho
   * corredores treinta puntos por encima de una masa homogénea—, así que este caso va aparte y con
   * el campo del dueño: 8 a 82, 16 a 62 y el resto a 52.
   */
  /**
   * EL CASO DE LA v47: LA ETAPA 9 DEL GIRO. El dueño: «es un despropósito… es una llegada en alto
   * con un puerto brutal al final, donde debería haber muchas diferencias, y el que llega en el
   * puesto 150 solo perdió 26 segundos». Y tenía razón: la criba (`shatter`) no se llamaba nunca
   * sobre un grupo de descolgados, así que medio pelotón subía los últimos 12,8 km al 5,9 % —con
   * los últimos 2,8 al 9,7 %— dentro de un bloque que no podía perder a un solo hombre.
   *
   * Los dos listones dicen la misma frase por sus dos mitades, y ninguno es un número medido con el
   * que se haya ido a buscar el verde:
   *
   *  - **el campo no cabe en un reloj**: 94 de 176 con el mismo segundo era el defecto; el listón
   *    es un tercio del pelotón, que sigue siendo un grupo enorme para una llegada en alto;
   *  - **y el puerto abre diferencias hacia atrás**: tres minutos en el puesto 150 es poco para un
   *    puerto así —lo medido son de siete a diez— y es siete veces lo que el dueño vio.
   *
   * Y la guarda por el otro lado, que es la que impide «arreglarlo» reventando la carrera: la cola
   * sigue dentro del corte de tiempo de §VI.3.
   */
  it('la etapa 9 del Giro reparte de verdad en el puerto final', { timeout: 600000 }, () => {
    const metas = italy9SummitFinishes(4)
    for (const m of metas) {
      expect(m.biggestGroupPct).toBeLessThanOrEqual(33)
      const p150 = m.gaps.find((g) => g.puesto === 150)?.gapS
      // Si no llegan 150 clasificados la etapa ha seleccionado de sobra y la pregunta no aplica.
      if (p150 !== null && p150 !== undefined) expect(p150).toBeGreaterThan(180)
      // …y las brechas CRECEN con el puesto, que es lo que hace un puerto: lo que se vio era
      // 80 s en el 10.º, 80 en el 50.º y 80 en el 100.º, o sea el mismo bloque tres veces.
      const conGente = m.gaps.filter((g) => g.gapS !== null).map((g) => g.gapS!)
      for (let i = 1; i < conGente.length; i++)
        expect(conGente[i]!).toBeGreaterThan(conGente[i - 1]!)
      expect(m.lastGroupPct).toBeLessThanOrEqual(100 * STAGE.timeCutQueen)
    }
    expect(metas.length).toBe(4)
  })

  it('Race Colombia e5 no vuelve a entregar la etapa a 74 minutos', { timeout: 120000 }, () => {
    const tails = colombiaRegressionTails(5)
    const worst = Math.max(...tails.map((t) => t.lastGroupPct))
    // Medido: v16 llegaba al 18,9 % en esta misma tanda de semillas (y al 22 % en producción); la
    // v17 se queda en el 15,5 %. El listón es el corte de la reina, no el número medido.
    expect(worst).toBeLessThanOrEqual(100 * STAGE.timeCutQueen)
    // Y no se arregla llevándose por delante la selección: la etapa sigue partiéndose de verdad.
    for (const t of tails) expect(t.groups).toBeGreaterThan(2)
  })
})
