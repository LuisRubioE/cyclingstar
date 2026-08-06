import { type Database, accounts, sessions, users, verifications } from '@cyclingstar/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

/**
 * Instancia de better-auth (Paso 9): correo + contraseña, sesiones en Postgres vía Drizzle.
 * Los ids los genera la base de datos (uuid), no better-auth, para mantener uuid en todo
 * el modelo (SPEC 11).
 */
export function createAuth(db: Database, opts: { secret: string; baseURL: string }) {
  // Cookies seguras cuando la app se sirve por https (producción tras el proxy de Railway).
  // Se deriva de APP_URL y NO de NODE_ENV: un despliegue sin NODE_ENV=production no debe acabar
  // emitiendo la cookie de sesión sin el flag `secure`.
  const secureCookies = opts.baseURL.startsWith('https://')
  return betterAuth({
    secret: opts.secret,
    baseURL: opts.baseURL,
    trustedOrigins: [opts.baseURL],
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
      },
    }),
    emailAndPassword: {
      enabled: true,
    },
    user: {
      // Cambio de correo desde ajustes (SPEC 7): como aún no verificamos correos (sin envío de
      // emails), el cambio se aplica directamente. El callback es un no-op para cubrir el caso de
      // un correo ya verificado sin romper el flujo.
      changeEmail: {
        enabled: true,
        sendChangeEmailVerification: async () => {
          /* sin verificación por correo por ahora */
        },
      },
    },
    advanced: {
      useSecureCookies: secureCookies,
      // Atributos de la cookie de sesión, explícitos en vez de heredados del defecto de la
      // librería: httpOnly (inaccesible desde JS, corta el robo por XSS), sameSite lax (la web y
      // la API comparten origen, así que lax basta y corta el CSRF de peticiones cruzadas),
      // secure en https y path raíz (la SPA vive en /).
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'lax',
        secure: secureCookies,
        path: '/',
      },
      database: {
        generateId: false,
      },
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
