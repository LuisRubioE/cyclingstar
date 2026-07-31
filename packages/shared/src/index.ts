import { z } from 'zod'

/**
 * Contrato de tipos y validación compartido entre api y web (única fuente de verdad).
 * El cliente de la web valida contra este esquema; la API tipa su respuesta con él.
 */

/** Respuesta de GET /health (SPEC 12, Pasos 7-8). */
export const healthSchema = z.object({
  ok: z.boolean(),
  engineVersion: z.number().int(),
  gameDay: z.number().int().nullable(),
  migrationsApplied: z.boolean(),
})

export type Health = z.infer<typeof healthSchema>
