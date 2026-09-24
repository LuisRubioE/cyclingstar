import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import { jerseyBreakDamp } from './tactics.js'

/**
 * R02.12 — EL MAILLOT NO SE VA EN LA FUGA DEL DÍA (v79, corrección de producción).
 *
 * El dueño, mirando el Tour: «el que tiene maillot amarillo debería ser suuuper extraño que se fugue
 * o que entre en una fuga… otra cosa es que en la montaña ataque para irse solo, o que su equipo
 * haga una selección y luego él remate. Pero lo normal es que él siempre vaya a rueda, protegido, a
 * la defensiva. En el llano entrar en una fuga debería ser mucho más raro de lo que ocurre».
 *
 * EL FRENO ESTABA ROTO DE DOS MANERAS, y por eso se veía tanto:
 *
 *  1. `jerseyAttackFactor` existe desde el paso 7 y vive dentro de `STAGE.teamPlay.enabled`, que
 *     está en `false`: **no se aplicaba nunca**;
 *  2. y aunque se aplicara, solo frena ATACAR. `followProbability` —saltar a la rueda del que se va,
 *     que es como se entra en una fuga— no tenía una sola línea sobre el maillot.
 *
 * LA DISTINCIÓN DEL DUEÑO ES DE CLASE DE MOVIMIENTO, no de terreno: no se va **a por la etapa** y sí
 * **a por la carrera**.
 */
describe('el maillot y los movimientos del día', () => {
  it('no es asunto de nadie que no lleve el maillot', () => {
    for (const kind of [
      'fuga',
      'contraataque',
      'puente',
      'ataque_grupo',
      'ataque_final',
    ] as const) {
      expect(jerseyBreakDamp(false, kind, false)).toBe(1)
      expect(jerseyBreakDamp(false, kind, true)).toBe(1)
    }
  })

  /** Lo que el dueño pide: en el llano, casi nunca. */
  it('en el llano el maillot casi no se va con la fuga del día', () => {
    for (const kind of ['fuga', 'contraataque', 'puente'] as const) {
      expect(jerseyBreakDamp(true, kind, false)).toBe(STAGE.jerseyBreakDampFlat)
      expect(STAGE.jerseyBreakDampFlat).toBeLessThan(0.1)
    }
  })

  /** Y en el puerto se le deja más margen: allí un contraataque suyo puede ser carrera de general. */
  it('en un puerto tiene más margen que en el llano', () => {
    expect(jerseyBreakDamp(true, 'contraataque', true)).toBe(STAGE.jerseyBreakDampClimb)
    expect(STAGE.jerseyBreakDampClimb).toBeGreaterThan(STAGE.jerseyBreakDampFlat)
    expect(STAGE.jerseyBreakDampClimb).toBeLessThan(1)
  })

  /**
   * Y LA MITAD QUE NO SE TOCA, que es la que el dueño deja fuera con todas las letras: «otra cosa es
   * que en la montaña ataque para irse solo, o que su equipo haga una selección y luego él remate».
   * Atacar y responder es su oficio; quien dosifica ESO es el colchón (`jerseyCushionS`), no esto.
   */
  it('atacar y rematar NO se frenan, ni en el llano ni en el puerto', () => {
    for (const onClimb of [false, true]) {
      expect(jerseyBreakDamp(true, 'ataque_grupo', onClimb)).toBe(1)
      expect(jerseyBreakDamp(true, 'ataque_final', onClimb)).toBe(1)
    }
  })
})
