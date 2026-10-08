import { type Block, photoAt, photoBlocksOf, toDs } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { ENGINE_VERSION, STAGE } from './constants.js'
import { raceRadioCollector, radioKmFrom, radioKmPoints } from './sim/raceRadio.js'
import { profileStripOf, selfCheckI1, timelineRecorder } from './sim/timeline.js'
import { stageLengthKm } from './stage/sample.js'
import type { SnapshotRider, StageOutput, StageProfile } from './stage/types.js'

/**
 * I1 A IGUAL RELOJ EN DS, EN LA SUITE RÁPIDA (docs/retransmision.md §4.4 y §5.5, 5-i; E2, el arreglo de
 * la lápida que encontró el 6a con `scripts/broadcast-fixtures.mjs --sizes`).
 *
 * La línea guarda los relojes en décimas (§4.1) y `selfCheckI1` la compara con la foto del motor, que los
 * lleva en coma flotante. La regla del `kind` (`kindOf`, `raceRadio.ts`) mira el orden de carretera: el
 * puesto delante del pelotón (`fuga` el primero, `contra` los demás) y si un grupo va delante, a la par o
 * detrás del pelotón (detrás, `tierra` o `grupeto` según su origen; a la par, `tierra`). Dos grupos en el
 * mismo Ds no tienen orden en la línea, y el motor se lo da por centésimas. La tolerancia de 5-i (los
 * `kind` de un tramo de igual reloj, como multiconjunto) cubría lo primero, que solo cambia a quién le toca
 * cada `kind`, y no lo segundo, que cambia el `kind`: un grupo descolgado a 0,04 s del pelotón, en su
 * mismo Ds, es `grupeto` en el motor y `tierra` en la línea, y la etapa se quedaba sin línea
 * (`race-flanders` e1 con la semilla 1 de `--sizes`, km 168,05: `shed-25` a 13.849,433 s y el pelotón a
 * 13.849,396, los dos en el Ds 138.494). El banco (`sim/timeline.test.ts`) lo mide sobre etapas de
 * verdad; aquí va con fotos escritas a mano y el grabador de verdad, para que corra en cada PR.
 */

/**
 * Diez corredores en una etapa llana de 3 km: 30 bloques, con foto de km en los bloques 0, 10, 20 y 28
 * (`photoBlocksOf`).
 */
const RIDERS = Array.from({ length: 10 }, (_, i) => `r-${i}`)
const PROFILE: StageProfile = { segments: [{ km: 3, tipo: 'llano' }] }
const LENGTH_KM = stageLengthKm(PROFILE)
const BLOCKS = Math.round(LENGTH_KM / STAGE.dx)
const PHOTO_BLOCKS: ReadonlySet<Block> = new Set(photoBlocksOf(LENGTH_KM, STAGE.dx))

/** Todos los corredores menos esos, por índice. */
const allBut = (...out: number[]): number[] =>
  RIDERS.map((_, r) => r).filter((r) => !out.includes(r))

/** Un grupo en la foto del motor al final de un bloque: su id, sus corredores (por índice) y su reloj. */
interface GroupShot {
  readonly id: string
  readonly riders: readonly number[]
  readonly tS: number
}

/** El reloj del pelotón al cruzar el bloque b: 12 s por bloque de 100 m (30 km/h), segundos enteros. */
const pelotonS = (b: Block): number => 12 * (b + 1)

const shot = (g: GroupShot): SnapshotRider[] =>
  g.riders.map((r) => ({
    riderId: RIDERS[r]!,
    groupId: g.id,
    tS: g.tS,
    energy: 500,
    energy0: 1000,
    pulling: false,
    pullMotive: null,
    pullFor: null,
    pullWindow: 0,
  }))

/**
 * Graba la etapa con el grabador de verdad, una foto por bloque y el pelotón como título del motor, y
 * la cierra como `packages/db`: la radio del colector sobre las fotos de km, un reparto por RiderIx, el
 * recorrido y un tiempo sin viento. Devuelve la línea y las fotos de km con que la compara I1.
 */
function record(groupsAt: (b: Block) => readonly GroupShot[]) {
  const recorder = timelineRecorder({
    blocks: BLOCKS,
    dx: STAGE.dx,
    lengthKm: LENGTH_KM,
    timeTrial: false,
    radioBlocks: PHOTO_BLOCKS,
    riderIds: RIDERS,
  })
  const radio = raceRadioCollector(radioKmPoints(LENGTH_KM))
  for (let b = 0; b < BLOCKS; b++) {
    const km = (b + 0.5) * STAGE.dx
    const riders = groupsAt(b).flatMap(shot)
    if (PHOTO_BLOCKS.has(b)) radio.probe.onSnapshot(km, riders, 'peloton')
    recorder.onSnapshot(km, riders, 'peloton')
  }
  const output: StageOutput = {
    events: [],
    results: [],
    workUnits: new Map(),
    incidents: [],
    tank: new Map(),
    efforts: new Map(),
    engineVersion: ENGINE_VERSION,
    customsRevisions: 0,
  }
  const tl = recorder.finish({
    // En línea el cierre no lee los corredores de la entrada (solo la crono, para su orden de salida).
    input: { profile: PROFILE, riders: [] },
    output,
    radio: radio.radio({ incidents: [] }),
    cast: {
      riders: RIDERS.map((riderId, rider) => ({
        rider,
        riderId,
        bib: rider + 1,
        team: null,
        country: 'ES',
        gender: 'M',
        start: { gcRank: null, gcDeficitS: null, from: null },
        worn: { kind: 'team' },
        distinctions: [],
        knownWins: 0,
      })),
      teams: [],
      favourites: [],
    },
    profile: profileStripOf(PROFILE, null),
    weather: { tempC: 20, rain: 0, spans: [] },
  })
  return { tl, kmPhotos: recorder.kmPhotos }
}

type Recorded = ReturnType<typeof record>

/**
 * Lo que dan del bloque b las dos proyecciones de I1: la radio de la foto del motor (id, reloj en Ds y
 * kind) y los relojes de la línea (id y Ds), en orden de carretera.
 */
function bothAt({ tl, kmPhotos }: Recorded, b: Block) {
  const km = (b + 0.5) * STAGE.dx
  const engine = radioKmFrom(km, kmPhotos.get(b)!, RIDERS.length, Infinity, null, 'peloton')
  const line = [...photoAt(tl, b).clock]
    .map(([g, d]) => [tl.groups[g]!.id, d] as const)
    .sort((x, y) => x[1] - y[1] || (x[0] < y[0] ? -1 : 1))
  return {
    engine: engine.groups.map((g) => `${g.id} ${toDs(g.tS)} ${g.kind}`),
    line: line.map(([id, d]) => `${id} ${d}`),
  }
}

/** Las fotos de km del motor con la del bloque b cambiada: una línea que ya no es la del motor. */
const withPhoto = (
  { kmPhotos }: Recorded,
  b: Block,
  change: (r: SnapshotRider) => SnapshotRider,
): ReadonlyMap<Block, readonly SnapshotRider[]> =>
  new Map([...kmPhotos].map(([at, riders]) => [at, at === b ? riders.map(change) : riders]))

/**
 * La fuga (r-0 y r-1) a 20 s desde el bloque 5, y desde el 15 un grupo descolgado (r-7 a r-9) a 0,04 s
 * del pelotón: en las fotos de los bloques 20 y 28 va en su mismo Ds, como `shed-25` en `race-flanders`
 * e1.
 */
const dropped = (b: Block): GroupShot[] => [
  ...(b >= 5 ? [{ id: 'mov-1', riders: [0, 1], tS: pelotonS(b) - 20 }] : []),
  {
    id: 'peloton',
    riders: b < 5 ? allBut() : b < 15 ? allBut(0, 1) : allBut(0, 1, 7, 8, 9),
    tS: pelotonS(b),
  },
  ...(b >= 15 ? [{ id: 'shed-1', riders: [7, 8, 9], tS: pelotonS(b) + 0.04 }] : []),
]

describe('I1 a igual reloj en Ds: el tramo del pelotón (§5.5, 5-i)', () => {
  it('un grupo descolgado a 0,04 s del pelotón, en su mismo Ds: grupeto en el motor, tierra en la línea, y la línea pasa', () => {
    const rec = record(dropped)
    // La línea es fiel: los dos grupos, con el mismo reloj en Ds que en la foto del motor; solo el kind
    // del descolgado depende de las centésimas que la línea no guarda.
    expect(bothAt(rec, 20)).toEqual({
      engine: ['mov-1 2320 fuga', 'peloton 2520 peloton', 'shed-1 2520 grupeto'],
      line: ['mov-1 2320', 'peloton 2520', 'shed-1 2520'],
    })
    expect(selfCheckI1(rec.tl, rec.kmPhotos)).toEqual([])
  })

  it('un grupo a 0,03 s por delante del pelotón, en su mismo Ds: contra en el motor, tierra en la línea, y la línea pasa', () => {
    const rec = record((b) => [
      ...(b >= 5 ? [{ id: 'mov-1', riders: [0, 1], tS: pelotonS(b) - 20 }] : []),
      ...(b >= 12 ? [{ id: 'mov-2', riders: [2], tS: pelotonS(b) - 0.03 }] : []),
      {
        id: 'peloton',
        riders: b < 5 ? allBut() : b < 12 ? allBut(0, 1) : allBut(0, 1, 2),
        tS: pelotonS(b),
      },
    ])
    expect(bothAt(rec, 20)).toEqual({
      engine: ['mov-1 2320 fuga', 'mov-2 2520 contra', 'peloton 2520 peloton'],
      line: ['mov-1 2320', 'mov-2 2520', 'peloton 2520'],
    })
    expect(selfCheckI1(rec.tl, rec.kmPhotos)).toEqual([])
  })

  it('dos grupos delante del pelotón en el mismo Ds cambian de puesto y de kind (5-i, race-italy e9): sigue pasando', () => {
    const rec = record((b) => [
      ...(b >= 5
        ? [
            { id: 'shed-3', riders: [0, 1], tS: pelotonS(b) - 29.98 },
            { id: 'mov-18', riders: [2], tS: pelotonS(b) - 29.96 },
          ]
        : []),
      { id: 'peloton', riders: b < 5 ? allBut() : allBut(0, 1, 2), tS: pelotonS(b) },
    ])
    // En el motor va primero shed-3 (fuga); en la línea, a igual Ds, el id menor (mov-18).
    expect(bothAt(rec, 20)).toEqual({
      engine: ['shed-3 2220 fuga', 'mov-18 2220 contra', 'peloton 2520 peloton'],
      line: ['mov-18 2220', 'shed-3 2220', 'peloton 2520'],
    })
    expect(selfCheckI1(rec.tl, rec.kmPhotos)).toEqual([])
  })

  it('y sigue cazando la línea que no es la foto del motor: un reloj en otro Ds, un corredor en otro grupo', () => {
    const rec = record(dropped)
    // El descolgado a 0,2 s en el motor (Ds 2522) y a la par en la línea (2520): otro tramo.
    const later = withPhoto(rec, 20, (r) =>
      r.groupId === 'shed-1' ? { ...r, tS: r.tS + 0.16 } : r,
    )
    expect(selfCheckI1(rec.tl, later)).toEqual([
      {
        b: 20,
        km: 20.5 * STAGE.dx,
        field: 'order',
        group: 'peloton',
        expected: 'peloton @2520',
        got: 'peloton,shed-1 @2520',
      },
    ])
    // r-9 en el pelotón del motor y en el descolgado de la línea: miembros y tamaño de los dos.
    const moved = withPhoto(rec, 20, (r) =>
      r.riderId === 'r-9' ? { ...r, groupId: 'peloton', tS: pelotonS(20) } : r,
    )
    expect(selfCheckI1(rec.tl, moved).map((m) => `${m.b} ${m.field} ${m.group}`)).toEqual([
      '20 members peloton',
      '20 size peloton',
      '20 members shed-1',
      '20 size shed-1',
    ])
  })
})
