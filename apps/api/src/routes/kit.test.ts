import { gameState, riders, setKit, teams, users, worlds } from '@cyclingstar/db'
import { type TestDb, startTestDb } from '@cyclingstar/db/test'
import {
  KIT_CODES,
  type KitCode,
  canonicalKit,
  kitRevertResponseSchema,
  kitSaveResponseSchema,
  kitVerdictSchema,
  teamKitResponseSchema,
} from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AppDeps } from '../app.js'
import { buildApp } from '../app.js'

/**
 * LAS RUTAS DEL EDITOR DEL MAILLOT (E3, docs/visual.md §8.7 y §8.8; D-00k, 8-g, 8-t, 8-v; PR 18a), sobre
 * PGlite y un mundo pequeño hecho a mano: cuatro equipos WorldTour, que son rivales en todas las carreras
 * de la temporada, uno del jugador. `PUT /api/teams/me/kit` contesta cada código en su orden (el 429
 * `kit_reciente` sin `retry-after` y con `nextChangeDay`), el cambio por temporada cuenta como dice D-00k,
 * el culote no cuenta, tomar un equipo y guardar el mismo día da 200, y la reversión de E9 deja su noticia.
 */

const idDe = (i: number): string => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const PLAYER = idDe(900)
const LOOSE = idDe(901)
const TAKER = idDe(902)
const ADMIN = 'a'.repeat(32)
/** Hoy: el día 100 de la temporada 0, que acaba el 363. */
const D = 100
const NEXT_SEASON = 364

/** Doble de better-auth: la sesión es la del usuario de la cabecera `x-test-user`. */
function headerAuth(): NonNullable<AppDeps['auth']> {
  return {
    api: {
      getSession: async ({ headers }: { headers: Headers }) => {
        const id = headers.get('x-test-user')
        return id ? { user: { id } } : null
      },
    },
    handler: async () => new Response('{}', { status: 200 }),
  } as unknown as NonNullable<AppDeps['auth']>
}

describe('las rutas del editor del maillot (§8.7; PR 18a)', () => {
  let t: TestDb
  let app: ReturnType<typeof buildApp>
  const ids: Record<'A' | 'B' | 'C' | 'D', string> = { A: '', B: '', C: '', D: '' }
  const poolBefore = process.env.DB_POOL_MAX

  const hoy = async (day: number) => {
    await t.client`update game_state set current_day = ${day}, last_processed_day = ${day}`
  }
  const pide = (
    method: 'GET' | 'POST' | 'PUT',
    url: string,
    user: string | null = PLAYER,
    payload?: unknown,
  ) =>
    app.inject({
      method,
      url,
      headers: user === null ? {} : { 'x-test-user': user },
      ...(payload === undefined ? {} : { payload: payload as Record<string, unknown> }),
    })
  const estado = async () =>
    teamKitResponseSchema.parse((await pide('GET', '/api/teams/me/kit')).json())
  const guarda = (body: unknown, user: string = PLAYER) =>
    pide('PUT', '/api/teams/me/kit', user, body)
  /** Los maillots libres para el equipo A: ni bloqueados, ni el suyo, ni el mismo canónico dos veces. */
  const libres = async (n: number): Promise<KitCode[]> => {
    const s = await estado()
    const blocked = new Set(s.options.map((o) => o.kit))
    const taken = new Set([s.current, s.pending?.kit].filter((k) => k != null).map(canonicalKit))
    const out: KitCode[] = []
    for (const code of KIT_CODES) {
      if (blocked.has(code) || taken.has(canonicalKit(code))) continue
      if (out.some((c) => canonicalKit(c) === canonicalKit(code))) continue
      out.push(code)
      if (out.length === n) break
    }
    return out
  }

  beforeAll(async () => {
    process.env.DB_POOL_MAX = '1'
    t = await startTestDb()
    const [world] = await t.db
      .insert(worlds)
      .values({ worldSeed: 'editor-del-maillot', engineVersion: 1 })
      .returning({ id: worlds.id })
    const worldId = world!.id
    await t.db.insert(users).values([
      {
        id: PLAYER,
        email: 'jugador@example.com',
        name: 'Jugador',
        emailVerified: true,
        premium: true,
      },
      { id: LOOSE, email: 'suelto@example.com', name: 'Suelto', emailVerified: true },
      { id: TAKER, email: 'nuevo@example.com', name: 'Nuevo', emailVerified: true, premium: true },
    ])
    const equipos = [
      ['A', 'Noord Cycling', 4_000_000, 'plain.navy'],
      ['B', 'Mistral Racing', 3_000_000, 'hoops.blue.yellow'],
      ['C', 'Andes Ruta', 2_000_000, 'sash.teal.white'],
      ['D', 'Baltic Wind', 1_000_000, 'yoke.black.orange'],
    ] as const
    for (const [key, name, budget] of equipos) {
      const [team] = await t.db
        .insert(teams)
        .values({
          worldId,
          name,
          country: 'NL',
          division: 'WT',
          philosophy: 'general',
          budget,
          jerseySeed: `editor:${key}`,
          ...(key === 'A' ? { ownerUserId: PLAYER, managedSinceDay: D - 30 } : {}),
        })
        .returning({ id: teams.id })
      ids[key] = team!.id
    }
    // los maillots de la traducción, desde el día 1
    await t.db.transaction(async (tx) => {
      for (const [key, , , kit] of equipos) await setKit(tx, ids[key], kit, 'system', 1)
    })
    // un corredor del nuevo, en el equipo D, que es de la máquina
    await t.db.insert(riders).values({
      worldId,
      userId: TAKER,
      teamId: ids.D,
      name: 'Nuevo',
      country: 'ES',
      gender: 'M',
      birthSeason: -25,
      archetype: 'escalada',
      faceSeed: 'cara',
    })
    await t.db.insert(gameState).values({ worldId, currentDay: D, lastProcessedDay: D })
    app = buildApp({
      db: t.db,
      auth: headerAuth(),
      serveWeb: false,
      migrationsApplied: true,
      tickIntervalMinutes: 360,
      adminToken: ADMIN,
      adminEmail: 'raiz@example.com',
      switches: { broadcastWatch: 'on', spoilerMode: 'off' },
    })
  }, 180_000)

  afterAll(async () => {
    await app?.close()
    await t?.close()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  it('sin sesión, 401; sin equipo, 409 sin_equipo', async () => {
    for (const [method, url, body] of [
      ['GET', '/api/teams/me/kit', undefined],
      ['POST', '/api/teams/me/kit/check', { kit: 'plain.red' }],
      ['PUT', '/api/teams/me/kit', { kit: 'plain.red' }],
    ] as const) {
      expect((await pide(method, url, null, body)).statusCode, url).toBe(401)
      const sin = await pide(method, url, LOOSE, body)
      expect(sin.statusCode, url).toBe(409)
      expect(sin.json()).toEqual({ ok: false, error: 'sin_equipo' })
    }
  })

  it('GET: el vigente, el culote, los cambios que le quedan, lo que no puede elegir y sus rivales', async () => {
    const s = await estado()
    expect(s).toMatchObject({
      current: 'plain.navy',
      bib: 'black',
      pending: null,
      changesLeft: 1,
      nextChangeDay: null,
    })
    const why = new Map(s.options.map((o) => [o.kit, o.why]))
    expect(why.get('band.black.navy')).toBe('contraste')
    expect(why.get('plain.red')).toBe('reservado')
    expect(why.get('hoops.blue.yellow')).toBe('ocupado')
    expect([...why.values()]).toContain('rival')
    // el suyo no está: es el elegido
    expect(why.has('plain.navy')).toBe(false)
    // sus tres rivales, con más carreras primero y su maillot de mañana
    expect(s.rivals.map((r) => r.teamId).sort()).toEqual([ids.B, ids.C, ids.D].sort())
    expect(s.rivals.find((r) => r.teamId === ids.B)).toMatchObject({
      name: 'Mistral Racing',
      kit: 'hoops.blue.yellow',
    })
    for (const r of s.rivals) expect(r.races).toBeGreaterThan(0)
  })

  it('POST check: el veredicto, con la señal, el equipo y la visión; el cuerpo, estricto', async () => {
    const check = async (kit: string) =>
      kitVerdictSchema.parse(
        (await pide('POST', '/api/teams/me/kit/check', PLAYER, { kit })).json(),
      )
    expect(await check('plain.red')).toMatchObject({
      ok: false,
      code: 'kit_reservado',
      reserved: 'champion:MA',
    })
    expect(await check('hoops.blue.yellow')).toMatchObject({
      code: 'kit_ocupado',
      takenBy: { teamId: ids.B, teamName: 'Mistral Racing' },
    })
    const rival = (await estado()).options.find((o) => o.why === 'rival')!.kit
    const v = await check(rival)
    expect(v.code).toBe('kit_se_confunde')
    expect([ids.B, ids.C, ids.D]).toContain(v.conflict!.teamId)
    expect(['normal', 'protan', 'deutan', 'tritan']).toContain(v.conflict!.vision)
    const [libre] = await libres(1)
    expect(await check(libre!)).toMatchObject({ ok: true, code: null })
    for (const body of [{ kit: 'plain.red', extra: 1 }, { kit: 'zigzag.red' }, {}]) {
      const r = await pide('POST', '/api/teams/me/kit/check', PLAYER, body)
      expect(r.statusCode, JSON.stringify(body)).toBe(400)
    }
  })

  it('PUT: cada código en su orden, y el primer cambio desde que tiene dueño, libre', async () => {
    const rival = (await estado()).options.find((o) => o.why === 'rival')!.kit
    const casos: readonly [unknown, number, string][] = [
      [{ kit: 'plain.navy' }, 400, 'kit_igual'],
      [{ kit: 'band.black.navy' }, 400, 'kit_contraste'],
      [{ kit: 'plain.red' }, 409, 'kit_reservado'],
      [{ kit: 'hoops.blue.yellow' }, 409, 'kit_ocupado'],
      [{ kit: rival }, 409, 'kit_se_confunde'],
    ]
    for (const [body, status, error] of casos) {
      const r = await guarda(body)
      expect(r.statusCode, error).toBe(status)
      expect(r.json()).toEqual({ ok: false, error })
    }
    for (const body of [{}, { kit: 'plain.navy', jerseySeed: 'x' }, { bib: 'red' }]) {
      expect((await guarda(body)).statusCode, JSON.stringify(body)).toBe(400)
    }
    const [primero] = await libres(1)
    const r = await guarda({ kit: primero })
    expect(r.statusCode).toBe(200)
    expect(kitSaveResponseSchema.parse(r.json())).toEqual({ ok: true, validFromDay: D + 1 })
    expect(await estado()).toMatchObject({
      current: 'plain.navy',
      pending: { kit: primero, validFromDay: D + 1 },
      changesLeft: 1,
    })
    // el programado también es kit_igual
    expect((await guarda({ kit: primero })).json()).toEqual({ ok: false, error: 'kit_igual' })
  })

  it('dos guardados el mismo día cuentan uno; el segundo cambio de la temporada da 429 sin retry-after', async () => {
    // hoy otra vez: sustituye al de mañana, y sigue siendo el primero
    const [otro] = await libres(1)
    expect((await guarda({ kit: otro })).statusCode).toBe(200)
    expect((await estado()).pending).toEqual({ kit: otro, validFromDay: D + 1 })
    // cinco días después, el segundo cambio de la temporada: el que cuenta
    await hoy(D + 5)
    const [segundo] = await libres(1)
    expect((await guarda({ kit: segundo })).statusCode).toBe(200)
    // y el tercero, ya no: 429 con el primer día de la temporada siguiente, y sin retry-after
    await hoy(D + 10)
    const [tercero] = await libres(1)
    const r = await guarda({ kit: tercero })
    expect(r.statusCode).toBe(429)
    expect(r.json()).toEqual({ ok: false, error: 'kit_reciente', nextChangeDay: NEXT_SEASON })
    expect(r.headers['retry-after']).toBeUndefined()
    // kit_reciente va antes que todo: también con el vigente
    expect((await guarda({ kit: segundo })).statusCode).toBe(429)
    expect(await estado()).toMatchObject({ changesLeft: 0, nextChangeDay: NEXT_SEASON })
    const check = await pide('POST', '/api/teams/me/kit/check', PLAYER, { kit: tercero })
    expect(kitVerdictSchema.parse(check.json())).toMatchObject({
      code: 'kit_reciente',
      nextChangeDay: NEXT_SEASON,
    })
  })

  it('el culote se guarda en el acto y no cuenta; con un maillot que no vale, no se guarda nada', async () => {
    const r = await guarda({ bib: 'black.panel' })
    expect(r.statusCode).toBe(200)
    expect(r.json()).toEqual({ ok: true, validFromDay: null })
    expect((await estado()).bib).toBe('black.panel')
    const [tercero] = await libres(1)
    expect((await guarda({ kit: tercero, bib: 'base' })).statusCode).toBe(429)
    expect((await estado()).bib).toBe('black.panel')
  })

  it('la temporada siguiente vuelve a ser libre', async () => {
    await hoy(NEXT_SEASON + 5)
    expect(await estado()).toMatchObject({ changesLeft: 1, nextChangeDay: null })
    const [nuevo] = await libres(1)
    const r = await guarda({ kit: nuevo })
    expect(r.statusCode).toBe(200)
    expect(r.json()).toEqual({ ok: true, validFromDay: NEXT_SEASON + 6 })
  })

  it('tomar un equipo y guardar maillot el mismo día da 200 (8-g)', async () => {
    const toma = await pide('POST', '/api/teams/take-over', TAKER)
    expect(toma.statusCode).toBe(200)
    const s = teamKitResponseSchema.parse((await pide('GET', '/api/teams/me/kit', TAKER)).json())
    expect(s).toMatchObject({ current: 'yoke.black.orange', changesLeft: 1 })
    const blocked = new Set(s.options.map((o) => o.kit))
    const libre = KIT_CODES.find(
      (c) => !blocked.has(c) && canonicalKit(c) !== canonicalKit('yoke.black.orange'),
    )!
    const r = await guarda({ kit: libre }, TAKER)
    expect(r.statusCode).toBe(200)
  })

  it('PUT /api/teams/me ya no acepta jerseySeed: solo, es un 400', async () => {
    const r = await pide('PUT', '/api/teams/me', PLAYER, { jerseySeed: 'cualquiera' })
    expect(r.statusCode).toBe(400)
  })

  it('la reversión de E9: con el token, una fila moderator para mañana y su noticia en el diario', async () => {
    const url = `/api/admin/teams/${ids.A}/kit/revert`
    const admin = (payload: unknown, token: string | null = ADMIN, to = url) =>
      app.inject({
        method: 'POST',
        url: to,
        headers: token === null ? {} : { 'x-admin-token': token },
        payload: payload as Record<string, unknown>,
      })
    expect((await admin({ reason: 'abc' }, null)).statusCode).toBe(401)
    expect((await admin({ reason: 'ab' })).statusCode).toBe(400)
    expect((await admin({ reason: 'x'.repeat(201) })).statusCode).toBe(400)
    expect((await admin({ reason: 'abc', extra: 1 })).statusCode).toBe(400)
    expect(
      (await admin({ reason: 'abc' }, ADMIN, `/api/admin/teams/${idDe(999)}/kit/revert`))
        .statusCode,
    ).toBe(404)
    const r = await admin({ reason: 'un nombre en el pecho' })
    expect(r.statusCode).toBe(200)
    const body = kitRevertResponseSchema.parse(r.json())
    expect(body.validFromDay).toBe(NEXT_SEASON + 6)
    const [fila] = await t.client<{ set_by: string; kit: string }[]>`
      select set_by, kit from team_kits where team_id = ${ids.A} and valid_from_day = ${NEXT_SEASON + 6}`
    expect(fila).toEqual({ set_by: 'moderator', kit: body.kit })
    const noticias = await t.client<{ kind: string; team_id: string; text: string }[]>`
      select kind, data ->> 'teamId' as team_id, text from news where kind = 'kit_reset'`
    expect(noticias).toEqual([
      { kind: 'kit_reset', team_id: ids.A, text: "Noord Cycling's kit was reset by a moderator." },
    ])
  })
})
