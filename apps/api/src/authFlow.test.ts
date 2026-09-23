import { startTestDb, type TestDb } from '@cyclingstar/db/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createAuth } from './auth.js'
import type { MailMessage, Mailer } from './mailer.js'

/**
 * LOS TRES CORREOS, DE PUNTA A PUNTA Y CONTRA UNA BASE DE VERDAD.
 *
 * `auth.test.ts` comprueba que los callbacks están puestos; esto comprueba que better-auth LOS
 * LLAMA, que es otra cosa. La diferencia no es teórica: el cambio de correo llevaba tiempo
 * respondiendo `400 Verification email isn't enabled` porque la opción se llamaba
 * `sendChangeEmailVerification` —un nombre que no existe en better-auth 1.6— y encima el handler
 * de `/change-email` exige que exista `emailVerification.sendVerificationEmail`. Un doble de la
 * base no habría enseñado nada de eso: hace falta darse de alta, tener sesión y llamar a la ruta.
 *
 * La base es PGlite (Postgres en proceso, sin Docker) con TODAS las migraciones aplicadas, que es
 * la misma que usan los tests de integración de `packages/db`.
 */
describe('correo: el camino completo contra una base real', () => {
  let tdb: TestDb
  let auth: ReturnType<typeof createAuth>
  let sent: MailMessage[]

  const BASE = 'http://localhost:3000'
  const post = (path: string, body: unknown, cookie?: string) =>
    auth.handler(
      new Request(`${BASE}/api/auth${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // Como un navegador: toda petición del sitio lleva su Origin.
          origin: BASE,
          ...(cookie ? { cookie } : {}),
        },
        body: JSON.stringify(body),
      }),
    )

  beforeAll(async () => {
    tdb = await startTestDb()
    sent = []
    const mailer: Mailer = {
      async send(message) {
        sent.push(message)
        return true
      },
    }
    auth = createAuth(tdb.db, { secret: 's'.repeat(32), baseURL: BASE, mailer })
  }, 120_000)

  afterAll(async () => {
    await tdb?.close()
  })

  /** El enlace de un correo: la única URL absoluta del texto plano. */
  const linkIn = (m: MailMessage | undefined): string => {
    const url = m?.text.match(/https?:\/\/\S+/)?.[0]
    if (!url) throw new Error('el correo no trae enlace')
    return url
  }
  /** Abre un enlace del correo como lo haría un navegador (sin seguir la redirección). */
  const open = (url: string, cookie?: string) =>
    auth.handler(new Request(url, { headers: cookie ? { cookie } : {} }))
  const cookieOf = (res: Response) =>
    res.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ')

  it('al registrarse sale el correo de verificación y NO se abre sesión', async () => {
    const res = await post('/sign-up/email', {
      name: 'luis',
      email: 'luis@example.com',
      password: 'contrasena-larga',
      callbackURL: '/verify-email',
    })
    expect(res.status).toBe(200)
    expect(((await res.json()) as { token: string | null }).token).toBeNull()
    const verificacion = sent.find((m) => m.to === 'luis@example.com')
    expect(verificacion).toBeDefined()
    expect(verificacion!.text).toContain('/api/auth/verify-email?token=')
  })

  /*
    EL CORAZÓN DEL CAMBIO: sin confirmar no se entra. Y quien lo intenta no se queda a oscuras:
    le sale un enlace nuevo, que vuelve a la página de «confirmado» aunque el cliente no diga nada.
  */
  it('sin confirmar el correo no se entra, y el intento manda un enlace nuevo', async () => {
    sent.length = 0
    const res = await post('/sign-in/email', {
      email: 'luis@example.com',
      password: 'contrasena-larga',
    })
    expect(res.status).toBe(403)
    expect(((await res.json()) as { code: string }).code).toBe('EMAIL_NOT_VERIFIED')
    expect(sent).toHaveLength(1)
    expect(sent[0]!.to).toBe('luis@example.com')
    expect(new URL(linkIn(sent[0])).searchParams.get('callbackURL')).toBe('/verify-email')
  })

  /* Con la contraseña mala no sale nada: el reenvío no sirve para llenarle el buzón a otro. */
  it('con la contraseña equivocada no se reenvía nada', async () => {
    sent.length = 0
    const res = await post('/sign-in/email', {
      email: 'luis@example.com',
      password: 'otra-cosa-mala',
    })
    expect(res.status).toBe(401)
    expect(sent).toHaveLength(0)
  })

  it('abrir el enlace confirma el correo, abre sesión y deja entrar', async () => {
    sent.length = 0
    await post('/send-verification-email', {
      email: 'luis@example.com',
      callbackURL: '/verify-email',
    })
    const res = await open(linkIn(sent[0]))
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/verify-email')
    // autoSignInAfterVerification: el enlace deja la sesión puesta.
    expect(cookieOf(res)).toContain('session_token')

    const login = await post('/sign-in/email', {
      email: 'luis@example.com',
      password: 'contrasena-larga',
    })
    expect(login.status).toBe(200)
  })

  it('«he olvidado mi contraseña» manda el enlace con su token', async () => {
    sent.length = 0
    const res = await post('/request-password-reset', {
      email: 'luis@example.com',
      redirectTo: '/reset-password',
    })
    expect(res.status).toBe(200)
    expect(sent).toHaveLength(1)
    expect(sent[0]!.to).toBe('luis@example.com')
    expect(sent[0]!.text).toMatch(/\/api\/auth\/reset-password\/[^?\s]+\?callbackURL=/)
  })

  /*
    Y a una dirección que NO existe se le responde IGUAL y no sale ningún correo: si la respuesta
    cambiara, la pantalla de recuperar contraseña diría quién está registrado y quién no.
  */
  it('a un correo que no existe se le responde igual y no se manda nada', async () => {
    sent.length = 0
    const res = await post('/request-password-reset', {
      email: 'nadie@example.com',
      redirectTo: '/reset-password',
    })
    expect(res.status).toBe(200)
    expect(sent).toHaveLength(0)
  })

  /* La recuperación entera: enlace → página con token → contraseña nueva → se entra con ella. */
  it('el enlace de recuperación deja poner otra contraseña y entrar con ella', async () => {
    sent.length = 0
    await post('/request-password-reset', {
      email: 'luis@example.com',
      redirectTo: '/reset-password',
    })
    const res = await open(linkIn(sent[0]))
    expect(res.status).toBe(302)
    const location = res.headers.get('location') ?? ''
    expect(new URL(location, BASE).pathname).toBe('/reset-password')
    const token = new URL(location, BASE).searchParams.get('token')

    const reset = await post('/reset-password', { token, newPassword: 'contrasena-nueva' })
    expect(reset.status).toBe(200)
    const vieja = await post('/sign-in/email', {
      email: 'luis@example.com',
      password: 'contrasena-larga',
    })
    expect(vieja.status).toBe(401)
    const nueva = await post('/sign-in/email', {
      email: 'luis@example.com',
      password: 'contrasena-nueva',
    })
    expect(nueva.status).toBe(200)
  })

  /*
    El cambio de correo con la dirección actual YA confirmada: dos enlaces. El primero, a la VIEJA,
    aprueba (y frena a un intruso); el segundo, a la NUEVA, la verifica y es el que aplica el cambio.
    Hasta abrir el segundo, la cuenta sigue con su correo de siempre.
  */
  it('cambiar de correo exige aprobarlo en la vieja y verificar la nueva', async () => {
    const login = await post('/sign-in/email', {
      email: 'luis@example.com',
      password: 'contrasena-nueva',
    })
    expect(login.status).toBe(200)
    const cookie = cookieOf(login)
    expect(cookie).not.toBe('')

    sent.length = 0
    const res = await post(
      '/change-email',
      { newEmail: 'otro@example.com', callbackURL: '/verify-email' },
      cookie,
    )
    expect(res.status).toBe(200)
    expect(sent).toHaveLength(1)
    expect(sent[0]!.to).toBe('luis@example.com')
    expect(sent[0]!.text).toContain('otro@example.com')

    const aviso = linkIn(sent[0])
    sent.length = 0
    const aprobado = await open(aviso, cookie)
    expect(aprobado.status).toBe(302)
    expect(aprobado.headers.get('location')).toBe('/verify-email?step=approved')
    expect(sent).toHaveLength(1)
    expect(sent[0]!.to).toBe('otro@example.com')
    // El segundo enlace vuelve a la página de «hecho», no a la de «falta un paso».
    expect(new URL(linkIn(sent[0])).searchParams.get('callbackURL')).toBe('/verify-email')

    // Aún no ha cambiado: con el correo nuevo no se entra.
    const antes = await post('/sign-in/email', {
      email: 'otro@example.com',
      password: 'contrasena-nueva',
    })
    expect(antes.status).toBe(401)

    const hecho = await open(linkIn(sent[0]), cookie)
    expect(hecho.status).toBe(302)
    expect(hecho.headers.get('location')).toBe('/verify-email')

    const despues = await post('/sign-in/email', {
      email: 'otro@example.com',
      password: 'contrasena-nueva',
    })
    expect(despues.status).toBe(200)
  })
})

/**
 * EL «INVALID ORIGIN» DEL DÍA DE LA MIGRACIÓN, reproducido donde ocurrió: en el handler.
 *
 * El dueño estrenó dominio y el login dejó de funcionar. No era el dominio: era que la lista de
 * orígenes de confianza tenía UNA entrada, la de `APP_URL`, así que el navegador que llegaba desde
 * el otro nombre del mismo sitio se comía un error que no nombra ningún dominio.
 */
describe('orígenes de confianza, contra el handler de verdad', () => {
  let tdb: TestDb
  let auth: ReturnType<typeof createAuth>

  const APP = 'https://www.cyclingstar.app'
  /*
    La cookie NO es un detalle del test: better-auth solo comprueba el origen cuando la petición
    lleva cookies (`if (!(forceValidate || useCookies)) return`), que es justo el caso del
    navegador de alguien que ya ha estado en el sitio. Sin ella, la comprobación ni se ejecuta y
    este test no probaría nada.
  */
  const entrar = (origin: string) =>
    auth.handler(
      new Request(`${APP}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin,
          cookie: 'algo=1',
        },
        body: JSON.stringify({ email: 'origen@example.com', password: 'contrasena-larga' }),
      }),
    )

  beforeAll(async () => {
    tdb = await startTestDb()
    auth = createAuth(tdb.db, {
      secret: 's'.repeat(32),
      baseURL: APP,
      mailer: {
        async send() {
          return true
        },
      },
    })
    await auth.handler(
      new Request(`${APP}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: APP },
        body: JSON.stringify({
          name: 'origen',
          email: 'origen@example.com',
          password: 'contrasena-larga',
        }),
      }),
    )
    // Confirmada a mano: sin eso el login da 403 por EMAIL_NOT_VERIFIED, el mismo código que el
    // del origen rechazado, y este bloque dejaría de distinguir una cosa de la otra.
    await tdb.client`update users set email_verified = true where email = 'origen@example.com'`
  }, 120_000)

  afterAll(async () => {
    await tdb?.close()
  })

  it('desde el dominio de APP_URL se entra', async () => {
    expect((await entrar(APP)).status).toBe(200)
  })

  /* ESTE es el caso del dueño: el mismo sitio, sin el `www` delante. Antes, 403. */
  it('desde el MISMO sitio sin www también se entra', async () => {
    expect((await entrar('https://cyclingstar.app')).status).toBe(200)
  })

  /* Y el parecido no basta: la comparación es de ORIGEN EXACTO, no de prefijo. */
  it('desde un sitio ajeno que empieza igual NO se entra', async () => {
    const res = await entrar('https://cyclingstar.app.evil.example')
    expect(res.status).toBe(403)
  })
})
