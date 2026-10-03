/**
 * LA VISIBILIDAD Y EL CORTE (E2, docs/retransmision.md §4.6; D-06, I-10).
 *
 * Cada dato de la línea tiene una hora a partir de la cual se puede enseñar, y el servidor solo sirve
 * lo que la tiene. Se calcula UNA vez por línea y siempre de marcas de reloj o de un `revealS` ya
 * guardado: así sale igual sobre una línea cortada, el corte es idempotente y B9 se cumple (§16.4).
 *
 * Por qué sale igual sobre una línea cortada, también en lo que depende de quién iba dónde (el grupo
 * del que sale un `move`, el que pierde el título): las marcas de un grupo crecen con el bloque. Si el
 * `move` que metió a un corredor en su grupo no se ve todavía, ese grupo cruzó aquel bloque después de
 * T, y cruzará el siguiente aún más tarde; así que en la línea cortada su marca no está, y el mínimo de
 * las marcas que quedan es el mismo número que en la línea entera.
 *
 * Todo va por `Ds`, con el mismo `toDs` que el tramo: un suceso se compara por su `revealS` en
 * décimas, nunca en coma flotante (por eso el adaptador de la radio redondea sus `revealS`, §3.8).
 */
import { BANNER_CODE } from './codec.js'
import type {
  Block,
  Ds,
  GroupDetail,
  GroupIx,
  RiderIx,
  StateEvent,
  TimelineCore,
} from './timeline.js'
import { toDs, toKm10 } from './timeline.js'
import {
  type BroadcastChunk,
  type TimelineEventWire,
  MISHAP_CODE,
  PULL_MOTIVE_CODE,
} from './wire.js'

/** La hora desde la que se puede enseñar cada dato de una línea (§4.6), en Ds. */
export interface TimelineVisibility {
  /** por GroupIx; el de salida, 0 (3-f) */
  readonly groupBornDs: readonly Ds[]
  /** por GroupIx; null si llega a meta */
  readonly groupDiedDs: readonly (Ds | null)[]
  /** por índice de stateEvents; en un `clock`, la menor de sus marcas, y en un `move`, la del primero que se ve */
  readonly stateEventDs: readonly Ds[]
  /**
   * por índice de stateEvents: en un `move`, la de cada uno de sus corredores, en su orden; null en las
   * demás variantes. No estaba en §4.6: un `move` junta a los que van al mismo grupo en el mismo bloque,
   * y pueden venir de grupos distintos, que lo cruzan a horas distintas (el primero de los dos cruces es
   * por corredor). Cada uno se corta solo, como cada marca de un `clock`.
   */
  readonly moveRiderDs: readonly (readonly Ds[] | null)[]
  /** por índice de events: toDs(revealS) */
  readonly eventDs: readonly Ds[]
  /** por índice de banners */
  readonly bannerDs: readonly Ds[]
  /** por bloque de foto, fila a fila */
  readonly detailDs: ReadonlyMap<Block, readonly Ds[]>
  /** crono: por RiderIx y km, startDs + kmClockDs */
  readonly ttKmDs: readonly (readonly Ds[])[] | null
  /** crono: por RiderIx y control, startDs + checkClockDs (9-b) */
  readonly ttCheckDs: readonly (readonly Ds[])[] | null
  /**
   * el borde de la meta: en línea, la marca de la cabeza en el último bloque; en crono, la última
   * llegada (4-w). En una línea cortada antes de la meta esa marca no está y vale `Infinity`: nada de lo
   * que queda en ella la alcanza.
   */
  readonly finishDs: Ds
}

/** Las plantillas que cuentan un percance (4-s): un `mishap` de estado se ve con su suceso. */
const MISHAP_TEMPLATES: ReadonlySet<string> = new Set(['crash', 'puncture', 'mechanical'])

const cache = new WeakMap<TimelineCore, TimelineVisibility>()

/**
 * LA VISIBILIDAD de una línea (§4.6), una vez por objeto. Las marcas, a su valor; un nacimiento, a su
 * marca en `bornB` (el de salida, a 0); una muerte, a su marca en `diedB`; un `move`, al primero de
 * los dos cruces de cada corredor (el del grupo que deja, o su marca de muerte si murió en el bloque
 * anterior, y el del que le recibe); un `out`, a la marca de su grupo; un `main`, al primero de los dos
 * cruces del que pierde el título y del que lo gana (4-d); un `mishap`, al `revealS` del suceso que lo
 * cuenta (4-s); la capa de detalle, a la marca de su grupo; un suceso y una pancarta, a su `revealS`.
 * Donde falta la marca que pide la regla, la menor marca del bloque, que es la cabeza al cruzarlo.
 */
export function visibilityOf(tl: TimelineCore): TimelineVisibility {
  const hit = cache.get(tl)
  if (hit !== undefined) return hit

  const marks = new Map<GroupIx, Map<Block, Ds>>()
  const firstMark = new Map<GroupIx, Ds>()
  const lastMark = new Map<GroupIx, Ds>()
  const minAt = new Map<Block, Ds>()
  for (const e of tl.stateEvents) {
    if (e.t !== 'clock') continue
    for (const [g, ds] of e.marks) {
      let byBlock = marks.get(g)
      if (byBlock === undefined) marks.set(g, (byBlock = new Map()))
      byBlock.set(e.b, ds)
      if (!firstMark.has(g)) firstMark.set(g, ds)
      lastMark.set(g, ds)
      const m = minAt.get(e.b)
      if (m === undefined || ds < m) minAt.set(e.b, ds)
    }
  }
  const markOf = (g: GroupIx | null, b: Block): Ds | undefined =>
    g === null || g < 0 ? undefined : marks.get(g)?.get(b)
  /** Su marca en b, o la de su muerte si murió en el bloque anterior (sus corredores salen en b). */
  const nearOf = (g: GroupIx | null, b: Block): Ds | undefined =>
    markOf(g, b) ??
    (g !== null && g >= 0 && tl.groups[g]?.diedB === b - 1 ? markOf(g, b - 1) : undefined)
  const minOf = (...xs: (Ds | undefined)[]): Ds | undefined => {
    let out: Ds | undefined
    for (const x of xs) if (x !== undefined && (out === undefined || x < out)) out = x
    return out
  }
  /** La regla, o la cabeza en el bloque, o nunca. */
  const atBlock = (b: Block, ...xs: (Ds | undefined)[]): Ds =>
    minOf(...xs) ?? minAt.get(b) ?? Number.POSITIVE_INFINITY

  const groupBornDs = tl.groups.map((g, i) =>
    i === 0 ? 0 : (markOf(i, g.bornB) ?? firstMark.get(i) ?? Number.POSITIVE_INFINITY),
  )
  const groupDiedDs = tl.groups.map((g, i) =>
    g.diedB === null ? null : (markOf(i, g.diedB) ?? lastMark.get(i) ?? null),
  )

  const eventDs = tl.events.map((e) => toDs(e.revealS))
  const bannerDs = tl.banners.map((x) => toDs(x.revealS))

  // Quién iba dónde, bloque a bloque: el grupo que deja cada corredor y el título que se pierde.
  const groupOf = new Int16Array(tl.riderIds.length)
  let main: GroupIx | null = 0
  const stateEventDs: Ds[] = []
  const moveRiderDs: (readonly Ds[] | null)[] = []
  for (const e of tl.stateEvents) {
    switch (e.t) {
      case 'out': {
        const g = groupOf[e.rider] ?? -1
        stateEventDs.push(atBlock(e.b, nearOf(g, e.b)))
        moveRiderDs.push(null)
        groupOf[e.rider] = -1
        break
      }
      case 'move': {
        const per = e.riders.map((r) => {
          const from = groupOf[r] ?? -1
          groupOf[r] = e.to
          return atBlock(e.b, nearOf(from, e.b), markOf(e.to, e.b))
        })
        stateEventDs.push(Math.min(...per))
        moveRiderDs.push(per)
        break
      }
      case 'main':
        stateEventDs.push(atBlock(e.b, nearOf(main, e.b), nearOf(e.group, e.b)))
        moveRiderDs.push(null)
        main = e.group
        break
      case 'clock':
        stateEventDs.push(Math.min(...e.marks.map(([, ds]) => ds)))
        moveRiderDs.push(null)
        break
      case 'mishap': {
        // El suceso que lo cuenta es el de su corredor en su bloque. Su km va guardado en décimas (§4.2)
        // y el del motor es el centro del bloque, que cae justo entre dos décimas: vale cualquiera de
        // los dos bordes. Con el bloque del km redondeado (la regla del 3a) no casaban 91 de 136
        // percances de la línea grabada (paso 4b), que se veían con la marca de su grupo y no con su suceso.
        const lo = toKm10(e.b * tl.dx)
        const hi = toKm10((e.b + 1) * tl.dx)
        const told = tl.events.findIndex(
          (x) =>
            MISHAP_TEMPLATES.has(x.plantilla) &&
            x.riders.includes(e.rider) &&
            toKm10(x.km) >= lo &&
            toKm10(x.km) <= hi,
        )
        const g = groupOf[e.rider] ?? -1
        stateEventDs.push(told >= 0 ? eventDs[told]! : atBlock(e.b, nearOf(g, e.b)))
        moveRiderDs.push(null)
        break
      }
    }
  }

  const detailDs = new Map<Block, readonly Ds[]>()
  for (const [b, rows] of tl.detail)
    detailDs.set(
      b,
      rows.map((row) => atBlock(b, markOf(row.g, b))),
    )

  let ttKmDs: Ds[][] | null = null
  let ttCheckDs: Ds[][] | null = null
  let finishDs: Ds
  if (tl.tt !== null) {
    const tt = tl.tt
    ttKmDs = tt.kmClockDs.map((row, r) => row.map((d) => (tt.startDs[r] ?? 0) + d))
    ttCheckDs = tt.checkClockDs.map((row, r) => row.map((d) => (tt.startDs[r] ?? 0) + d))
    // La última llegada (4-w). Sobre una crono cortada da la última llegada vista: la crono entra en
    // B9 en el 6b, que es quien la mide.
    let last = Number.NEGATIVE_INFINITY
    for (const row of ttKmDs) if (row.length > 0) last = Math.max(last, row[row.length - 1]!)
    finishDs = last === Number.NEGATIVE_INFINITY ? Number.POSITIVE_INFINITY : last
  } else finishDs = minAt.get(tl.blocks - 1) ?? Number.POSITIVE_INFINITY

  const out: TimelineVisibility = {
    groupBornDs,
    groupDiedDs,
    stateEventDs,
    moveRiderDs,
    eventDs,
    bannerDs,
    detailDs,
    ttKmDs,
    ttCheckDs,
    finishDs,
  }
  cache.set(tl, out)
  return out
}

/** Lo de la crono que se ve hasta T (§4.6): sus relojes de km y de control y los percances revelados. */
function cutTimeTrial(tl: TimelineCore, vis: TimelineVisibility, T: Ds): TimelineCore['tt'] {
  const tt = tl.tt
  if (tt === null) return null
  const seen = (row: readonly Ds[] | undefined, d: Ds, i: number): boolean => (row?.[i] ?? d) <= T
  const revealed = (rider: RiderIx): boolean =>
    tl.events.some(
      (e, i) =>
        (e.plantilla === 'puncture' || e.plantilla === 'mechanical') &&
        e.riders[0] === rider &&
        (vis.eventDs[i] ?? Number.POSITIVE_INFINITY) <= T,
    )
  return {
    ...tt,
    kmClockDs: tt.kmClockDs.map((row, r) => row.filter((d, i) => seen(vis.ttKmDs?.[r], d, i))),
    checkClockDs: tt.checkClockDs.map((row, r) =>
      row.filter((d, i) => seen(vis.ttCheckDs?.[r], d, i)),
    ),
    mishaps: tt.mishaps.filter((m) => revealed(m.rider)),
  }
}

/** De qué línea entera sale cada línea cortada (abajo). */
const roots = new WeakMap<TimelineCore, TimelineCore>()

/**
 * La línea entera de la que sale una cortada, o ella misma. Lo que se ve hasta una hora S es lo mismo
 * en las dos mientras S no pase del corte (por la invariancia de arriba), y `instantAt` lo usa para
 * no recalcular en cada línea cortada el papel de un grupo en una hora anterior (4-q, §18.1).
 */
export function cutRootOf(tl: TimelineCore): TimelineCore {
  return roots.get(tl) ?? tl
}

/**
 * La línea con solo lo visible hasta `toS` (B9). Pura e idempotente:
 * `cutTimeline(cutTimeline(tl, T), T)` es `cutTimeline(tl, T)`. Los grupos son un prefijo del
 * catálogo (4-a), y en cada uno la muerte y el sucesor que aún no se ven quedan a null; de cada `clock`
 * quedan sus marcas vistas y de cada `move`, sus corredores vistos; sin fotos clave, que llevan
 * pertenencias que aún no se ven. Devuelve solo el núcleo (4-b): nunca el reparto, el tiempo ni la meta.
 */
export function cutTimeline(tl: TimelineCore, toS: number): TimelineCore {
  const T = toDs(toS)
  const vis = visibilityOf(tl)
  let n = 0
  while (n < tl.groups.length && vis.groupBornDs[n]! <= T) n++
  const groups = tl.groups.slice(0, n).map((g, i) => {
    const died = vis.groupDiedDs[i] ?? null
    return died !== null && died <= T ? g : { ...g, diedB: null, successor: null }
  })
  const stateEvents: StateEvent[] = []
  tl.stateEvents.forEach((e, i) => {
    if (e.t === 'clock') {
      const marks = e.marks.filter(([, ds]) => ds <= T)
      if (marks.length > 0) stateEvents.push(marks.length === e.marks.length ? e : { ...e, marks })
    } else if (e.t === 'move') {
      const per = vis.moveRiderDs[i] ?? []
      const riders = e.riders.filter((_, j) => (per[j] ?? Number.POSITIVE_INFINITY) <= T)
      if (riders.length > 0)
        stateEvents.push(riders.length === e.riders.length ? e : { ...e, riders })
    } else if (vis.stateEventDs[i]! <= T) stateEvents.push(e)
  })
  const detail = new Map<Block, readonly GroupDetail[]>()
  for (const [b, rows] of tl.detail) {
    const ds = vis.detailDs.get(b) ?? []
    const kept = rows.filter((_, j) => (ds[j] ?? Number.POSITIVE_INFINITY) <= T)
    if (kept.length > 0) detail.set(b, kept)
  }
  const cut: TimelineCore = {
    format: tl.format,
    engineVersion: tl.engineVersion,
    dx: tl.dx,
    blocks: tl.blocks,
    lengthKm: tl.lengthKm,
    timeTrial: tl.timeTrial,
    clock: tl.clock,
    riderIds: tl.riderIds,
    groups,
    keys: [],
    stateEvents,
    events: tl.events.filter((_, i) => vis.eventDs[i]! <= T),
    detail,
    banners: tl.banners.filter((_, i) => vis.bannerDs[i]! <= T),
    profile: tl.profile,
    tt: cutTimeTrial(tl, vis, T),
  }
  roots.set(cut, cutRootOf(tl))
  return cut
}

/** Un dato con su hora y su orden en la línea, para ordenar el tramo por hora (abajo). */
interface Timed<T> {
  readonly ds: Ds
  readonly order: number
  readonly item: T
}
const byTime = <T>(xs: Timed<T>[]): T[] =>
  xs.sort((a, b) => a.ds - b.ds || a.order - b.order).map((x) => x.item)

/**
 * EL TRAMO (fromDs, toDs]: los datos con visibilidad en ese intervalo y anterior a la meta, en el
 * formato plano de §4.11. La voz la añade la ruta (§14.3, 4-r). El que empieza en 0 es [0, toDs]: lleva
 * también lo que se ve desde la salida (el grupo de salida, la marca del bloque 0, que en la línea del
 * adaptador vale 0 Ds, la fila de detalle del km 0 y los sucesos de `revealS` 0), que si no no llegaba
 * en ningún tramo (3c). Los demás siguen con `d > fromDs`, para que nada viaje dos veces.
 *
 * Cada lista va por la hora en que su dato se ve y, a igual hora, en el orden de la línea: así los
 * tramos, uno tras otro, son exactamente el tramo de toda la etapa, que es la línea cortada en su borde
 * (la tercera cláusula de B9), y la web solo tiene que reordenar por bloque lo que junta. `atFinish`
 * dice que el tramo llega al borde de la meta: después de él no queda nada que servir y lo siguiente es
 * `POST …/finish`.
 */
export function chunkOf(tl: TimelineCore, fromDs: Ds, toDs: Ds): Omit<BroadcastChunk, 'lines'> {
  const vis = visibilityOf(tl)
  const inside = (d: Ds | null | undefined): boolean =>
    d !== null &&
    d !== undefined &&
    (fromDs === 0 ? d >= 0 : d > fromDs) &&
    d <= toDs &&
    d < vis.finishDs

  const groupsBorn: BroadcastChunk['groupsBorn'][number][] = []
  const groupsDied: Timed<BroadcastChunk['groupsDied'][number]>[] = []
  tl.groups.forEach((g, i) => {
    if (inside(vis.groupBornDs[i])) groupsBorn.push([i, g.id, g.origin])
    const died = vis.groupDiedDs[i]
    if (g.diedB !== null && inside(died))
      groupsDied.push({ ds: died!, order: i, item: [i, g.diedB, g.successor ?? -1] })
  })

  const moves: Timed<readonly number[]>[] = []
  const main: Timed<readonly number[]>[] = []
  const clocks: Timed<readonly number[]>[] = []
  const mishaps: Timed<readonly number[]>[] = []
  let order = 0
  tl.stateEvents.forEach((e, i) => {
    switch (e.t) {
      case 'out':
        if (inside(vis.stateEventDs[i]))
          moves.push({ ds: vis.stateEventDs[i]!, order: order++, item: [e.b, e.rider, 0] })
        break
      case 'move': {
        const per = vis.moveRiderDs[i] ?? []
        e.riders.forEach((r, j) => {
          if (inside(per[j])) moves.push({ ds: per[j]!, order: order++, item: [e.b, r, e.to + 1] })
        })
        break
      }
      case 'main':
        if (inside(vis.stateEventDs[i]))
          main.push({
            ds: vis.stateEventDs[i]!,
            order: order++,
            item: [e.b, e.group === null ? 0 : e.group + 1],
          })
        break
      case 'clock':
        for (const [g, ds] of e.marks)
          if (inside(ds)) clocks.push({ ds, order: order++, item: [e.b, g, ds] })
        break
      case 'mishap':
        if (inside(vis.stateEventDs[i]))
          mishaps.push({
            ds: vis.stateEventDs[i]!,
            order: order++,
            item: [e.b, e.rider, MISHAP_CODE[e.kind], e.lostDs],
          })
        break
    }
  })

  const details: Timed<readonly number[]>[] = []
  for (const [b, rows] of tl.detail) {
    const ds = vis.detailDs.get(b) ?? []
    rows.forEach((row, j) => {
      if (!inside(ds[j])) return
      const record: number[] = [
        b,
        row.g,
        row.speedKmh === null ? -1 : Math.round(row.speedKmh * 10),
        row.pullingTotal,
        row.mishap === null ? 0 : MISHAP_CODE[row.mishap.kind],
        row.mishap === null ? 0 : toDsOf(row.mishap.lostS),
        row.pullers.length,
      ]
      for (const p of row.pullers)
        record.push(p.rider, p.motive === null ? 0 : PULL_MOTIVE_CODE[p.motive], p.forRider ?? -1)
      details.push({ ds: ds[j]!, order: b * 1000 + j, item: record })
    })
  }

  const events: TimelineEventWire[] = []
  tl.events.forEach((e, i) => {
    if (!inside(vis.eventDs[i])) return
    events.push([
      e.source,
      e.plantilla,
      toKm10(e.km),
      toDsOf(e.tS),
      e.bEmit,
      vis.eventDs[i]!,
      e.riders,
      e.datos,
    ])
  })

  const banners: Timed<readonly number[]>[] = []
  tl.banners.forEach((x, i) => {
    const ds = vis.bannerDs[i]
    if (!inside(ds)) return
    const record: number[] = [BANNER_CODE[x.kind], toKm10(x.km), ds!, x.order.length]
    for (const o of x.order) record.push(o.rider, o.points)
    banners.push({ ds: ds!, order: i, item: record })
  })

  let tt: BroadcastChunk['tt'] = null
  if (tl.tt !== null) {
    const starts: Timed<readonly number[]>[] = []
    const km: Timed<readonly number[]>[] = []
    const checks: Timed<readonly number[]>[] = []
    tl.tt.startDs.forEach((s, r) => {
      if (inside(s)) starts.push({ ds: s, order: r, item: [r, s] })
    })
    tl.tt.kmClockDs.forEach((row, r) =>
      row.forEach((d, k) => {
        const ds = vis.ttKmDs?.[r]?.[k]
        if (inside(ds)) km.push({ ds: ds!, order: r * 10_000 + k, item: [r, k, d] })
      }),
    )
    tl.tt.checkClockDs.forEach((row, r) =>
      row.forEach((d, c) => {
        const ds = vis.ttCheckDs?.[r]?.[c]
        if (inside(ds)) checks.push({ ds: ds!, order: r * 100 + c, item: [r, c, d] })
      }),
    )
    tt = { starts: byTime(starts).flat(), km: byTime(km).flat(), checks: byTime(checks).flat() }
  }

  return {
    fromDs,
    toDs,
    groupsBorn,
    groupsDied: byTime(groupsDied),
    moves: byTime(moves).flat(),
    main: byTime(main).flat(),
    clocks: byTime(clocks).flat(),
    mishaps: byTime(mishaps).flat(),
    details: byTime(details).flat(),
    events,
    banners: byTime(banners).flat(),
    tt,
    atFinish: toDs >= vis.finishDs - 1,
  }
}

/** Los segundos en décimas: el `toDs` de §4.1, con otro nombre aquí porque `toDs` es el borde del tramo. */
function toDsOf(s: number): Ds {
  return toDs(s)
}
