/**
 * B10, LA FOTO POR KM Y EL APRENDIZAJE (E2, docs/retransmision.md §5.3, §5.10 y §16.4; paso 4b): lo
 * que comparten la rápida (`timelineCollector.test.ts`) y sus dos ficheros del nocturno
 * (`timelineCollector.long1.test.ts` y `long2`), que corren en paralelo porque vitest corre en serie los
 * `it` de un fichero.
 *
 * Con la grabación encendida, el motor fotografía CADA bloque; el colector aparte (`startStageTimeline`)
 * da al aprendizaje (`trabajaronParaOtro`, que alimenta `raceLearning`) y a la radio guardada solo las
 * fotos de los bloques de radio, las mismas que ven hoy. Si se las diera todas, cambiaría quién
 * «trabajó para otro» y el turno de relevo de la radio, que cuenta fotos y no km, pasaría de 3 km a
 * 300 m (§5.3). B10 compara, byte a byte, lo que ve cada envoltura: la de hoy, la de E2 y la ingenua
 * (todas las fotos a los dos), que tiene que romper algo para que la comparación pruebe algo.
 */
import {
  ENGINE_VERSION,
  SEASON_CALENDAR,
  STAGE,
  type StageProbe,
  raceRadioCollector,
  radioForStorage,
  radioKmPoints,
  realRaceScenario,
  simulateStage,
  stageLengthKm,
  stageSeed,
} from '@cyclingstar/engine'
import { expect, it } from 'vitest'
import { startStageTimeline } from './timelines.js'

type Input = ReturnType<typeof realRaceScenario>['input']
type Wrap = 'today' | 'e2' | 'naive'
/** Lo que una envoltura deja ver al aprendizaje (trabajaronParaOtro) y a la radio guardada, como `runOneStage`. */
interface Seen {
  readonly learners: readonly string[]
  readonly stored: string
}

/** La etapa corrida con una de las tres envolturas de la sonda: la de hoy, la de E2 o la ingenua. */
export function watch(input: Input, seed: string, wrap: Wrap): Seen {
  const lengthKm = stageLengthKm(input.profile)
  const radio = raceRadioCollector(radioKmPoints(lengthKm))
  const learners = new Set<string>()
  // Lo de hoy (stageRun.ts, la sonda de runOneStage): el aprendizaje y la radio.
  const radioShot: StageProbe['onSnapshot'] = (km, riders, mainId) => {
    for (const r of riders) if (r.pullFor != null) learners.add(r.riderId)
    radio.probe.onSnapshot(km, riders, mainId)
  }
  const blocks = Math.round(lengthKm / STAGE.dx)
  const recording =
    wrap === 'e2'
      ? startStageTimeline({
          lengthKm,
          timeTrial: input.timeTrial === true,
          riderIds: input.riders.map((r) => r.riderId),
          radioShot,
        })
      : null
  const probe: StageProbe =
    recording?.probe ??
    (wrap === 'today'
      ? { atKm: radio.probe.atKm, onSnapshot: radioShot }
      : {
          // la ingenua: todas las fotos a los dos
          atKm: Array.from({ length: blocks }, (_, b) => (b + 0.5) * STAGE.dx),
          onSnapshot: radioShot,
        })
  const output = simulateStage(input, seed, probe)
  expect(recording?.failure()).toBeUndefined() // el grabador no se apagó
  return {
    learners: [...learners].sort(),
    stored: JSON.stringify(radioForStorage(radio.radio({ incidents: output.incidents }))),
  }
}

export const seedOf = (raceId: string, day: number, s: number): string =>
  stageSeed({ worldSeed: `b10-${s}`, raceId, stageDay: day, engineVersion: ENGINE_VERSION })

/**
 * Tres en que, con este campo (`uniformField`, 176 corredores) y estas semillas, el colector aparte ve
 * lo mismo que hoy y la ingenua rompe: 6, 1 y 2 corredores en trabajaronParaOtro, y la radio en las
 * tres (medido en la síntesis con el prototipo del grabador, `c-l3/b10uniforme.mjs`, motor v89).
 */
export const QUICK = [
  ['race-france', 20, 0],
  ['race-france', 18, 0],
  ['race-flanders', 1, 1],
] as const
/** Las 22 en línea de las 24 del mapa 07 §7 (una crono no tiene fotos de radio), por dos semillas. */
export const LONG = [
  ...Array.from({ length: 21 }, (_, i) => ['race-france', i + 1] as const),
  ['race-flanders', 1] as const,
  ['race-tramuntana', 1] as const,
  ['race-colombia', 5] as const,
]
  .filter(
    ([id, day]) => SEASON_CALENDAR.find((r) => r.id === id)!.stages[day - 1]!.timeTrial !== true,
  )
  .flatMap(([id, day]) => [0, 1].map((s) => [id, day, s] as const))

export const same = (cases: readonly (readonly [string, number, number])[]): void =>
  it.each(cases)(
    '%s e%i semilla %i: el colector aparte ve lo mismo que la envoltura de hoy',
    (raceId, day, s) => {
      const { input } = realRaceScenario(raceId, day)
      const today = watch(input, seedOf(raceId, day, s), 'today')
      const e2 = watch(input, seedOf(raceId, day, s), 'e2')
      expect(e2.learners).toEqual(today.learners)
      expect(e2.stored).toBe(today.stored)
    },
    120_000,
  )
