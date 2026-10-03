import {
  type CastIdentities,
  type Database,
  type Horizon,
  getCastIdentities,
  getGcThroughStage,
  getKomClassification,
  getPointsClassification,
  getStageResults,
  getStageSnapshot,
  getTeamClassifications,
} from '@cyclingstar/db'
import {
  STAGE,
  type StageProfile,
  type WeatherPlace,
  bearingAt,
  roadBearings,
  sampleProfile,
  stageLengthKm,
  stageWeather,
  stageWindStrength,
  weatherAt,
  weatherPlan,
  windComponents,
} from '@cyclingstar/engine'
import {
  BROADCAST,
  type Block,
  type CastRider,
  type CastTeam,
  type Ds,
  type GroupCatalogEntry,
  type GroupDetail,
  type GroupIx,
  type GroupOrigin,
  JERSEY_PRIORITY,
  type JerseyKind,
  NO_LEADERS,
  type NameResolver,
  type NotorietyLevel,
  type ProfileStrip,
  type RaceLeaders,
  type RaceS,
  type RadioGroupKind,
  type RecorderView,
  type RiderCard,
  type RiderIx,
  type StageRef,
  type StageTimeline,
  type StageWeather,
  type StateEvent,
  type TimelineCast,
  type TimelineEvent,
  type WornJersey,
  fromDs,
  fromKm10,
  jerseyOf,
  photoBlocksOf,
  raceLeaders,
  revealSOf,
  toDs,
  toKm10,
} from '@cyclingstar/shared'
import { z } from 'zod'
import {
  type ChronicleEvent,
  type StoredRadio,
  storedRaceRadioSchema,
  veilStoredRadio,
} from './chronicle.js'

/**
 * LA FUENTE DE LA RETRANSMISIÓN (E2, docs/retransmision.md §3.8 y §14.4).
 *
 * Las etapas corridas antes de que se grabe la línea (paso 5) no tienen reloj de grupo ni identidad:
 * solo la radio guardada (`stage_snapshots.radio`, una foto por km) y los sucesos congelados. El
 * ADAPTADOR DE LA RADIO las sirve con el mismo formato que las demás, con un reloj estimado (D-07).
 *
 * En el PR 2 este fichero nació con lo que B19 necesita de esas etapas (16-a, 17-d): el reloj
 * estimado de la cabeza (`estimatedHeadClock`) y la hora a la que se enseña cada suceso guardado
 * sobre ese reloj (`revealStoredEvents`, con `revealSOf`). El 3a le pone encima el adaptador entero:
 * la `StageTimeline` degradada (`adaptRadioStage`), su perfil, su tiempo y su reparto provisionales,
 * `leadersThroughStage` (que sale de `routes/races.ts`), `timelineForStage` con su LRU y la primera
 * forma de `serveCast`.
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
  /** por índice de stage_snapshots.events: el bloque en que se emitió (abajo); la línea lo guarda (3a) */
  readonly bEmit: readonly Block[]
  /** el reloj de la cabeza en cada foto y, detrás, en meta (`estimatedHeadClock`) */
  readonly head: readonly RaceS[]
  /** el bloque de cada foto (`storedPhotoBlocks`) */
  readonly photoBlocks: readonly Block[]
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

/**
 * EL BLOQUE DE CADA FOTO de la radio guardada (3a). El paso 2 lo sacaba del km guardado
 * (`round(km / dx) − 1`), y no vale: el motor resuelve cada km de foto al bloque cuyo CENTRO le
 * corresponde (`probeAt`, simulate.ts) y guarda como km ese centro redondeado a la décima, que en coma
 * flotante a veces cae hacia abajo (el bloque 40, de centro 4,05 km, se guarda como el km 4,0). Medido
 * con el motor v91, 14 fotos de cada una de las cinco etapas congeladas en línea salían un bloque
 * antes: la vista veía la foto un bloque antes de que se tomara. El calendario de fotos es público
 * (`photoBlocksOf`, la copia atada de `radioKmPoints`): si la radio tiene tantas fotos como él, que es
 * siempre con el motor de hoy, cada foto es su bloque; si no (una radio escrita a mano en un test, o de
 * un motor que fotografiaba otros km), la cuenta del km, sin repetir bloque.
 */
export function storedPhotoBlocks(
  kms: readonly { readonly km: number }[],
  lengthKm: number,
): Block[] {
  const dx = STAGE.dx
  const calendar = photoBlocksOf(lengthKm, dx)
  if (calendar.length === kms.length) return [...calendar]
  const last = Math.max(1, Math.round(lengthKm / dx)) - 1
  const out: Block[] = []
  for (const p of kms) {
    const prev = out[out.length - 1]
    const b = Math.max(0, Math.min(last, Math.round(p.km / dx) - 1))
    out.push(prev !== undefined && b <= prev ? Math.min(last, prev + 1) : b)
  }
  return out
}

/**
 * Las fotos con el km del final de su bloque, que es donde se tomaron y donde está un grupo «al final
 * de b»; la de la meta (la del último bloque), en la meta. Así la integral del reloj de la cabeza y el
 * bloque de cada foto cuentan lo mismo, y la marca de la cabeza en el último bloque es el tiempo del
 * ganador (§4.6).
 */
function photosAtTheirBlocks<P extends { readonly km: number }>(
  kms: readonly P[],
  blocks: readonly Block[],
  lengthKm: number,
): P[] {
  const last = Math.max(1, Math.round(lengthKm / STAGE.dx)) - 1
  // (b + 1) / 10 y no (b + 1) · 0,1, que en coma flotante deja el km 2,1 en 2,1000000000000005
  const perKm = Math.round(1 / STAGE.dx)
  return kms.map((p, k) => {
    const b = blocks[k]!
    return { ...p, km: k === kms.length - 1 && b === last ? lengthKm : (b + 1) / perKm }
  })
}

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
 *
 * Desde el 3a cada foto va en el bloque del calendario del motor (`storedPhotoBlocks`) y con el km del
 * final de ese bloque, no con el que guardó la radio (que en 14 fotos por etapa cae un bloque antes), y
 * devuelve además el bloque de emisión, el reloj de la cabeza y el bloque de cada foto, que el
 * adaptador guarda en la línea.
 */
export function revealStoredEvents(
  events: readonly ChronicleEvent[],
  stage: StoredStage,
): StoredReveal | null {
  const photoBlocks = storedPhotoBlocks(stage.radio.kms, stage.lengthKm)
  const kms = photosAtTheirBlocks(stage.radio.kms, photoBlocks, stage.lengthKm)
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
  const photoBlock = (k: number): Block => photoBlocks[k]!
  /** Los km del reloj de la cabeza: el de cada foto y, detrás, la meta. */
  const knotKm = [...kms.map((p) => p.km), stage.lengthKm]

  /** La última foto tomada al final de b o antes; −1 si ninguna. */
  const photoAtOrBefore = (b: Block): number => {
    let lo = 0
    let hi = photoBlocks.length - 1
    let found = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (photoBlocks[mid]! <= b) {
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
  return { view, revealS, bEmit, head, photoBlocks }
}

// ================================================================== EL ADAPTADOR DE LA RADIO (3a)

/** Lo que el adaptador recibe de una etapa sin línea, ya leído y validado (§3.8, §14.4). */
export interface RadioStage {
  /** stage_snapshots.radio, validada con storedRaceRadioSchema; el adaptador la corta (11-l) */
  readonly radio: StoredRadio
  /** stage_snapshots.events, en su orden: el índice es el `source` de cada suceso (§4.2) */
  readonly events: readonly ChronicleEvent[]
  /** stage_snapshots.input.riders[].riderId, en su orden: la posición es el RiderIx (§4.1) */
  readonly riderIds: readonly string[]
  /** stageLengthKm(input.profile) */
  readonly lengthKm: number
  /** el tiempo del ganador (stage_results): la cabeza llega a la meta en él */
  readonly winnerS: number
  /** stage_snapshots.engine_version */
  readonly engineVersion: number
  /** riderId → su tiempo de la etapa, de los que la acabaron (stage_results): la meta, nunca un tramo */
  readonly finishTimes: ReadonlyMap<string, number>
  /** lo nombrable que no depende del km (11-l): los tres maillots y los diez primeros de la general de salida */
  readonly nameableAlways: ReadonlySet<string>
  readonly profile: ProfileStrip
  readonly weather: StageWeather
  readonly cast: TimelineCast
}

/**
 * Hueco máximo, en s de carrera, entre un grupo sin nadie nombrado y el grupo sin nombrados de la
 * foto anterior para que sea el mismo. Un grupo así (un grupeto de treinta en que nadie tira ni está
 * en la lista) no se puede seguir por sus nombres; si su hueco a la cabeza se parece al de antes, es
 * él, y si no, es otro. 60 s: el doble de lo que un grupo cambia de hueco en un km de foto en las
 * etapas congeladas fuera de una caza (sin evidencia de los jueces; lo vigila B22 en el 6a).
 */
const ANON_SAME_GROUP_MAX_GAP_S = 60

/** La plantilla con que el motor cuenta un abandono en carretera: el único `out` que la radio sabe. */
const ABANDON_TEMPLATE = 'rider_abandons'

/**
 * Lo nombrable en cada km, que no depende de quien mira (11-l): `always` y los protagonistas de los
 * sucesos guardados de km menor o igual que el de la foto, que es la regla de §7.7 para los sucesos
 * ya revelados.
 */
function nameablesAt(
  events: readonly ChronicleEvent[],
  always: ReadonlySet<string>,
): (km: number) => ReadonlySet<string> {
  const byKm = [...events].sort((a, b) => a.km - b.km)
  const memo = new Map<number, ReadonlySet<string>>()
  return (km) => {
    const hit = memo.get(km)
    if (hit !== undefined) return hit
    const out = new Set(always)
    for (const e of byKm) {
      if (e.km > km + KM_EPS) break
      for (const id of e.protagonistas) out.add(id)
    }
    memo.set(km, out)
    return out
  }
}

/** Un grupo de la línea mientras se construye, antes de numerarlo por su nacimiento (4-a). */
interface Track {
  readonly id: string
  readonly origin: GroupOrigin
  readonly bornB: Block
  diedB: Block | null
  successor: number | null
  /** bloque → Ds; las de §3.4 que el adaptador sabe poner: foto, nacimiento, muerte y meta */
  readonly marks: Map<Block, Ds>
  lastGapS: number
  alive: boolean
  /** si en la última foto en que vivió tenía alguien nombrado */
  hadNamed: boolean
}

/** El origen de un grupo nuevo por lo que la radio dice de él al nacer (`kindOf` del motor, al revés). */
function originOfKind(kind: RadioGroupKind): GroupOrigin {
  return kind === 'grupeto' ? 'shed' : 'attack'
}

/** El índice del máximo de un recuento; a igual cuenta, la clave menor. */
function argMax(count: ReadonlyMap<number, number>): number | null {
  let best: number | null = null
  let bestN = 0
  for (const [key, n] of count)
    if (n > bestN || (n === bestN && best !== null && key < best)) {
      best = key
      bestN = n
    }
  return best
}

/**
 * LA LÍNEA DEGRADADA DE UNA ETAPA SIN LÍNEA (§3.8; D-07). Pura: la misma radio da la misma línea.
 * Null si no hay reloj que estimar (ninguna foto con velocidad de cabeza) o la radio no tiene fotos.
 *
 * - La lista de seguimiento, CORTADA al construir, para todos (`veilStoredRadio`, 11-l), y las fotos en
 *   el bloque del calendario del motor (`storedPhotoBlocks`).
 * - El reloj de la cabeza, estimado (`estimatedHeadClock`), y cada grupo en `headS(k) + gapS`, exacto en
 *   el punto: sus marcas son las de cada foto (la primera, la de su nacimiento), la de su muerte (el
 *   bloque anterior a la primera foto en que ya no está, con el hueco que llevaba) y, en el último
 *   bloque, la de la meta, con la cabeza en el tiempo del ganador.
 * - LA IDENTIDAD, Y AQUÍ SE APARTA DE §3.8, que la daba por la posición en la foto. Con la posición, el
 *   grupo de una posición cambia de gente en el 15-30 % de los pares de fotos (§3.8), y cuando un grupo
 *   nuevo sale por delante esa posición hereda el hueco del de delante: la marca de la «identidad»
 *   bajaría de una foto a otra, y el corte de §4.6 cuenta con que las marcas de un grupo crecen con el
 *   bloque (sin eso B9 no se cumple). Aquí un grupo sigue al de la foto anterior del que vienen más de
 *   sus NOMBRADOS (los que tiran, los nombrables y todos en un grupo de hasta doce); si dos lo
 *   reclaman, el que más gente trae de él según sus nombrados (su tamaño por la parte de sus
 *   nombrados que viene de él), para que una fuga recién salida, con todos sus corredores nombrados,
 *   no se quede con el pelotón, que solo nombra a los que tiran. Uno sin nombrados sigue al de antes
 *   sin nombrados de hueco más parecido (hasta `ANON_SAME_GROUP_MAX_GAP_S`). El que no casa nace, con el origen que la radio le da (`grupeto`, un
 *   descolgado; si no, un ataque), y el de antes que no casa muere, con el sucesor al que fue la
 *   mayoría de los suyos. Si aun así una marca bajara, sube a la anterior más una décima.
 * - LOS SIN NOMBRAR. La radio solo nombra a una parte de cada grupo grande y cuenta al resto (`size`).
 *   Para que la barra cuente bien, cada uno se queda en el grupo en que iba si sigue y le falta gente;
 *   si no, va al que le falta: el que heredó a los nombrados del suyo o, si no, el de hueco más
 *   parecido. Es una pertenencia estimada, y la pantalla marca como estimados los grupos de detrás
 *   (§3.8). Los nombrados van donde dice la radio.
 * - Los abandonos (`rider_abandons`), fuera en la primera foto en o tras su bloque. Sin pancartas, sin
 *   percances de estado (la radio solo guarda el más caro de cada grupo y km, sin el corredor: va en la
 *   capa de detalle) y sin fotos clave. Los sucesos, con su `revealS` del reloj estimado
 *   (`revealStoredEvents`, en décimas) y su bloque de emisión.
 */
export function adaptRadioStage(stage: RadioStage): StageTimeline | null {
  const dx = STAGE.dx
  const blocks = Math.max(1, Math.round(stage.lengthKm / dx))
  const nRiders = stage.riderIds.length
  if (stage.radio.kms.length === 0 || nRiders === 0) return null
  const riderIxOf = new Map(stage.riderIds.map((id, i) => [id, i] as const))

  // 1. Las fotos en su bloque y la lista de seguimiento cortada (11-l), sobre esas fotos.
  const pb = storedPhotoBlocks(stage.radio.kms, stage.lengthKm)
  const atBlocks: StoredRadio = {
    ...stage.radio,
    kms: photosAtTheirBlocks(stage.radio.kms, pb, stage.lengthKm),
  }
  const radio = veilStoredRadio(atBlocks, nameablesAt(stage.events, stage.nameableAlways))

  // 2. El reloj de la cabeza y la hora de cada suceso, sobre la radio cortada.
  const reveal = revealStoredEvents(stage.events, {
    radio,
    riderIds: stage.riderIds,
    lengthKm: stage.lengthKm,
    winnerS: stage.winnerS,
  })
  if (reveal === null) return null
  const headAt = reveal.view.headClockAt
  const K = radio.kms.length

  // 3. Quién se baja y en qué foto.
  const outPhoto = new Map<RiderIx, number>()
  for (const e of stage.events) {
    if (e.plantilla !== ABANDON_TEMPLATE) continue
    const r = riderIxOf.get(e.protagonistas[0] ?? '')
    if (r === undefined || outPhoto.has(r)) continue
    const b = reveal.view.blockOfKm(e.km)
    let k = 0
    while (k < K - 1 && pb[k]! < b) k += 1
    outPhoto.set(r, k)
  }
  const isOut = (r: RiderIx, k: number): boolean => (outPhoto.get(r) ?? K) <= k

  const ixOfStored = (i: number): RiderIx | null => riderIxOf.get(radio.riders[i] ?? '') ?? null
  const tracks: Track[] = [
    {
      id: 'peloton',
      origin: 'start',
      bornB: 0,
      diedB: null,
      successor: null,
      marks: new Map(),
      lastGapS: 0,
      alive: true,
      hadNamed: true,
    },
  ]
  const counters = { attack: 0, shed: 0 }
  let assign = new Int32Array(nRiders) // todos en el de salida
  let mainTrack: number | null = 0
  const outsAt = new Map<Block, RiderIx[]>()
  const movesAt = new Map<Block, Map<number, RiderIx[]>>()
  const mainAt = new Map<Block, number | null>()
  const detailAt = new Map<Block, { readonly track: number; readonly row: GroupDetail }[]>()

  for (let k = 0; k < K; k++) {
    const photo = radio.kms[k]!
    const b = pb[k]!
    const headDs = toDs(reveal.head[k]!)
    const groups = photo.groups

    // a) Los nombrados de cada grupo (uno nombrado en dos grupos cuenta en el primero).
    const seen = new Set<RiderIx>()
    const named = groups.map((g) => {
      const out: RiderIx[] = []
      for (const i of [...g.pulling, ...g.watching]) {
        const r = ixOfStored(i)
        if (r === null || seen.has(r) || isOut(r, k)) continue
        seen.add(r)
        out.push(r)
      }
      return out
    })

    // b) Cada grupo propone el grupo de antes del que vienen más de sus nombrados; de los que proponen
    //    el mismo, se lo queda el que más gente trae de él según sus nombrados (su tamaño por la parte
    //    de sus nombrados que viene de él). Los nombrados de un grupo grande son pocos y no son una
    //    muestra al azar (los que tiran y los protagonistas), así que contarlos a secas daría el
    //    pelotón a una fuga recién salida de él, con todos los suyos nombrados.
    const sizeOf = new Map<number, number>()
    for (let r = 0; r < nRiders; r++) {
      const t = assign[r]!
      if (t >= 0) sizeOf.set(t, (sizeOf.get(t) ?? 0) + 1)
    }
    const proposals: { j: number; t: number; n: number; est: number }[] = []
    named.forEach((rs, j) => {
      const count = new Map<number, number>()
      for (const r of rs) {
        const t = assign[r]!
        if (t >= 0 && tracks[t]!.alive) count.set(t, (count.get(t) ?? 0) + 1)
      }
      let best: { t: number; n: number } | null = null
      for (const [t, n] of count)
        if (
          best === null ||
          n > best.n ||
          (n === best.n && ((sizeOf.get(t) ?? 0) > (sizeOf.get(best.t) ?? 0) || t < best.t))
        )
          best = { t, n }
      if (best !== null)
        proposals.push({ j, t: best.t, n: best.n, est: (groups[j]!.size * best.n) / rs.length })
    })
    proposals.sort((x, y) => y.est - x.est || y.n - x.n || x.j - y.j)
    const trackOf: (number | null)[] = groups.map(() => null)
    const used = new Set<number>()
    for (const v of proposals) {
      if (used.has(v.t)) continue
      trackOf[v.j] = v.t
      used.add(v.t)
    }
    // c) Sin nombrados: el de antes sin nombrados de hueco más parecido.
    groups.forEach((g, j) => {
      if (trackOf[j] !== null || named[j]!.length > 0) return
      let best: number | null = null
      let bestDiff = Number.POSITIVE_INFINITY
      tracks.forEach((tr, t) => {
        if (!tr.alive || used.has(t) || tr.hadNamed) return
        const diff = Math.abs(tr.lastGapS - g.gapS)
        if (diff <= ANON_SAME_GROUP_MAX_GAP_S && diff < bestDiff) {
          best = t
          bestDiff = diff
        }
      })
      if (best !== null) {
        trackOf[j] = best
        used.add(best)
      }
    })
    // En la salida, el de salida es siempre uno: el del título, o el primero que quede libre.
    if (k === 0 && !used.has(0)) {
      const j0 = groups.findIndex((g, j) => trackOf[j] === null && g.kind === 'peloton')
      const j = j0 >= 0 ? j0 : trackOf.findIndex((t) => t === null)
      if (j >= 0) {
        trackOf[j] = 0
        used.add(0)
      }
    }
    // d) Los que no casan, nacen.
    groups.forEach((g, j) => {
      if (trackOf[j] !== null) return
      const origin = originOfKind(g.kind)
      const n = origin === 'shed' ? ++counters.shed : ++counters.attack
      tracks.push({
        id: `${origin === 'shed' ? 'shed' : 'mov'}-${n}`,
        origin,
        bornB: b,
        diedB: null,
        successor: null,
        marks: new Map(),
        lastGapS: g.gapS,
        alive: true,
        hadNamed: named[j]!.length > 0,
      })
      trackOf[j] = tracks.length - 1
    })
    const track = (j: number): number => trackOf[j]!
    const jOfTrack = new Map<number, number>()
    trackOf.forEach((_, j) => jOfTrack.set(track(j), j))
    const dying = tracks.flatMap((tr, t) => (tr.alive && !jOfTrack.has(t) ? [t] : []))

    // e) La pertenencia: los nombrados donde dice la radio; los demás, donde iban si les cabe.
    const next = new Int32Array(nRiders).fill(-2)
    const deficit = groups.map((g, j) => g.size - named[j]!.length)
    for (let r = 0; r < nRiders; r++) if (isOut(r, k)) next[r] = -1
    named.forEach((rs, j) => {
      for (const r of rs) next[r] = track(j)
    })
    /** El grupo de ahora al que fue la mayoría de los nombrados de cada uno que muere. */
    const namedHeir = new Map<number, number>()
    for (const t of dying) {
      const count = new Map<number, number>()
      named.forEach((rs, j) => {
        for (const r of rs) if (assign[r] === t) count.set(j, (count.get(j) ?? 0) + 1)
      })
      const heir = argMax(count)
      if (heir !== null) namedHeir.set(t, heir)
    }
    for (let r = 0; r < nRiders; r++) {
      if (next[r] !== -2) continue
      const j = jOfTrack.get(assign[r]!)
      if (j !== undefined && deficit[j]! > 0) {
        next[r] = assign[r]!
        deficit[j] = deficit[j]! - 1
      }
    }
    const mainJ = groups.findIndex((g) => g.kind === 'peloton')
    for (let r = 0; r < nRiders; r++) {
      if (next[r] !== -2) continue
      const from = assign[r]!
      const heir = namedHeir.get(from)
      let j: number
      if (heir !== undefined && deficit[heir]! > 0) j = heir
      else {
        let best = -1
        let bestDiff = Number.POSITIVE_INFINITY
        const fromGap = tracks[from]?.lastGapS ?? 0
        groups.forEach((g, jj) => {
          const diff = Math.abs(g.gapS - fromGap)
          if (deficit[jj]! > 0 && diff < bestDiff) {
            best = jj
            bestDiff = diff
          }
        })
        j = best >= 0 ? best : (jOfTrack.get(from) ?? (mainJ >= 0 ? mainJ : 0))
      }
      next[r] = track(j)
      deficit[j] = deficit[j]! - 1
    }

    // f) Las muertes: en el bloque anterior a esta foto, con el hueco que llevaban, y su sucesor.
    for (const t of dying) {
      const tr = tracks[t]!
      const lastB = Math.max(...tr.marks.keys())
      const diedB = Math.max(lastB, b - 1)
      if (diedB > lastB) tr.marks.set(diedB, toDs(headAt(diedB)) + 10 * tr.lastGapS)
      tr.diedB = diedB
      tr.alive = false
      const count = new Map<number, number>()
      for (let r = 0; r < nRiders; r++)
        if (assign[r] === t && next[r]! >= 0) count.set(next[r]!, (count.get(next[r]!) ?? 0) + 1)
      tr.successor = argMax(count)
    }

    // g) Los cambios del bloque de la foto: quién se baja, quién cambia de grupo y el título.
    for (let r = 0; r < nRiders; r++) {
      const from = assign[r]!
      const to = next[r]!
      if (from === to) continue
      if (to === -1) {
        if (from >= 0) (outsAt.get(b) ?? outsAt.set(b, []).get(b)!).push(r)
        continue
      }
      let byTo = movesAt.get(b)
      if (byTo === undefined) movesAt.set(b, (byTo = new Map()))
      ;(byTo.get(to) ?? byTo.set(to, []).get(to)!).push(r)
    }
    const titled = mainJ >= 0 ? track(mainJ) : null
    if (titled !== mainTrack) {
      mainAt.set(b, titled)
      mainTrack = titled
    }

    // h) Las marcas de la foto, el hueco de cada grupo y su capa de detalle.
    const rows: { track: number; row: GroupDetail }[] = []
    groups.forEach((g, j) => {
      const tr = tracks[track(j)]!
      tr.marks.set(b, headDs + 10 * g.gapS)
      tr.lastGapS = g.gapS
      tr.hadNamed = named[j]!.length > 0
      rows.push({
        track: track(j),
        row: {
          g: track(j),
          speedKmh: g.speedKmh === null ? null : Math.round(g.speedKmh * 10) / 10,
          pullingTotal: Math.max(g.pullingTotal ?? 0, g.pulling.length),
          pullers: g.pulling.flatMap((i, pi) => {
            const rider = ixOfStored(i)
            if (rider === null) return []
            const para = g.paraQuien[pi]
            return [
              {
                rider,
                motive: g.motivos[pi] ?? null,
                forRider: para === null || para === undefined ? null : ixOfStored(para),
              },
            ]
          }),
          mishap: g.mishap ? { kind: g.mishap.tipo, lostS: g.mishap.lostS } : null,
        },
      })
    })
    detailAt.set(b, rows)
    assign = next
  }

  // 4. La meta en el último bloque, si la última foto no lo es (en el calendario de hoy, siempre lo es).
  if (pb[K - 1]! < blocks - 1)
    for (const tr of tracks)
      if (tr.alive) tr.marks.set(blocks - 1, toDs(stage.winnerS) + 10 * tr.lastGapS)

  // 5. Las marcas de cada grupo crecen con el bloque (§4.6): la que bajara, sube a la anterior + 1.
  for (const tr of tracks) {
    let prev = Number.NEGATIVE_INFINITY
    for (const b of [...tr.marks.keys()].sort((x, y) => x - y)) {
      const ds = Math.max(tr.marks.get(b)!, prev + 1)
      tr.marks.set(b, ds)
      prev = ds
    }
  }

  // 6. El catálogo por la hora de la marca de nacimiento (4-a), con el de salida en el 0.
  const birthDs = (t: number): number =>
    t === 0 ? Number.NEGATIVE_INFINITY : (tracks[t]!.marks.get(tracks[t]!.bornB) ?? 0)
  const order = tracks
    .map((_, t) => t)
    .sort(
      (x, y) =>
        birthDs(x) - birthDs(y) ||
        tracks[x]!.bornB - tracks[y]!.bornB ||
        (tracks[x]!.id < tracks[y]!.id ? -1 : 1),
    )
  const ixOf = new Int32Array(tracks.length)
  order.forEach((t, g) => (ixOf[t] = g))
  const groupIx = (t: number): GroupIx => ixOf[t]!
  const groups: GroupCatalogEntry[] = order.map((t) => {
    const tr = tracks[t]!
    return {
      id: tr.id,
      origin: tr.origin,
      bornB: tr.bornB,
      diedB: tr.diedB,
      successor: tr.successor === null ? null : groupIx(tr.successor),
    }
  })

  // 7. Los sucesos de estado, bloque a bloque y en su orden: out, move, main, clock.
  const allBlocks = new Set<Block>([...outsAt.keys(), ...movesAt.keys(), ...mainAt.keys()])
  for (const tr of tracks) for (const b of tr.marks.keys()) allBlocks.add(b)
  const stateEvents: StateEvent[] = []
  for (const b of [...allBlocks].sort((x, y) => x - y)) {
    for (const rider of (outsAt.get(b) ?? []).sort((x, y) => x - y))
      stateEvents.push({ t: 'out', b, rider })
    const byTo = [...(movesAt.get(b) ?? new Map<number, RiderIx[]>())]
      .map(([t, rs]) => [groupIx(t), rs] as const)
      .sort((x, y) => x[0] - y[0])
    for (const [to, riders] of byTo)
      stateEvents.push({ t: 'move', b, to, riders: [...riders].sort((x, y) => x - y) })
    if (mainAt.has(b)) {
      const t = mainAt.get(b) ?? null
      stateEvents.push({ t: 'main', b, group: t === null ? null : groupIx(t) })
    }
    const marks: (readonly [GroupIx, Ds])[] = []
    tracks.forEach((tr, t) => {
      const ds = tr.marks.get(b)
      if (ds !== undefined) marks.push([groupIx(t), ds])
    })
    if (marks.length > 0)
      stateEvents.push({ t: 'clock', b, marks: marks.sort((x, y) => x[0] - y[0]) })
  }

  const detail = new Map<Block, readonly GroupDetail[]>()
  for (const [b, rows] of detailAt)
    detail.set(
      b,
      rows.map(({ track, row }) => ({ ...row, g: groupIx(track) })).sort((x, y) => x.g - y.g),
    )

  // 8. Los sucesos, con su hora y su bloque de emisión, por revealS y, a igual hora, por source.
  const events: TimelineEvent[] = stage.events
    .map((e, i) => ({
      source: i,
      plantilla: e.plantilla,
      km: fromKm10(toKm10(e.km)),
      tS: fromDs(toDs(e.tS)),
      bEmit: reveal.bEmit[i]!,
      revealS: reveal.revealS[i]!,
      riders: e.protagonistas.flatMap((id) => {
        const r = riderIxOf.get(id)
        return r === undefined ? [] : [r]
      }),
      datos: e.datos === undefined ? null : { ...e.datos },
    }))
    .sort((x, y) => x.revealS - y.revealS || x.source - y.source)

  // 9. La meta: las llegadas por tiempo, en décimas (FinishRecord).
  const arrivalsByDs = new Map<Ds, RiderIx[]>()
  for (const [id, s] of stage.finishTimes) {
    const r = riderIxOf.get(id)
    if (r === undefined) continue
    const ds = toDs(s)
    ;(arrivalsByDs.get(ds) ?? arrivalsByDs.set(ds, []).get(ds)!).push(r)
  }

  return {
    format: 1,
    engineVersion: stage.engineVersion,
    dx,
    blocks,
    lengthKm: stage.lengthKm,
    timeTrial: false,
    clock: 'estimated',
    riderIds: stage.riderIds,
    groups,
    keys: [],
    stateEvents,
    events,
    detail,
    banners: [],
    profile: stage.profile,
    cast: stage.cast,
    weather: stage.weather,
    tt: null,
    finish: {
      finishS: stage.winnerS,
      arrivals: [...arrivalsByDs]
        .sort((x, y) => x[0] - y[0])
        .map(([ds, rs]) => [ds, rs.sort((x, y) => x - y)] as const),
    },
  }
}

// ============================================ EL PERFIL, EL TIEMPO Y EL REPARTO PROVISIONALES (3a)

/** A la décima: lo que la cabecera sirve del recorrido y del tiempo. */
const round1 = (x: number): number => Math.round(x * 10) / 10

/**
 * EL PERFIL DE LA CABECERA (`ProfileStrip`, §4.2) de una etapa sin línea, sacado del recorrido que se
 * corrió (`stage_snapshots.input.profile`). La cota al final de cada km entero, de 0 a ceil(lengthKm),
 * en metros enteros, sumando la subida de cada bloque de `sampleProfile` (`g · dx · 10` m) desde
 * `startM`; las cimas con categoría (la del dato oficial o la derivada, como las puntúa el motor), con
 * el pie donde empieza la racha de bloques en subida que acaba en ellas; las volantes; y las vueltas.
 * Sin el nombre de los puertos reales (`STAGE_FEATURES` no sale del motor): `name` null, que la
 * pantalla rotula solo con la categoría (§6.8). El reparto congelado del 4b lo grabará con nombre.
 */
export function profileStripOf(profile: StageProfile): ProfileStrip {
  const dx = STAGE.dx
  const sampled = sampleProfile(profile)
  const startM = profile.startM ?? 0
  let m = startM
  const alt = sampled.map((blk) => (m += blk.g * dx * 10))
  /** La cota al final del bloque i; antes del primero, la de salida. */
  const altAt = (i: number): number => (i < 0 ? startM : (alt[Math.min(alt.length - 1, i)] ?? m))
  const kmCount = Math.ceil(sampled.length / 10)
  const altM = [Math.round(startM)]
  for (let k = 1; k <= kmCount; k++) altM.push(Math.round(altAt(Math.min(alt.length, k * 10) - 1)))
  const climbs: ProfileStrip['climbs'][number][] = []
  for (const banner of profile.banners ?? []) {
    if (banner.tipo !== 'cima') continue
    const idx = Math.min(sampled.length - 1, Math.max(0, Math.floor(banner.km / dx)))
    const cat = sampled[idx]?.climbCategory ?? null
    if (cat === null) continue
    let foot = idx
    while (foot > 0 && sampled[foot - 1]!.tipo === 'subida') foot -= 1
    const footKm = round1(foot * dx)
    const topKm = round1(banner.km)
    const lenKm = round1(Math.max(0, topKm - footKm))
    const rise = altAt(idx) - altAt(foot - 1)
    climbs.push({
      footKm,
      topKm,
      cat,
      lenKm,
      avgPct: lenKm > 0 ? round1(rise / (lenKm * 10)) : 0,
      name: null,
    })
  }
  return {
    altM,
    climbs,
    sprintsKm: (profile.banners ?? [])
      .filter((x) => x.tipo === 'meta_volante')
      .map((x) => round1(x.km)),
    laps: profile.laps ?? 1,
  }
}

/**
 * EL TIEMPO DE LA ETAPA (`StageWeather`, §4.2) sin tocar el motor (D-14, I-19): las mismas funciones
 * puras con que lo calculó la carrera, sobre su semilla y su sitio (`stage_snapshots.seed` e
 * `input.lugar`). Un tramo por `STAGE.weather.roadTurnKm`, fundidos los iguales seguidos; con viento
 * cruzado donde su componente lateral contra el rumbo de la carretera llega al umbral con que el motor
 * abre el abanico (`echelonCloseThreshold`).
 */
export function stageWeatherOf(
  seed: string,
  lugar: WeatherPlace | undefined,
  lengthKm: number,
): StageWeather {
  const day = stageWeather(seed, lugar)
  const strength = stageWindStrength(seed)
  const plan = weatherPlan(seed, lugar, lengthKm, strength)
  const bearings = roadBearings(seed, lengthKm)
  const spans: StageWeather['spans'][number][] = []
  for (let fromKm = 0; fromKm < lengthKm; fromKm += STAGE.weather.roadTurnKm) {
    const seg = weatherAt(plan, fromKm)
    const span = {
      fromKm,
      rain: Math.round(seg.lluvia * 100) / 100,
      windDir: Math.round(seg.windDir * 1000) / 1000,
      windKmh: round1(seg.windKmh),
      crosswind:
        windComponents(strength, seg.windDir, bearingAt(bearings, fromKm)).lateral >=
        STAGE.weather.echelonCloseThreshold,
    }
    const prev = spans[spans.length - 1]
    if (
      prev !== undefined &&
      prev.rain === span.rain &&
      prev.windDir === span.windDir &&
      prev.windKmh === span.windKmh &&
      prev.crosswind === span.crosswind
    )
      continue
    spans.push(span)
  }
  return { tempC: round1(day.grados), rain: day.lluvia, spans }
}

/** Los maillots con que se sale a una etapa: quién lleva cada uno y cuáles van delegados (D-24). */
export interface StartJerseys {
  readonly leaders: RaceLeaders
  /** los que lleva otro que el primero de su tabla, porque el primero ya lleva uno de más prioridad */
  readonly delegated: ReadonlySet<JerseyKind>
}

/**
 * Quién llevaba cada maillot TRAS la etapa `day` (y por tanto quién lo lleva PUESTO en la `day+1`), y
 * cuáles de esos maillots van delegados. Relee las mismas cuatro clasificaciones que la ficha con
 * `throughStage = day`; con `day < 1` no hay nada que arrastrar (la etapa 1 se corre sin maillots) y
 * no toca la base.
 */
export async function jerseysThroughStage(
  db: Database,
  raceKey: string,
  day: number,
): Promise<StartJerseys> {
  if (day < 1) return { leaders: NO_LEADERS, delegated: new Set() }
  const [gc, points, kom, teams] = await Promise.all([
    getGcThroughStage(db, raceKey, day),
    getPointsClassification(db, raceKey, day),
    getKomClassification(db, raceKey, day),
    getTeamClassifications(db, raceKey, day),
  ])
  const leaders = raceLeaders({ gc, points, kom, teams: teams.overall })
  const unranked = new Set(gc.filter((r) => r.dnf).map((r) => r.riderId))
  const first = (rows: readonly { readonly riderId: string }[]): string | null =>
    rows.find((r) => !unranked.has(r.riderId))?.riderId ?? null
  const delegated = new Set<JerseyKind>()
  if (leaders.points !== null && leaders.points !== first(points)) delegated.add('points')
  if (leaders.kom !== null && leaders.kom !== first(kom)) delegated.add('kom')
  return { leaders, delegated }
}

/**
 * Quién llevaba cada maillot TRAS la etapa `day` (y por tanto quién lo lleva PUESTO en la `day+1`).
 * Sale de `routes/races.ts` (hoy privada) a este fichero, exportada, para el reparto provisional del
 * adaptador (17-k, §3.8); la ruta de etapa la importa de aquí. Con `day < 1`, nadie lleva nada.
 */
export async function leadersThroughStage(
  db: Database,
  raceKey: string,
  day: number,
): Promise<RaceLeaders> {
  return (await jerseysThroughStage(db, raceKey, day)).leaders
}

/** Lo que el reparto provisional sabe de cada corredor de la entrada (`input.riders[]`). */
export interface CastEntry {
  readonly riderId: string
  /** race_rosters.bib, tal como entró al motor */
  readonly bib: number | null
  /** el equipo CON EL QUE CORRIÓ; null, individual */
  readonly teamId: string | null
  /** la general de salida que entró al motor; null sin general */
  readonly gcRank: number | null
  readonly gcDeficitS: number | null
}

/**
 * El país de un corredor que ya no está en la base (no debería pasar: los corredores no se borran).
 * `XX` es el código ISO 3166 reservado para «desconocido»; el rótulo lo exige de dos letras (§4.11).
 */
const UNKNOWN_COUNTRY = 'XX'

/**
 * EL REPARTO PROVISIONAL DEL ADAPTADOR (decisión 17-k, §3.8, §7.8). Los corredores de la entrada con
 * su dorsal, su país, su género y el equipo del día (`input.riders[].teamId`) con la `jerseySeed` de
 * hoy, y `worn` del maillot de líder que llevaban tras la N−1 (`from` en la N−1) o la equipación. La
 * salida de la general (`start`) es la que entró al motor. Sin títulos, distinciones, `knownWins` ni
 * favoritos, que son del reparto congelado del paso 5 (`buildTimelineCast`).
 */
export function provisionalCast(
  entries: readonly CastEntry[],
  identities: CastIdentities,
  jerseys: StartJerseys,
  from: StageRef | null,
): TimelineCast {
  const teamIx = new Map<string, number>()
  const teams: CastTeam[] = []
  const riders = entries.map((e, rider): CastRider => {
    let team: number | null = null
    if (e.teamId !== null) {
      const known = teamIx.get(e.teamId)
      const t = identities.teams.get(e.teamId)
      if (known !== undefined) team = known
      else if (t !== undefined) {
        team = teams.length
        teamIx.set(e.teamId, team)
        teams.push({ teamId: e.teamId, jerseySeed: t.jerseySeed })
      }
    }
    const who = identities.riders.get(e.riderId)
    const jersey = from === null ? null : jerseyOf(jerseys.leaders, e.riderId)
    const worn: WornJersey =
      jersey === null || from === null
        ? { kind: 'team' }
        : { kind: 'leader', jersey, delegated: jerseys.delegated.has(jersey), from }
    const hasGc = from !== null && e.gcRank !== null && e.gcRank >= 1
    return {
      rider,
      riderId: e.riderId,
      bib: e.bib,
      team,
      country: who === undefined || who.country.length !== 2 ? UNKNOWN_COUNTRY : who.country,
      gender: who?.gender ?? 'M',
      start: {
        gcRank: hasGc ? e.gcRank : null,
        gcDeficitS: hasGc ? (e.gcDeficitS ?? 0) : null,
        from: hasGc ? from : null,
      },
      worn,
      distinctions: [],
      knownWins: 0,
    }
  })
  return { riders, teams, favourites: [] }
}

/**
 * La notoriedad que el reparto provisional sabe dar (§7.5): la del maillot que lleva. El 6b la
 * completa con `staticNotoriety` (títulos, general, etapas ganadas y nombres conocidos).
 */
function provisionalNotoriety(worn: WornJersey): NotorietyLevel {
  if (worn.kind !== 'leader') return 8
  if (worn.jersey === 'gc') return 0
  return worn.delegated ? 3 : 2
}

/** Lo que el rótulo servido necesita de quien mira, además del horizonte. */
export interface ServeCastContext {
  /** los corredores del espectador y de su equipo; vacío para el visitante */
  readonly own: ReadonlySet<RiderIx>
}

/**
 * EL REPARTO SERVIDO (`BroadcastHead.cast`, §7.8), en su primera forma (3a): sin velo, porque hasta el
 * 7a solo hay horizontes con el velo vacío (`_h` lo recibirá en el 7b, con `veilCast`), sin líneas y
 * con la notoriedad del maillot (el 6b le da las líneas y `staticNotoriety`). Los nombres no se
 * congelan: se resuelven al servir, con los de hoy.
 */
export function serveCast(
  cast: TimelineCast,
  _h: Horizon,
  names: Pick<NameResolver, 'rider' | 'team'>,
  ctx: ServeCastContext,
): RiderCard[] {
  return cast.riders.map((c) => {
    const t = c.team === null ? undefined : cast.teams[c.team]
    return {
      ix: c.rider,
      id: c.riderId,
      name: names.rider(c.riderId),
      bib: c.bib,
      country: c.country,
      gender: c.gender,
      team:
        t === undefined
          ? null
          : { id: t.teamId, name: names.team(t.teamId), jerseySeed: t.jerseySeed },
      worn: c.worn,
      lines: [],
      notoriety: provisionalNotoriety(c.worn),
      own: ctx.own.has(c.rider),
    }
  })
}

// ======================================================= LA FUENTE: timelineForStage y su LRU (3a)

/** Lo que el adaptador lee de `stage_snapshots.input`: los corredores, la crono, el sitio y el recorrido. */
const snapshotInputSchema = z.object({
  profile: z.looseObject({
    segments: z.array(z.looseObject({ km: z.number(), tipo: z.string() })).min(1),
    banners: z
      .array(z.looseObject({ km: z.number(), tipo: z.enum(['meta_volante', 'cima']) }))
      .optional(),
  }),
  riders: z.array(
    z.looseObject({
      riderId: z.string(),
      teamId: z.string().nullish(),
      bib: z.number().int().nullish(),
      gcRank: z.number().int().nullish(),
      gcDeficitSeconds: z.number().nullish(),
    }),
  ),
  timeTrial: z.boolean().optional(),
  lugar: z.object({ pais: z.string().optional(), dia: z.number() }).optional(),
})

/** `stage_snapshots.events`: el `RaceEvent` del motor tal como lo congela stageRun.ts. */
export const storedEventsSchema = z.array(
  z.object({
    km: z.number(),
    tS: z.number(),
    tipo: z.string(),
    plantilla: z.string(),
    protagonistas: z.array(z.string()),
    datos: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
  }),
)

/** Los sucesos validados como `ChronicleEvent` (sin `datos` si no lo traen, por exactOptionalPropertyTypes). */
export function storedEventsOf(raw: unknown): ChronicleEvent[] | null {
  const parsed = storedEventsSchema.safeParse(raw)
  if (!parsed.success) return null
  return parsed.data.map(({ datos, ...e }) => (datos === undefined ? e : { ...e, datos }))
}

/**
 * EL LRU DEL ADAPTADOR (§14.4): `${raceKey}|${stageDay}`, sin mundo, con el mismo tope que el de las
 * líneas grabadas (`BROADCAST.decodedCacheEntries`). Guarda la promesa, así que dos peticiones en frío
 * de la misma etapa construyen la línea una vez. Un null no se guarda: la etapa que hoy no se ha
 * corrido mañana sí, y la clave no lleva el día.
 */
const adapted = new Map<string, Promise<StageTimeline | null>>()

/** Solo para los tests, como `clearStageTimelineCache` de §5.6: vacía el LRU del adaptador. */
export function clearAdaptedTimelineCache(): void {
  adapted.clear()
}

/**
 * LA LÍNEA DE UNA ETAPA (§14.4): la grabada (desde el 6a) o la degradada del adaptador de la radio,
 * o null si no hay retransmisión. En el 3a solo existe la rama del adaptador. Recibe el horizonte de
 * quien mira desde que existe (14-p), aunque la línea no dependa de él: el velo y el límite de lo
 * alcanzado los deciden las rutas (§10.11).
 */
export async function timelineForStage(
  db: Database,
  _h: Horizon,
  raceKey: string,
  stageDay: number,
): Promise<StageTimeline | null> {
  const key = `${raceKey}|${stageDay}`
  const hit = adapted.get(key)
  if (hit !== undefined) {
    adapted.delete(key)
    adapted.set(key, hit)
    return hit
  }
  const built: Promise<StageTimeline | null> = adaptStoredStage(db, raceKey, stageDay).then(
    (tl) => {
      if (tl === null && adapted.get(key) === built) adapted.delete(key)
      return tl
    },
    (err: unknown) => {
      if (adapted.get(key) === built) adapted.delete(key)
      throw err
    },
  )
  adapted.set(key, built)
  while (adapted.size > BROADCAST.decodedCacheEntries) {
    const oldest = adapted.keys().next()
    if (oldest.done === true) break
    adapted.delete(oldest.value)
  }
  return built
}

/**
 * El adaptador en frío (§18.9): leer el snapshot y validarlo, leer el resultado, los maillots de
 * salida y las identidades del reparto, y construir la línea. Null sin correr, sin radio o sin sucesos
 * (antes de la 0029 o de la 0024), en una crono (3-d), con lo guardado de otra forma, o si el reloj no
 * se puede estimar.
 */
async function adaptStoredStage(
  db: Database,
  raceKey: string,
  stageDay: number,
): Promise<StageTimeline | null> {
  const snap = await getStageSnapshot(db, raceKey, stageDay)
  if (snap === null || snap.radio == null || snap.events == null) return null
  const input = snapshotInputSchema.safeParse(snap.input)
  if (!input.success || input.data.timeTrial === true) return null
  const radio = storedRaceRadioSchema.safeParse(snap.radio)
  const events = storedEventsOf(snap.events)
  if (!radio.success || events === null) return null
  const results = await getStageResults(db, raceKey, stageDay)
  const finishers = results.filter((r) => !r.dnf && r.tiempoS > 0)
  if (finishers.length === 0) return null
  const winnerS = Math.min(...finishers.map((r) => r.tiempoS))
  const jerseys = await jerseysThroughStage(db, raceKey, stageDay - 1)
  const entries: CastEntry[] = input.data.riders.map((r) => ({
    riderId: r.riderId,
    bib: r.bib ?? null,
    teamId: r.teamId ?? null,
    gcRank: r.gcRank ?? null,
    gcDeficitS: r.gcDeficitSeconds ?? null,
  }))
  const teamIds = [...new Set(entries.flatMap((e) => (e.teamId === null ? [] : [e.teamId])))]
  const identities = await getCastIdentities(
    db,
    entries.map((e) => e.riderId),
    teamIds,
  )
  const from: StageRef | null = stageDay > 1 ? { raceKey, stageDay: stageDay - 1 } : null
  // El recorrido validado en lo que se lee de él; el resto viaja tal cual lo escribió el motor.
  const profile = input.data.profile as unknown as StageProfile
  const lengthKm = stageLengthKm(profile)
  const lugar = input.data.lugar
  const place: WeatherPlace | undefined =
    lugar === undefined
      ? undefined
      : lugar.pais === undefined
        ? { dia: lugar.dia }
        : { pais: lugar.pais, dia: lugar.dia }
  return adaptRadioStage({
    radio: radio.data,
    events,
    riderIds: entries.map((e) => e.riderId),
    lengthKm,
    winnerS,
    engineVersion: snap.engineVersion,
    finishTimes: new Map(finishers.map((r) => [r.riderId, r.tiempoS] as const)),
    nameableAlways: nameableAtStart(jerseys.leaders, entries),
    profile: profileStripOf(profile),
    weather: stageWeatherOf(snap.seed, place, lengthKm),
    cast: provisionalCast(entries, identities, jerseys, from),
  })
}

/**
 * Lo nombrable desde la salida (11-l): los tres maillots que se llevan y los `BROADCAST.namedGcTop`
 * primeros de la general de salida. Los protagonistas de los sucesos se añaden km a km (`nameablesAt`).
 */
export function nameableAtStart(
  leaders: RaceLeaders,
  entries: readonly CastEntry[],
): ReadonlySet<string> {
  const out = new Set<string>()
  for (const kind of JERSEY_PRIORITY) {
    const id = leaders[kind]
    if (id !== null) out.add(id)
  }
  for (const e of entries)
    if (e.gcRank !== null && e.gcRank >= 1 && e.gcRank <= BROADCAST.namedGcTop) out.add(e.riderId)
  return out
}
