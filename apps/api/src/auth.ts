import { type Database, accounts, sessions, users, verifications } from '@cyclingstar/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

/**
 * Instancia de better-auth (Paso 9): correo + contraseña, sesiones en Postgres vía Drizzle.
 * Los ids los genera la base de datos (uuid), no better-auth, para mantener uuid en todo
 * el modelo (SPEC 11).
 */
export function createAuth(db: Database, opts: { secret: string; baseURL: string }) {
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
    advanced: {
      database: {
        generateId: false,
      },
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
