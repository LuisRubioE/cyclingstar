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
 */
import type { ChronicleEntry } from '../contracts.js'
import type { JerseyKind } from '../jerseys.js'
import type { VirtualGcRow } from './instant.js'
import type { GroupIx, RaceS, RiderIx } from './timeline.js'

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
  /** la frase de la fuga (breakHeadline, §7.6) */
  | {
      readonly kind: 'break_presented'
      readonly t: RaceS
      readonly group: GroupIx
      readonly named: readonly RiderIx[]
      readonly others: number
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
  /** peloton_split, echelon_split; cause = datos.causa (caida, viento, sector, puerto, caza) */
  | {
      readonly kind: 'split'
      readonly t: RaceS
      readonly parts: readonly GroupIx[]
      readonly cause: string | null
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
