import {
  type Contract,
  type Market,
  type Offer,
  marketResponseSchema,
  okResponseSchema,
} from '@cyclingstar/shared'
import { request } from './request'

export type { Contract, Market, Offer }

export async function fetchMarket(): Promise<Market> {
  return request('/api/riders/me/offers', marketResponseSchema, {
    errorMessage: 'Could not load the market.',
  })
}

export async function respondToOffer(id: string, action: 'accept' | 'reject'): Promise<void> {
  await request(`/api/riders/me/offers/${id}/${action}`, okResponseSchema, {
    method: 'POST',
    errorMessage: 'Could not respond to the offer.',
  })
}
