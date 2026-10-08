import type { TickSummary } from '@cyclingstar/db'
import Fastify, { type FastifyPluginAsync, type RouteShorthandOptions } from 'fastify'
import { describe, expect, it } from 'vitest'
import type { AppDeps } from './app.js'
import { buildApp } from './app.js'
import {
  type RouteEntry,
  type RouteRegistry,
  type SpoilerPolicy,
  type VeilSpec,
  registerSpoilerGuard,
} from './spoiler.js'

/**
 * B1d · TODA RUTA DICE QUÉ HACE CON LO QUE NACE DE UNA ETAPA (docs/retransmision.md §16.3, §11.3 y
 * §14.5; decisiones 17-b y 17-h; E2, paso 8a).
 *
 * El sin destripe es una propiedad de TODAS las rutas. Desde el 8a cada una declara su clase
 * (`config.spoiler`) y su mecanismo (`config.veil`), y `registerSpoilerGuard` no deja arrancar el
 * servidor si a alguna le falta la clase, si una con horizonte no dice su mecanismo o si una L no
 * lleva su motivo. Este fichero escribe, literal, la tabla de §11.3 y la compara en los dos sentidos
 * con `app.spoilerRegistry`: falla si sobra o falta una ruta, o si cambia su clase, su mecanismo o el
 * motivo de una L. Clasificar una ruta nueva obliga a tocar la tabla, y el diff lo enseña.
 *
 * La app se construye con las dependencias con que la arranca `index.ts` (base, better-auth, token,
 * correo raíz y los dos avances del mundo), en dobles: qué rutas se registran depende de QUÉ
 * dependencias hay, no de lo que contengan, y ni la base ni la sesión se tocan hasta que llega una
 * petición.
 *
 * La tabla va en el orden de §11.3, por fichero, con la línea del registro de hoy (`app.get(` y, si
 * va en otra, la de la URL). Son 92 entradas: 91 rutas de nuestro código, con el comodín `GET, POST` de
 * `/api/auth/*` contado una vez por método, porque el registro va por método. Las `HEAD` que Fastify
 * crea solas por cada `GET` (`exposeHeadRoutes`) no van en la tabla: heredan el `config` de su `GET`, y
 * el tercer caso lo comprueba sin fijar cuántas son (53 hoy).
 */

/** N: ningún dato de juego (lo de toda `safe` que no dice otra cosa). */
const N: VeilSpec = { by: ['N'] }
/** Las trece de administración: `horizon` con L y el mismo motivo (§11.3, primera nota; §14.5). */
const ADMIN: VeilSpec = {
  by: ['L'],
  why: 'solo administradores (requireAdmin): ven el mundo con worldHorizon',
}

/** §11.3: `${método} ${url}` → [clase, mecanismo]. Una clave repetida no compila. */
const TABLE: Readonly<Record<string, readonly [SpoilerPolicy, VeilSpec]>> = {
  // routes/health.ts
  'GET /health': ['safe', N], // l. 21-22
  // routes/riders.ts (la única pública de ese fichero)
  'GET /api/names/generate': ['safe', N], // l. 126
  // routes/geo.ts
  'GET /api/geo/country': ['safe', N], // l. 75
  // routes/authProxy.ts: el comodín (l. 66-71) y las ocho de credenciales (l. 63, CREDENTIAL_AUTH_PATHS)
  'GET /api/auth/*': ['safe', N],
  'POST /api/auth/*': ['safe', N],
  'POST /api/auth/sign-in/email': ['safe', N],
  'POST /api/auth/sign-up/email': ['safe', N],
  'POST /api/auth/request-password-reset': ['safe', N],
  'POST /api/auth/send-verification-email': ['safe', N],
  'POST /api/auth/reset-password': ['safe', N],
  'POST /api/auth/change-password': ['safe', N],
  'POST /api/auth/change-email': ['safe', N],
  'POST /api/auth/delete-user': ['safe', N],
  // routes/admin.ts
  'GET /api/admin/whoami': ['horizon', ADMIN], // l. 62-63
  'GET /api/admin/users': ['horizon', ADMIN], // l. 73-74
  'PATCH /api/admin/users/:id': ['horizon', ADMIN], // l. 84-85
  'DELETE /api/admin/users/:id': ['horizon', ADMIN], // l. 102-103
  'POST /admin/tick': ['horizon', ADMIN], // l. 126-127
  'POST /admin/advance': ['horizon', ADMIN], // l. 141-142
  'GET /api/admin/blocklist': ['horizon', ADMIN], // l. 155-156
  'POST /api/admin/blocklist': ['horizon', ADMIN], // l. 166-167
  'DELETE /api/admin/blocklist/:id': ['horizon', ADMIN], // l. 179-180
  'GET /api/admin/health': ['horizon', ADMIN], // l. 192-193
  'POST /api/admin/premium': ['horizon', ADMIN], // l. 202-203
  'GET /api/admin/stage-snapshot/:raceId/:day': ['horizon', ADMIN], // l. 232-233
  // routes/world.ts
  'POST /api/world/advance': ['horizon', ADMIN], // l. 22-23
  // routes/calendar.ts
  'GET /api/calendar': ['horizon', { by: ['P'] }], // l. 39-40
  'GET /api/calendar/:raceId': [
    'horizon',
    {
      by: ['P', 'F', 'L'],
      why: 'status y runDays son calendario: cuántas etapas se han corrido, no quién las ganó',
    },
  ], // l. 94-95
  'GET /api/calendar/:raceId/startlist': [
    'horizon',
    {
      by: ['L'],
      why: 'solo antes de la salida: la lista se congela con el mundo al día (worldHorizon)',
    },
  ], // l. 245-246
  // routes/races.ts
  'GET /api/my-orders': ['safe', { by: ['N', 'L'], why: 'rivales por fama, que no se escribe' }], // l. 84-85
  'PUT /api/my-orders': ['safe', N], // l. 176
  'GET /api/races/:raceId/stages/:day': ['horizon', { by: ['G', 'P'] }], // l. 207-208
  // routes/broadcast.ts (E2, paso 3a): la retransmisión y el acta (§14.2)
  'GET /api/races/:raceId/stages/:day/broadcast': ['watch', { by: ['B', 'G'] }], // l. 246-247
  'GET /api/races/:raceId/stages/:day/broadcast/chunk': ['watch', { by: ['B'] }], // l. 335-336
  'POST /api/races/:raceId/stages/:day/broadcast/finish': ['watch', { by: ['G'] }], // l. 362-363
  'GET /api/races/:raceId/stages/:day/report': ['watch', { by: ['G'] }], // l. 403-404
  // routes/me.ts (E2, paso 7a): lo visto, el revelado, la guardia y el horizonte de cada uno (§14.2)
  'POST /api/me/watch/:raceKey/:day': ['watch', { by: ['B'] }], // l. 99-100
  'POST /api/me/reveal/:raceKey/:day': ['watch', { by: ['G'] }], // l. 148-149
  'PUT /api/me/follow/:raceKey': ['safe', N], // l. 173-174
  'PUT /api/me/spoiler-scope': ['safe', N], // l. 195
  'GET /api/me/horizon': ['horizon', N], // l. 207-208
  // routes/rankings.ts
  'GET /api/rankings': ['horizon', { by: ['R'] }], // l. 31-32
  'GET /api/rankings/young': ['horizon', { by: ['R'] }], // l. 43-44
  'GET /api/season-awards': ['horizon', { by: ['R'] }], // l. 57-58
  'GET /api/hall-of-fame': ['horizon', { by: ['R'] }], // l. 71-72
  'GET /api/records': ['horizon', { by: ['R'] }], // l. 83-84
  'GET /api/news': ['horizon', { by: ['F'] }], // l. 100
  'GET /api/countries': ['horizon', { by: ['R'] }], // l. 114-115
  'GET /api/countries/:code': ['horizon', { by: ['R', 'M'] }], // l. 125-126
  'GET /api/free-agents': ['horizon', { by: ['R'] }], // l. 141-142
  // routes/riders.ts
  'GET /api/riders/me': [
    'horizon',
    {
      by: ['L'],
      why: 'DD-08: los atributos propios se enseñan aunque los mueva lo aprendido en carrera',
    },
  ], // l. 140-141
  'GET /api/riders/me/upcoming-races': ['horizon', { by: ['M'] }], // l. 159-160
  'GET /api/me/team-control': ['safe', N], // l. 175
  'POST /api/riders': ['safe', N], // l. 182
  'GET /api/riders/me/last-race': ['horizon', { by: ['P', 'G'] }], // l. 229-230
  'PUT /api/riders/me/archetype': ['safe', N], // l. 244
  'GET /api/riders/me/orders': ['horizon', { by: ['M'] }], // l. 256-257
  'PUT /api/riders/me/orders': ['safe', N], // l. 304
  'GET /api/riders/me/plan': ['safe', N], // l. 339
  'PUT /api/riders/me/plan': ['safe', N], // l. 353
  'POST /api/riders/me/plan/preview': ['horizon', { by: ['M'] }], // l. 375-376
  'GET /api/me/team-training': ['safe', N], // l. 436
  'PUT /api/me/team-training': ['safe', N], // l. 459
  'GET /api/riders/me/form': [
    'horizon',
    {
      by: ['L', 'F', 'M'],
      why: 'DD-08: la condición propia se enseña; el parte y la actividad de los días velados, no',
    },
  ], // l. 472-473
  'GET /api/riders/me/trend': ['horizon', { by: ['F'] }], // l. 517-518
  'GET /api/riders/me/coach-view': [
    'horizon',
    {
      by: ['L'],
      why: 'DD-08: las notas del preparador miran los atributos propios, que mueve lo aprendido en carrera',
    },
  ], // l. 531-532
  'GET /api/riders/me/report': ['horizon', { by: ['F'] }], // l. 555-556
  'GET /api/riders/me/race-prefs': [
    'horizon',
    { by: ['L'], why: 'convocatorias decididas con el mundo al día; no nombran ninguna etapa' },
  ], // l. 571-572
  'PUT /api/riders/me/race-prefs': ['safe', N], // l. 592
  'GET /api/riders/me/palmares': ['horizon', { by: ['F'] }], // l. 604-605
  'GET /api/riders/me/summary': ['horizon', { by: ['R'] }], // l. 617-618
  'GET /api/riders/me/ledger': ['horizon', { by: ['F', 'R'] }], // l. 630-631
  'GET /api/riders/me/offers': [
    'horizon',
    {
      by: ['L'],
      why: 'ofertas con el rating y los presupuestos del mundo al día; no nombran ninguna etapa',
    },
  ], // l. 650-651
  'POST /api/riders/me/offers/:id/accept': ['safe', N], // l. 670-671
  'POST /api/riders/me/offers/:id/reject': ['safe', N], // l. 689-690
  'GET /api/riders/me/race-entries': ['safe', N], // l. 712-713
  'POST /api/riders/me/race-entries/:raceId': ['safe', N], // l. 725-726
  'DELETE /api/riders/me/race-entries/:raceId': ['safe', N], // l. 742-743
  'POST /api/riders/me/races/:raceKey/retire': ['horizon', { by: ['M'] }], // l. 768-769
  'GET /api/riders/:id/badges': ['horizon', { by: ['R'] }], // l. 795-796
  'GET /api/riders/:id/palmares': ['horizon', { by: ['F'] }], // l. 806-807
  'GET /api/riders/:id/results': ['horizon', { by: ['F', 'P'] }], // l. 818-819
  'GET /api/riders/:id': [
    'horizon',
    {
      by: ['R', 'M', 'L'],
      why: 'DD-08: los atributos se enseñan aunque los mueva lo aprendido en carrera, también los de un rival',
    },
  ], // l. 828-829
  // routes/teams.ts
  'POST /api/teams/take-over': ['safe', N], // l. 36
  'PUT /api/teams/me': ['safe', N], // l. 48
  'GET /api/teams/me/calendar': ['horizon', { by: ['R'] }], // l. 63-64
  'GET /api/teams/me/race-plan': ['safe', N], // l. 83
  'POST /api/teams/me/calendar/:raceId': ['safe', N], // l. 91-92
  'DELETE /api/teams/me/calendar/:raceId': ['safe', N], // l. 107-108
  'GET /api/teams': ['horizon', { by: ['R'] }], // l. 124-125
  'GET /api/teams/:id': ['horizon', { by: ['R', 'M'] }], // l. 134-135
  'GET /api/teams/:id/news': ['horizon', { by: ['F'] }], // l. 150-151
}

/** Lo que añade `@fastify/static` cuando sirve la web compilada: se clasifica sola (`STATIC_ROUTES`). */
const STATIC_VEIL: VeilSpec = { by: ['N'], why: 'la web compilada: ningún dato de juego' }

const summary = { currentDay: 1, daysProcessed: 0 } as unknown as TickSummary

/** Las dependencias con que `index.ts` arranca la app, en dobles. */
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

/** El registro de la app ya lista (los `register` de buildApp no cargan nada hasta `ready()`). */
async function registryOf(deps: AppDeps): Promise<RouteRegistry> {
  const app = buildApp(deps)
  await app.ready()
  await app.close()
  return app.spoilerRegistry
}

const sinHead = (registry: RouteRegistry): RouteEntry[] =>
  [...registry.values()].filter((e) => e.method !== 'HEAD')

/** Las dos direcciones, y lo que cambia en las que están en las dos: el fallo dice qué ruta es. */
function compare(entries: readonly RouteEntry[], table: typeof TABLE) {
  const got = new Map(entries.map((e) => [`${e.method} ${e.url}`, e]))
  return {
    extra: [...got.keys()].filter((k) => !(k in table)),
    missing: Object.keys(table).filter((k) => !got.has(k)),
    changed: [...got].flatMap(([k, e]) => {
      const want = table[k]
      if (want === undefined) return []
      const [policy, veil] = want
      return e.policy === policy && JSON.stringify(e.veil) === JSON.stringify(veil)
        ? []
        : [{ route: k, got: [e.policy, e.veil], want: [policy, veil] }]
    }),
  }
}

/** Una app de prueba con el registro y, dentro de un plugin como las de verdad, una sola ruta. */
async function readyWith(options: RouteShorthandOptions): Promise<void> {
  const app = Fastify()
  registerSpoilerGuard(app, null)
  const plugin: FastifyPluginAsync = async (p) => {
    p.get('/prueba', options, async () => ({ ok: true }))
  }
  void app.register(plugin)
  try {
    await app.ready()
  } finally {
    await app.close()
  }
}

describe('B1d · el registro de rutas y la tabla de §11.3', () => {
  it('toda L de la tabla lleva su motivo escrito', () => {
    const sinMotivo = Object.entries(TABLE)
      .filter(([, [, veil]]) => veil.by.includes('L') && (veil.why ?? '').trim() === '')
      .map(([route]) => route)
    expect(sinMotivo).toEqual([])
  })

  it('Fastify registra exactamente las rutas de la tabla, con su clase y su mecanismo', async () => {
    const registry = await registryOf(productionDeps(false))
    expect(compare(sinHead(registry), TABLE)).toEqual({ extra: [], missing: [], changed: [] })
    expect([...registry.values()].filter((e) => e.origin !== 'app')).toEqual([])
  })

  it('cada HEAD tiene su GET con la misma url, la misma clase y el mismo mecanismo', async () => {
    const registry = await registryOf(productionDeps(false))
    const heads = [...registry.values()].filter((e) => e.method === 'HEAD')
    expect(heads.length).toBeGreaterThan(0)
    const sinGet = heads
      .filter((h) => {
        const get = registry.get(`GET ${h.url}`)
        return (
          get === undefined ||
          get.policy !== h.policy ||
          JSON.stringify(get.veil) !== JSON.stringify(h.veil)
        )
      })
      .map((h) => h.url)
    expect(sinGet).toEqual([])
  })

  it('con la web compilada, @fastify/static añade GET y HEAD /*, safe y N por su cuenta', async () => {
    const registry = await registryOf(productionDeps(true))
    const statics = [...registry.values()].filter((e) => e.origin === 'static')
    expect(statics.map((e) => `${e.method} ${e.url}`).sort()).toEqual(['GET /*', 'HEAD /*'])
    for (const e of statics) expect([e.policy, e.veil]).toEqual(['safe', STATIC_VEIL])
    expect(
      compare(
        sinHead(registry).filter((e) => e.origin === 'app'),
        TABLE,
      ),
    ).toEqual({
      extra: [],
      missing: [],
      changed: [],
    })
  })

  it('sin base, las que se registran son de la tabla y con la misma clase', async () => {
    const entries = sinHead(await registryOf({ serveWeb: false }))
    expect(entries.map((e) => `${e.method} ${e.url}`).sort()).toEqual([
      'GET /api/geo/country',
      'GET /health',
    ])
    expect(compare(entries, TABLE).changed).toEqual([])
  })

  it('una ruta sin clase no deja arrancar: ready() rechaza con el mensaje del registro', async () => {
    await expect(readyWith({})).rejects.toThrow(
      'ruta sin política de destripe (config.spoiler): GET /prueba',
    )
    // El límite de peticiones no es una clase: una ruta que solo lo trae tampoco arranca.
    await expect(readyWith({ config: { rateLimit: false } })).rejects.toThrow(
      'ruta sin política de destripe',
    )
  })

  it('ni una con horizonte sin mecanismo, ni una L sin motivo; una safe sin mecanismo es N', async () => {
    await expect(readyWith({ config: { spoiler: 'horizon' } })).rejects.toThrow(
      'ruta con horizonte sin mecanismo (config.veil): GET /prueba',
    )
    await expect(readyWith({ config: { spoiler: 'watch' } })).rejects.toThrow(
      'ruta con horizonte sin mecanismo',
    )
    await expect(
      readyWith({ config: { spoiler: 'horizon', veil: { by: ['F', 'L'] } } }),
    ).rejects.toThrow('mecanismo L sin motivo escrito (config.veil.why): GET /prueba')
    await expect(
      readyWith({ config: { spoiler: 'horizon', veil: { by: ['L'], why: '  ' } } }),
    ).rejects.toThrow('mecanismo L sin motivo escrito')
    await expect(readyWith({ config: { spoiler: 'safe' } })).resolves.toBeUndefined()
  })
})
