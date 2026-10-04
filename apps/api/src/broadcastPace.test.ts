import { stageLengthKm, stagesForSeason } from '@cyclingstar/engine'
import {
  BROADCAST,
  type PaceZone,
  type StageTimeline,
  paceAt,
  photoBlocksOf,
  playbackEstimateS,
} from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import {
  ROAD_FIXTURES,
  type RoadFixtureName,
  fixtureStage,
  loadTimeline,
} from './__fixtures__/broadcast/load.js'
import { profileStripOf } from './broadcastSource.js'
import { calendarStageSpec } from './stageHistory.js'

/**
 * B17 · EL RITMO MEDIDO, EN LA RÁPIDA (docs/retransmision.md §8.9, §16.4 y §17.6; D-19, D-60). La curva
 * de `Watch` y la de `Highlights` sobre la cabeza de la línea de las cinco etapas congeladas en línea
 * (la grabada desde el 6a; del 3a al 5, la del adaptador), con las bandas de 8-k; la crono entra en el
 * 6b y el digest en el 10a. El banco
 * largo, sobre las 24 etapas y dos semillas, es `scripts/bench-pace.mjs`, con la misma curva (la de
 * `packages/shared`) y el mismo reloj (`storedHeadClock`).
 *
 * Las bandas son las de 8-k, escritas una vez aquí (16-v), con una decisión del 3a: el 35 % de los
 * últimos 5 km se pide a los FINALES EN SUBIDA, los que la API llama `Summit finish` y suben de media
 * al menos un 5 % en sus últimos 5 km (`CLIMBING_FINISH_MIN_PCT`), no a toda `Summit finish`. En las 24
 * etapas del banco, las tres `Summit finish` que acaban arriba sin subir en sus últimos 5 km (la e6, la
 * e10 y la e20 de `race-france`, del 1,1 al 3,7 %) se quedan del 27 al 32 %, porque la cabeza no frena
 * ahí y la curva no tiene más carrera que repartir; las que suben (del 6,7 al 8,8 %) van del 42 al 48 %.
 * Aquí, la e20 (2,1 %) queda fuera de esa banda y dentro de la del 15 %. La del error de la duración
 * anunciada sigue fuera de toda `Summit finish`, como §15.3: es el error de las velocidades nominales
 * en la montaña, que existe aunque los últimos 5 km sean suaves.
 */
const BANDS = {
  /** `Watch` de toda etapa en línea, en s de pared (8-k: 6:00 a 22:00; medido en §8.3, 7:39-19:59) */
  watchS: [360, 1320],
  /** `Highlights`, en s de pared (8-k: 1:45 a 7:30; medido, 2:12-6:37) */
  highlightsS: [105, 450],
  /** la parte de `Watch` de los últimos 5 km en toda etapa (8-k: 15 %; medido, 18-24 %) */
  last5MinShare: 0.15,
  /** …y en un final en subida (8-k: 35 %; medido, 45-47 %) */
  climbingLast5MinShare: 0.35,
  /** p90 del error de `estimateS` fuera de los finales en alto, en s (8-k; §15.3 midió 55 s) */
  estimateErrP90S: 60,
} as const

/** Un final en subida sube de media al menos esto (%) en sus últimos 5 km; lo mismo en scripts/bench-pace.mjs. */
const CLIMBING_FINISH_MIN_PCT = 5

/** La cabeza de la línea en cada km de foto: [km del final de su bloque, s de carrera]. */
function headTrack(tl: StageTimeline): (readonly [number, number])[] {
  const minAt = new Map<number, number>()
  for (const e of tl.stateEvents)
    if (e.t === 'clock')
      for (const [, ds] of e.marks) minAt.set(e.b, Math.min(minAt.get(e.b) ?? Infinity, ds))
  const pb = photoBlocksOf(tl.lengthKm, tl.dx)
  return pb.map((b, k) => {
    const km = k === pb.length - 1 && b === tl.blocks - 1 ? tl.lengthKm : (b + 1) / 10
    return [km, minAt.get(b)! / 10] as const
  })
}

/** La curva sobre la cabeza, por décimas de km: s de pared en total y en los últimos 5 km. */
function wallOf(tl: StageTimeline, zones: readonly PaceZone[]): { total: number; last5: number } {
  const H = headTrack(tl)
  let total = 0
  let last5 = 0
  for (let i = 1; i < H.length; i++) {
    const [k0, t0] = H[i - 1]!
    const [k1, t1] = H[i]!
    const n = Math.max(1, Math.round((k1 - k0) / 0.1))
    for (let j = 0; j < n; j++) {
      const toGo = tl.lengthKm - (k0 + ((k1 - k0) * (j + 0.5)) / n)
      const wall = (t1 - t0) / n / paceAt(toGo, zones)
      total += wall
      if (toGo <= 5) last5 += wall
    }
  }
  return { total, last5 }
}

/** La pendiente media de los últimos 5 km del perfil de la cabecera (`altM`, cota al final de cada km). */
function last5GradePct(tl: StageTimeline): number {
  const altM = tl.profile.altM
  const n = altM.length - 1
  return (altM[n]! - altM[n - 5]!) / ((tl.lengthKm - (n - 5)) * 10)
}

/** La etiqueta de la API (`calendarStageSpec`) de la etapa que corrió la congelada. */
function labelOf(name: RoadFixtureName): string {
  const st = fixtureStage(name)
  const stage = stagesForSeason(st.raceId, 0)[st.day - 1]!
  return calendarStageSpec(stage, stageLengthKm(stage.profile)).label
}

const mmss = (s: number): string => {
  const r = Math.round(s)
  return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`
}

const measured = ROAD_FIXTURES.map((name) => {
  const tl = loadTimeline(name)
  const watch = wallOf(tl, BROADCAST.pace)
  const label = labelOf(name)
  return {
    name,
    label,
    climbing: label === 'Summit finish' && last5GradePct(tl) >= CLIMBING_FINISH_MIN_PCT,
    watchS: watch.total,
    last5Share: watch.last5 / watch.total,
    highlightsS: wallOf(tl, BROADCAST.summaryPace).total,
    estimateS: playbackEstimateS(tl.profile, BROADCAST.pace),
  }
})

describe('B17 · el ritmo de Watch y de Highlights sobre las cinco congeladas en línea (8-k)', () => {
  it.each(measured)('$name: Watch y Highlights en su banda', (m) => {
    expect(m.watchS).toBeGreaterThanOrEqual(BANDS.watchS[0])
    expect(m.watchS).toBeLessThanOrEqual(BANDS.watchS[1])
    expect(m.highlightsS).toBeGreaterThanOrEqual(BANDS.highlightsS[0])
    expect(m.highlightsS).toBeLessThanOrEqual(BANDS.highlightsS[1])
  })

  it.each(measured)('$name: los últimos 5 km, su parte de Watch', (m) => {
    expect(m.last5Share).toBeGreaterThanOrEqual(
      m.climbing ? BANDS.climbingLast5MinShare : BANDS.last5MinShare,
    )
  })

  it('los finales en subida son la e18 y la race-colombia e5; la e20 acaba arriba sin subir sus últimos 5 km', () => {
    expect(measured.filter((m) => m.climbing).map((m) => m.name)).toEqual([
      'race-france-e18',
      'race-colombia-e5',
    ])
    expect(measured.find((m) => m.name === 'race-france-e20')?.label).toBe('Summit finish')
  })

  it('el error de la duración anunciada, con p90 por debajo de 60 s fuera de los finales en alto', () => {
    const errs = measured
      .filter((m) => m.label !== 'Summit finish')
      .map((m) => Math.abs(m.estimateS - m.watchS))
      .sort((a, b) => a - b)
    expect(errs.length).toBeGreaterThan(0)
    const p90 = errs[Math.min(errs.length - 1, Math.ceil(0.9 * errs.length) - 1)]!
    expect(p90).toBeLessThan(BANDS.estimateErrP90S)
  })
})

describe('el perfil de la cabecera del adaptador da la duración anunciada de pace.test.ts', () => {
  /** Las cinco etapas de §8.3 y lo que `pace.test.ts` mide sobre sus cotas congeladas. */
  it.each([
    ['race-france', 7, '8:11'],
    ['race-france', 13, '9:11'],
    ['race-france', 18, '11:40'],
    ['race-flanders', 1, '11:05'],
    ['race-colombia', 5, '15:14'],
  ] as const)('%s e%i: %s', (raceId, day, expected) => {
    const strip = profileStripOf(stagesForSeason(raceId, 0)[day - 1]!.profile)
    expect(mmss(playbackEstimateS(strip, BROADCAST.pace))).toBe(expected)
  })
})
