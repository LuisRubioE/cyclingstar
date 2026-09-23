import { z } from 'zod'

/**
 * Remitente del correo transaccional: `correo@dominio` o `Nombre <correo@dominio>`.
 * Resend rechaza cualquier otra forma, y lo hace en el momento del envío (es decir, cuando alguien
 * ha pedido recuperar su contraseña y ya no está mirando), así que se valida al arrancar.
 */
const MAIL_FROM_RE =
  /^(?:[^<>]{1,64}<[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+>|[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)$/

/**
 * Validación Zod de las variables de entorno en el borde de arranque (CLAUDE.md).
 * PORT lo inyecta Railway; DATABASE_URL es obligatoria desde el Paso 6.
 * APP_URL y SESSION_SECRET los usa better-auth (Paso 9).
 * ADMIN_TOKEN protege /admin/tick; TICK_INTERVAL_MINUTES parametriza el reloj (Paso 10).
 * RESEND_API_KEY y MAIL_FROM activan el envío de correo: son OPCIONALES para que un entorno
 * local (o un despliegue todavía sin dominio verificado) siga arrancando, pero van EN PAREJA — una
 * clave sin remitente es un despliegue que cree que manda correo y no manda ninguno.
 */
const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    APP_URL: z.string().url('APP_URL debe ser una URL válida'),
    // 32 caracteres mínimo: el token de admin y el secreto de sesión son la única barrera ante
    // fuerza bruta offline/online, y la app va a dejar de ser una alfa cerrada.
    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET debe tener al menos 32 caracteres'),
    ADMIN_TOKEN: z.string().min(32, 'ADMIN_TOKEN debe tener al menos 32 caracteres'),
    TICK_INTERVAL_MINUTES: z.coerce.number().int().positive().default(360),
    /**
     * Orígenes de confianza ADICIONALES, separados por comas. El de `APP_URL` y su pareja con/sin
     * `www` ya van solos (ver `trustedOriginsFor`); esto es para el dominio viejo mientras dura una
     * migración o para un entorno de pruebas.
     */
    EXTRA_TRUSTED_ORIGINS: z.string().optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    MAIL_FROM: z
      .string()
      .regex(MAIL_FROM_RE, 'MAIL_FROM debe ser "correo@dominio" o "Nombre <correo@dominio>"')
      .optional(),
  })
  .refine((env) => !(env.RESEND_API_KEY && !env.MAIL_FROM), {
    path: ['MAIL_FROM'],
    message: 'MAIL_FROM es obligatoria cuando hay RESEND_API_KEY',
  })
  .refine((env) => !(env.MAIL_FROM && !env.RESEND_API_KEY), {
    path: ['RESEND_API_KEY'],
    message: 'RESEND_API_KEY es obligatoria cuando hay MAIL_FROM',
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
