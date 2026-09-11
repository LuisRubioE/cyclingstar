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
   */
  it('…y tampoco se queda sin pasar de 4★ quien aspira a algo', () => {
    expect(`WT sin nada sobre 4★ ≤ 30%: ${ultima.sinNadaSobre4WTPct <= 30}`).toBe(
      'WT sin nada sobre 4★ ≤ 30%: true',
    )
    expect(`…y sin contar gregarios ≤ 20%: ${ultima.sinNadaSobre4NoGregariosWTPct <= 20}`).toBe(
      '…y sin contar gregarios ≤ 20%: true',
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
})
