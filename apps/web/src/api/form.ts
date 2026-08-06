import {
  type FormPoint,
  type FormResponse,
  type HealthState,
  type RiderHealth,
  formResponseSchema,
} from '@cyclingstar/shared'
import { request } from './request'

export type { FormPoint, FormResponse, HealthState, RiderHealth }

export async function fetchForm(): Promise<FormResponse> {
  return request('/api/riders/me/form', formResponseSchema, {
    errorMessage: 'Could not load your form.',
  })
}
