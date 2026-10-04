import {
  BROADCAST,
  type GroupIx,
  type GroupNow,
  type InstantContext,
  type StageTimeline,
  instantAt,
  photoAt,
  photoBlocksOf,
} from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import {
  ROAD_FIXTURES,
  type RoadFixtureName,
  loadAdaptedTimeline,
  loadTimeline,
} from './__fixtures__/broadcast/load.js'

/**
 * B22 · EL RELOJ ESTIMADO (docs/retransmision.md §3.8, §16.4 y §17.9; D-07, D-61, 16-s). La línea del
 * adaptador de la radio, construida desde `<etapa>.radio.json.gz` como la construye `timelineForStage`
 * para una etapa sin fila (`loadAdaptedTimeline`), contra la grabada de la misma etapa (`loadTimeline`),
 * en las cinco congeladas en línea y cada 10 s de carrera. Las dos líneas numeran a los corredores
 * igual (el orden de la salida), así que se comparan sin traducir nada.
 *
 * - LA PUERTA (D-07, D-61): la posición de la cabeza, el primer grupo de la carretera en el instante de
 *   cada una, con p99 ≤ `BROADCAST.estimatedClockMaxErrKm` (1 km) en cada etapa. No es un interruptor:
 *   si da rojo, el PR que lo pone en rojo borra la rama del adaptador y toda etapa sin línea responde
 *   404 `broadcast_unavailable` y abre en `Report` (§14.4).
 * - SIN SER PUERTA (16-s): el p99 y el máximo de la posición de TODOS los grupos, cada cursor del
 *   adaptador contra el grupo de la grabada que lleva a la mayoría de los suyos a esa hora; y la
 *   identidad del adaptador, el porcentaje de pares de fotos seguidas en que su mismo grupo pasa a ser
 *   otro grupo del motor mientras el primero sigue vivo (la mayoría de los suyos en la foto de la
 *   grabada). Si el p99 de todos pasa de 1 km, la cifra va en el PR y decide el dueño antes de abrir en
 *   `Watch` las etapas del adaptador (§20.6, 20-l); si pasa de 2 km, esas etapas pintan en el perfil
 *   solo el cursor de la cabeza y el del grupo del título.
 *
 * Medido en el 6a: la cabeza, p99 de 225 a 447 m por etapa (421 m en las cinco); todos los grupos, p99
 * de 272 a 562 m (451 m); otro grupo del motor en el 0,5 % de 6.520 pares. Los máximos, de 1,0 a 4,2
 * km, son muestras sueltas en que una de las dos líneas no pinta su cabeza donde va, y no errores del
 * reloj (en las fotos, el de la cabeza del adaptador va de 38 s antes a 21 s después del de la
 * grabada): en la salida, el instante no sale del bloque 0 hasta ver la marca del km 1 (el corte
 * diagonal, §4.5), y cada línea la ve a su hora; y en los cambios de etiqueta de §3.7 (un grupo muere
 * y todos los suyos pasan a uno que nace en el bloque siguiente), los suyos van unos 7 s en tránsito y
 * la grabada pinta como cabeza al grupo de detrás.
 */

/** Una muestra cada 10 s de carrera (§16.4). */
const EVERY_S = 10
/** 16-s: por encima de esto, las etapas del adaptador pintan solo la cabeza y el título. */
const ALL_GROUPS_PROFILE_MAX_KM = 2

const quantile = (xs: readonly number[], q: number): number => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length === 0 ? Number.NaN : s[Math.min(s.length - 1, Math.floor(q * s.length))]!
}

/** Sin espectador y sin maillots: lo que se mide es dónde va cada grupo. */
const ctxOf = (tl: StageTimeline): InstantContext => ({
  own: new Set(),
  start: {
    leaders: { gc: null, points: null, kom: null },
    gcTop: [],
    racingAtStart: tl.riderIds.length,
  },
  photoBlocks: photoBlocksOf(tl.lengthKm, tl.dx),
})

/** La clave con más votos; a igual cuenta, la menor. */
function majority<K>(votes: ReadonlyMap<K, number>, order: (k: K) => number): K | null {
  let best: K | null = null
  let n = 0
  for (const [k, v] of votes)
    if (v > n || (v === n && best !== null && order(k) < order(best))) {
      best = k
      n = v
    }
  return best
}

interface Measured {
  readonly name: RoadFixtureName
  /** |km| de la cabeza del adaptador contra la de la grabada, por muestra */
  readonly head: readonly number[]
  /** |km| de cada cursor del adaptador contra el grupo del motor que lleva a la mayoría de los suyos */
  readonly all: readonly number[]
  /** pares de fotos seguidas de un mismo grupo del adaptador, y en cuántos es otro grupo del motor */
  readonly pairs: number
  readonly switches: number
  /** el reloj de la cabeza en cada km de foto, el del adaptador menos el de la grabada, en s */
  readonly clockS: readonly number[]
}

function measure(name: RoadFixtureName): Measured {
  const est = loadAdaptedTimeline(name)
  const rec = loadTimeline(name)
  expect(est.clock).toBe('estimated')
  expect(rec.clock).toBe('exact')
  expect(est.riderIds).toEqual(rec.riderIds)
  const ce = ctxOf(est)
  const cr = ctxOf(rec)
  const head: number[] = []
  const all: number[] = []
  const end = Math.min(est.finish.finishS, rec.finish.finishS)
  for (let t = 0; t < end; t += EVERY_S) {
    const a = instantAt(est, t, ce)
    const b = instantAt(rec, t, cr)
    const ah = a.groups[0]
    const bh = b.groups[0]
    if (ah !== undefined && bh !== undefined) head.push(Math.abs(ah.km - bh.km))
    const recOf = new Map<number, GroupNow>()
    for (const g of b.groups) for (const r of g.members) recOf.set(r, g)
    for (const x of a.groups) {
      const votes = new Map<GroupNow, number>()
      for (const r of x.members) {
        const g = recOf.get(r)
        if (g !== undefined) votes.set(g, (votes.get(g) ?? 0) + 1)
      }
      const best = majority(votes, (g) => g.g)
      if (best !== null) all.push(Math.abs(x.km - best.km))
    }
  }
  // La identidad: el grupo del motor de cada grupo del adaptador en cada foto, y si cambia de una foto
  // a la siguiente mientras el de antes sigue vivo en la grabada.
  let pairs = 0
  let switches = 0
  const photos = photoBlocksOf(est.lengthKm, est.dx)
  const engineOf = (b: number): Map<GroupIx, GroupIx> => {
    const pe = photoAt(est, b)
    const pr = photoAt(rec, b)
    const votes = new Map<GroupIx, Map<GroupIx, number>>()
    pe.groupOf.forEach((g, r) => {
      const e = pr.groupOf[r]
      if (g < 0 || e === undefined || e < 0) return
      const m = votes.get(g) ?? new Map<GroupIx, number>()
      m.set(e, (m.get(e) ?? 0) + 1)
      votes.set(g, m)
    })
    return new Map(
      [...votes].flatMap(([g, m]) => {
        const e = majority(m, (x) => x)
        return e === null ? [] : [[g, e] as const]
      }),
    )
  }
  const clockS: number[] = []
  const headDs = (clock: ReadonlyMap<GroupIx, number>): number => Math.min(...clock.values())
  let prev = engineOf(photos[0]!)
  for (let k = 1; k < photos.length; k++) {
    const b = photos[k]!
    const now = engineOf(b)
    const alive = photoAt(rec, b).clock
    clockS.push((headDs(photoAt(est, b).clock) - headDs(alive)) / 10)
    for (const [g, e0] of prev) {
      const e1 = now.get(g)
      if (e1 === undefined) continue
      pairs += 1
      if (e1 !== e0 && alive.has(e0)) switches += 1
    }
    prev = now
  }
  return { name, head, all, pairs, switches, clockS }
}

describe('B22 · el reloj estimado del adaptador contra la línea grabada (D-07, D-61)', () => {
  const measured = ROAD_FIXTURES.map(measure)
  const m = (x: number): string => `${(1000 * x).toFixed(0)} m`

  it.each(measured)('$name: la cabeza, p99 ≤ 1 km (la puerta)', (s) => {
    expect(s.head.length).toBeGreaterThan(100)
    expect(quantile(s.head, 0.99)).toBeLessThanOrEqual(BROADCAST.estimatedClockMaxErrKm)
  })

  it('las cinco: la cabeza, todos los grupos y la identidad (informa; 16-s)', () => {
    const rows = measured.map(
      (s) =>
        `  ${s.name}: la cabeza p50 ${m(quantile(s.head, 0.5))}, p99 ${m(quantile(s.head, 0.99))}, ` +
        `máx. ${m(Math.max(...s.head))}; todos p99 ${m(quantile(s.all, 0.99))}, máx. ` +
        `${m(Math.max(...s.all))}; otro grupo del motor en ${s.switches} de ${s.pairs} pares ` +
        `(${((100 * s.switches) / Math.max(1, s.pairs)).toFixed(1)} %); el reloj de la cabeza en las ` +
        `fotos, de ${Math.min(...s.clockS).toFixed(1)} a ${Math.max(...s.clockS).toFixed(1)} s`,
    )
    const head = measured.flatMap((s) => s.head)
    const all = measured.flatMap((s) => s.all)
    const pairs = measured.reduce((a, s) => a + s.pairs, 0)
    const switches = measured.reduce((a, s) => a + s.switches, 0)
    console.info(
      [
        `[broadcast] B22 cada ${EVERY_S} s de carrera (puerta: la cabeza, p99 ≤ ${BROADCAST.estimatedClockMaxErrKm} km):`,
        ...rows,
        `  en conjunto: la cabeza p99 ${m(quantile(head, 0.99))}, máx. ${m(Math.max(...head))}; todos ` +
          `p99 ${m(quantile(all, 0.99))}, máx. ${m(Math.max(...all))}; la identidad, otro grupo del ` +
          `motor en ${((100 * switches) / Math.max(1, pairs)).toFixed(1)} % de ${pairs} pares`,
      ].join('\n'),
    )
    expect(quantile(head, 0.99)).toBeLessThanOrEqual(BROADCAST.estimatedClockMaxErrKm)
    // Todos los grupos no son puerta (16-s): la cifra se imprime con lo que toca hacer con ella.
    const allP99 = quantile(all, 0.99)
    console.info(
      allP99 > ALL_GROUPS_PROFILE_MAX_KM
        ? `[broadcast] B22: todos los grupos, p99 por encima de ${ALL_GROUPS_PROFILE_MAX_KM} km: el perfil de las etapas del adaptador pinta solo la cabeza y el título (16-s)`
        : allP99 > BROADCAST.estimatedClockMaxErrKm
          ? `[broadcast] B22: todos los grupos, p99 por encima de ${BROADCAST.estimatedClockMaxErrKm} km: la cifra va al PR y decide el dueño (§20.6, 20-l)`
          : `[broadcast] B22: todos los grupos, p99 por debajo de ${BROADCAST.estimatedClockMaxErrKm} km: nada que decidir (16-s)`,
    )
    expect(all.length).toBeGreaterThan(head.length)
    expect(Number.isFinite(allP99)).toBe(true)
  })
})
