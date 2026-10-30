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
  return {
    raceKey,
    orders: { ...base, [stageDay]: { ...current, ...mentalidadDelRol(current, patch) } },
  }
}

/**
 * EL CAZAETAPAS NO SALE RESERVÓN (dueño, 02/10/2026). Desde el motor v91 un cazaetapas `reservon`
 * se guarda de verdad: casi no inicia ni sigue movimientos. Y `reservon` es la mentalidad por defecto
 * de la consola, así que quien elegía «cazaetapas» y no tocaba nada se encontraba con un cazador que
 * espera. Al elegir el rol se le propone `combativo`, solo si la mentalidad seguía en la de defecto:
 * si el jugador ya había escogido otra se respeta, y después puede volver a cambiarla a mano.
 */
function mentalidadDelRol(current: StageOrder, patch: Partial<StageOrder>): Partial<StageOrder> {
  if (
    patch.role === 'cazaetapas' &&
    current.role !== 'cazaetapas' &&
    patch.mentality === undefined &&
    current.mentality === 'reservon'
  ) {
    return { ...patch, mentality: 'combativo' }
  }
  return patch
}

/** Un valor con sus claves en orden, para comparar dos disparos sin mirar en qué orden se escribieron. */
function estable(v: unknown): unknown {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return v
  return Object.fromEntries(
    Object.entries(v)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, x]) => [k, estable(x)]),
  )
}

/**
 * Una orden en la forma que se compara: las cuatro palancas del 17a sin preferencia valen lo mismo sin
 * llegar, a null o, los equipos, vacías («no hay preferencia», `contracts.ts`), y los equipos, sin su orden.
 */
function forma(o: StageOrder): string {
  return JSON.stringify({
    role: o.role,
    targetRiderId: o.targetRiderId,
    mentality: o.mentality,
    effort: o.effort,
    triggerKm: o.triggerKm,
    contestSprints: o.contestSprints,
    contestClimbs: o.contestClimbs,
    triggerOn: estable(o.triggerOn ?? null),
    chasePolicy: o.chasePolicy ?? null,
    refuseRelayTeams: [...(o.refuseRelayTeams ?? [])].sort(),
    dayGoal: o.dayGoal ?? null,
  })
}

/**
 * LO QUE CAMBIA AL GUARDAR (E3, docs/visual.md §4.3 y §4.9; PR 21i): los días de las etapas cuya orden en
 * pantalla no es la guardada, que cuenta la barra de guardar. Tocar y volver a lo guardado no es un cambio.
 */
export function changedStages(serverOrders: OrdersByDay, orders: OrdersByDay): number[] {
  return Object.keys(orders)
    .map(Number)
    .filter((day) => {
      const visto = orders[day]
      const guardado = serverOrders[day] ?? defaultOrder(day)
      return visto !== undefined && forma(visto) !== forma(guardado)
    })
    .sort((a, b) => a - b)
}

/**
 * LA CARRERA QUE SE ABRE (E3, PR 21i): la del enlace (`?race=`), si está entre las mías; si no, la más próxima
 * que aún no ha empezado; y si todas han empezado, la primera. La pantalla la calcula al pintar, y no en un
 * efecto, así que la hoja de la carrera se pide desde el primer pintado.
 */
export function defaultRaceKey(
  races: readonly { readonly raceKey: string; readonly ongoing: boolean }[],
  requested: string | null,
): string | null {
  const fromLink = requested === null ? undefined : races.find((r) => r.raceKey === requested)
  return (fromLink ?? races.find((r) => !r.ongoing) ?? races[0])?.raceKey ?? null
}
