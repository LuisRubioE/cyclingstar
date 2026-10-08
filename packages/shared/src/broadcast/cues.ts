/**
 * LO EVENTUAL DE LA PANTALLA (E2, docs/retransmision.md §4.9): la cola de rótulos y la voz.
 *
 * `LiveLine` nació en el PR 2, porque la voz causal la devuelve (`buildChronicle` con `live`, §12.2)
 * y la web la filtra (`inVoice`) antes de que exista la cola. El 3a añade el resto de los tipos de
 * §4.9 (`Cue`, `CueKind`, `TemplateTarget`, `TimeCheckRow`, `RiderCueContext`), porque el reproductor
 * del 3b importa `CueKind` (§8.11); `CUE_CLASS`, `CUE_OF_TEMPLATE`, `cuesBetween`, `cueClassOf` y la
 * cola llegan en el 6a (decisión 17-z: los tipos que otros ficheros importan nacen antes que el código
 * que los usa). `CueClass` vive en `timeline.ts`.
 *
 * Un `Cue` lleva índices (`GroupIx`, `RiderIx`) y ninguna palabra: la palabra la pone el componente
 * con el vocabulario de §6.3 (D-62). `t` es la hora de carrera en que el rótulo se pudo saber, así que
 * un rótulo nunca precede a su hecho.
 *
 * Lo del 6a (§6.5, §6.6): las dos tablas, `cueClassOf` (6-g), `cuesBetween`, que da los rótulos de los
 * sucesos revelados entre dos instantes y de los cambios de estado (6-i), y la cola, con sus dos pasos
 * puros sobre su estado, `admitCue` (el `admitir` de §6.5) y `cueFrame` (el fotograma), que el
 * reproductor llama en cada fotograma.
 *
 * Lo del 6b: la presentación de la fuga reservada en la cola (`isPresentation` y `aheadOfPeloton`, 6-m,
 * §6.7): la lista, la frase y la ronda de la moto no cuentan para `cueQueueMax`, no se descartan, no las
 * desplaza nadie ni caducan por esperar, la ronda espera detrás de los demás de clase 2, y se tiran solo
 * cuando ya no presentan nada; y la sustitución en `admitir` del `tt_split` que espera por el siguiente
 * del mismo control y del `tt_finish` por el siguiente, con la mayor de las dos clases (9-d). Y dos
 * campos que §4.9 no tenía: `split.echelon` (el corte viene de `echelon_split`: `ECHELONS`, que con solo
 * la causa no se distinguía de un corte del pelotón por el viento) y `break_presented.riders` (los
 * escapados al formarse la fuga, de los que sale la frase con su cláusula del equipo de los contados).
 */
import type { ChronicleEntry } from '../contracts.js'
import type { JerseyKind } from '../jerseys.js'
import { BROADCAST } from './constants.js'
import type { GroupNow, Instant, VirtualGcRow } from './instant.js'
import type {
  CueClass,
  GroupCatalogEntry,
  GroupIx,
  RaceS,
  RiderIx,
  TimelineEvent,
} from './timeline.js'
import { toDs } from './timeline.js'
import type { StartState } from './wire.js'

/**
 * Por qué sale un rótulo de corredor (uno a la vez); los cinco los programa el reproductor (§6.5).
 * `tt_round`: la ronda ON COURSE de la crono, de clase 0 (§9.5, 9-k).
 */
export type RiderCueContext = 'break_round' | 'banner' | 'focus' | 'own' | 'tt_round'

/** Una fila del cuadro de diferencias generales (`gapsTableEveryRealS`). */
export interface TimeCheckRow {
  /** el de carretera en t */
  readonly number: number
  readonly group: GroupIx
  readonly size: number
  /** GroupNow.gap.toHeadS */
  readonly gapS: number
  readonly jerseys: readonly JerseyKind[]
  /** los que se nombran (§7.7); null si el grupo solo se cuenta */
  readonly names: readonly RiderIx[] | null
}

export type Cue =
  /** attack_sticks */
  | {
      readonly kind: 'attack'
      readonly t: RaceS
      readonly riders: readonly RiderIx[]
      readonly fromGroup: GroupIx
    }
  /** breakaway_formed */
  | {
      readonly kind: 'break_formed'
      readonly t: RaceS
      readonly group: GroupIx
      readonly riders: readonly RiderIx[]
      readonly gapS: number
    }
  /**
   * la frase de la fuga (breakHeadline, §7.6): `named`, los que nombra (los notables y los del
   * espectador, en el orden de la frase); `others`, cuántos cuenta; `riders`, los escapados al formarse
   * la fuga, por dorsal, de los que sale la frase entera (no estaba en §4.9: sin ellos no se sabe de qué
   * equipo son los contados)
   */
  | {
      readonly kind: 'break_presented'
      readonly t: RaceS
      readonly group: GroupIx
      readonly named: readonly RiderIx[]
      readonly others: number
      readonly riders: readonly RiderIx[]
    }
  | {
      readonly kind: 'rider'
      readonly t: RaceS
      readonly rider: RiderIx
      readonly context: RiderCueContext
    }
  | { readonly kind: 'time_check'; readonly t: RaceS; readonly rows: readonly TimeCheckRow[] }
  | {
      readonly kind: 'group_changed'
      readonly t: RaceS
      readonly group: GroupIx
      readonly gained: readonly RiderIx[]
      readonly lost: readonly RiderIx[]
    }
  /**
   * peloton_split, peloton_selection, echelon_split; cause = datos.causa (caida, viento, sector, puerto,
   * caza); echelon: viene de echelon_split, `ECHELONS` (no estaba en §4.9: con la causa sola, un corte
   * del pelotón por el viento y un abanico daban el mismo rótulo)
   */
  | {
      readonly kind: 'split'
      readonly t: RaceS
      readonly parts: readonly GroupIx[]
      readonly cause: string | null
      readonly echelon: boolean
    }
  | {
      readonly kind: 'caught'
      readonly t: RaceS
      readonly caught: GroupIx
      readonly by: GroupIx
      readonly toGoKm: number
    }
  /** climb_ahead: índice en profile.climbs; banner_result: índice en Instant.banners */
  | { readonly kind: 'climb_ahead' | 'banner_result'; readonly t: RaceS; readonly banner: number }
  /** null primero; los nombres, crashNamesDelayS después */
  | {
      readonly kind: 'crash'
      readonly t: RaceS
      readonly group: GroupIx
      readonly riders: readonly RiderIx[] | null
    }
  | {
      readonly kind: 'mishap'
      readonly t: RaceS
      readonly rider: RiderIx
      readonly mishap: 'pinchazo' | 'averia'
      readonly lostS: number
    }
  | {
      readonly kind: 'dropped' | 'abandon'
      readonly t: RaceS
      readonly rider: RiderIx
      readonly gapS: number | null
    }
  | { readonly kind: 'virtual_gc'; readonly t: RaceS; readonly rows: readonly VirtualGcRow[] }
  /** FLAMME ROUGE; null si van juntos */
  | { readonly kind: 'last_km'; readonly t: RaceS; readonly leadGapS: number | null }
  /** solo tras BroadcastFinish: índice en arrivals (time_cut: el primer grupo fuera de control) */
  | {
      readonly kind: 'finish' | 'group_finish' | 'time_cut'
      readonly t: RaceS
      readonly finishIx: number
    }
  /** LA CRONO (§9.5, 9-d). En t = 0, del plan público: la regla y el intervalo de BroadcastHead.tt */
  | { readonly kind: 'tt_start_order'; readonly t: RaceS }
  /** al pasar r por el control check (índice en checksKm); board, el de TimeTrialInstant.splits[check] en t */
  | {
      readonly kind: 'tt_split'
      readonly t: RaceS
      readonly check: number
      readonly rider: RiderIx
      readonly timeS: number
      readonly rank: number
      readonly deltaS: number | null
      readonly board: readonly { readonly rider: RiderIx; readonly timeS: number }[]
    }
  /** al llegar r; hotSeat: se sienta en el sillón; prev: quien lo ocupaba (null si nadie) */
  | {
      readonly kind: 'tt_finish'
      readonly t: RaceS
      readonly rider: RiderIx
      readonly timeS: number
      readonly rank: number
      readonly deltaS: number | null
      readonly hotSeat: boolean
      readonly prev: RiderIx | null
    }
export type CueKind = Cue['kind']

/** El destino de una plantilla en CUE_OF_TEMPLATE (§6.6): un rótulo, solo la voz, o solo el acta. */
export type TemplateTarget = CueKind | 'voice_only' | 'report_only'

/**
 * Una línea de la voz: la entrada de buildChronicle con live (§12.2) y la hora a la que se dice. La
 * construye la API para cada tramo.
 */
export type LiveLine = ChronicleEntry & { readonly revealS: RaceS }

// ------------------------------------------------------------------------- la clase (§6.5, 6-g)

/** LA CLASE DE CADA RÓTULO (D-21), por su CueKind. cueClassOf la sube o la baja en los casos que dependen de quién o de qué ronda. */
export const CUE_CLASS = {
  finish: 3,
  caught: 3,
  split: 3, // meta, caza de la fuga, corte
  attack: 2,
  break_formed: 2,
  break_presented: 2,
  banner_result: 2,
  crash: 2,
  last_km: 2,
  time_cut: 2,
  time_check: 1,
  group_changed: 1,
  mishap: 1,
  rider: 1,
  dropped: 1,
  abandon: 1,
  virtual_gc: 1,
  group_finish: 1,
  tt_start_order: 1,
  tt_split: 1,
  tt_finish: 1, // la crono (§9.5): cueClassOf sube el mejor paso y el sillón
  climb_ahead: 0, // la ficha del puerto
} as const satisfies Readonly<Record<CueKind, CueClass>>

/**
 * Sube a 3 lo que D-21 pone en 3 por su protagonista; la ronda de la moto va a 2 (6-m) y la de la crono
 * a 0 (9-k). Pura. `lastVirtualLeader`: el primero del último VIRTUAL GC que salió; antes del primero de
 * la etapa, `start.leaders.gc`, para que «cambia el líder virtual» se mida contra el líder de la
 * general y no contra nada (9-n). `timeTrial`: `BroadcastHead.stage.timeTrial`. `start` es la salida
 * servida, ya degradada por el velo (B13): un maillot que viene de una etapa velada no sube nada.
 */
export function cueClassOf(
  cue: Cue,
  start: StartState,
  lastVirtualLeader: RiderIx | null,
  timeTrial: boolean,
): CueClass {
  const top = new Set<RiderIx>([
    ...[start.leaders.gc, start.leaders.points, start.leaders.kom].filter(
      (r): r is RiderIx => r !== null,
    ),
    ...start.gcTop.filter((r) => r.rank <= BROADCAST.cueTopStart).map((r) => r.rider),
  ])
  switch (cue.kind) {
    case 'rider':
      return cue.context === 'break_round' ? 2 : cue.context === 'tt_round' ? 0 : CUE_CLASS.rider
    case 'crash':
      // sin nombres, 2 siempre: el tiempo en pantalla delataría quién está en el suelo (mapa 06 §3.1)
      return cue.riders !== null && cue.riders.some((r) => top.has(r)) ? 3 : CUE_CLASS.crash
    case 'dropped':
    case 'abandon':
      return top.has(cue.rider) ? 3 : CUE_CLASS[cue.kind]
    case 'virtual_gc':
      return cue.rows[0] !== undefined && cue.rows[0].rider !== lastVirtualLeader
        ? 3
        : timeTrial
          ? 2
          : CUE_CLASS.virtual_gc
    case 'tt_split':
      return cue.rank === 1 ? 2 : CUE_CLASS.tt_split
    case 'tt_finish':
      return cue.hotSeat ? 3 : CUE_CLASS.tt_finish
    default:
      return CUE_CLASS[cue.kind]
  }
}

/** LA PRESENTACIÓN DE LA FUGA (6-m, §6.7): la lista, la frase y la ronda de la moto, que la cola lleva reservadas. Pura. */
export function isPresentation(cue: Cue): boolean {
  return (
    cue.kind === 'break_formed' ||
    cue.kind === 'break_presented' ||
    (cue.kind === 'rider' && cue.context === 'break_round')
  )
}

/**
 * ¿Sigue r por delante del grupo con el título de pelotón en el instante? (6-m) En tránsito cuenta el
 * grupo que dejó (3-b); sin grupo con el título, sí. Es lo que decide si un rótulo reservado de la
 * presentación todavía presenta algo.
 */
export function aheadOfPeloton(i: Instant, r: RiderIx): boolean {
  const pack = i.groups.find((g) => g.kind === 'peloton')
  if (pack === undefined) return true
  const from = i.inTransit.find((x) => x.rider === r)?.from
  const g = i.groups.find((x) => x.members.includes(r) || x.g === from)
  return g !== undefined && g.number < pack.number
}

/**
 * ¿Presenta todavía algo un rótulo reservado? (6-m) El de la moto, si su corredor sigue por delante del
 * pelotón; la lista y la frase, si sigue alguno de los escapados.
 */
function stillPresents(cue: Cue, i: Instant): boolean {
  switch (cue.kind) {
    case 'rider':
      return aheadOfPeloton(i, cue.rider)
    case 'break_formed':
    case 'break_presented':
      return cue.riders.some((r) => aheadOfPeloton(i, r))
    default:
      return true
  }
}

// ------------------------------------------------------------------ CUE_OF_TEMPLATE (§6.6, D-21)

/**
 * EL DESTINO DE CADA PLANTILLA: un rótulo (y su línea en la voz), solo la voz o solo el acta. Las 54 que
 * emite el motor (44 de carretera, `rider_defies_team` y las 13 de la crono, cuatro compartidas) más
 * `crash`, la caída sintetizada (D-13). Lo que no esté aquí va a la voz en producción; B7 (6b) lo hace
 * fallar en test. Las de la regla `finish` (§4.7) nunca van en un tramo: su rótulo lo programa el
 * reproductor tras `BroadcastFinish` (§8.7).
 */
export const CUE_OF_TEMPLATE: Readonly<Record<string, TemplateTarget>> = {
  // carretera: ataques y movimientos
  attack_go: 'voice_only',
  attack_swarm: 'voice_only',
  attack_sticks: 'attack',
  attack_reeled: 'voice_only',
  move_caught: 'voice_only',
  move_faded: 'voice_only',
  bridge_made: 'voice_only',
  move_merge: 'voice_only',
  bridge_failed: 'voice_only',
  // la fuga
  breakaway_formed: 'break_formed',
  break_cooperation: 'voice_only',
  break_share: 'voice_only',
  breakaway_caught: 'caught',
  peloton_concedes: 'voice_only',
  // el estado que ya dice la barra (D-43, punto 5)
  front_group: 'report_only',
  time_gap: 'report_only',
  // quién tira y por qué
  peloton_pull: 'voice_only',
  chase_work: 'voice_only',
  sprinters_chase: 'voice_only',
  sprinters_give_up: 'voice_only',
  no_help_for_leader: 'voice_only',
  domestiques_drop_back: 'voice_only',
  rider_defies_team: 'voice_only',
  // cortes y reagrupamientos
  peloton_split: 'split',
  peloton_selection: 'split',
  echelon_split: 'split',
  echelon_close: 'voice_only',
  peloton_regroup: 'group_changed',
  group_overtake: 'voice_only',
  // corredores
  leader_dropped: 'dropped',
  rider_bonks: 'dropped',
  rider_sits_up: 'voice_only',
  rider_abandons: 'abandon',
  puncture: 'mishap',
  mechanical: 'mishap',
  crash: 'crash',
  truce_granted: 'voice_only',
  truce_denied: 'voice_only',
  rain_front: 'voice_only',
  // pancartas
  sprint_intermediate: 'banner_result',
  climb_kom: 'banner_result',
  // meta: solo tras BroadcastFinish
  bunch_sprint: 'voice_only',
  final_km: 'voice_only',
  stage_win: 'finish',
  time_cut: 'time_cut',
  time_cut_readmitted: 'voice_only',
  // crono (sus rótulos de estado, ON COURSE, SPLIT, HOT SEAT, son §9.5)
  tt_start_order: 'voice_only',
  tt_last_off: 'voice_only',
  tt_split: 'voice_only',
  tt_first_time: 'voice_only',
  tt_best_time: 'voice_only',
  tt_catch: 'voice_only',
  tt_catches: 'voice_only',
  tt_last_home: 'voice_only',
  stage_win_itt: 'finish',
}

// ------------------------------------------------------------------- cuesBetween (§6.5, 6-i)

/** Lo que sale cada palabra de una causa de corte (`datos.causa` de `peloton_split`, simulate.ts). */
const SPLIT_CAUSES = ['caida', 'viento', 'sector', 'puerto', 'caza'] as const

/** El grupo que lleva a la mayoría de unos corredores en un instante; a igualdad, el primero en carretera. */
function groupOfRiders(at: Instant, riders: readonly RiderIx[]): GroupNow | undefined {
  let best: GroupNow | undefined
  let bestN = 0
  for (const g of at.groups) {
    let n = 0
    for (const r of riders) if (g.members.includes(r)) n++
    if (n > bestN) {
      best = g
      bestN = n
    }
  }
  return best
}

/** El grupo de antes de `g`: el mismo, o el que murió y le tiene por sucesor (D-03), el mayor si son varios. */
function selfBefore(
  prev: Instant,
  next: Instant,
  g: GroupIx,
  catalog: readonly GroupCatalogEntry[] | undefined,
): GroupNow | undefined {
  const same = prev.groups.find((x) => x.g === g)
  if (same !== undefined || catalog === undefined) return same
  let best: GroupNow | undefined
  for (const x of prev.groups) {
    if (catalog[x.g]?.successor !== g || next.groups.some((y) => y.g === x.g)) continue
    if (best === undefined || x.size > best.size) best = x
  }
  return best
}

/** El rótulo de un suceso, con sus campos de la tabla de §6.6; null si no lleva rótulo en un tramo. */
function cueOfEvent(e: TimelineEvent, prev: Instant, next: Instant): Cue | null {
  const t = e.revealS
  const target = CUE_OF_TEMPLATE[e.plantilla] ?? 'voice_only'
  switch (target) {
    case 'attack': {
      // los protagonistas, como mucho tres (R23.4), y el grupo del que salen en el instante anterior
      const riders = e.riders.slice(0, 3)
      const from = groupOfRiders(prev, riders) ?? prev.groups[0]
      return from === undefined ? null : { kind: 'attack', t, riders, fromGroup: from.g }
    }
    case 'break_formed': {
      // el grupo de todos los de la fuga, y la diferencia principal si ese grupo es la cabeza
      const g = groupOfRiders(next, e.riders)
      if (g === undefined) return null
      const gapS = next.mainGap !== null && next.mainGap.ahead === g.g ? next.mainGap.gapS : 0
      return { kind: 'break_formed', t, group: g.g, riders: [...e.riders], gapS }
    }
    case 'caught': {
      // el grupo que tenían los cazados y el que tienen ahora, su sucesor
      const was = groupOfRiders(prev, e.riders)
      const now = groupOfRiders(next, e.riders)
      if (was === undefined || now === undefined) return null
      return { kind: 'caught', t, caught: was.g, by: now.g, toGoKm: next.toGoKm }
    }
    case 'split': {
      // los grupos de ahora con alguien que iba en el grupo del título antes
      const title = prev.groups.find((g) => g.kind === 'peloton')
      const parts =
        title === undefined
          ? []
          : next.groups.filter((g) => g.members.some((r) => title.members.includes(r)))
      const causa = e.datos?.causa
      const cause =
        typeof causa === 'string' && (SPLIT_CAUSES as readonly string[]).includes(causa)
          ? causa
          : e.plantilla === 'echelon_split'
            ? 'viento'
            : null
      return {
        kind: 'split',
        t,
        parts: parts.map((g) => g.g),
        cause,
        echelon: e.plantilla === 'echelon_split',
      }
    }
    case 'banner_result': {
      // la pancarta revelada en ese km (la del suceso lleva su km en décimas; la pancarta, el de su bloque)
      const kind = e.plantilla === 'climb_kom' ? 'cima' : 'meta_volante'
      let banner = -1
      let best = Number.POSITIVE_INFINITY
      next.banners.forEach((b, i) => {
        const d = Math.abs(b.km - e.km)
        if (b.kind === kind && d <= BANNER_KM_TOLERANCE && d < best) {
          banner = i
          best = d
        }
      })
      return banner < 0 ? null : { kind: 'banner_result', t, banner }
    }
    case 'crash': {
      // primero sin nombres; los nombres los programa el reproductor (namedCrashesBetween, 6-i)
      const g = groupOfRiders(next, e.riders) ?? groupOfRiders(prev, e.riders)
      return g === undefined ? null : { kind: 'crash', t, group: g.g, riders: null }
    }
    case 'mishap': {
      const rider = e.riders[0]
      if (rider === undefined) return null
      const lost = e.datos?.perdidaS
      return {
        kind: 'mishap',
        t,
        rider,
        mishap: e.plantilla === 'mechanical' ? 'averia' : 'pinchazo',
        lostS: typeof lost === 'number' ? lost : 0,
      }
    }
    case 'dropped':
    case 'abandon': {
      // el hueco del grupo en que se pinta al corredor (H-17), o null si va en tránsito
      const rider = e.riders[0]
      if (rider === undefined) return null
      const moving = next.inTransit.some((x) => x.rider === rider)
      const g = moving ? undefined : next.groups.find((x) => x.members.includes(rider))
      return { kind: target, t, rider, gapS: g === undefined ? null : g.gap.toHeadS }
    }
    case 'group_changed': {
      // peloton_regroup: los que vuelven al grupo del título; si no se ve volver a nadie, nada
      const pack = next.groups.find((g) => g.kind === 'peloton')
      if (pack === undefined) return null
      const before = prev.groups.find((g) => g.g === pack.g)?.members ?? []
      const gained = pack.members.filter((r) => !before.includes(r))
      return gained.length === 0
        ? null
        : { kind: 'group_changed', t, group: pack.g, gained, lost: [] }
    }
    default:
      // la voz, el acta, y lo que programa el reproductor (la meta, el fuera de control, 6-i)
      return null
  }
}

/** Km entre el suceso de una pancarta (en décimas) y la pancarta (el km de su bloque): bloque y medio. */
const BANNER_KM_TOLERANCE = 0.15

/** Los sucesos revelados en (prev.t, next.t], por hora y, a igual hora, por índice: en Ds, como el corte. */
function revealedBetween(
  prev: Instant,
  next: Instant,
  events: readonly TimelineEvent[],
): TimelineEvent[] {
  const from = toDs(prev.t)
  const to = toDs(next.t)
  return events
    .filter((e) => {
      const d = toDs(e.revealS)
      return d > from && d <= to
    })
    .sort((a, b) => toDs(a.revealS) - toDs(b.revealS) || a.source - b.source)
}

/**
 * LOS RÓTULOS ENTRE DOS INSTANTES (§6.5; la firma de §21.6 F.2, más el catálogo). Pura y solo conoce
 * la línea: los de los sucesos revelados en (prev.t, next.t] por `CUE_OF_TEMPLATE`, con los campos de
 * §6.6; `last_km` si la cabeza cruza el último km; y `group_changed` de cada grupo de hasta
 * `nameWholeGroupUpTo` cuya gente cambió respecto de sí mismo antes, o, con el catálogo de la línea
 * (`catalog`, que §21.6 no tenía: el instante no lleva los sucesores), del grupo que murió y le tiene
 * por sucesor (D-03). Lo que depende del espectador, del recorrido o del reloj de pared lo programa el
 * reproductor (6-i): entre ello, los nombres de una caída (`namedCrashesBetween`).
 */
export function cuesBetween(
  prev: Instant,
  next: Instant,
  events: readonly TimelineEvent[],
  catalog?: readonly GroupCatalogEntry[],
): Cue[] {
  const out: Cue[] = []
  for (const e of revealedBetween(prev, next, events)) {
    const cue = cueOfEvent(e, prev, next)
    if (cue !== null) out.push(cue)
  }
  if (prev.toGoKm > 1 && next.toGoKm <= 1)
    out.push({ kind: 'last_km', t: next.t, leadGapS: next.mainGap?.gapS ?? null })
  const told = new Set(out.flatMap((c) => (c.kind === 'group_changed' ? [c.group] : [])))
  for (const g of next.groups) {
    if (g.size > BROADCAST.nameWholeGroupUpTo || told.has(g.g)) continue
    const before = selfBefore(prev, next, g.g, catalog)
    if (before === undefined) continue
    const gained = g.members.filter((r) => !before.members.includes(r))
    const lost = before.members.filter((r) => !g.members.includes(r))
    if (gained.length > 0 || lost.length > 0)
      out.push({ kind: 'group_changed', t: next.t, group: g.g, gained, lost })
  }
  return out
}

/**
 * EL SEGUNDO TIEMPO DE UNA CAÍDA (D-13, 6-i): por cada caída revelada en (prev.t, next.t], el mismo
 * rótulo que da `cuesBetween` con sus nombres. Lo programa el reproductor `crashNamesDelayS` de pared
 * después del primero; su clase la sube `cueClassOf` si cae un maillot o un top de salida.
 */
export function namedCrashesBetween(
  prev: Instant,
  next: Instant,
  events: readonly TimelineEvent[],
): Cue[] {
  return revealedBetween(prev, next, events).flatMap((e): Cue[] => {
    if ((CUE_OF_TEMPLATE[e.plantilla] ?? 'voice_only') !== 'crash') return []
    const cue = cueOfEvent(e, prev, next)
    return cue === null || cue.kind !== 'crash' ? [] : [{ ...cue, riders: [...e.riders] }]
  })
}

// ------------------------------------------------------------------------- la cola (§6.5, 6-h)

/** Un rótulo que espera: su clase y la hora de pared a la que entró. */
export interface QueuedCue {
  readonly cue: Cue
  readonly cls: CueClass
  readonly sinceS: number
}

/** El rótulo en pantalla, hasta la hora de pared `untilS`. */
export interface ShownCue {
  readonly cue: Cue
  readonly cls: CueClass
  readonly untilS: number
}

/**
 * LA COLA DE RÓTULOS, el estado que guarda el reproductor (§6.5): lo que espera, en el orden en que
 * saldrá (por clase, de mayor a menor, y a igual clase por hora de carrera), y lo que está en pantalla.
 * Uno a la vez: nunca dos rótulos de corredor en pantalla (mapa 06 §5.3).
 */
export interface CueQueue {
  readonly waiting: readonly QueuedCue[]
  readonly shown: ShownCue | null
}

export const EMPTY_CUE_QUEUE: CueQueue = { waiting: [], shown: null }

/**
 * Lo que la cola mira en cada paso: la hora de pared (que corre con el reloj, no en pausa), los km a meta
 * de la cabeza y, si se da, el instante que se pinta, con el que el fotograma tira la presentación de
 * una fuga que ya no presenta nada (6-m). Sin instante (la crono, o quien no lo tenga), no se tira nada.
 */
export interface CueClock {
  readonly wallS: number
  readonly toGoKm: number
  readonly instant?: Instant
}

/** ¿Está la cabeza en los últimos quietFinalM? Solo la distancia (D-17, §6.9). */
const quiet = (toGoKm: number): boolean => toGoKm * 1000 < BROADCAST.quietFinalM

/** La ronda de la moto: a igual clase, espera detrás de los demás (6-m). */
const isRound = (c: Cue): boolean => c.kind === 'rider' && c.context === 'break_round'

/**
 * La espera con un rótulo más, en su sitio: por clase; a igual clase, la ronda de la moto detrás de los
 * demás (6-m); después, por hora de carrera y por llegada.
 */
function enqueue(waiting: readonly QueuedCue[], x: QueuedCue): QueuedCue[] {
  const out = [...waiting]
  const before = (y: QueuedCue): boolean =>
    y.cls > x.cls ||
    (y.cls === x.cls && (isRound(y.cue) === isRound(x.cue) ? y.cue.t <= x.cue.t : !isRound(y.cue)))
  let i = out.length
  while (i > 0 && !before(out[i - 1]!)) i--
  out.splice(i, 0, x)
  return out
}

/**
 * El índice del que se echa: el de menor clase entre los de clase ≤ máx. y, a igual clase, el que más
 * espera. Nunca uno de la presentación de la fuga (6-m).
 */
function evictable(waiting: readonly QueuedCue[], maxCls: CueClass): number {
  let pick = -1
  waiting.forEach((x, i) => {
    if (x.cls > maxCls || isPresentation(x.cue)) return
    const p = pick < 0 ? undefined : waiting[pick]!
    if (p === undefined || x.cls < p.cls || (x.cls === p.cls && x.sinceS < p.sinceS)) pick = i
  })
  return pick
}

/** El de la crono que espera y que `c` sustituye (9-d): el `tt_split` del mismo control, o el `tt_finish`. */
function replaced(waiting: readonly QueuedCue[], c: Cue): number {
  if (c.kind === 'tt_split')
    return waiting.findIndex((x) => x.cue.kind === 'tt_split' && x.cue.check === c.check)
  if (c.kind === 'tt_finish') return waiting.findIndex((x) => x.cue.kind === 'tt_finish')
  return -1
}

/**
 * ADMITIR (§6.5, 6-h). Pura. `cls` es la de `cueClassOf`. En los últimos `quietFinalM`, el rótulo de
 * corredor se descarta. La presentación de la fuga entra siempre, reservada: no cuenta para
 * `cueQueueMax` y nadie la echa (6-m). Un `tt_split` que espera se sustituye por el siguiente del mismo
 * control, y un `tt_finish` por el siguiente, con la mayor de las dos clases: el que espera ya no es
 * noticia (9-d). Con menos de `cueQueueMax` no reservados esperando, entra; si no, uno de clase 0 o 1 se
 * descarta, uno de clase 2 echa al de menor clase y más viejo de clase ≤ 1 o, si no hay, al de clase 2
 * más viejo, y uno de clase 3 entra siempre (la cola crece: la meta nunca se tira). `admitted` dice si
 * entró: es lo que el reproductor le da al reductor (`cueAdmitted`) y lo que apaga `Next action`.
 */
export function admitCue(
  q: CueQueue,
  cue: Cue,
  cls: CueClass,
  at: CueClock,
): { readonly queue: CueQueue; readonly admitted: boolean } {
  if (cue.kind === 'rider' && quiet(at.toGoKm)) return { queue: q, admitted: false }
  const x: QueuedCue = { cue, cls, sinceS: at.wallS }
  if (isPresentation(cue))
    return { queue: { ...q, waiting: enqueue(q.waiting, x) }, admitted: true }
  const old = replaced(q.waiting, cue)
  if (old >= 0) {
    const was = q.waiting[old]!
    const rest = q.waiting.filter((_, i) => i !== old)
    const merged: QueuedCue = { ...x, cls: was.cls > cls ? was.cls : cls }
    return { queue: { ...q, waiting: enqueue(rest, merged) }, admitted: true }
  }
  const open = q.waiting.filter((w) => !isPresentation(w.cue)).length
  if (open < BROADCAST.cueQueueMax)
    return { queue: { ...q, waiting: enqueue(q.waiting, x) }, admitted: true }
  if (cls <= 1) return { queue: q, admitted: false }
  let out = evictable(q.waiting, 1)
  if (out < 0 && cls === 2) out = evictable(q.waiting, 2)
  const rest = out < 0 ? q.waiting : q.waiting.filter((_, i) => i !== out)
  return { queue: { ...q, waiting: enqueue(rest, x) }, admitted: true }
}

/**
 * EL FOTOGRAMA DE LA COLA (§6.5, 6-h). Pura. Tira la presentación de una fuga que ya no presenta nada
 * (con el instante: el escapado ya no va por delante del pelotón, o ninguno de la fuga; 6-m); caduca lo
 * de clase 2 o menos que lleva más de `cueHoldS[3]` de pared esperando (un ATTACK de alguien ya cazado
 * contradiría la barra), salvo la presentación, que no caduca; quita el de pantalla al acabarse su
 * tiempo (`cueHoldS[clase]`; la ronda de la moto, `cueHoldS[0]`); corta el de clase 0 o 1 si espera uno
 * de clase 3 (la tele corta); y si la pantalla queda libre y la cabeza no está en los últimos
 * `quietFinalM`, saca el primero. La carrera no se frena nunca por la cola (D-21): nada de esto toca el
 * reloj.
 */
export function cueFrame(q: CueQueue, at: CueClock): CueQueue {
  const instant = at.instant
  const waiting = q.waiting.filter((x) =>
    isPresentation(x.cue)
      ? instant === undefined || stillPresents(x.cue, instant)
      : x.cls >= 3 || at.wallS - x.sinceS <= BROADCAST.cueHoldS[3],
  )
  let shown = q.shown
  if (shown !== null && at.wallS >= shown.untilS) shown = null
  if (shown !== null && shown.cls <= 1 && waiting[0]?.cls === 3) shown = null
  if (shown === null && !quiet(at.toGoKm) && waiting.length > 0) {
    const [first, ...rest] = waiting
    const hold = isRound(first!.cue) ? BROADCAST.cueHoldS[0] : BROADCAST.cueHoldS[first!.cls]
    return {
      waiting: rest,
      shown: { cue: first!.cue, cls: first!.cls, untilS: at.wallS + hold },
    }
  }
  return waiting.length === q.waiting.length && shown === q.shown ? q : { waiting, shown }
}
