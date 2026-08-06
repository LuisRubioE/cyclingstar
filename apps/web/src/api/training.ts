import {
  type OrdersResponse,
  type TeamTraining,
  type TrainingOrder,
  ordersResponseSchema,
  savedResponseSchema,
  teamTrainingResponseSchema,
} from '@cyclingstar/shared'
import { request, requestOptionalAuth } from './request'

export type { OrdersResponse, TeamTraining, TrainingOrder }

export async function fetchOrders(): Promise<OrdersResponse> {
  return request('/api/riders/me/orders', ordersResponseSchema, {
    errorMessage: 'Could not load your training orders.',
  })
}

export async function saveOrders(orders: TrainingOrder[]): Promise<void> {
  await request('/api/riders/me/orders', savedResponseSchema, {
    method: 'PUT',
    json: { orders },
    errorMessage: 'Could not save your training orders.',
  })
}

/** Plan sugerido por el equipo. Sin sesión (401) no hay plan que enseñar. */
export async function fetchTeamTraining(): Promise<TeamTraining> {
  const data = await requestOptionalAuth('/api/me/team-training', teamTrainingResponseSchema, {
    errorMessage: 'Could not load the team training plan.',
  })
  return data ?? { plan: [], canEdit: false, teamName: null }
}

/** El mánager publica el plan sugerido del equipo (una sesión por día). */
export async function saveTeamTraining(orders: TrainingOrder[]): Promise<void> {
  await request('/api/me/team-training', savedResponseSchema, {
    method: 'PUT',
    json: { orders },
    errorMessage: 'Could not save the team training plan.',
  })
}
