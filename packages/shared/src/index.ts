import { z } from 'zod'
import { switchModeSchema } from './contracts.js'

/**
 * Contrato de tipos y validación compartido entre api y web (única fuente de verdad).
 * El cliente de la web valida contra este esquema; la API tipa su respuesta con él.
 */

export * from './contracts.js'
// La retransmisión (E2), detrás de contracts.js: desde el 3a importa en ejecución esquemas de
// contracts.js (`wire.ts`), que tiene que estar ya cargado (14-a).
export * from './broadcast/index.js'
export * from './countries.js'
export * from './jerseys.js'
export * from './news.js'
export * from './regions.js'
export * from './rider.js'
export * from './raceKey.js'
export * from './render/variants.js'
export * from './rng.js'
export * from './stageRoute.js'
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
  /**
   * LOS INTERRUPTORES DE E2 (docs/retransmision.md §14.6, 14-l): cómo están `BROADCAST_WATCH` y
   * `SPOILER_MODE`. No dicen nada de nadie. Opcional: solo sale cuando `buildApp` recibe los
   * interruptores (en producción, siempre), y la web de ayer lo descarta (strip).
   */
  features: z
    .object({ broadcastWatch: switchModeSchema, spoilerMode: switchModeSchema })
    .optional(),
})

export type Health = z.infer<typeof healthSchema>
