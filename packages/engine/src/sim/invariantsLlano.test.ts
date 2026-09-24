/**
 * Invariantes de la ETAPA LLANA y de las FASES (SPEC 6.17, R19). Salieron de `invariants.test.ts`
 * porque las dos corren sobre `flatScenario` con muestras grandes —300 semillas la llana, 120 las
 * fases— y entre las dos eran la mitad de lo que le quedaba a aquel fichero, que seguía siendo el
 * tramo más largo de la matriz del CI. Ver la nota de reparto allí.
 */
import { describe, expect, it } from 'vitest'
import { analyzeFlat } from './analyze.js'
import { analyzePhases } from './phases.js'
import { campaignSeeds, flatScenario } from './scenarios.js'
import { TARGETS, type Target } from './targets.js'

/** Comprueba un estadístico contra su rango objetivo compartido. */
function expectInRange(value: number, target: Target): void {
  expect(value).toBeGreaterThanOrEqual(target.min)
  expect(value).toBeLessThanOrEqual(target.max)
}

/**
 * ————— 120 -> 300 SEMILLAS EN LA v81, PORQUE ERA LO QUE ESTE BANCO TENÍA PENDIENTE —————
 *
 * `TARGETS.flat.breakawayWinPct` lleva anotado desde la v33 que **su techo describe el tamaño de la
 * muestra y no la carrera**: con 120 semillas σ ≈ 2,2 puntos, y ahí el mismo motor daba 10,00 % con
 * 120, 6,33 % con 300 y 4,20 % con 500. La nota terminaba diciendo quién tenía que pagarlo: «quien
 * quiera estrecharla de verdad tiene que subir primero las semillas del invariante».
 *
 * Al encender las cinco capas este invariante se puso rojo con **18,33 %** contra un techo de 16, y
 * antes de mover nada se midió el mismo estadístico con tres muestras:
 *
 *   semillas   gana la fuga   captura %
 *      120        18,33 %       78,18 %
 *      300        15,00 %       82,05 %
 *      500        14,60 %       83,04 %
 *
 * O sea que **la fuga NO se sale de banda: la muestra de 120 se salía**. El valor converge a 14,6 y
 * el 18,33 era exactamente el ruido que la nota de la v33 predecía. Así que se paga lo que aquella
 * nota pedía en vez de ensanchar un techo que ya describía la muestra: 300 semillas, 15,00 %, dentro
 * de banda. Las semillas son deterministas (`campaignSeeds`), así que el número de CI es siempre
 * éste; lo que se compra no es estabilidad entre ejecuciones, es que el estadístico signifique algo.
 *
 * Y lo que la muestra grande NO arregla se dice aparte, en el test de la captura.
 */
describe('invariantes de llano (6.17)', () => {
  const scenario = flatScenario()
  const stats = analyzeFlat(scenario, campaignSeeds(scenario.name, 300))

  // Con las "piernas del día" (dayFormSd) la fuga aguanta algo más a menudo: el juego de la fuga
  // pesa más y no siempre manda el pelotón. Aun así sigue siendo minoría en llano.
  it('la fuga gana el porcentaje objetivo de las etapas', () => {
    expectInRange(stats.breakawayWinPct, TARGETS.flat.breakawayWinPct)
  })

  it('el mejor sprinter gana el porcentaje objetivo con 3 sprinters de nivel', () => {
    expectInRange(stats.bestSprinterWinPct, TARGETS.flat.bestSprinterWinPct)
  })

  /**
   * EL SUELO DE LA CAPTURA SE DERIVA, PORQUE ERA UN LITERAL QUE CONTRADECÍA A UNA BANDA (v81).
   *
   * Estaba escrito `toBeGreaterThan(85)` a pelo, sin derivación y sin entrada en `TARGETS`. Y ese 85
   * **no es independiente de `breakawayWinPct`**: las dos preguntas son casi la misma contada al
   * revés. Medido sobre 500 semillas, con las cinco capas y sin ellas:
   *
   *              gana la fuga   captura %   ni una ni otra
   *   capas off      9,80 %      88,37 %        1,83 %
   *   capas on      14,60 %      83,04 %        2,36 %
   *
   * Las fugas que ganan salen EXACTAMENTE de las que se cazan, y el resto —un 2 % que ni gana ni es
   * cazada— es la fuga que se apaga sola. O sea que un suelo de 85 en la captura es, en silencio, un
   * techo de ~13 en las victorias de fuga, mientras la banda que el dueño aprobó permite hasta 16.
   * Dos invariantes sobre el mismo bench diciendo cosas distintas: el que no está derivado es el que
   * está mal.
   *
   * Así que el suelo pasa a decir lo que de verdad vigila —**el pelotón caza todo lo que no se le
   * escapa**— y se deriva del techo de la banda más el 2,5 % medido de fugas que se apagan solas. Si
   * alguien estrecha `breakawayWinPct`, este suelo se estrecha con él, que es lo que no pasaba.
   */
  const FUGAS_QUE_SE_APAGAN_PCT = 2.5
  it('cuando los sprinters cazan, la captura mediana cae en el rango objetivo', () => {
    expect(stats.capturePct).toBeGreaterThan(
      100 - TARGETS.flat.breakawayWinPct.max - FUGAS_QUE_SE_APAGAN_PCT,
    )
    expectInRange(stats.medianCatchKmToFinish, TARGETS.flat.catchKmToFinish)
  })
})

/**
 * INVARIANTE 54 (R19, docs/tactica.md paso 5): **después del km 100 se sigue intentando algo**.
 *
 * Es el guardarraíl del defecto que las fases vienen a matar, y el defecto tenía nombre y medida en
 * producción antes de tener regla: Race Almeria e1, cuatro intentos hasta el km 19 y **ni uno más en
 * los 190 restantes**. La causa era un contador de tres grupos vivos GLOBALES puesto por encima de
 * toda la capa táctica: en cuanto la carretera se poblaba, la etapa se apagaba hasta meta.
 *
 * Un invariante sobre la media de la campaña y no sobre la peor etapa, por lo de siempre: con 120
 * semillas lo que se puede afirmar es dónde está la nube, no dónde cae la peor carrera.
 */
describe('invariantes de las fases (R19)', () => {
  const scenario = flatScenario()
  const stats = analyzePhases(scenario, campaignSeeds(scenario.name, 120))

  it('la carrera sigue viva después del km 100', () => {
    expectInRange(stats.attemptsAfterKm100, TARGETS.phases.attemptsAfterKm100)
  })

  it('se intenta un número razonable de veces por etapa', () => {
    expectInRange(stats.attemptsPerStage, TARGETS.phases.attemptsPerStage)
  })

  /**
   * …Y EL TERCERO **YA ES UN INVARIANTE DE VERDAD** (paso 9 conjunto).
   *
   * Tiene historia y conviene dejarla: hasta esta tanda esta prueba afirmaba **lo contrario** —que
   * el motor NO llegaba a su banda—, porque era la verdad y sellar 25-60 la habría dejado roja
   * mientras bajarla al 16 % que el motor daba habría sellado el defecto. El motor cazaba una fuga
   * y no pasaba nada.
   *
   * Con la capa táctica entera encendida el kilómetro siguiente a una captura pasa a ser el más
   * vivo de la carrera, que es lo que R19.5 promete con esas palabras: **16 % → 29 %**, dentro de
   * banda. Así que la prueba deja de describir un defecto y pasa a vigilar una conducta.
   *
   * **Y EN LA v81 SE DA LA VUELTA DE VERDAD**, que es lo que el párrafo de arriba anunciaba y el
   * código no hacía: el texto se escribió con las capas apagadas y la afirmación se quedó en
   * «todavía NO llega». Encendidas las cinco, el estadístico vale **27,3 %** contra un suelo de 25,
   * o sea dentro de banda, y una prueba que exige que el motor SIGA fallando se pone roja cuando el
   * motor acierta. Eso no es un banco: es un ancla al defecto. Se afirma lo que hay.
   */
  it('el contraataque tras la captura llega a su banda', () => {
    expectInRange(stats.counterAfterCatchPct, TARGETS.phases.counterAfterCatchPct)
  })
})
