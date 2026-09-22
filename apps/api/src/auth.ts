import { type Database, accounts, sessions, users, verifications } from '@cyclingstar/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { changeEmailConfirmationEmail, resetPasswordEmail, verifyEmailEmail } from './emails.js'
import type { Mailer } from './mailer.js'

/**
 * Instancia de better-auth (Paso 9): correo + contraseña, sesiones en Postgres vía Drizzle.
 * Los ids los genera la base de datos (uuid), no better-auth, para mantener uuid en todo
 * el modelo (SPEC 11).
 */
export function createAuth(
  db: Database,
  opts: { secret: string; baseURL: string; mailer: Mailer },
) {
  // Cookies seguras cuando la app se sirve por https (producción tras el proxy de Railway).
  // Se deriva de APP_URL y NO de NODE_ENV: un despliegue sin NODE_ENV=production no debe acabar
  // emitiendo la cookie de sesión sin el flag `secure`.
  const secureCookies = opts.baseURL.startsWith('https://')
  const { mailer } = opts
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
      // Recuperar la contraseña. Sin esta función, better-auth registra «Reset password
      // isn't enabled» y devuelve un error: la pantalla de «he olvidado mi contraseña» no existía
      // porque no había a dónde mandar el enlace.
      sendResetPassword: async ({ user, url }) => {
        await mailer.send({ to: user.email, ...resetPasswordEmail(url) })
      },
    },
    emailVerification: {
      // Esta es la pieza que faltaba y que rompía TAMBIÉN el cambio de correo: en better-auth
      // 1.6, `POST /change-email` exige que exista `sendVerificationEmail` (o
      // `updateEmailWithoutVerification`) y, si no hay ninguna, responde 400 «Verification email
      // isn't enabled». Es decir: el formulario de ajustes fallaba siempre, no «aplicaba el
      // cambio directamente» como decía el comentario que había aquí.
      sendVerificationEmail: async ({ user, url }) => {
        await mailer.send({ to: user.email, ...verifyEmailEmail(url) })
      },
      // Se manda al registrarse, pero NO se exige para entrar: `requireEmailVerification` sigue
      // en falso a propósito. Todas las cuentas que ya existen tienen el correo sin verificar, y
      // exigirlo las dejaría fuera de su propio equipo de un despliegue para otro.
      sendOnSignUp: true,
    },
    user: {
      // Cambio de correo desde ajustes (SPEC 7). Quien tenga la dirección actual ya verificada
      // recibe AHÍ el aviso (`sendChangeEmailConfirmation`), que es lo que permite frenar a quien
      // se haya colado en una sesión; quien no la tenga verificada recibe el enlace en la
      // dirección nueva, y hasta que lo abra el correo de la cuenta no cambia.
      changeEmail: {
        enabled: true,
        sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
          await mailer.send({ to: user.email, ...changeEmailConfirmationEmail(url, newEmail) })
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
