import {
  getAllTimeRecords,
  getCountriesSummary,
  getCountryRiders,
  getCurrentWorld,
  getFreeAgents,
  getGlobalNews,
  getHallOfFame,
  getRanking,
  getRiderForUser,
  getRiderNews,
  getSeasonAwards,
  getYoungRiders,
} from '@cyclingstar/db'
import { currentSeason, isKnownCountry } from '@cyclingstar/shared'
import { notFound } from '../http.js'
import type { RoutePlugin } from './context.js'

/**
 * Clasificaciones, premios, récords, noticias, naciones y mercado de agentes libres.
 * Todo público (el feed de noticias enriquece si hay sesión con ciclista).
 *
 * Cada lectura recibe el horizonte de quien pide (`request.horizon()`, E2, docs/retransmision.md
 * §10.6; paso 8a): el del visitante, el del mundo con `SPOILER_MODE` apagado para él, o el suyo. Las
 * restas (R) llegan en el 8b; el feed ya pasa el filtro F (§11.7).
 */
export const rankingRoutes: RoutePlugin = async (app, ctx) => {
  const { db, currentUserId } = ctx

  // Ranking individual: puntos de los últimos 365 días de juego (docs/epics.md «G3»).
  app.get(
    '/api/rankings',
    { config: { spoiler: 'horizon', veil: { by: ['R'] } } },
    async (request) => {
      const world = await getCurrentWorld(db)
      if (!world) return { ranking: [] }
      const h = await request.horizon()
      return { ranking: await getRanking(db, h, world.worldId, world.currentDay) }
    },
  )

  // Clasificación de jóvenes de la temporada (#59, maillot blanco).
  app.get(
    '/api/rankings/young',
    { config: { spoiler: 'horizon', veil: { by: ['R'] } } },
    async (request) => {
      const world = await getCurrentWorld(db)
      if (!world) return { ranking: [] }
      const h = await request.horizon()
      return {
        ranking: await getYoungRiders(db, h, world.worldId, currentSeason(world.currentDay)),
      }
    },
  )

  // Premios de la temporada (#60): líderes por categoría (mejor del año, sprinter, escalador, revelación).
  app.get(
    '/api/season-awards',
    { config: { spoiler: 'horizon', veil: { by: ['R'] } } },
    async (request) => {
      const world = await getCurrentWorld(db)
      if (!world) return { awards: null }
      const h = await request.horizon()
      return {
        awards: await getSeasonAwards(db, h, world.worldId, currentSeason(world.currentDay)),
      }
    },
  )

  // Salón de la fama: palmarés acumulado de todas las temporadas (#58).
  app.get(
    '/api/hall-of-fame',
    { config: { spoiler: 'horizon', veil: { by: ['R'] } } },
    async (request) => {
      const world = await getCurrentWorld(db)
      if (!world) return { riders: [] }
      const h = await request.horizon()
      return { riders: await getHallOfFame(db, h, world.worldId, 40) }
    },
  )

  // Récords de todos los tiempos del mundo (#62).
  app.get(
    '/api/records',
    { config: { spoiler: 'horizon', veil: { by: ['R'] } } },
    async (request) => {
      const world = await getCurrentWorld(db)
      if (!world) return { records: null }
      const h = await request.horizon()
      return { records: await getAllTimeRecords(db, h, world.worldId) }
    },
  )

  // Feed de noticias del mundo (Paso 39). Público (como el calendario); si hay sesión con
  // ciclista, incluye también sus noticias personales.
  //
  // BAJO EL VELO (§11.7; E2, paso 8a): sin las noticias de las etapas que quien pide no ha visto y con
  // un `stage_ready` por cada una (F). Los dos titulares de líder (`gc_lead_taken` y `jersey_taken`)
  // salen solo a quien le aplica el velo, y con él pasan el filtro como los demás (17-x).
  app.get('/api/news', { config: { spoiler: 'horizon', veil: { by: ['F'] } } }, async (request) => {
    const world = await getCurrentWorld(db)
    if (!world) return { news: [] }
    const h = await request.horizon()
    const opts = { leaderNews: await request.spoilerApplies() }
    const userId = await currentUserId(request)
    const rider = userId ? await getRiderForUser(db, userId) : null
    const items = rider
      ? await getRiderNews(db, h, world.worldId, rider.id, 40, opts)
      : await getGlobalNews(db, h, world.worldId, 40, opts)
    return { news: items }
  })

  // Naciones (#7): lista de países con corredores y ranking nacional por país. Público.
  app.get(
    '/api/countries',
    { config: { spoiler: 'horizon', veil: { by: ['R'] } } },
    async (request) => {
      const world = await getCurrentWorld(db)
      if (!world) return { countries: [] }
      const h = await request.horizon()
      return { countries: await getCountriesSummary(db, h, world.worldId) }
    },
  )

  app.get<{ Params: { code: string } }>(
    '/api/countries/:code',
    { config: { spoiler: 'horizon', veil: { by: ['R', 'M'] } } },
    async (request, reply) => {
      if (!isKnownCountry(request.params.code)) return notFound(reply)
      const world = await getCurrentWorld(db)
      if (!world) return { code: request.params.code.toUpperCase(), riders: [] }
      const h = await request.horizon()
      return {
        code: request.params.code.toUpperCase(),
        riders: await getCountryRiders(db, h, world.worldId, request.params.code),
      }
    },
  )

  // Agentes libres del mercado (#20): corredores en activo sin equipo, filtrable por país y vocación.
  app.get<{ Querystring: { country?: string; vocation?: string } }>(
    '/api/free-agents',
    { config: { spoiler: 'horizon', veil: { by: ['R'] } } },
    async (request) => {
      const world = await getCurrentWorld(db)
      if (!world) return { riders: [] }
      const h = await request.horizon()
      const country = request.query.country?.trim()
      const vocation = request.query.vocation?.trim()
      return {
        riders: await getFreeAgents(db, h, world.worldId, currentSeason(world.currentDay), {
          ...(country ? { country } : {}),
          ...(vocation ? { archetype: vocation } : {}),
        }),
      }
    },
  )
}
