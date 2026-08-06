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
 */
export const rankingRoutes: RoutePlugin = async (app, ctx) => {
  const { db, currentUserId } = ctx

  // Ranking individual de puntos de la temporada (Paso 40).
  app.get('/api/rankings', async () => {
    const world = await getCurrentWorld(db)
    if (!world) return { ranking: [] }
    return { ranking: await getRanking(db, world.worldId) }
  })

  // Clasificación de jóvenes de la temporada (#59, maillot blanco).
  app.get('/api/rankings/young', async () => {
    const world = await getCurrentWorld(db)
    if (!world) return { ranking: [] }
    return { ranking: await getYoungRiders(db, world.worldId, currentSeason(world.currentDay)) }
  })

  // Premios de la temporada (#60): líderes por categoría (mejor del año, sprinter, escalador, revelación).
  app.get('/api/season-awards', async () => {
    const world = await getCurrentWorld(db)
    if (!world) return { awards: null }
    return { awards: await getSeasonAwards(db, world.worldId, currentSeason(world.currentDay)) }
  })

  // Salón de la fama: palmarés acumulado de todas las temporadas (#58).
  app.get('/api/hall-of-fame', async () => {
    const world = await getCurrentWorld(db)
    if (!world) return { riders: [] }
    return { riders: await getHallOfFame(db, world.worldId, 40) }
  })

  // Récords de todos los tiempos del mundo (#62).
  app.get('/api/records', async () => {
    const world = await getCurrentWorld(db)
    if (!world) return { records: null }
    return { records: await getAllTimeRecords(db, world.worldId) }
  })

  // Feed de noticias del mundo (Paso 39). Público (como el calendario); si hay sesión con
  // ciclista, incluye también sus noticias personales.
  app.get('/api/news', async (request) => {
    const world = await getCurrentWorld(db)
    if (!world) return { news: [] }
    const userId = await currentUserId(request)
    const rider = userId ? await getRiderForUser(db, userId) : null
    const items = rider
      ? await getRiderNews(db, world.worldId, rider.id)
      : await getGlobalNews(db, world.worldId)
    return { news: items }
  })

  // Naciones (#7): lista de países con corredores y ranking nacional por país. Público.
  app.get('/api/countries', async () => {
    const world = await getCurrentWorld(db)
    if (!world) return { countries: [] }
    return { countries: await getCountriesSummary(db, world.worldId) }
  })

  app.get<{ Params: { code: string } }>('/api/countries/:code', async (request, reply) => {
    if (!isKnownCountry(request.params.code)) return notFound(reply)
    const world = await getCurrentWorld(db)
    if (!world) return { code: request.params.code.toUpperCase(), riders: [] }
    return {
      code: request.params.code.toUpperCase(),
      riders: await getCountryRiders(db, world.worldId, request.params.code),
    }
  })

  // Agentes libres del mercado (#20): corredores en activo sin equipo, filtrable por país y vocación.
  app.get<{ Querystring: { country?: string; vocation?: string } }>(
    '/api/free-agents',
    async (request) => {
      const world = await getCurrentWorld(db)
      if (!world) return { riders: [] }
      const country = request.query.country?.trim()
      const vocation = request.query.vocation?.trim()
      return {
        riders: await getFreeAgents(db, world.worldId, currentSeason(world.currentDay), {
          ...(country ? { country } : {}),
          ...(vocation ? { archetype: vocation } : {}),
        }),
      }
    },
  )
}
