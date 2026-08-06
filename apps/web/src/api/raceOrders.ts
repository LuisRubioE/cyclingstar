import {
  type Effort,
  type Mentality,
  type RaceOrders,
  type RaceStage,
  type RosterRider,
  type StageOrder,
  type StageRole,
  type TestTour,
  raceOrdersResponseSchema,
  savedResponseSchema,
  testTourResponseSchema,
} from '@cyclingstar/shared'
import { request } from './request'

export type {
  Effort,
  Mentality,
  RaceOrders,
  RaceStage,
  RosterRider,
  StageOrder,
  StageRole,
  TestTour,
}

export async function fetchTestTour(): Promise<TestTour> {
  return request('/api/races/test-tour', testTourResponseSchema, {
    errorMessage: 'Could not load the race.',
  })
}

export async function saveStageOrders(orders: StageOrder[]): Promise<void> {
  await request('/api/races/test-tour/orders', savedResponseSchema, {
    method: 'PUT',
    json: { orders },
    errorMessage: 'Could not save your orders.',
  })
}

/** Órdenes del corredor para una carrera real a la que está convocado. */
export async function fetchRaceOrders(raceKey: string): Promise<RaceOrders> {
  return request(
    `/api/my-orders?raceKey=${encodeURIComponent(raceKey)}`,
    raceOrdersResponseSchema,
    { errorMessage: 'Could not load the race.' },
  )
}

export async function saveRaceOrders(raceKey: string, orders: StageOrder[]): Promise<void> {
  await request('/api/my-orders', savedResponseSchema, {
    method: 'PUT',
    json: { raceKey, orders },
    errorMessage: 'Could not save your orders.',
  })
}
