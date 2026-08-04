import type { Intensity, Session } from '@cyclingstar/shared'

export interface TrainingOrder {
  gameDay: number
  session: Session
  intensity: Intensity
}

export interface OrdersResponse {
  currentDay: number
  horizonDays: number
  orders: TrainingOrder[]
  /** Absolute game days within the horizon on which the rider has a race (#6). */
  raceDays: number[]
}

export async function fetchOrders(): Promise<OrdersResponse> {
  const res = await fetch('/api/riders/me/orders')
  if (!res.ok) throw new Error('Could not load your training orders.')
  return (await res.json()) as OrdersResponse
}

export async function saveOrders(orders: TrainingOrder[]): Promise<void> {
  const res = await fetch('/api/riders/me/orders', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orders }),
  })
  if (!res.ok) throw new Error('Could not save your training orders.')
}

export interface TeamTraining {
  /** Sesión sugerida por el equipo para cada día (para entrenar juntos). */
  plan: TrainingOrder[]
  /** El usuario es el mánager (dueño) y puede fijar el plan del equipo. */
  canEdit: boolean
  teamName: string | null
}

export async function fetchTeamTraining(): Promise<TeamTraining> {
  const res = await fetch('/api/me/team-training')
  if (res.status === 401) return { plan: [], canEdit: false, teamName: null }
  if (!res.ok) throw new Error('Could not load the team training plan.')
  return (await res.json()) as TeamTraining
}

/** El mánager publica el plan sugerido del equipo (una sesión por día). */
export async function saveTeamTraining(orders: TrainingOrder[]): Promise<void> {
  const res = await fetch('/api/me/team-training', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orders }),
  })
  if (!res.ok) throw new Error('Could not save the team training plan.')
}
