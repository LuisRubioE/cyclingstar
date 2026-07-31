import { type Health, healthSchema } from '@cyclingstar/shared'

/** Valida una respuesta cruda de /health contra el contrato compartido. */
export function parseHealth(data: unknown): Health {
  return healthSchema.parse(data)
}

/** Cliente tipado de GET /health (mismo origen que la SPA en Railway). */
export async function fetchHealth(): Promise<Health> {
  const res = await fetch('/health')
  if (!res.ok) {
    throw new Error(`/health respondió ${res.status}`)
  }
  return parseHealth(await res.json())
}
