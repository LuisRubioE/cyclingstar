import { realRaceScenario } from '@cyclingstar/engine'
import { describe, expect, it } from 'vitest'
import { QUICK, same, seedOf, watch } from './timelineCollectorBench.js'

/**
 * B10, LA RÁPIDA (E2, docs/retransmision.md §16.4; paso 4b): tres etapas y una semilla. Con la grabación
 * encendida, el aprendizaje y la radio guardada ven, byte a byte, lo mismo que con la envoltura de hoy
 * (§5.3, D-08); y la envoltura ingenua, la que daría a los dos todas las fotos, cambia las dos cosas, que
 * es lo que demuestra que la comparación no es vacía. Las 22 etapas en línea por dos semillas corren en
 * el nocturno (`timelineCollector.long1.test.ts` y `long2`).
 */
describe('B10 · la foto por km y el aprendizaje', () => {
  same(QUICK)
  // Dos cláusulas y no una con `||`: la ingenua da a radioShot la foto de cada bloque y cambia la radio
  // guardada por construcción, así que con `||` el test seguía en verde aunque la comparación del
  // aprendizaje estuviera rota (rc3/b10quick.mjs).
  it('no es vacío: la envoltura ingenua cambia el aprendizaje en alguna de las tres', () => {
    const broken = QUICK.some(([raceId, day, s]) => {
      const { input } = realRaceScenario(raceId, day)
      return (
        watch(input, seedOf(raceId, day, s), 'naive').learners.join() !==
        watch(input, seedOf(raceId, day, s), 'today').learners.join()
      )
    })
    expect(broken).toBe(true)
  }, 360_000)
  it('la envoltura ingenua cambia la radio guardada', () => {
    const [raceId, day, s] = QUICK[0]
    const { input } = realRaceScenario(raceId, day)
    expect(watch(input, seedOf(raceId, day, s), 'naive').stored).not.toBe(
      watch(input, seedOf(raceId, day, s), 'today').stored,
    )
  }, 120_000)
})
