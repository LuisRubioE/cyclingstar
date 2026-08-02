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
