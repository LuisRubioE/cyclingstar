/**
 * EL CUADRO DE ENTRENAMIENTO, SIN PANTALLA (E3, docs/visual.md §10 y §11.6; PR 14). Lo que la página decide
 * y no pinta: qué días se entrenan, cómo se combinan los guardados con lo que el jugador toca y no ha
 * guardado, qué manda el guardado, las semanas del plan vivo con su tira, la carga en palabras, la regla de
 * cada modo, a dónde vuelve un día con `Back to …`, los viajes y lo que dice la `ActionBar`.
 *
 * Los días salen de `days[]` (`GET /orders` y la vista previa), que da `resolveTrainingDay`: la misma
 * precedencia que entrena el tick. Hasta el 13b la pantalla rellenaba los días sin orden con
 * `defaultCoachPlan`, un ciclo fijo que coincidía con lo que entrenaba el bloque en 88 de 350 casos (mapa 02
 * §1); la función se queda en `packages/shared` porque la usa el simulador del motor (Rcodigo-059).
 *
 * Las ediciones sin guardar viven APARTE de los datos del servidor, indexadas por día de juego: un refetch en
 * segundo plano cambia la base, nunca lo que el jugador ha tocado.
 */

import {
  type ArrivalLabel,
  type Attribute,
  type CoachBlock,
  type Intensity,
  type LoadLevel,
  type OrdersDay,
  type PlanPreviewDay,
  type PlanPreviewRace,
  type PlanPreviewRequest,
  type RaceClass,
  type Session,
  type TrainingDaySource,
  type TrainingMode,
  type TrainingOrder,
  type TravelDay,
  loadLevelOf,
  seasonPosition,
  sessionTss,
} from '@cyclingstar/shared'
import type { Tone } from '../components/ui/types'
import { raceClassLabel } from './labels'
import { ARRIVAL_WORD, BLOCK_WORD, LOAD_WORD, MODE_WORD, plural } from './words'

/** Las cuatro semanas del plan vivo. */
const SEMANAS = 4
const DIAS_POR_SEMANA = 7
/** Lo que dura un plan: sus cuatro semanas. */
const DIAS_DEL_PLAN = SEMANAS * DIAS_POR_SEMANA
/** `in N days`, solo a siete días o menos (D-43). */
const CUANTO_FALTA_DIAS = 7

export type Blocks = readonly (CoachBlock | null)[]

/** El plan tal como lo decide el jugador, guardado o en pantalla. */
export interface PlanDraft {
  readonly mode: TrainingMode
  readonly blocks: Blocks
  readonly focusAttr: Attribute | null
  readonly intensity: Intensity | null
  /** `Start a new plan tomorrow`: sus semanas, desde mañana y no desde el `startDay` del plan vivo */
  readonly startFresh: boolean
}

/** Un día tocado sin guardar: la orden nueva, o quitar la guardada (`Back to …`, que también es un cambio). */
export type DayEdit =
  | { readonly kind: 'set'; readonly session: Session; readonly intensity: Intensity }
  | { readonly kind: 'clear' }
export type DayEdits = Readonly<Record<number, DayEdit>>

type Choice = Pick<TrainingOrder, 'session' | 'intensity'>

/** El día de la temporada, `Day 52`; nunca el día absoluto (§4.10). */
const dia = (gameDay: number) => seasonPosition(gameDay).dayOfSeason
const unDia = (gameDay: number) => `Day ${dia(gameDay)}`
/** `Day 55` o `Days 56 to 60`. */
export function dayRange(first: number, last: number): string {
  return first === last ? unDia(first) : `Days ${dia(first)} to ${dia(last)}`
}

/** Los tramos seguidos de una lista de días: `[55, 56, 57, 61]` da `[[55, 57], [61, 61]]`. */
function tramos(days: readonly number[]): [number, number][] {
  const out: [number, number][] = []
  for (const d of [...days].sort((a, b) => a - b)) {
    const ultimo = out[out.length - 1]
    if (ultimo !== undefined && d === ultimo[1] + 1) ultimo[1] = d
    else out.push([d, d])
  }
  return out
}

const sinDia = (edits: DayEdits, gameDay: number): DayEdits =>
  Object.fromEntries(Object.entries(edits).filter(([k]) => Number(k) !== gameDay))

// --- Los días ------------------------------------------------------------------------------------

/** Ni de carrera ni de viaje: se entrena, y se edita. */
export const isTrainingDay = (d: OrdersDay): boolean =>
  d.source !== 'carrera' && d.source !== 'viaje'

/**
 * Los días que se entrenan, tal como los da el servidor (`days[]`): sin los de carrera (#6) ni los de VIAJE,
 * de ida o de vuelta, que tampoco se entrenan.
 */
export function buildServerPlan<D extends OrdersDay>(days: readonly D[]): D[] {
  return days.filter(isTrainingDay)
}

/** A dónde vuelve un día sin su orden: el bloque de su semana, el plan de equipo o el entrenador. */
export type BackTarget = Extract<TrainingDaySource, 'bloque' | 'equipo' | 'entrenador' | 'descanso'>

/**
 * El plan visible: los días del servidor con las ediciones sin guardar encima, para que lo tocado se vea al
 * momento y no cuando llegue la vista previa. Una orden puesta manda salvo en `entrenador`, que no lee las
 * órdenes (`resolveTrainingDay`), y su carga es la de su sesión; una quitada devuelve el día a lo que tendría
 * sin ella (`fallback`) hasta que la vista previa lo confirme. Los días de carrera y de viaje no se tocan.
 */
export function applyEdits(
  days: readonly PlanPreviewDay[],
  edits: DayEdits,
  o: {
    readonly mode: TrainingMode
    readonly fallback: (gameDay: number) => {
      readonly source: BackTarget
      readonly block: OrdersDay['block']
    }
  },
): PlanPreviewDay[] {
  if (o.mode === 'entrenador') return [...days]
  return days.map((d) => {
    const edit = edits[d.gameDay]
    if (edit === undefined || !isTrainingDay(d)) return d
    if (edit.kind === 'set') {
      const choice = { session: edit.session, intensity: edit.intensity }
      return {
        ...d,
        ...choice,
        source: 'orden',
        block: null,
        load: loadLevelOf(sessionTss(choice)),
      }
    }
    return d.source === 'orden' ? { ...d, ...o.fallback(d.gameDay) } : d
  })
}

/** Pone la orden de un día; si vuelve a ser la guardada, deja de ser un cambio. */
export function withDayEdit(
  edits: DayEdits,
  saved: readonly TrainingOrder[],
  gameDay: number,
  choice: Choice,
): DayEdits {
  const resto = sinDia(edits, gameDay)
  const guardada = saved.find((s) => s.gameDay === gameDay)
  if (guardada?.session === choice.session && guardada.intensity === choice.intensity) return resto
  return {
    ...resto,
    [gameDay]: { kind: 'set', session: choice.session, intensity: choice.intensity },
  }
}

/** `Back to …`: quita la orden guardada (un cambio) o deshace la que no lo estaba. */
export function withoutOrder(
  edits: DayEdits,
  saved: readonly TrainingOrder[],
  gameDay: number,
): DayEdits {
  const resto = sinDia(edits, gameDay)
  return saved.some((s) => s.gameDay === gameDay)
    ? { ...resto, [gameDay]: { kind: 'clear' } }
    : resto
}

/** `Adopt team plan`: las sugerencias del equipo, como órdenes sin guardar, en los días que se entrenan. */
export function adoptTeamSuggestions(
  edits: DayEdits,
  saved: readonly TrainingOrder[],
  plan: readonly OrdersDay[],
  suggestions: ReadonlyMap<number, Choice>,
): DayEdits {
  let next = edits
  for (const day of plan) {
    const s = suggestions.get(day.gameDay)
    if (s !== undefined && isTrainingDay(day)) next = withDayEdit(next, saved, day.gameDay, s)
  }
  return next
}

// --- El guardado ---------------------------------------------------------------------------------

/**
 * LA VENTANA DE ÓRDENES DE LA PANTALLA (11-c): las guardadas, con las tocadas encima y sin las quitadas. Es lo
 * que lee la vista previa y lo que manda `PUT /orders`, que sustituye la ventana entera. Hasta el 14 se
 * mandaban solo los días tocados en esta visita, y guardar uno borraba las órdenes guardadas en otra.
 */
export function ordersWindow(saved: readonly TrainingOrder[], edits: DayEdits): TrainingOrder[] {
  const out = new Map(saved.map((s) => [s.gameDay, s]))
  for (const [k, edit] of Object.entries(edits)) {
    const gameDay = Number(k)
    if (edit.kind === 'clear') out.delete(gameDay)
    else out.set(gameDay, { gameDay, session: edit.session, intensity: edit.intensity })
  }
  return [...out.values()].sort((a, b) => a.gameDay - b.gameDay)
}

/**
 * La petición de la vista previa: el modo, el plan y la ventana de órdenes (§11.2). `fromTomorrow`: las semanas
 * desde mañana aunque no se empiece de cero, cuando no hay un plan vivo con bloques (`livePlan`), como las
 * pinta la pantalla.
 */
export function previewRequest(
  draft: PlanDraft,
  window: readonly TrainingOrder[],
  fromTomorrow = false,
): PlanPreviewRequest {
  return {
    mode: draft.mode,
    plan: { blocks: [...draft.blocks], focusAttr: draft.focusAttr, intensity: draft.intensity },
    edits: [...window],
    startFresh: draft.startFresh || fromTomorrow,
  }
}

/** La intensidad sin elegir es `Normal` (`blockWeek`): `null` y `normal` son la misma. */
const intensidad = (i: Intensity | null): Intensity => i ?? 'normal'

type Cambios = { -readonly [K in keyof PlanDraft]?: PlanDraft[K] }
const CLAVES = ['mode', 'blocks', 'focusAttr', 'intensity', 'startFresh'] as const

/** Si un valor tocado del plan es el guardado. */
function esLoGuardado<K extends keyof PlanDraft>(saved: PlanDraft, k: K, v: PlanDraft[K]): boolean {
  if (k === 'blocks') {
    const b = v as Blocks
    return saved.blocks.every((x, i) => x === (b[i] ?? null))
  }
  if (k === 'intensity') return intensidad(v as Intensity | null) === intensidad(saved.intensity)
  if (k === 'startFresh') return v === false
  return v === saved[k]
}

/**
 * Lo tocado del plan, sin lo que vuelve a ser lo guardado: un cambio deshecho deja de contar y de pedir
 * `PUT /plan`, y la vista previa de la pantalla vuelve a ser la de lo guardado.
 */
export function pruneChanges(saved: PlanDraft, cambios: Partial<PlanDraft>): Partial<PlanDraft> {
  const out: Cambios = {}
  for (const k of CLAVES) {
    const v = cambios[k]
    if (v !== undefined && !esLoGuardado(saved, k, v)) Object.assign(out, { [k]: v })
  }
  return out
}

/** Lo tocado sin guardar: el plan y los días. */
export interface Unsaved {
  readonly cambios: Partial<PlanDraft>
  readonly edits: DayEdits
}

/**
 * LO QUE QUEDA AL ACABAR UN GUARDADO: lo que se tocó mientras se guardaba. Lo mandado se suelta entrada a
 * entrada (el modo, los bloques, cada día…), y lo tocado después se queda: soltarlo todo perdería lo nuevo, y
 * no soltar nada volvería a mandar lo ya guardado (un `startFresh` que reanclaría el plan otro día).
 */
export function afterSave(sent: Unsaved, now: Unsaved): Unsaved {
  const cambios: Cambios = {}
  for (const k of CLAVES) {
    const v = now.cambios[k]
    if (v !== undefined && v !== sent.cambios[k]) Object.assign(cambios, { [k]: v })
  }
  const edits = Object.fromEntries(
    Object.entries(now.edits).filter(([k, e]) => e !== sent.edits[Number(k)]),
  )
  return { cambios, edits }
}

/** El plan cambia (y hay que llamar a `PUT /plan`): el modo, un bloque, el énfasis, la intensidad o empezar de cero. */
export function planChanges(saved: PlanDraft, draft: PlanDraft): number {
  const bloques = draft.blocks.filter((b, i) => b !== (saved.blocks[i] ?? null)).length
  return (
    Number(draft.mode !== saved.mode) +
    bloques +
    Number(draft.focusAttr !== saved.focusAttr) +
    Number(intensidad(draft.intensity) !== intensidad(saved.intensity)) +
    Number(draft.startFresh)
  )
}

/** Los cambios sin guardar: los del plan y cada día tocado. */
export function changeCount(saved: PlanDraft, draft: PlanDraft, edits: DayEdits): number {
  return planChanges(saved, draft) + Object.keys(edits).length
}

/**
 * LO QUE CAMBIA AL GUARDAR (§10.9), sin el recuento, que pone la `ActionBar`: empezar de cero, con el día de
 * mañana; si no, la primera carrera cuya llegada cambia; si no, el modo, si es lo único que cambió (ni el plan
 * ni un día); y si no, que las llegadas no cambian. Compara la vista previa de la pantalla con la de lo
 * guardado; sin una de las dos (llegando, o en error), no dice nada de las llegadas.
 */
export function consequenceText(o: {
  readonly saved: PlanDraft
  readonly draft: PlanDraft
  readonly edits: DayEdits
  /** null mientras llega o si falló */
  readonly savedRaces: readonly PlanPreviewRace[] | null
  readonly draftRaces: readonly PlanPreviewRace[] | null
  readonly tomorrow: number
}): string {
  if (o.draft.startFresh) return `New plan from ${unDia(o.tomorrow)}`
  const conLlegadas = o.savedRaces !== null && o.draftRaces !== null
  if (o.savedRaces !== null && o.draftRaces !== null) {
    const antes = new Map(o.savedRaces.map((r) => [r.raceKey, r.arrival]))
    for (const r of o.draftRaces) {
      const era = antes.get(r.raceKey)
      if (r.arrival !== null && era !== undefined && era !== null && era !== r.arrival)
        return `${r.name}: ${ARRIVAL_WORD[r.arrival]} (was ${ARRIVAL_WORD[era]})`
    }
  }
  const soloElModo =
    o.draft.mode !== o.saved.mode &&
    planChanges(o.saved, { ...o.draft, mode: o.saved.mode }) === 0 &&
    Object.keys(o.edits).length === 0
  if (soloElModo) return `Mode: ${MODE_WORD[o.draft.mode]} (was ${MODE_WORD[o.saved.mode]})`
  return conLlegadas ? 'arrivals stay the same' : ''
}

// --- Las semanas y la tira -----------------------------------------------------------------------

export interface PlanWeek {
  /** de 0 a 3: la de `blocks[index]` */
  readonly index: number
  /** el primer y el último día de la semana del plan */
  readonly firstDay: number
  readonly lastDay: number
  /** los días de la semana que caen en el horizonte */
  readonly days: readonly number[]
}

export interface PlanCalendar {
  readonly startDay: number
  readonly weeks: readonly PlanWeek[]
  /** los días del horizonte que pasan del final del plan */
  readonly after: {
    readonly firstDay: number
    readonly lastDay: number
    readonly days: readonly number[]
  } | null
}

/**
 * LAS SEMANAS DEL PLAN VIVO (§10.6; D-35, O-10): contadas desde su `startDay`, las que entrena el tick, y no
 * desde mañana; sin plan vivo, o al empezar de cero, desde mañana. Solo las que tienen algún día en el
 * horizonte; lo que pasa del final del plan, aparte.
 */
export function planWeeks(o: {
  readonly tomorrow: number
  readonly horizonDays: number
  readonly startDay: number | null
}): PlanCalendar {
  const startDay = o.startDay ?? o.tomorrow
  const ultimo = o.tomorrow + o.horizonDays - 1
  const enHorizonte = (a: number, b: number) => {
    const days: number[] = []
    for (let d = Math.max(a, o.tomorrow); d <= Math.min(b, ultimo); d++) days.push(d)
    return days
  }
  const weeks: PlanWeek[] = []
  for (let index = 0; index < SEMANAS; index++) {
    const firstDay = startDay + index * DIAS_POR_SEMANA
    const lastDay = firstDay + DIAS_POR_SEMANA - 1
    const days = enHorizonte(firstDay, lastDay)
    if (days.length > 0) weeks.push({ index, firstDay, lastDay, days })
  }
  const after = enHorizonte(startDay + DIAS_DEL_PLAN, ultimo)
  const first = after[0]
  const last = after[after.length - 1]
  return {
    startDay,
    weeks,
    after:
      first === undefined || last === undefined
        ? null
        : { firstDay: first, lastDay: last, days: after },
  }
}

/** La semana del plan de un día; null si cae antes del plan o después de su final. */
export function weekOfDay(calendar: PlanCalendar, gameDay: number): PlanWeek | null {
  return calendar.weeks.find((w) => gameDay >= w.firstDay && gameDay <= w.lastDay) ?? null
}

/** Lo guardado, como lo decide la pantalla: sin plan vivo, las cuatro semanas para el entrenador. */
export function savedDraft(stored: {
  readonly mode: TrainingMode
  readonly plan: {
    readonly blocks: Blocks
    readonly focusAttr: Attribute | null
    readonly intensity: Intensity | null
  } | null
}): PlanDraft {
  return {
    mode: stored.mode,
    blocks: stored.plan?.blocks ?? [null, null, null, null],
    focusAttr: stored.plan?.focusAttr ?? null,
    intensity: stored.plan?.intensity ?? null,
    startFresh: false,
  }
}

/** `Week 1 · Days 51 to 57` */
export function weekTitle(w: PlanWeek): string {
  return `Week ${w.index + 1} · ${dayRange(w.firstDay, w.lastDay)}`
}

/** El nombre de la tira de una semana, para el lector: `Week 1, days 51 to 57`. */
export function weekStripLabel(w: PlanWeek): string {
  return `Week ${w.index + 1}, ${dayRange(w.firstDay, w.lastDay).toLowerCase()}`
}

/** El de la tira de después del plan: `After your plan, days 74 to 78`. */
export function afterStripLabel(after: NonNullable<PlanCalendar['after']>): string {
  return `After your plan, ${dayRange(after.firstDay, after.lastDay).toLowerCase()}`
}

/** `After your plan · Days 74 to 78 · Coach` (`· Rest` en `I decide`). */
export function afterTitle(after: NonNullable<PlanCalendar['after']>, mode: TrainingMode): string {
  return `After your plan · ${dayRange(after.firstDay, after.lastDay)} · ${mode === 'manual' ? 'Rest' : 'Coach'}`
}

/** Un día con carga, de entrenamiento: el que cuenta el resumen de la tira. */
const conCarga = (d: Pick<PlanPreviewDay, 'kind' | 'load'>) => d.kind === 'train' && d.load > 0

/** El resumen de la tira: `3 training days`, o `No training: racing and travel`. */
export function stripSummary(days: readonly Pick<PlanPreviewDay, 'kind' | 'load'>[]): string {
  const n = days.filter(conCarga).length
  if (n > 0) return plural(n, 'training day')
  return days.every((d) => d.kind !== 'train') ? 'No training: racing and travel' : 'No training'
}

export type StripCell =
  | { readonly kind: 'race'; readonly word: 'Race'; readonly label: string }
  | { readonly kind: 'travel'; readonly word: 'Out' | 'Back'; readonly label: string }
  | { readonly kind: 'train'; readonly load: LoadLevel; readonly label: string }

/** Una celda de la tira: la carrera, el viaje con su sentido o la carga, y lo que dice al lector. */
export function stripCell(
  d: PlanPreviewDay,
  direction: ReadonlyMap<number, 'out' | 'back'>,
): StripCell {
  const n = unDia(d.gameDay)
  if (d.kind === 'race') return { kind: 'race', word: 'Race', label: `${n}: race` }
  if (d.kind === 'travel') {
    const back = direction.get(d.gameDay) === 'back'
    return {
      kind: 'travel',
      word: back ? 'Back' : 'Out',
      label: `${n}: travel ${back ? 'back' : 'out'}`,
    }
  }
  const load = d.load as LoadLevel
  const palabra = LOAD_WORD[load].toLowerCase()
  return { kind: 'train', load, label: `${n}: ${load === 0 ? 'rest' : `${palabra} training`}` }
}

/** La carga del mes: la palabra del redondeo de la media de los 28 días, los de carrera también (10-c). */
export function monthLoad(days: readonly Pick<PlanPreviewDay, 'load'>[]): LoadLevel | null {
  if (days.length === 0) return null
  const media = days.reduce((s, d) => s + d.load, 0) / days.length
  return Math.min(4, Math.max(0, Math.round(media))) as LoadLevel
}

// --- La línea de estado, la regla y el origen de cada día -----------------------------------------

/**
 * EL PLAN VIVO, SI TIENE ALGÚN BLOQUE: uno con las cuatro semanas para el entrenador no es un plan (§10.1), y
 * lo deja guardado cambiar solo el modo sin plan (`PUT /plan` lleva el plan entero). La pantalla cuenta sus
 * semanas desde mañana y lo guarda desde mañana, como si no hubiera.
 */
export function livePlan<P extends { readonly blocks: Blocks }>(plan: P | null): P | null {
  return plan !== null && plan.blocks.some((b) => b !== null) ? plan : null
}

/** La línea de estado del `PageHeader` (I-32): el modo y hasta cuándo dura el plan, lo guardado. */
export function statusLine(o: {
  readonly mode: TrainingMode
  readonly plan: { readonly startDay: number; readonly blocks: Blocks } | null
}): string {
  if (o.mode === 'entrenador') return 'Coach decides · your coach picks every day'
  if (livePlan(o.plan) !== null && o.plan !== null)
    return `${MODE_WORD[o.mode]} · your plan runs ${unDia(o.plan.startDay)} to ${unDia(o.plan.startDay + DIAS_DEL_PLAN - 1)}`
  return o.mode === 'manual'
    ? 'I decide · no plan: days you leave empty are rest'
    : 'Mixed · no plan: your coach decides'
}

/** LA REGLA DE UN DÍA (§10.5), según el modo: quién gana, en orden, y lo que añade el modo. */
export interface RuleLine {
  readonly steps: readonly string[]
  readonly note: string | null
}
export const RULE_INTRO = 'On a day, what wins:'

export function ruleLine(mode: TrainingMode): RuleLine {
  if (mode === 'entrenador')
    return { steps: ['race', 'travel', 'coach'], note: 'Your blocks and edits are not used.' }
  if (mode === 'manual')
    return {
      steps: ['race', 'travel', 'your edit', 'block'],
      note: 'Days you leave empty are rest.',
    }
  return { steps: ['race', 'travel', 'your edit', 'block', 'team plan', 'coach'], note: null }
}

/** La regla para el lector: la pantalla separa los pasos con `chevron-right`, que no se lee (§3.7). */
export function ruleSpoken(rule: RuleLine): string {
  return `${RULE_INTRO} ${rule.steps.join(', then ')}.${rule.note === null ? '' : ` ${rule.note}`}`
}

/** La explicación corta de la regla (§10.10), hasta que E6 decida dónde vive la larga. */
export const RULE_INFO =
  "Race and travel days can't be trained. In Mixed, a day you edit beats your block; a week you leave to the coach follows your team plan, if your team has one, and then your coach. In I decide, days you leave empty are rest. In Coach decides, your coach picks every day."

/** A dónde vuelve un día sin su orden, en `Mixed` o en `I decide` (el plan de equipo solo cuenta en `Mixed`). */
export function backTarget(o: {
  readonly mode: TrainingMode
  readonly weekBlock: CoachBlock | null
  readonly teamPlanDay: boolean
}): BackTarget {
  if (o.weekBlock !== null) return 'bloque'
  if (o.mode === 'mixto' && o.teamPlanDay) return 'equipo'
  return o.mode === 'manual' ? 'descanso' : 'entrenador'
}

/** `Back to Build`, `Back to team plan`, `Back to coach` o `Back to rest` (10-a). */
export function backToLabel(o: Parameters<typeof backTarget>[0]): string {
  const t = backTarget(o)
  if (t === 'bloque' && o.weekBlock !== null) return `Back to ${BLOCK_WORD[o.weekBlock]}`
  if (t === 'equipo') return 'Back to team plan'
  return t === 'descanso' ? 'Back to rest' : 'Back to coach'
}

/** El origen de un día (§10.5; D-13): su chapa, su tono y su borde izquierdo de 4 px. */
export function dayChip(d: Pick<OrdersDay, 'source' | 'block'>): {
  readonly text: string
  readonly tone: Tone
  readonly border: string
} {
  switch (d.source) {
    case 'carrera':
      return { text: 'Race', tone: 'neutral', border: 'border-warn' }
    case 'viaje':
      return { text: 'Travel', tone: 'info', border: 'border-accent' }
    case 'orden':
      return { text: 'Your edit', tone: 'accent', border: 'border-own' }
    case 'bloque':
      return {
        text: d.block === null ? 'Block' : `${BLOCK_WORD[d.block.code]} · week ${d.block.week}`,
        tone: 'neutral',
        border: 'border-line-strong',
      }
    case 'equipo':
      return { text: 'Team plan', tone: 'neutral', border: 'border-ink-3' }
    case 'descanso':
      return { text: 'Rest (I decide)', tone: 'neutral', border: 'border-line' }
    default:
      return { text: 'Coach decides on the day', tone: 'neutral', border: 'border-line' }
  }
}

// --- Las tarjetas de llegada ----------------------------------------------------------------------

/** Lo que va tras el nombre: la clase y si es de un día o de etapas, `.1 · 5 stages`. */
export function raceMeta(race: PlanPreviewRace): string {
  const clase = raceClassLabel(race.raceClass as RaceClass)
  return `${clase} · ${race.stageCount === 1 ? 'one day' : plural(race.stageCount, 'stage')}`
}

/** Los días de un viaje: `Day 51` o `Days 54 to 55`. */
const diasDeViaje = (days: readonly number[]) =>
  tramos(days)
    .map(([a, b]) => dayRange(a, b))
    .join(', ')

/**
 * CUÁNDO, Y EL VIAJE (el renglón 2 de la tarjeta, §10.3): `Day 52` o `Days 56 to 60` en día de la
 * temporada, `in N days` solo a siete o menos, y `travel Day 51 and Day 53` con la ida y la vuelta. En
 * curso, la vuelta a casa: la etapa que toca la dice la escala.
 */
export function raceWhen(race: PlanPreviewRace, today: number): string {
  const partes = [dayRange(race.startDay, race.endDay)]
  const faltan = race.startDay - today
  if (!race.ongoing && faltan > 0 && faltan <= CUANTO_FALTA_DIAS)
    partes.push(`in ${plural(faltan, 'day')}`)
  const ida = race.travelOut.length > 0 ? diasDeViaje(race.travelOut) : null
  const vuelta = race.travelBack.length > 0 ? diasDeViaje(race.travelBack) : null
  if (ida !== null && vuelta !== null) partes.push(`travel ${ida} and ${vuelta}`)
  else if (ida !== null) partes.push(`travel ${ida}`)
  else if (vuelta !== null) partes.push(`back home ${vuelta}`)
  return partes.join(' · ')
}

/** Los días de carrera de una carrera en el horizonte, en orden. */
const diasDeCarrera = (race: PlanPreviewRace, days: readonly OrdersDay[]) =>
  days
    .filter((d) => d.source === 'carrera' && d.raceKey === race.raceKey)
    .map((d) => d.gameDay)
    .sort((a, b) => a - b)

/**
 * La etapa de un día de carrera: la primera del horizonte es la 1, o, en una carrera en curso, la que toca
 * contando hacia atrás desde la última, que siempre cae en el horizonte (ninguna dura 28 días).
 */
export function stageOfRaceDay(
  race: PlanPreviewRace,
  days: readonly OrdersDay[],
  gameDay: number,
): number {
  const suyos = diasDeCarrera(race, days)
  const i = suyos.indexOf(gameDay)
  const n = race.ongoing ? race.stageCount - suyos.length + i + 1 : i + 1
  return Math.min(race.stageCount, Math.max(1, n))
}

/**
 * Las carreras de las tarjetas: las de `races[]`, sin la que está en curso y ya no tiene días de carrera en el
 * horizonte, la que acaba hoy o de la que se retiró hoy: no queda nada que pronosticar ni que correr.
 */
export function arrivalRaces(
  races: readonly PlanPreviewRace[],
  days: readonly OrdersDay[],
): PlanPreviewRace[] {
  return races.filter((r) => !r.ongoing || diasDeCarrera(r, days).length > 0)
}

/** En curso: la etapa que toca mañana, de cuántas (`Racing now · stage 3 of 5`). */
export function racingNow(
  race: PlanPreviewRace,
  days: readonly OrdersDay[],
): { readonly stage: number; readonly stages: number } {
  const primero = diasDeCarrera(race, days)[0]
  return {
    stage: primero === undefined ? race.stageCount : stageOfRaceDay(race, days, primero),
    stages: race.stageCount,
  }
}

/** La instrucción fija de cada tramo (§10.4; O-32), que empieza por la causa, como los ejes de la escala. */
export const ARRIVAL_ADVICE: Readonly<Record<ArrivalLabel, string>> = {
  fundido:
    "Far too much training: you'll start exhausted. Make the week before it a Taper or a Recovery week.",
  cargado:
    "Too much training: you'll start tired. A lighter week before it brings you to Fine or Spot on.",
  bien: 'A little tired: ready to race, not at your best. A Taper week before it can make it Spot on.',
  perfecto: 'The best way to arrive: trained and rested. Keep the plan.',
  oxidado:
    "Too little training: you'll arrive rested but out of form. Put a Build week two or three weeks before it.",
}

// --- El viaje -------------------------------------------------------------------------------------

export interface TripPlanLeg {
  readonly key: string
  /** `Day 55`, `Days 56 to 60` */
  readonly days: string
  readonly what: 'Out' | 'Race' | 'Rest' | 'Back'
  /** el día de descanso que se edita dentro del viaje; null en los demás tramos */
  readonly gameDay: number | null
}

export interface TripPlan {
  readonly raceKey: string
  /** `Race Sardegna (IT)` */
  readonly race: string
  /** `Days 55 to 61 · 7 days off training` */
  readonly meta: string
  readonly firstDay: number
  readonly legs: readonly TripPlanLeg[]
  /**
   * en curso: la carrera ya empezó. Un viaje cuya ida fue hoy no lo dice: el horizonte empieza mañana, y una
   * ida que no está en él puede ser de hoy o caer en el último día de otra carrera, que le gana.
   */
  readonly active: boolean
  /** los días que pinta el viaje, que el día a día no repite */
  readonly covers: ReadonlySet<number>
}

/**
 * IDA, CARRERA Y VUELTA SON UN VIAJE (§11.6; I-34, D-43): uno por carrera con algún día de viaje en el
 * horizonte, con sus tramos en orden y los días de descanso de una vuelta dentro, que se editan. La ida a una
 * carrera que sale después del horizonte también es un viaje; una carrera en casa, sin viaje, no.
 */
export function tripsOf(o: {
  readonly races: readonly PlanPreviewRace[]
  readonly days: readonly OrdersDay[]
  readonly travelDays: readonly TravelDay[]
}): TripPlan[] {
  const claves = [...new Set(o.travelDays.map((t) => t.raceKey))]
  const enHorizonte = new Set(o.days.map((d) => d.gameDay))
  const trips: TripPlan[] = []
  for (const raceKey of claves) {
    const viajes = o.travelDays.filter((t) => t.raceKey === raceKey && enHorizonte.has(t.gameDay))
    const primero = viajes[0]
    if (primero === undefined) continue
    const race = o.races.find((r) => r.raceKey === raceKey)
    const ida = viajes.filter((t) => t.direction === 'out').map((t) => t.gameDay)
    const vuelta = viajes.filter((t) => t.direction === 'back').map((t) => t.gameDay)
    const carrera = race === undefined ? [] : diasDeCarrera(race, o.days)

    const legs: TripPlanLeg[] = []
    const tramo = (a: number, b: number, what: TripPlanLeg['what'], gameDay: number | null) =>
      legs.push({ key: `${what}-${a}`, days: dayRange(a, b), what, gameDay })
    for (const [a, b] of tramos(ida)) tramo(a, b, 'Out', null)
    const desde = carrera[0]
    const hasta = carrera[carrera.length - 1]
    const descansos: number[] = []
    if (desde !== undefined && hasta !== undefined) {
      const corre = new Set(carrera)
      let inicio: number | null = null
      for (let d = desde; d <= hasta + 1; d++) {
        if (corre.has(d)) {
          inicio ??= d
          continue
        }
        if (inicio !== null) tramo(inicio, d - 1, 'Race', null)
        inicio = null
        if (d <= hasta) {
          descansos.push(d)
          tramo(d, d, 'Rest', d)
        }
      }
    }
    for (const [a, b] of tramos(vuelta)) tramo(a, b, 'Back', null)

    const todos = [...ida, ...carrera, ...descansos, ...vuelta].sort((a, b) => a - b)
    const first = todos[0] ?? primero.gameDay
    const last = todos[todos.length - 1] ?? primero.gameDay
    const sinEntrenar = ida.length + carrera.length + vuelta.length
    const country = race?.country ?? primero.country
    const name = race?.name ?? primero.raceName
    trips.push({
      raceKey,
      race: country === null ? name : `${name} (${country.toUpperCase()})`,
      meta: `${dayRange(first, last)} · ${plural(sinEntrenar, 'day')} off training`,
      firstDay: first,
      legs,
      active: race?.ongoing === true,
      covers: new Set(todos),
    })
  }
  return trips.sort((a, b) => a.firstDay - b.firstDay)
}
