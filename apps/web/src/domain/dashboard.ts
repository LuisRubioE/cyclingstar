/**
 * Qué hago hoy: convierte el estado del corredor en una lista de cosas ACCIONABLES ordenadas por
 * urgencia (navegación §4). Es una función pura para poder probarla sin montar la página: el
 * panel solo pinta lo que salga de aquí, y si no sale nada, no pinta ningún bloque.
 */

export type ActionTone = 'urgent' | 'warn' | 'info'

export interface DashboardAction {
  id: string
  /** Titular del aviso, en segunda persona. */
  title: string
  /** Una línea de contexto, opcional. */
  detail: string | null
  to: string
  cta: string
  /**
   * Días de juego que quedan hasta que el aviso caduca. 0 = caduca con el próximo tick, y por eso
   * va primero. `null` = no tiene fecha límite dura (va al final).
   */
  dueInDays: number | null
  tone: ActionTone
}

export interface DashboardInputs {
  /** Próxima carrera (o en curso) del corredor, si la hay. */
  nextRace: {
    raceKey: string
    raceName: string
    daysUntil: number
    ongoing: boolean
    /** Si ya ha dejado órdenes para alguna etapa de esa carrera. */
    hasOrders: boolean
  } | null
  /** Días de entrenamiento ya planificados por delante (0 = a partir de mañana decide el míster). */
  trainingPlannedDays: number
  /** Ofertas de contrato pendientes de respuesta. */
  offers: number
  /** Agente libre: puede inscribirse él mismo a carreras. */
  freeAgent: boolean
  /** Carreras abiertas a inscripción que además puede pagar. */
  affordableEntries: number
  /** Carreras ya cerradas en su programa (convocatorias + inscripciones pendientes). */
  bookedRaces: number
}

/** Umbral a partir del cual avisamos de que la cola de entrenamiento se acaba. */
const TRAINING_WARN_DAYS = 2

/**
 * Lista de avisos accionables, de lo que caduca antes a lo que no caduca. Lo que no requiere una
 * decisión del jugador NO entra: sin órdenes pendientes ni ofertas, esta lista está vacía.
 */
export function buildDashboard(input: DashboardInputs): DashboardAction[] {
  const actions: DashboardAction[] = []

  if (input.nextRace && !input.nextRace.hasOrders) {
    const { raceName, daysUntil, ongoing, raceKey } = input.nextRace
    const due = Math.max(0, daysUntil)
    actions.push({
      id: 'race-orders',
      title: ongoing
        ? `You are racing the ${raceName} right now`
        : due === 0
          ? `You race today: ${raceName}`
          : due === 1
            ? `You race tomorrow: ${raceName}`
            : `You race the ${raceName} in ${due} days`,
      detail: 'You have no orders set — your coach will ride it for you.',
      to: `/me/orders?race=${encodeURIComponent(raceKey)}`,
      cta: 'Set orders',
      dueInDays: ongoing ? 0 : due,
      tone: due <= 1 || ongoing ? 'urgent' : 'warn',
    })
  }

  if (input.trainingPlannedDays <= TRAINING_WARN_DAYS) {
    actions.push({
      id: 'training',
      title:
        input.trainingPlannedDays <= 0
          ? 'Your training queue is empty'
          : `Your training queue runs out in ${input.trainingPlannedDays} ${
              input.trainingPlannedDays === 1 ? 'day' : 'days'
            }`,
      detail: 'Until you plan it, your coach picks the sessions.',
      to: '/me/training',
      cta: 'Plan the week',
      dueInDays: Math.max(0, input.trainingPlannedDays),
      tone: input.trainingPlannedDays <= 0 ? 'warn' : 'info',
    })
  }

  if (input.offers > 0) {
    actions.push({
      id: 'offers',
      title: `${input.offers} contract ${input.offers === 1 ? 'offer' : 'offers'} waiting`,
      detail: 'Answer them before the teams fill the squad.',
      to: '/me/contract',
      cta: 'Review',
      dueInDays: null,
      tone: 'info',
    })
  }

  if (input.freeAgent && input.bookedRaces === 0 && input.affordableEntries > 0) {
    actions.push({
      id: 'entries',
      title: 'You have no races booked',
      detail: `${input.affordableEntries} ${
        input.affordableEntries === 1 ? 'race is' : 'races are'
      } still open to you, travel included.`,
      to: '/me/races',
      cta: 'Enter a race',
      dueInDays: null,
      tone: 'info',
    })
  }

  // Orden estable por urgencia: primero lo que caduca antes; lo que no caduca, al final.
  return actions
    .map((action, index) => ({ action, index }))
    .sort((a, b) => {
      const da = a.action.dueInDays ?? Number.POSITIVE_INFINITY
      const db = b.action.dueInDays ?? Number.POSITIVE_INFINITY
      return da === db ? a.index - b.index : da - db
    })
    .map((entry) => entry.action)
}
