import type { StageOrder } from '../api/raceOrders'
import type { ActionBarStatus } from '../components/ui/ActionBar'
import type { TriggerKindUi } from './labels'
import { type OrdersByDay, type OrdersDraft, defaultRaceKey } from './raceOrdersDraft'

/**
 * LO QUE HACEN LOS CONTROLES DE LA PANTALLA DE ÓRDENES (E3, PR 21i, tras su revisión), fuera de la página para
 * probarlo sin pulsar (sus tests pintan en estático): lo que escribe cada forma del disparo, a qué etapas va una
 * copia y qué copia, los equipos con los que no se tira, qué borrador se suelta al guardar, qué dice la barra
 * de guardar y qué carrera se ve. Lo que pesa cada orden no se toca (H-08).
 */

/**
 * Lo que escribe cada forma del disparo. Con el kilómetro se escriben LAS DOS COSAS, `triggerOn` y el
 * `triggerKm` de siempre, que el motor leía antes del 17b; con las demás, el `triggerKm` a null.
 */
export function triggerPatch(kind: TriggerKindUi): Partial<StageOrder> {
  if (kind === 'ninguno') return { triggerOn: null, triggerKm: null }
  if (kind === 'km') return { triggerOn: { at: 'km', km: 0 }, triggerKm: 0 }
  if (kind === 'climb')
    return { triggerOn: { at: 'climb', which: 'last', part: 'pie' }, triggerKm: null }
  if (kind === 'gap') return { triggerOn: { at: 'gap', overS: 120 }, triggerKm: null }
  if (kind === 'weather') return { triggerOn: { at: 'weather', cond: 'lluvia' }, triggerKm: null }
  return { triggerOn: { at: 'sector', index: 1 }, triggerKm: null }
}

/** El kilómetro escrito, en los dos sitios; vacío, el 0. */
export function kmPatch(value: string): Partial<StageOrder> {
  const km = value === '' ? 0 : Number(value)
  return { triggerOn: { at: 'km', km }, triggerKm: km }
}

/**
 * A qué etapas va la copia de una (v58): a las del MISMO TIPO, o a todo lo que queda de carrera; nunca a ella
 * misma ni a la crono, donde no hay táctica de grupo que copiar.
 */
export function copyTargets(
  stages: readonly { readonly day: number; readonly kind: string; readonly timeTrial: boolean }[],
  fromDay: number,
  alcance: 'iguales' | 'siguientes',
): number[] {
  const origen = stages.find((st) => st.day === fromDay)
  if (origen === undefined) return []
  return stages
    .filter((st) => st.day !== fromDay && !st.timeTrial)
    .filter((st) => (alcance === 'iguales' ? st.kind === origen.kind : st.day > fromDay))
    .map((st) => st.day)
}

/**
 * Lo que copia: la orden, con su objetivo (si trabajas para tu jefe, trabajas para él todos los días) y el
 * disparo entero. Antes copiaba el `triggerKm` y no el `triggerOn`, y la etapa decía en pantalla una cita y el
 * motor leía otra (la revisión del 21i). Las cuatro palancas del 17a no viajan, como hasta hoy.
 */
export function copyPatch(origen: StageOrder): Partial<StageOrder> {
  return {
    role: origen.role,
    targetRiderId: origen.targetRiderId,
    mentality: origen.mentality,
    effort: origen.effort,
    triggerOn: origen.triggerOn ?? null,
    triggerKm: origen.triggerKm,
    contestSprints: origen.contestSprints,
    contestClimbs: origen.contestClimbs,
  }
}

/** Los equipos con los que no se tira, al marcar o desmarcar uno. */
export function teamsPatch(
  vetados: readonly string[],
  teamId: string,
  marcado: boolean,
): Partial<StageOrder> {
  return {
    refuseRelayTeams: marcado ? [...vetados, teamId] : vetados.filter((x) => x !== teamId),
  }
}

/** Lo que se manda al guardar: las órdenes de todas las etapas que se ven, también las no tocadas (H-08). */
export function ordersToSave(orders: OrdersByDay): StageOrder[] {
  return Object.values(orders).sort((a, b) => a.stageDay - b.stageDay)
}

/**
 * Lo que queda del borrador al guardar: se suelta el que se mandó, si es de la carrera guardada; lo tocado
 * mientras tanto se queda, y el borrador de otra carrera no se suelta nunca al guardar esta.
 */
export function releaseAfterSave(
  draft: OrdersDraft | null,
  enviado: OrdersDraft | null,
  raceKey: string,
): OrdersDraft | null {
  return draft === enviado && draft?.raceKey === raceKey ? null : draft
}

/** El guardado en marcha o el último, con la carrera de la que es. */
export interface OrdersSave {
  readonly raceKey: string | null
  readonly status: ActionBarStatus
}

/**
 * Lo que dice la barra (§4.9): el guardado de la carrera que se ve, y no el de otra, ni su `Saving` ni su fallo
 * con `Retry`; y guardado, si quedan cambios hechos mientras guardaba, la barra los cuenta y no se va.
 */
export function barStatus(
  save: OrdersSave,
  selectedKey: string | null,
  changes: number,
): ActionBarStatus {
  if (save.raceKey !== selectedKey) return 'idle'
  if (save.status === 'saved' && changes > 0) return 'idle'
  return save.status
}

/**
 * La carrera que se ve: la elegida; si no, la del borrador, para que lo tocado no se quede atrás si la de por
 * defecto cambia (una carrera que empieza, un día nuevo); y si no, la de por defecto (`defaultRaceKey`).
 */
export function selectedRaceKey(o: {
  readonly chosen: string | null
  readonly draftRace: string | null
  readonly races: readonly { readonly raceKey: string; readonly ongoing: boolean }[]
  readonly requested: string | null
}): string | null {
  return o.chosen ?? o.draftRace ?? defaultRaceKey(o.races, o.requested)
}
