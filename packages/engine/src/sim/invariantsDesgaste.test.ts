/**
 * Invariantes del DESGASTE (docs/motor.md §VI.1). Salieron de `invariants.test.ts` en la v83 porque
 * ese fichero seguía siendo el tramo más largo de la matriz del CI —33 minutos contra los 12,7 del
 * siguiente— después del primer corte. Ver la nota de reparto allí.
 *
 * Aquí vive la mitad cara de lo que quedaba: la erosión de la reina sintética, la llana y la reina en
 * fresco, y la cola del último grupo.
 */
import { describe, expect, it } from 'vitest'
import type { Attribute } from '@cyclingstar/shared'
import { simulateStage } from '../stage/simulate.js'
import type { StageRider } from '../stage/types.js'
import { analyzeErosion } from './analyze.js'
import {
  campaignSeeds,
  flatScenario,
  longClassicScenario,
  queenScenario,
  queenThirdWeekScenario,
  realQueenThirdWeekScenario,
} from './scenarios.js'
import { TARGETS, type Target } from './targets.js'

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
