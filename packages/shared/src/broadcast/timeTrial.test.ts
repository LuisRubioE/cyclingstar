import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { decodeTimeline } from './codec.js'
import { cutTimeline, visibilityOf } from './cut.js'
import { type InstantContext, photoBlocksOf } from './instant.js'
import type { StageTimeline, TimelineCore } from './timeline.js'
import { fromDs, toDs } from './timeline.js'
import { timeTrialInstantAt, ttKmEntries, ttLastKmFromS } from './timeTrial.js'
import type { StartState } from './wire.js'

/**
 * LA CRONO EN LA HORA t (E2, docs/retransmision.md §9.3 y §9.8; D-23; paso 6b), sobre la crono congelada
 * de `apps/api/src/__fixtures__/broadcast/`, la e16 de `race-france` (157 corredores por la general a
 * 120 s, 26 km), que se lee como `loadTimeline` (`readFileSync`, `gunzipSync` y `decodeTimeline`) sin
 * importar `load.ts`: `packages/shared` compila con `rootDir: "src"` y no puede importar de `apps/api`.
 *
 * Los casos de §9.8: las tres cuentas suman los corredores en todo t; los dueños del sillón son los de
 * `tt_first_time`, los `tt_best_time` y `stage_win_itt` del motor; todo `tt_split` del motor es el mejor
 * de su control a su hora; la posición en ruta no retrocede ni pasa del siguiente km entero; la general
 * virtual, null por dorsales y, por la general, con el líder virtual delante; un pinchazo se revela entre
 * la salida y la llegada de su corredor; los llegados, por tiempo y hora de llegada, con el sillón el
 * primero; y el borde de la meta es la última llegada (4-w). B9 de la crono, sobre la misma, está en
 * `apps/api/src/broadcastCut.test.ts`.
 */

const E16: StageTimeline = decodeTimeline(
  JSON.parse(
    gunzipSync(
      readFileSync(
        new URL(
          '../../../../apps/api/src/__fixtures__/broadcast/race-france-e16.timeline.gz',
          import.meta.url,
        ),
      ),
    ).toString('utf8'),
  ),
)
const TT = E16.tt!

/** La salida de la e16 que arma la ruta: los maillots de `worn` y la general de salida del reparto. */
function startOf(tl: StageTimeline): StartState {
  const leaders: { gc: number | null; points: number | null; kom: number | null } = {
    gc: null,
    points: null,
    kom: null,
  }
  for (const c of tl.cast.riders) if (c.worn.kind === 'leader') leaders[c.worn.jersey] = c.rider
  const gcTop = tl.cast.riders
    .flatMap((c) =>
      c.start.gcRank !== null && c.start.gcRank <= 10
        ? [{ rider: c.rider, rank: c.start.gcRank, gapS: c.start.gcDeficitS ?? 0 }]
        : [],
    )
    .sort((a, b) => a.rank - b.rank)
  return { leaders, gcTop, racingAtStart: tl.riderIds.length }
}
const CTX: InstantContext = {
  own: new Set(),
  start: startOf(E16),
  photoBlocks: photoBlocksOf(E16.lengthKm, E16.dx),
}
const FINISH_DS = visibilityOf(E16).finishDs
const at = (t: number) => timeTrialInstantAt(E16, t, CTX)
/** La hora a la que la traza enseña la llegada de r: su salida más su tiempo, en segundos enteros. */
const finishHourS = (r: number): number => fromDs(TT.startDs[r]! + TT.kmClockDs[r]!.at(-1)!)

describe('timeTrialInstantAt · la crono en t (§9.3, §9.8)', () => {
  it('la e16 es la que §9 describe: por la general a 120 s, dos controles y una entrada por km entero', () => {
    expect(TT.order).toBe('gc')
    expect(TT.intervalS).toBe(120)
    expect(TT.checksKm).toEqual([8.6, 17.3])
    expect(ttKmEntries(E16.blocks)).toBe(26)
    for (const row of TT.kmClockDs) expect(row).toHaveLength(26)
  })

  it('toStart + onCourse + finished = n en todo t, de la salida al borde de la meta', () => {
    for (let t = 0; t <= fromDs(FINISH_DS); t += 97) {
      const i = at(t)
      expect(i.toStart + i.onCourse.length + i.finished, `t ${t}`).toBe(E16.riderIds.length)
    }
    expect(at(0).onCourse).toHaveLength(1) // el primero sale en t = 0
    expect(at(fromDs(FINISH_DS)).finished).toBe(E16.riderIds.length)
  })

  it('los dueños del sillón son los de tt_first_time, los tt_best_time y stage_win_itt del motor', () => {
    // la cadena entera, llegada a llegada: el motor solo narra parte (`thin`), así que lo narrado es
    // una subcadena: el primero, el último y cada cambio narrado entre dos dueños seguidos
    const owners: number[] = []
    const hours = [...new Set(TT.kmClockDs.map((_, r) => finishHourS(r)))].sort((a, b) => a - b)
    for (const t of hours) {
      const h = at(t).hotSeat
      if (h !== null && owners.at(-1) !== h.rider) owners.push(h.rider)
    }
    const first = E16.events.find((e) => e.plantilla === 'tt_first_time')!
    const win = E16.events.find((e) => e.plantilla === 'stage_win_itt')!
    expect(owners[0]).toBe(first.riders[0])
    expect(owners.at(-1)).toBe(win.riders[0])
    const best = E16.events.filter((e) => e.plantilla === 'tt_best_time')
    expect(best.length).toBeGreaterThan(2)
    for (const e of best) {
      const [rider, prev] = e.riders
      const j = owners.indexOf(rider!)
      expect(j, `tt_best_time ${rider}`).toBeGreaterThan(0)
      expect(owners[j - 1]).toBe(prev)
    }
    // y en cuanto la traza enseña su llegada, el sillón es el suyo con el tiempo del motor; el suceso
    // sale a la hora de carrera sin redondear, a medio segundo como mucho de la del segundo entero (la
    // victoria, en el borde de la meta)
    for (const e of [first, ...best, win]) {
      const r = e.riders[0]!
      if (e !== win) expect(Math.abs(e.revealS - finishHourS(r))).toBeLessThanOrEqual(0.5)
      expect(at(finishHourS(r)).hotSeat).toEqual({ rider: r, timeS: e.datos!.timeS })
    }
    expect(win.revealS).toBe(fromDs(FINISH_DS))
  })

  it('todo tt_split del motor, con su corredor y su splitS, es el mejor de su control a su hora', () => {
    const splits = E16.events.filter((e) => e.plantilla === 'tt_split')
    expect(splits.length).toBeGreaterThan(4)
    for (const e of splits) {
      const c = TT.checksKm.findIndex((km) => Math.round(km) === e.datos!.checkKm)
      expect(c).toBeGreaterThanOrEqual(0)
      const r = e.riders[0]!
      const hour = fromDs(TT.startDs[r]! + TT.checkClockDs[r]![c]!)
      expect(Math.abs(e.revealS - hour)).toBeLessThanOrEqual(0.5)
      expect(at(hour).splits[c]!.board[0]).toEqual({ rider: r, timeS: e.datos!.splitS })
    }
  })

  it('la posición de un corredor en ruta no decrece y no pasa de su siguiente km entero', () => {
    const last = new Map<number, number>()
    for (let t = 0; t <= fromDs(FINISH_DS); t += 13) {
      for (const x of at(t).onCourse) {
        const start = TT.startDs[x.rider]!
        const row = TT.kmClockDs[x.rider]!
        const seen = row.filter((d) => start + d <= toDs(t)).length
        expect(x.km).toBeGreaterThanOrEqual(seen)
        expect(x.km).toBeLessThanOrEqual(seen + 1 + 1e-9)
        expect(x.km).toBeGreaterThanOrEqual(last.get(x.rider) ?? 0)
        last.set(x.rider, x.km)
      }
    }
    expect(last.size).toBe(E16.riderIds.length)
  })

  it('en ruta: su último control y lo que pierde contra el mejor visible en él; sin control, null', () => {
    const t = fromDs(FINISH_DS) - 600
    const i = at(t)
    for (const x of i.onCourse) {
      if (x.lastSplitKm === null) {
        expect(x.deltaS).toBeNull()
        continue
      }
      const c = TT.checksKm.indexOf(x.lastSplitKm)
      const best = i.splits[c]!.board[0]!.timeS
      expect(x.deltaS).toBe(TT.checkClockDs[x.rider]![c]! / 10 - best)
      expect(x.deltaS).toBeGreaterThanOrEqual(0)
    }
  })

  it('los llegados, por tiempo y, a igualdad, por hora de llegada; el sillón es el primero', () => {
    const i = at(fromDs(FINISH_DS))
    for (let k = 1; k < i.arrivals.length; k++) {
      const a = i.arrivals[k - 1]!
      const b = i.arrivals[k]!
      expect(a.timeS <= b.timeS).toBe(true)
      if (a.timeS === b.timeS)
        expect(TT.startDs[a.rider]! + TT.kmClockDs[a.rider]!.at(-1)!).toBeLessThanOrEqual(
          TT.startDs[b.rider]! + TT.kmClockDs[b.rider]!.at(-1)!,
        )
    }
    expect(i.hotSeat).toEqual(i.arrivals[0])
    const win = E16.events.find((e) => e.plantilla === 'stage_win_itt')!
    expect(i.hotSeat).toEqual({ rider: win.riders[0], timeS: win.datos!.timeS })
  })

  it('la general virtual: por la general, desde que el líder pasa por un control, con el líder virtual delante', () => {
    const leader = CTX.start.leaders.gc!
    const start = TT.startDs[leader]!
    const check1 = start + TT.checkClockDs[leader]![0]!
    expect(at(fromDs(check1) - 0.1).virtualGc).toBeNull()
    const v = at(fromDs(check1)).virtualGc!
    expect(v.length).toBeGreaterThan(0)
    expect(v.map((r) => r.virtualS)).toEqual([...v.map((r) => r.virtualS)].sort((a, b) => a - b))
    expect(v.every((r) => r.group === -1)).toBe(true)
    const mine = v.find((r) => r.rider === leader)!
    expect(mine.virtualS).toBe(0)
    // la de la meta, con todos los que llegaron
    const fin = at(fromDs(FINISH_DS)).virtualGc!
    for (const row of fin) {
      const gap = CTX.start.gcTop.find((x) => x.rider === row.rider)!.gapS
      const ownTime = TT.kmClockDs[row.rider]!.at(-1)! / 10
      const leaderTime = TT.kmClockDs[leader]!.at(-1)! / 10
      expect(row.virtualS).toBeCloseTo(gap + ownTime - leaderTime, 9)
    }
    // por dorsales no hay general virtual
    const byBib: TimelineCore = { ...E16, tt: { ...TT, order: 'bib' } }
    expect(timeTrialInstantAt(byBib, fromDs(FINISH_DS), CTX).virtualGc).toBeNull()
  })

  it('un pinchazo o una avería se revela entre la salida y la llegada de su corredor', () => {
    const mishaps = E16.events.filter(
      (e) => e.plantilla === 'puncture' || e.plantilla === 'mechanical',
    )
    expect(mishaps.length).toBe(4)
    for (const e of mishaps) {
      const r = e.riders[0]!
      expect(toDs(e.revealS)).toBeGreaterThan(TT.startDs[r]!)
      expect(toDs(e.revealS)).toBeLessThan(TT.startDs[r]! + TT.kmClockDs[r]!.at(-1)!)
    }
  })

  it('el borde de la meta es la última llegada (4-w), y antes nadie la ha cruzado en pantalla', () => {
    const arrivalsDs = TT.kmClockDs.map((row, r) => TT.startDs[r]! + row.at(-1)!)
    expect(FINISH_DS).toBe(Math.max(...arrivalsDs))
    expect(at(fromDs(FINISH_DS) - 0.1).finished).toBe(E16.riderIds.length - 1)
  })

  it('es causal: lo que se ve en T no cambia al cortar la línea en T', () => {
    for (let t = 0; t <= fromDs(FINISH_DS); t += 911)
      expect(timeTrialInstantAt(cutTimeline(E16, t), t, CTX)).toEqual(at(t))
  })

  it('ttLastKmFromS: el último en salir, el líder, entra en su último km a su salida más kmClockDs.at(−2)', () => {
    const last = TT.startDs.indexOf(Math.max(...TT.startDs))
    expect(last).toBe(CTX.start.leaders.gc)
    const from = fromDs(TT.startDs[last]! + TT.kmClockDs[last]!.at(-2)!)
    expect(ttLastKmFromS(E16)).toBe(from)
    // se sabe cuando ocurre: en la línea cortada antes, null; y en una línea en carretera, null
    expect(ttLastKmFromS(cutTimeline(E16, from - 0.1))).toBeNull()
    expect(ttLastKmFromS(cutTimeline(E16, from))).toBe(from)
    expect(ttLastKmFromS({ ...E16, tt: null })).toBeNull()
  })

  it('en la línea de la web, quien aún no ha salido no tiene salida: va por salir', () => {
    const t = 3000
    const unseen = TT.startDs.map((s) => (s <= toDs(t) ? s : Number.POSITIVE_INFINITY))
    const rows = TT.kmClockDs.map((row, r) => row.filter((d) => unseen[r]! + d <= toDs(t)))
    const web: TimelineCore = { ...E16, tt: { ...TT, startDs: unseen, kmClockDs: rows } }
    expect(timeTrialInstantAt(web, t, CTX)).toEqual(at(t))
  })
})
