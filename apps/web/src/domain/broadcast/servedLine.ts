/**
 * LA LÍNEA SERVIDA (E2, docs/retransmision.md §4.6, §4.11 y §14.11; nota 1 del 3b y del 3a). Pura.
 *
 * La web no tiene la línea de la etapa: tiene la cabecera y los tramos que ha pedido, y con ellos
 * rehace la `TimelineCore` que leen `instantAt` y `headAtLine`. Juntar los tramos de 0 a T da la línea
 * que `cutTimeline` daría en T (sin lo que se ve en la meta o después, que ningún tramo lleva, §8.7),
 * y el instante sobre ella, a cualquier hora de lo servido, es el de la línea entera (B9).
 *
 * Lo que sale de la cabecera: `riderIds` (de `cast[i].id`), la longitud, el bloque y el número de
 * bloques (`stage.lengthKm`, `dx` y `blocks`, que la cabecera lleva desde el 3c), el perfil y el reloj.
 * Lo que sale de los tramos: los grupos, de `groupsBorn` (con `bornB` en la primera marca del grupo,
 * que viaja en el mismo tramo) y `groupsDied`; y cada lista, reordenada por bloque al juntarla, porque
 * cada tramo la trae por la hora a la que se ve (nota 1 del 3a). El primer tramo, el que empieza en 0,
 * lleva también lo que se ve desde la salida: el grupo de salida, su marca del bloque 0 (la del
 * adaptador de la radio vale 0 Ds) y su fila de detalle del km 0 (3c). Antes de él, la línea tiene
 * solo el grupo de salida, el 0, `peloton`, desde el bloque 0 y con todos (3-f).
 *
 * Nace en el 3c. Un código que la web no conozca se lee como null (4-m).
 *
 * La crono, desde el 6b (§4.6, §9.2): la preparación pública de la cabecera (`BroadcastHead.tt`: el
 * orden, el intervalo y los controles) y, de los tramos, cada salida, cada paso por un km entero y cada
 * paso por un control, a su hora (`BroadcastChunk.tt`). Quien aún no ha salido no tiene salida y vale
 * `+∞` (`timeTrialInstantAt` lo cuenta por salir); sus filas, los pasos ya vistos, en orden. Una crono
 * no tiene grupos: tampoco el de salida. Los percances, de sus sucesos revelados (el grabador los
 * guarda con su km y su pérdida, que la crono no pinta).
 */
import {
  BANNER_CODE,
  type BannerResult,
  type TimeTrialTrace,
  toDs,
  type Block,
  type BroadcastChunk,
  type BroadcastHead,
  type Ds,
  type GroupCatalogEntry,
  type GroupDetail,
  type GroupIx,
  type GroupOrigin,
  type InstantContext,
  type LiveLine,
  MISHAP_CODE,
  type MishapKind,
  PULL_MOTIVE_CODE,
  type PullMotive,
  type RiderIx,
  type StateEvent,
  type TimelineCore,
  type TimelineEvent,
  type TimelineEventWire,
  fromDs,
  fromKm10,
  instantAt,
  visibilityOf,
} from '@cyclingstar/shared'

/** Lo que llega en los tramos, tal cual, para rehacer la línea con cada uno. */
interface ServedParts {
  readonly born: readonly (readonly [GroupIx, string, GroupOrigin])[]
  readonly died: readonly (readonly [GroupIx, Block, number])[]
  /** tríos [b, rider, to + 1] */
  readonly moves: readonly number[]
  /** pares [b, group + 1] */
  readonly main: readonly number[]
  /** tríos [b, g, Ds] */
  readonly clocks: readonly number[]
  /** cuartetos [b, rider, MISHAP_CODE, lostDs] */
  readonly mishaps: readonly number[]
  /** registros de la capa de detalle */
  readonly details: readonly number[]
  readonly events: readonly TimelineEventWire[]
  /** registros de las pancartas */
  readonly banners: readonly number[]
  /** la crono: pares [rider, startDs], y tríos [rider, k, Ds] de los km y [rider, c, Ds] de los controles */
  readonly ttStarts: readonly number[]
  readonly ttKm: readonly number[]
  readonly ttChecks: readonly number[]
}

/** La línea de la web: lo que sabe de la etapa tras los tramos recibidos. */
export interface ServedLine {
  /** la línea con lo servido, la que leen `instantAt` y `headAtLine` */
  readonly core: TimelineCore
  /** la voz de los tramos, en su orden (cada tramo la trae por su `revealS`, §14.3) */
  readonly lines: readonly LiveLine[]
  /** el `toDs` del último tramo juntado; 0 antes del primero */
  readonly toDs: Ds
  /** lo recibido, para rehacer la línea con el tramo siguiente */
  readonly parts: ServedParts
}

const NO_PARTS: ServedParts = {
  born: [],
  died: [],
  moves: [],
  main: [],
  clocks: [],
  mishaps: [],
  details: [],
  events: [],
  banners: [],
  ttStarts: [],
  ttKm: [],
  ttChecks: [],
}

/** La línea antes del primer tramo: solo la cabecera, y en ella el grupo de salida con todos (3-f). */
export function servedLineOf(head: BroadcastHead): ServedLine {
  return { core: coreOf(head, NO_PARTS), lines: [], toDs: 0, parts: NO_PARTS }
}

/** La línea con un tramo más. Pura: devuelve otra y no toca la de entrada. */
export function withChunk(
  head: BroadcastHead,
  line: ServedLine,
  chunk: BroadcastChunk,
): ServedLine {
  const p = line.parts
  const parts: ServedParts = {
    born: [...p.born, ...chunk.groupsBorn],
    died: [...p.died, ...chunk.groupsDied],
    moves: [...p.moves, ...chunk.moves],
    main: [...p.main, ...chunk.main],
    clocks: [...p.clocks, ...chunk.clocks],
    mishaps: [...p.mishaps, ...chunk.mishaps],
    details: [...p.details, ...chunk.details],
    events: [...p.events, ...chunk.events],
    banners: [...p.banners, ...chunk.banners],
    ttStarts: [...p.ttStarts, ...(chunk.tt?.starts ?? [])],
    ttKm: [...p.ttKm, ...(chunk.tt?.km ?? [])],
    ttChecks: [...p.ttChecks, ...(chunk.tt?.checks ?? [])],
  }
  return {
    core: coreOf(head, parts),
    lines: [...line.lines, ...chunk.lines],
    toDs: Math.max(line.toDs, chunk.toDs),
    parts,
  }
}

/**
 * UN TRAMO, JUNTADO EN SUS TAREAS (10b, los arreglos; §18.5 y D-56). Al llegar cada tramo la web hacía
 * de golpe, en la tarea de su respuesta (con su `Response.json` y su `safeParse`), la línea nueva
 * (`withChunk`) y su índice (el primer `instantAt` sobre ella, para la cabeza en su borde): de 55 a 77 ms
 * con la CPU a ×4 al final de Colombia e5, en `Highlights`. Aquí cada cosa va en su tarea: `next` cede el
 * hilo antes de rehacer la línea, antes de su visibilidad (`visibilityOf`, que guarda la suya por línea
 * y el índice reutiliza) y antes de indexarla. Lo que se pinta no cambia: mientras tanto la pantalla
 * sigue con la línea de antes, que a cualquier hora de lo servido da el mismo instante que la nueva
 * (B9), y quien llama la cambia, con el borde, cuando esto acaba. Si `next` falla (la pantalla se fue),
 * no sigue. Pura salvo `next`: la línea de entrada no cambia.
 */
export async function withChunkSpread(
  head: BroadcastHead,
  line: ServedLine,
  chunk: BroadcastChunk,
  ctx: InstantContext,
  next: () => Promise<void>,
): Promise<{ readonly line: ServedLine; readonly headKmAtEnd: number }> {
  await next()
  const out = withChunk(head, line, chunk)
  await next()
  visibilityOf(out.core)
  await next()
  return { line: out, headKmAtEnd: instantAt(out.core, fromDs(chunk.toDs), ctx).headKm }
}

/** El código de vuelta a su nombre; null si la web no lo conoce (4-m). */
function decoder<K extends string>(codes: Readonly<Record<K, number>>): (code: number) => K | null {
  const byCode = new Map<number, K>()
  for (const k of Object.keys(codes) as K[]) byCode.set(codes[k], k)
  return (code) => byCode.get(code) ?? null
}
const mishapOf = decoder<MishapKind>(MISHAP_CODE)
const motiveOf = decoder<PullMotive>(PULL_MOTIVE_CODE)
const bannerOf = decoder<BannerResult['kind']>(BANNER_CODE)

/** El orden de las variantes dentro de un bloque (§4.2): out, move, main, clock, mishap. */
const RANK: Readonly<Record<StateEvent['t'], number>> = {
  out: 0,
  move: 1,
  main: 2,
  clock: 3,
  mishap: 4,
}

/** Rehace la línea con todo lo recibido: cada lista, por bloque. */
function coreOf(head: BroadcastHead, p: ServedParts): TimelineCore {
  const riderIds: string[] = []
  for (const c of head.cast) riderIds[c.ix] = c.id

  // Las marcas, por bloque y, dentro, por grupo; y la primera de cada grupo, que es su nacimiento.
  const marksAt = new Map<Block, (readonly [GroupIx, Ds])[]>()
  const firstMark = new Map<GroupIx, Block>()
  for (let i = 0; i + 2 < p.clocks.length; i += 3) {
    const [b, g, ds] = [p.clocks[i]!, p.clocks[i + 1]!, p.clocks[i + 2]!]
    ;(marksAt.get(b) ?? marksAt.set(b, []).get(b)!).push([g, ds])
    firstMark.set(g, Math.min(firstMark.get(g) ?? b, b))
  }

  // EL CATÁLOGO: el de salida y los nacidos, con su muerte y su sucesor si ya se ven. Es un prefijo
  // del de la línea (4-a): si faltara uno, los de detrás no se pueden poner y se cortan ahí. El de
  // salida llega en el primer tramo; hasta entonces, el 0 con todos (3-f).
  const catalog: (GroupCatalogEntry | undefined)[] = head.stage.timeTrial
    ? [] // una crono no tiene grupos (§9.1)
    : [{ id: 'peloton', origin: 'start', bornB: 0, diedB: null, successor: null }]
  for (const [g, id, origin] of p.born)
    catalog[g] = { id, origin, bornB: firstMark.get(g) ?? 0, diedB: null, successor: null }
  for (const [g, diedB, successor] of p.died) {
    const entry = catalog[g]
    if (entry !== undefined)
      catalog[g] = { ...entry, diedB, successor: successor < 0 ? null : successor }
  }
  const groups: GroupCatalogEntry[] = []
  for (const entry of catalog) {
    if (entry === undefined) break
    groups.push(entry)
  }

  // LOS SUCESOS DE ESTADO, por bloque y en el orden de §4.2. Un `move` junta a los que van al mismo
  // grupo en el mismo bloque, por RiderIx creciente, aunque se vean en tramos distintos.
  const stateEvents: StateEvent[] = []
  const movesAt = new Map<string, { b: Block; to: GroupIx; riders: RiderIx[] }>()
  for (let i = 0; i + 2 < p.moves.length; i += 3) {
    const [b, rider, to1] = [p.moves[i]!, p.moves[i + 1]!, p.moves[i + 2]!]
    if (to1 === 0) {
      stateEvents.push({ t: 'out', b, rider })
      continue
    }
    const key = `${b}:${to1 - 1}`
    const m = movesAt.get(key) ?? movesAt.set(key, { b, to: to1 - 1, riders: [] }).get(key)!
    m.riders.push(rider)
  }
  for (const m of movesAt.values())
    stateEvents.push({ t: 'move', b: m.b, to: m.to, riders: m.riders.sort((x, y) => x - y) })
  for (let i = 0; i + 1 < p.main.length; i += 2) {
    const g1 = p.main[i + 1]!
    stateEvents.push({ t: 'main', b: p.main[i]!, group: g1 === 0 ? null : g1 - 1 })
  }
  for (const [b, marks] of marksAt)
    stateEvents.push({ t: 'clock', b, marks: marks.sort((x, y) => x[0] - y[0]) })
  for (let i = 0; i + 3 < p.mishaps.length; i += 4) {
    const kind = mishapOf(p.mishaps[i + 2]!)
    if (kind === null) continue
    stateEvents.push({
      t: 'mishap',
      b: p.mishaps[i]!,
      rider: p.mishaps[i + 1]!,
      kind,
      lostDs: p.mishaps[i + 3]!,
    })
  }
  stateEvents.sort(
    (x, y) =>
      x.b - y.b ||
      RANK[x.t] - RANK[y.t] ||
      (x.t === 'out' && y.t === 'out' ? x.rider - y.rider : 0) ||
      (x.t === 'move' && y.t === 'move' ? x.to - y.to : 0),
  )

  // LA CAPA DE DETALLE, por bloque de foto y con sus filas por grupo.
  const detail = new Map<Block, GroupDetail[]>()
  for (let i = 0; i + 6 < p.details.length;) {
    const d = p.details
    const [b, g, speed10, pullingTotal, mishapCode, lostDs, n] = d.slice(i, i + 7) as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ]
    const pullers: GroupDetail['pullers'][number][] = []
    for (let j = 0; j < n; j++) {
      const at = i + 7 + j * 3
      const forRider = d[at + 2]!
      pullers.push({
        rider: d[at]!,
        motive: motiveOf(d[at + 1]!),
        forRider: forRider < 0 ? null : forRider,
      })
    }
    const kind = mishapOf(mishapCode)
    ;(detail.get(b) ?? detail.set(b, []).get(b)!).push({
      g,
      speedKmh: speed10 < 0 ? null : speed10 / 10,
      pullingTotal,
      pullers,
      mishap: kind === null ? null : { kind, lostS: fromDs(lostDs) },
    })
    i += 7 + n * 3
  }
  for (const rows of detail.values()) rows.sort((x, y) => x.g - y.g)

  // LOS SUCESOS, por su hora y, a igual hora, por su índice (§4.2).
  const events: TimelineEvent[] = p.events
    .map(([source, plantilla, km10, tSDs, bEmit, revealDs, riders, datos]): TimelineEvent => ({
      source,
      plantilla,
      km: fromKm10(km10),
      tS: fromDs(tSDs),
      bEmit,
      revealS: fromDs(revealDs),
      riders: [...riders],
      datos: datos === null ? null : { ...datos },
    }))
    .sort((x, y) => x.revealS - y.revealS || x.source - y.source)

  // LAS PANCARTAS, por km: la categoría y el nombre de una cima, del perfil (4-n).
  const banners: BannerResult[] = []
  for (let i = 0; i + 3 < p.banners.length;) {
    const d = p.banners
    const kind = bannerOf(d[i]!)
    const km = fromKm10(d[i + 1]!)
    const n = d[i + 3]!
    const order: BannerResult['order'][number][] = []
    for (let j = 0; j < n; j++) order.push({ rider: d[i + 4 + j * 2]!, points: d[i + 5 + j * 2]! })
    if (kind !== null) {
      // la pancarta va en el km del centro de su bloque, en décimas: la grabada, una décima después de
      // la cima del perfil (37,1 la del km 37,0); la del adaptador, en el km de la cima. La más cercana
      // a menos de un bloque (6a)
      let climb: (typeof head.profile.climbs)[number] | undefined
      if (kind === 'cima')
        for (const c of head.profile.climbs) {
          const d = Math.abs(c.topKm - km)
          if (d <= head.stage.dx + 1e-6 && (climb === undefined || d < Math.abs(climb.topKm - km)))
            climb = c
        }
      banners.push({
        kind,
        km,
        cat: climb?.cat ?? null,
        name: climb?.name ?? null,
        revealS: fromDs(d[i + 2]!),
        order,
      })
    }
    i += 4 + n * 2
  }
  banners.sort((x, y) => x.km - y.km)

  return {
    format: 1,
    // la web no lo sabe ni lo lee: el motor con que se corrió no cambia lo que se pinta
    engineVersion: 0,
    dx: head.stage.dx,
    blocks: head.stage.blocks,
    lengthKm: head.stage.lengthKm,
    timeTrial: head.stage.timeTrial,
    clock: head.clock,
    riderIds,
    groups,
    keys: [],
    stateEvents,
    events,
    detail,
    banners,
    profile: head.profile,
    tt: ttOf(head, riderIds.length, p, events),
  }
}

/** Las filas de una crono servida: por corredor, sus entradas vistas en orden, hasta la primera que falte. */
function rowsOf(n: number, triples: readonly number[]): Ds[][] {
  const at: Map<number, Ds>[] = Array.from({ length: n }, () => new Map())
  for (let i = 0; i + 2 < triples.length; i += 3)
    at[triples[i]!]?.set(triples[i + 1]!, triples[i + 2]!)
  return at.map((m) => {
    const row: Ds[] = []
    for (let k = 0; m.has(k); k++) row.push(m.get(k)!)
    return row
  })
}

/** LA TRAZA DE LA CRONO SERVIDA (§9.2): la preparación de la cabecera y lo visto en los tramos. */
function ttOf(
  head: BroadcastHead,
  n: number,
  p: ServedParts,
  events: readonly TimelineEvent[],
): TimeTrialTrace | null {
  if (head.tt === null) return null
  const startDs: Ds[] = Array.from({ length: n }, () => Number.POSITIVE_INFINITY)
  for (let i = 0; i + 1 < p.ttStarts.length; i += 2) startDs[p.ttStarts[i]!] = p.ttStarts[i + 1]!
  return {
    order: head.tt.order,
    intervalS: head.tt.intervalS,
    checksKm: [...head.tt.checksKm],
    startDs,
    kmClockDs: rowsOf(n, p.ttKm),
    checkClockDs: rowsOf(n, p.ttChecks),
    mishaps: events.flatMap((e) => {
      const rider = e.riders[0]
      if ((e.plantilla !== 'puncture' && e.plantilla !== 'mechanical') || rider === undefined)
        return []
      const lost = e.datos?.perdidaS
      return [
        {
          rider,
          km: e.km,
          kind: e.plantilla === 'puncture' ? ('pinchazo' as const) : ('averia' as const),
          lostDs: typeof lost === 'number' ? toDs(lost) : 0,
        },
      ]
    }),
  }
}
