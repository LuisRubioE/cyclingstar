/**
 * Borrador de órdenes de etapa: las ediciones sin guardar de la consola de órdenes.
 *
 * Dos bugs reales que esto resuelve:
 *  1. Pérdida de datos: la página copiaba `query.data` a estado con un `useEffect`, así que un
 *     refetch en segundo plano pisaba las órdenes que el jugador estaba escribiendo.
 *  2. Guardado cruzado: el borrador no sabía de QUÉ carrera era, así que si cambiabas de carrera y
 *     pulsabas "Save all" antes de que el efecto repoblara el estado, se guardaban las órdenes de
 *     la carrera anterior contra la nueva raceKey.
 *
 * Por eso el borrador lleva SIEMPRE pegada su `raceKey`: si no coincide con la carrera
 * seleccionada, sencillamente no se aplica (ni se muestra ni se guarda).
 */

import type { RaceStage, StageOrder } from '../api/raceOrders'

/** Órdenes por día de etapa. */
export type OrdersByDay = Record<number, StageOrder>

/** Borrador atado a la carrera en la que se hizo. */
export interface OrdersDraft {
  raceKey: string
  orders: OrdersByDay
}

/** Órdenes por defecto de una etapa (rol libre, sin objetivo, esfuerzo normal). */
export function defaultOrder(stageDay: number): StageOrder {
  return {
    stageDay,
    role: 'libre',
    targetRiderId: null,
    mentality: 'reservon',
    effort: 'normal',
    triggerKm: null,
    contestSprints: false,
    contestClimbs: false,
  }
}

/** Órdenes tal como las tiene el servidor, con un valor por defecto para las etapas sin orden. */
export function buildServerOrders(
  stages: Pick<RaceStage, 'day'>[],
  orders: StageOrder[],
): OrdersByDay {
  const byDay: OrdersByDay = {}
  for (const stage of stages) {
    byDay[stage.day] = orders.find((o) => o.stageDay === stage.day) ?? defaultOrder(stage.day)
  }
  return byDay
}

/**
 * Órdenes que se ven (y que se guardarían): las del servidor, con el borrador encima SOLO si el
 * borrador es de esta misma carrera.
 */
export function resolveOrders(
  serverOrders: OrdersByDay,
  draft: OrdersDraft | null,
  raceKey: string | null,
): OrdersByDay {
  if (!raceKey || !draft || draft.raceKey !== raceKey) return serverOrders
  return { ...serverOrders, ...draft.orders }
}

/**
 * Aplica un cambio del jugador. Si el borrador era de otra carrera se descarta y se empieza uno
 * nuevo sobre las órdenes del servidor de la carrera actual.
 */
export function withOrderPatch(
  draft: OrdersDraft | null,
  raceKey: string,
  serverOrders: OrdersByDay,
  stageDay: number,
  patch: Partial<StageOrder>,
): OrdersDraft {
  const base = draft && draft.raceKey === raceKey ? draft.orders : {}
  const current = base[stageDay] ?? serverOrders[stageDay] ?? defaultOrder(stageDay)
  return { raceKey, orders: { ...base, [stageDay]: { ...current, ...patch } } }
}
