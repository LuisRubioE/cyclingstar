import { riders, teams, verifications, worlds } from '@cyclingstar/db'
import { startTestDb, type TestDb } from '@cyclingstar/db/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { createAuth } from './auth.js'
import type { MailMessage, Mailer } from './mailer.js'
import { createMailQueue } from './mailQueue.js'

/**
 * LOS CORREOS DE CUENTA, DE PUNTA A PUNTA Y CONTRA UNA BASE DE VERDAD.
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
/*
  PGlite admite UNA sesión (testDb.ts), y los correos de better-auth, en segundo plano, leen el estado de la
  cuenta (docs/cuenta.md §4.9) mientras sigue la petición siguiente: una sola conexión para todo el fichero.
*/
const poolBefore = process.env.DB_POOL_MAX
beforeAll(() => {
  process.env.DB_POOL_MAX = '1'
})
afterAll(() => {
  if (poolBefore === undefined) delete process.env.DB_POOL_MAX
  else process.env.DB_POOL_MAX = poolBefore
})

/**
 * Aquí las cuentas cuentan como aprobadas (`statusOf`): lo que se sella es el camino de los correos de una
 * cuenta que ya puede jugar. La puerta del registro por aprobación la sella `signupApproval.test.ts`.
 */
const APROBADA = { statusOf: async () => 'approved' as const }

describe('correo: el camino completo contra una base real', () => {
  let tdb: TestDb
  let auth: ReturnType<typeof createAuth>
  let sent: MailMessage[]

  const BASE = 'http://localhost:3000'
  // Los correos salen después de responder (`backgroundTasks`): cada llamada espera a la cola, así
  // que lo enviado ya está en `sent` al volver.
  const queue = createMailQueue()
  const post = async (path: string, body: unknown, cookie?: string) => {
    const res = await auth.handler(
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
    await queue.drain()
    return res
  }

  beforeAll(async () => {
    tdb = await startTestDb()
    sent = []
    const mailer: Mailer = {
      async send(message) {
        sent.push(message)
        return true
      },
    }
    auth = createAuth(tdb.db, {
      secret: 's'.repeat(32),
      baseURL: BASE,
      mailer,
      mailQueue: queue,
      ...APROBADA,
    })
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
  /** El token del fragmento (`#token=`), como lo lee la página de botón (docs/cuenta.md §5.2). */
  const tokenIn = (m: MailMessage | undefined): string =>
    new URLSearchParams(new URL(linkIn(m)).hash.slice(1)).get('token') ?? ''
  /** Abre un enlace del correo como lo haría un navegador (sin seguir la redirección). */
  const open = async (url: string, cookie?: string) => {
    const res = await auth.handler(new Request(url, { headers: cookie ? { cookie } : {} }))
    await queue.drain()
    return res
  }
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
    expect(verificacion!.text).toContain(`${BASE}/verify-email#token=`)
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
    expect(new URL(linkIn(sent[0])).pathname).toBe('/verify-email')
    expect(new URL(linkIn(sent[0])).hash).toMatch(/^#token=/)
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

  /* Lo que arma `POST /api/account/verify-email` dentro del proceso: el GET sin `callbackURL` (§5.2). */
  it('confirmar con el token del enlace abre sesión y deja entrar', async () => {
    sent.length = 0
    await post('/send-verification-email', {
      email: 'luis@example.com',
      callbackURL: '/verify-email',
    })
    const res = await open(`${BASE}/api/auth/verify-email?token=${tokenIn(sent[0])}`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: true, user: null })
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
    expect(sent[0]!.text).toMatch(/\/reset-password#token=\w+\n/)
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
    const token = tokenIn(sent[0])

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
    El cambio de correo de autoservicio ya no existe (docs/cuenta.md §5.5): lo hace un administrador desde
    el panel. Incluso sin el proxy delante, better-auth da 404 (`disabledPaths`) y no sale nada.
  */
  it('change-email da 404 y no manda nada', async () => {
    const login = await post('/sign-in/email', {
      email: 'luis@example.com',
      password: 'contrasena-nueva',
    })
    expect(login.status).toBe(200)
    sent.length = 0
    const res = await post(
      '/change-email',
      { newEmail: 'otro@example.com', callbackURL: '/verify-email' },
      cookieOf(login),
    )
    expect(res.status).toBe(404)
    expect(sent).toHaveLength(0)
  })

  /*
    El 429 dice cuánto esperar (docs/cuenta.md §7.2 y §12.3; D-25): la web lo traduce con `authErrorText` y
    pone la cuenta atrás en el botón. Contra la app de verdad, con el better-auth de verdad detrás: el límite
    de las rutas de credenciales (10 cada 5 minutos por IP y ruta) corta antes de llegar a él.
  */
  it('el 429 de Fastify trae message y retryAfterS sin romper el formato { ok, error }', async () => {
    const app = buildApp({ migrationsApplied: true, serveWeb: false, auth })
    try {
      let last = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in/email',
        headers: { origin: BASE },
        payload: { email: 'nadie@example.com', password: 'intento-0' },
      })
      for (let i = 1; i < 20 && last.statusCode !== 429; i++) {
        last = await app.inject({
          method: 'POST',
          url: '/api/auth/sign-in/email',
          headers: { origin: BASE },
          payload: { email: 'nadie@example.com', password: `intento-${i}` },
        })
      }
      expect(last.statusCode).toBe(429)
      const body = last.json() as Record<string, unknown>
      expect(body).toMatchObject({ ok: false, error: 'demasiadas_peticiones' })
      expect(typeof body.message).toBe('string')
      expect(body.retryAfterS).toEqual(expect.any(Number))
      const espera = body.retryAfterS as number
      expect(Number.isInteger(espera)).toBe(true)
      expect(espera).toBeGreaterThan(0)
      expect(espera).toBeLessThanOrEqual(300)
      // la cabecera dice lo mismo que el cuerpo
      expect(Number(last.headers['retry-after'])).toBe(espera)
    } finally {
      await app.close()
    }
  }, 60_000)
})

/**
 * BORRAR LA CUENTA: se va la persona, se quedan su corredor y su equipo, ya como NPC.
 *
 * Contra la base real porque lo que puede fallar es justo lo que un doble no ve: `riders.user_id` y
 * `teams.owner_user_id` apuntan a `users` SIN cascada, así que sin soltarlos antes el DELETE revienta
 * por clave foránea. Y la contraseña: sin ella, better-auth deja borrar con una sesión reciente.
 */
describe('borrar la cuenta, contra una base real', () => {
  let tdb: TestDb
  let auth: ReturnType<typeof createAuth>
  let cookie = ''
  let riderId = ''
  let teamId = ''

  const BASE = 'http://localhost:3000'
  const post = (path: string, body: unknown) =>
    auth.handler(
      new Request(`${BASE}/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: BASE, cookie },
        body: JSON.stringify(body),
      }),
    )

  beforeAll(async () => {
    tdb = await startTestDb()
    auth = createAuth(tdb.db, {
      secret: 's'.repeat(32),
      baseURL: BASE,
      mailer: {
        async send() {
          return true
        },
      },
    })
    await post('/sign-up/email', {
      name: 'primario',
      email: 'primario@example.com',
      password: 'contrasena-larga',
    })
    await tdb.client`update users set email_verified = true where email = 'primario@example.com'`
    const login = await post('/sign-in/email', {
      email: 'primario@example.com',
      password: 'contrasena-larga',
    })
    cookie = login.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ')

    const [fila] = await tdb.client<{ id: string }[]>`
      select id from users where email = 'primario@example.com'`
    const userId = fila!.id
    const [world] = await tdb.db
      .insert(worlds)
      .values({ worldSeed: 'semilla-borrado', engineVersion: 1 })
      .returning({ id: worlds.id })
    const [team] = await tdb.db
      .insert(teams)
      .values({
        worldId: world!.id,
        ownerUserId: userId,
        name: 'Equipo del que se va',
        division: 'CON',
        philosophy: 'cantera',
        jerseySeed: 'j',
        country: 'ES',
        budget: 1_000_000,
      })
      .returning({ id: teams.id })
    const [rider] = await tdb.db
      .insert(riders)
      .values({
        worldId: world!.id,
        userId,
        teamId: team!.id,
        name: 'Corredor del que se va',
        country: 'ES',
        gender: 'M',
        birthSeason: 1,
        archetype: 'escalada',
        faceSeed: 'cara',
      })
      .returning({ id: riders.id })
    teamId = team!.id
    riderId = rider!.id
  }, 120_000)

  afterAll(async () => {
    await tdb?.close()
  })

  /** Un recuento: la columna `n` de la primera fila. */
  const count = async (q: PromiseLike<{ n: number }[]>): Promise<number> => (await q)[0]!.n

  it('sin contraseña no se borra nada', async () => {
    const res = await post('/delete-user', {})
    expect(res.status).toBe(400)
    const n = await count(tdb.client<{ n: number }[]>`select count(*)::int as n from users`)
    expect(n).toBe(1)
  })

  it('con la contraseña equivocada tampoco', async () => {
    const res = await post('/delete-user', { password: 'no-es-esta' })
    expect(res.status).toBe(400)
    const n = await count(tdb.client<{ n: number }[]>`select count(*)::int as n from users`)
    expect(n).toBe(1)
  })

  it('con la contraseña se borra la cuenta, y corredor y equipo quedan como NPC', async () => {
    const res = await post('/delete-user', { password: 'contrasena-larga' })
    expect(res.status).toBe(200)

    const n = await count(tdb.client<{ n: number }[]>`select count(*)::int as n from users`)
    expect(n).toBe(0)
    const s = await count(tdb.client<{ n: number }[]>`select count(*)::int as n from sessions`)
    expect(s).toBe(0)

    const [rider] = await tdb.client<{ user_id: string | null; team_id: string | null }[]>`
      select user_id, team_id from riders where id = ${riderId}`
    expect(rider).toEqual({ user_id: null, team_id: teamId })
    const [team] = await tdb.client<{ owner_user_id: string | null }[]>`
      select owner_user_id from teams where id = ${teamId}`
    expect(team).toEqual({ owner_user_id: null })
  })

  /* El caso que lo motivó: borrada la cuenta, su correo queda libre para otra. */
  it('el correo de la cuenta borrada vuelve a estar libre', async () => {
    cookie = ''
    const res = await post('/sign-up/email', {
      name: 'otra',
      email: 'primario@example.com',
      password: 'contrasena-larga',
    })
    expect(res.status).toBe(200)
    const n = await count(tdb.client<{ n: number }[]>`
      select count(*)::int as n from users where email = 'primario@example.com'`)
    expect(n).toBe(1)
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

/**
 * LO QUE TRAE EL PR 3 DE E4 (docs/cuenta.md §5.4, §6.1, §6.3), contra una base real y por el proxy.
 *
 * Recuperar la contraseña cierra todas las sesiones y deja sin valor los otros enlaces; la tabla
 * `verifications` no guarda el enlace en claro; ningún cuerpo de `/api/auth/*` lleva el token de la
 * cookie de sesión; y el enlace de verificación sigue abriendo sesión con todo eso puesto.
 */
describe('recuperar, sesiones y cuerpos: el PR 3 de E4', () => {
  let tdb: TestDb
  let auth: ReturnType<typeof createAuth>
  let app: ReturnType<typeof buildApp>
  const sent: MailMessage[] = []
  const queue = createMailQueue()
  const BASE = 'http://localhost:3000'
  /** Todos los cuerpos que han salido del proxy en este bloque. */
  const cuerpos: string[] = []

  beforeAll(async () => {
    tdb = await startTestDb()
    auth = createAuth(tdb.db, {
      secret: 's'.repeat(32),
      baseURL: BASE,
      mailer: {
        async send(message) {
          sent.push(message)
          return true
        },
      },
      mailQueue: queue,
      ...APROBADA,
    })
    app = buildApp({ migrationsApplied: true, serveWeb: false, auth })
  }, 120_000)

  afterAll(async () => {
    await app?.close()
    await tdb?.close()
  })

  /** Una petición por el proxy, como la haría el navegador; espera a la cola de correo. */
  const call = async (method: 'GET' | 'POST', path: string, body?: unknown, cookie?: string) => {
    const res = await app.inject({
      method,
      url: `/api/auth${path}`,
      headers: { origin: BASE, ...(cookie ? { cookie } : {}) },
      ...(body === undefined ? {} : { payload: body as Record<string, unknown> }),
    })
    await queue.drain()
    cuerpos.push(res.body)
    return res
  }
  const linkIn = (m: MailMessage | undefined): string => {
    const url = m?.text.match(/https?:\/\/\S+/)?.[0]
    if (!url) throw new Error('el correo no trae enlace')
    return url
  }
  /** El token del fragmento (`#token=`), como lo lee la página de botón (docs/cuenta.md §5.2). */
  const tokenIn2 = (m: MailMessage | undefined): string =>
    new URLSearchParams(new URL(linkIn(m)).hash.slice(1)).get('token') ?? ''
  /** El botón de `VerifyEmail`: el token en el cuerpo de `POST /api/account/verify-email`. */
  const confirm = async (token: string) => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/account/verify-email',
      headers: { origin: BASE, 'content-type': 'application/json' },
      payload: JSON.stringify({ token }),
    })
    cuerpos.push(res.body)
    return res
  }
  const cookieOf = (res: { headers: Record<string, unknown> }): string => {
    const raw = res.headers['set-cookie']
    const lista = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : []
    const cookie = lista
      .map((c: string) => c.split(';')[0]!)
      .filter((c) => c.includes('session_token=') && !c.endsWith('='))
      .join('; ')
    if (cookie !== '') tokensVistos.add(tokenOf(cookie))
    return cookie
  }
  /** El token de la sesión: lo que va antes de la firma en el valor de la cookie. */
  const tokenOf = (cookie: string): string =>
    decodeURIComponent(cookie.split('=')[1] ?? '').split('.')[0] ?? ''
  /** Los tokens de todas las cookies de sesión que han salido en este bloque. */
  const tokensVistos = new Set<string>()
  /** Pide un enlace de recuperación y devuelve su token. */
  const resetToken = async (): Promise<string> => {
    sent.length = 0
    await call('POST', '/request-password-reset', {
      email: 'eva@example.com',
      redirectTo: '/reset-password',
    })
    const token = tokenIn2(sent[0])
    if (!token) throw new Error('sin token')
    return token
  }

  let sesionDelEnlace = ''

  it('el enlace de verificación sigue abriendo sesión', async () => {
    const alta = await call('POST', '/sign-up/email', {
      name: 'eva',
      email: 'eva@example.com',
      password: 'contrasena-larga',
      callbackURL: '/verify-email',
    })
    expect(alta.statusCode).toBe(200)
    const res = await confirm(tokenIn2(sent.find((m) => m.to === 'eva@example.com')))
    expect(res.statusCode).toBe(200)
    sesionDelEnlace = cookieOf(res)
    expect(sesionDelEnlace).toContain('session_token=')
    const sesion = await call('GET', '/get-session', undefined, sesionDelEnlace)
    expect((sesion.json() as { user: { email: string } }).user.email).toBe('eva@example.com')
  })

  it('get-session no lleva token, IP ni agente', async () => {
    const res = await call('GET', '/get-session', undefined, sesionDelEnlace)
    const { session } = res.json() as { session: Record<string, unknown> }
    expect(session.id).toEqual(expect.any(String))
    expect(session).not.toHaveProperty('token')
    expect(session).not.toHaveProperty('ipAddress')
    expect(session).not.toHaveProperty('userAgent')
  })

  it('verifications guarda el enlace de recuperación por su hash, no en claro', async () => {
    const token = await resetToken()
    const filas = await tdb.db.select().from(verifications)
    expect(filas.length).toBeGreaterThan(0)
    for (const fila of filas) expect(fila.identifier).not.toContain(token)
  })

  it('tras recuperar la contraseña, la sesión anterior da null y los otros enlaces no valen', async () => {
    const entrada = await call('POST', '/sign-in/email', {
      email: 'eva@example.com',
      password: 'contrasena-larga',
    })
    expect(entrada.statusCode).toBe(200)
    const otraSesion = cookieOf(entrada)

    const primero = await resetToken()
    const segundo = await resetToken()
    const reset = await call('POST', '/reset-password', {
      token: primero,
      newPassword: 'contrasena-nueva',
    })
    expect(reset.statusCode).toBe(200)

    for (const cookie of [sesionDelEnlace, otraSesion]) {
      const sesion = await call('GET', '/get-session', undefined, cookie)
      expect(sesion.json()).toBeNull()
    }
    const otraVez = await call('POST', '/reset-password', {
      token: segundo,
      newPassword: 'contrasena-del-intruso',
    })
    expect(otraVez.statusCode).toBe(400)
    const nueva = await call('POST', '/sign-in/email', {
      email: 'eva@example.com',
      password: 'contrasena-nueva',
    })
    expect(nueva.statusCode).toBe(200)
    // Y su cuerpo tampoco lleva el token, que better-auth sí pone (`token: session.token`).
    expect(nueva.json()).not.toHaveProperty('token')
    sesionDelEnlace = cookieOf(nueva)
  })

  it('una sesión de más de 90 días cuenta como ninguna y se borra', async () => {
    const token = tokenOf(sesionDelEnlace)
    await tdb.client`UPDATE sessions SET created_at = now() - interval '91 days' WHERE token = ${token}`
    const res = await call('GET', '/get-session', undefined, sesionDelEnlace)
    expect(res.json()).toBeNull()
    const quedan = await tdb.client`SELECT 1 FROM sessions WHERE token = ${token}`
    expect(quedan).toHaveLength(0)
  })

  it('ningún cuerpo de /api/auth/* lleva el valor de la cookie de sesión', async () => {
    const entrada = await call('POST', '/sign-in/email', {
      email: 'eva@example.com',
      password: 'contrasena-nueva',
    })
    await call('GET', '/get-session', undefined, cookieOf(entrada))
    expect(tokensVistos.size).toBeGreaterThanOrEqual(3)
    expect(cuerpos.length).toBeGreaterThan(10)
    for (const cuerpo of cuerpos) {
      for (const token of tokensVistos) expect(cuerpo).not.toContain(token)
      expect(cuerpo).not.toMatch(/"token":"/)
    }
  })
})
