/**
 * CUÁNDO SE ENSEÑA CADA SUCESO (E2, docs/retransmision.md §4.7; D-05, I-06, I-20).
 *
 * El `tS` de un suceso no significa lo mismo en todas las plantillas: casi la mitad lleva el reloj de
 * un bloque antes que la foto y siete casos llevan una fecha trucada (mapa 01 §1.2). `revealSOf` los
 * fecha por la hora a la que se SABEN, sin tocar el motor: con el bloque en que el motor los emitió
 * (`bEmit`) y el reloj de quien los protagoniza. La voz se ordena por esta hora (12-a) y el corte de
 * los tramos la usa como frontera (§4.6).
 *
 * Es del lado del grabador (15-b): no puede importar `./constants.js` ni `./index.js`. Lo usan el
 * adaptador de la radio desde el PR 2, sobre su reloj estimado (§3.8), y el grabador desde el 4b,
 * sobre las marcas exactas de la línea (§5.4); cada uno le da su `RecorderView`.
 */
import type { BannerResult, Block, GroupIx, RaceS, RiderIx } from './timeline.js'

export type RevealRule =
  'emit' | 'next_emit' | 'banner' | 'incident' | 'finish' | 'tt_race_clock' | 'tt_own_clock'

/**
 * En carretera, por plantilla; lo que no esté aquí es 'emit', que es la regla sin excepciones de lo
 * que se sabe al pasar el grupo. B7 (6b) exige que toda plantilla que emite el motor tenga fila de voz,
 * de acta y de CUE_OF_TEMPLATE.
 */
export const REVEAL_RULES: Readonly<Record<string, RevealRule>> = {
  // (a) se fechan donde nació la fuga y se emiten al cuajar: su bEmit es el de la confirmación.
  breakaway_formed: 'emit',
  break_cooperation: 'emit',
  // (g) ya va en máx(km, breakFormedKm); la protagoniza la fuga y lleva el reloj del pelotón.
  peloton_concedes: 'emit',
  // (b) se inserta al cerrar, delante del primer suceso de su protagonista.
  rider_defies_team: 'next_emit',
  // (f) la pancarta, con el reloj del grupo del primero que puntúa.
  climb_kom: 'banner',
  sprint_intermediate: 'banner',
  // La caída sintetizada (D-13) y los percances de carretera: el grupo en que iba el caído (4-v).
  crash: 'incident',
  puncture: 'incident',
  mechanical: 'incident',
  // (c), (d) lo de la meta: nunca en un tramo, solo en el paquete de meta (D-06).
  bunch_sprint: 'finish',
  final_km: 'finish',
  stage_win: 'finish',
  time_cut: 'finish',
  time_cut_readmitted: 'finish',
}

/** En crono, por plantilla; lo que no esté aquí es 'tt_race_clock', porque su tS ya es reloj de carrera. */
export const TT_REVEAL_RULES: Readonly<Record<string, RevealRule>> = {
  // (e) el pinchazo de una crono lleva el reloj PROPIO del corredor, no el de carrera.
  puncture: 'tt_own_clock',
  mechanical: 'tt_own_clock',
  stage_win_itt: 'finish',
  // tt_catches lleva la hora de la última llegada, que es el borde de la crono (4-w).
  tt_last_home: 'finish',
  tt_catches: 'finish',
  time_cut: 'finish',
  time_cut_readmitted: 'finish',
}

/** Lo que revealSOf necesita de un suceso. RaceEvent (stage/types.ts) y ChronicleEvent (la API) caben en él. */
export interface RevealInput {
  readonly plantilla: string
  readonly km: number
  readonly tS: RaceS
  readonly protagonistas: readonly string[]
}

/**
 * Lo que revealSOf necesita de la etapa: el grabador la tiene entera al cerrar (§5.4) y el adaptador
 * de la radio la estima desde la radio guardada (§3.8).
 */
export interface RecorderView {
  readonly timeTrial: boolean
  /** el borde de la meta (§4.6) */
  readonly finishS: RaceS
  readonly riderIx: (riderId: string) => RiderIx | null
  /** el bloque cuyo centro es ese km, como resuelve el motor las fotos (simulate.ts, `probeAt`) */
  readonly blockOfKm: (km: number) => Block
  /** su grupo al final de b; con b = −1, el de salida (0); null si ya no corría o no se sabe */
  readonly groupAt: (rider: RiderIx, b: Block) => GroupIx | null
  /** el reloj de g al final de b; null si g no vivía en b */
  readonly clockAt: (g: GroupIx, b: Block) => RaceS | null
  /** la menor marca en b, con máximo acumulado (C3): la cabeza no retrocede */
  readonly headClockAt: (b: Block) => RaceS
  /** la pancarta de ese tipo a menos de un bloque de km, o null si la línea no la tiene */
  readonly bannerAt: (kind: BannerResult['kind'], km: number) => BannerResult | null
  /** el bEmit de su siguiente suceso tras el de índice afterSource */
  readonly nextEmitOf: (rider: RiderIx, afterSource: number) => Block | null
  readonly ttStartS: (rider: RiderIx) => RaceS
  /** de la traza, interpolado entre km enteros */
  readonly ttOwnClockAt: (rider: RiderIx, km: number) => RaceS
}

/**
 * La regla de una plantilla. Con `Object.hasOwn` y no con `tabla[plantilla]` a secas: una plantilla
 * que se llamara como una propiedad heredada de Object (`constructor`) no puede salir con otra regla
 * que la de por defecto.
 */
function ruleOf(plantilla: string, timeTrial: boolean): RevealRule {
  const table = timeTrial ? TT_REVEAL_RULES : REVEAL_RULES
  const rule = Object.hasOwn(table, plantilla) ? table[plantilla] : undefined
  return rule ?? (timeTrial ? 'tt_race_clock' : 'emit')
}

/**
 * La hora de carrera a la que se enseña el suceso `e`, que es el de índice `source` en
 * `stage_snapshots.events` (−1 si es sintetizado) y se emitió en el bloque `bEmit`.
 *
 * En carretera la regla nunca adelanta el suceso a su propio `tS` (decisión 4-g): se toma
 * `máx(tS, regla)`, porque el primer protagonista no es siempre el grupo que actúa. En crono no,
 * porque el `tS` de un pinchazo es reloj propio y no de carrera.
 */
export function revealSOf(e: RevealInput, source: number, bEmit: Block, v: RecorderView): RaceS {
  const first = e.protagonistas[0]
  const r0 = first === undefined ? null : v.riderIx(first)
  /** El reloj del grupo de su primer protagonista al final de b, o el de la cabeza si no se sabe. */
  const emitAt = (b: Block): RaceS => {
    const g = r0 === null ? null : v.groupAt(r0, b)
    const clock = g === null ? null : v.clockAt(g, b)
    return clock ?? v.headClockAt(b)
  }
  switch (ruleOf(e.plantilla, v.timeTrial)) {
    case 'emit':
      return Math.max(e.tS, emitAt(bEmit))
    case 'next_emit':
      return Math.max(e.tS, emitAt(r0 === null ? bEmit : (v.nextEmitOf(r0, source) ?? bEmit)))
    case 'banner': {
      const banner = v.bannerAt(e.plantilla === 'climb_kom' ? 'cima' : 'meta_volante', e.km)
      return Math.max(e.tS, banner?.revealS ?? emitAt(bEmit))
    }
    case 'incident': {
      // El grupo en que iba al final del bloque ANTERIOR (4-v): el motor saca al caído de su grupo en
      // el mismo bloque de la caída, y al final de ese bloque ya va en otro, detrás.
      const b = v.blockOfKm(e.km)
      const g = r0 === null ? null : v.groupAt(r0, b - 1)
      const clock = g === null ? null : (v.clockAt(g, b) ?? v.clockAt(g, b - 1))
      return Math.max(e.tS, clock ?? v.headClockAt(b))
    }
    case 'finish':
      return Math.max(v.finishS, e.tS)
    case 'tt_race_clock':
      return e.tS
    case 'tt_own_clock':
      // Sin protagonista no hay reloj propio que leer: queda su tS, como el resto de la crono.
      return r0 === null ? e.tS : v.ttStartS(r0) + v.ttOwnClockAt(r0, e.km)
  }
}
