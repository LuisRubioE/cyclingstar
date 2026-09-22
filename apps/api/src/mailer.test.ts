import { describe, expect, it } from 'vitest'
import { createMailer, createNullMailer, createResendMailer, maskEmail } from './mailer.js'
import type { MailLog } from './mailer.js'

const MAIL = {
  to: 'luis@example.com',
  subject: 'Reset your password',
  text: 'link',
  html: '<p>link</p>',
}

/** Recoge las trazas del mailer para poder comprobarlas (y para no ensuciar la salida del test). */
function recorder(): {
  log: MailLog
  lines: { level: string; data: Record<string, unknown>; msg: string }[]
} {
  const lines: { level: string; data: Record<string, unknown>; msg: string }[] = []
  return { log: (level, data, msg) => lines.push({ level, data, msg }), lines }
}

describe('maskEmail', () => {
  it('deja la inicial y el dominio, no la dirección', () => {
    expect(maskEmail('luis@example.com')).toBe('l***@example.com')
  })

  it('no deja pasar entera una cadena que no es un correo', () => {
    expect(maskEmail('sin-arroba')).toBe('***')
    expect(maskEmail('@example.com')).toBe('***')
  })
})

describe('createResendMailer', () => {
  it('manda UNA petición a Resend con el remitente, el destinatario y las dos versiones', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} })
      return new Response(JSON.stringify({ id: 'abc' }), { status: 200 })
    }) as unknown as typeof fetch

    const mailer = createResendMailer({
      apiKey: 'clave',
      from: 'Cycling Star <no-reply@cyclingstar.app>',
      fetchImpl,
      log: () => {},
    })
    expect(await mailer.send(MAIL)).toBe(true)

    expect(calls).toHaveLength(1)
    const call = calls[0]!
    expect(call.url).toBe('https://api.resend.com/emails')
    expect(call.init.method).toBe('POST')
    const headers = call.init.headers as Record<string, string>
    expect(headers.authorization).toBe('Bearer clave')
    expect(JSON.parse(String(call.init.body))).toEqual({
      from: 'Cycling Star <no-reply@cyclingstar.app>',
      to: ['luis@example.com'],
      subject: 'Reset your password',
      text: 'link',
      html: '<p>link</p>',
    })
  })

  it('NO lanza cuando Resend rechaza: devuelve false y lo registra', async () => {
    const { log, lines } = recorder()
    const fetchImpl = (async () =>
      new Response('{"message":"domain not verified"}', { status: 403 })) as unknown as typeof fetch
    const mailer = createResendMailer({ apiKey: 'k', from: 'a@b.com', fetchImpl, log })

    expect(await mailer.send(MAIL)).toBe(false)
    expect(lines).toHaveLength(1)
    expect(lines[0]!.level).toBe('error')
    expect(lines[0]!.data.status).toBe(403)
    expect(String(lines[0]!.data.detail)).toContain('domain not verified')
  })

  /*
    Esta es LA prueba del módulo. El callback corre dentro de la petición del usuario: si un fallo
    de red subiera, «he olvidado mi contraseña» respondería 500 y, de paso, respondería distinto
    según el correo existiera o no.
  */
  it('NO lanza cuando la red falla', async () => {
    const { log, lines } = recorder()
    const fetchImpl = (async () => {
      throw new Error('ECONNRESET')
    }) as unknown as typeof fetch
    const mailer = createResendMailer({ apiKey: 'k', from: 'a@b.com', fetchImpl, log })

    expect(await mailer.send(MAIL)).toBe(false)
    expect(String(lines[0]!.data.err)).toContain('ECONNRESET')
  })

  it('la traza lleva el buzón oculto, nunca la dirección entera', async () => {
    const { log, lines } = recorder()
    const fetchImpl = (async () => new Response('{}', { status: 200 })) as unknown as typeof fetch
    const mailer = createResendMailer({ apiKey: 'k', from: 'a@b.com', fetchImpl, log })

    await mailer.send(MAIL)
    expect(JSON.stringify(lines)).not.toContain('luis@example.com')
    expect(lines[0]!.data.to).toBe('l***@example.com')
  })

  it('corta el envío si el proveedor se cuelga (lleva señal de aborto)', async () => {
    let signal: AbortSignal | undefined
    const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
      signal = init?.signal as AbortSignal | undefined
      return new Response('{}', { status: 200 })
    }) as unknown as typeof fetch
    const mailer = createResendMailer({ apiKey: 'k', from: 'a@b.com', fetchImpl, log: () => {} })

    await mailer.send(MAIL)
    expect(signal).toBeInstanceOf(AbortSignal)
  })
})

describe('createNullMailer', () => {
  it('no inventa un envío: devuelve false y deja dicho que falta la configuración', async () => {
    const { log, lines } = recorder()
    expect(await createNullMailer(log).send(MAIL)).toBe(false)
    expect(lines[0]!.msg).toContain('NO enviado')
  })
})

describe('createMailer', () => {
  it('sin clave ni remitente no sale a la red', async () => {
    let salio = false
    const fetchImpl = (async () => {
      salio = true
      return new Response('{}', { status: 200 })
    }) as unknown as typeof fetch

    const mailer = createMailer({}, { fetchImpl, log: () => {} })
    expect(await mailer.send(MAIL)).toBe(false)
    expect(salio).toBe(false)
  })

  it('con clave y remitente envía por Resend', async () => {
    let salio = false
    const fetchImpl = (async () => {
      salio = true
      return new Response('{}', { status: 200 })
    }) as unknown as typeof fetch

    const mailer = createMailer(
      { RESEND_API_KEY: 'k', MAIL_FROM: 'a@b.com' },
      { fetchImpl, log: () => {} },
    )
    expect(await mailer.send(MAIL)).toBe(true)
    expect(salio).toBe(true)
  })

  /*
    Media configuración es una trampa: env.ts la rechaza al arrancar, pero si algún día esa
    validación cambiara, aquí NO se envía a ciegas con un remitente inventado.
  */
  it('con clave pero sin remitente no envía', async () => {
    const mailer = createMailer({ RESEND_API_KEY: 'k' }, { log: () => {} })
    expect(await mailer.send(MAIL)).toBe(false)
  })
})
