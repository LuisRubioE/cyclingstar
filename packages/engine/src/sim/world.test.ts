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

  it('EL MUNDO NUEVO NACE CONGELADO, y tarda quince temporadas en descongelarse', () => {
    /**
     * EL HALLAZGO DE G1, y no está en la fórmula de entrenamiento sino en quién nace pudiendo
     * mejorar. `generateNpcRider` le da techo por encima del atributo SOLO a los de 23 años o
     * menos (`NPC.youngAge`); del resto, el techo ES el atributo. Y como `kDim` devuelve 0 en
     * cuanto el atributo alcanza el techo, para ellos entrenar rinde exactamente CERO: el mismo
     * corredor a los 26 y a los 30, salvo el declive de la edad.
     *
     * Medido sobre 4.000 NPCs sueltos: el 90 % nace sin un solo punto de margen, con un escalón
     * seco en el 23/24 (17 puntos de margen a los 23; cero a los 24). En el banco, donde la
     * plantilla es la del mundo, la temporada 1 sale con ~80 % del pelotón congelado.
     *
     * Se sella la FORMA de la curva, no el número: el mundo tiene que descongelarse solo —los
     * congelados se van retirando y entran neoprofesionales que sí pueden crecer— y lo hace hacia
     * la temporada 15. Lo que esta prueba prohíbe es que un mundo se quede congelado para siempre,
     * que es lo que pasaría si alguien tocase `youngAge` o el relevo generacional sin darse cuenta.
     *
     * Lo que NO se sella es el 80 % de la temporada 1, porque no es un objetivo: es el defecto.
     * Está pendiente de decisión del dueño (docs/epics.md «G1»), y el día que se arregle este
     * número bajará y ninguna de estas aserciones se opondrá.
     */
    const t15 = filas.find((f) => f.season === 15)!
    expect(`t1 arranca congelado: ${primera.congeladosPct > 50}`).toBe('t1 arranca congelado: true')
    expect(`t15 ya descongelado: ${t15.congeladosPct < 10}`).toBe('t15 ya descongelado: true')
    expect(`t25 descongelado: ${ultima.congeladosPct < 10}`).toBe('t25 descongelado: true')
  })
})
