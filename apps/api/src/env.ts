import { z } from 'zod'

/**
 * Validación Zod de las variables de entorno en el borde de arranque (CLAUDE.md).
 * PORT lo inyecta Railway; DATABASE_URL es obligatoria desde el Paso 6.
 * APP_URL y SESSION_SECRET los usa better-auth (Paso 9).
 * ADMIN_TOKEN protege /admin/tick; TICK_INTERVAL_MINUTES parametriza el reloj (Paso 10).
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  APP_URL: z.string().url('APP_URL debe ser una URL válida'),
  // 32 caracteres mínimo: el token de admin y el secreto de sesión son la única barrera ante
  // fuerza bruta offline/online, y la app va a dejar de ser una alfa cerrada.
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET debe tener al menos 32 caracteres'),
  ADMIN_TOKEN: z.string().min(32, 'ADMIN_TOKEN debe tener al menos 32 caracteres'),
  TICK_INTERVAL_MINUTES: z.coerce.number().int().positive().default(360),
})

export type Env = z.infer<typeof envSchema>

/**
 * Entorno mínimo del proceso de tick (servicio cron): no necesita APP_URL ni secretos de
 * sesión, así que su servicio en Railway solo requiere DATABASE_URL.
 */
const tickEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  TICK_INTERVAL_MINUTES: z.coerce.number().int().positive().default(360),
})

export type TickEnv = z.infer<typeof tickEnvSchema>

function parse<T>(schema: z.ZodType<T>, source: NodeJS.ProcessEnv): T {
  const result = schema.safeParse(source)
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
      .join('; ')
    throw new Error(`Variables de entorno inválidas: ${issues}`)
  }
  return result.data
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return parse(envSchema, source)
}

export function loadTickEnv(source: NodeJS.ProcessEnv = process.env): TickEnv {
  return parse(tickEnvSchema, source)
}
