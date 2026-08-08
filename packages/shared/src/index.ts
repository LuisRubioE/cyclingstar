import { z } from 'zod'

/**
 * Contrato de tipos y validación compartido entre api y web (única fuente de verdad).
 * El cliente de la web valida contra este esquema; la API tipa su respuesta con él.
 */

export * from './contracts.js'
export * from './countries.js'
export * from './regions.js'
export * from './rider.js'
export * from './raceKey.js'
export * from './rng.js'
export * from './time.js'
export * from './training.js'
export * from './travel.js'

/** Respuesta de GET /health (SPEC 12, Pasos 7-12). */
export const healthSchema = z.object({
  ok: z.boolean(),
  engineVersion: z.number().int(),
  gameDay: z.number().int().nullable(),
  migrationsApplied: z.boolean(),
  tickIntervalMinutes: z.number().int().positive(),
  /** Momento real (epoch ms) del próximo avance del mundo, anclado a la creación del mundo. */
  nextTickAtMs: z.number().nullable().optional(),
})

export type Health = z.infer<typeof healthSchema>
