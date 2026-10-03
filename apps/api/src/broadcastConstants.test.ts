import {
  NAME_WHOLE_GROUP_UP_TO,
  PELOTON_MIN_SHARE,
  SEASON_CALENDAR,
  STAGE,
  chaseReferenceIndex,
  radioKmPoints,
  sampleProfile,
  stageLengthKm,
} from '@cyclingstar/engine'
import { BROADCAST, SPOILER, chaseRefOf, photoBlocksOf, seededRng } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'

/**
 * LAS COPIAS DEL MOTOR EN SHARED (docs/retransmision.md §15.5; D-52, decisiones 15-a, 15-c y 15-k).
 * `packages/shared` no importa el motor, así que las reglas del motor que la pantalla necesita viven
 * copiadas en `BROADCAST` y en `instant.ts`. Una copia que diverge compila y no rompe ningún banco: la
 * barra llamaría Bunch a lo que la radio no llama pelotón. Este fichero es lo único que lo impide.
 *
 * Las citas, en la v91 tras el 4a: `PELOTON_MIN_SHARE` en `raceRadio.ts` l. 91 y `NAME_WHOLE_GROUP_UP_TO`
 * en l. 615 (exportada en el 4a); `STAGE.gapChaseMainFraction` en `constants.ts` l. 2703;
 * `chaseReferenceIndex` en `stage/group.ts` l. 235-245 (exportada en el 4a); `probeAt` en `simulate.ts`
 * l. 1978-1984. La copia de `STORED_PULLERS_MAX` que tenía la API (`PULLERS_KEPT`, 3a) murió en el 4b,
 * que exporta la del motor: `chronicle.ts` la importa, y con ella se fue su caso de aquí (15-k).
 */
describe('las copias del motor en BROADCAST (§15.5)', () => {
  it('bunchMinShare es PELOTON_MIN_SHARE', () => {
    expect(BROADCAST.bunchMinShare).toBe(PELOTON_MIN_SHARE)
  })

  it('chaseMinShare es STAGE.gapChaseMainFraction', () => {
    expect(BROADCAST.chaseMinShare).toBe(STAGE.gapChaseMainFraction)
  })

  it('nameWholeGroupUpTo es NAME_WHOLE_GROUP_UP_TO: el mismo umbral que la radio (D-27)', () => {
    expect(BROADCAST.nameWholeGroupUpTo).toBe(NAME_WHOLE_GROUP_UP_TO)
  })

  it('chaseRefOf es chaseReferenceIndex en 10.000 carreteras generadas', () => {
    const rng = seededRng('broadcastConstants:chaseRefOf')
    for (let i = 0; i < 10_000; i++) {
      const behind = Array.from({ length: Math.floor(rng() * 21) }, () => ({
        size: 1 + Math.floor(rng() * 176),
        racing: rng() < 0.5,
      }))
      expect(chaseRefOf(behind, BROADCAST.chaseMinShare), JSON.stringify(behind)).toBe(
        chaseReferenceIndex(behind, BROADCAST.chaseMinShare),
      )
    }
  })

  it('photoBlocksOf da los bloques de las fotos de km del motor en todas las etapas del calendario', () => {
    let stages = 0
    let sharedLast = 0
    for (const race of SEASON_CALENDAR)
      for (const stage of race.stages) {
        const lengthKm = stageLengthKm(stage.profile)
        const n = sampleProfile(stage.profile).length
        // simulate.ts, probeAt: cada km al bloque cuyo centro le corresponde; es un Map, así que dos
        // km en el mismo bloque dan una sola foto
        const all = radioKmPoints(lengthKm).map((km) =>
          Math.max(0, Math.min(n - 1, Math.round(km / STAGE.dx - 0.5))),
        )
        const delMotor = [...new Set(all)]
        if (delMotor.length < all.length) sharedLast += 1
        expect(photoBlocksOf(lengthKm, STAGE.dx), `${race.id} e${stage.index}`).toEqual(delMotor)
        stages += 1
      }
    // 1.418 etapas en el calendario de §15.5, y en 69 los dos últimos puntos caen en el mismo bloque
    expect(stages).toBe(1418)
    expect(sharedLast).toBe(69)
  })

  it('las carreras de cabecera existen en el calendario', () => {
    for (const id of SPOILER.headlineRaces)
      expect(
        SEASON_CALENDAR.some((r) => r.id === id),
        id,
      ).toBe(true)
  })
})
