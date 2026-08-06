import {
  draftRace,
  getCurrentWorld,
  getRiderTeamRacePlan,
  getTeamCalendar,
  getTeamDetail,
  getTeamNews,
  getTeams,
  takeOverBotTeam,
  undraftRace,
  updateOwnedTeam,
} from '@cyclingstar/db'
import { z } from 'zod'
import { badRequest, notFound, sendError, unauthorized } from '../http.js'
import type { RoutePlugin } from './context.js'
import { parseRaceId, parseUuid } from './params.js'

const teamEditSchema = z
  .object({
    name: z.string().trim().min(2).max(40).optional(),
    country: z.string().trim().length(2).optional(),
    jerseySeed: z.string().trim().min(1).max(120).optional(),
  })
  .refine((v) => v.name !== undefined || v.country !== undefined || v.jerseySeed !== undefined, {
    message: 'nada_que_cambiar',
  })

/**
 * Rutas de equipo: control del equipo propio (tomar el control, editarlo, planificar su
 * calendario) y exploración pública del mundo (lista de equipos y ficha de equipo).
 */
export const teamRoutes: RoutePlugin = async (app, ctx) => {
  const { db, currentUserId } = ctx

  // Un jugador premium toma el control del equipo bot en el que corre su ciclista (SPEC 7).
  app.post('/api/teams/take-over', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const result = await takeOverBotTeam(db, userId)
    if (!result.ok) {
      const status = result.reason === 'no_premium' ? 403 : 409
      return sendError(reply, status, result.reason)
    }
    return { ok: true, teamId: result.teamId, teamName: result.teamName }
  })

  // El dueño edita su equipo: nombre (validado como el de un ciclista), país y maillot (SPEC 7).
  app.put('/api/teams/me', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const parsed = teamEditSchema.safeParse(request.body)
    if (!parsed.success) return badRequest(reply)
    const result = await updateOwnedTeam(db, userId, parsed.data)
    if (!result.ok) {
      const status = result.reason === 'sin_equipo' ? 409 : 400
      return sendError(reply, status, result.reason)
    }
    return { ok: true }
  })

  // Draft de calendario del EQUIPO (lo hace el manager): lista las carreras elegibles con el coste
  // de viaje y permite añadir/quitar del plan. Solo para quien gestiona un equipo.
  app.get('/api/teams/me/calendar', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const world = await getCurrentWorld(db)
    if (!world) return { calendar: null }
    return { calendar: await getTeamCalendar(db, userId, world.currentDay) }
  })

  // Plan de carreras del equipo al que PERTENECE el corredor, en SOLO LECTURA (§3.4).
  //
  // `/api/teams/me/calendar` exige gestionar el equipo, así que un corredor de a pie —el caso normal
  // hoy, que todos los equipos son bots— no podía ver a qué carreras va el suyo. Este endpoint
  // responde justo a eso y a nada más: el programa, sin presupuesto ni salarios, que no son asunto
  // de un miembro de la plantilla.
  app.get('/api/teams/me/race-plan', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const world = await getCurrentWorld(db)
    if (!world) return { plan: null }
    return { plan: await getRiderTeamRacePlan(db, userId, world.currentDay) }
  })

  app.post<{ Params: { raceId: string } }>(
    '/api/teams/me/calendar/:raceId',
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const raceId = parseRaceId(request.params.raceId)
      if (!raceId) return badRequest(reply)
      const world = await getCurrentWorld(db)
      if (!world) return sendError(reply, 409, 'sin_mundo')
      const res = await draftRace(db, userId, raceId, world.currentDay)
      if (!res.ok) return sendError(reply, 409, res.error ?? 'no_disponible')
      return { ok: true }
    },
  )

  app.delete<{ Params: { raceId: string } }>(
    '/api/teams/me/calendar/:raceId',
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const raceId = parseRaceId(request.params.raceId)
      if (!raceId) return badRequest(reply)
      const world = await getCurrentWorld(db)
      if (!world) return sendError(reply, 409, 'sin_mundo')
      const res = await undraftRace(db, userId, raceId, world.currentDay)
      if (!res.ok) return sendError(reply, 409, res.error ?? 'no_disponible')
      return { ok: true }
    },
  )

  // Explorar el mundo (#13/#14): lista de equipos y ficha de equipo. Público.
  app.get('/api/teams', async () => {
    const world = await getCurrentWorld(db)
    if (!world) return { teams: [] }
    return { teams: await getTeams(db, world.worldId) }
  })

  app.get<{ Params: { id: string } }>('/api/teams/:id', async (request, reply) => {
    const teamId = parseUuid(request.params.id)
    if (!teamId) return notFound(reply)
    const team = await getTeamDetail(db, teamId)
    if (!team) return notFound(reply)
    return { team }
  })

  // Noticias del equipo (#16): titulares de sus corredores.
  app.get<{ Params: { id: string } }>('/api/teams/:id/news', async (request, reply) => {
    const teamId = parseUuid(request.params.id)
    if (!teamId) return notFound(reply)
    return { news: await getTeamNews(db, teamId) }
  })
}
