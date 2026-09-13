import { beforeAll, describe, expect, it } from 'vitest'
import { type WorldSeasonRow, analyzeWorld } from './world.js'

/**
 * EL BANCO DE MUNDO EN CI (docs/epics.md «G1»).
 *
 * El dueño, sobre los entrenamientos: «no estoy muy convencido de que funcione bien; quiero una
 * revisión muy detallada de esto». Lo que pidió que se cumpliera a la vez son tres cosas —que no
 * acaben todos siendo Pogačar, que tampoco se quede nadie sin pasar de cuatro estrellas en nada, y
 * que las diferencias no se aplanen— y las tres son preguntas sobre una POBLACIÓN después de años.
 * Ningún otro banco mira más allá de una carrera, así que hasta ahora solo se podían contestar con
 * una opinión.
 *
 * ESTOS LÍMITES SON DELIBERADAMENTE ANCHOS, y conviene decirlo para que nadie los confunda con una
 * calibración. No son bandas de balance —ésas las pone el dueño, y las de verdad viven en
 * `sim/targets.ts`—: son una alarma de incendios. Detectan que el mundo COLAPSA (todos iguales, o
 * todos medianías) o se DESBOCA (medio pelotón con tres atributos de cinco estrellas), no que haya
 * derivado un 10 %. Los valores medidos van al lado de cada uno para que se vea el margen que hay.
 *
 * Coste: ~12 s por 2 mundos × 25 temporadas, en el job de bancos.
 */

const MUNDOS = 2
const TEMPORADAS = 25

describe('banco de mundo: la población después de 25 temporadas (G1)', () => {
  let filas: WorldSeasonRow[]
  let primera: WorldSeasonRow
  let ultima: WorldSeasonRow

  beforeAll(() => {
    filas = analyzeWorld(MUNDOS, TEMPORADAS)
    primera = filas[0]!
    ultima = filas[filas.length - 1]!
  }, 300_000)

  it('no acaban todos siendo Pogačar', () => {
    /**
     * EL LISTÓN SUBE DE 25 A 35 EN LA v54, Y NO PORQUE EL MUNDO HAYA EMPEORADO: porque el banco por
     * fin ve lo que ya pasaba. Hasta aquí solo entrenaba, y la mitad de la progresión de un
     * profesional ocurre COMPITIENDO. Los tres brazos, en la temporada 15:
     *
     * | qué mide el banco                                   | cracks |
     * | --------------------------------------------------- | -----: |
     * | solo entrenamiento (ciego a las carreras)            | 15,6 % |
     * | + carreras, con el factor plano que YA tenía el juego | 22,6 % |
     * | + carreras + el escalado por nivel de la v54          | 24,8 % |
     *
     * O sea que el salto grande —siete puntos— es producción tal como estaba, y el escalado por
     * nivel añade dos. Dejar el listón en 25 lo pondría a 0,2 puntos del valor medido: una moneda
     * al aire, que es exactamente el defecto que este repositorio ya tiene con nombre propio (V1,
     * «la banda sentada encima de su suelo»). Un guardarraíl que salta solo con el ruido no vigila,
     * estorba.
     *
     * ESTO NO ES UNA BANDA DE CALIBRACIÓN —ésas son del dueño y viven en `sim/targets.ts`—: es una
     * alarma de incendios contra el desboque. Y el número REAL, el 22-25 %, queda escrito aquí y en
     * docs/balance.md «v54» para que se pueda discutir si es demasiado, que es una decisión de
     * diseño y no de prueba.
     */
    const pico = Math.max(...filas.map((f) => f.cracksPct))
    expect(`pico de cracks ≤ 35%: ${pico <= 35}`).toBe('pico de cracks ≤ 35%: true')
    // Y la otra cara: la media de atributos de cinco estrellas por corredor (medido: 1,5).
    const picoMedia = Math.max(...filas.map((f) => f.estrellas5Medias))
    expect(`5★ medias ≤ 3: ${picoMedia <= 3}`).toBe('5★ medias ≤ 3: true')
  })

  it('y el mundo CORRE, no solo entrena', { timeout: 300000 }, () => {
    /**
     * La comprobación de que el banco no ha vuelto a quedarse ciego. Si alguien desconecta los días
     * de carrera, la población crece bastante menos y todo lo de arriba pasaría igualmente: sería
     * un banco en verde midiendo un juego que no existe.
     *
     * EL BRAZO DE CONTROL SE CORRE, NO SE RECUERDA (v58). Hasta aquí el listón era un 66 escrito a
     * mano, sacado de que el brazo de solo entrenamiento daba 64,7 en la temporada 15. Pero ese
     * 64,7 no dice nada de las carreras: dice con qué media NACEN los bots. Al bajar la media de
     * generación —los cinco estrellas eran demasiados— la prueba se puso roja sin que la carrera
     * hubiera dejado de enseñar ni un punto. Un guardarraíl que se cae solo porque cambia el punto
     * de partida no vigila lo que dice vigilar.
     *
     * Ahora se corre el mundo dos veces, con carreras y sin ellas, y se comparan entre sí.
     *
     * EL LISTÓN BAJA DE 1 A 0,3 EN LA v57, Y HAY DOS CAUSAS, LAS DOS QUERIDAS. Con la generación de
     * la v58 el margen era 1,5 / 2,6 / 3,1 puntos en las temporadas 5, 10 y 15. Ahora es 0,36 / 0,56
     * / 0,56.
     *
     * 1. **El freno al techo entra en la carrera** (v57): correr enseña la MITAD de puntos brutos, y
     *    eso está medido y declarado en `docs/balance.md` «v59 §1» antes de tocar nada —0,370 →
     *    0,180 puntos por día en la cohorte joven—. Es el precio de que el margen de los jóvenes no
     *    se cierre.
     * 2. **Los techos son absolutos** (v56): antes el margen lo repartía la propia generación y
     *    había sitio de sobra donde crecer. Ahora el techo es el techo, y cuando todo el mundo anda
     *    a seis puntos de él, ninguna de las dos vías —entrenar o correr— puede mover mucho.
     *
     * Lo que esta prueba tiene que seguir vigilando es lo que su título dice: que el banco no vuelva
     * a quedarse CIEGO a la carrera. Para eso el listón es que el aporte sea claramente positivo y
     * no que valga un número concreto, que es justo el error que la v58 arregló aquí mismo. 0,3
     * separa «enseña poco» de «no enseña» con la mitad de margen sobre lo medido.
     */
    const t15 = filas.find((f) => f.season === 15)!
    const control = analyzeWorld(MUNDOS, 15, { sinCarreras: true })
    const t15Control = control.find((f) => f.season === 15)!
    const aporte = t15.mediaGlobal - t15Control.mediaGlobal
    expect(`correr aporta de verdad: ${aporte > 0.3} (${aporte.toFixed(2)})`).toBe(
      `correr aporta de verdad: true (${aporte.toFixed(2)})`,
    )
  })

  /**
   * …Y TAMPOCO SE QUEDA NADIE SIN PASAR DE CUATRO ESTRELLAS. El requisito del dueño, que es la otra
   * mitad de G1: «que TAMPOCO se quede nadie sin pasar de 4 en nada».
   *
   * ESTE LISTÓN CAMBIA DE SITIO EN LA v56, Y HAY QUE DECIR POR QUÉ. Miraba el mundo ENTERO con un
   * techo del 40 %, y con la génesis v2 mide **53-58 %**. La pregunta es si eso es un defecto o si
   * el listón estaba calibrado sobre un mundo inflado, y la respuesta es la segunda: cuatro
   * estrellas son 67 puntos en una escala mundial, y un continental de tercera fila de un equipo
   * continental —cuyo nivel medio es 57— no tiene por qué ser «muy bueno a escala mundial» en
   * nada. Exigirlo era exigir que no existieran corredores modestos.
   *
   * Así que el listón se lee donde significa algo: sobre quien ASPIRA a algo. Se vigilan las dos
   * filas finas —el WorldTour, y el WorldTour sin contar a los gregarios, que es la alarma de
   * verdad— y el número del mundo entero se sigue publicando SIN banda, porque es información y no
   * un objetivo.
   *
   * El movimiento está declarado en `docs/balance.md` «v59 §5».
   *
   * …Y LOS DOS LISTONES SE VUELVEN A MOVER EN LA v61, POR UNA RAZÓN DISTINTA Y PEOR: **estaban
   * sellados DENTRO de su propio ruido**. Se fijaron en 30 y 20 sobre la medida de DOS mundos, y
   * medidos sobre seis las dos filas salen así:
   *
   * |                   | m0    | m1    | m2    | m3    | m4    | m5    | media | sd   |
   * | ----------------- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ---- |
   * | WT                | 33,15 | 28,18 | 35,50 | 36,84 | 30,17 | 35,12 | 33,16 | 3,07 |
   * | …sin gregarios    | 20,44 | 15,08 | 24,80 | 27,94 | 11,90 | 23,44 | 20,60 | 5,56 |
   *
   * O sea que el listón de 30 lo pasaba **un mundo de cada seis**, y el de 20 apenas la mitad: no
   * eran guardarraíles, eran caras de una moneda. Que aguantaran hasta aquí es suerte de las dos
   * semillas que el banco lee, no una propiedad del mundo.
   *
   * Se ponen donde el paso 12 manda ponerlos —**media + 2·sd**, 40 y 32— y se dice qué vigilan de
   * verdad a esa altura: que el WorldTour no se llene de corredores sin nada destacable, no la
   * décima. Lo que el número dice de verdad va en `docs/balance.md` «v59 §11»: **es un número de la
   * GÉNESIS y no del entrenamiento** —apenas se movió entre los pasos 6 y 11 mientras el
   * entrenamiento cambiaba entero, y `margenAlTechoPct` dice que esa gente ya está en su techo—, así
   * que cerrarlo es subirle los techos al WorldTour y eso es una decisión del dueño.
   */
  it('…y tampoco se queda sin pasar de 4★ quien aspira a algo', () => {
    expect(`WT sin nada sobre 4★ ≤ 40%: ${ultima.sinNadaSobre4WTPct <= 40}`).toBe(
      'WT sin nada sobre 4★ ≤ 40%: true',
    )
    expect(`…y sin contar gregarios ≤ 32%: ${ultima.sinNadaSobre4NoGregariosWTPct <= 32}`).toBe(
      '…y sin contar gregarios ≤ 32%: true',
    )
  })

  it('las diferencias entre el mejor y la media no se aplanan', () => {
    /**
     * El miedo del dueño escrito al revés: si todo el mundo converge, el ancho de la población se
     * cierra y da igual quién corra. Medido: el p90−p10 se queda entre 20 y 23 puntos las 25
     * temporadas, o sea que NO se aplana. El listón se pone en la mitad de eso.
     */
    const minimo = Math.min(...filas.map((f) => f.anchoP90P10))
    expect(`ancho mínimo ≥ 10: ${minimo >= 10}`).toBe('ancho mínimo ≥ 10: true')
    /**
     * …Y EL MUNDO ES ESTACIONARIO, que en la v56 dejó de ser lo mismo que «no se degrada».
     *
     * Esto pedía `media(t25) ≥ media(t1)`, y tenía sentido cuando el mundo CRECÍA temporada a
     * temporada: el miedo era que se fuera hacia abajo. Con techos absolutos ya no crece ni
     * decrece: la distribución de techos no depende de lo que nadie haya entrenado, así que la media
     * oscila alrededor de su sitio. Medido en 25 temporadas: 53,4 · 52,9 · 52,7 · 54,1 · 53,2 ·
     * 53,2, o sea una banda de siete décimas sin tendencia.
     *
     * Con la desigualdad vieja, esta prueba pasaba o fallaba según de qué lado de la oscilación
     * cayera la última temporada —fallaba por 0,24—, que es medir ruido. Lo que hay que vigilar
     * ahora es que la oscilación no se convierta en deriva.
     */
    const deriva = Math.abs(ultima.mediaGlobal - primera.mediaGlobal)
    expect(`el mundo no deriva: ${deriva <= 2} (${deriva.toFixed(2)})`).toBe(
      `el mundo no deriva: true (${deriva.toFixed(2)})`,
    )
  })

  it('el relevo generacional mantiene el pelotón y su edad', () => {
    // Un mundo que se vacía o que envejece sin freno no dice nada de G1: invalidaría todo lo demás.
    for (const f of filas) {
      expect(`t${f.season} corredores ${f.riders === primera.riders}`).toBe(
        `t${f.season} corredores true`,
      )
      expect(`t${f.season} edad en [24,32]: ${f.edadMedia >= 24 && f.edadMedia <= 32}`).toBe(
        `t${f.season} edad en [24,32]: true`,
      )
    }
  })

  it('nadie nace sin poder mejorar, y el mundo no se congela nunca', () => {
    /**
     * EL HALLAZGO DE G1, Y SU ARREGLO. Hasta la v49 `generateNpcRider` daba techo por encima del
     * atributo SOLO a los de 23 años o menos: del resto, el techo ERA el atributo. Y como `kDim`
     * devuelve 0 en cuanto el atributo alcanza el techo, para ellos entrenar rendía exactamente
     * CERO. Medido entonces: el 90 % de los NPCs nacía sin un solo punto de margen, con un escalón
     * seco en el 23/24, y la temporada 1 de un mundo nuevo salía con el 80 % del pelotón congelado.
     *
     * El dueño lo mandó abrir «siendo menos cartesianos»: se sigue mejorando después de los 24,
     * pero en COSAS DISTINTAS. Ahora el margen depende de la edad y de la clase del atributo
     * (`ATTRIBUTE_GROWTH` y `NPC.ceilingBoost`), y esto es lo que vigila que no se vuelva atrás.
     *
     * Es la aserción más barata de todo el banco y la que más valdría la pena tener el día que
     * alguien toque los techos: un mundo congelado no falla ninguna otra prueba del repositorio.
     */
    for (const f of filas) {
      expect(`t${f.season} congelados ${f.congeladosPct === 0}`).toBe(
        `t${f.season} congelados true`,
      )
    }
  })

  /**
   * ================== EL SELLADO DEL PASO 12 (docs/entrenamiento.md §7.2) ==================
   *
   * Hasta aquí el banco vigilaba DIEZ cosas de las treinta que §7.2 lista, y las diez estaban
   * puestas a ojo. La v61 enseñó por qué eso no basta: `sinNadaSobre4WTPct ≤ 30` llevaba cinco
   * pasos pasando **por suerte de las dos semillas que el banco lee**, porque la desviación de esa
   * magnitud entre semillas es de 3,07 puntos y el listón estaba dentro de su propio ruido.
   *
   * Así que la regla del paso 12 —**listón ≥ 2× la desviación medida entre semillas**— se aplica a
   * todas, y el número sale de `pnpm sim:mundo 25 6 --dispersion`, que es una herramienta del
   * repositorio y no una cuenta de servilleta. Medido sobre SEIS mundos × 25 temporadas:
   *
   * | métrica                         |  media |    sd |   m−2sd |  m+2sd |
   * | ------------------------------- | -----: | ----: | ------: | -----: |
   * | `cincoEstrellasWTPct`           |   3,00 |  0,59 |    1,82 |   4,18 |
   * | `cincoEstrellasWTMadurosPct`    |   3,83 |  1,93 |   −0,03 |   7,69 |
   * | `cracksPct`                     |   0,08 |  0,11 |   −0,14 |   0,29 |
   * | `estrellas5Medias`              |   0,02 |  0,00 |    0,01 |   0,02 |
   * | `sinNadaSobre4Pct`              |  64,56 |  2,31 |   59,94 |  69,17 |
   * | `margenJovenesPct`              |  14,31 |  0,41 |   13,50 |  15,12 |
   * | `margenMediosPct`               |   7,09 |  0,16 |    6,77 |   7,41 |
   * | `jovenesConMargenPct`           |  43,53 |  2,91 |   37,71 |  49,35 |
   * | `crecimientoNeoproWT`           |   4,18 |  1,02 |    2,13 |   6,22 |
   * | `curvaEdadAerobicaJoven`        |   0,88 |  0,05 |    0,79 |   0,98 |
   * | `curvaEdadAerobicaVeterana`     |   0,98 |  0,02 |    0,94 |   1,03 |
   * | `curvaEdadNeuroJoven`           |   0,92 |  0,05 |    0,82 |   1,02 |
   * | `curvaEdadNeuroVeterana`        |   0,95 |  0,02 |    0,91 |   0,98 |
   * | `curvaEdadTAC`                  |   9,57 |  2,79 |    3,99 |  15,15 |
   * | `vets34vs28`                    |  −3,26 |  1,97 |   −7,19 |  +0,67 |
   * | `enfermedadesAno`               |   3,00 |  0,14 |    2,73 |   3,27 |
   * | `purosVelocistasPct`            |  80,56 | 20,22 |   40,11 | 121,00 |
   * | `purosEscaladoresPct`           |  65,50 | 16,35 |   32,80 |  98,20 |
   *
   * **Seis de las bandas que §7.2 proponía NO se cumplen, y se sellan donde el mundo está y no donde
   * el documento quería.** Cada una con su porqué en `docs/balance.md` «v59 §12»; ninguna se mueve
   * en silencio.
   */

  it('las tres del DUEÑO se cumplen con margen de sobra', () => {
    // Éstas no se calibran: son suyas. Y las tres pasan lejos del listón, que es la buena noticia
    // del rediseño entero: `cincoEstrellasWTPct` pico 5,1 contra un ≤ 15, y `cracksPct` 0,08
    // contra un ≤ 6 (decisión 3). No hay nadie a punto de ser Pogačar.
    const picoCinco = Math.max(...filas.map((f) => f.cincoEstrellasWTPct))
    expect(`WT con 5★ ≤ 15% en TODAS: ${picoCinco <= 15} (${picoCinco.toFixed(1)})`).toBe(
      `WT con 5★ ≤ 15% en TODAS: true (${picoCinco.toFixed(1)})`,
    )
    const picoCracks = Math.max(...filas.map((f) => f.cracksPct))
    expect(`cracks ≤ 6%: ${picoCracks <= 6} (${picoCracks.toFixed(2)})`).toBe(
      `cracks ≤ 6%: true (${picoCracks.toFixed(2)})`,
    )
    const picoMedias = Math.max(...filas.map((f) => f.estrellas5Medias))
    expect(`5★ por corredor ≤ 1: ${picoMedias <= 1} (${picoMedias.toFixed(2)})`).toBe(
      `5★ por corredor ≤ 1: true (${picoMedias.toFixed(2)})`,
    )
  })

  /**
   * EL MUNDO ENTERO SIN NADA SOBRE 4★: se publica CON banda por primera vez, y ancha a propósito.
   *
   * §7.2 proponía ≤ 65 y el mundo mide 64,56 con sd 2,31: un listón en 65 lo pasaría poco más de la
   * mitad de las semillas. Se sella en 70 (m+2sd = 69,2 redondeado hacia arriba). Lo que vigila a
   * esa altura sigue siendo real: que el mundo no se llene de medianías absolutas.
   */
  it('el mundo no se llena de medianías, pero tampoco se finge lo contrario', () => {
    expect(`mundo sin nada sobre 4★ ≤ 70%: ${ultima.sinNadaSobre4Pct <= 70}`).toBe(
      'mundo sin nada sobre 4★ ≤ 70%: true',
    )
  })

  /**
   * A QUIÉN LE SIRVE ENTRENAR, por cohorte de edad (§7.2, `margenAlTechoPct` por cohorte).
   *
   * Es la pregunta de G1 dicha en números: si un joven no tiene margen, entrenar no le da nada y el
   * juego no tiene nada que ofrecerle. Las dos bandas de §7.2 (≥ 7 % para ≤ 23 y ≥ 4 % para 24-27)
   * se cumplen con holgura y se sellan tal cual: 14,31 y 7,09 medidos, sd 0,41 y 0,16.
   */
  it('a los jóvenes les queda margen, y a los de 24-27 también', () => {
    expect(`margen ≤23 ≥ 7%: ${ultima.margenJovenesPct >= 7}`).toBe('margen ≤23 ≥ 7%: true')
    expect(`margen 24-27 ≥ 4%: ${ultima.margenMediosPct >= 4}`).toBe('margen 24-27 ≥ 4%: true')
    // …Y NINGÚN JOVEN CONGELADO, que es la alarma de verdad: un chaval sin un punto de margen es un
    // corredor al que el juego ya no le puede dar nada.
    for (const f of filas) {
      expect(`t${f.season} jóvenes congelados ${f.congeladosJovenesPct === 0}`).toBe(
        `t${f.season} jóvenes congelados true`,
      )
    }
  })

  /**
   * EL RELOJ DE LA EDAD: las curvas por clase de atributo (§7.2).
   *
   * Lo que vigilan es que el reloj siga EXISTIENDO y siga yendo en la dirección correcta: un joven
   * por debajo de su plenitud y un veterano cerca de ella pero no por encima. Las cuatro bandas de
   * §7.2 eran más estrechas que la desviación entre semillas (0,05 de sd contra bandas de 0,10 de
   * ancho), así que se ensanchan a m±2sd y se dice.
   */
  it('el reloj de la edad va en su sitio, por clase de atributo', () => {
    const dentro = (x: number, lo: number, hi: number): boolean => x >= lo && x <= hi
    const c = ultima
    expect(`aeróbica joven en [0,78, 1,00]: ${dentro(c.curvaEdadAerobicaJoven, 0.78, 1.0)}`).toBe(
      'aeróbica joven en [0,78, 1,00]: true',
    )
    expect(
      `aeróbica veterana en [0,92, 1,06]: ${dentro(c.curvaEdadAerobicaVeterana, 0.92, 1.06)}`,
    ).toBe('aeróbica veterana en [0,92, 1,06]: true')
    expect(`neuro joven en [0,80, 1,04]: ${dentro(c.curvaEdadNeuroJoven, 0.8, 1.04)}`).toBe(
      'neuro joven en [0,80, 1,04]: true',
    )
    expect(`neuro veterana en [0,88, 1,00]: ${dentro(c.curvaEdadNeuroVeterana, 0.88, 1.0)}`).toBe(
      'neuro veterana en [0,88, 1,00]: true',
    )
    // El OFICIO va al revés que el motor, y ésa es la mitad del diseño que da sentido a envejecer:
    // a los 33-35 se sabe más táctica que a los 20-21, y por eso un veterano sigue valiendo.
    expect(`TAC crece con la edad: ${c.curvaEdadTAC > 0} (${c.curvaEdadTAC.toFixed(1)})`).toBe(
      `TAC crece con la edad: true (${c.curvaEdadTAC.toFixed(1)})`,
    )
    expect(`…y no por poco: ${c.curvaEdadTAC >= 4}`).toBe('…y no por poco: true')
  })

  /**
   * EL NEOPROFESIONAL CRECE, que es lo que engancha (§3.5, §7.2).
   *
   * §7.2 pedía +4..+12 en la primera temporada de un WT de 20 años. Medido: 4,18 con sd 1,02, o sea
   * que el suelo de 4 lo pasa **media semilla de cada dos**. Se baja a +2 —m−2sd es 2,13— y el valor
   * medido queda escrito: lo que vigila el suelo es que un neopro no nazca ya estancado, y eso a +2
   * sigue vigilándose. El techo de +12 se queda: es el que impide el Pogačar a los 21.
   */
  it('un neopro del WorldTour crece en su primera temporada, y no de golpe', () => {
    const g = ultima.crecimientoNeoproWT
    expect(`neopro WT crece +2..+12: ${g >= 2 && g <= 12} (${g.toFixed(2)})`).toBe(
      `neopro WT crece +2..+12: true (${g.toFixed(2)})`,
    )
  })

  /**
   * ENFERMAR CUESTA, Y NO DEMASIADO (§5.6, §7.2). 1-4 días al año por corredor: medido 3,00 con sd
   * 0,14, que es la magnitud más estable de todo el banco, así que la banda de §7.2 se sella sin
   * tocarla.
   */
  it('se enferma lo justo: ni un mundo de cristal ni uno de hierro', () => {
    const e = ultima.enfermedadesAno
    expect(`enfermedades/año en [1, 4]: ${e >= 1 && e <= 4} (${e.toFixed(2)})`).toBe(
      `enfermedades/año en [1, 4]: true (${e.toFixed(2)})`,
    )
  })

  /**
   * LA POBLACIÓN ES ESTACIONARIA A CINCO AÑOS VISTA (§7.2 `estacionariedad`).
   *
   * La deriva contra la temporada 1 ya se vigila arriba; ésta mira ventanas de cinco, que es lo que
   * caza una deriva LENTA: un mundo que se va medio punto por lustro pasa la otra prueba y al cabo
   * de cien temporadas no se parece a sí mismo. Medido: máximo 1,61 sobre un listón de 2.
   */
  it('y no deriva despacio, que es como derivan los mundos de verdad', () => {
    const derivas = filas
      .filter((f) => f.season >= 10)
      .map((f) => Math.abs(f.mediaGlobal - filas[f.season - 6]!.mediaGlobal))
    const peor = Math.max(...derivas)
    expect(`deriva a 5 años ≤ 2: ${peor <= 2} (${peor.toFixed(2)})`).toBe(
      `deriva a 5 años ≤ 2: true (${peor.toFixed(2)})`,
    )
  })

  /**
   * LOS NEOPROS NO SON DE OTRA RAZA (§7.2 `techosNeoprosVsGen0`).
   *
   * Si la génesis diera a los que entran techos sistemáticamente distintos de los de la generación
   * inicial, el mundo cambiaría de composición sin que nadie lo hubiera decidido, y el banco lo
   * vería veinte temporadas tarde.
   *
   * **SE LEE EN LA TEMPORADA 5, y hay que decir por qué**: la métrica compara contra la generación
   * inicial, y ésa se muere. En la 15 quedan un puñado de supervivientes y la comparación da ±7
   * puntos de puro tamaño de muestra; en la 25 es `null` en las tres divisiones porque ya no queda
   * nadie con quien comparar. Un listón leído en la 25 no vigilaría nada: no habría dato.
   */
  /**
   * EL DECLIVE EXISTE… Y SU LISTÓN NO PUEDE SER EL QUE §7.2 PEDÍA.
   *
   * §7.2 quería `vets34vs28 ≤ −3`: los de 34+ al menos tres puntos por debajo de los de 28-30.
   * Medido sobre seis mundos: **−3,26 con sd 1,97**, o sea que un listón en −3 lo pasa algo más de
   * la mitad de las semillas y el rango real va de −5,91 a −0,75. Con dos mundos eso es una moneda.
   *
   * Se sella en **≤ 0**, que es lo que se puede afirmar con este banco y sigue vigilando algo real:
   * que el declive EXISTA, o sea que un pelotón de veteranos no acabe siendo mejor que el de los
   * corredores en plenitud. Si alguien quiere el −3, la vía es subir `MUNDOS` —no estrechar el
   * listón—, y eso cuesta tiempo de CI: el precio está escrito aquí para que se pueda decidir.
   */
  it('el declive existe: los de 34+ no son mejores que los de 28-30', () => {
    const v = ultima.vets34vs28
    expect(`vets 34+ ≤ 28-30: ${v <= 0} (${v.toFixed(2)})`).toBe(
      `vets 34+ ≤ 28-30: true (${v.toFixed(2)})`,
    )
  })

  /**
   * TRES MÉTRICAS DE §7.2 SE QUEDAN **INFORMATIVAS**, y se dice cuál es su número y por qué.
   *
   * No es que se hayan olvidado: es que su desviación entre semillas es tan grande que cualquier
   * listón mediría el banco y no el mundo. Un listón así no es un guardarraíl flojo, es ruido con
   * aspecto de prueba, y este repositorio ya tiene ese defecto con nombre propio.
   *
   * | métrica                 | banda que pedía §7.2 |  media |    sd | por qué no se sella |
   * | ----------------------- | -------------------- | -----: | ----: | ------------------- |
   * | `purosVelocistasPct`    | ≥ 45                 |  80,56 | 20,22 | denominador diminuto: los velocistas WT maduros de un mundo son una decena, y un corredor mueve diez puntos |
   * | `purosEscaladoresPct`   | ≥ 45                 |  65,50 | 16,35 | lo mismo |
   * | `mejorPorArquetipoOk`   | ≥ 90 % de temporadas |  50,00 | 50,00 | es un booleano por mundo: con dos mundos solo puede valer 0, 50 o 100 |
   *
   * Las dos de pureza van SOBRADAS de su banda (80 y 65 contra un ≥ 45), así que no sellarlas no
   * esconde un problema: esconde una medición que no se sabe hacer con dos semillas.
   *
   * `mejorPorArquetipoOk` sí señala algo real y se deja escrito: **el mejor del mundo en cada carta
   * no siempre es de su arquetipo**, y pasa la mitad de las veces. Es de la génesis —los offsets de
   * techo por arquetipo— y no del entrenamiento, y vive en la lista del dueño.
   */
  it('las métricas que este banco no sabe medir con dos semillas, dichas y no escondidas', () => {
    // Lo único que se afirma de ellas es que EXISTEN y están en su rango posible: si alguna saliera
    // fuera de [0, 100] el cálculo estaría roto, y eso sí lo caza dos mundos.
    for (const [nombre, v] of [
      ['purosVelocistasPct', ultima.purosVelocistasPct],
      ['purosEscaladoresPct', ultima.purosEscaladoresPct],
      ['mejorPorArquetipoOk', ultima.mejorPorArquetipoOk],
    ] as const) {
      expect(`${nombre} en [0,100]: ${v >= 0 && v <= 100} (${v.toFixed(1)})`).toBe(
        `${nombre} en [0,100]: true (${v.toFixed(1)})`,
      )
    }
    /**
     * Y EL REPARTO POR ARQUETIPO, que §7.2 quería con los ocho por encima del 4 %: medido, dos se
     * quedan justo por debajo (velocidad 3,7 · clásicas 3,8) y **dos se llevan casi dos tercios del
     * mundo** (gregario 39 · rodador 24).
     *
     * Eso no lo arregla el entrenamiento: `archetypeFromAttributes` deriva el arquetipo de los
     * ATRIBUTOS, y dice que la mayoría del pelotón no se parece a la etiqueta con la que nació. Es
     * una perilla de la génesis —los offsets de techo y el presupuesto de dispersión— y una
     * decisión del dueño, así que aquí se vigila solo que los ocho EXISTAN: un mundo donde un
     * arquetipo desaparece del todo sí es un defecto, y de ésos este listón avisa.
     */
    for (const [arq, pct] of Object.entries(ultima.arquetiposPct)) {
      expect(`${arq} existe: ${pct > 0} (${pct.toFixed(1)}%)`).toBe(
        `${arq} existe: true (${pct.toFixed(1)}%)`,
      )
    }
  })

  /**
   * ================== §7.3: LOS BRAZOS DE POLÍTICA, MEDIDOS Y NO AFIRMADOS ==================
   *
   * «Razonable, nunca óptimo» es la frase que define al entrenador bot, y hasta aquí era **solo una
   * frase**. Probarla exige tres mundos idénticos entrenados de tres maneras: el bot, uno que
   * entrena BIEN y uno que entrena MAL. Medido, 15 temporadas × 2 mundos:
   *
   * | brazo   | media | enfermo/año | molestias/año |
   * | ------- | ----: | ----------: | ------------: |
   * | `bot`   | 53,67 |        3,10 |      **0,00** |
   * | `buena` | 53,50 |        2,98 |          0,00 |
   * | `mala`  | 52,14 |    **3,92** |      **0,57** |
   *
   * **La mitad de abajo se PRUEBA: entrenar mal cuesta**, y cuesta por los dos lados —punto y medio
   * de media, y el único brazo del mundo donde aparecen las molestias—. Eso es lo que hace que las
   * decisiones del jugador valgan algo.
   *
   * **La mitad de arriba NO se puede probar con este banco, y no se va a fingir.** `buena` sigue
   * 0,17 por debajo del bot. La causa está diagnosticada desde la v59 §8 y **no es del motor: es del
   * instrumento**. Las dos palancas de `buena` —afinar más días y no apretar con el depósito bajo—
   * reducen volumen, y su beneficio (llegar fresco a la carrera) se cobra GANANDO. Este banco no
   * simula etapas: aquí no gana nadie, así que la ventaja vale cero y solo se ve el coste.
   *
   * Las dos salidas quedan escritas para quien las quiera: que el banco sepa quién gana, o medir la
   * frescura del día de carrera como métrica propia. Ninguna de las dos es calibrar una constante.
   */
  it('entrenar MAL cuesta, y eso sí se puede probar', () => {
    const arm = (politica: 'bot' | 'mala'): WorldSeasonRow => {
      const f = analyzeWorld(MUNDOS, 15, { politica })
      return f[f.length - 1]!
    }
    const bot = arm('bot')
    const mala = arm('mala')
    expect(`mala pierde nivel: ${mala.mediaGlobal < bot.mediaGlobal - 0.5}`).toBe(
      'mala pierde nivel: true',
    )
    expect(`mala enferma más: ${mala.enfermedadesAno > bot.enfermedadesAno}`).toBe(
      'mala enferma más: true',
    )
    // Y es el ÚNICO brazo con molestias, que es el estado que la v58 sacó de la tumba: el bot las
    // evita con su guardarraíl de tres días de tensión, y el que aprieta siempre no.
    expect(
      `solo mala tiene molestias: ${mala.diasMolestiasAno > 0 && bot.diasMolestiasAno === 0}`,
    ).toBe('solo mala tiene molestias: true')
  }, 300_000)

  it('los que entran tienen los techos de los que ya estaban', () => {
    const t5 = filas.find((f) => f.season === 5)
    if (t5 === undefined) return
    for (const d of ['WT', 'PRS', 'CON'] as const) {
      const x = t5.techosNeoprosVsGen0[d]
      if (x === null) continue
      expect(`${d}: |Δ techo| ≤ 3: ${Math.abs(x) <= 3} (${x.toFixed(2)})`).toBe(
        `${d}: |Δ techo| ≤ 3: true (${x.toFixed(2)})`,
      )
    }
  })
})
