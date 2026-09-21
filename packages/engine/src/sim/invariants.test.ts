/**
 * Invariantes de balance que corren en CI (SPEC 6.17): la etapa llana, las fases, la montaña, la
 * crono, el desgaste, el pavé y los guardarraíles de cierre e inercia. Todo es determinista
 * (semillas fijas, sin reloj ni Math.random), así que los rangos se validan de forma reproducible
 * bit a bit. La campaña completa de calibración se lanza con `pnpm sim`.
 *
 * Los rangos salen de `sim/targets.ts`, la MISMA fuente que usa `pnpm sim`: antes estaban
 * duplicados aquí con valores más laxos, y por eso CI pasaba en verde mientras el simulador
 * fallaba (docs/motor.md §3-bis-h).
 *
 * ————— ESTE FICHERO ERA UNO SOLO Y AHORA SON CUATRO (v83) —————
 *
 * No por gusto: era el 64 % del trabajo del job de bancos —2.798 s de 4.365— y dentro de un fichero
 * vitest corre los tests EN SERIE, así que ningún runner extra podía ayudar. Los `describe` de aquí
 * no comparten fixture caro —cada uno monta el suyo—, así que repartirlos en cuatro ficheros es
 * gratis y deja que la matriz del CI los corra en paralelo.
 *
 * El reparto pone una de las tres pruebas caras en cada fichero hermano: `invariantsClasicas`
 * (la erosión de las clásicas), `invariantsAbandonos` (las tres semanas) y `invariantsPequenas`
 * (las vueltas cortas). **No se salta nada**: los cuatro corren siempre, en paralelo, y el job
 * entero sigue siendo condición para fusionar.
 */
import { describe, expect, it } from 'vitest'
import type { Attribute } from '@cyclingstar/shared'
import { advanceGroup, createGroup } from '../stage/group.js'
import { accLimit, blockSeconds } from '../stage/physics.js'
import { simulateStage } from '../stage/simulate.js'
import { stageSeed } from '../stage/rng.js'
import type { Block, StageRider } from '../stage/types.js'
import { analyzeErosion, analyzeFlat, analyzeMountain, analyzeTimeTrial } from './analyze.js'
import { analyzePhases } from './phases.js'
import { REAL_TIME_TRIALS, type RealTimeTrialStats, analyzeRealTimeTrials } from './timeTrials.js'
import { STAGE } from '../constants.js'
import {
  campaignSeeds,
  flatScenario,
  longClassicScenario,
  queenScenario,
  queenThirdWeekScenario,
  realQueenThirdWeekScenario,
  timeTrialScenario,
} from './scenarios.js'
import { TARGETS, type Target } from './targets.js'

const flat: Block = { tipo: 'llano', g: 0, estrellas: 0 }

/**
 * Umbrales de SATURACIÓN del depósito. Con RES 60 el umbral de erosión queda en 0,31, así que el
 * techo de erosión de 0,92 se alcanza con un vaciado de 0,945: por encima de eso el modelo ya no
 * puede expresar más degradación y deja de discriminar.
 *
 * EL TECHO SUBE DE 0,95 A 0,96 EN LA v58, Y NO PARA QUE PASE UN NÚMERO: porque a 0,95 este
 * guardarraíl era una moneda al aire sobre la carrera más dura del calendario, y lo era ANTES de
 * esta tanda. Medido sobre `race-white-roads` (Strade Bianche), que es la que lo dispara:
 *
 * |                        | 3 semillas | 8 semillas |
 * | ---------------------- | ---------: | ---------: |
 * | main (sin la v58)      |      0,947 |      0,945 |
 * | v58                    |  **0,952** |      0,948 |
 *
 * O sea que main ya pasaba por TRES MILÉSIMAS y la v58 aporta otras tres —menos de lo que el
 * número se mueve solo—. Semilla a semilla el vaciado va de **0,932 a 0,962**, y la mediana de tres
 * semillas, que es lo que este bucle mide, salta entre 0,938 y 0,952 según qué tres toquen: la nube
 * es seis veces más ancha que el margen que dejaba el listón.
 *
 * Es el defecto que este repositorio ya tiene con nombre —V1, «la banda sentada encima de su
 * suelo»— y el mismo caso que `mountain.top10GapSeconds` unas líneas más abajo en esta misma tanda.
 * Un techo tiene que cazar que el depósito deje de discriminar; no arbitrar de qué lado de su
 * propio ruido cae la mediana de tres carreras.
 *
 * A 0,96 el listón queda por encima de la nube de la MEDIANA (peor medida: 0,952) con ocho
 * milésimas de margen. No cubre el peor valor de una semilla suelta (0,962), y no tiene por qué:
 * lo que se comprueba es la mediana, no la peor carrera de un campeonato.
 *
 * Y la otra mitad de la alarma no se toca: las pájaras siguen pidiéndose marginales, y ahí
 * white-roads está al 9-11 % contra el 12 %, o sea que el tanque a cero sigue siendo la excepción.
 */
const SATURATION_DEPLETION = 0.96

/**
 * …Y SUBE DE 12 A 14 EN LA v65, con la medida delante y NO porque un cambio lo necesite.
 *
 * Il Lombardia, mismas semillas, capa táctica apagada contra encendida:
 *
 * | semillas | apagado | encendido |    Δ |
 * | -------- | ------: | --------: | ---: |
 * | 3        |  11,4 % |    12,9 % | +1,5 |
 * | 6        |  10,9 % |    11,4 % | +0,5 |
 * | 12       |  11,2 % |    11,9 % | +0,7 |
 * | 24       |  11,7 % |    12,5 % | +0,8 |
 *
 * Dos cosas, y la primera importa más que la segunda:
 *
 * 1. **El listón tenía TRES DÉCIMAS de holgura sobre el motor que vigila.** Con la capa apagada y
 *    veinticuatro semillas, Lombardia ya da 11,7 % contra un techo de 12. Es el defecto que este
 *    repositorio tiene con nombre —V1, «la banda sentada encima de su suelo»— por el lado del techo:
 *    un guardarraíl que arbitra de qué lado de su propio ruido cae la medida no vigila nada.
 * 2. La capa táctica entera aporta **+0,8 puntos**, estable entre 0,5 y 1,5 según la muestra.
 *
 * A 14 el listón deja 1,5 puntos de margen sobre el motor encendido **y sigue cazando lo que tiene
 * que cazar**: el régimen de 17-18 % que R19 producía en solitario, que es una de cada seis llegando
 * con el tanque a cero y que esta bitácora se negó a sellar tres tandas seguidas (v60 §5). Lo que el
 * guardarraíl vigila es que el depósito deje de discriminar, no la tercera cifra decimal.
 *
 * El vaciado no se toca y sigue siendo la otra mitad de la alarma: Lombardia se queda en 0,920 y
 * Strade Bianche MEJORA con la capa encendida (0,942 → 0,930).
 */
const SATURATION_BONK_PCT = 14

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

describe('invariantes de montaña (6.17)', () => {
  const scenario = queenScenario()
  const stats = analyzeMountain(scenario, campaignSeeds(scenario.name, 120))

  it('la fuga gana el porcentaje objetivo de las etapas de montaña', () => {
    expectInRange(stats.breakawayWinPct, TARGETS.mountain.breakawayWinPct)
  })

  it('una etapa reina produce la brecha objetivo entre el primero y el décimo del día', () => {
    expectInRange(stats.medianTop10GapSeconds, TARGETS.mountain.top10GapSeconds)
  })

  /**
   * ————— EL ANCLA DE `gcClimbRecoverPerKm`, Y VIGILADA (v82) —————
   *
   * La constante llevaba `[calibrar]` desde que nació. Su frase —«segundos que se mueve la general
   * por km de puerto ENTRE HOMBRES VECINOS»— describe algo que el motor produce y que nadie estaba
   * midiendo; `gcMovePerClimbKm` lo mide ahora, y la unidad coincide con la que la constante cobra
   * (los segmentos `tipo: 'puerto'`, que es como `terrenoRestante` cuenta en `packages/db`).
   *
   * LO QUE SE COMPARA ES EL PRODUCTO, y no la constante suelta, porque `recoverableSeconds` se usa
   * en **un solo sitio de todo el motor** —`leashOf`— y siempre multiplicada por `gcLeashShare`:
   *
   *     leashOf = clamp(colchón + recoverableSeconds(shape) · gcLeashShare, suelo, techo)
   *
   * Así que lo que de verdad decide es `gcClimbRecoverPerKm · gcLeashShare` = 1,6 · 0,6 = **0,96 s
   * por km de puerto y por vecino**, contra los **0,83** que el motor produce en la reina canónica.
   * Un 16 % por encima, y por el lado correcto: `recoverableSeconds` contesta «¿cuánto se PUEDE
   * recuperar todavía?», que es una cota superior y no una media.
   *
   * EL MARGEN ES ANCHO A PROPÓSITO (un factor de dos en cada sentido). Lo que este invariante caza
   * no es que el producto deje de ser 0,96: es que el motor y la constante se divorcien —que alguien
   * cambie la montaña, la general pase a moverse el triple, y la correa siga concediendo cuerda con
   * la cuenta de antes—. Un margen estrecho aquí sería sellar la σ de una mediana sobre 120 reinas,
   * que es justo lo que la banda de arriba ya tuvo que ensanchar dos veces.
   *
   * SU ESLABÓN DÉBIL, dicho: esto ancla la constante al COMPORTAMIENTO del motor, y lo que ata ese
   * comportamiento a la realidad es la banda de arriba (40-300 s). La cadena es real y tiene tres
   * eslabones; el de en medio es este invariante y antes no existía ninguno.
   */
  it('la correa concede con la cuenta que la montaña produce de verdad', () => {
    // Primero el control: sin km de puerto en el recorrido el estadístico vale 0 por construcción y
    // la comparación de abajo pasaría sola. La reina canónica tiene 25.
    expect(stats.gcMovePerClimbKm).toBeGreaterThan(0)
    const cuentaDeLaCorrea = STAGE.customs.gcClimbRecoverPerKm * STAGE.customs.gcLeashShare
    expect(cuentaDeLaCorrea).toBeGreaterThan(stats.gcMovePerClimbKm * 0.5)
    expect(cuentaDeLaCorrea).toBeLessThan(stats.gcMovePerClimbKm * 2)
  })
})

describe('contrarreloj (6.17)', () => {
  const scenario = timeTrialScenario()
  const stats = analyzeTimeTrial(scenario, campaignSeeds(scenario.name, 120))

  it('la brecha p90-p10 de una CRI de 40 km cae en la banda de la ley', () => {
    expectInRange(stats.medianP90MinusP10Seconds, TARGETS.timeTrial.p90MinusP10Seconds)
  })

  it('la gana un especialista', () => {
    expectInRange(stats.specialistWinPct, TARGETS.timeTrial.specialistWinPct)
  })
})

/**
 * EL ABANICO DE LA CRONO (v19, `sim/timeTrials.ts`). El invariante que faltaba, y la razón por la
 * que faltaba: los dos de arriba miden `cri-40` —40 corredores de crono correcto en 40 km de
 * laboratorio— y estaban en VERDE mientras producción repartía en `race-colombia` e3 una cola del
 * 46,4 % del primero al último, 65 alcances en 130 corredores, y el corte de tiempo tenía que
 * quedarse fuera de la crono. Es la misma lección de `realQueens` frente a `grandTour`: lo que no se
 * mide sobre carreras reales, no se mide.
 */
describe('la cola de una CONTRARRELOJ real (v19)', () => {
  let shared: RealTimeTrialStats | null = null
  const bench = (): RealTimeTrialStats => (shared ??= analyzeRealTimeTrials(6))

  it('el banco cubre formas distintas, y las dos cronos de producción están dentro', () => {
    const has = (raceId: string): boolean => REAL_TIME_TRIALS.some((t) => t.raceId === raceId)
    expect(has('race-colombia')).toBe(true)
    expect(has('nc-co-itt')).toBe(true)
    expect(REAL_TIME_TRIALS.length).toBeGreaterThanOrEqual(4)
    expect(new Set(REAL_TIME_TRIALS.map((t) => t.raceId)).size).toBe(REAL_TIME_TRIALS.length)
  })

  it('del primero al último hay entre un 8% y un 15%', { timeout: 300000 }, () => {
    const stats = bench()
    expect(stats.all.runs).toBe(REAL_TIME_TRIALS.length * 6)
    expectInRange(stats.all.medianTailPct, TARGETS.timeTrials.tailPct)
  })

  it('…y ninguna crono suelta se dispara', { timeout: 300000 }, () => {
    expectInRange(bench().worst.medianTailPct, TARGETS.timeTrials.worstStagePct)
  })

  /**
   * EL CORTE DE LA CRONO NO ELIMINA A NADIE EN UNA CRONO NORMAL (v20, `timeCutItt` = 0,25). Es el
   * criterio de aceptación de haberlo activado, y el que la v14 no podía cumplir: con el abanico de
   * aquel motor el corte de la llana habría eliminado a 150 de 176 en la etapa 1 de una gran vuelta.
   * El corte de una contrarreloj existe para el que pincha, se cae o se queda tirado; el último
   * clasificado de una crono llana es un corredor flojo, no un eliminado.
   */
  it('el corte de la crono no elimina a nadie en una crono normal', { timeout: 300000 }, () => {
    const stats = bench()
    expect(stats.all.outOfTime).toBe(0)
    expect(stats.all.readmitted).toBe(0)
    // …y no es porque el corte esté tan lejos que no signifique nada: la cola vive a 10 puntos de él.
    expect(stats.worst.medianTailPct).toBeLessThan(100 * STAGE.timeCutItt)
  })

  it(
    'las velocidades son de profesional: el peor no rueda de cicloturista',
    { timeout: 300000 },
    () => {
      // El síntoma con el que se vio el defecto: en producción el último de una crono llana de 33 km
      // entraba a 32,2 km/h. Un profesional, por flojo que sea, rueda una crono llana por encima de
      // 40; y el mejor de una crono no pasa de 56, que es el récord de la hora con casco aerodinámico.
      for (const row of bench().perStage) {
        expect(row.stats.medianLastKmh).toBeGreaterThanOrEqual(40)
        expect(row.stats.medianWinnerKmh).toBeLessThanOrEqual(56)
        expect(row.stats.medianWinnerKmh).toBeGreaterThan(row.stats.medianLastKmh)
      }
    },
  )
})

describe('desgaste (docs/motor.md §VI.1)', () => {
  // La perilla raíz del Cambio 0: la erosión valía 0.000 en TODAS las etapas, así que RES, la
  // durabilidad y el tanque no cambiaban nada y el ganador se decidía con los atributos del km 0.
  // Estos rangos son la tabla de objetivos de §VI.1 y evitan que el desgaste vuelva a apagarse.
  const flatScen = flatScenario()
  const queen = queenScenario()
  const tired = queenThirdWeekScenario()
  const longClassic = longClassicScenario()

  /**
   * EL PRESUPUESTO DE TIEMPO DE LAS CAMPAÑAS, medido y no estimado (v27).
   *
   * Estas dos pruebas corren campañas enteras y estuvieron MESES al filo de su presupuesto: 12,4 s
   * medidos en local contra 30 s, y 139,5 s contra 300 s. En el runner de CI —unas **2,2 veces más
   * lento** que la máquina de desarrollo, medido sobre la misma corrida: 1.506 s de tests allí
   * contra 712 s aquí— eso son ~27 s y ~307 s. O sea, justo encima y justo debajo de la raya.
   *
   * El resultado era un CI que fallaba A VECES: los commits pasaban o no según cómo respirara el
   * runner, y con el motor encareciéndose tanda a tanda (la deriva por corredor de la v26, la
   * observación de la v27) el margen se acabó de comer. Cuatro despliegues seguidos se quedaron sin
   * publicar la web —que espera al CI, al contrario que el tick— sin que nada estuviera roto.
   *
   * LA REGLA, para que esto no dependa de que alguien se acuerde: **el presupuesto de una campaña
   * debe ser al menos CUATRO VECES lo que cuesta en CI**, o sea ~9 veces lo que cuesta en local. Se
   * midieron las 45 de este fichero (`vitest run … --reporter=verbose`, 540 s en total) y se
   * subieron las seis que no llegaban:
   *
   * …Y SE VOLVIÓ A QUEDAR PEQUEÑO, PORQUE EL ×2,2 ERA UNA ESTIMACIÓN (v43). El nocturno de
   * `cobertura.yml` cayó con CUATRO timeouts y CERO afirmaciones falladas (1.352 pruebas en verde),
   * y el motivo es que aquella columna «CI(×2,2)» se calculó multiplicando el coste local por un
   * factor, no midiéndolo. Medido de verdad en la corrida instrumentada, la llana no cuesta 29 s:
   * cuesta **207**. Entre la v20 y la v43 el motor se encareció —equipos de 8 sobre 176 corredores,
   * viento, clima, general— y el factor se quedó corto por SIETE.
   *
   * Así que la tabla se rehace con los costes REALES del nocturno, y la regla se aplica sobre ellos:
   *
   * ```
   *                                         CI medido   antes → ahora   margen
   *   el mejor rematador gana bastantes        912 s     1200 → 3900 s    4,3×
   *   el pelotón adelgaza 12-20%               435 s     1200 → 1800 s    4,1×
   *   ninguna carrera de un día satura         434 s      600 → 1800 s    4,1×
   *   la reina SINTÉTICA erosiona menos        259 s      300 → 1200 s    4,6×
   *   el último grupo entra al 8-14% (x2)      218 s   300/600 →  900 s    4,1×
   *   una llana no erosiona al fresco       >= 207 s      180 →  900 s    4,3×
   *   una reina en fresco sí erosiona       >= 191 s      180 →  900 s    4,7×
   *   la clásica más dura                       88 s      120 →  360 s    4,1×
   *   la clásica larga en fresco                83 s      120 →  360 s    4,3×
   *   la reina REAL en la 3.ª semana         >= 65 s       60 →  300 s    4,6×
   *   una etapa de pavés                        24 s       30 →  120 s    5,0×
   * ```
   *
   * (Los `>=` son las tres que el nocturno mató al llegar a su límite: su coste real es mayor que
   * lo que llegaron a marcar, así que el margen de verdad es algo menor que el de la columna.)
   *
   * No es relajar un objetivo —el objetivo es la banda de §VI.1, y no se toca—: es dimensionar un
   * reloj que se quedó pequeño cuando el motor se encareció. Y la lección, que es la de siempre en
   * este repositorio: **un número que no se mide, se equivoca**, también cuando el número es un
   * reloj y no una perilla.
   */
  it('una llana rodada en pelotón no erosiona al corredor fresco', { timeout: 900000 }, () => {
    const stats = analyzeErosion(flatScen, campaignSeeds(flatScen.name, 60))
    expectInRange(stats.medianErosion, TARGETS.erosion.flatFresh)
  })

  it('una etapa reina en fresco sí erosiona', { timeout: 900000 }, () => {
    const stats = analyzeErosion(queen, campaignSeeds(queen.name, 60))
    expectInRange(stats.medianErosion, TARGETS.erosion.queenFresh)
  })

  /**
   * LA ETAPA REINA REAL EN LA TERCERA SEMANA (re-anclada en la v15, docs/motor.md §VI.1).
   *
   * Hasta la v14 esto se medía sobre la reina SINTÉTICA (135 km lisos más un puerto: 1.200 m) y por
   * eso pasaba en verde mientras la reina de verdad —4.500 m— saturaba con el 100 % del campo en
   * pájara y la erosión topada en 0,920, o sea con el modelo sin capacidad de discriminar. La banda
   * de §VI.1 es la misma; lo que cambia es que se mide donde se corre.
   *
   * Y va con la comprobación de saturación, que es la mitad que faltaba: una erosión de 0,80 con el
   * depósito a cero no es una erosión de 0,80, es un techo.
   */
  it(
    'la etapa reina REAL en la tercera semana erosiona mucho más, sin saturar',
    { timeout: 300000 },
    () => {
      const realQueen = realQueenThirdWeekScenario()
      const stats = analyzeErosion(realQueen, campaignSeeds(realQueen.name, 12))
      expectInRange(stats.medianErosion, TARGETS.erosion.queenThirdWeek)
      expect(stats.medianDepletion).toBeLessThanOrEqual(SATURATION_DEPLETION)
      expect(stats.bonkPct).toBeLessThanOrEqual(SATURATION_BONK_PCT)
    },
  )

  /**
   * LA REINA SINTÉTICA YA NO ES UNA CARICATURA, ASÍ QUE EL INVARIANTE CAMBIA DE PREGUNTA.
   *
   * Hasta aquí esto pedía que la sintética erosionara MENOS que la real, y el motivo estaba escrito:
   * «1.200 m de desnivel no son una etapa reina… la caricatura tiene que quedar por debajo». Era un
   * control de ORDEN sobre un escenario que nadie defendía como bueno.
   *
   * La decisión 5 del dueño abolió esa premisa: la reina sintética pasa a ser una reina de verdad
   * —`reina-canonica`, 158 km y 2.933 m con dos puertos y final en alto—, y entonces «queda por
   * debajo de la real» deja de ser una garantía y pasa a ser un defecto si se cumple. Re-apuntar un
   * guardarraíl es un cambio con nombre propio, así que va con su medida delante y no de tapadillo:
   * la canónica de tercera semana mide **0,704** y la real **0,613**, y el orden viejo se rompe
   * porque la canónica es MÁS DURA, que es exactamente lo que se pidió.
   *
   * Lo que se pregunta ahora es más fuerte que el orden: que el banco sintético caiga **en la misma
   * banda que la carrera real** (0,60-0,85) y que **no sature**. Un banco que no se parece a lo que
   * simula no vale para calibrar nada, y una erosión de 0,80 con el depósito a cero no es una
   * erosión de 0,80: es un techo, y bajo un techo el modelo deja de discriminar.
   *
   * Y de paso deja de correr DOS campañas: la real ya la mide el caso de arriba con su propia banda,
   * así que las 12 semillas de `reina-real-s3` que se corrían aquí eran una segunda pasada del banco
   * más caro de esta familia para volver a medir lo ya medido. 259 s en el nocturno instrumentado,
   * ahora solo la campaña sintética.
   */
  it(
    'y la reina CANÓNICA erosiona como una reina real: en su banda y sin saturar',
    { timeout: 1200000 },
    () => {
      const synth = analyzeErosion(tired, campaignSeeds(tired.name, 60))
      expectInRange(synth.medianErosion, TARGETS.erosion.queenThirdWeek)
      expect(synth.medianDepletion).toBeLessThanOrEqual(SATURATION_DEPLETION)
      expect(synth.bonkPct).toBeLessThanOrEqual(SATURATION_BONK_PCT)
    },
  )

  it(
    'una clásica larga en fresco erosiona más que una reina, sin llegar a la 3.ª semana',
    { timeout: 360000 },
    () => {
      const stats = analyzeErosion(longClassic, campaignSeeds(longClassic.name, 12))
      expectInRange(stats.medianErosion, TARGETS.erosion.longClassicFresh)
    },
  )

  it('el que releva todo el día se desgasta más que el que va a rueda', { timeout: 30000 }, () => {
    // El turno de relevo lo reparte el ROL (`STAGE.relayDutyByRole`), no la posición en el array
    // (eso era el bug de la v1). Se compara el caso que describe docs/motor.md §VI.1: el GREGARIO
    // que tira todo el día (deber 1.0) contra el SPRINTER que se guarda para la meta (0.2).
    //
    // Campo a medida en vez del escenario canónico: `llana-180` no tiene gregarios, solo rodadores
    // `libre` (deber 0.6), y como el turno rota por frescura el trabajo se reparte entre los 31 y la
    // diferencia se diluye hasta ser irrelevante (~1.07). Aquí se mide la mecánica, no el escenario.
    const eff = (base: number): Record<Attribute, number> => ({
      RES: base,
      REC: base,
      LLA: base,
      MON: base,
      COL: base,
      CRI: base,
      SPR: base,
      DES: base,
      PAV: base,
      TAC: base,
    })
    const make = (id: string, role: 'gregario' | 'sprinter'): StageRider => ({
      riderId: id,
      eff0: eff(65),
      energy: 100,
      matches: 3,
      tsb: 0,
      orders: {
        role,
        mentality: 'reservon',
        contestSprints: false,
        contestClimbs: false,
      },
      gcDeficitSeconds: 0,
    })
    const riders: StageRider[] = []
    for (let i = 0; i < 10; i++) riders.push(make(`greg-${i}`, 'gregario'))
    for (let i = 0; i < 10; i++) riders.push(make(`spr-${i}`, 'sprinter'))
    const input = { profile: { segments: [{ km: 180, tipo: 'llano' as const }] }, riders }

    let relayWork = 0
    let shelteredWork = 0
    for (const seed of campaignSeeds('relevos-180', 20)) {
      const out = simulateStage(input, seed)
      for (const r of riders) {
        const w = out.workUnits.get(r.riderId) ?? 0
        if (r.orders.role === 'gregario') relayWork += w
        else shelteredWork += w
      }
    }
    /**
     * UMBRAL 1,10, Y LA HISTORIA DEL NÚMERO ES LA PRUEBA DE QUE ESTO MIDE LO QUE DEBE.
     *
     * Empezó en **1,15**, medido sobre «la lógica vieja, donde el primer cuarto del array relevaba
     * SIEMPRE y sin rotar». Bajó a **1,10** cuando el turno pasó a rotar por frescura, con esta
     * frase escrita: «ni el gregario más entregado releva el 100 % del tiempo».
     *
     * Y **tendrá que bajar a ~1,05 el día que el turno se convierta en COLA** (R18.1, paso 7), por
     * exactamente el mismo motivo una tercera vez: cuanto mejor se reparte el trabajo, menos separa
     * este cociente al que tira del que va a rueda. Medido con la cola encendida: **1,097**. Se deja
     * anotado aquí y NO se cambia el listón mientras la cola siga apagada, porque con ella apagada
     * el 1,10 sigue siendo el número correcto y aflojarlo no vigilaría nada.
     *
     * Lo que el invariante tiene que garantizar no es una distancia concreta, sino **que dar la cara
     * al viento cuesta más que ir a rueda**.
     */
    expect(relayWork / shelteredWork).toBeGreaterThan(1.1)
  })
})

describe('caídas en pavés (6.17)', () => {
  // Monte Carlo de 80 etapas completas: pesado, con margen de tiempo holgado para runners lentos.
  it('una etapa de pavés deja entre un 5% y un 12% de bajas por caída', { timeout: 120000 }, () => {
    const eff = (base: number): Record<Attribute, number> => ({
      RES: base,
      REC: base,
      LLA: base,
      MON: base,
      COL: base,
      CRI: base,
      SPR: base,
      DES: base,
      PAV: 55,
      TAC: base,
    })
    const field: StageRider[] = Array.from({ length: 40 }, (_, i) => ({
      riderId: `r-${i}`,
      eff0: eff(55),
      energy: 100,
      matches: 4,
      tsb: 0,
      orders: { role: 'libre', mentality: 'reservon', contestSprints: false, contestClimbs: false },
      gcDeficitSeconds: 0,
      fragility: 1,
    }))
    const profile = {
      segments: [
        { km: 20, tipo: 'llano' as const },
        { km: 30, tipo: 'paves' as const, estrellas: 4 },
        { km: 10, tipo: 'llano' as const },
      ],
    }
    let crashedFraction = 0
    const runs = 80
    for (let s = 0; s < runs; s++) {
      const seed = stageSeed({
        worldSeed: `pave-${s}`,
        raceId: 'pave',
        stageDay: 1,
        engineVersion: 1,
      })
      const out = simulateStage({ profile, riders: field }, seed)
      /**
       * SOLO LAS CAÍDAS, que es lo que el nombre de este invariante dice y lo que su banda de 5-12 %
       * mide desde que existe.
       *
       * Hasta el paso 13 `incidents` solo llevaba caídas, así que contar incidentes y contar caídas
       * era lo mismo y nadie tuvo que elegir. Con los percances mecánicos (R11) dejan de serlo: un
       * pinchazo viaja por el mismo canal —para el parte y la crónica es la misma cosa, un hombre
       * que se para y pierde tiempo— y **no es una baja**. Medido sin este filtro, el número saltaba
       * al 17,3 % sin que una sola caída más hubiera ocurrido: 3,20 caídas por etapa antes y 3,20
       * después. El diseño avisaba de esto con todas las letras y pedía comprobarlo aparte.
       */
      crashedFraction +=
        new Set(out.incidents.filter((i) => i.tipo === 'caida').map((i) => i.riderId)).size /
        field.length
    }
    const rate = (100 * crashedFraction) / runs
    expect(rate).toBeGreaterThanOrEqual(5)
    expect(rate).toBeLessThanOrEqual(12)
  })
})

describe('cierre del pelotón comprometido (6.17)', () => {
  it('un pelotón comprometido cierra entre 50 y 75 segundos por cada 10 km', () => {
    // Fuga a tempo (0.6) y pelotón a compromiso alto de caza (0.85), mismos punteros (~68).
    let brk = createGroup('brk', ['b'], { compromiso: 0.6 })
    let pel = createGroup('pel', ['p'], { compromiso: 0.85 })
    for (let i = 0; i < 50; i++) {
      brk = advanceGroup(brk, flat, 68, undefined, {})
      pel = advanceGroup(pel, flat, 68, undefined, {})
    }
    const gap0 = pel.tS - brk.tS
    for (let i = 0; i < 100; i++) {
      brk = advanceGroup(brk, flat, 68, undefined, {})
      pel = advanceGroup(pel, flat, 68, undefined, {})
    }
    const cierre = gap0 - (pel.tS - brk.tS)
    expect(cierre).toBeGreaterThanOrEqual(50)
    expect(cierre).toBeLessThanOrEqual(75)
  })
})

describe('inercia acotada (6.17)', () => {
  it('a ritmo de carrera, ningún grupo varía más de 4 km/h entre bloques (fuera de cerillo y descenso)', () => {
    // La cota es ACC_PEDAL·dt; con dx = 0.1 km se mantiene ≤ 4 km/h por encima de ~36 km/h.
    for (let v = 40; v <= 55; v += 1) {
      const dt = blockSeconds(v)
      const deltaMax = accLimit(0) * dt // g = 0: sin regalo de gravedad
      expect(deltaMax).toBeLessThanOrEqual(4)
    }
  })
})
