/**
 * EL REDUCTOR DE LA LÍNEA TEMPORAL (E2, docs/retransmision.md §4.4; I-02, D-02).
 *
 * La línea guarda la pertenencia completa cada `TIMELINE.keyPhotoKm` km (las fotos clave) y, entre
 * ellas, solo lo que cambia: los sucesos de estado (`StateEvent`). `photoAt` reconstruye la foto de
 * cualquier bloque reduciendo desde la foto clave anterior, o desde la de salida si no hay ninguna
 * (la crono, el adaptador de la radio, la web y los bloques antes de la primera clave).
 *
 * Es del lado del grabador (15-b): lo usa el motor al grabar (4b) y no puede leer `BROADCAST` ni
 * `SPOILER`. La pantalla no usa `photoAt`, sino `instantAt` (`instant.ts`), que solo lee lo visible.
 */
import type { Block, Ds, GroupIx, Photo, StateEvent, TimelineCore } from './timeline.js'
import { toDs } from './timeline.js'

/**
 * EL REDUCTOR: aplica un suceso de estado a una foto. Puro y total, un `case` por variante; copia
 * `groupOf` solo si cambia. En `clock` deja la última marca vista de cada grupo; el reloj en `b` de
 * cada grupo vivo lo pone `photoAt` al final.
 */
export function reducePhoto(p: Photo, e: StateEvent): Photo {
  switch (e.t) {
    case 'out': {
      const groupOf = p.groupOf.slice()
      groupOf[e.rider] = -1
      return { ...p, b: e.b, groupOf, detail: null }
    }
    case 'move': {
      const groupOf = p.groupOf.slice()
      for (const r of e.riders) groupOf[r] = e.to
      return { ...p, b: e.b, groupOf, detail: null }
    }
    case 'main':
      return { ...p, b: e.b, main: e.group, detail: null }
    case 'clock': {
      const clock = new Map(p.clock)
      for (const [g, ds] of e.marks) clock.set(g, ds)
      return { ...p, b: e.b, clock, detail: null }
    }
    case 'mishap':
      // La pérdida ya está en las marcas; el percance lo leen la cola de rótulos y la radio.
      return { ...p, b: e.b, detail: null }
  }
}

/** La foto de salida: todos en el grupo de salida (el 0, `peloton`), con su reloj a 0. */
function startPhoto(tl: TimelineCore): Photo {
  return {
    b: -1,
    groupOf: new Int16Array(tl.riderIds.length),
    main: 0,
    clock: new Map([[0, 0]]),
    detail: null,
  }
}

const marksCache = new WeakMap<
  TimelineCore,
  ReadonlyMap<GroupIx, readonly (readonly [Block, Ds])[]>
>()

/**
 * Las marcas de reloj de un grupo, `[bloque, reloj en Ds]` por bloque creciente: las de los `clock`
 * de la línea. Se construyen una vez por línea (un `WeakMap` por objeto).
 */
export function clockMarksOf(tl: TimelineCore, g: GroupIx): readonly (readonly [Block, Ds])[] {
  let byGroup = marksCache.get(tl)
  if (byGroup === undefined) {
    const acc = new Map<GroupIx, [Block, Ds][]>()
    for (const e of tl.stateEvents) {
      if (e.t !== 'clock') continue
      for (const [gi, ds] of e.marks) {
        let list = acc.get(gi)
        if (list === undefined) acc.set(gi, (list = []))
        list.push([e.b, ds])
      }
    }
    for (const list of acc.values()) list.sort((x, y) => x[0] - y[0] || x[1] - y[1])
    byGroup = acc
    marksCache.set(tl, byGroup)
  }
  return byGroup.get(g) ?? []
}

/**
 * El reloj de un grupo al cruzar el bloque b, de sus marcas por bloque creciente: exacto en una marca,
 * interpolado entre la anterior y la siguiente (D-01, punto 5). Sin marca posterior, que solo pasa en
 * una línea cortada, se extrapola a la velocidad entre sus dos últimas marcas, y con una sola se queda
 * en ella: el 3-a (la velocidad del grupo de origen) es del instante, que es quien pinta (§4.5); en
 * una línea entera nunca falta la marca siguiente de un grupo vivo (§3.4). Null sin marcas.
 */
function clockAt(marks: readonly (readonly [Block, Ds])[], b: Block): Ds | null {
  if (marks.length === 0) return null
  let lo = 0
  let hi = marks.length - 1
  let m0 = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (marks[mid]![0] <= b) {
      m0 = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  if (m0 >= 0 && marks[m0]![0] === b) return marks[m0]![1]
  const m1 = m0 + 1 < marks.length ? m0 + 1 : -1
  if (m0 >= 0 && m1 >= 0) {
    const [b0, d0] = marks[m0]!
    const [b1, d1] = marks[m1]!
    return toDs((d0 + ((d1 - d0) * (b - b0)) / (b1 - b0)) / 10)
  }
  if (m0 < 0) return marks[0]![1] // antes de su primera marca: no se pinta, y la foto no lo pide
  if (m0 >= 1) {
    const [b0, d0] = marks[m0 - 1]!
    const [b1, d1] = marks[m0]!
    if (b1 > b0) return toDs((d1 + ((d1 - d0) * (b - b1)) / (b1 - b0)) / 10)
  }
  return marks[m0]![1]
}

/**
 * LA FOTO al final del bloque b: la foto clave anterior (o la de salida) y los sucesos de estado hasta
 * b. Pura. El reloj de cada grupo vivo es el de sus marcas en b; la capa de detalle, la del bloque si
 * es de foto de km.
 */
export function photoAt(tl: TimelineCore, b: Block): Photo {
  let key: TimelineCore['keys'][number] | null = null
  for (const k of tl.keys) {
    if (k.b > b) break
    key = k
  }
  let p: Photo =
    key === null
      ? startPhoto(tl)
      : { b: key.b, groupOf: key.groupOf.slice(), main: key.main, clock: new Map(), detail: null }
  const fromB = p.b
  for (const e of tl.stateEvents) {
    if (e.b <= fromB) continue
    if (e.b > b) break
    // El reloj lo pone la cuenta de abajo: `reducePhoto` copiaría el mapa en cada marca.
    if (e.t === 'clock') continue
    p = reducePhoto(p, e)
  }
  const alive = new Set<GroupIx>()
  for (const g of p.groupOf) if (g >= 0) alive.add(g)
  const clock = new Map<GroupIx, Ds>()
  for (const g of [...alive].sort((x, y) => x - y)) {
    const ds = g === 0 && clockMarksOf(tl, 0).length === 0 ? 0 : clockAt(clockMarksOf(tl, g), b)
    if (ds !== null) clock.set(g, ds)
  }
  return { b, groupOf: p.groupOf, main: p.main, clock, detail: tl.detail.get(b) ?? null }
}
