import { describe, expect, it } from 'vitest'
import type { Database } from '@cyclingstar/db'
import { createAuth } from './auth.js'
import type { MailMessage, Mailer } from './mailer.js'

const USER = {
  id: 'u1',
  email: 'luis@example.com',
  name: 'luis',
  emailVerified: false,
  createdAt: new Date(0),
  updatedAt: new Date(0),
}

/** Mailer de prueba: guarda lo que se le manda y no sale a ninguna parte. */
function spyMailer(): Mailer & { sent: MailMessage[] } {
  const sent: MailMessage[] = []
  return {
    sent,
    async send(message) {
      sent.push(message)
      return true
    },
  }
}

function auth(mailer: Mailer) {
  // La base de datos no se toca: sólo se leen las opciones con las que se construyó better-auth,
  // que es donde viven los tres callbacks de correo.
  return createAuth({} as unknown as Database, {
    secret: 's'.repeat(32),
    baseURL: 'https://www.cyclingstar.app',
    mailer,
  })
}

/*
  Estas pruebas sellan EL CABLEADO, no las plantillas. Un callback que falta no se ve al compilar
  ni al arrancar: better-auth registra una línea y devuelve un error al usuario. Así pasó con el
  cambio de correo, que llevaba respondiendo 400 «Verification email isn't enabled» desde que
  better-auth 1.6 pidió `sendVerificationEmail` para ese flujo.
*/
describe('createAuth: correos', () => {
  it('manda el enlace de recuperación a la dirección del usuario', async () => {
    const mailer = spyMailer()
    const opciones = auth(mailer).options
    await opciones.emailAndPassword!.sendResetPassword!({
      user: USER,
      url: 'https://www.cyclingstar.app/api/auth/reset-password/tok?callbackURL=%2Freset-password',
      token: 'tok',
    })

    expect(mailer.sent).toHaveLength(1)
    expect(mailer.sent[0]!.to).toBe('luis@example.com')
    expect(mailer.sent[0]!.text).toContain('/reset-password/tok')
  })

  it('manda el enlace de verificación a la dirección del usuario', async () => {
    const mailer = spyMailer()
    const opciones = auth(mailer).options
    await opciones.emailVerification!.sendVerificationEmail!({
      user: USER,
      url: 'https://www.cyclingstar.app/api/auth/verify-email?token=tok&callbackURL=%2Fverify-email',
      token: 'tok',
    })

    expect(mailer.sent[0]!.to).toBe('luis@example.com')
    expect(mailer.sent[0]!.text).toContain('verify-email?token=tok')
  })

  /* El aviso de cambio va a la dirección ACTUAL: es lo que permite frenar un cambio no pedido. */
  it('el aviso de cambio de correo va a la dirección vieja y nombra la nueva', async () => {
    const mailer = spyMailer()
    const opciones = auth(mailer).options
    await opciones.user!.changeEmail!.sendChangeEmailConfirmation!({
      user: USER,
      newEmail: 'otro@example.com',
      url: 'https://www.cyclingstar.app/api/auth/verify-email?token=tok&callbackURL=%2Faccount',
      token: 'tok',
    })

    expect(mailer.sent[0]!.to).toBe('luis@example.com')
    expect(mailer.sent[0]!.text).toContain('otro@example.com')
  })

  /*
    Verificar SE PIDE pero NO SE EXIGE: todas las cuentas que ya existen tienen el correo sin
    verificar, y exigirlo las dejaría fuera de su propio equipo de un despliegue para otro.
  */
  it('pide verificación al registrarse y no la exige para entrar', () => {
    const opciones = auth(spyMailer()).options
    expect(opciones.emailVerification!.sendOnSignUp).toBe(true)
    // `requireEmailVerification` ni siquiera está puesta: se comprueba la AUSENCIA, que es lo que
    // garantiza el defecto (falso) y lo que se rompería si alguien la añadiera sin pensarlo.
    expect(Object.hasOwn(opciones.emailAndPassword as object, 'requireEmailVerification')).toBe(
      false,
    )
  })

  it('las cookies de sesión son seguras tras https y no lo son en local', () => {
    const https = auth(spyMailer()).options
    expect(https.advanced!.useSecureCookies).toBe(true)
    const local = createAuth({} as unknown as Database, {
      secret: 's'.repeat(32),
      baseURL: 'http://localhost:3000',
      mailer: spyMailer(),
    }).options
    expect(local.advanced!.useSecureCookies).toBe(false)
  })
})

/*
  La lista de rutas con límite estricto nombraba `/api/auth/forget-password`, que better-auth 1.6
  ya no sirve: el límite protegía una puerta tapiada. Un nombre de ruta equivocado no lo detecta
  nadie —Fastify la registra igual y devuelve 404 desde better-auth—, así que se comprueba contra
  las rutas que la librería REALMENTE publica.
*/
describe('CREDENTIAL_AUTH_PATHS', () => {
  it('todas las rutas con límite estricto existen en better-auth', async () => {
    const { CREDENTIAL_AUTH_PATHS } = await import('./security.js')
    const endpoints = auth(spyMailer()).api as Record<string, { path?: string }>
    const servidas = new Set(
      Object.values(endpoints)
        .map((endpoint) => endpoint?.path)
        .filter((path): path is string => typeof path === 'string'),
    )
    for (const url of CREDENTIAL_AUTH_PATHS) {
      expect(servidas).toContain(url.replace('/api/auth', ''))
    }
  })
})
