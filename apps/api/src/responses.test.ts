/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  OWN_RIDER,
  RACE_ID,
  RACE_KEY,
  type SpoilerWorld,
  idDe,
  serverErrors,
  startSpoilerWorld,
  sweep,
} from './__fixtures__/spoilerWorld.js'
import { ADMIN_VEIL, type RouteEntry } from './spoiler.js'

/**
 * CADA RUTA, CON SU RESPUESTA DE VERDAD, SIN 500 (E3, docs/visual.md §13.4; O-03; PR 19a). Declarar el
 * esquema de respuesta cuesta esto: una respuesta que no casa con él da un 500, no un aviso. Así que cada
 * ruta del jugador entra con su prueba:
 *
 * - **las GET**, todas las del registro, sobre el mundo de los bancos (`spoilerWorld.ts`) con la sesión del
 *   jugador y la del mánager, que el 19a añade a ese mundo (`manager@example.com`, premium y dueño de
 *   `Team 0`): ninguna da un 5xx;
 * - **las respuestas que ese mundo no rellena**, porque sus listas salen vacías o cortas: las del mundo de
 *   la prueba, guardadas en `__fixtures__/responses/` tal como las daba cada manejador antes del 19a (con la
 *   API del 18b, recortadas a tres elementos por lista y uno más por cada `kind`), pasan por su esquema
 *   como lo haría el serializador;
 * - **las escrituras**, cada una con un cuerpo que vale, o, si ya la pide hasta su 200 su test de ruta, con
 *   ese test apuntado aquí; ninguna da un 5xx.
 *
 * La retransmisión entra en el barrido de las GET; sus tramos de 0,87 a 3,8 MB no se guardan como respuesta.
 */

const FIXTURES = fileURLToPath(new URL('./__fixtures__/responses', import.meta.url))

/** Una respuesta del mundo de la prueba: su ruta, la URL con que se pidió, su código y su cuerpo. */
interface Fixture {
  readonly route: string
  readonly url: string
  readonly status: number
  readonly body: unknown
}
const fixtures: readonly Fixture[] = readdirSync(FIXTURES)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(FIXTURES, f), 'utf8')) as Fixture)

/** Las rutas del jugador: las del registro con esquema, sin las de administración. */
const delJugador = (entries: Iterable<RouteEntry>): RouteEntry[] =>
  [...entries].filter((e) => e.method !== 'HEAD' && e.response !== null && e.veil !== ADMIN_VEIL)

type Quien = 'player' | 'manager' | 'nuevo'

/** Una escritura que se pide aquí: quién, la URL y el cuerpo. */
interface Escritura {
  readonly who: Quien
  readonly url: string
  readonly body?: unknown
}
const OFERTA = '00000000-0000-4000-8000-00000000ffff'
/** Las escrituras que se piden aquí, en este orden: la retirada, la última, porque saca al jugador de la carrera. */
const ESCRITURAS: Readonly<Record<string, Escritura>> = {
  'POST /api/riders': {
    who: 'nuevo',
    url: '/api/riders',
    body: { vocation: 'fondo', gender: 'M', country: 'ES', nameSeed: 'n' },
  },
  'PUT /api/riders/me/archetype': {
    who: 'player',
    url: '/api/riders/me/archetype',
    body: { archetype: 'fondo' },
  },
  'PUT /api/riders/me/orders': {
    who: 'player',
    url: '/api/riders/me/orders',
    body: { orders: [] },
  },
  'PUT /api/me/team-training': {
    who: 'manager',
    url: '/api/me/team-training',
    body: { orders: [] },
  },
  'PUT /api/riders/me/race-prefs': {
    who: 'player',
    url: '/api/riders/me/race-prefs',
    body: { raceId: RACE_ID, wanted: true },
  },
  'PUT /api/my-orders': {
    who: 'player',
    url: '/api/my-orders',
    body: { raceKey: RACE_KEY, orders: [] },
  },
  'POST /api/riders/me/offers/:id/accept': {
    who: 'player',
    url: `/api/riders/me/offers/${OFERTA}/accept`,
  },
  'POST /api/riders/me/offers/:id/reject': {
    who: 'player',
    url: `/api/riders/me/offers/${OFERTA}/reject`,
  },
  'POST /api/riders/me/race-entries/:raceId': {
    who: 'player',
    url: `/api/riders/me/race-entries/${RACE_ID}`,
  },
  'DELETE /api/riders/me/race-entries/:raceId': {
    who: 'player',
    url: `/api/riders/me/race-entries/${RACE_ID}`,
  },
  'POST /api/teams/take-over': { who: 'player', url: '/api/teams/take-over' },
  'PUT /api/teams/me': { who: 'manager', url: '/api/teams/me', body: { name: 'Team Zero' } },
  'POST /api/teams/me/kit/check': {
    who: 'manager',
    url: '/api/teams/me/kit/check',
    body: { kit: 'hoops.navy.yellow' },
  },
  'PUT /api/teams/me/kit': { who: 'manager', url: '/api/teams/me/kit', body: { bib: 'base' } },
  'POST /api/teams/me/calendar/:raceId': {
    who: 'manager',
    url: `/api/teams/me/calendar/${RACE_ID}`,
  },
  'DELETE /api/teams/me/calendar/:raceId': {
    who: 'manager',
    url: `/api/teams/me/calendar/${RACE_ID}`,
  },
  'POST /api/riders/me/races/:raceKey/retire': {
    who: 'player',
    url: `/api/riders/me/races/${encodeURIComponent(RACE_KEY)}/retire`,
  },
}
/** Las que no llegan a su 2xx en este mundo, con su porqué: su respuesta de éxito es `{ ok }` o la pide su test de ruta. */
const SIN_EXITO: Readonly<Record<string, string>> = {
  'POST /api/riders/me/offers/:id/accept': 'sin oferta que aceptar, 409; su 200 es `{ ok }`',
  'POST /api/riders/me/race-entries/:raceId': 'el corredor ya va inscrito en la carrera, 409',
  'POST /api/teams/take-over': 'el jugador no es premium, 403; su 200 lo pide routes/kit.test.ts',
  'POST /api/teams/me/calendar/:raceId': 'la carrera de este mundo ya ha salido, 409',
  'DELETE /api/teams/me/calendar/:raceId': 'ídem, 409',
}
/** Las escrituras que su test de ruta ya pide hasta su 200, por la app con el serializador. */
const EN_SU_TEST: Readonly<Record<string, string>> = {
  'POST /api/riders/me/plan/preview': 'routes/planPreview.test.ts',
  'PUT /api/riders/me/plan': 'routes/planVivo.test.ts',
  'POST /api/me/watch/:raceKey/:day': 'routes/me.test.ts',
  'POST /api/me/reveal/:raceKey/:day': 'routes/me.test.ts',
  'PUT /api/me/follow/:raceKey': 'routes/me.test.ts',
  'PUT /api/me/spoiler-scope': 'routes/me.test.ts',
  'POST /api/races/:raceId/stages/:day/broadcast/finish': 'routes/broadcast.test.ts',
  'POST /api/races/:raceId/stages/:day/broadcast/seek': 'routes/broadcast.test.ts',
}

/** Las claves de `a` que no están en `b`, a cualquier profundidad: lo que el serializador quitaría. */
function sobran(a: unknown, b: unknown, path = ''): string[] {
  if (Array.isArray(a) && Array.isArray(b))
    return [...new Set(a.flatMap((x, i) => sobran(x, b[i], `${path}[]`)))]
  if (a !== null && typeof a === 'object' && b !== null && typeof b === 'object')
    return Object.entries(a).flatMap(([k, x]) =>
      k in b ? sobran(x, (b as Record<string, unknown>)[k], `${path}.${k}`) : [`${path}.${k}`],
    )
  return []
}

describe('E3 · cada ruta, con su respuesta de verdad, sin 500 (§13.4; PR 19a)', () => {
  let w: SpoilerWorld
  let nuevo = ''

  beforeAll(async () => {
    w = await startSpoilerWorld('responses-base')
    nuevo = (await w.signUp('nuevo@example.com')).cookie
  }, 300_000)
  afterAll(async () => {
    await w?.close()
  })

  const cookieOf = (who: Quien): string =>
    who === 'player' ? w.cookie : who === 'manager' ? w.managerCookie : nuevo

  it('cada GET del registro, con el jugador y con el mánager: ningún 5xx', async () => {
    expect(serverErrors(await sweep(w, 'player'))).toEqual([])
    expect(serverErrors(await sweep(w, 'manager'))).toEqual([])
  })

  it('las seis claves de más de GET /api/teams/:id/news ya no salen (§13.3)', async () => {
    const res = await w.app.inject({
      method: 'GET',
      url: `/api/teams/${idDe(100)}/news`,
      headers: { cookie: w.cookie },
    })
    const news = (res.json() as { news: Record<string, unknown>[] }).news
    expect(news.length).toBeGreaterThan(0)
    for (const item of news)
      for (const k of ['personal', 'riderId', 'riderName', 'country', 'teamId', 'teamName'])
        expect(item, k).not.toHaveProperty(k)
  })

  it('las respuestas del mundo de la prueba pasan por su esquema: lo que el serializador aceptaría', () => {
    const registry = w.app.spoilerRegistry
    const fallan = fixtures.flatMap((f) => {
      const schema = registry.get(f.route)?.response?.[f.status as 200]
      if (schema === undefined) return [`${f.route}: sin esquema para ${f.status}`]
      const r = schema.safeParse(f.body)
      return r.success
        ? []
        : [
            `${f.route}: ${r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`,
          ]
    })
    expect(fallan).toEqual([])
    // una de cada GET del jugador que no es de la retransmisión, y las dos POST de lectura
    expect(fixtures.length).toBeGreaterThanOrEqual(47)
  })

  it('las de responseCheck tests no llevan nada que su esquema no declare: el serializador no quitaría nada', async () => {
    const registry = w.app.spoilerRegistry
    const esquema = (route: string) => registry.get(route)!.response![200]!
    const ACTA = 'GET /api/races/:raceId/stages/:day/report'
    const META = 'POST /api/races/:raceId/stages/:day/broadcast/finish'
    expect(registry.get(ACTA)?.responseCheck).toBe('tests')
    expect(registry.get(META)?.responseCheck).toBe('tests')
    // el acta de una etapa vista y la del mundo de la prueba
    const acta = await w.app.inject({
      method: 'GET',
      url: `/api/races/${RACE_ID}/stages/2/report`,
      headers: { cookie: w.cookie },
    })
    expect(acta.statusCode).toBe(200)
    const fixture = fixtures.find((f) => f.route === ACTA)!
    // la meta de esa etapa, ya vista
    const meta = await w.app.inject({
      method: 'POST',
      url: `/api/races/${RACE_ID}/stages/2/broadcast/finish`,
      headers: { cookie: w.cookie, 'content-type': 'application/json' },
      payload: JSON.stringify({ mode: 'play' }),
    })
    expect(meta.statusCode, meta.body).toBe(200)
    for (const [route, body] of [
      [ACTA, acta.json()],
      [ACTA, fixture.body],
      [META, meta.json()],
    ] as const)
      expect(sobran(body, esquema(route).parse(body)), route).toEqual([])
  })

  it('las escrituras, cada una con un cuerpo que vale: ningún 5xx, y todas a su 2xx salvo las apuntadas', async () => {
    const estados: Record<string, number> = {}
    for (const [route, e] of Object.entries(ESCRITURAS)) {
      const method = route.split(' ')[0] as 'POST' | 'PUT' | 'DELETE'
      const res = await w.app.inject({
        method,
        url: e.url,
        headers: {
          cookie: cookieOf(e.who),
          ...(e.body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        ...(e.body === undefined ? {} : { payload: JSON.stringify(e.body) }),
      })
      estados[route] = res.statusCode
    }
    expect(Object.entries(estados).filter(([, s]) => s >= 500)).toEqual([])
    expect(
      Object.keys(estados)
        .filter((r) => estados[r]! >= 300)
        .sort(),
    ).toEqual(Object.keys(SIN_EXITO).sort())
  })

  it('ninguna ruta del jugador se queda sin su prueba, y las de su test de ruta, de verdad lo están', () => {
    const rutas = delJugador(w.app.spoilerRegistry.values()).map((e) => `${e.method} ${e.url}`)
    const sinPrueba = rutas.filter(
      (r) => !r.startsWith('GET ') && !(r in ESCRITURAS) && !(r in EN_SU_TEST),
    )
    expect(sinPrueba).toEqual([])
    for (const [route, file] of Object.entries(EN_SU_TEST)) {
      const url = route.split(' ')[1]!.split('/:')[0]!.split('/').pop()!
      expect(readFileSync(fileURLToPath(new URL(`./${file}`, import.meta.url)), 'utf8')).toContain(
        url,
      )
    }
    expect(OWN_RIDER).toBeTruthy()
  })
})
