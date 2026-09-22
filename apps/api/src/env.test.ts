import { describe, expect, it } from 'vitest'
import { loadEnv, loadTickEnv } from './env.js'

const BASE = {
  DATABASE_URL: 'postgres://localhost:5432/cs',
  APP_URL: 'https://www.cyclingstar.app',
  SESSION_SECRET: 's'.repeat(32),
  ADMIN_TOKEN: 'a'.repeat(32),
}

describe('loadEnv: correo', () => {
  it('sin clave ni remitente arranca igual (desarrollo local)', () => {
    const env = loadEnv(BASE as NodeJS.ProcessEnv)
    expect(env.RESEND_API_KEY).toBeUndefined()
    expect(env.MAIL_FROM).toBeUndefined()
  })

  it('acepta las dos formas de remitente', () => {
    for (const from of ['no-reply@cyclingstar.app', 'Cycling Star <no-reply@cyclingstar.app>']) {
      const env = loadEnv({ ...BASE, RESEND_API_KEY: 're_x', MAIL_FROM: from } as NodeJS.ProcessEnv)
      expect(env.MAIL_FROM).toBe(from)
    }
  })

  /*
    Media configuración es peor que ninguna: el despliegue cree que manda correo y no manda
    ninguno, y sólo se descubre cuando alguien no recibe su enlace de recuperación.
  */
  it('rechaza la clave sin remitente', () => {
    expect(() => loadEnv({ ...BASE, RESEND_API_KEY: 're_x' } as NodeJS.ProcessEnv)).toThrow(
      /MAIL_FROM es obligatoria/,
    )
  })

  it('rechaza el remitente sin clave', () => {
    expect(() =>
      loadEnv({ ...BASE, MAIL_FROM: 'no-reply@cyclingstar.app' } as NodeJS.ProcessEnv),
    ).toThrow(/RESEND_API_KEY es obligatoria/)
  })

  /*
    Resend rechaza un remitente mal formado EN EL ENVÍO, no al configurarlo: el fallo aparecería
    cuando alguien ha pedido su contraseña y ya no está mirando. Se corta al arrancar.
  */
  it('rechaza un remitente que no es una dirección', () => {
    for (const from of ['no-reply', 'Cycling Star no-reply@x.app', '<no-reply@x.app', 'a@b']) {
      expect(() =>
        loadEnv({ ...BASE, RESEND_API_KEY: 're_x', MAIL_FROM: from } as NodeJS.ProcessEnv),
      ).toThrow(/MAIL_FROM/)
    }
  })
})

describe('loadTickEnv', () => {
  /* El servicio cron no manda correo: añadirle variables de correo sería configurarlo para nada. */
  it('sigue necesitando sólo la base de datos', () => {
    const env = loadTickEnv({ DATABASE_URL: 'postgres://x' } as NodeJS.ProcessEnv)
    expect(env).toEqual({ DATABASE_URL: 'postgres://x', TICK_INTERVAL_MINUTES: 360 })
  })
})
