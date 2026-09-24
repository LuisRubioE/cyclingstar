/**
 * Envío de correo transaccional por Resend.
 *
 * Hasta aquí la app no mandaba NINGÚN correo: no había dominio propio, así que «he olvidado mi
 * contraseña» no existía y el cambio de correo no podía verificarse. Con el dominio ya en pie,
 * esto es lo único que falta para que los tres flujos de better-auth (recuperar contraseña,
 * verificar el correo y confirmar su cambio) lleguen a un buzón.
 *
 * Se habla con la API HTTP de Resend directamente, sin su SDK: es UNA petición POST con un JSON
 * de cinco campos, y el SDK añadiría una dependencia (y su cadena de actualizaciones) para
 * envolver un `fetch`. A cambio, `fetchImpl` se inyecta y las pruebas no salen a la red.
 *
 * REGLA DE ORO: `send` NUNCA lanza. Quien lo llama es un callback de better-auth dentro de la
 * petición de un usuario; si el envío fallara hacia arriba, «he olvidado mi contraseña»
 * respondería 500 —y de paso diría, por la diferencia de respuesta, qué correos existen—. Un fallo
 * de envío se registra y devuelve `false`.
 */

/** Un correo ya compuesto y listo para salir. */
export interface MailMessage {
  to: string
  subject: string
  /** Versión de texto plano: la que leen los clientes que no pintan HTML, y la que no acaba en spam. */
  text: string
  html: string
}

/** `true` si el proveedor aceptó el correo; `false` si no se pudo enviar (ya registrado). */
export interface Mailer {
  send(message: MailMessage): Promise<boolean>
}

/** Traza mínima del envío, compatible con la forma de pino (`log(datos, mensaje)`). */
export type MailLog = (level: 'info' | 'error', data: Record<string, unknown>, msg: string) => void

export interface ResendMailerOptions {
  apiKey: string
  /** `correo@dominio` o `Nombre <correo@dominio>`, validado en env.ts. */
  from: string
  /** Inyectable en pruebas; por defecto el fetch global de Node. */
  fetchImpl?: typeof fetch
  log?: MailLog
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

/**
 * Corte del envío a 10 s. El callback se ejecuta DENTRO de la petición del usuario, así que un
 * proveedor colgado dejaría colgada también la pantalla de «recuperar contraseña».
 */
const TIMEOUT_MS = 10_000

// `console` y no el logger de Fastify: el mailer se construye ANTES que la app (index.ts lo
// necesita para crear better-auth), así que en ese momento no hay `app.log` todavía. Una línea
// JSON por envío, que es lo que Railway sabe leer.
const defaultLog: MailLog = (level, data, msg) => {
  console[level === 'error' ? 'error' : 'log'](JSON.stringify({ ...data, msg }))
}

/**
 * Oculta el buzón dejando la primera letra y el dominio: `luis@gmail.com` → `l***@gmail.com`.
 * Los logs de un despliegue se leen, se copian y se guardan; la dirección completa de alguien no
 * tiene por qué vivir ahí, y para diagnosticar «¿salió el correo?» basta con esto.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@')
  if (at <= 0) return '***'
  return `${email[0] ?? ''}***${email.slice(at)}`
}

/** Cuerpo del error de Resend, si lo hay, acotado: un log no es sitio para una respuesta entera. */
async function detailOf(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 300)
  } catch {
    return '(sin cuerpo)'
  }
}

export function createResendMailer(opts: ResendMailerOptions): Mailer {
  const doFetch = opts.fetchImpl ?? globalThis.fetch
  const log = opts.log ?? defaultLog
  return {
    async send(message) {
      const traza = { to: maskEmail(message.to), subject: message.subject }
      try {
        const response = await doFetch(RESEND_ENDPOINT, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${opts.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            from: opts.from,
            to: [message.to],
            subject: message.subject,
            text: message.text,
            html: message.html,
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })
        if (!response.ok) {
          log(
            'error',
            { ...traza, status: response.status, detail: await detailOf(response) },
            'correo rechazado por Resend',
          )
          return false
        }
        log('info', traza, 'correo enviado')
        return true
      } catch (err) {
        log('error', { ...traza, err: String(err) }, 'fallo al enviar el correo')
        return false
      }
    },
  }
}

/**
 * Mailer de los entornos SIN correo configurado (desarrollo local, o un despliegue todavía sin
 * clave). No inventa un envío: deja constancia de que el correo no salió y sigue.
 */
export function createNullMailer(log: MailLog = defaultLog): Mailer {
  return {
    async send(message) {
      log(
        'info',
        { to: maskEmail(message.to), subject: message.subject },
        'correo NO enviado: falta RESEND_API_KEY/MAIL_FROM',
      )
      return false
    },
  }
}

/**
 * Elige el mailer según el entorno. La pareja clave+remitente ya viene validada por env.ts, así
 * que aquí basta con mirar si está.
 */
export function createMailer(
  env: { RESEND_API_KEY?: string | undefined; MAIL_FROM?: string | undefined },
  extra: { fetchImpl?: typeof fetch; log?: MailLog } = {},
): Mailer {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) return createNullMailer(extra.log)
  return createResendMailer({
    apiKey: env.RESEND_API_KEY,
    from: env.MAIL_FROM,
    ...(extra.fetchImpl ? { fetchImpl: extra.fetchImpl } : {}),
    ...(extra.log ? { log: extra.log } : {}),
  })
}
