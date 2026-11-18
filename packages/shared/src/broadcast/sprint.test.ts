import { describe, expect, it } from 'vitest'
import { synthLine, toyStage } from './__fixtures__/syntheticLine.js'
import { BROADCAST } from './constants.js'
import { photoAt, visibilityOf } from './index.js'
import {
  approachSpotsM,
  lineSpotsM,
  sprintFrames,
  sprintFramesOfWire,
  sprintFramesWire,
  sprintPhoto,
  sprintSpots,
  startSpotsM,
} from './sprint.js'
import type { FinishSprint, FinishSprintRider, StageTimeline } from './timeline.js'

/**
 * EL ÚLTIMO KM COMO EN LA TELE (W5b): la puesta en escena del final que decidió el motor. La regla que
 * manda: en la línea, la llegada EXACTA (el orden y los márgenes); antes, nadie salta, el tren va delante
 * de su velocista, cada uno sale en su metro, el que abre más lejos de lo que aguanta cede y el
 * encerrado no sale hasta el final. Y los fotogramas, cada uno con su hora, nunca la de la línea (D-06).
 */

const S = BROADCAST.sprint

const rider = (r: number, extra: Partial<FinishSprintRider> = {}): FinishSprintRider => ({
  rider: r,
  train: [],
  launchM: 200,
  holdM: 250,
  place: 0.5,
  boxed: false,
  score: 1,
  gapDs: 0,
  ...extra,
})

/**
 * Un sprint de ocho: gana el 0, que llega con dos hombres de tren (el 5 y el 6) y abre a 180 m; el 1
 * abre a 320 y aguanta 230 (se pasa: sube y cede); el 2 va encerrado; el 3 y el 4 llegan con el grupo; el
 * 7, a un segundo.
 */
const SPRINT: FinishSprint = {
  kind: 'sprint_masivo',
  riders: [
    rider(0, { train: [5, 6], launchM: 180, holdM: 260, place: 0.2, score: 1 }),
    rider(2, { launchM: 150, holdM: 240, place: 0.05, boxed: true, score: 0.99 }),
    rider(1, { launchM: 320, holdM: 230, place: 0.3, score: 0.97 }),
    rider(3, { launchM: 120, holdM: 200, place: 0.6, score: 0.95 }),
    rider(4, { launchM: 90, holdM: 180, place: 0.7, score: 0.9 }),
    rider(5, { launchM: 60, holdM: 300, place: 0.4, score: 0.8 }),
    rider(6, { launchM: 50, holdM: 300, place: 0.5, score: 0.75 }),
    rider(7, { launchM: 30, holdM: 100, place: 0.9, score: 0.7, gapDs: 10 }),
  ],
}

/** Un final en alto: sin sprint, llegan estirados, a 0, 4 y 9 s. */
const SUMMIT: FinishSprint = {
  kind: 'alto',
  riders: [
    rider(1, { launchM: null, holdM: null, place: 0.1, gapDs: 0 }),
    rider(0, { launchM: null, holdM: null, place: 0, gapDs: 40, score: 1.02 }),
    rider(2, { launchM: null, holdM: null, place: 0.5, gapDs: 90, score: 0.9 }),
  ],
}

const order = (spots: readonly { rider: number }[]): number[] => spots.map((s) => s.rider)
const behindOf = (spots: readonly { rider: number; behindM: number }[], r: number): number =>
  spots.find((s) => s.rider === r)!.behindM

describe('la llegada en la línea (lineSpotsM)', () => {
  it('entre los que llegan juntos, un margen del remate, entre media rueda y dos bicicletas', () => {
    const m = lineSpotsM(SPRINT, 16)
    expect(m[0]).toBe(0)
    for (let i = 1; i < 7; i++) {
      const d = m[i]! - m[i - 1]!
      expect(d).toBeGreaterThanOrEqual(S.minMarginM - 1e-9)
      expect(d).toBeLessThanOrEqual(S.maxMarginM + 1e-9)
    }
    // del 0 al 2, un 1 % de remate: medio metro con 50 m por unidad
    expect(m[1]! - m[0]!).toBeCloseTo(Math.max(S.minMarginM, S.marginPerScoreM * 0.01), 9)
  })

  it('el primero de un hueco mayor, a su hueco por la velocidad de la línea', () => {
    const m = lineSpotsM(SPRINT, 16)
    expect(m[7]).toBeCloseTo(Math.max(m[6]! + S.minMarginM, 1 * 16), 9)
    expect(lineSpotsM(SUMMIT, 6)).toEqual([0, 24, 54])
  })
})

describe('el principio del último km (startSpotsM)', () => {
  it('por su sitio en el grupo, en filas, y el tren justo delante de su velocista', () => {
    const s = startSpotsM(SPRINT)
    // el 2 (sitio 0,05) delante de todos; el tren del 0 (5 y 6) por delante del 0
    expect(s[1]).toBe(0)
    const pos = (r: number): number => s[SPRINT.riders.findIndex((x) => x.rider === r)]!
    expect(pos(5)).toBeLessThanOrEqual(pos(0))
    expect(pos(6)).toBeLessThanOrEqual(pos(0))
    for (const x of s) expect(x % S.rowM).toBe(0)
  })
})

describe('el final en un metro (sprintSpots)', () => {
  it('en la línea, la llegada exacta: el orden y los márgenes', () => {
    for (const [sprint, speed] of [
      [SPRINT, 16],
      [SUMMIT, 6],
    ] as const) {
      const spots = sprintSpots(sprint, 0, speed)
      expect(order(spots)).toEqual(sprint.riders.map((r) => r.rider))
      const m = lineSpotsM(sprint, speed)
      spots.forEach((s, i) => expect(s.behindM).toBe(Math.round(m[i]! * 10) / 10))
    }
  })

  it('nadie salta: de 10 en 10 m, nadie gana ni pierde más de un tercio de lo que avanza la cabeza', () => {
    // el sprint en llano a 16 m/s y la subida a 6 m/s, la velocidad de cada línea
    for (const [sprint, speed] of [
      [SPRINT, 16],
      [SUMMIT, 6],
    ] as const) {
      let prev = sprintSpots(sprint, S.fromM, speed)
      for (let d = S.fromM - 10; d >= 0; d -= 10) {
        const now = sprintSpots(sprint, d, speed)
        for (const s of now)
          expect(Math.abs(s.behindM - behindOf(prev, s.rider)), `${s.rider} a ${d} m`).toBeLessThan(
            3.4,
          )
        prev = now
      }
    }
  })

  it('antes de que abra nadie, el tren va delante de su velocista', () => {
    const spots = sprintSpots(SPRINT, 400)
    const at = (r: number): number => order(spots).indexOf(r)
    expect(at(5)).toBeLessThan(at(0))
    expect(at(6)).toBeLessThan(at(0))
    expect(
      spots
        .filter((s) => s.role === 'leadOut')
        .map((s) => s.rider)
        .sort(),
    ).toEqual([5, 6])
  })

  it('cada uno sale en su metro: el 0 abre a 180 y su tren le suelta', () => {
    expect(sprintSpots(SPRINT, 181).find((s) => s.rider === 0)!.role).toBe('bunch')
    expect(sprintSpots(SPRINT, 179).find((s) => s.rider === 0)!.role).toBe('launched')
    expect(sprintSpots(SPRINT, 179).find((s) => s.rider === 5)!.role).toBe('bunch')
  })

  it('el que abre más lejos de lo que aguanta sube y cede', () => {
    const at = (d: number): number => behindOf(sprintSpots(SPRINT, d), 1)
    expect(at(230)).toBeLessThan(at(320))
    expect(at(0)).toBeGreaterThan(at(230))
    expect(sprintSpots(SPRINT, 100).find((s) => s.rider === 1)!.role).toBe('fading')
  })

  it('quien abre un poco más lejos de lo que aguanta no se ve ceder: el motor apenas se lo cobra', () => {
    const corto: FinishSprint = {
      kind: 'sprint_reducido',
      riders: [rider(0, { launchM: 260, holdM: 240 }), rider(1, { launchM: 100, score: 0.9 })],
    }
    for (let d = 240; d > 0; d -= 20)
      expect(sprintSpots(corto, d).find((s) => s.rider === 0)!.role).toBe('launched')
  })

  it('el encerrado no sale hasta el final', () => {
    expect(sprintSpots(SPRINT, S.boxedLaunchM + 1).find((s) => s.rider === 2)!.role).toBe('boxed')
    expect(sprintSpots(SPRINT, S.boxedLaunchM - 1).find((s) => s.rider === 2)!.role).toBe(
      'launched',
    )
  })

  it('sin sprint, en su sitio hasta revealFromM, y desde ahí se van separando hasta sus huecos', () => {
    const start = startSpotsM(SUMMIT)
    const at500 = sprintSpots(SUMMIT, 500, 6)
    const appr = approachSpotsM(SUMMIT, 500)
    SUMMIT.riders.forEach((r, i) =>
      expect(behindOf(at500, r.rider)).toBe(
        Math.round((appr[i]! - Math.min(...appr)) * 10) / 10 + 0,
      ),
    )
    const near = sprintSpots(SUMMIT, 150, 6)
    expect(behindOf(near, 2)).toBeGreaterThan(start[2]! + S.jostleM)
    expect(behindOf(near, 2)).toBeLessThan(54)
    for (const s of near) expect(s.role).toBe('bunch')
  })

  it('NADA DEL RESULTADO ANTES DE revealFromM: dos finales con la misma salida y otra llegada, iguales y en el mismo orden', () => {
    // el mismo grupo, los mismos sitios y trenes; otro orden de llegada, otros remates, huecos, aperturas,
    // lo que aguanta cada uno y otro encerrado
    const otra: FinishSprint = {
      ...SPRINT,
      riders: [...SPRINT.riders].reverse().map((r, i, all) => ({
        ...r,
        score: 1 - i / 50,
        gapDs: i * 10,
        launchM: all[(i + 3) % all.length]!.launchM,
        holdM: all[(i + 5) % all.length]!.holdM,
        boxed: i === 0,
      })),
    }
    const summitAlt: FinishSprint = {
      ...SUMMIT,
      riders: [...SUMMIT.riders].reverse().map((r, i) => ({ ...r, gapDs: i * 99 })),
    }
    // seis en el mismo sitio y sin tren: los empates de la salida, por RiderIx y no por la llegada
    const empate: FinishSprint = {
      kind: 'sprint_reducido',
      riders: [0, 1, 2, 3, 4, 5].map((r) => rider(r, { score: 1 - r / 100 })),
    }
    const empateAlt: FinishSprint = {
      ...empate,
      riders: [...empate.riders].reverse().map((r, i) => ({ ...r, score: 1 - i / 100 })),
    }
    const pairs = [
      [SPRINT, otra],
      [SUMMIT, summitAlt],
      [empate, empateAlt],
    ] as const
    const key = (x: FinishSprint, d: number, roles: boolean): string[] =>
      sprintSpots(x, d).map((s) => `${s.rider}:${s.behindM}${roles ? `:${s.role}` : ''}`)
    for (const d of [S.fromM, 900, 600, 450, 320, S.revealFromM + 1])
      for (const [a, b] of pairs)
        expect(key(b, d, true), `${a.kind} a ${d} m`).toEqual(key(a, d, true))
    // en revealFromM, los sitios aún (los papeles ya no: abre quien abre de lejos)
    for (const [a, b] of pairs)
      expect(key(b, S.revealFromM, false), a.kind).toEqual(key(a, S.revealFromM, false))
  })

  it('en la aproximación el grupo va y viene sin el resultado, y el tren con su velocista', () => {
    const orders = new Set<string>()
    const start = startSpotsM(SPRINT)
    for (let d = S.fromM; d > S.revealFromM; d -= 25) {
      const spots = sprintSpots(SPRINT, d)
      orders.add(order(spots).join(','))
      // el 5 y el 6, los hombres del 0, a la misma distancia de él que al salir
      for (const man of [5, 6])
        expect(behindOf(spots, 0) - behindOf(spots, man), `${man} a ${d} m`).toBeCloseTo(
          start[0]! - start[man]!,
          0.5,
        )
    }
    // la lista cambia de orden en el camino, y nadie se va más allá de su vaivén
    expect(orders.size).toBeGreaterThan(2)
    for (const d of [900, 600, 400])
      approachSpotsM(SPRINT, d).forEach((s, i) =>
        expect(Math.abs(s - start[i]!)).toBeLessThanOrEqual(S.jostleM + 1e-9),
      )
  })

  it('antes de revealFromM nadie abre, cede ni va encerrado: cada uno en su sitio de la aproximación', () => {
    // el 1 abre a 320 y el 2 va encerrado: ni lo uno ni lo otro se ve hasta revealFromM
    for (const d of [S.fromM, 700, 450, 320, S.revealFromM + 1]) {
      const spots = sprintSpots(SPRINT, d)
      const at = approachSpotsM(SPRINT, d)
      const head = Math.min(...at)
      SPRINT.riders.forEach((r, i) =>
        expect(behindOf(spots, r.rider), `${r.rider} a ${d} m`).toBe(
          Math.round((at[i]! - head) * 10) / 10 + 0,
        ),
      )
      for (const s of spots) expect(['bunch', 'leadOut'], `${s.rider} a ${d} m`).toContain(s.role)
    }
    expect(sprintSpots(SPRINT, S.revealFromM).find((s) => s.rider === 2)!.role).toBe('boxed')
  })

  it('determinista', () => {
    expect(sprintSpots(SPRINT, 237)).toEqual(sprintSpots(SPRINT, 237))
  })
})

/**
 * La línea de juguete con un final del grupo de cabeza (r0, r1 y r2 van en `mov-1` al final); con
 * `joinAt`, r3 salta del pelotón a `mov-1` en ese bloque del último km.
 */
function lineWithSprint(
  sprint: FinishSprint | null,
  joinAt: number | null = null,
  lastBlockS: number | null = null,
): StageTimeline {
  const toy = toyStage()
  const riderIds = toy.riderIds
  const joined =
    joinAt === null
      ? toy.photos
      : toy.photos.map((p, b) =>
          b < joinAt ? p : { ...p, groupOf: p.groupOf.map((g, r) => (r === 3 ? 'mov-1' : g)) },
        )
  // con `lastBlockS`, el último bloque de `mov-1` en esos segundos tras el de antes
  const photos =
    lastBlockS === null
      ? joined
      : joined.map((p, b) =>
          b !== joined.length - 1
            ? p
            : {
                ...p,
                clockS: { ...p.clockS, 'mov-1': joined[b - 1]!.clockS['mov-1']! + lastBlockS },
              },
        )
  const { tl } = synthLine(photos, riderIds, { photoEvery: 10, keyEvery: 20, lastBlocks: 10 })
  return {
    ...tl,
    format: 2,
    cast: { riders: [], teams: [], favourites: [] },
    weather: { tempC: 20, rain: 0, spans: [] },
    finish: { finishS: photos.at(-1)!.clockS['mov-1']!, arrivals: [], sprint },
  }
}

const TOY: FinishSprint = {
  kind: 'sprint_reducido',
  riders: [
    rider(0, { train: [1], launchM: 220, holdM: 260, place: 0.3, score: 1 }),
    rider(2, { launchM: 260, holdM: 200, place: 0.1, score: 0.98 }),
    rider(1, { launchM: 80, holdM: 300, place: 0.2, score: 0.9 }),
  ],
}

describe('los fotogramas del final (sprintFrames) y la foto de la línea (sprintPhoto)', () => {
  const tl = lineWithSprint(TOY)
  const frames = sprintFrames(tl)

  it('uno en cada marca del grupo del ganador en el último km, y los de entre medias, nunca en la línea', () => {
    expect(frames.map((f) => f.toGoM)).toEqual([
      900, 800, 700, 600, 500, 400, 300, 250, 200, 150, 100, 50,
    ])
    const { finishDs } = visibilityOf(tl)
    for (let i = 1; i < frames.length; i++)
      expect(frames[i]!.atDs).toBeGreaterThan(frames[i - 1]!.atDs)
    for (const f of frames) expect(f.atDs).toBeLessThan(finishDs)
  })

  it('cada fotograma, con los del grupo del ganador en ese bloque, y el primero a 0', () => {
    for (const f of frames) {
      expect(f.spots[0]?.behindM).toBe(0)
      expect(f.spots.length).toBeLessThanOrEqual(S.frameRiders)
      // la composición, la de la marca que ya se ve a su hora: la de su bloque, o la de antes entre dos
      const groupOf = photoAt(tl, tl.blocks - 1 - Math.ceil(f.toGoM / 100)).groupOf
      for (const s of f.spots) expect(groupOf[s.rider]).toBe(groupOf[0])
    }
  })

  it('quien entra en el grupo dentro del último km no sale en los fotogramas de antes', () => {
    const conR3: FinishSprint = {
      kind: 'sprint_reducido',
      riders: [...TOY.riders, rider(3, { launchM: 150, holdM: 200, place: 0, score: 0.8 })],
    }
    // enlaza en el bloque de los 200 m: el fotograma de 250, con la composición de los 300, aún no lo lleva
    const join = lineWithSprint(conR3, 57)
    for (const f of sprintFrames(join)) {
      const dentro = f.spots.some((x) => x.rider === 3)
      expect(dentro, `${f.toGoM} m`).toBe(join.blocks - 1 - Math.ceil(f.toGoM / 100) >= 57)
    }
  })

  it('la velocidad de la línea, acotada: un último bloque de una décima no pone a nadie a cientos de metros', () => {
    const conHueco: FinishSprint = {
      ...TOY,
      riders: [...TOY.riders.slice(0, 2), { ...TOY.riders[2]!, gapDs: 10 }],
    }
    const rapida = sprintPhoto(lineWithSprint(conHueco, null, 0.1))
    expect(rapida.at(-1)!.behindM).toBeLessThanOrEqual(S.lineSpeedMaxMs * 1)
    const normal = sprintPhoto(lineWithSprint(conHueco))
    expect(normal.at(-1)!.behindM).toBeLessThan(S.lineSpeedMaxMs)
  })

  it('la foto, los `frameRiders` primeros de la llegada', () => {
    const big: FinishSprint = {
      kind: 'sprint_masivo',
      riders: Array.from({ length: S.frameRiders + 3 }, (_, i) =>
        rider(i, { place: i / 20, score: 1 - i / 100 }),
      ),
    }
    const photo = sprintPhoto(lineWithSprint(big))
    expect(order(photo)).toEqual(big.riders.slice(0, S.frameRiders).map((r) => r.rider))
  })

  it('la foto de la línea es la llegada, y sin final no hay fotogramas', () => {
    expect(order(sprintPhoto(tl))).toEqual([0, 2, 1])
    expect(sprintFrames(lineWithSprint(null))).toEqual([])
    expect(sprintPhoto(lineWithSprint(null))).toEqual([])
  })
})

describe('los fotogramas en el contrato (BroadcastChunk.sprint)', () => {
  const tl = lineWithSprint(TOY)
  const { finishDs } = visibilityOf(tl)

  it('ida y vuelta: los fotogramas de toda la etapa, iguales', () => {
    expect(sprintFramesOfWire(sprintFramesWire(tl, 0, finishDs))).toEqual(sprintFrames(tl))
  })

  it('cada fotograma en el tramo de su hora, una vez, y ninguno en la línea ni después', () => {
    // cortes en la hora justa de tres fotogramas: el borde es del tramo que acaba en él
    const at = sprintFrames(tl).map((f) => f.atDs)
    const cuts = [0, 3000, at[2]!, at[5]!, at[9]!, finishDs, finishDs + 100]
    const served = cuts
      .slice(1)
      .flatMap((to, i) => sprintFramesOfWire(sprintFramesWire(tl, cuts[i]!, to)))
    expect(served).toEqual(sprintFrames(tl))
    expect(sprintFramesWire(tl, finishDs, finishDs + 100)).toEqual([])
  })

  it('un papel que la web no conoce se lee como del grupo', () => {
    expect(sprintFramesOfWire([10, 300, 1, 4, 25, 99])).toEqual([
      { atDs: 10, toGoM: 300, spots: [{ rider: 4, behindM: 2.5, role: 'bunch' }] },
    ])
  })
})
