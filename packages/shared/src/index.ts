import { z } from 'zod'

/**
 * Contrato de tipos y validación compartido entre api y web.
 * Paso 3: solo un esquema mínimo para dejar cableada la validación Zod en los bordes
 * (CLAUDE.md). El cliente de API tipado y los esquemas reales llegan en pasos posteriores.
 */
export const healthSchema = z.object({
  ok: z.boolean(),
})

export type Health = z.infer<typeof healthSchema>
