import { STAGE } from '@cyclingstar/engine'
import {
  type Block,
  type GroupIx,
  type RaceS,
  type RecorderView,
  type RiderIx,
  fromDs,
  revealSOf,
  toDs,
} from '@cyclingstar/shared'
import type { ChronicleEvent } from './chronicle.js'

/**
 * LA FUENTE DE LA RETRANSMISIÓN (E2, docs/retransmision.md §3.8 y §14.4).
 *
 * Las etapas corridas antes de que se grabe la línea (paso 5) no tienen reloj de grupo ni identidad:
 * solo la radio guardada (`stage_snapshots.radio`, una foto por km) y los sucesos congelados. El
 * ADAPTADOR DE LA RADIO las sirve con el mismo formato que las demás, con un reloj estimado (D-07).
 *
 * En el PR 2 este fichero nace con lo que B19 necesita de esas etapas (16-a, 17-d): el reloj
 * estimado de la cabeza (`estimatedHeadClock`) y la hora a la que se enseña cada suceso guardado
 * sobre ese reloj (`revealStoredEvents`, con `revealSOf`). El adaptador entero —la `StageTimeline`
 * degradada, su reparto provisional, `timelineForStage` y su LRU— llega en el 3a, encima de esto.
 */

/**
 * Lo que el adaptador lee de una foto de la radio guardada. `StoredRadioKm` (raceRadio.ts) cabe en
 * él, y también la radio validada con `storedRaceRadioSchema` (chronicle.ts), cuyos opcionales no
 * casan con los del motor: por eso se pide solo lo que se usa.
 */
export interface StoredRadioPhoto {
  /** el km del final del bloque de la foto (radioKmFrom lo redondea a la décima): 0,1, 1,1… y la meta */
  readonly km: number
  /** por orden de carretera: la cabeza primero */
  readonly groups: readonly {
    readonly kind: string
    /** hueco a la cabeza, en s enteros: exacto en la foto, porque es una resta de relojes */
    readonly gapS: number
    /** la del km que ACABA de recorrer (desde la v90; la primera foto, la del siguiente); null si no se pudo medir */
    readonly speedKmh: number | null
    /** índices en la lista de nombrados (`StoredStage.radio.riders`) */
    readonly pulling: readonly number[]
    readonly watching: readonly number[]
  }[]
}

/** Lo que el adaptador sabe de una etapa corrida sin línea. */
export interface StoredStage {
  /** stage_snapshots.radio: los nombrados una sola vez y una foto por km */
  readonly radio: { readonly riders: readonly string[]; readonly kms: readonly StoredRadioPhoto[] }
  /** stage_snapshots.input.riders[].riderId, en su orden: la posición es el RiderIx (§4.1) */
  readonly riderIds: readonly string[]
  /** stageLengthKm(input.profile) */
  readonly lengthKm: number
  /** el tiempo del ganador (results): la cabeza llega a la meta en él */
  readonly winnerS: number
}

/** La hora de cada suceso guardado sobre el reloj estimado, y la vista con que se calculó. */
export interface StoredReveal {
  /** la vista de revelado sobre la radio y el reloj estimado; también la leen los racimos en vivo */
  readonly view: RecorderView
  /** por índice de stage_snapshots.events, en décimas, como la línea grabada (§3.8, §4.3) */
  readonly revealS: readonly RaceS[]
}

/** La velocidad del grupo en cabeza de una foto, o null si la radio no pudo medirla; 0 no se acepta. */
function headSpeed(photo: StoredRadioPhoto | undefined): number | null {
  const v = photo?.groups[0]?.speedKmh ?? null
  return v !== null && v > 0 ? v : null
}

/**
 * La velocidad de la cabeza en el tramo que va de la foto k a la k + 1, o null si la radio no la
 * midió. ESTO NO ES LO QUE ESCRIBE EL DISEÑO, y es a propósito: §3.8 integra cada tramo con la
 * velocidad de la foto de su INICIO, que es lo que medía la radio de la v89 (contra la foto
 * siguiente). Desde la v90 la velocidad de una foto es la del km que ACABA de recorrer
 * (`radioForStorage`: mide contra la foto anterior, y solo la primera, que no tiene anterior, contra
 * la siguiente), así que el tramo k → k + 1 lo mide la foto k + 1, y el primero, también la 0.
 * Medido con el motor v91 en las seis etapas de la tabla de §3.8 (`race-france` e7, e13, e18 y e20,
 * `race-flanders` y `race-colombia` e5, semillas 0 y 1), la posición de la cabeza cada 10 s contra el
 * reloj exacto de la radio completa: con la regla de la v89, un p99 de hasta 3,6 km (`race-colombia`
 * e5) y 1,5 km (e18), por encima del tope de B22; con esta, de 0,15 a 0,62 km en las doce corridas,
 * y como mucho 0,63, por debajo de los 0,69 que §3.8 midió en la v89.
 */
function segmentSpeed(kms: readonly StoredRadioPhoto[], k: number): number | null {
  return headSpeed(kms[k + 1]) ?? (k === 0 ? headSpeed(kms[0]) : null)
}

/**
 * El reloj de la cabeza en cada foto y en meta (§3.8): se integra la velocidad del grupo en cabeza
 * tramo a tramo y se reescala para que la meta caiga en el tiempo del ganador. Un tramo sin velocidad
 * toma la última conocida, y los anteriores al primero que la tiene, la de ése. El índice k es la
 * foto `kms[k]`; el último, la meta. Null si ninguna foto tiene velocidad de cabeza, o si las fotos
 * no avanzan: no hay reloj que estimar.
 *
 * Exportada para su test, `broadcastSource.test.ts`, aunque solo la usa el adaptador: probarla a
 * través del `revealS` de los sucesos no distingue sus tres casos.
 */
export function estimatedHeadClock(
  kms: readonly StoredRadioPhoto[],
  totalKm: number,
  winnerS: number,
): number[] | null {
  let v: number | null = null
  for (let k = 0; k < kms.length && v === null; k++) v = segmentSpeed(kms, k)
  if (v === null) return null
  const raw: number[] = [0]
  for (let k = 0; k < kms.length; k++) {
    const here = kms[k]!
    const nextKm = k + 1 < kms.length ? kms[k + 1]!.km : totalKm
    v = segmentSpeed(kms, k) ?? v
    raw.push(raw[raw.length - 1]! + ((nextKm - here.km) / v) * 3600)
  }
  const total = raw[raw.length - 1]!
  if (!(total > 0)) return null
  const scale = winnerS / total
  // La meta, exactamente en el tiempo del ganador: el producto en coma flotante puede pasarse por un
  // ulp, y entonces el reloj retrocedería en su último paso.
  return raw.map((s) => (s === total ? winnerS : Math.min(winnerS, s * scale)))
}

/** Holgura con que un km de foto, redondeado a la décima, se compara con el final de un bloque. */
const KM_EPS = STAGE.dx / 1000

/** Las plantillas que se fechan donde nació la fuga y se emiten al cuajar (caso (a) del mapa 01 §1.2). */
const CONFIRMED_BREAK = new Set(['breakaway_formed', 'break_cooperation'])

/**
 * LA HORA A LA QUE SE ENSEÑA CADA SUCESO GUARDADO (§3.8, §4.7): `revealSOf` sobre una vista
 * (`RecorderView`) que se construye con lo que la radio guardada sabe, en décimas. Null si no hay
 * reloj que estimar (ninguna foto con velocidad de cabeza).
 *
 * La vista, sin identidad ni tránsito (§3.8): el grupo es su PUESTO en la foto (0 la cabeza), la
 * pertenencia solo se sabe de los nombrados (los que tiran y la lista de seguimiento, y todos en un
 * grupo de hasta doce) y vale desde su foto hasta la siguiente. El reloj de la cabeza es lineal entre
 * dos fotos, como lo integra `estimatedHeadClock`, y el de cada grupo es el de la cabeza más su hueco
 * en la última foto: exacto en el punto. Sin pancartas: las disputas no se guardaron, y `banner` cae
 * en `emit`.
 *
 * EL BLOQUE DE EMISIÓN, que los sucesos guardados no traen (la sonda `onEvent` es del 4a), es el de su
 * km, porque el motor emite casi todo con el km del bloque en que va. Las dos excepciones de verdad
 * son la fuga y su colaboración, que se fechan donde nació la fuga y se emiten cuando cuaja: para
 * ellas, el de la primera foto en que un grupo con alguno de sus protagonistas saca
 * `STAGE.tacticBreakGapSeconds` al pelotón. Sin eso la voz diría «ésta es la fuga del día» en el km
 * del ataque, antes de que se sepa: el destripe en miniatura del mapa 01 §1.2.
 */
export function revealStoredEvents(
  events: readonly ChronicleEvent[],
  stage: StoredStage,
): StoredReveal | null {
  const { kms } = stage.radio
  const head = estimatedHeadClock(kms, stage.lengthKm, stage.winnerS)
  if (head === null) return null
  const dx = STAGE.dx
  const blocks = Math.max(1, Math.round(stage.lengthKm / dx))
  /** El bloque cuyo centro es ese km, como resuelve el motor las fotos (simulate.ts, `probeAt`). */
  const blockOfKm = (km: number): Block =>
    Math.max(0, Math.min(blocks - 1, Math.round(km / dx - 0.5)))
  /** El km del final del bloque b: donde se toma su foto, y donde está un grupo «al final de b». */
  const endKm = (b: Block): number => (b + 1) * dx
  /** El bloque al final del cual se tomó la foto k. */
  const photoBlock = (k: number): Block =>
    Math.max(0, Math.min(blocks - 1, Math.round(kms[k]!.km / dx) - 1))
  /** Los km del reloj de la cabeza: el de cada foto y, detrás, la meta. */
  const knotKm = [...kms.map((p) => p.km), stage.lengthKm]

  /** La última foto tomada al final de b o antes; −1 si ninguna. */
  const photoAtOrBefore = (b: Block): number => {
    const x = endKm(b) + KM_EPS
    let lo = 0
    let hi = kms.length - 1
    let found = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (kms[mid]!.km <= x) {
        found = mid
        lo = mid + 1
      } else hi = mid - 1
    }
    return found
  }
  const headClockAt = (b: Block): RaceS => {
    const k = photoAtOrBefore(b)
    if (b < 0 || k < 0) return 0
    const k0 = knotKm[k]!
    const k1 = knotKm[k + 1]!
    const t0 = head[k]!
    const t1 = head[k + 1]!
    if (k1 <= k0) return t1
    return t0 + (t1 - t0) * Math.min(1, Math.max(0, (endKm(b) - k0) / (k1 - k0)))
  }

  // Quién va en qué puesto en cada foto, por su índice en la lista de nombrados.
  const radioIx = new Map(stage.radio.riders.map((id, i) => [id, i] as const))
  const puestoDe = kms.map((photo) => {
    const m = new Map<number, GroupIx>()
    photo.groups.forEach((g, j) => {
      for (const i of g.pulling) m.set(i, j)
      for (const i of g.watching) m.set(i, j)
    })
    return m
  })
  const riderIxOf = new Map(stage.riderIds.map((id, i) => [id, i] as const))
  const groupAt = (r: RiderIx, b: Block): GroupIx | null => {
    const k = photoAtOrBefore(b)
    if (b < 0 || k < 0) return 0 // todos salen en el grupo de salida
    const id = stage.riderIds[r]
    const i = id === undefined ? undefined : radioIx.get(id)
    return i === undefined ? null : (puestoDe[k]!.get(i) ?? null)
  }
  const clockAt = (g: GroupIx, b: Block): RaceS | null => {
    const k = photoAtOrBefore(b)
    if (b < 0 || k < 0) return g === 0 ? headClockAt(b) : null
    const group = kms[k]!.groups[g]
    return group === undefined ? null : headClockAt(b) + group.gapS
  }

  /** La primera foto en que la fuga de `e` saca el hueco con que el motor la da por cuajada. */
  const confirmationBlock = (e: ChronicleEvent): Block | null => {
    const suyos = new Set(
      e.protagonistas.flatMap((id) => {
        const i = radioIx.get(id)
        return i === undefined ? [] : [i]
      }),
    )
    if (suyos.size === 0) return null
    for (let k = 0; k < kms.length; k++) {
      const photo = kms[k]!
      if (photo.km + KM_EPS < e.km) continue
      const peloton = photo.groups.find((g) => g.kind === 'peloton')
      const fuga = photo.groups.find(
        (g) => g.pulling.some((i) => suyos.has(i)) || g.watching.some((i) => suyos.has(i)),
      )
      if (peloton && fuga && peloton.gapS - fuga.gapS >= STAGE.tacticBreakGapSeconds)
        return photoBlock(k)
    }
    return null
  }
  const bEmit: readonly Block[] = events.map(
    (e) => (CONFIRMED_BREAK.has(e.plantilla) ? confirmationBlock(e) : null) ?? blockOfKm(e.km),
  )
  const riders: readonly (readonly (RiderIx | null)[])[] = events.map((e) =>
    e.protagonistas.map((id) => riderIxOf.get(id) ?? null),
  )

  const view: RecorderView = {
    timeTrial: false, // una crono no tiene radio: el adaptador no la construye (3-d)
    finishS: head[head.length - 1]!,
    riderIx: (id) => riderIxOf.get(id) ?? null,
    blockOfKm,
    groupAt,
    clockAt,
    headClockAt,
    bannerAt: () => null,
    nextEmitOf: (rider, afterSource) => {
      for (let i = afterSource + 1; i < events.length; i++)
        if (riders[i]!.includes(rider)) return bEmit[i]!
      return null
    },
    // Sin traza de crono: el adaptador no fecha nunca un suceso con reloj propio (timeTrial: false).
    ttStartS: () => 0,
    ttOwnClockAt: () => 0,
  }
  const revealS = events.map((e, i) => fromDs(toDs(revealSOf(e, i, bEmit[i]!, view))))
  return { view, revealS }
}
