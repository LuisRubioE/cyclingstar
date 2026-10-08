/**
 * LA RADIO DESDE LA LÍNEA (E2, docs/retransmision.md §12.10, §11.16 y §4.13; D-16, I-05, 12-o, 11-i;
 * paso 11a). El contrato `RaceRadio` de hoy (de `radioGroupSchema` a `raceRadioSchema`, `contracts.ts`)
 * construido desde la línea grabada en lugar de desde `stage_snapshots.radio`: la FOTO del dueño, un km
 * de la carretera con los grupos que pasan por él y sus huecos como resta de relojes en ese punto
 * (§3.2), que es otra mirada que el INSTANTE de `Watch` y se queda.
 *
 * Por cada bloque de foto (`photoBlocksOf`, §4.5), los grupos de `photoAt` (§4.4) en orden de carretera
 * (el reloj de su marca en ese bloque y, a igual reloj, el id del motor, como `radioKmFrom`), con su
 * `kind` por la regla del motor (`kindOf`, `raceRadio.ts`, copiada aquí y atada por B16 a la de
 * `radioKmFrom` sobre la misma foto), su tamaño y sus huecos redondeados al segundo como la radio
 * guardada; y de la capa de detalle (§4.2), la velocidad, el percance, los que tiran con su motivo y su
 * destinatario y `pullingTotal`. `racing` y `gone` salen de los que tienen grupo.
 *
 * A QUIÉN SE NOMBRA (12-o) lo decide quien llama con `RadioNames`: un grupo de hasta
 * `BROADCAST.nameWholeGroupUpTo` va entero (su composición es estado, §7.7, como en la radio guardada);
 * en uno mayor, los que tiran, los del espectador en todas las fotos en que corren (R23.7) y los
 * nombrables de ese km (`nameableAt`), y el resto se cuenta en `unnamed`. Como en `buildRaceRadio`
 * (`apps/api/src/chronicle.ts`), primero los que tiran y luego los que van a rueda, como mucho
 * `BROADCAST.radioNamedMax` por grupo; a rueda, los del espectador primero y los maillots de líder
 * después (el corte no puede caer encima de ellos, v47), y el resto por dorsal (`RiderIx`): la línea no
 * guarda el reloj de cada corredor dentro de su grupo, así que el orden de carretera de la radio
 * guardada no existe aquí. Un corredor que `riderOf` no conoce no se nombra y se cuenta.
 *
 * UNA LÍNEA CORTADA (`TimelineCore`, 4-b), como la que la web rehace con sus tramos (11-i): solo salen
 * las fotos CERRADAS, aquellas en las que todos los grupos vivos llevan ya su marca de ese bloque, es
 * decir, por las que ya han pasado todos (la foto del km 150 lleva el hueco del grupeto en el km 150, y
 * enseñarla antes de que pase adelantaría si entra en el control). Sale el prefijo de fotos cerradas:
 * en una línea entera, todas, porque cada grupo vivo lleva marca en cada foto de km (§3.4). Quien llama
 * corta la línea en lo pintado, nunca en lo descargado (D-57).
 *
 * En una crono devuelve la radio vacía (`kms: []`, `starters` 0), que es la que la envoltura guarda hoy:
 * la crono ignora la sonda (`simulate.ts`) y solo llama a `onTimeTrialRide` (§5.2).
 *
 * No es del lado del grabador (15-b): lee `BROADCAST`. Pura.
 */
import type {
  ChronicleRider,
  RaceRadio,
  RadioGroup,
  RadioGroupKind,
  RadioKm,
  RadioRider,
} from '../contracts.js'
import { JERSEY_PRIORITY } from '../jerseys.js'
import { BROADCAST } from './constants.js'
import { photoBlocksOf } from './instant.js'
import type {
  Block,
  Ds,
  GroupCatalogEntry,
  GroupDetail,
  GroupIx,
  RiderIx,
  TimelineCore,
  TimelineEvent,
} from './timeline.js'

/**
 * A QUIÉN NOMBRA LA RADIO (§4.13, 12-o): la identidad, los del espectador y los nombrables de cada foto.
 * La política la elige quien construye `names` (la tabla de §12.10): en la web, la de §7.7 sobre el
 * reparto servido de una etapa no conocida; en la ruta de etapa de una conocida y con `?diag=1`, esa
 * más los diez primeros de la etapa; en B16, la lista que recibe `radioForStorage` en el otro lado.
 */
export interface RadioNames {
  /** la cara de cada id: la forma de `ChronicleNames` (`apps/api/src/chronicle.ts`), que cabe en ella */
  readonly riderOf: ReadonlyMap<string, ChronicleRider>
  /** los del espectador, nombrados siempre en su grupo (R23.7) */
  readonly own: ReadonlySet<RiderIx>
  /** los nombrables en la foto de ese km (el `km` de la foto, `RadioKm.km`) */
  readonly nameableAt: (km: number) => ReadonlySet<RiderIx>
}

/** La radio de una etapa que no tiene: la de una crono, la que guarda hoy la envoltura. */
const EMPTY: RaceRadio = { starters: 0, kms: [] }

/**
 * El km de la foto del bloque `b`, con la cuenta de la radio guardada: el centro del bloque
 * (`kmAt`, `simulate.ts`) redondeado a `dx` (`roundKm`, `raceRadio.ts`), operación a operación, para
 * que salga el mismo número de coma flotante.
 */
export const radioKmOfBlock = (b: Block, dx: number): number =>
  Math.round(((b + 0.5) * dx) / dx) * dx

/** Las marcas de cada bloque de la línea: bloque → grupo → reloj en Ds. Una vez por objeto. */
const marksCache = new WeakMap<TimelineCore, ReadonlyMap<Block, ReadonlyMap<GroupIx, Ds>>>()
function marksAtBlocks(tl: TimelineCore): ReadonlyMap<Block, ReadonlyMap<GroupIx, Ds>> {
  let out = marksCache.get(tl)
  if (out === undefined) {
    const acc = new Map<Block, Map<GroupIx, Ds>>()
    for (const e of tl.stateEvents) {
      if (e.t !== 'clock') continue
      let at = acc.get(e.b)
      if (at === undefined) acc.set(e.b, (at = new Map()))
      for (const [g, ds] of e.marks) at.set(g, ds)
    }
    out = acc
    marksCache.set(tl, out)
  }
  return out
}

/**
 * EL `kind` DEL MOTOR (`kindOf`, `packages/engine/src/sim/raceRadio.ts`), sobre los relojes en Ds de la
 * línea, como lo proyecta I1 (§4.4): el que lleva el título es el pelotón; sin título, un grupo que
 * nació descolgado es grupeto y cualquier otro va escapado; detrás del pelotón, un ataque que se quedó
 * es tierra de nadie y lo demás grupeto; a la par, tierra; delante, el primero es la fuga y los demás,
 * contraataques.
 */
function kindOf(
  g: GroupCatalogEntry,
  isMain: boolean,
  ds: Ds,
  mainDs: Ds | null,
  movesAhead: number,
): RadioGroupKind {
  if (isMain) return 'peloton'
  if (mainDs === null) return g.origin === 'shed' ? 'grupeto' : 'fuga'
  if (ds > mainDs) return g.origin === 'attack' ? 'tierra' : 'grupeto'
  if (ds === mainDs) return 'tierra'
  return movesAhead === 0 ? 'fuga' : 'contra'
}

/** Los maillots de líder primero, por `JERSEY_PRIORITY`; sin maillot, detrás. */
const jerseyRank = (r: ChronicleRider | undefined): number => {
  const j = r?.jersey
  if (j === undefined || j === null) return JERSEY_PRIORITY.length
  const i = JERSEY_PRIORITY.indexOf(j)
  return i < 0 ? JERSEY_PRIORITY.length : i
}

/**
 * LA RADIO DE LA LÍNEA (§12.10): el contrato de hoy, foto a foto, con los nombres de `names`. Acepta una
 * línea cortada y entonces da solo el prefijo de fotos cerradas (arriba); en una crono, la radio vacía.
 */
export function radioFromTimeline(tl: TimelineCore, names: RadioNames): RaceRadio {
  if (tl.timeTrial) return EMPTY
  const marks = marksAtBlocks(tl)
  const kms: RadioKm[] = []
  let starters = 0
  // LA FOTO DE CADA BLOQUE DE FOTO, en una pasada: la reducción de `photoAt` (§4.4) desde la foto de
  // salida, suceso a suceso y sin volver a la foto clave en cada km (las claves son la misma reducción,
  // I3). El reloj no hace falta: el de cada grupo en una foto de km es su marca de ese bloque.
  const groupOf = new Int16Array(tl.riderIds.length)
  let titled: GroupIx | null = 0
  let next = 0
  for (const b of photoBlocksOf(tl.lengthKm, tl.dx)) {
    for (; next < tl.stateEvents.length && tl.stateEvents[next]!.b <= b; next++) {
      const e = tl.stateEvents[next]!
      if (e.t === 'out') groupOf[e.rider] = -1
      else if (e.t === 'move') for (const r of e.riders) groupOf[r] = e.to
      else if (e.t === 'main') titled = e.group
    }
    const membersOf = new Map<GroupIx, RiderIx[]>()
    let racing = 0
    groupOf.forEach((g, r) => {
      if (g < 0) return
      racing += 1
      const list = membersOf.get(g)
      if (list === undefined) membersOf.set(g, [r])
      else list.push(r)
    })
    // La foto se enseña si está cerrada: todos los grupos vivos con su marca de este bloque.
    const at = marks.get(b)
    const live: { g: GroupIx; entry: GroupCatalogEntry; ds: Ds; members: RiderIx[] }[] = []
    let closed = membersOf.size > 0
    for (const [g, members] of membersOf) {
      const ds = at?.get(g)
      const entry = tl.groups[g]
      if (ds === undefined || entry === undefined) {
        closed = false
        break
      }
      live.push({ g, entry, ds, members })
    }
    if (!closed) break
    // Orden de carretera: el reloj y, a igual reloj, el id del motor (`radioKmFrom`).
    live.sort((x, y) => x.ds - y.ds || (x.entry.id < y.entry.id ? -1 : 1))
    const km = radioKmOfBlock(b, tl.dx)
    const leadDs = live[0]!.ds
    // El título de la línea (D-03), el que pinta la barra de `Watch`: si apuntara a un grupo sin nadie,
    // no hay pelotón en la foto (en las congeladas no pasa).
    const main = titled !== null && membersOf.has(titled) ? titled : null
    const mainDs = main === null ? null : (at!.get(main) ?? null)
    const rows = new Map<GroupIx, GroupDetail>(
      (tl.detail.get(b) ?? []).map((d) => [d.g, d] as const),
    )
    const nameable = names.nameableAt(km)
    let movesAhead = 0
    let prevGap = 0
    const groups: RadioGroup[] = live.map((x, gi) => {
      const kind = kindOf(x.entry, x.g === main, x.ds, mainDs, movesAhead)
      if (kind === 'fuga' || kind === 'contra') movesAhead += 1
      const row = rows.get(x.g)
      const gapS = Math.round((x.ds - leadDs) / 10)
      const gapToPrevS = gi === 0 ? 0 : Math.max(0, gapS - prevGap)
      prevGap = gapS
      return {
        kind,
        size: x.members.length,
        gapS,
        gapToPrevS,
        speedKmh: row?.speedKmh ?? null,
        mishap: row?.mishap ? { tipo: row.mishap.kind, lostS: row.mishap.lostS } : null,
        ...namedOf(tl, x.members, row, nameable, names),
        pullingTotal: row?.pullingTotal ?? 0,
      }
    })
    starters = Math.max(starters, racing)
    kms.push({ km, groups, racing, gone: 0 })
  }
  // `starters` como la radio guardada: los que corren en la foto más poblada, que es la primera.
  return { starters, kms: kms.map((k) => ({ ...k, gone: Math.max(0, starters - k.racing) })) }
}

/** Los nombrados de un grupo y los que se cuentan (12-o; el corte de `buildRaceRadio`). */
function namedOf(
  tl: TimelineCore,
  members: readonly RiderIx[],
  row: GroupDetail | undefined,
  nameable: ReadonlySet<RiderIx>,
  names: RadioNames,
): { riders: RadioRider[]; unnamed: number } {
  const who = (r: RiderIx): ChronicleRider | undefined => names.riderOf.get(tl.riderIds[r] ?? '')
  const named: RadioRider[] = []
  const pulling = new Set<RiderIx>()
  for (const p of row?.pullers ?? []) {
    pulling.add(p.rider)
    const r = who(p.rider)
    if (r === undefined) continue
    const para = p.forRider === null ? null : (who(p.forRider) ?? null)
    named.push({ ...r, role: 'pulling', motivo: p.motive, para })
  }
  const whole = members.length <= BROADCAST.nameWholeGroupUpTo
  const sheltered = members
    .filter((r) => !pulling.has(r) && (whole || names.own.has(r) || nameable.has(r)))
    .map((r) => ({ r, id: who(r) }))
    .sort(
      (a, b) =>
        Number(names.own.has(b.r)) - Number(names.own.has(a.r)) ||
        jerseyRank(a.id) - jerseyRank(b.id) ||
        a.r - b.r,
    )
  for (const { id } of sheltered)
    if (id !== undefined) named.push({ ...id, role: 'sheltered', motivo: null, para: null })
  const shown = named.slice(0, BROADCAST.radioNamedMax)
  return { riders: shown, unnamed: Math.max(0, members.length - shown.length) }
}

/** Lo que la política de §7.7 lee del reparto servido para nombrar en la radio (12-o). */
export interface RadioNamePolicy {
  /** los que llevan un maillot que no es el de su equipo (líder o campeón), con el velo de quien mira */
  readonly wearing: Iterable<RiderIx>
  /** la general de salida servida, con el velo: se nombran los `namedGcTop` primeros */
  readonly gcTop: readonly { readonly rider: RiderIx; readonly rank: number }[]
  /** además, en una etapa conocida y con `?diag=1`: los diez primeros de la etapa (12-o) */
  readonly extra?: Iterable<RiderIx>
}

/**
 * LOS NOMBRABLES DE CADA FOTO (§7.7 sobre la línea; 12-o): los que llevan un maillot que no es el de su
 * equipo, los `BROADCAST.namedGcTop` primeros de la general de salida, los de `extra` y los
 * protagonistas de los sucesos de km menor o igual que el de la foto, la regla del adaptador
 * (`veilStoredRadio`, §11.16) para los sucesos ya revelados. Sobre una línea cortada en lo pintado, sus
 * sucesos son los revelados hasta ahí, y ninguno de después entra.
 */
export function radioNameableAt(
  tl: Pick<TimelineCore, 'events'>,
  policy: RadioNamePolicy,
): (km: number) => ReadonlySet<RiderIx> {
  const base = new Set<RiderIx>(policy.wearing)
  for (const row of policy.gcTop) if (row.rank <= BROADCAST.namedGcTop) base.add(row.rider)
  for (const r of policy.extra ?? []) base.add(r)
  const events: readonly TimelineEvent[] = [...tl.events].sort((a, b) => a.km - b.km)
  const byCount = new Map<number, ReadonlySet<RiderIx>>()
  return (km) => {
    let lo = 0
    let hi = events.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (events[mid]!.km <= km + 1e-9) lo = mid + 1
      else hi = mid
    }
    let set = byCount.get(lo)
    if (set === undefined) {
      const s = new Set(base)
      for (let i = 0; i < lo; i++) for (const r of events[i]!.riders) s.add(r)
      set = s
      byCount.set(lo, set)
    }
    return set
  }
}
