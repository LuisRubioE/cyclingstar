import { type Health, healthSchema } from '@cyclingstar/shared'
import { request } from './request'

/** Valida una respuesta cruda de /health contra el contrato compartido. */
export function parseHealth(data: unknown): Health {
  return healthSchema.parse(data)
}

/** Cliente tipado de GET /health (mismo origen que la SPA en Railway). */
export async function fetchHealth(): Promise<Health> {
  return request('/health', healthSchema, { errorMessage: 'Could not load the world clock.' })
}
