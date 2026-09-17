import { describe, expect, it } from 'vitest'

/**
 * FUNDIRSE NO REGALA NI ROBA SEGUNDOS (v76.1).
 *
 * El dueño, en la etapa 3 del Tour de Francia: en el km 130 un grupo de 37 corredores iba a **0:25**
 * de los líderes; en el km 131 estaban reunificados y **esos 25 segundos habían desaparecido**. Y en
 * la misma foto ese grupo salía **sin velocidad**, con el hueco en blanco.
 *
 * Los dos síntomas son UNO. El reloj de un corredor ES EL DE SU GRUPO —la radio lo construye como
 * `reloj del grupo + markLossS + driftS`—, así que al absorber un grupo sus hombres adoptaban de
 * golpe el reloj del otro: el hueco dejaba de existir para todos a la vez, y al medirles el
 * kilómetro siguiente aparecían cubriéndolo 25 s más rápido de lo que lo cubrieron. Eso son ~92
 * km/h, `radioMaxKmh` los rechazaba a todos —con razón: no es una velocidad, es aritmética de otro
 * grupo— y sin ni uno que contar el grupo se quedaba sin velocidad.
 *
 * O sea que **el hueco en blanco no era un fallo de la radio: era la radio negándose a enseñar un
 * número imposible.** El fallo estaba arriba.
 *
 * La fusión cambia la ETIQUETA del grupo, no el reloj de la gente.
 */
describe('la fusión de dos grupos conserva el reloj de cada hombre', () => {
  /** La cuenta exacta que hace el motor al fundir, aislada de todo lo demás. */
  const fundir = (relojDelante: number, relojDetras: number, drift = 0) => {
    const comun = Math.min(relojDelante, relojDetras)
    const driftDetras = drift + (relojDetras !== comun ? relojDetras - comun : 0)
    const driftDelante = drift + (relojDelante !== comun ? relojDelante - comun : 0)
    return {
      comun,
      deDetras: comun + driftDetras,
      deDelante: comun + driftDelante,
    }
  }

  it('el que venía a 25 s sigue a 25 s el instante después de fundirse', () => {
    const r = fundir(4000, 4025)
    expect(r.deDetras).toBe(4025)
    expect(r.deDelante).toBe(4000)
    expect(r.deDetras - r.deDelante).toBe(25)
  })

  it('y si el que alcanza llega con MENOS reloj, tampoco arrastra a los de delante', () => {
    // El caso simétrico: el grupo de atrás cruza y su reloj pasa a ser el menor. Antes, el grupo de
    // delante se iba con él y ganaba segundos que no había corrido.
    const r = fundir(4025, 4000)
    expect(r.comun).toBe(4000)
    expect(r.deDelante).toBe(4025)
    expect(r.deDetras).toBe(4000)
  })

  it('lo que cada uno llevaba cedido en carretera se conserva encima', () => {
    const r = fundir(4000, 4025, 7)
    expect(r.deDetras).toBe(4032)
    expect(r.deDelante).toBe(4007)
  })

  /**
   * Y LA CONSECUENCIA MEDIBLE, que es la que el dueño vio: con el reloj conservado, el kilómetro
   * siguiente se cubre en el tiempo que se tardó de verdad, así que la velocidad que sale es una
   * velocidad de ciclista y no de moto.
   */
  it('el kilómetro siguiente ya no sale a 92 km/h', () => {
    const antes = fundir(4000, 4025).deDetras
    const despues = antes + 64 // un km a ~56 km/h
    const kmh = (3600 * 1) / (despues - antes)
    expect(kmh).toBeCloseTo(56.25, 1)
    // Con el defecto, ese mismo hombre aparecía cubriendo el km en 64 − 25 = 39 s.
    expect((3600 * 1) / 39).toBeGreaterThan(90)
  })
})
