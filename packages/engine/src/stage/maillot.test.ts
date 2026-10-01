import { ATTRIBUTES, type Attribute } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import { alasDelMaillot, applyLeaderJersey, hayMaillot, llevaMaillot } from './maillot.js'
import { jerseyBreakDamp } from './tactics.js'
import type { StageRider } from './types.js'

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

/**
 * v90 — LAS ALAS DEL MAILLOT, DENTRO DEL MOTOR Y SIN SPRINT (`stage/maillot.ts`).
 *
 * Hasta la v89 el empujón del líder vivía en `packages/db/src/stageRun.ts` y subía un 4 % los diez
 * atributos del que tenía déficit 0, SPR incluido: el velocista que se vestía de líder por la
 * bonificación esprintaba desde ese día más rápido. El dueño pidió lo contrario.
 */
describe('las alas del maillot (v90)', () => {
  const eff = (v: number): Record<Attribute, number> =>
    Object.fromEntries(ATTRIBUTES.map((a) => [a, v])) as Record<Attribute, number>
  const rider = (id: string, deficit: number, rank: number | null): StageRider => ({
    riderId: id,
    eff0: eff(80),
    energy: 100,
    matches: 4,
    tsb: 0,
    orders: { role: 'libre', mentality: 'reservon', contestSprints: false, contestClimbs: false },
    gcDeficitSeconds: deficit,
    gcRank: rank,
  })

  it('solo sube el esfuerzo sostenido, y nunca el sprint ni la colocación', () => {
    const alas = alasDelMaillot(eff(80))
    for (const a of ATTRIBUTES) {
      const esperado = STAGE.jersey.alasAtributos.includes(a) ? 80 * (1 + STAGE.jersey.alas) : 80
      expect(alas[a]).toBeCloseTo(esperado, 10)
    }
    expect(alas.SPR).toBe(80)
    expect(alas.TAC).toBe(80)
    expect(alas.LLA).toBe(80)
    // Y menos que el 4 % de antes.
    expect(STAGE.jersey.alas).toBeLessThan(0.04)
    expect(STAGE.jersey.alas).toBeGreaterThan(0)
  })

  it('no pasa de 100 ni toca el objeto de entrada', () => {
    const base = eff(99.5)
    const alas = alasDelMaillot(base)
    expect(base.MON).toBe(99.5)
    expect(alas.MON).toBe(100)
  })

  it('lo lleva el 1.º de la general y solo cuando la general ya tiene diferencias', () => {
    // Etapa 1 o carrera de un día: todos a cero, nadie viste de líder.
    const dia1 = [rider('a', 0, 1), rider('b', 0, 2)]
    expect(applyLeaderJersey(dia1)).toEqual(dia1)
    // Con diferencias: el puesto 1, y no todos los que empatan a cero con él.
    const campo = [rider('a', 0, 1), rider('b', 0, 2), rider('c', 12, 3)]
    const out = applyLeaderJersey(campo)
    expect(out[0]!.eff0.MON).toBeCloseTo(80 * (1 + STAGE.jersey.alas), 10)
    expect(out[1]!.eff0).toEqual(campo[1]!.eff0)
    expect(out[2]!.eff0).toEqual(campo[2]!.eff0)
    // Puro: el campo de entrada queda como estaba.
    expect(campo[0]!.eff0.MON).toBe(80)
    expect(llevaMaillot({ gcRank: 1 }, hayMaillot(campo))).toBe(true)
    expect(llevaMaillot({ gcRank: null }, hayMaillot(campo))).toBe(false)
  })

  it('en la línea el maillot remata un poco por debajo de su nivel, sin dejar de rematar', () => {
    expect(STAGE.jersey.remate).toBeLessThan(1)
    expect(STAGE.jersey.remate).toBeGreaterThanOrEqual(0.95)
    expect(STAGE.jersey.sitioSprint).toBeGreaterThanOrEqual(0)
    expect(STAGE.jersey.sitioSprint).toBeLessThan(STAGE.placement.boxedThreshold)
  })
})
