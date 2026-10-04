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

describe('loadEnv: el interruptor de la retransmisión (E2, §14.6)', () => {
  it('BROADCAST_WATCH vale off si no está: desplegar no enciende nada', () => {
    expect(loadEnv(BASE as NodeJS.ProcessEnv).BROADCAST_WATCH).toBe('off')
  })

  it('acepta off, admins y on, y nada más: un valor mal escrito no deja arrancar', () => {
    for (const mode of ['off', 'admins', 'on'])
      expect(loadEnv({ ...BASE, BROADCAST_WATCH: mode } as NodeJS.ProcessEnv).BROADCAST_WATCH).toBe(
        mode,
      )
    for (const mode of ['true', 'ON', 'admin'])
      expect(() => loadEnv({ ...BASE, BROADCAST_WATCH: mode } as NodeJS.ProcessEnv)).toThrow(
        /BROADCAST_WATCH/,
      )
  })
})

describe('loadEnv: el horizonte y el umbral del progreso (E2, §14.6 y 15-j; paso 7a)', () => {
  it('SPOILER_MODE vale off si no está: desplegar no enciende el velo', () => {
    expect(loadEnv(BASE as NodeJS.ProcessEnv).SPOILER_MODE).toBe('off')
  })

  it('SPOILER_MODE acepta off, admins y on, y nada más: un valor mal escrito no deja arrancar', () => {
    for (const mode of ['off', 'admins', 'on'])
      expect(loadEnv({ ...BASE, SPOILER_MODE: mode } as NodeJS.ProcessEnv).SPOILER_MODE).toBe(mode)
    for (const mode of ['true', 'ON', 'admin'])
      expect(() => loadEnv({ ...BASE, SPOILER_MODE: mode } as NodeJS.ProcessEnv)).toThrow(
        /SPOILER_MODE/,
      )
  })

  it('PROGRESS_MIN_DELTA_S es opcional: sin ella manda BROADCAST.progressMinDeltaS', () => {
    expect(loadEnv(BASE as NodeJS.ProcessEnv).PROGRESS_MIN_DELTA_S).toBeUndefined()
    expect(
      loadEnv({ ...BASE, PROGRESS_MIN_DELTA_S: '300' } as NodeJS.ProcessEnv).PROGRESS_MIN_DELTA_S,
    ).toBe(300)
    for (const v of ['-1', '1.5', 'mucho'])
      expect(() => loadEnv({ ...BASE, PROGRESS_MIN_DELTA_S: v } as NodeJS.ProcessEnv)).toThrow(
        /PROGRESS_MIN_DELTA_S/,
      )
  })
})

describe('loadEnv: la grabación de la línea y el tick dentro de web (E2, §14.6 y 18-k; paso 5)', () => {
  it('TIMELINE_RECORD vale on si no está: desde el paso 5 el tick graba', () => {
    expect(loadEnv(BASE as NodeJS.ProcessEnv).TIMELINE_RECORD).toBe('on')
  })

  it('TIMELINE_RECORD acepta off y on, y nada más', () => {
    for (const mode of ['off', 'on'])
      expect(loadEnv({ ...BASE, TIMELINE_RECORD: mode } as NodeJS.ProcessEnv).TIMELINE_RECORD).toBe(
        mode,
      )
    for (const mode of ['true', 'ON', 'admins'])
      expect(() => loadEnv({ ...BASE, TIMELINE_RECORD: mode } as NodeJS.ProcessEnv)).toThrow(
        /TIMELINE_RECORD/,
      )
  })

  it('AUTO_TICK vale on si no está (web avanza el mundo, como hoy) y acepta off', () => {
    expect(loadEnv(BASE as NodeJS.ProcessEnv).AUTO_TICK).toBe('on')
    expect(loadEnv({ ...BASE, AUTO_TICK: 'off' } as NodeJS.ProcessEnv).AUTO_TICK).toBe('off')
    for (const mode of ['false', 'OFF', 'admins'])
      expect(() => loadEnv({ ...BASE, AUTO_TICK: mode } as NodeJS.ProcessEnv)).toThrow(/AUTO_TICK/)
  })
})

describe('loadTickEnv', () => {
  /*
    El servicio cron no manda correo: añadirle variables de correo sería configurarlo para nada.
    RE-SELLADO en E2, paso 5: el cron también lee TIMELINE_RECORD (corre el tick, que es quien graba,
    §14.6), con `on` por defecto; sigue arrancando con la base de datos sola.
  */
  it('sigue necesitando sólo la base de datos', () => {
    const env = loadTickEnv({ DATABASE_URL: 'postgres://x' } as NodeJS.ProcessEnv)
    expect(env).toEqual({
      DATABASE_URL: 'postgres://x',
      TICK_INTERVAL_MINUTES: 360,
      TIMELINE_RECORD: 'on',
    })
  })

  it('TIMELINE_RECORD=off apaga la grabación en el cron, y un valor mal escrito no deja arrancar', () => {
    expect(
      loadTickEnv({ DATABASE_URL: 'postgres://x', TIMELINE_RECORD: 'off' } as NodeJS.ProcessEnv)
        .TIMELINE_RECORD,
    ).toBe('off')
    expect(() =>
      loadTickEnv({ DATABASE_URL: 'postgres://x', TIMELINE_RECORD: 'no' } as NodeJS.ProcessEnv),
    ).toThrow(/TIMELINE_RECORD/)
  })
})
