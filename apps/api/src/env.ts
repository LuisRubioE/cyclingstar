import { z } from 'zod'

/**
 * Validación Zod de las variables de entorno en el borde de arranque (CLAUDE.md).
 * PORT lo inyecta Railway; DATABASE_URL es obligatoria desde el Paso 6.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
})

export type Env = z.infer<typeof envSchema>

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
      .join('; ')
    throw new Error(`Variables de entorno inválidas: ${issues}`)
  }
  return parsed.data
}
