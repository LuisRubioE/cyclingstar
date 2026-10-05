import type { TickSummary } from '@cyclingstar/db'
import { describe, expect, it } from 'vitest'
import type { AppDeps } from './app.js'
import { buildApp } from './app.js'

/**
 * EL INVENTARIO DE RUTAS (docs/retransmision.md §17.3 y decisión 17-b; E2, paso 0).
 *
 * El sin destripe es una propiedad de TODAS las rutas, y en el paso 8a cada una tendrá que declarar
 * su clase y su mecanismo (`config.spoiler`, `config.veil`), con un registro que no deja arrancar el
 * servidor si a alguna le falta (§14.5). Hasta entonces este fichero es el inventario: construye la
 * app como la arranca `index.ts`, recoge con un gancho `onRoute` el `${método} ${url}` de todo lo que
 * registra Fastify y lo compara en los dos sentidos con la lista de abajo. Una ruta que se añada o se
 * quite entre el 0 y el 8a tiene que pasar por aquí, y así la tabla de §11.3 llega completa al 8a,
 * donde cada fila gana su clase y su mecanismo y este fichero pasa a ser B1d.
 *
 * La lista va en el orden de §11.3, por fichero, con la línea del registro en la v91 (la base de E2),
 * salvo en `routes/health.ts` y `routes/races.ts`, que el 3a movió, y en `routes/broadcast.ts`, que
 * nace en el 3a: ahí, la del 3a.
 * El diseño contaba 87 rutas y 53 `HEAD` en `9c21885`; la v91 retiró la vuelta de prueba
 * (`/api/races/test-tour*`: cuatro `GET` y un `PUT`), así que hoy son 82 rutas de nuestro código
 * —48 `GET`, 21 `POST`, 7 `PUT`, 4 `DELETE`, un `PATCH` y el comodín `GET` y `POST` de `/api/auth/*`,
 * que aquí cuenta dos veces porque el registro va por método— y 49 `HEAD`. El 3a añade las cuatro de
 * la retransmisión (`routes/broadcast.ts`: tres `GET` y un `POST`, §14.2): 86 rutas y 52 `HEAD`. El 7a,
 * las cinco de `/api/me` (`routes/me.ts`: dos `POST`, dos `PUT` y un `GET`): 91 rutas, 92 entradas con
 * el comodín, y 53 `HEAD`. Las líneas de `routes/broadcast.ts` son las del 7a.
 */
const ROUTES = [
  // routes/health.ts
  'GET /health', // l. 21
  // routes/riders.ts (la única pública de ese fichero)
  'GET /api/names/generate', // l. 125
  // routes/geo.ts
  'GET /api/geo/country', // l. 75
  // routes/authProxy.ts: el comodín (l. 50-55) y las ocho de credenciales (l. 47, CREDENTIAL_AUTH_PATHS)
  'GET /api/auth/*',
  'POST /api/auth/*',
  'POST /api/auth/sign-in/email',
  'POST /api/auth/sign-up/email',
  'POST /api/auth/request-password-reset',
  'POST /api/auth/send-verification-email',
  'POST /api/auth/reset-password',
  'POST /api/auth/change-password',
  'POST /api/auth/change-email',
  'POST /api/auth/delete-user',
  // routes/admin.ts
  'GET /api/admin/whoami', // l. 60
  'GET /api/admin/users', // l. 67
  'PATCH /api/admin/users/:id', // l. 74
  'DELETE /api/admin/users/:id', // l. 88
  'POST /admin/tick', // l. 108
  'POST /admin/advance', // l. 119
  'GET /api/admin/blocklist', // l. 129
  'POST /api/admin/blocklist', // l. 136
  'DELETE /api/admin/blocklist/:id', // l. 145
  'GET /api/admin/health', // l. 154
  'POST /api/admin/premium', // l. 160
  'GET /api/admin/stage-snapshot/:raceId/:day', // l. 186-187
  // routes/world.ts
  'POST /api/world/advance', // l. 21
  // routes/calendar.ts
  'GET /api/calendar', // l. 37
  'GET /api/calendar/:raceId', // l. 80
  'GET /api/calendar/:raceId/startlist', // l. 218-219
  // routes/races.ts
  'GET /api/my-orders', // l. 79
  'PUT /api/my-orders', // l. 162
  'GET /api/races/:raceId/stages/:day', // l. 183-184
  // routes/broadcast.ts (E2, paso 3a): la retransmisión y el acta (§14.2)
  'GET /api/races/:raceId/stages/:day/broadcast', // l. 168-169
  'GET /api/races/:raceId/stages/:day/broadcast/chunk', // l. 240-241
  'POST /api/races/:raceId/stages/:day/broadcast/finish', // l. 263-264
  'GET /api/races/:raceId/stages/:day/report', // l. 294-295
  // routes/me.ts (E2, paso 7a): lo visto, el revelado, la guardia y el horizonte de cada uno (§14.2)
  'POST /api/me/watch/:raceKey/:day', // l. 100-101
  'POST /api/me/reveal/:raceKey/:day', // l. 149-150
  'PUT /api/me/follow/:raceKey', // l. 172-173
  'PUT /api/me/spoiler-scope', // l. 194
  'GET /api/me/horizon', // l. 206-207
  // routes/rankings.ts
  'GET /api/rankings', // l. 27
  'GET /api/rankings/young', // l. 34
  'GET /api/season-awards', // l. 41
  'GET /api/hall-of-fame', // l. 48
  'GET /api/records', // l. 55
  'GET /api/news', // l. 63
  'GET /api/countries', // l. 75
  'GET /api/countries/:code', // l. 81
  'GET /api/free-agents', // l. 92-93
  // routes/riders.ts
  'GET /api/riders/me', // l. 139
  'GET /api/riders/me/upcoming-races', // l. 146
  'GET /api/me/team-control', // l. 157
  'POST /api/riders', // l. 164
  'GET /api/riders/me/last-race', // l. 210
  'PUT /api/riders/me/archetype', // l. 220
  'GET /api/riders/me/orders', // l. 232
  'PUT /api/riders/me/orders', // l. 275
  'GET /api/riders/me/plan', // l. 310
  'PUT /api/riders/me/plan', // l. 324
  'POST /api/riders/me/plan/preview', // l. 346
  'GET /api/me/team-training', // l. 402
  'PUT /api/me/team-training', // l. 424
  'GET /api/riders/me/form', // l. 437
  'GET /api/riders/me/trend', // l. 469
  'GET /api/riders/me/coach-view', // l. 479
  'GET /api/riders/me/report', // l. 491
  'GET /api/riders/me/race-prefs', // l. 501
  'PUT /api/riders/me/race-prefs', // l. 510
  'GET /api/riders/me/palmares', // l. 522
  'GET /api/riders/me/summary', // l. 531
  'GET /api/riders/me/ledger', // l. 540
  'GET /api/riders/me/offers', // l. 555
  'POST /api/riders/me/offers/:id/accept', // l. 563-564
  'POST /api/riders/me/offers/:id/reject', // l. 581-582
  'GET /api/riders/me/race-entries', // l. 603
  'POST /api/riders/me/race-entries/:raceId', // l. 612-613
  'DELETE /api/riders/me/race-entries/:raceId', // l. 628-629
  'POST /api/riders/me/races/:raceKey/retire', // l. 653-654
  'GET /api/riders/:id/badges', // l. 679
  'GET /api/riders/:id/palmares', // l. 686
  'GET /api/riders/:id/results', // l. 694
  'GET /api/riders/:id', // l. 700
  // routes/teams.ts
  'POST /api/teams/take-over', // l. 36
  'PUT /api/teams/me', // l. 48
  'GET /api/teams/me/calendar', // l. 63
  'GET /api/teams/me/race-plan', // l. 77
  'POST /api/teams/me/calendar/:raceId', // l. 85-86
  'DELETE /api/teams/me/calendar/:raceId', // l. 100-101
  'GET /api/teams', // l. 116
  'GET /api/teams/:id', // l. 122
  'GET /api/teams/:id/news', // l. 131
] as const

/** Fastify crea sola una ruta `HEAD` por cada `GET` (`exposeHeadRoutes`), con el mismo `config`. */
const HEADS = ROUTES.filter((r) => r.startsWith('GET ')).map((r) => `HEAD ${r.slice(4)}`)

/** Lo que añade `@fastify/static` cuando sirve la web compilada (app.ts, el `register` de la web). */
const STATIC = ['GET /*', 'HEAD /*']

const summary = { currentDay: 1, daysProcessed: 0 } as unknown as TickSummary

/**
 * La app con las dependencias con que la arranca `index.ts`: base, better-auth, token, correo raíz y
 * los dos avances del mundo. Qué rutas se registran depende de QUÉ dependencias hay, no de lo que
 * contengan, así que basta con dobles: la base y la sesión no se tocan hasta que llega una petición.
 */
function productionDeps(serveWeb: boolean): AppDeps {
  return {
    db: {} as never,
    auth: {
      api: { getSession: async () => null },
      handler: async () => new Response('{}', { status: 200 }),
    } as unknown as NonNullable<AppDeps['auth']>,
    migrationsApplied: true,
    tickIntervalMinutes: 360,
    adminToken: 'a'.repeat(32),
    adminEmail: 'dueno@example.com',
    onAdminTick: async () => summary,
    onAdminAdvance: async () => summary,
    switches: { broadcastWatch: 'off', spoilerMode: 'off' },
    serveWeb,
  }
}

/** Todo lo que registra Fastify al arrancar, como `${método} ${url}`, una entrada por método. */
async function inventory(deps: AppDeps): Promise<string[]> {
  const app = buildApp(deps)
  const seen: string[] = []
  // Los `register` de buildApp no cargan nada hasta `ready()`: el gancho añadido aquí los ve todos.
  app.addHook('onRoute', (route) => {
    const methods = Array.isArray(route.method) ? route.method : [route.method]
    for (const method of methods) seen.push(`${method} ${route.url}`)
  })
  await app.ready()
  await app.close()
  return seen
}

/** Las dos direcciones de la comparación, para que el fallo diga qué ruta sobra y cuál falta. */
function compare(seen: readonly string[], expected: readonly string[]) {
  const want = new Set(expected)
  const got = new Set(seen)
  return {
    extra: seen.filter((r) => !want.has(r)),
    missing: expected.filter((r) => !got.has(r)),
    repeated: seen.length - got.size,
  }
}

describe('el inventario de rutas (hasta el 8a; luego, B1d)', () => {
  it('la lista no repite ninguna ruta y cuenta lo que dice la cabecera', () => {
    expect(new Set(ROUTES).size).toBe(ROUTES.length)
    expect(ROUTES).toHaveLength(92)
    expect(HEADS).toHaveLength(53)
  })

  it('Fastify registra exactamente las rutas de la lista y sus HEAD, ni una más ni una menos', async () => {
    const seen = await inventory(productionDeps(false))
    expect(compare(seen, [...ROUTES, ...HEADS])).toEqual({ extra: [], missing: [], repeated: 0 })
    expect(seen).toHaveLength(145)
  })

  it('con la web compilada, @fastify/static añade solo GET y HEAD /*', async () => {
    const seen = await inventory(productionDeps(true))
    expect(compare(seen, [...ROUTES, ...HEADS, ...STATIC])).toEqual({
      extra: [],
      missing: [],
      repeated: 0,
    })
  })
})
