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
    // Medido: los «cracks» (3+ atributos de 5★) hacen techo en ~7 % hacia la temporada 15 y luego
    // bajan. El día que esto se dispare, el juego se queda sin jerarquía.
    const pico = Math.max(...filas.map((f) => f.cracksPct))
    expect(`pico de cracks ≤ 25%: ${pico <= 25}`).toBe('pico de cracks ≤ 25%: true')
    // Y la otra cara: la media de atributos de cinco estrellas por corredor (medido: 0,9).
    const picoMedia = Math.max(...filas.map((f) => f.estrellas5Medias))
    expect(`5★ medias ≤ 3: ${picoMedia <= 3}`).toBe('5★ medias ≤ 3: true')
  })

  it('…y tampoco se queda el pelotón entero en medianía', () => {
    // Medido: los que no pasan de 4★ en NADA caen del 24 % al 4 % según el mundo se hace suyo.
    expect(`medianías al final ≤ 40%: ${ultima.sinNadaSobre4Pct <= 40}`).toBe(
      'medianías al final ≤ 40%: true',
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
    // Y el mundo no se degrada: la media global no acaba por debajo de donde empezó.
    expect(`la media no baja: ${ultima.mediaGlobal >= primera.mediaGlobal}`).toBe(
      'la media no baja: true',
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
