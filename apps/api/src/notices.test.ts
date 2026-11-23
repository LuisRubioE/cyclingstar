import { claimNotice } from '@cyclingstar/db'
import { startTestDb, type TestDb } from '@cyclingstar/db/test'
import { type NoticePayload, noticesResponseSchema } from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { createAuth } from './auth.js'
import { DEVICE_COOKIE } from './deviceCookie.js'
import { createMailQueue } from './mailQueue.js'
import type { MailMessage } from './mailer.js'
import { type PushSender, createNotifier } from './push/deliver.js'
import { runNoticeSweep } from './push/sweep.js'

/**
 * LOS AVISOS, DE PUNTA A PUNTA (docs/cuenta.md §13 y §17.1; PR 14 de E4). Contra una base de verdad y con un
 * servicio de push de mentira: suscribir y desuscribir, las casillas y la baja de un toque; el tope de 3 con
 * el cuarto apuntado y no enviado, y los de seguridad fuera de él; el silencio con dos zonas y su salida a
 * las 8; dos barridos a la vez sin duplicar; 404 y 410 borran, tres `retry` seguidos borran; con la ausencia
 * viva solo salen los de seguridad; `new_sign_in` dos veces en una hora sale una; recuperar manda
 * `password_changed` y deja la cuenta sin aparatos; cambiar la contraseña sigue 13-l; y sin VAPID, nada.
 */
const BASE = 'http://localhost:3000'
const SECRET = 's'.repeat(32)
const BUENA = 'contrasena-buena'
const ANDROID =
  'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0'
const VAPID = { publicKey: 'B'.repeat(87), privateKey: 'p'.repeat(43), subject: 'https://x.test' }
const KEYS = { p256dh: 'K'.repeat(87), auth: 'a'.repeat(22) }
const DIA_JUEGO_MS = 6 * 3_600_000

let ipSiguiente = 1
const ipNueva = (): string => {
  const n = ipSiguiente++
  return `198.51.${Math.floor(n / 250)}.${(n % 250) + 1}`
}
const cookieDe = (res: { headers: Record<string, unknown> }, nombre: string): string | null => {
  const crudas = res.headers['set-cookie']
  const todas = (
    Array.isArray(crudas) ? crudas : typeof crudas === 'string' ? [crudas] : []
  ) as string[]
  return todas.find((c) => c.startsWith(`${nombre}=`))?.split(';')[0] ?? null
}

describe('los avisos, contra una base real (§13)', () => {
  let tdb: TestDb
  let app: ReturnType<typeof buildApp>
  const cola = createMailQueue()
  const correos: MailMessage[] = []
  /** Lo que recibió el servicio de push de mentira: a qué endpoint y qué carga. */
  const recibidos: { endpoint: string; payload: NoticePayload }[] = []
  /** Endpoints que responden con un error: 404, 410 o 500. */
  const fallan = new Map<string, number>()
  const sender: PushSender = async (sub, payload) => {
    const estado = fallan.get(sub.endpoint)
    if (estado !== undefined) throw Object.assign(new Error('push'), { statusCode: estado })
    recibidos.push({ endpoint: sub.endpoint, payload: JSON.parse(payload) as NoticePayload })
    return { statusCode: 201 }
  }
  let notifier: ReturnType<typeof createNotifier>
  const poolBefore = process.env.DB_POOL_MAX

  const pedir = (method: string, url: string, cookie?: string, body?: unknown, ua = ANDROID) =>
    app.inject({
      method: method as 'GET',
      url,
      headers: {
        origin: BASE,
        'user-agent': ua,
        'x-forwarded-for': ipNueva(),
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(cookie ? { cookie } : {}),
      },
      ...(body !== undefined ? { payload: JSON.stringify(body) } : {}),
    })

  async function cuenta(email: string): Promise<string> {
    await pedir('POST', '/api/auth/sign-up/email', undefined, {
      name: '',
      email,
      password: BUENA,
      birthDate: '1990-01-01',
    })
    const [u] = await tdb.client<{ id: string }[]>`
      update users set status = 'approved', email_verified = true where email = ${email} returning id`
    return u!.id
  }

  /** Entra (con la `cs_device` que traiga, o sin ella) y devuelve la sesión y la `cs_device` nueva. */
  async function entrar(email: string, ua = ANDROID, device?: string) {
    const res = await pedir(
      'POST',
      '/api/auth/sign-in/email',
      device,
      { email, password: BUENA },
      ua,
    )
    expect(res.statusCode).toBe(200)
    return {
      session: cookieDe(res, 'better-auth.session_token')!,
      device: cookieDe(res, DEVICE_COOKIE)!,
    }
  }

  let n = 0
  async function suscribir(session: string, tz = 'Europe/Madrid', endpoint?: string, ua = ANDROID) {
    const url = endpoint ?? `https://fcm.googleapis.com/fcm/send/e${++n}`
    const res = await pedir(
      'POST',
      '/api/me/push-targets',
      session,
      {
        channel: 'webpush',
        endpoint: url,
        keys: KEYS,
        timeZone: tz,
      },
      ua,
    )
    expect(res.statusCode).toBe(200)
    return { id: (res.json() as { id: string }).id, endpoint: url }
  }

  const avisosDe = (endpoint: string) =>
    recibidos.filter((r) => r.endpoint === endpoint).map((r) => r.payload.kind)
  const filas = async (userId: string) =>
    (
      await tdb.client<{ n: number }[]>`
        select count(*)::int as n from push_targets where user_id = ${userId}`
    )[0]!.n

  beforeAll(async () => {
    process.env.DB_POOL_MAX = '1'
    tdb = await startTestDb()
    notifier = createNotifier({ db: tdb.db, vapid: VAPID, queue: cola, sender })
    const auth = createAuth(tdb.db, {
      secret: SECRET,
      baseURL: BASE,
      mailQueue: cola,
      mailer: {
        send: async (m) => {
          correos.push(m)
          return true
        },
      },
    })
    app = buildApp({ db: tdb.db, auth, serveWeb: false, notifier })
  }, 120_000)

  afterAll(async () => {
    await app?.close()
    await tdb?.close()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  it('suscribir, listar, las casillas, la baja de un toque y desuscribir', async () => {
    await cuenta('rutas@example.com')
    const a = await entrar('rutas@example.com')
    const b = await entrar('rutas@example.com', WINDOWS)
    const t = await suscribir(a.session)
    await suscribir(b.session, 'Europe/Madrid', undefined, WINDOWS)

    const res = await pedir('GET', '/api/me/notices', a.session)
    const cuerpo = noticesResponseSchema.parse(res.json())
    expect(cuerpo).toMatchObject({
      enabled: true,
      publicKey: VAPID.publicKey,
      timeZone: 'Europe/Madrid',
    })
    expect(cuerpo.prefs).toEqual({
      stage_digest: true,
      stage_ready: false,
      plan_ending: true,
      offer_received: true,
      away_warning: true,
      away_over: true,
    })
    expect(cuerpo.targets.map((x) => [x.label, x.current])).toEqual([
      ['Chrome on Android', true],
      ['Firefox on Windows', false],
    ])
    // ni el endpoint ni las claves salen de la API
    expect(res.body).not.toContain('fcm.googleapis.com')
    expect(res.body).not.toContain(KEYS.p256dh)

    expect(
      (await pedir('PUT', '/api/me/notices', a.session, { stage_ready: true })).statusCode,
    ).toBe(200)
    expect(
      (await pedir('PUT', '/api/me/notices', a.session, { new_sign_in: false })).statusCode,
    ).toBe(400)
    expect((await pedir('POST', '/api/me/notices/offer_received/off', a.session)).statusCode).toBe(
      200,
    )
    expect(
      (await pedir('POST', '/api/me/notices/password_changed/off', a.session)).statusCode,
    ).toBe(400)
    const prefs = noticesResponseSchema.parse(
      (await pedir('GET', '/api/me/notices', a.session)).json(),
    ).prefs
    expect(prefs).toMatchObject({ stage_ready: true, offer_received: false })

    // la app futura: 400 canal_no_disponible; sin sesión, 401
    const fcm = await pedir('POST', '/api/me/push-targets', a.session, {
      channel: 'fcm',
      token: 'x',
      timeZone: 'UTC',
    })
    expect(fcm.json()).toMatchObject({ error: 'canal_no_disponible' })
    expect((await pedir('GET', '/api/me/notices')).statusCode).toBe(401)

    // el mismo navegador en otra cuenta: la fila pasa a la cuenta nueva
    const otraId = await cuenta('otra-rutas@example.com')
    const otra = await entrar('otra-rutas@example.com')
    await suscribir(otra.session, 'UTC', t.endpoint)
    expect(await filas(otraId)).toBe(1)
    expect(
      noticesResponseSchema.parse((await pedir('GET', '/api/me/notices', a.session)).json())
        .targets,
    ).toHaveLength(1)

    // otra cuenta no borra lo tuyo; tú sí
    const [mia] = await tdb.client<{ id: string }[]>`
      select p.id from push_targets p join users u on u.id = p.user_id where u.email = 'rutas@example.com'`
    expect(
      (await pedir('DELETE', `/api/me/push-targets/${mia!.id}`, otra.session)).statusCode,
    ).toBe(404)
    expect((await pedir('DELETE', `/api/me/push-targets/${mia!.id}`, b.session)).statusCode).toBe(
      200,
    )
  })

  it('el tope de 3: el cuarto se apunta y no sale; los de seguridad no cuentan', async () => {
    const id = await cuenta('tope@example.com')
    const now = new Date('2026-11-23T12:00:00Z')
    const c = (
      kind: 'stage_digest' | 'plan_ending' | 'offer_received' | 'away_over' | 'new_sign_in',
      ref = 'r',
    ) => claimNotice(tdb.db, { userId: id, kind, ref, now, timeZone: 'Europe/Madrid' })
    expect(await c('stage_digest')).toBe('new')
    expect(await c('plan_ending')).toBe('new')
    expect(await c('new_sign_in')).toBe('new')
    expect(await c('offer_received')).toBe('new')
    expect(await c('away_over')).toBe('capped')
    expect(await c('away_over')).toBe('dup')
    expect(await c('new_sign_in', 'r2')).toBe('new')
    const [apuntes] = await tdb.client<{ n: number }[]>`
      select count(*)::int as n from notice_log where user_id = ${id}`
    expect(apuntes!.n).toBe(6)
  })

  it('el silencio con dos zonas y su salida a las 8; dos barridos a la vez no duplican', async () => {
    const madrid = await cuenta('madrid@example.com')
    const la = await cuenta('la@example.com')
    const m = await suscribir((await entrar('madrid@example.com')).session, 'Europe/Madrid')
    const l = await suscribir((await entrar('la@example.com')).session, 'America/Los_Angeles')
    // la ausencia acabó a las 00:00 de Madrid (23:00 UTC)
    for (const id of [madrid, la])
      await tdb.client`update users set away_since = '2026-11-20T23:00:00Z', away_until = '2026-11-23T23:00:00Z'
        where id = ${id}`
    // 00:30 en Madrid (silencio), 15:30 en Los Ángeles: dos barridos a la vez
    const noche = new Date('2026-11-23T23:30:00Z')
    await Promise.all([
      runNoticeSweep(tdb.db, notifier, DIA_JUEGO_MS, noche),
      runNoticeSweep(tdb.db, notifier, DIA_JUEGO_MS, noche),
    ])
    expect(avisosDe(m.endpoint)).toEqual([])
    expect(avisosDe(l.endpoint)).toEqual(['away_over'])
    // 07:59 en Madrid: aún no; 08:30: sale, una vez
    await runNoticeSweep(tdb.db, notifier, DIA_JUEGO_MS, new Date('2026-11-24T06:59:00Z'))
    expect(avisosDe(m.endpoint)).toEqual([])
    await runNoticeSweep(tdb.db, notifier, DIA_JUEGO_MS, new Date('2026-11-24T07:30:00Z'))
    await runNoticeSweep(tdb.db, notifier, DIA_JUEGO_MS, new Date('2026-11-24T07:35:00Z'))
    expect(avisosDe(m.endpoint)).toEqual(['away_over'])
    expect(avisosDe(l.endpoint)).toEqual(['away_over'])
    expect(recibidos.find((r) => r.endpoint === m.endpoint)?.payload).toEqual({
      kind: 'away_over',
      title: 'Welcome back',
      body: 'Your away time is over. Your notifications are on again.',
      path: '/',
      tag: 'away',
      off: true,
    })
  })

  it('con la ausencia viva no sale nada de juego, y new_sign_in sale igual, una vez por hora', async () => {
    const id = await cuenta('fuera@example.com')
    const t = await suscribir((await entrar('fuera@example.com')).session)
    await tdb.client`update users set away_since = now() - interval '1 day', away_until = now() + interval '5 days'
      where id = ${id}`
    await runNoticeSweep(tdb.db, notifier, DIA_JUEGO_MS)
    expect(avisosDe(t.endpoint)).toEqual([])
    // dos entradas desde navegadores sin `cs_device`: una sola en la hora
    await entrar('fuera@example.com', WINDOWS)
    await entrar('fuera@example.com', WINDOWS)
    await cola.drain()
    expect(avisosDe(t.endpoint)).toEqual(['new_sign_in'])
    expect(recibidos.at(-1)?.payload.body).toBe(
      "Firefox on Windows signed in just now. If it wasn't you, reset your password.",
    )
    // con la `cs_device` de esta cuenta, ningún aviso
    const conocida = await entrar('fuera@example.com', WINDOWS)
    await cola.drain()
    await tdb.client`delete from notice_log where user_id = ${id}`
    await entrar('fuera@example.com', WINDOWS, conocida.device)
    await cola.drain()
    expect(avisosDe(t.endpoint)).toEqual(['new_sign_in'])
  })

  it('404 y 410 borran la suscripción; tres retry seguidos, también', async () => {
    const id = await cuenta('muertas@example.com')
    const s = (await entrar('muertas@example.com')).session
    const a = await suscribir(s)
    const b = await suscribir(s)
    const c = await suscribir(s)
    fallan.set(a.endpoint, 404)
    fallan.set(b.endpoint, 410)
    fallan.set(c.endpoint, 500)
    notifier.security(id, { kind: 'email_changed' })
    await cola.drain()
    expect(await filas(id)).toBe(1)
    notifier.security(id, { kind: 'email_changed' })
    await cola.drain()
    expect(await filas(id)).toBe(1)
    notifier.security(id, { kind: 'email_changed' })
    await cola.drain()
    expect(await filas(id)).toBe(0)
  })

  it('recuperar la contraseña manda password_changed y deja la cuenta sin push_targets', async () => {
    const id = await cuenta('recupera@example.com')
    const t = await suscribir((await entrar('recupera@example.com')).session)
    correos.length = 0
    await pedir('POST', '/api/auth/request-password-reset', undefined, {
      email: 'recupera@example.com',
      redirectTo: '/reset-password',
    })
    await cola.drain()
    const token = /#token=(\w+)/.exec(correos[0]!.text)![1]!
    const res = await pedir('POST', '/api/auth/reset-password', undefined, {
      token,
      newPassword: 'contrasena-nueva',
    })
    expect(res.statusCode).toBe(200)
    await cola.drain()
    expect(avisosDe(t.endpoint)).toEqual(['password_changed'])
    expect(recibidos.at(-1)?.payload).toMatchObject({ path: '/forgot-password', off: false })
    expect(await filas(id)).toBe(0)
  })

  it('cambiar la contraseña (13-l): las otras sesiones se borran y avisan, la nula avisa y se queda, la propia no', async () => {
    const id = await cuenta('cambia@example.com')
    const a = await entrar('cambia@example.com')
    const b = await entrar('cambia@example.com', WINDOWS)
    const propia = await suscribir(a.session)
    const otra = await suscribir(b.session)
    const nula = await suscribir(b.session)
    await tdb.client`update push_targets set session_id = null where id = ${nula.id}`
    const res = await pedir('POST', '/api/auth/change-password', `${a.session}; ${a.device}`, {
      currentPassword: BUENA,
      newPassword: 'contrasena-otra',
      revokeOtherSessions: true,
    })
    expect(res.statusCode).toBe(200)
    await cola.drain()
    expect(avisosDe(propia.endpoint)).toEqual([])
    expect(avisosDe(otra.endpoint)).toEqual(['password_changed'])
    expect(avisosDe(nula.endpoint)).toEqual(['password_changed'])
    const quedan = await tdb.client<{ id: string }[]>`
      select id from push_targets where user_id = ${id} order by id`
    expect(quedan.map((q) => q.id).sort()).toEqual([propia.id, nula.id].sort())
  })

  it('cerrar las otras sesiones borra sus aparatos', async () => {
    const id = await cuenta('cierra@example.com')
    const a = await entrar('cierra@example.com')
    const b = await entrar('cierra@example.com', WINDOWS)
    const propia = await suscribir(a.session)
    await suscribir(b.session)
    const res = await pedir(
      'POST',
      '/api/auth/devices/sign-out-others',
      `${a.session}; ${a.device}`,
      {},
    )
    expect(res.statusCode).toBe(200)
    const quedan = await tdb.client<
      { id: string }[]
    >`select id from push_targets where user_id = ${id}`
    expect(quedan.map((q) => q.id)).toEqual([propia.id])
  })

  it('sin las tres VAPID: enabled false, nadie se suscribe y el barrido no corre', async () => {
    const apagada = buildApp({
      db: tdb.db,
      auth: createAuth(tdb.db, {
        secret: SECRET,
        baseURL: BASE,
        mailQueue: cola,
        mailer: { send: async () => true },
      }),
      serveWeb: false,
    })
    try {
      const s = (await entrar('rutas@example.com')).session
      const get = await apagada.inject({
        method: 'GET',
        url: '/api/me/notices',
        headers: { cookie: s },
      })
      expect(get.json()).toMatchObject({ enabled: false, publicKey: null })
      const post = await apagada.inject({
        method: 'POST',
        url: '/api/me/push-targets',
        headers: { cookie: s, 'content-type': 'application/json', origin: BASE },
        payload: JSON.stringify({
          channel: 'webpush',
          endpoint: 'https://fcm.googleapis.com/fcm/send/apagada',
          keys: KEYS,
          timeZone: 'UTC',
        }),
      })
      expect(post.statusCode).toBe(404)
      const nada = createNotifier({ db: tdb.db, vapid: null, queue: cola, sender })
      expect(await runNoticeSweep(tdb.db, nada, DIA_JUEGO_MS)).toBeNull()
    } finally {
      await apagada.close()
    }
  })
})
