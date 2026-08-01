import { z } from 'zod'

/**
 * Contrato de tipos y validación compartido entre api y web (única fuente de verdad).
 * El cliente de la web valida contra este esquema; la API tipa su respuesta con él.
 */

export * from './countries.js'
export * from './rider.js'
export * from './rng.js'
export * from './time.js'
export * from './training.js'

/** Respuesta de GET /health (SPEC 12, Pasos 7-12). */
export const healthSchema = z.object({
  ok: z.boolean(),
  engineVersion: z.number().int(),
  gameDay: z.number().int().nullable(),
  migrationsApplied: z.boolean(),
  tickIntervalMinutes: z.number().int().positive(),
})

export type Health = z.infer<typeof healthSchema>
