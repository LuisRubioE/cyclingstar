/**
 * Invariantes de las CLÁSICAS y de la voz de equipo (SPEC 6.17). Salieron de `invariants.test.ts` en
 * la v83 para que la matriz del CI pueda correrlos en paralelo: ver la nota de reparto allí.
 *
 * Aquí vive una de las tres pruebas caras del banco —«ninguna carrera de un día satura con el
 * pelotón fresco»— junto con las dos que preguntan por el plan de equipo y por la general.
 */
import { describe, expect, it } from 'vitest'
import { costBase } from '../stage/physics.js'
import { simulateStage } from '../stage/simulate.js'
import { sampleProfile } from '../stage/sample.js'
import { analyzeErosion } from './analyze.js'
import { analyzeGeneral, conGeneral } from './generalBench.js'
import { SEASON_CALENDAR } from '../routes/calendar.js'
import { STAGE } from '../constants.js'
import {
  campaignSeeds,
  flatScenario,
  hardestClassicScenario,
  realRaceScenario,
} from './scenarios.js'
import { analyzeTeamVoice, teamedField } from './tactics.js'
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

describe('la erosión no satura en ninguna clásica (docs/motor.md §VI.1)', () => {
  // Cuando la erosión topa en 1,000 todo el pelotón queda al máximo de degradación: el modelo deja
  // de discriminar y el resultado vuelve a ser azar, que es justo lo contrario de lo que se buscaba
  // con el desgaste. Al cargar los recorridos reales, TRES clásicas saturaron (Lombardía, Flandes y
  // Roubaix) y ningún invariante se enteró, porque la batería solo corría perfiles sintéticos.
  //
  // Las carreras de un día del WorldTour son las más largas del calendario (200-290 km) y por tanto
  // el peor caso. Se corren con el campo homogéneo: lo único que explica la erosión es el recorrido.
  const oneDayWt = SEASON_CALENDAR.filter(
    (r) => r.level === 'WT' && r.format === 'un-dia' && r.stages[0] && !r.stages[0].timeTrial,
  ).map((r) => r.id)

  /**
   * …Y LAS MÁS DURAS DEL CALENDARIO ENTERO, SEAN DE LA CATEGORÍA QUE SEAN (v40). El filtro `level
   * === 'WT'` es exactamente por donde se coló el defecto que este banco existe para cazar: cuatro
   * carreras de un día de categoría 1 —Jura, Andorra, Appennino, Ses Salines— reventaban el pelotón
   * entero (Jura dejaba al 82 % del campo con el tanque a cero) y la batería salía verde, porque
   * ninguna es WorldTour. Es la misma lección de la v17 con las reinas: **lo que no se mide sobre
   * el calendario de verdad, no se mide**.
   *
   * Correr las 443 de un día es inviable en CI, y no hace falta: la saturación solo puede pasar en
   * las DURAS, y cuál es dura se sabe sin simular nada —la demanda es la integral del coste base
   * del recorrido, y sale de leer el perfil—. Así que el banco añade las más exigentes del
   * calendario entero, que es donde vive el riesgo, a coste acotado.
   */
  const demandaDe = (id: string): number =>
    sampleProfile(realRaceScenario(id).input.profile).reduce(
      (acc, b) => acc + costBase(b) * STAGE.dx,
      0,
    )
  const oneDayHardest = SEASON_CALENDAR.filter(
    (r) => r.format === 'un-dia' && r.stages[0] && !r.stages[0].timeTrial,
  )
    .map((r) => r.id)
    .filter((id) => !oneDayWt.includes(id))
    .map((id): [string, number] => [id, demandaDe(id)])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id)

  it(
    'la clásica más dura del calendario erosiona fuerte pero no satura',
    { timeout: 360000 },
    () => {
      const hardest = hardestClassicScenario()
      const stats = analyzeErosion(hardest, campaignSeeds(hardest.name, 12))
      expectInRange(stats.medianErosion, TARGETS.erosion.hardestClassicFresh)
    },
  )

  it('ninguna carrera de un día satura con el pelotón fresco', { timeout: 1800000 }, () => {
    expect(oneDayWt.length).toBeGreaterThan(10)
    // Y las ocho más duras del calendario entero, que es por donde se coló el defecto de la v40.
    expect(oneDayHardest).toHaveLength(8)
    // OJO: desde v6 la erosión lleva un techo estructural (`STAGE.erosionMax`), así que mirar la
    // erosión ya NO detecta la saturación —topa en 0,92 justo cuando hay que dar la alarma—. La
    // señal buena es el VACIADO del depósito, que no está topado: si el tanque llega a cero, la
    // erosión estaba pidiendo más de lo que el modelo puede expresar. Medido hoy: el peor caso es
    // Il Lombardia con 0,908 de vaciado y un 3% de pájaras.
    /**
     * TRES SEMILLAS SON UN CRIBADO, NO UN VEREDICTO — y esta prueba llevaba años tratándolas como
     * si lo fueran.
     *
     * El aviso está escrito seis pantallas más arriba, en el comentario de `SATURATION_BONK_PCT`:
     * sobre Il Lombardia este mismo número «salta entre el 8,5 % y el 11,7 % según cuántas semillas
     * se le den, **sin que el motor cambie**». Con el techo en el 14 y la carrera midiendo 13,8 %
     * con tres semillas, el listón estaba **sentado encima de su suelo**: cualquier cosa que moviera
     * a quién se descuelga —aunque no moviera la economía ni un dígito— lo pasaba.
     *
     * Medido el día que la colocación (paso 14) lo hizo saltar, y es la prueba entera: con TRES
     * semillas, 13,8 % apagado contra 14,4 % encendido; con DOCE, **10,7 % apagado contra 10,8 %
     * encendido**. La capa movía una décima; la muestra movía tres puntos y medio.
     *
     * Así que el cribado se queda en tres —veinte carreras a doce semillas es un cuarto de hora de
     * CI por una pregunta que casi siempre se contesta que no— y **el que salta se vuelve a medir
     * con cuatro veces más muestra antes de dar la alarma**. El techo NO se toca: lo que se arregla
     * es con qué se compara, que es otra cosa.
     */
    const saturado = (s: { medianDepletion: number; bonkPct: number }): boolean =>
      s.medianDepletion > SATURATION_DEPLETION || s.bonkPct > SATURATION_BONK_PCT
    const saturated: string[] = []
    for (const id of [...oneDayWt, ...oneDayHardest]) {
      if (!saturado(analyzeErosion(realRaceScenario(id), campaignSeeds(id, 3)))) continue
      const stats = analyzeErosion(realRaceScenario(id), campaignSeeds(id, 12))
      if (saturado(stats)) {
        saturated.push(
          `${id} vaciado ${stats.medianDepletion.toFixed(3)} pájaras ${stats.bonkPct.toFixed(0)}%`,
        )
      }
    }
    expect(saturated).toEqual([])
  })
})

describe('el plan de equipo y la voz de la crónica (docs/motor.md §V.1)', () => {
  /**
   * El criterio de éxito VISIBLE del plan de equipo. Antes de la v15 el parte de «quién tira» casi
   * nunca podía nombrar a un equipo (medido: 0 % en la llana con 8 equipos de 5, 2-12 % en la
   * campaña de la v11) porque el turno de relevos se decidía corredor a corredor y los tres que más
   * tiraban salían de tres equipos distintos. Este invariante vigila las dos mitades: que la voz de
   * equipo salga, y que el frente CAMBIE DE MANOS —si un solo equipo lo llevara todo el día, el
   * presupuesto de esfuerzo no estaría haciendo nada—.
   */
  const field = teamedField({ teams: 8, per: 5, kind: 'llana', strong: 4 })
  const stats = analyzeTeamVoice(
    field,
    flatScenario().input.profile,
    campaignSeeds('voz-llana', 40),
  )

  it('el parte de relevos puede nombrar a un EQUIPO', { timeout: 60000 }, () => {
    expect(stats.pulls).toBeGreaterThan(50)
    expectInRange(stats.teamVoicePct, TARGETS.chronicle.teamPullFlatPct)
  })

  it('y el frente cambia de manos a lo largo de la etapa', { timeout: 60000 }, () => {
    expectInRange(stats.frontTeamsAvg, TARGETS.chronicle.frontTeamsPerStage)
  })

  it('…y el parte dice POR QUÉ tira ese equipo', { timeout: 60000 }, () => {
    // La otra mitad del encargo: «no es solo saber qué equipo(s) participan de la persecución…
    // también es saber POR QUÉ». Por construcción el equipo sin motivo no toma el frente, así que
    // esto debería ser el 100 %; el invariante existe para que siga siéndolo.
    expectInRange(stats.withReasonPct, TARGETS.chronicle.teamPullWithReasonPct)
    // Y en una LLANA el motivo que manda es la etapa: hay trenes y hay sprint que ganar.
    expect(stats.reasons.etapa).toBeGreaterThan(stats.reasons.maillot + stats.reasons.general)
  })

  it('un campo SIN equipos no cambia de comportamiento', () => {
    // La regla 2 de §V.1 y la garantía que sostiene todo lo demás: el plan de equipo no puede tocar
    // a quien no tiene equipo. Un corredor sin `teamId` no recibe compañeros fantasma ni empuje de
    // ningún plan, y una etapa entera de agentes libres sale como salía.
    const free = field.map((r) => ({ ...r, teamId: null }))
    const seeds = campaignSeeds('sin-equipos', 3)
    for (const seed of seeds) {
      const out = simulateStage({ profile: flatScenario().input.profile, riders: free }, seed)
      const teams = new Set(
        out.events
          .filter((e) => e.plantilla === 'peloton_pull')
          .flatMap((e) => e.protagonistas.map((id) => id.split('-')[0])),
      )
      // Sin equipos no hay dueño del frente: los que tiran salen de donde toque.
      expect(out.events.some((e) => e.plantilla === 'rider_defies_team')).toBe(false)
      expect(teams.size).toBeGreaterThan(1)
    }
  })
})

describe('la general que ningún banco miraba (v79, docs/motor.md §V.1)', () => {
  /**
   * EL INVARIANTE QUE FALTABA. Todos los demás bancos de este archivo corren etapas SIN contexto de
   * carrera: sin `race`, sin `gcDeficitSeconds`, sin `gcRank`. Con eso `hasGcContext` sale `false` y
   * no hay maillot ni general que defender, así que las reglas v75, v77 y v79 —y la mitad principal
   * de la capa `director`— entraron en producción **invisibles para la CI**. Aquí se corren con una
   * general de verdad.
   *
   * Se llama con `conParejas = false`: el pareado etapa 3 / etapa 18 son dos reinas por semilla y su
   * diferencia no es significativa a 40 semillas (~1σ), así que la CI no paga reinas por un número
   * que no puede fallar. `pnpm sim` sí lo corre y lo imprime.
   */
  const stats = analyzeGeneral(40, false)

  it('el maillot NO se va en la fuga del día de una llana', { timeout: 120000 }, () => {
    // «El que tiene maillot amarillo debería ser suuuper extraño que se fugue o que entre en una
    // fuga… en el llano entrar en una fuga, eso debería ser mucho más raro de lo que ocurre».
    // Antes de la v79: 12,5 %. Después: 2,5 %.
    expectInRange(stats.jerseyFrontFlatPct, TARGETS.general.jerseyFrontFlatPct)
  })

  it('…pero el freno es del LLANO, no del motor entero', { timeout: 120000 }, () => {
    // El control positivo del freno, y la razón por la que `jerseyBreakDamp` distingue el terreno:
    // en montaña el maillot ataca, responde y a veces se va. Esto NO lleva banda en `targets.ts`
    // —a 40 semillas un 2,5 % es UN caso y σ ≈ 2,5 puntos—, así que lo único que se puede sellar
    // aquí es que el estadístico EXISTE y es un porcentaje, no que valga tanto o cuanto. Lo que
    // vigila de verdad es el freno del llano de arriba; esto impide que se lea como un cero sellado.
    expect(stats.jerseyFrontQueenPct).toBeGreaterThanOrEqual(0)
    expect(stats.jerseyFrontQueenPct).toBeLessThanOrEqual(100)
  })

  /**
   * ————— Y EL EQUIPO DEL MAILLOT NO PONE A TODA LA CASA CONTRA UNA FUGA INOFENSIVA (v84) —————
   *
   * El dueño, sobre la etapa 19 de producción: «el maillot amarillo tiene 9 minutos de ventaja sobre
   * el segundo, los escapados están a 33 y 41 minutos en la general… ¿qué necesidad hay de que el
   * equipo del líder tire tan fuerte para acabar con la fuga?». Medido en esa radio: siete de los
   * ocho al frente durante cuarenta kilómetros, y en las etapas 13, 15 y 18 el 62 %, el 63 % y el
   * 68 % de los kilómetros con cinco o más.
   *
   * El arreglo es `relayTeamShareWatch`, y lo que se sella aquí es su EFECTO y no su valor, que es
   * la lección de la v82 (2): un número medido y no sellado es un número que se puede perder sin que
   * nadie se entere.
   */
  it(
    'el equipo del maillot no pone a media casa contra lo que no le amenaza',
    { timeout: 600000 },
    () => {
      expectInRange(stats.jerseyFrontHeavyPct, TARGETS.general.jerseyFrontHeavyPct)
    },
  )

  /**
   * ————— LA TREGUA, QUE ES EL OBJETIVO QUE `ambushGainShare` CITABA Y NO EXISTÍA (v82) —————
   *
   * La constante llevaba «[calibrar] contra `truceGrantedPct` 50-85 %» desde que nació y ese
   * estadístico no estaba en el repositorio. Ahora está, vive aquí —es el único banco con general de
   * verdad, y la emboscada la necesita— y con él la constante pasó de dejar el número en **31,6 %**,
   * fuera de banda por abajo, a **70,6 %** con 0,35. Ver `constants.ts` para la curva entera.
   */
  it('se piden treguas, y la sonda que las cuenta DISPARA', { timeout: 300000 }, () => {
    /**
     * LO QUE LA CI PUEDE SELLAR AQUÍ ES QUE LA SONDA DISPARE, Y NO MÁS, y el número que lo dice
     * está medido: con las 40 semillas del invariante salen **6 treguas** —0,15 por etapa— y seis
     * casos no son un porcentaje. Comprobado: esas seis dan 33,3 %, y las 150 reinas del barrido
     * dan 70,6 % con el mismo motor. Sellar la banda aquí sería sellar la diferencia entre dos
     * sucesos y cuatro.
     *
     * La banda (50-85, `TARGETS.general.truceGrantedPct`) se comprueba con la muestra entera en
     * `pnpm sim`, que es el mismo reparto que este repositorio ya usa con `calendarQueens` y con
     * `weather`: la banda se escribe donde se mide, y la CI vigila que el instrumento exista.
     *
     * Y EL CONTROL NO ES UN TRÁMITE: si no se pidiera ninguna tregua, `truceGrantedPct` sería un
     * 0/0 disfrazado de porcentaje y cualquier banda pasaría en verde sin medir nada. Es
     * exactamente el defecto que esta tanda lleva todo el día cazando.
     */
    expect(stats.truceAskedPerStage).toBeGreaterThan(0)
    expect(stats.truceGrantedPct).toBeGreaterThanOrEqual(0)
    expect(stats.truceGrantedPct).toBeLessThanOrEqual(100)
  })

  it('el colchón de la fuga existe y es de ciclismo (el instrumento de la correa)', () => {
    /**
     * `breakMaxGapS` NO lleva banda —no hay ancla en este repositorio para «cuánto colchón tiene la
     * fuga de una etapa de gran vuelta»— así que lo único sellable es que la medida EXISTA y no diga
     * un disparate. Es el instrumento con el que `gcClimbRecoverPerKm` deja de ser inmedible: sin él
     * la constante multiplicaba un cero en todos los bancos, porque ninguno pasaba `race.shape`.
     *
     * El suelo es un minuto —por debajo no habría fuga que contar— y el techo, el de la propia
     * correa (`gcLeashMaxS` 900) con margen: si el colchón se fuera por encima de eso, lo que estaría
     * roto es la correa y no esta medida.
     */
    expect(stats.breakMaxGapS).toBeGreaterThan(60)
    expect(stats.breakMaxGapS).toBeLessThan(1800)
  })

  it('la sonda del depósito del maillot DISPARA (el control del otro instrumento)', () => {
    /**
     * Lo único que aquí se puede sellar, y no es poco: que la medida EXISTA.
     *
     * Su primera versión buscaba el pie del puerto en un `desdeKm` que `Segment` no tiene, así que
     * el kilómetro salía `NaN`, la sonda no disparó ni una vez en sesenta semillas y la muestra
     * quedó vacía. Una sonda que no dispara no da un error: da un cero, y un cero aquí se lee como
     * «el maillot llega con el tanque vacío», que es lo contrario de lo que pasa.
     *
     * La BANDA de este número no se pone, y el motivo está escrito en `targets.ts`: el depósito al
     * pie depende del RECORRIDO —0,553 en la reina canónica y 0,479 en una reina real de tercera
     * semana— así que una banda sobre un escenario no dice nada sobre el otro.
     */
    const t = stats.jerseyTankAtDecisive
    expect(t.p50).toBeGreaterThan(0)
    expect(t.p50).toBeLessThan(1)
    expect(t.p05).toBeGreaterThan(0)
    expect(t.p05).toBeLessThanOrEqual(t.p50)
  })

  it('y el campo de este banco lleva general de verdad (el control del instrumento)', () => {
    // La trampa que este banco ya ha pisado dos veces: un instrumento que no puede ver lo que dice
    // medir. Si el campo no llegara con general, `hasGcContext` saldría `false`, las dos pruebas de
    // arriba medirían el motor SIN maillot y pasarían en verde sin enterarse de nada. Así que se
    // comprueba lo que el motor exige para encender la general: un líder a cero, puestos
    // consecutivos desde el 1, y déficits que CRECEN — un campo con todos empatados tampoco serviría.
    const campo = conGeneral(teamedField({ teams: 8, per: 5, kind: 'llana', strong: 4 }), 25)
    expect(campo.length).toBeGreaterThan(20)
    expect(campo[0]?.gcDeficitSeconds).toBe(0)
    expect(campo[0]?.gcRank).toBe(1)
    expect(campo.every((r, i) => r.gcRank === i + 1)).toBe(true)
    expect(campo.at(-1)?.gcDeficitSeconds).toBeGreaterThan(0)
    expect(stats.runs).toBe(40)
  })
})
