import { type FinishSprint, decodeTimeline, encodeTimeline } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { campaignSeeds, flatScenario, queenScenario } from '../sim/scenarios.js'
import { type RecordedStage, inputOf, recordStage, seedOf } from '../sim/timelineBench.js'
import { simulateStage } from './simulate.js'

/**
 * EL FINAL DEL GRUPO DE CABEZA, PARA VERLO (W5, paso 1). Lo que el motor ya calcula en la meta del primer
 * grupo que llega (el tren de cada uno, dónde abre el sprint, cuánto aguanta, su sitio en el grupo y si
 * queda encerrado) se guarda para que `Watch` lo enseñe como en la tele. No cambia ninguna cuenta: los
 * resultados los vigila la huella de `attribution.test.ts`, que no se toca.
 */
describe('finalSprint (W5, paso 1)', () => {
  for (const scenario of [flatScenario(), queenScenario()]) {
    for (const seed of campaignSeeds(`${scenario.name}-final`, 3)) {
      it(`${scenario.name}: el grupo de cabeza, con el orden y los puestos de la etapa`, () => {
        const out = simulateStage(scenario.input, seed)
        const final = out.finalSprint
        expect(final).toBeDefined()
        if (final === undefined) return
        const llegada = out.results
          .filter((r) => r.estado === 'finish')
          .sort((a, b) => a.puesto - b.puesto)
          .slice(0, final.riders.length)
        expect(final.riders.length).toBeGreaterThan(0)
        expect(final.riders.map((r) => [r.riderId, r.puesto])).toEqual(
          llegada.map((r) => [r.riderId, r.puesto]),
        )
        // los huecos, en segundos tras el primero del grupo: los de `results`, desde 0 y sin bajar
        const tiempoDe = new Map(out.results.map((r) => [r.riderId, r.tiempoS]))
        const t0 = tiempoDe.get(final.riders[0]!.riderId)!
        for (const r of final.riders) expect(r.huecoS).toBe(tiempoDe.get(r.riderId)! - t0)
        expect(final.riders[0]?.huecoS).toBe(0)
        for (let i = 1; i < final.riders.length; i++)
          expect(final.riders[i]!.huecoS).toBeGreaterThanOrEqual(final.riders[i - 1]!.huecoS)
        // con más de uno, alguien remata peor que el primero; con cinco o más, no van todos en el mismo sitio
        if (final.riders.length > 1) expect(final.riders.some((r) => r.remate < 1)).toBe(true)
        // lo que aguanta no es dónde abre: son dos cosas, y no salen iguales en todos
        if (final.sprint && final.riders.length > 1)
          expect(final.riders.some((r) => r.lanzaM !== r.aguantaM)).toBe(true)
        if (final.riders.length >= 5)
          expect(new Set(final.riders.map((r) => r.sitio)).size).toBeGreaterThan(1)
        // el remate: el primero, 1; entre los que llegan con el mismo hueco, sin subir (el orden del remate)
        expect(final.riders[0]?.remate).toBe(1)
        for (let i = 1; i < final.riders.length; i++)
          if (final.riders[i]!.huecoS === final.riders[i - 1]!.huecoS)
            expect(final.riders[i]!.remate).toBeLessThanOrEqual(final.riders[i - 1]!.remate)
        const delGrupo = new Set(final.riders.map((r) => r.riderId))
        for (const r of final.riders) {
          // su tren, hombres del mismo grupo y nunca él mismo
          for (const id of r.tren) {
            expect(delGrupo.has(id)).toBe(true)
            expect(id).not.toBe(r.riderId)
          }
          // el sitio, a milésimas y desde 0
          expect(r.sitio).toBeGreaterThanOrEqual(0)
          expect(Math.round(r.sitio * 1000) / 1000).toBe(r.sitio)
          if (final.sprint) {
            // el motor nunca abre a menos de 20 m, y lo que aguanta es una distancia
            expect(r.lanzaM).toBeGreaterThanOrEqual(20)
            expect(r.aguantaM).toBeGreaterThan(0)
          } else {
            expect(r.lanzaM).toBeNull()
            expect(r.aguantaM).toBeNull()
          }
        }
      })
    }
  }

  it('el llano acaba al sprint y la reina, no', () => {
    const [llano] = campaignSeeds('flat-final-tipo', 1)
    const [reina] = campaignSeeds('queen-final-tipo', 1)
    expect(simulateStage(flatScenario().input, llano!).finalSprint?.sprint).toBe(true)
    expect(simulateStage(queenScenario().input, reina!).finalSprint?.sprint).toBe(false)
  })

  it('en el llano alguien queda encerrado, y solo en un final al sprint', () => {
    const finales = campaignSeeds('flat-final-encerrado', 6).map(
      (seed) => simulateStage(flatScenario().input, seed).finalSprint,
    )
    expect(finales.some((f) => f?.riders.some((r) => r.encerrado))).toBe(true)
    for (const seed of campaignSeeds('queen-final-encerrado', 3)) {
      const f = simulateStage(queenScenario().input, seed).finalSprint
      if (f !== undefined && !f.sprint) expect(f.riders.some((r) => r.encerrado)).toBe(false)
    }
  })

  it('en el llano hay trenes: algún velocista llega con sus hombres', () => {
    const conTren = campaignSeeds('flat-final-tren', 3).some((seed) =>
      (simulateStage(flatScenario().input, seed).finalSprint?.riders ?? []).some(
        (r) => r.tren.length > 0,
      ),
    )
    expect(conTren).toBe(true)
  })

  it('determinista: la misma semilla, el mismo final', () => {
    const [seed] = campaignSeeds('flat-final-det', 1)
    const a = simulateStage(flatScenario().input, seed!).finalSprint
    const b = simulateStage(flatScenario().input, seed!).finalSprint
    expect(a).toEqual(b)
  })
})

/**
 * EL GRABADOR LO GUARDA EN LA META DE LA LÍNEA (formato 2): `finish.sprint` es `finalSprint` por RiderIx,
 * con el hueco en Ds, y vuelve igual del códec. En crono no hay final. Sobre dos etapas del banco de la
 * línea y sobre el escenario llano, el que trae trenes (el campo del banco no pone lanzadores).
 */
function compruebaGrabado(rec: RecordedStage): FinishSprint {
  const final = rec.output.finalSprint
  const sprint = rec.timeline.finish.sprint
  expect(final).toBeDefined()
  expect(sprint).not.toBeNull()
  const ix = new Map(rec.timeline.riderIds.map((id, i) => [id, i] as const))
  expect(rec.timeline.format).toBe(2)
  expect(sprint!.kind).toBe(final!.type)
  expect(sprint!.riders).toEqual(
    final!.riders.map((r) => ({
      rider: ix.get(r.riderId),
      train: r.tren.map((id) => ix.get(id)),
      launchM: r.lanzaM,
      holdM: r.aguantaM,
      place: r.sitio,
      boxed: r.encerrado,
      score: r.remate,
      gapDs: r.huecoS * 10,
    })),
  )
  const back = decodeTimeline(JSON.parse(JSON.stringify(encodeTimeline(rec.timeline))))
  expect(back.finish).toEqual(rec.timeline.finish)
  return sprint!
}

describe('el final en la meta de la línea grabada (W5, formato 2)', () => {
  for (const [raceId, day] of [
    ['race-france', 7],
    ['race-france', 18],
  ] as const)
    it(`${raceId} e${day}: finish.sprint es finalSprint por RiderIx, y vuelve igual del códec`, () => {
      compruebaGrabado(recordStage(raceId, day, inputOf(raceId, day), seedOf(raceId, day, 0)))
    }, 120_000)

  it('el escenario llano: los trenes y los encerrados también se graban, por RiderIx', () => {
    const conTren = campaignSeeds('flat-final-tren', 3).some((seed) => {
      const sprint = compruebaGrabado(recordStage('race-france', 7, flatScenario().input, seed))
      return sprint.riders.some((r) => r.train.length > 0)
    })
    expect(conTren).toBe(true)
    // la primera semilla con un encerrado (la busca el motor solo, que es más barato), grabada
    const conEncerrado = campaignSeeds('flat-final-encerrado', 6).find((seed) =>
      simulateStage(flatScenario().input, seed).finalSprint?.riders.some((r) => r.encerrado),
    )
    expect(conEncerrado).toBeDefined()
    const sprint = compruebaGrabado(
      recordStage('race-france', 7, flatScenario().input, conEncerrado!),
    )
    expect(sprint.riders.some((r) => r.boxed)).toBe(true)
  }, 300_000)

  it('race-france e16, la crono: sin final', () => {
    const rec = recordStage(
      'race-france',
      16,
      inputOf('race-france', 16),
      seedOf('race-france', 16, 0),
    )
    expect(rec.timeline.timeTrial).toBe(true)
    expect(rec.output.finalSprint).toBeUndefined()
    expect(rec.timeline.finish.sprint).toBeNull()
  }, 120_000)
})
