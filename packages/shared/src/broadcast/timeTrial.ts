/**
 * LA CRONO EN LA HORA t (E2, docs/retransmision.md §9.3; D-23, I-08; 9-f, 9-j; paso 6b).
 *
 * Lo que la tele enseña de una contrarreloj en cada momento es un estado, igual que en carretera: quién
 * está en ruta y dónde, quién está sentado en el sillón, cómo va cada control y la general virtual
 * cuando corre el líder (mapa 06 §4). `timeTrialInstantAt` lo calcula sobre la traza grabada
 * (`TimeTrialTrace`, §4.2) con la misma regla que `instantAt`: solo lee lo visible a la hora t (§4.6),
 * cada reloj de la traza solo si `startDs + reloj ≤ T`, así que es causal por construcción y
 * `timeTrialInstantAt(cutTimeline(tl, T), T, ctx)` es `timeTrialInstantAt(tl, T, ctx)` (B9).
 *
 * No corta la línea en cada llamada (el fotograma lo pide a `overlayHz`, B8): mira la visibilidad de
 * cada reloj, que en la traza de un corredor no decrece, así que lo visto es un prefijo. En la línea de
 * la web, la salida de quien aún no ha salido no ha llegado en ningún tramo y vale `+∞`: por salir.
 */
import { BROADCAST } from './constants.js'
import type { InstantContext, TimeTrialInstant, VirtualGcRow } from './instant.js'
import type { Ds, ProfileStrip, RaceS, RiderIx, TimelineCore } from './timeline.js'
import { toDs } from './timeline.js'

/**
 * Cuántas entradas lleva `kmClockDs` de cada corredor: una por km entero (el bloque `10k − 1`) y, si el
 * último no es el último bloque, la meta (§9.2, `ttTraceOf`). La última es siempre la meta.
 */
export function ttKmEntries(blocks: number): number {
  return Math.floor(blocks / 10) + (blocks % 10 === 0 ? 0 : 1)
}

/** El km de la entrada i de `kmClockDs`: el del final de su km entero, y la meta en la última. */
function kmOfEntry(i: number, entries: number, lengthKm: number): number {
  return i === entries - 1 ? lengthKm : i + 1
}

/** Lo que tarda en Ds el km 1 a la velocidad nominal de su pendiente (`BROADCAST.nominalKmh`, §8.2). */
function nominalFirstKmDs(profile: ProfileStrip): number {
  const a = profile.altM[0] ?? 0
  const b = profile.altM[1] ?? a
  const pct = (b - a) / 10
  const band = BROADCAST.nominalKmh.find((x) => pct <= x.upToPct) ?? BROADCAST.nominalKmh.at(-1)!
  return (36_000 / band.kmh) | 0 || 1
}

/** Cuántas entradas de una fila se ven a la hora T: las primeras con `start + reloj ≤ T` (la fila no decrece). */
function seenCount(row: readonly Ds[], start: Ds, T: Ds): number {
  let lo = 0
  let hi = row.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (start + row[mid]! <= T) lo = mid + 1
    else hi = mid
  }
  return lo
}

/**
 * EL ESTADO DE LA CRONO EN t (§9.3). Por corredor: por salir (`startDs > T`), llegado (su entrada de
 * meta se ve: su tiempo, `kmClockDs.at(−1) / 10`, el `tiempoS` de `results`) o en ruta. En ruta, su km es
 * el de D-04 para un corredor solo (9-f): desde su último km visible, a la velocidad del km anterior (el
 * km 1, a la nominal de su pendiente), y nunca más allá del siguiente km entero, donde su reloj existe
 * seguro; con su último control pasado y lo que pierde en él contra el mejor visible. Los llegados, por
 * tiempo y, a igualdad, por hora de llegada (a igual segundo no se quita el sillón, `bestChain`); el
 * sillón, el primero. Los controles, sus pasos visibles por tiempo y hora de paso. La general virtual,
 * solo por la general y desde que el líder de salida pasa por un control o llega (9-j).
 */
export function timeTrialInstantAt(
  tl: TimelineCore,
  t: RaceS,
  ctx: InstantContext,
): TimeTrialInstant {
  const tt = tl.tt
  const empty: TimeTrialInstant = {
    t,
    onCourse: [],
    hotSeat: null,
    arrivals: [],
    splits: [],
    virtualGc: null,
    toStart: tl.riderIds.length,
    finished: 0,
  }
  if (tt === null) return empty
  const T = toDs(t)
  const entries = ttKmEntries(tl.blocks)
  const n = tl.riderIds.length
  const v0 = nominalFirstKmDs(tl.profile)

  let toStart = 0
  const onCourse: {
    rider: RiderIx
    start: Ds
    km: number
    lastCheck: number
    checkDs: Ds
  }[] = []
  const arrivals: { rider: RiderIx; timeS: number; at: Ds }[] = []
  const passes: { rider: RiderIx; timeS: number; at: Ds }[][] = tt.checksKm.map(() => [])

  for (let r = 0; r < n; r++) {
    const start = tt.startDs[r] ?? Number.POSITIVE_INFINITY
    if (!(start <= T)) {
      toStart++
      continue
    }
    const row = tt.kmClockDs[r] ?? []
    const checks = tt.checkClockDs[r] ?? []
    const nc = seenCount(checks, start, T)
    for (let c = 0; c < nc; c++)
      passes[c]?.push({ rider: r, timeS: checks[c]! / 10, at: start + checks[c]! })
    const k = seenCount(row, start, T)
    if (k > 0 && k - 1 === entries - 1) {
      const fin = row[k - 1]!
      arrivals.push({ rider: r, timeS: fin / 10, at: start + fin })
      continue
    }
    // en ruta: el último km visible (0 en la salida) y la velocidad del anterior
    const ck = k === 0 ? 0 : row[k - 1]!
    const fromKm = k === 0 ? 0 : kmOfEntry(k - 1, entries, tl.lengthKm)
    const speedDs = k >= 2 ? row[k - 1]! - row[k - 2]! : k === 1 ? row[0]! : v0
    const nextKm = Math.min(kmOfEntry(k, entries, tl.lengthKm), tl.lengthKm)
    // la velocidad va en Ds por km: el último tramo puede ser un km partido, hasta la meta
    const km = speedDs > 0 ? Math.min(nextKm, fromKm + (T - start - ck) / speedDs) : fromKm
    onCourse.push({
      rider: r,
      start,
      km: Math.max(fromKm, km),
      lastCheck: nc - 1,
      checkDs: nc > 0 ? checks[nc - 1]! : 0,
    })
  }

  const byTimeThenAt = (
    a: { readonly timeS: number; readonly at: Ds; readonly rider: RiderIx },
    b: { readonly timeS: number; readonly at: Ds; readonly rider: RiderIx },
  ): number => a.timeS - b.timeS || a.at - b.at || a.rider - b.rider
  arrivals.sort(byTimeThenAt)
  for (const p of passes) p.sort(byTimeThenAt)

  const best = passes.map((p) => p[0]?.timeS ?? null)
  onCourse.sort((a, b) => a.start - b.start || a.rider - b.rider)

  return {
    t,
    onCourse: onCourse.map((x) => ({
      rider: x.rider,
      km: x.km,
      lastSplitKm: x.lastCheck < 0 ? null : (tt.checksKm[x.lastCheck] ?? null),
      deltaS: x.lastCheck < 0 ? null : x.checkDs / 10 - (best[x.lastCheck] ?? x.checkDs / 10),
    })),
    hotSeat:
      arrivals[0] === undefined ? null : { rider: arrivals[0].rider, timeS: arrivals[0].timeS },
    arrivals: arrivals.map((a) => ({ rider: a.rider, timeS: a.timeS })),
    splits: tt.checksKm.map((km, c) => ({
      km,
      board: passes[c]!.map((p) => ({ rider: p.rider, timeS: p.timeS })),
    })),
    virtualGc: tt.order === 'gc' ? virtualGcOf(tt.checksKm.length, passes, arrivals, ctx) : null,
    toStart,
    finished: arrivals.length,
  }
}

/**
 * LA GENERAL VIRTUAL DE LA CRONO (9-j): desde que el líder de salida pasa por un control o llega, en su
 * último punto visible, cada uno de los primeros de la general de salida que ya pasó por él, con su
 * déficit de salida más lo que pierde con el líder en ese punto. Sin líder, o antes de su primer paso,
 * null. `group` −1: en crono no hay grupos.
 */
function virtualGcOf(
  checks: number,
  passes: readonly (readonly { rider: RiderIx; timeS: number }[])[],
  arrivals: readonly { rider: RiderIx; timeS: number }[],
  ctx: InstantContext,
): readonly VirtualGcRow[] | null {
  const leader = ctx.start.leaders.gc
  if (leader === null) return null
  // los puntos, del último al primero: la meta y luego los controles hacia atrás
  const points: (readonly { rider: RiderIx; timeS: number }[])[] = [arrivals]
  for (let c = checks - 1; c >= 0; c--) points.push(passes[c] ?? [])
  for (const p of points) {
    const mine = p.find((x) => x.rider === leader)
    if (mine === undefined) continue
    const rows: VirtualGcRow[] = []
    for (const top of ctx.start.gcTop) {
      const there = p.find((x) => x.rider === top.rider)
      if (there === undefined) continue
      rows.push({
        rider: top.rider,
        group: -1,
        startRank: top.rank,
        virtualS: top.gapS + (there.timeS - mine.timeS),
      })
    }
    return rows.sort((a, b) => a.virtualS - b.virtualS || a.startRank - b.startRank)
  }
  return null
}
