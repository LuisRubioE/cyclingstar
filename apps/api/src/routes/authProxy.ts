import {
  type Database,
  bumpDeviceEpoch,
  clearAttempts,
  type EmailKind,
  type PushTargetRow,
  deletePushTargetsById,
  deletePushTargetsOfSessions,
  deviceOwnerByEmail,
  pushTargetsOf,
  reserveAttempt,
  takePushTargets,
} from '@cyclingstar/db'
import { type UserStatus, deviceLabel } from '@cyclingstar/shared'
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { type Auth, resetRequests } from '../auth.js'
import { clientIp, ipBucket } from '../clientIp.js'
import { createDeviceCookies } from '../deviceCookie.js'
import { apiError, unauthorized } from '../http.js'
import { limitKeys } from '../limitKeys.js'
import { MAIL_BUDGET_EXHAUSTED_BODY, mailBudgetOpen } from '../mailBudget.js'
import type { Notifier } from '../push/deliver.js'
import {
  PASSWORD_ATTEMPTS_LOCKED_MESSAGE,
  failureClosesSession,
  reserveSessionPassword,
} from '../passwordAttempts.js'
import {
  ACCOUNT_FAILS,
  AUTH_RATE_LIMIT,
  CREDENTIAL_AUTH_PATHS,
  CREDENTIAL_RATE_LIMIT,
  DEVICE_FAILS,
  MAIL_ROUTES_PER_IP_DAY,
  SESSION_PASSWORD_FAILS,
  isAllowedAuthPath,
} from '../security.js'
import { viewerCookieHeader } from '../viewerCookie.js'
import { deleteSessionByToken, isPastSessionCeiling, toWebHeaders } from './context.js'

export interface AuthProxyContext {
  auth: Auth
  /** APP_URL va por https: la cookie que se borra lleva Secure, como la que se puso (E2, §10.8). */
  secureCookies?: boolean
  /** El estado de una cuenta por su correo, para el 403 `ACCOUNT_PENDING` (docs/cuenta.md §4.9). */
  statusByEmail?: (email: string) => Promise<UserStatus | null>
  /** La base de `auth_limits` y de `device_epoch` (docs/cuenta.md §7). Sin ella, sin límites L1 a L4. */
  db?: Database
  /** `MAIL_DAILY_BUDGET` (§7.6), para el 503 `MAIL_BUDGET_EXHAUSTED`. Por defecto, 90. */
  mailDailyBudget?: number
  /** Los avisos de seguridad (docs/cuenta.md §13.7; 13-k, 13-l): `new_sign_in` y `password_changed`. */
  notifier?: Notifier
}

/**
 * Las salidas explícitas de la cuenta, que además borran `cs_viewer`, la cookie que solo restringe
 * (E2, docs/retransmision.md §10.8; D-34; paso 7a). La caducidad de la sesión NO la borra: es justo el
 * caso para el que existe.
 */
const CLEARS_VIEWER_COOKIE: ReadonlySet<string> = new Set([
  '/api/auth/sign-out',
  '/api/auth/delete-user',
])

/**
 * EL CUERPO FIJO DEL REGISTRO (docs/cuenta.md §5.3, 5-i). better-auth responde 200 también a un
 * correo que ya tiene cuenta, con un usuario inventado, pero el cuerpo lo delata: el id inventado es
 * el `generateId()` de 32 caracteres de better-auth y el de verdad el uuid de Postgres (36). Así que
 * todo 200 de `sign-up/email` sale con este cuerpo, igual byte a byte; la web solo lee `error`.
 */
const SIGN_UP_PATH = '/api/auth/sign-up/email'
const SIGN_IN_PATH = '/api/auth/sign-in/email'

/**
 * ENTRAR ESTANDO PENDIENTE (docs/cuenta.md §4.9). better-auth comprueba la contraseña antes que la
 * confirmación y responde 403 `EMAIL_NOT_VERIFIED`; solo en ese 403 (la contraseña ya era buena, así que
 * no delata nada a quien no la sabe) el proxy mira el estado y, si la cuenta espera, cambia el código.
 */
export const ACCOUNT_PENDING_BODY = JSON.stringify({
  code: 'ACCOUNT_PENDING',
  message: 'Your account is waiting for approval.',
})

/**
 * Las rutas que se cortan con el presupuesto del día gastado (§7.6), con el `kind` que mandarían. El
 * registro no está: ya no manda correo (§4.9) y no se corta.
 */
const BUDGET_PATHS: ReadonlyMap<string, EmailKind> = new Map([
  ['/api/auth/send-verification-email', 'verify_signup'],
  ['/api/auth/request-password-reset', 'reset_password'],
])

/** Las rutas que mandan correo: L4 (docs/cuenta.md §7.4). */
const MAIL_PATHS: ReadonlySet<string> = new Set([
  SIGN_UP_PATH,
  '/api/auth/request-password-reset',
  '/api/auth/send-verification-email',
])
const RESET_PASSWORD_PATH = '/api/auth/reset-password'
const CHANGE_PASSWORD_PATH = '/api/auth/change-password'
const DELETE_USER_PATH = '/api/auth/delete-user'
/** Las que piden la contraseña con una sesión abierta: L3 (§7.4; 7-c). Exportar, en `meAccount.ts` (§10.5). */
const SESSION_PASSWORD_PATHS: ReadonlySet<string> = new Set([
  CHANGE_PASSWORD_PATH,
  DELETE_USER_PATH,
])

/** Los 429 propios de la cuenta (§12.3): el texto lo pone la web por `code`; aquí va en inglés igual. */
const ACCOUNT_LOCKED_MESSAGE =
  'Too many failed attempts on this account. Try again in 15 minutes, or reset your password.'

/** Responde un 429 con su espera en el cuerpo y en `retry-after` (§7.8). */
function demasiados(reply: FastifyReply, retryAfterS: number, cuerpo: object): FastifyReply {
  reply.header('retry-after', String(retryAfterS))
  reply.header('content-type', 'application/json')
  return reply.status(429).send(JSON.stringify({ ...cuerpo, retryAfterS }))
}

/** El correo del cuerpo de `sign-in/email`, si lo trae. */
function correoDe(cuerpo: unknown): string | null {
  if (cuerpo === null || typeof cuerpo !== 'object' || !('email' in cuerpo)) return null
  return typeof cuerpo.email === 'string' ? cuerpo.email : null
}
export const SIGN_UP_OK_BODY = '{"token":null,"user":null}'

/**
 * LO QUE NO SALE EN NINGÚN JSON DE `/api/auth/*` (docs/cuenta.md §6.3; 6-f; D-19).
 *
 * El 200 de `sign-in/email` lleva el token de la sesión en el cuerpo, y `get-session` lleva además
 * la IP y el agente. La web no lee ninguno, y una XSS futura no debe poder llevarse un token
 * reutilizable: se quitan, a cualquier profundidad, de todo JSON que responda better-auth.
 */
const CAMPOS_RETIRADOS: ReadonlySet<string> = new Set(['token', 'ipAddress', 'userAgent'])

export function scrubAuthJson(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(scrubAuthJson)
  if (valor !== null && typeof valor === 'object') {
    const limpio: Record<string, unknown> = {}
    for (const [clave, dentro] of Object.entries(valor)) {
      if (!CAMPOS_RETIRADOS.has(clave)) limpio[clave] = scrubAuthJson(dentro)
    }
    return limpio
  }
  return valor
}

const GET_SESSION_PATH = '/api/auth/get-session'

/** La sesión que trae un cuerpo de `get-session`, si la trae. */
function sesionDe(cuerpo: unknown): { token: string; createdAt: string } | null {
  if (cuerpo === null || typeof cuerpo !== 'object' || !('session' in cuerpo)) return null
  const sesion: unknown = cuerpo.session
  if (sesion === null || typeof sesion !== 'object') return null
  if (!('token' in sesion) || !('createdAt' in sesion)) return null
  const { token, createdAt } = sesion
  return typeof token === 'string' && typeof createdAt === 'string' ? { token, createdAt } : null
}

/** Lo que nunca lleva una ruta en su forma normal, en crudo o escapado (sin mirar mayúsculas). */
const RUTA_SOSPECHOSA = /\/\/|\/\.\/|\/\.\.\/|%2e|%2f|%5c/i

/**
 * ¿La ruta cruda de la petición está ya en su forma normal? (docs/cuenta.md §7.2, 7-j)
 *
 * find-my-way recibe la ruta tal cual y elige el límite por ella: `/api/auth/x/../sign-in/email` no
 * casaba con la ruta estática del límite estricto y caía en el comodín, y después `new URL(...)` la
 * normalizaba y better-auth atendía `sign-in/email` igual. Una ruta que no es igual a su
 * normalización, o que lleva `//`, `/./`, `/../`, `%2e`, `%2f` o `%5c`, no es de nadie: 404.
 */
export function isNormalAuthPath(rawUrl: string): boolean {
  const corte = rawUrl.indexOf('?')
  const ruta = corte === -1 ? rawUrl : rawUrl.slice(0, corte)
  if (RUTA_SOSPECHOSA.test(ruta)) return false
  try {
    return new URL(ruta, 'http://x').pathname === ruta
  } catch {
    return false
  }
}

/**
 * Montaje de better-auth en /api/auth/* (Paso 9). Reconstruye una Request web a partir de la
 * petición de Fastify y reenvía la respuesta, preservando las cookies de sesión.
 */
export const authProxyRoutes: FastifyPluginAsync<AuthProxyContext> = async (app, ctx) => {
  const { auth } = ctx
  // Las dos claves salen del mismo `SESSION_SECRET` que firma la sesión, con HKDF y su etiqueta (7-a).
  // Sin base o sin secreto (los dobles de better-auth de los tests de rutas), sin límites L1 a L4.
  const secreto = (auth as { options?: { secret?: unknown } }).options?.secret
  const db = typeof secreto === 'string' ? ctx.db : undefined
  const clave = typeof secreto === 'string' ? secreto : 'sin-secreto'
  const keys = limitKeys(clave)
  const devices = createDeviceCookies(clave, ctx.secureCookies ?? false)

  // Antes del límite y del proxy: los ganchos del plugin van antes que los que @fastify/rate-limit
  // cuelga de cada ruta, así que el atajo ni gasta ni burla ningún contador.
  // Y la lista blanca (§8.1): lo que no está en `AUTH_ALLOWED_PATHS` no llega a better-auth.
  app.addHook('onRequest', async (request, reply) => {
    const raw = request.raw.url ?? ''
    if (!isNormalAuthPath(raw)) {
      return reply.status(404).send(apiError('no_encontrado'))
    }
    const corte = raw.indexOf('?')
    const ruta = (corte === -1 ? raw : raw.slice(0, corte)).replace(/^\/api\/auth/, '')
    if (!isAllowedAuthPath(request.method, ruta)) {
      return reply.status(404).send(apiError('no_encontrado'))
    }
  })

  const forwardToAuth = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const url = new URL(request.url, `${request.protocol}://${request.host}`)
    const init: RequestInit = { method: request.method, headers: toWebHeaders(request) }
    const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
    if (hasBody && request.body != null) {
      init.body = JSON.stringify(request.body)
    }
    const webRequest = new Request(url, init)
    const ruta = url.pathname

    // LA RESERVA, ANTES DE REENVIAR (docs/cuenta.md §7.3; H-01; O-14): el intento cuenta antes de que
    // better-auth mire la contraseña, así que una ráfaga no pasa del límite. Al 200 se borra.
    const ahora = new Date()
    /** Las claves que se borran si better-auth responde 200. */
    const alAcertar: string[] = []
    /** Las `Set-Cookie` propias que se añaden a la respuesta. */
    const cookiesPropias: string[] = []
    let correoEntrada: string | null = null
    /** Si el navegador traía una `cs_device` válida para ese correo: sin ella, `new_sign_in` (§7.5). */
    let aparatoConocido = false
    /** L3: la sesión que pide la contraseña y cuántas lleva hoy (para cerrarla al décimo fallo). */
    let sesionL3: {
      token: string
      id: string
      userId: string
      email: string
      dayCount: number
    } | null = null
    /** Al cambiar la contraseña, las suscripciones leídas antes de reenviar (13-l). */
    let avisosAntes: readonly PushTargetRow[] = []

    if (db !== undefined && ruta === SIGN_IN_PATH) {
      correoEntrada = correoDe(request.body)
      if (correoEntrada !== null) {
        // L2 si el navegador trae una `cs_device` válida para ese correo; si no, o si L2 la cerró, L1.
        const dueño = await deviceOwnerByEmail(db, correoEntrada)
        const entrada = devices.validFor(devices.read(request.headers.cookie), correoEntrada, dueño)
        let pasa = false
        if (entrada !== null) {
          aparatoConocido = true
          const clave = keys.dev(entrada.nonce)
          alAcertar.push(clave)
          pasa = (await reserveAttempt(db, clave, DEVICE_FAILS, ahora)).allowed
        }
        const clave = keys.acct(correoEntrada)
        alAcertar.push(clave)
        if (!pasa) {
          // L1 cuenta igual con un correo que no existe: el 429 no delata cuentas.
          const r = await reserveAttempt(db, clave, ACCOUNT_FAILS, ahora)
          if (!r.allowed) {
            return demasiados(reply, r.retryAfterS, {
              code: 'ACCOUNT_LOCKED',
              message: ACCOUNT_LOCKED_MESSAGE,
            })
          }
        }
      }
    } else if (db !== undefined && MAIL_PATHS.has(ruta)) {
      const r = await reserveAttempt(
        db,
        keys.mailip(ipBucket(clientIp(request))),
        MAIL_ROUTES_PER_IP_DAY,
        ahora,
      )
      // L4 responde como el límite de Fastify (§7.4).
      if (!r.allowed) {
        return demasiados(reply, r.retryAfterS, {
          ...apiError('demasiadas_peticiones'),
          message: 'Too many requests. Try again later.',
        })
      }
      // L6 (§7.6): con el día gastado, 503 antes de llegar a better-auth, sin espera. Es el mismo para
      // cualquier correo, exista la cuenta o no.
      const kind = BUDGET_PATHS.get(ruta)
      if (kind !== undefined && !(await mailBudgetOpen(db, kind, ctx.mailDailyBudget, ahora))) {
        reply.header('content-type', 'application/json')
        return reply.status(503).send(MAIL_BUDGET_EXHAUSTED_BODY)
      }
    } else if (db !== undefined && SESSION_PASSWORD_PATHS.has(ruta)) {
      const sesion = await auth.api.getSession({ headers: toWebHeaders(request) })
      if (sesion !== null) {
        const r = await reserveSessionPassword(
          db,
          keys,
          { id: sesion.session.id, userId: sesion.user.id },
          ahora,
        )
        if (!r.ok) {
          // Pasado el tope diario de la sesión, se cierra esa sesión, no las otras del dueño (7-k).
          if (r.signedOut) await deleteSessionByToken(auth, sesion.session.token)
          return demasiados(reply, r.retryAfterS, {
            code: 'PASSWORD_ATTEMPTS_LOCKED',
            message: PASSWORD_ATTEMPTS_LOCKED_MESSAGE,
            ...(r.signedOut ? { signedOut: true } : {}),
          })
        }
        sesionL3 = {
          token: sesion.session.token,
          id: sesion.session.id,
          userId: sesion.user.id,
          email: sesion.user.email,
          dayCount: r.dayCount,
        }
        alAcertar.push(...r.keys)
        // Antes de reenviar: con el 200, better-auth borra las otras sesiones y sus filas quedarían con
        // `session_id` nulo, sin poder distinguirlas de las de sesión caducada (13-l).
        if (ruta === CHANGE_PASSWORD_PATH) avisosAntes = await pushTargetsOf(db, sesion.user.id)
      }
    }

    const response = await auth.handler(webRequest)

    if (db !== undefined && response.status === 200) {
      await clearAttempts(db, alAcertar)
      // `cs_device` (§7.5): al entrar, la entrada de ese correo; al recuperar, la del correo que apuntó
      // `onPasswordReset` (con el epoch ya subido); al cambiar la contraseña, se sube el epoch y se
      // reemite la de este navegador (5-j).
      let correoCookie: string | null = null
      if (ruta === SIGN_IN_PATH) correoCookie = correoEntrada
      else if (ruta === RESET_PASSWORD_PATH) correoCookie = resetRequests.get(webRequest) ?? null
      else if (ruta === CHANGE_PASSWORD_PATH && sesionL3 !== null) {
        await bumpDeviceEpoch(db, sesionL3.userId)
        correoCookie = sesionL3.email
      }
      // Borrada la cuenta (§10.4), su entrada sale de la `cs_device` de este navegador; las otras se quedan.
      if (ruta === DELETE_USER_PATH && sesionL3 !== null) {
        cookiesPropias.push(devices.forget(devices.read(request.headers.cookie), sesionL3.email))
      }
      if (correoCookie !== null) {
        const dueño = await deviceOwnerByEmail(db, correoCookie)
        if (dueño !== null) {
          cookiesPropias.push(
            devices.issue(devices.read(request.headers.cookie), correoCookie, dueño),
          )
          // LOS AVISOS DE SEGURIDAD (§13.7; 13-k), en segundo plano. Al entrar sin `cs_device` válida para
          // ese correo, `new_sign_in` a todas las filas de la cuenta. Al recuperar, se borran todas y
          // `password_changed` sale a esa copia: quien recupera no hereda las de un intruso (5-d).
          if (ruta === SIGN_IN_PATH && !aparatoConocido)
            ctx.notifier?.security(dueño.id, {
              kind: 'new_sign_in',
              deviceLabel: deviceLabel(request.headers['user-agent']),
            })
          if (ruta === RESET_PASSWORD_PATH) {
            const quitadas = await takePushTargets(db, dueño.id)
            ctx.notifier?.security(dueño.id, { kind: 'password_changed' }, quitadas)
          }
        }
      }
      // Al cambiar la contraseña (13-l): las de las otras sesiones se borran y reciben el aviso, las de sesión
      // nula lo reciben y se quedan, y la de este navegador no lo recibe.
      if (ruta === CHANGE_PASSWORD_PATH && sesionL3 !== null) {
        const propia = sesionL3.id
        const otras = avisosAntes.filter((t) => t.sessionId !== null && t.sessionId !== propia)
        await deletePushTargetsById(
          db,
          otras.map((t) => t.id),
        )
        const reciben = avisosAntes.filter((t) => t.sessionId !== propia)
        if (reciben.length > 0)
          ctx.notifier?.security(sesionL3.userId, { kind: 'password_changed' }, reciben)
      }
    } else if (
      db !== undefined &&
      sesionL3 !== null &&
      response.status !== 429 &&
      failureClosesSession(sesionL3.dayCount)
    ) {
      // El décimo fallo del día con esta sesión: se cierra y la web lleva a `/login` (§7.4; 7-k).
      await deleteSessionByToken(auth, sesionL3.token)
      return demasiados(reply, SESSION_PASSWORD_FAILS.lockS, {
        code: 'PASSWORD_ATTEMPTS_LOCKED',
        message: PASSWORD_ATTEMPTS_LOCKED_MESSAGE,
        signedOut: true,
      })
    }

    reply.status(response.status)
    for (const [key, value] of response.headers.entries()) {
      // La longitud la pone Fastify: el cuerpo puede cambiar aquí abajo.
      const nombre = key.toLowerCase()
      if (nombre === 'set-cookie' || nombre === 'content-length') continue
      reply.header(key, value)
    }
    for (const cookie of [...response.headers.getSetCookie(), ...cookiesPropias]) {
      reply.header('set-cookie', cookie)
    }
    if (response.ok && CLEARS_VIEWER_COOKIE.has(url.pathname)) {
      reply.header('set-cookie', viewerCookieHeader(null, ctx.secureCookies ?? false))
    }
    const body = await response.text()
    if (response.status === 403 && url.pathname === SIGN_IN_PATH && ctx.statusByEmail) {
      const email = correoDe(request.body)
      if (
        body.includes('"EMAIL_NOT_VERIFIED"') &&
        email !== null &&
        (await ctx.statusByEmail(email)) === 'pending'
      ) {
        reply.header('content-type', 'application/json')
        return reply.send(ACCOUNT_PENDING_BODY)
      }
    }
    if (response.status === 200 && url.pathname === SIGN_UP_PATH) {
      reply.header('content-type', 'application/json')
      return reply.send(SIGN_UP_OK_BODY)
    }
    if (!(response.headers.get('content-type') ?? '').includes('application/json')) {
      return reply.send(body.length > 0 ? body : null)
    }
    let cuerpo: unknown
    try {
      cuerpo = JSON.parse(body)
    } catch {
      return reply.send(body.length > 0 ? body : null)
    }
    // El techo de 90 días (docs/cuenta.md §6.1): la sesión que lo pasó responde `null` y se borra,
    // como hace `createCurrentUserId` con el resto de la API.
    const sesion = url.pathname === GET_SESSION_PATH ? sesionDe(cuerpo) : null
    if (sesion !== null && isPastSessionCeiling(sesion.createdAt)) {
      await deleteSessionByToken(auth, sesion.token)
      return reply.send('null')
    }
    return reply.send(JSON.stringify(scrubAuthJson(cuerpo)))
  }

  // Rutas de credenciales: mismo handler, límite estricto contra la fuerza bruta (security.ts).
  // find-my-way resuelve la ruta estática antes que el comodín, así que el resto de endpoints de
  // better-auth sigue pasando por el comodín sin cambios.
  for (const url of CREDENTIAL_AUTH_PATHS) {
    app.post(url, { config: { rateLimit: CREDENTIAL_RATE_LIMIT, spoiler: 'safe' } }, forwardToAuth)
  }

  /** La sesión de la petición, o null; la que pasó su techo de 90 días cuenta como ninguna (§6.1). */
  const sesionDePeticion = async (request: FastifyRequest) => {
    const sesion = await auth.api.getSession({ headers: toWebHeaders(request) })
    if (sesion === null) return null
    if (isPastSessionCeiling(sesion.session.createdAt)) {
      await deleteSessionByToken(auth, sesion.session.token)
      return null
    }
    return sesion
  }

  /**
   * `POST /api/auth/devices/sign-out-others` (docs/cuenta.md §6.5; 6-c, 6-g): cierra las otras sesiones de
   * la cuenta con `revokeOtherSessions`, sube `device_epoch` (las `cs_device` de los otros navegadores dejan
   * de valer), borra las claves `pw:` de las sesiones cerradas y reemite la `cs_device` de este navegador
   * con el epoch nuevo, sin tocar las entradas de las otras cuentas. Ruta propia de Fastify: vive bajo
   * `/api/auth` porque la cookie lleva `Path=/api/auth`. Antes borra los `push_targets` de las otras sesiones
   * (I-25).
   */
  app.post(
    '/api/auth/devices/sign-out-others',
    { config: { rateLimit: AUTH_RATE_LIMIT, spoiler: 'safe' } },
    async (request, reply) => {
      const sesion = await sesionDePeticion(request)
      if (sesion === null) return unauthorized(reply)
      const headers = toWebHeaders(request)
      const otras = (await auth.api.listSessions({ headers })).filter(
        (s) => s.token !== sesion.session.token,
      )
      // Sus avisos, antes que las sesiones: después quedarían con `session_id` nulo (I-25).
      if (db !== undefined)
        await deletePushTargetsOfSessions(
          db,
          otras.map((s) => s.id),
        )
      await auth.api.revokeOtherSessions({ headers })
      if (db !== undefined) {
        await bumpDeviceEpoch(db, sesion.user.id)
        // Solo las de las cerradas: borrar la de esta sesión dejaría reiniciar L3 a voluntad (§7.4).
        await clearAttempts(
          db,
          otras.map((s) => keys.pw(s.id)),
        )
        const dueño = await deviceOwnerByEmail(db, sesion.user.email)
        if (dueño !== null) {
          reply.header(
            'set-cookie',
            devices.issue(devices.read(request.headers.cookie), sesion.user.email, dueño),
          )
        }
      }
      return { ok: true, closed: otras.length }
    },
  )

  /**
   * `POST /api/auth/devices/forget` (§6.5; 6-h): quita de la `cs_device` la entrada del correo de la sesión
   * y deja las otras. No cierra la sesión: `Shared computer? Forget this device` llama después a `sign-out`.
   */
  app.post(
    '/api/auth/devices/forget',
    { config: { rateLimit: AUTH_RATE_LIMIT, spoiler: 'safe' } },
    async (request, reply) => {
      const sesion = await sesionDePeticion(request)
      if (sesion === null) return unauthorized(reply)
      reply.header(
        'set-cookie',
        devices.forget(devices.read(request.headers.cookie), sesion.user.email),
      )
      return { ok: true }
    },
  )

  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    config: { rateLimit: AUTH_RATE_LIMIT, spoiler: 'safe' },
    handler: forwardToAuth,
  })
}
