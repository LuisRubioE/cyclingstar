import {
  checkKit,
  draftRace,
  getCurrentWorld,
  getRiderTeamRacePlan,
  getTeamCalendar,
  getTeamDetail,
  getTeamKitState,
  getTeamNews,
  getTeams,
  ownedTeamToday,
  saveTeamKit,
  takeOverBotTeam,
  undraftRace,
  updateOwnedTeam,
} from '@cyclingstar/db'
import {
  type KitCheckCode,
  kitCheckBodySchema,
  kitRecentErrorSchema,
  kitSaveBodySchema,
  kitSaveResponseSchema,
  kitVerdictSchema,
  teamKitResponseSchema,
} from '@cyclingstar/shared'
import { z } from 'zod'
import { badRequest, notFound, sendError, unauthorized } from '../http.js'
import { diagHorizon } from '../spoiler.js'
import type { RoutePlugin } from './context.js'
import { parseRaceId, parseUuid } from './params.js'

// El nombre y el país; el maillot va por su editor desde el 18a (E3, docs/visual.md §8.7), y
// `jerseySeed` ya no se acepta: una clave de más se quita, y sola no cambia nada.
const teamEditSchema = z
  .object({
    name: z.string().trim().min(2).max(40).optional(),
    country: z.string().trim().length(2).optional(),
  })
  .refine((v) => v.name !== undefined || v.country !== undefined, {
    message: 'nada_que_cambiar',
  })

/** El código HTTP de cada porqué del guardado del maillot (§8.7); `kit_reciente` va aparte, con su 429. */
const KIT_SAVE_STATUS: Readonly<
  Record<Exclude<KitCheckCode, 'kit_reciente'> | 'sin_equipo', number>
> = {
  kit_igual: 400,
  kit_contraste: 400,
  kit_reservado: 409,
  kit_ocupado: 409,
  kit_se_confunde: 409,
  sin_equipo: 409,
}

/**
 * Rutas de equipo: control del equipo propio (tomar el control, editarlo, planificar su
 * calendario) y exploración pública del mundo (lista de equipos y ficha de equipo).
 */
export const teamRoutes: RoutePlugin = async (app, ctx) => {
  const { db, currentUserId } = ctx

  // Un jugador premium toma el control del equipo bot en el que corre su ciclista (SPEC 7).
  app.post('/api/teams/take-over', { config: { spoiler: 'safe' } }, async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const result = await takeOverBotTeam(db, userId)
    if (!result.ok) {
      const status = result.reason === 'no_premium' ? 403 : 409
      return sendError(reply, status, result.reason)
    }
    return { ok: true, teamId: result.teamId, teamName: result.teamName }
  })

  // El dueño edita su equipo: nombre (validado como el de un ciclista) y país (SPEC 7).
  app.put('/api/teams/me', { config: { spoiler: 'safe' } }, async (request, reply) => {
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

  // EL EDITOR DEL MAILLOT (E3, docs/visual.md §8.7; PR 18a): lo que pinta, el veredicto y el guardado,
  // `safe` y con su esquema de respuesta, que el serializador recorta (§13.3). Un cambio por temporada
  // (D-00k): su 429 `kit_reciente` va sin `retry-after`, que no es el límite de peticiones (8-v).
  app.get(
    '/api/teams/me/kit',
    { config: { spoiler: 'safe' }, schema: { response: { 200: teamKitResponseSchema } } },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const team = await ownedTeamToday(db, userId)
      if (!team) return sendError(reply, 409, 'sin_equipo')
      return getTeamKitState(db, team)
    },
  )

  // El veredicto, a los 300 ms del último toque en el editor: la autoridad es esta, no la pantalla.
  app.post(
    '/api/teams/me/kit/check',
    { config: { spoiler: 'safe' }, schema: { response: { 200: kitVerdictSchema } } },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const parsed = kitCheckBodySchema.safeParse(request.body)
      if (!parsed.success) return badRequest(reply)
      const team = await ownedTeamToday(db, userId)
      if (!team) return sendError(reply, 409, 'sin_equipo')
      return checkKit(db, { ...team, kit: parsed.data.kit })
    },
  )

  app.put(
    '/api/teams/me/kit',
    {
      config: { spoiler: 'safe' },
      schema: { response: { 200: kitSaveResponseSchema, 429: kitRecentErrorSchema } },
    },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const parsed = kitSaveBodySchema.safeParse(request.body)
      if (!parsed.success) return badRequest(reply)
      const result = await saveTeamKit(db, userId, parsed.data)
      if (result.ok) return { ok: true as const, validFromDay: result.validFromDay }
      if (result.code === 'kit_reciente')
        return reply.status(429).send({
          ok: false as const,
          error: 'kit_reciente' as const,
          nextChangeDay: result.nextChangeDay,
        })
      return sendError(reply, KIT_SAVE_STATUS[result.code], result.code)
    },
  )

  // Draft de calendario del EQUIPO (lo hace el manager): lista las carreras elegibles con el coste
  // de viaje y permite añadir/quitar del plan. Solo para quien gestiona un equipo.
  app.get(
    '/api/teams/me/calendar',
    { config: { spoiler: 'horizon', veil: { by: ['R'] } } },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const world = await getCurrentWorld(db)
      if (!world) return { calendar: null }
      return {
        calendar: await getTeamCalendar(db, await request.horizon(), userId, world.currentDay),
      }
    },
  )

  // Plan de carreras del equipo al que PERTENECE el corredor, en SOLO LECTURA (§3.4).
  //
  // `/api/teams/me/calendar` exige gestionar el equipo, así que un corredor de a pie —el caso normal
  // hoy, que todos los equipos son bots— no podía ver a qué carreras va el suyo. Este endpoint
  // responde justo a eso y a nada más: el programa, sin presupuesto ni salarios, que no son asunto
  // de un miembro de la plantilla.
  app.get('/api/teams/me/race-plan', { config: { spoiler: 'safe' } }, async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const world = await getCurrentWorld(db)
    if (!world) return { plan: null }
    return { plan: await getRiderTeamRacePlan(db, userId, world.currentDay) }
  })

  app.post<{ Params: { raceId: string } }>(
    '/api/teams/me/calendar/:raceId',
    { config: { spoiler: 'safe' } },
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
    { config: { spoiler: 'safe' } },
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
  app.get(
    '/api/teams',
    { config: { spoiler: 'horizon', veil: { by: ['R'] } } },
    async (request) => {
      const world = await getCurrentWorld(db)
      if (!world) return { teams: [] }
      return { teams: await getTeams(db, await request.horizon(), world.worldId) }
    },
  )

  app.get<{ Params: { id: string } }>(
    '/api/teams/:id',
    { config: { spoiler: 'horizon', veil: { by: ['R', 'M'] } } },
    async (request, reply) => {
      const teamId = parseUuid(request.params.id)
      if (!teamId) return notFound(reply)
      const team = await getTeamDetail(db, await request.horizon(), teamId)
      if (!team) return notFound(reply)
      return { team }
    },
  )

  // Noticias del equipo (#16): titulares de sus corredores. Bajo el velo (§11.7, 11-g; E2, paso 8a):
  // sin las de las etapas que quien pide no ha visto, con un marcador por cada etapa velada de cada
  // carrera en cuya lista de salida está el equipo, y los titulares de líder solo a quien le aplica el
  // velo (17-x). Con `?diag=1`, a un administrador con sesión, con el horizonte del mundo (§11.15).
  app.get<{ Params: { id: string } }>(
    '/api/teams/:id/news',
    { config: { spoiler: 'horizon', veil: { by: ['F'] } } },
    async (request, reply) => {
      const teamId = parseUuid(request.params.id)
      if (!teamId) return notFound(reply)
      const h = await diagHorizon(request)
      const opts = { leaderNews: await request.spoilerApplies() }
      return { news: await getTeamNews(db, h, teamId, 15, opts) }
    },
  )
}
