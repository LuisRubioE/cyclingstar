import { type Database, accounts, sessions, users, verifications } from '@cyclingstar/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { changeEmailConfirmationEmail, resetPasswordEmail, verifyEmailEmail } from './emails.js'
import type { Mailer } from './mailer.js'

/**
 * LOS ORÍGENES DE CONFIANZA, Y POR QUÉ NO BASTA `APP_URL` A SECAS.
 *
 * better-auth rechaza con «Invalid origin» toda petición cuyo origen no esté en esta lista, y
 * hasta aquí la lista era UNA entrada: la que dijera `APP_URL`. El día que el dominio propio entró
 * en producción, eso se llevó por delante el login entero —el dueño, al migrar: «al intentar
 * loguearme da este error: Invalid origin»—, porque la app pasó a servirse en
 * `www.cyclingstar.app` mientras la variable seguía nombrando el dominio de Railway.
 *
 * El apellido `www` es la trampa clásica: un sitio se sirve en los dos nombres —o cambia de uno a
 * otro— y el que no esté en la lista devuelve un error que no dice nada de dominios. Así que la
 * pareja se confía ENTERA: si `APP_URL` trae `www`, se acepta también sin él, y al revés. Son el
 * mismo dominio registrable y los dos los controla quien despliega.
 *
 * Y para lo demás —el dominio viejo mientras dura una migración, un entorno de pruebas— está
 * `EXTRA_TRUSTED_ORIGINS`, explícita: confiar en un origen es una decisión y se escribe, no se
 * adivina.
 */
export function trustedOriginsFor(
  baseURL: string,
  extra: string | undefined = undefined,
): string[] {
  const out = new Set<string>()
  const añadir = (url: string): void => {
    const limpio = url.trim().replace(/\/+$/, '')
    if (limpio === '') return
    out.add(limpio)
    try {
      const u = new URL(limpio)
      const hermano = u.host.startsWith('www.') ? u.host.slice(4) : `www.${u.host}`
      out.add(`${u.protocol}//${hermano}`)
    } catch {
      /* si no es una URL, se queda tal cual: el esquema de entorno ya la valida */
    }
  }
  añadir(baseURL)
  for (const uno of (extra ?? '').split(',')) añadir(uno)
  return [...out]
}

/**
 * Instancia de better-auth (Paso 9): correo + contraseña, sesiones en Postgres vía Drizzle.
 * Los ids los genera la base de datos (uuid), no better-auth, para mantener uuid en todo
 * el modelo (SPEC 11).
 */
export function createAuth(
  db: Database,
  opts: {
    secret: string
    baseURL: string
    mailer: Mailer
    extraTrustedOrigins?: string | undefined
  },
) {
  // Cookies seguras cuando la app se sirve por https (producción tras el proxy de Railway).
  // Se deriva de APP_URL y NO de NODE_ENV: un despliegue sin NODE_ENV=production no debe acabar
  // emitiendo la cookie de sesión sin el flag `secure`.
  const secureCookies = opts.baseURL.startsWith('https://')
  const { mailer } = opts
  return betterAuth({
    secret: opts.secret,
    baseURL: opts.baseURL,
    trustedOrigins: trustedOriginsFor(opts.baseURL, opts.extraTrustedOrigins),
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
      /**
       * LA COMPROBACIÓN DE ORIGEN, ENCENDIDA SIEMPRE Y DICHA AQUÍ.
       *
       * better-auth la apaga sola cuando `NODE_ENV=test` (`skipOriginCheck: … isTest() ? true`), y
       * eso convierte la suite en un testigo inútil justo para el defecto que más caro sale: una
       * lista de orígenes mal puesta pasa todas las pruebas y tira el login en producción. Pasó
       * —«al intentar loguearme da este error: Invalid origin»— y las pruebas estaban verdes.
       *
       * Encendida siempre, lo que se prueba es lo que corre. Es la misma decisión que
       * `useSecureCookies`: derivar del entorno lo que protege una sesión es cómo se acaba
       * desplegando sin protección sin que nadie lo vea.
       */
      disableOriginCheck: false,
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
