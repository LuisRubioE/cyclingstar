import {
  type Database,
  accounts,
  bumpDeviceEpoch,
  clearAttempts,
  deleteAccount,
  deleteUserVerifications,
  sessions,
  touchLastSeen,
  userStatusOf,
  users,
  verifications,
} from '@cyclingstar/db'
import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import {
  EMAIL_JWT_TTL_S,
  RESET_TOKEN_TTL_S,
  SESSION_EXPIRES_S,
  SESSION_UPDATE_AGE_S,
  TERMS_VERSION,
  type UserStatus,
  birthDateSchema,
} from '@cyclingstar/shared'
import { resetPasswordEmail, verifyEmailEmail } from './emails.js'
import { limitKeys } from './limitKeys.js'
import type { Mailer } from './mailer.js'
import { type MailQueue, mailQueue as colaDelProceso } from './mailQueue.js'
import { AUTH_ALLOWED_PATHS } from './security.js'

/**
 * Las recuperaciones de contraseña que acaban de terminar bien, por petición: `onPasswordReset`
 * apunta el correo de la cuenta en la misma `Request` que el proxy pasó a `auth.handler`
 * (better-auth la reenvía como `ctx.request`), y el proxy lo lee al ver el 200 (docs/cuenta.md
 * §5.4) y emite a ese navegador su `cs_device` (§7.5).
 */
export const resetRequests = new WeakMap<Request, string>()

/**
 * La ruta de better-auth que confirma un correo (`GET /api/auth/verify-email?token=`). Desde el PR 8 de
 * E4 solo la llaman los enlaces viejos y `POST /api/account/verify-email`, dentro del proceso (§5.2).
 */
export const VERIFY_EMAIL_PATH = '/verify-email'

/** Las dos páginas de botón de la web, a las que llevan los correos (docs/cuenta.md §5.2). */
export const VERIFY_EMAIL_PAGE = '/verify-email'
export const RESET_PASSWORD_PAGE = '/reset-password'

/**
 * LO QUE `better-auth` NO SIRVE NUNCA (docs/cuenta.md §8.1; D-29, X-14, 8-l). `disabledPaths` es el
 * complemento de `AUTH_ALLOWED_PATHS` sobre `auth.api`, menos `/verify-email`, que la ruta interna
 * de §5.2 llama dentro del proceso. Da 404 antes del limitador y de los ganchos, sin variante de URL
 * que lo esquive; es el segundo cerrojo, por si el proxy se monta mal algún día.
 */
export function disabledAuthPaths(
  endpoints: Readonly<Record<string, { path?: string | undefined }>>,
): string[] {
  const abiertas = new Set<string>([...AUTH_ALLOWED_PATHS.map((r) => r.path), VERIFY_EMAIL_PATH])
  const fuera = new Set<string>()
  for (const endpoint of Object.values(endpoints)) {
    const ruta = endpoint.path
    if (ruta !== undefined && !abiertas.has(ruta)) fuera.add(ruta)
  }
  return [...fuera].sort()
}

/**
 * LAS PLANTILLAS CON PARÁMETROS QUE SE CIERRAN EN EL GANCHO (8-g). `disabledPaths` compara la ruta
 * ya resuelta (`/callback/google`) con la lista, así que `/callback/:id` nunca casa: el `hooks.before`
 * mira `ctx.path`, que es la plantilla. Solo estas, y no la lista entera, porque los ganchos corren
 * también en `auth.api.*` (`verifyPassword`, `revokeOtherSessions`), que el servidor sigue usando.
 */
export const CLOSED_AUTH_TEMPLATES: ReadonlySet<string> = new Set(['/callback/:id'])

/**
 * EL ENLACE DE UN CORREO, HACIA LA PÁGINA DE BOTÓN (docs/cuenta.md §5.2; D-12, I-04). Lo construye el
 * servidor con `APP_URL` y el token que better-auth le pasa, y no con su `url`, que apuntaba a la API con
 * el token en la consulta: aquí va en el fragmento (`#token=`), que el navegador no manda al servidor, así
 * que no queda en ningún registro HTTP. Hace el papel del `withCallbackURL` de antes (el servidor decide a
 * dónde lleva cada enlace), ahora hacia `#token=`.
 */
export function emailLink(appUrl: string, page: string, token: string): string {
  return `${appUrl.replace(/\/+$/, '')}${page}#token=${encodeURIComponent(token)}`
}

/**
 * EL IDIOMA DE UNA CUENTA NUEVA (docs/cuenta.md §4.7; D-07): la etiqueta primaria de `Accept-Language` en dos
 * letras minúsculas (`es-ES,es;q=0.9` da `es`), o `'en'` si no hay. Traducir es de E10; esto solo lo apunta.
 */
export function localeFrom(acceptLanguage: string | null | undefined): string {
  const primera = (acceptLanguage ?? '').split(',')[0]?.split(';')[0]?.trim() ?? ''
  const etiqueta = primera.split('-')[0]?.toLowerCase() ?? ''
  return /^[a-z]{2}$/.test(etiqueta) ? etiqueta : 'en'
}

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
    /** Dónde esperan los correos que salen después de responder; por defecto, la del proceso. */
    mailQueue?: MailQueue
    /** `ADMIN_EMAIL`: quien se registra con él entra aprobado (docs/cuenta.md §4.9). */
    adminEmail?: string | undefined
    /** Cómo se lee el estado de una cuenta; por defecto, de la base. Los tests de opciones lo fingen. */
    statusOf?: (userId: string) => Promise<UserStatus | null>
  },
) {
  // Cookies seguras cuando la app se sirve por https (producción tras el proxy de Railway).
  // Se deriva de APP_URL y NO de NODE_ENV: un despliegue sin NODE_ENV=production no debe acabar
  // emitiendo la cookie de sesión sin el flag `secure`.
  const secureCookies = opts.baseURL.startsWith('https://')
  const { mailer } = opts
  const cola = opts.mailQueue ?? colaDelProceso
  const statusOf = opts.statusOf ?? ((id: string) => userStatusOf(db, { id }))
  // EL REGISTRO POR APROBACIÓN (docs/cuenta.md §4.9): ningún correo sale a una cuenta que no esté
  // aprobada. Se lee de la base por el id, sin fiarse del objeto que pasa better-auth; así lo cumplen
  // a la vez el registro, el reenvío al entrar, `send-verification-email` y la recuperación, con la
  // misma respuesta que si hubiera salido.
  const aprobada = async (userId: string): Promise<boolean> =>
    (await statusOf(userId)) === 'approved'
  const adminEmail = opts.adminEmail?.trim().toLowerCase()
  // Se llena al acabar de construir, con `auth.api` delante (ver `disabledAuthPaths`). better-auth
  // la lee en cada petición de la misma referencia que recibe.
  const disabledPaths: string[] = []
  const claves = limitKeys(opts.secret)
  const auth = betterAuth({
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
      // Sin correo confirmado no se entra. El registro ya no abre sesión: deja la cuenta creada y
      // manda el enlace, y es ABRIR ESE ENLACE lo que abre la primera sesión
      // (`autoSignInAfterVerification`). Cuentas anteriores a este cambio: la sesión que ya tienen
      // sigue viva; al volver a entrar se les pide confirmar y se les manda el enlace solo
      // (`sendOnSignIn`), así que nadie se queda fuera sin saber por qué.
      requireEmailVerification: true,
      // Recuperar la contraseña. Sin esta función, better-auth registra «Reset password
      // isn't enabled» y devuelve un error: la pantalla de «he olvidado mi contraseña» no existía
      // porque no había a dónde mandar el enlace.
      // El correo lleva a `/reset-password#token=` (§5.2), no al `url` de better-auth.
      sendResetPassword: async ({ user, token }) => {
        if (!(await aprobada(user.id))) return
        await mailer.send({
          to: user.email,
          kind: 'reset_password',
          userId: user.id,
          ...resetPasswordEmail(emailLink(opts.baseURL, RESET_PASSWORD_PAGE, token)),
        })
      },
      // Una hora (§5.1; D-11).
      resetPasswordTokenExpiresIn: RESET_TOKEN_TTL_S,
      // Quien recupera la contraseña cierra TODAS las sesiones: si alguien se había colado, sale
      // (docs/cuenta.md §5.4; X-21). Y luego `onPasswordReset`: los otros enlaces de recuperación
      // que sigan vivos en el buzón dejan de valer, y la petición queda apuntada para el proxy.
      revokeSessionsOnPasswordReset: true,
      onPasswordReset: async ({ user }, request) => {
        await deleteUserVerifications(db, user.id)
        // L1 a cero y el techo de L3 por cuenta también (§7.4): quien recupera sale del cierre aunque el
        // atacante lo siga gastando, porque además recibe su `cs_device` (la emite el proxy al ver el
        // 200). Y `device_epoch` sube: todas las `cs_device` de esta cuenta dejan de valer (§7.5).
        await clearAttempts(db, [claves.acct(user.email), claves.pwu(user.id)])
        await bumpDeviceEpoch(db, user.id)
        if (request) resetRequests.set(request, user.email)
      },
    },
    emailVerification: {
      // Una cuenta pendiente no recibe nada: el `verify_signup` sale cuando un administrador la
      // aprueba (`POST /api/admin/users/:id/approve`), que vuelve a pasar por aquí.
      // El correo lleva a `/verify-email#token=` (§5.2): abrirlo no confirma nada; el botón de esa página
      // manda el token en el cuerpo de `POST /api/account/verify-email` (5-h).
      sendVerificationEmail: async ({ user, token }) => {
        if (!(await aprobada(user.id))) return
        await mailer.send({
          to: user.email,
          kind: 'verify_signup',
          userId: user.id,
          ...verifyEmailEmail(emailLink(opts.baseURL, VERIFY_EMAIL_PAGE, token)),
        })
      },
      // 24 horas: el correo del registro se lee al día siguiente (§5.1; D-11).
      expiresIn: EMAIL_JWT_TTL_S,
      sendOnSignUp: true,
      // Quien intenta entrar sin haber confirmado recibe un enlace nuevo en ese momento. better-auth
      // lo hace DESPUÉS de comprobar la contraseña, así que no sirve para saber qué correos existen
      // ni para llenarle el buzón a otro.
      sendOnSignIn: true,
      // Confirmar deja la sesión abierta en ese navegador: es el final natural del registro.
      autoSignInAfterVerification: true,
    },
    user: {
      // El correo lo cambia solo un administrador, desde el panel (docs/cuenta.md §5.5).
      changeEmail: { enabled: false },
      // El estado del registro por aprobación (§4.9): nadie lo escribe por `sign-up/email` y no sale
      // en ninguna respuesta. La clave es la de Drizzle (`status`), o 1.7 lanza `SchemaMismatchError`.
      additionalFields: {
        status: { type: 'string', input: false, returned: false, defaultValue: 'pending' },
        approvedAt: { type: 'date', input: false, returned: false, required: false },
        // El buzón que no recibe (§9.3): `Account` abre con su `Notice` mientras esté puesta. Solo la
        // escriben el webhook de Resend y el cambio de correo del administrador.
        emailUndeliverableAt: { type: 'date', input: false, returned: true, required: false },
        // LA FECHA DE NACIMIENTO (docs/cuenta.md §4.2; D-06, 4-f): obligatoria en el registro y validada con
        // `birthDateSchema` en `parseUserInput`, ANTES de buscar el correo, así que el menor recibe el mismo
        // 400 exista o no la cuenta (X-09). No viaja en `get-session` ni en el 200 del registro
        // (`returned: false`); la web pregunta `GET /api/me/account`. OJO: con `input: true`, `update-user`
        // la podría reescribir; lo impide que esa ruta dé 404 (§8.1, `authRoutes.test.ts`). No la abras sin
        // cerrar antes este campo.
        birthDate: {
          type: 'string',
          required: true,
          input: true,
          returned: false,
          validator: { input: birthDateSchema },
        },
        // Los escribe solo `databaseHooks.user.create.before` (§4.6 y §4.7); declarados para que el
        // adaptador los guarde, y con `input: false` para que nadie los mande.
        locale: { type: 'string', input: false, returned: false, required: false },
        termsVersion: { type: 'string', input: false, returned: false, required: false },
        termsAcceptedAt: { type: 'date', input: false, returned: false, required: false },
      },
      // Borrar la cuenta desde ajustes (docs/cuenta.md §10.4; D-38): `deleteAccount`, la misma función que el
      // panel, en UNA transacción. El corredor y el equipo NO se borran: pasan a la máquina, y el equipo conserva
      // su nombre (10-b). La fila de `users` ya no existe cuando better-auth la borra después: su `delete` no
      // encuentra nada y sigue, y el 200 es el mismo.
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => {
          await deleteAccount(db, user.id)
        },
      },
    },
    // La sesión (docs/cuenta.md §6.1; D-17): 30 días renovados una vez al día de uso, y SIN
    // `cookieCache`, que dejaría valer hasta un minuto una sesión ya cerrada (también la que la
    // recuperación acaba de cerrar). El techo de 90 días no es una opción de better-auth: lo
    // aplican `createCurrentUserId` (routes/context.ts) y el proxy de `get-session`.
    session: {
      expiresIn: SESSION_EXPIRES_S,
      updateAge: SESSION_UPDATE_AGE_S,
    },
    // Los enlaces de recuperación se guardan por su hash (SHA-256), no en claro: quien lea la
    // tabla `verifications` no se lleva un enlace que funcione.
    verification: {
      storeIdentifier: 'hashed',
    },
    // El limitador propio de better-auth, apagado por escrito (docs/cuenta.md §7.2, capa 2): sin
    // cabecera de IP mete a todo el mundo en el mismo cubo, y su clave no ve ni el correo ni el
    // resultado. Los límites son los de Fastify (security.ts).
    rateLimit: { enabled: false },
    // Solo avisos y errores (D-30): lo de nivel `info` de better-auth puede llevar datos de la cuenta.
    logger: { level: 'warn' },
    // La cuenta nueva (docs/cuenta.md §4.6 y §4.7): el nombre fijo `'Player'` (nadie lo lee; la web manda
    // `''`), el idioma de `Accept-Language` y la versión de las condiciones aceptadas, con su hora. Y el
    // correo de `ADMIN_EMAIL` entra aprobado y su enlace sale al registrarse (§4.9), como
    // `twilightstruggle` aprueba a la llegada a quien está en `AI_ADMINS`.
    databaseHooks: {
      user: {
        create: {
          before: async (user, context) => {
            const cabeceras = context?.request?.headers ?? context?.headers
            const data = {
              ...user,
              name: 'Player',
              locale: localeFrom(cabeceras?.get('accept-language')),
              termsVersion: TERMS_VERSION,
              termsAcceptedAt: new Date(),
            }
            if (adminEmail === undefined || user.email.toLowerCase() !== adminEmail) return { data }
            return { data: { ...data, status: 'approved', approvedAt: new Date() } }
          },
        },
      },
    },
    disabledPaths,
    hooks: {
      /*
        Borrar una cuenta pide SIEMPRE la contraseña. Sin ella, better-auth lo permite con una
        sesión «fresca» (de menos de un día), y quien se haya colado en una sesión abierta podría
        llevarse la cuenta de otro por delante. Es irreversible: la puerta se cierra aquí.
      */
      before: createAuthMiddleware(async (ctx) => {
        // El segundo cerrojo de las rutas con parámetros (8-g): `disabledPaths` no las alcanza.
        if (CLOSED_AUTH_TEMPLATES.has(ctx.path)) throw new APIError('NOT_FOUND')
        // La foto no se guarda (§4.7): el registro que la trae da 400; `update-user`, la otra puerta, da 404.
        if (ctx.path === '/sign-up/email') {
          const cuerpo: unknown = ctx.body
          if (typeof cuerpo === 'object' && cuerpo !== null && 'image' in cuerpo) {
            throw new APIError('BAD_REQUEST', {
              code: 'FIELD_NOT_ALLOWED',
              message: 'image is not allowed to be set',
            })
          }
          return
        }
        if (ctx.path !== '/delete-user') return
        const body: unknown = ctx.body
        const password =
          typeof body === 'object' && body !== null && 'password' in body
            ? body.password
            : undefined
        if (typeof password !== 'string' || password === '') {
          throw new APIError('BAD_REQUEST', {
            message: 'Enter your password to delete your account.',
          })
        }
      }),
      /*
        LA ÚLTIMA VISITA EN TODA VISITA (docs/cuenta.md §10.6; D-40, 14-d): la web pide `get-session` al cargar
        cualquier página, así que con sesión se apunta `last_seen_at` (y `welcome_back_from`, §14.5), como
        mucho una vez por hora. Sin esperarla, y un fallo se apunta sin tumbar el proceso (10-k).
      */
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== '/get-session') return
        const devuelto: unknown = ctx.context.returned
        if (devuelto === null || typeof devuelto !== 'object' || !('user' in devuelto)) return
        const user: unknown = devuelto.user
        if (user === null || typeof user !== 'object' || !('id' in user)) return
        if (typeof user.id !== 'string') return
        touchLastSeen(db, user.id).catch((err: unknown) => {
          console.warn('touchLastSeen en get-session', err)
        })
      }),
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
      // La IP no se guarda con la sesión (docs/cuenta.md §6.2; D-18): nadie la lee, y los límites
      // usan la de la petición.
      ipAddress: { disableIpTracking: true },
      // Los correos salen DESPUÉS de responder: el tiempo de la respuesta no dice si la cuenta
      // existe. La cola los apunta para que un despliegue (`SIGTERM`) no los corte (mailQueue.ts).
      backgroundTasks: { handler: cola.track },
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
  disabledPaths.push(...disabledAuthPaths(auth.api))
  return auth
}

export type Auth = ReturnType<typeof createAuth>
