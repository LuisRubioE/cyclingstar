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

  it('al registrarse sale el correo de verificación', async () => {
    const res = await post('/sign-up/email', {
      name: 'luis',
      email: 'luis@example.com',
      password: 'contrasena-larga',
      callbackURL: '/verify-email',
    })
    expect(res.status).toBe(200)
    const verificacion = sent.find((m) => m.to === 'luis@example.com')
    expect(verificacion).toBeDefined()
    expect(verificacion!.text).toContain('/api/auth/verify-email?token=')
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

  /*
    EL DEFECTO QUE ESTO SELLA. Con `sendChangeEmailVerification` (el nombre que no existe) y sin
    `emailVerification.sendVerificationEmail`, esta llamada devolvía 400 «Verification email isn't
    enabled»: el formulario de ajustes fallaba SIEMPRE.
  */
  it('cambiar de correo ya no responde 400: manda el enlace a la dirección nueva', async () => {
    const login = await post('/sign-in/email', {
      email: 'luis@example.com',
      password: 'contrasena-larga',
    })
    expect(login.status).toBe(200)
    const cookie = login.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ')
    expect(cookie).not.toBe('')

    sent.length = 0
    const res = await post(
      '/change-email',
      { newEmail: 'otro@example.com', callbackURL: '/verify-email' },
      cookie,
    )
    expect(res.status).toBe(200)
    // El correo de la cuenta sigue sin verificar, así que el enlace va a la dirección NUEVA: hasta
    // que lo abra, el cambio no se aplica.
    expect(sent).toHaveLength(1)
    expect(sent[0]!.to).toBe('otro@example.com')
    expect(sent[0]!.text).toContain('/api/auth/verify-email?token=')
  })
})
