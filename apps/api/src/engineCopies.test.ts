import {
  BANISTER,
  type Eff as EngineEff,
  HEALTH,
  MORALE,
  STAGE,
  eff0 as engineEff0,
  fitnessFactor as engineFitnessFactor,
  freshnessBar as engineFreshnessBar,
  matchCount as engineMatchCount,
  maxMatchCount as engineMaxMatchCount,
} from '@cyclingstar/engine'
import {
  ATTRIBUTES,
  ENGINE_BANISTER,
  ENGINE_HEALTH,
  ENGINE_MORALE,
  ENGINE_STAGE,
  type Eff,
  HEALTH_STATES,
  eff0,
  fitnessFactor,
  freshnessBar,
  matchCount,
  maxMatchCount,
  seededRng,
} from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'

/**
 * LO QUE LA WEB LEE DEL MOTOR, COPIADO EN SHARED (E2, paso 10b, los arreglos; docs/retransmision.md
 * §15.5 y §18.5). La web importaba `@cyclingstar/engine` para dos constantes del diario y para la
 * condición del corredor, y como el motor no declara `sideEffects`, cualquier página que lo tocara lo
 * cargaba ENTERO (el calendario se genera al cargar): 2,6 s de una sola tarea con la CPU a ×4 en la
 * primera pintura de `Watch`. Ahora la web lee la copia de `packages/shared`, y este fichero es lo único
 * que impide que diverja: una copia distinta compila y no rompe ningún banco, pero la crónica diría
 * «cinco en cabeza» con otro umbral que el motor, o el perfil enseñaría otros cerillos que los de la
 * etapa. Como `broadcastConstants.test.ts`, compara valores: las constantes, campo a campo, y las
 * funciones, sobre una rejilla y sobre diez mil casos de semilla fija, al bit.
 */
describe('las copias del motor que lee la web (engineCopies.ts)', () => {
  it('ENGINE_STAGE, ENGINE_BANISTER, ENGINE_HEALTH y ENGINE_MORALE son los del motor, campo a campo', () => {
    const pairs = [
      [ENGINE_STAGE, STAGE],
      [ENGINE_BANISTER, BANISTER],
      [ENGINE_HEALTH, HEALTH],
      [ENGINE_MORALE, MORALE],
    ] as const
    for (const [copy, engine] of pairs)
      for (const [k, v] of Object.entries(copy))
        expect(v, k).toEqual((engine as Readonly<Record<string, unknown>>)[k])
  })

  it('fitnessFactor y freshnessBar dan lo mismo que el motor de −200 a 250, cada cuarto', () => {
    for (let x = -200; x <= 250; x += 0.25) {
      expect(fitnessFactor(x), `ctl ${x}`).toBe(engineFitnessFactor(x))
      expect(freshnessBar(x), `tsb ${x}`).toBe(engineFreshnessBar(x))
    }
  })

  it('eff0 da lo mismo que el motor en diez mil corredores al azar, con las cuatro saludes', () => {
    const rng = seededRng('engineCopies:eff0')
    for (let i = 0; i < 10_000; i++) {
      const attr = 1 + 98 * rng()
      const ctl = 150 * rng()
      const tsb = -120 + 180 * rng()
      const health = HEALTH_STATES[i % HEALTH_STATES.length]!
      const morale = 100 * rng()
      expect(
        eff0(attr, ctl, tsb, health, morale),
        `${attr} ${ctl} ${tsb} ${health} ${morale}`,
      ).toBe(engineEff0(attr, ctl, tsb, health, morale))
    }
  })

  it('matchCount y maxMatchCount dan lo mismo que el motor en diez mil salidas al azar', () => {
    expect(maxMatchCount()).toBe(engineMaxMatchCount())
    const rng = seededRng('engineCopies:matchCount')
    const seen = new Set<number>()
    for (let i = 0; i < 10_000; i++) {
      const eff = Object.fromEntries(ATTRIBUTES.map((a) => [a, 20 + 90 * rng()])) as Eff
      const tsb = -80 + 140 * rng()
      const deep = rng() < 0.3
      const n = matchCount(eff, tsb, deep)
      expect(n, JSON.stringify({ eff, tsb, deep })).toBe(
        engineMatchCount(eff satisfies EngineEff, tsb, deep),
      )
      seen.add(n)
    }
    // no vacía: la rejilla pasa por todos los cerillos posibles, del mínimo al techo
    expect([...seen].sort((a, b) => a - b)).toEqual(
      Array.from({ length: maxMatchCount() }, (_, k) => k + 1),
    )
  })
})
