/**
 * LAS RESPUESTAS DEL MUNDO DE LA PRUEBA (E3, docs/visual.md §13.4; Ruso-042, 16-j; PR 19a): las de las rutas del
 * jugador que el mundo de los bancos no rellena, para `apps/api/src/responses.test.ts`, que las pasa por el esquema
 * de su ruta como lo haría el serializador. Se piden con las cuentas del mundo de la prueba (el jugador y el
 * mánager) y se recortan: cada lista de más de 30, a sus tres primeros elementos y uno más por cada `kind`
 * distinto (las de hasta 30, enteras, porque un esquema puede pedir un mínimo, como los cuatro bloques del plan).
 * La retransmisión no se guarda: sus tramos pesan megas, y la piden los bancos.
 *
 * Uso, con el mundo servido (`node apps/web/e2e/world/serve.mjs --world <mundo-50.tar.gz> --port 3191`):
 *   node scripts/respuestas-del-mundo.mjs http://localhost:3191 <cuentas.json> apps/api/src/__fixtures__/responses
 *   npx prettier --write apps/api/src/__fixtures__/responses
 *
 * El 19a las guardó con la API del 18b, tal como las daba cada manejador antes del serializador de la frontera.
 * Un PR que cambia el esquema de una de estas rutas las vuelve a pedir con su propia API.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [base, cuentasPath, outDir] = process.argv.slice(2)
const cuentas = JSON.parse(readFileSync(cuentasPath, 'utf8'))
mkdirSync(outDir, { recursive: true })

async function login(email) {
  const r = await fetch(`${base}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: base },
    body: JSON.stringify({ email, password: cuentas.password }),
  })
  if (!r.ok) throw new Error(`sin sesión para ${email}: ${r.status}`)
  return r.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ')
}

const jugador = await login(cuentas.accounts.jugador.email)
const manager = await login(cuentas.accounts.manager.email)

async function pide(method, url, cookie, body) {
  const r = await fetch(`${base}${url}`, {
    method,
    headers: {
      cookie,
      origin: base,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const text = await r.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    // un cuerpo que no es JSON se guarda como null: su ruta no tiene fixture que pasar por el esquema
  }
  return { status: r.status, json }
}

/** Recorta los arrays: los tres primeros y uno más por cada `kind` (o `type`, `at`) que no haya salido. */
function recorta(v) {
  if (Array.isArray(v)) {
    const out = []
    const vistos = new Set()
    for (const x of v) {
      const k =
        x && typeof x === 'object' ? (x.kind ?? x.type ?? x.at ?? x.payload?.kind) : undefined
      const nuevo = k !== undefined && !vistos.has(k)
      if (k !== undefined) vistos.add(k)
      if (v.length <= 30 || out.length < 3 || (nuevo && out.length < 25)) out.push(recorta(x))
    }
    return out
  }
  if (v && typeof v === 'object') {
    const entries = Object.entries(v)
    // un registro grande (los títulos por corredor): sus cinco primeras claves
    const registro = entries.length > 40
    return Object.fromEntries(
      (registro ? entries.slice(0, 5) : entries).map(([k, x]) => [k, recorta(x)]),
    )
  }
  return v
}

const me = (await pide('GET', '/api/riders/me', jugador)).json
const ownId = me.rider.id
const ranking = (await pide('GET', '/api/rankings', jugador)).json
const topId = ranking.riders?.[0]?.riderId ?? ranking.riders?.[0]?.id ?? ownId
const teams = (await pide('GET', '/api/teams', jugador)).json.teams
const wtTeam = teams.find((t) => t.division === 'WT').id
const RACE = 'race-valencia'
const DAY = 3
// la carrera que corre el jugador, para sus órdenes de carrera
const RACE_KEY = (await pide('GET', '/api/riders/me/upcoming-races', jugador)).json.races[0].raceKey

const GETS = [
  ['GET /health', '/health', jugador],
  ['GET /api/names/generate', '/api/names/generate?country=ES&gender=M&seed=s', jugador],
  ['GET /api/calendar', '/api/calendar', jugador],
  ['GET /api/calendar/:raceId', `/api/calendar/${RACE}`, jugador],
  ['GET /api/calendar/:raceId/startlist', `/api/calendar/${RACE}/startlist`, jugador],
  ['GET /api/my-orders', `/api/my-orders?raceKey=${encodeURIComponent(RACE_KEY)}`, jugador],
  ['GET /api/races/:raceId/stages/:day', `/api/races/${RACE}/stages/${DAY}`, jugador],
  ['GET /api/races/:raceId/stages/:day/report', `/api/races/${RACE}/stages/${DAY}/report`, jugador],
  ['GET /api/me/horizon', '/api/me/horizon', jugador],
  ['GET /api/rankings', '/api/rankings', jugador],
  ['GET /api/rankings/young', '/api/rankings/young', jugador],
  ['GET /api/season-awards', '/api/season-awards', jugador],
  ['GET /api/hall-of-fame', '/api/hall-of-fame', jugador],
  ['GET /api/records', '/api/records', jugador],
  ['GET /api/news', '/api/news', jugador],
  ['GET /api/countries', '/api/countries', jugador],
  ['GET /api/countries/:code', '/api/countries/ES', jugador],
  ['GET /api/free-agents', '/api/free-agents', jugador],
  ['GET /api/riders/me', '/api/riders/me', jugador],
  ['GET /api/riders/me/upcoming-races', '/api/riders/me/upcoming-races', jugador],
  ['GET /api/me/team-control', '/api/me/team-control', manager],
  ['GET /api/riders/me/last-race', '/api/riders/me/last-race', jugador],
  ['GET /api/riders/me/orders', '/api/riders/me/orders', jugador],
  ['GET /api/riders/me/plan', '/api/riders/me/plan', jugador],
  ['GET /api/me/team-training', '/api/me/team-training', manager],
  ['GET /api/riders/me/form', '/api/riders/me/form', jugador],
  ['GET /api/riders/me/trend', '/api/riders/me/trend', jugador],
  ['GET /api/riders/me/coach-view', '/api/riders/me/coach-view', jugador],
  ['GET /api/riders/me/report', '/api/riders/me/report', jugador],
  ['GET /api/riders/me/race-prefs', '/api/riders/me/race-prefs', jugador],
  ['GET /api/riders/me/palmares', '/api/riders/me/palmares', jugador],
  ['GET /api/riders/me/summary', '/api/riders/me/summary', jugador],
  ['GET /api/riders/me/ledger', '/api/riders/me/ledger', jugador],
  ['GET /api/riders/me/offers', '/api/riders/me/offers', jugador],
  ['GET /api/riders/me/race-entries', '/api/riders/me/race-entries', jugador],
  ['GET /api/riders/:id/badges', `/api/riders/${topId}/badges`, jugador],
  ['GET /api/riders/:id/palmares', `/api/riders/${topId}/palmares`, jugador],
  ['GET /api/riders/:id/results', `/api/riders/${topId}/results`, jugador],
  ['GET /api/riders/:id', `/api/riders/${topId}`, jugador],
  ['GET /api/teams/me/kit', '/api/teams/me/kit', manager],
  ['GET /api/teams/me/calendar', '/api/teams/me/calendar', manager],
  ['GET /api/teams/me/race-plan', '/api/teams/me/race-plan', jugador],
  ['GET /api/teams', '/api/teams', jugador],
  ['GET /api/teams/:id', `/api/teams/${wtTeam}`, jugador],
  ['GET /api/teams/:id/news', `/api/teams/${wtTeam}/news`, jugador],
]

const resumen = []
const guarda = (route, url, r) => {
  const file = `${route.replace(/^(\w+) \//, '$1_').replace(/[/:]+/g, '_')}.json`
  writeFileSync(
    join(outDir, file),
    JSON.stringify({ route, url, status: r.status, body: recorta(r.json) }, null, 1) + '\n',
  )
  resumen.push(`${r.status} ${route}`)
}
for (const [route, url, cookie] of GETS) guarda(route, url, await pide('GET', url, cookie))

// las dos POST de lectura (CANARY_POST_READS): la vista previa con el plan de ahora y el veredicto del kit de ahora
const plan = (await pide('GET', '/api/riders/me/plan', jugador)).json
if (plan?.plan) {
  const p = plan.plan
  const body = {
    mode: plan.mode,
    plan: { blocks: p.blocks, focusAttr: p.focusAttr, intensity: p.intensity },
    edits: [],
  }
  guarda(
    'POST /api/riders/me/plan/preview',
    '/api/riders/me/plan/preview',
    await pide('POST', '/api/riders/me/plan/preview', jugador, body),
  )
}
const kit = (await pide('GET', '/api/teams/me/kit', manager)).json
if (kit?.current)
  guarda(
    'POST /api/teams/me/kit/check',
    '/api/teams/me/kit/check',
    await pide('POST', '/api/teams/me/kit/check', manager, { kit: kit.current }),
  )

console.log(resumen.join('\n'))
