import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import fastifyStatic from '@fastify/static'
import {
  type Database,
  type StageOrderRow,
  type TickSummary,
  type TrainingOrderRow,
  acceptOffer,
  addToRoster,
  addBlocked,
  type BlockedKind,
  createRider,
  getWorldClock,
  generateName,
  generateUniqueRiderName,
  getCountriesSummary,
  getCountryRiders,
  getFreeAgents,
  getWorldHealth,
  getAccountControl,
  setUserPremium,
  takeOverBotTeam,
  updateOwnedTeam,
  listBlocked,
  removeBlocked,
  getContract,
  getCurrentWorld,
  getDailyLog,
  getGlobalNews,
  getPublicRider,
  getTeamDetail,
  getTeamNews,
  getTeams,
  getLedger,
  getPalmares,
  getRaceHistory,
  getHallOfFame,
  getAllTimeRecords,
  getRanking,
  getRiderBadges,
  getSeasonAwards,
  getRiderNews,
  getSeasonWinners,
  getGcThroughStage,
  getKomClassification,
  getOffers,
  getPointsClassification,
  getRaceGc,
  getRacePrefs,
  getRiderForUser,
  getRiderLastRaceReport,
  getRiderRaceDays,
  getRiderSummary,
  setRiderArchetype,
  getRunStageDays,
  getStageOrders,
  getStageResults,
  getStageSnapshot,
  getStageWinners,
  getTrainingOrders,
  rejectOffer,
  setRacePref,
  setStageOrders,
  teamsClassification,
  setTrainingOrders,
} from '@cyclingstar/db'
import {
  ENGINE_VERSION,
  type AltimetryMarker,
  SEASON_CALENDAR,
  type StageInput,
  TEST_TOUR,
  formStars,
  freshnessBar,
  generateRiderGenome,
  renderAltimetrySvg,
  simulateStage,
} from '@cyclingstar/engine'
import { type Health, isKnownCountry, seasonPosition } from '@cyclingstar/shared'
import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type FastifyServerOptions,
} from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { Auth } from './auth.js'

/** Convierte las cabeceras de una petición Fastify en un objeto Headers estándar. */
function toWebHeaders(request: FastifyRequest): Headers {
  const headers = new Headers()
  for (const [key, value] of Object.entries(request.headers)) {
    if (key.toLowerCase() === 'content-length') continue
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v)
    } else if (value != null) {
      headers.append(key, value)
    }
  }
  return headers
}

export interface AppDeps {
  /** Base de datos (opcional en tests). Cuando está, /health lee la fecha de juego. */
  db?: Database
  /** Si las migraciones se aplicaron al arrancar (SPEC 12). */
  migrationsApplied?: boolean
  /** Minutos reales por día de juego (TICK_INTERVAL_MINUTES); lo reporta /health. */
  tickIntervalMinutes?: number
  /** Config del logger pino de Fastify. */
  logger?: FastifyServerOptions['logger']
  /** Servir la web compilada. Por defecto se autodetecta si existe la build de Vite. */
  serveWeb?: boolean
  /** Instancia de better-auth; si está, se monta en /api/auth/* (Paso 9). */
  auth?: Auth
  /** Token que protege POST /admin/tick (Paso 10). */
  adminToken?: string
  /** Ejecutor del tick manual para POST /admin/tick (Paso 10). */
  onAdminTick?: () => Promise<TickSummary>
  /** Avance forzado de N días de juego para pruebas: POST /admin/advance (Paso 32). */
  onAdminAdvance?: (days: number) => Promise<TickSummary>
}

/** Carpeta de la web compilada (apps/web/dist). Vacía de index.html hasta el Paso 8. */
const webRoot = fileURLToPath(new URL('../../web/dist', import.meta.url))

/**
 * Construye la instancia de Fastify de la API (SPEC 12).
 * Paso 7: logging pino, validación Zod en los bordes, manejo uniforme de errores,
 * servido de los estáticos de apps/web (latente hasta que exista la build) y /health.
 */
export function buildApp(deps: AppDeps = {}): FastifyInstance {
  // trustProxy: detrás del proxy de Railway (TLS terminado), para resolver bien
  // protocolo (https), host e IP de cliente a partir de las cabeceras X-Forwarded-*.
  const app = Fastify({ logger: deps.logger ?? false, trustProxy: true })

  // Zod como validador/serializador en los bordes: las rutas futuras validan su
  // entrada y salida con esquemas Zod.
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // Manejo uniforme de errores.
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (error.validation) {
      reply.status(400).send({ ok: false, error: 'validacion', detalles: error.validation })
      return
    }
    const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500
    if (statusCode >= 500) {
      request.log.error(error)
      reply.status(500).send({ ok: false, error: 'interno' })
      return
    }
    reply.status(statusCode).send({ ok: false, error: error.message })
  })

  app.get('/health', async (): Promise<Health> => {
    let gameDay: number | null = null
    let nextTickAtMs: number | null = null
    const tickIntervalMinutes = deps.tickIntervalMinutes ?? 360
    if (deps.db) {
      const clock = await getWorldClock(deps.db)
      if (clock) {
        gameDay = clock.currentDay
        // Próximo avance: creación del mundo + (día+1) periodos (targetGameDay = floor(elapsed/ms)).
        const msPerGameDay = tickIntervalMinutes * 60_000
        nextTickAtMs = clock.createdAtMs + (clock.currentDay + 1) * msPerGameDay
      }
    }
    return {
      ok: true,
      engineVersion: ENGINE_VERSION,
      gameDay,
      migrationsApplied: deps.migrationsApplied ?? false,
      tickIntervalMinutes,
      nextTickAtMs,
    }
  })

  // Tick manual protegido (Paso 10): recuperación y desarrollo (SPEC 12).
  if (deps.onAdminTick) {
    const onAdminTick = deps.onAdminTick
    const adminToken = deps.adminToken
    app.post('/admin/tick', async (request, reply) => {
      const provided = request.headers['x-admin-token']
      if (!adminToken || provided !== adminToken) {
        return reply.status(401).send({ ok: false, error: 'no_autorizado' })
      }
      const summary = await onAdminTick()
      return reply.send({ ok: true, ...summary })
    })
  }

  // Avance forzado de días para pruebas (Paso 32): POST /admin/advance?days=N. Ignora el tiempo
  // real y procesa N días de juego (carreras + entrenamiento). Protegido por ADMIN_TOKEN.
  if (deps.onAdminAdvance) {
    const onAdminAdvance = deps.onAdminAdvance
    const adminToken = deps.adminToken
    app.post<{ Querystring: { days?: string } }>('/admin/advance', async (request, reply) => {
      const provided = request.headers['x-admin-token']
      if (!adminToken || provided !== adminToken) {
        return reply.status(401).send({ ok: false, error: 'no_autorizado' })
      }
      const days = Math.min(30, Math.max(1, Number(request.query.days ?? 1) || 1))
      const summary = await onAdminAdvance(days)
      return reply.send({ ok: true, ...summary })
    })
  }

  // Lista de bloqueo de nombres (equipos reales, ciclistas/famosos reales), curada por admins.
  // Protegida por ADMIN_TOKEN (cabecera x-admin-token). "Base secreta" no enlazada en la web.
  if (deps.db) {
    const db = deps.db
    const adminToken = deps.adminToken
    const kindSchema = z.enum(['team', 'rider'])
    const addSchema = z.object({
      kind: kindSchema,
      value: z.string().trim().min(1).max(120),
      note: z.string().trim().max(200).optional(),
    })
    const premiumSchema = z.object({
      email: z.string().trim().email().max(200),
      premium: z.boolean(),
    })

    const requireAdmin = (request: FastifyRequest, reply: FastifyReply): boolean => {
      const provided = request.headers['x-admin-token']
      if (!adminToken || provided !== adminToken) {
        reply.status(401).send({ ok: false, error: 'no_autorizado' })
        return false
      }
      return true
    }

    app.get<{ Querystring: { kind?: string } }>('/api/admin/blocklist', async (request, reply) => {
      if (!requireAdmin(request, reply)) return
      const kind = kindSchema.safeParse(request.query.kind)
      if (!kind.success) return reply.status(400).send({ ok: false, error: 'validacion' })
      return { ok: true, items: await listBlocked(db, kind.data as BlockedKind) }
    })

    app.post('/api/admin/blocklist', async (request, reply) => {
      if (!requireAdmin(request, reply)) return
      const parsed = addSchema.safeParse(request.body)
      if (!parsed.success) return reply.status(400).send({ ok: false, error: 'validacion' })
      const { kind, value, note } = parsed.data
      const { inserted } = await addBlocked(db, kind as BlockedKind, value, note ?? null)
      return reply.status(inserted ? 201 : 200).send({ ok: true, inserted })
    })

    app.delete<{ Params: { id: string } }>('/api/admin/blocklist/:id', async (request, reply) => {
      if (!requireAdmin(request, reply)) return
      const id = z.string().uuid().safeParse(request.params.id)
      if (!id.success) return reply.status(400).send({ ok: false, error: 'validacion' })
      await removeBlocked(db, id.data)
      return { ok: true }
    })

    // Salud del mundo para el panel de admin (#84): día, censo y últimos ticks. Solo lectura.
    app.get('/api/admin/health', async (request, reply) => {
      if (!requireAdmin(request, reply)) return
      return { ok: true, health: await getWorldHealth(db) }
    })

    // Concede/retira premium por email (admin). Premium habilita tomar el control de un equipo bot.
    app.post('/api/admin/premium', async (request, reply) => {
      if (!requireAdmin(request, reply)) return
      const parsed = premiumSchema.safeParse(request.body)
      if (!parsed.success) return reply.status(400).send({ ok: false, error: 'validacion' })
      const { updated } = await setUserPremium(db, parsed.data.email, parsed.data.premium)
      if (!updated) return reply.status(404).send({ ok: false, error: 'usuario_no_encontrado' })
      return { ok: true }
    })
  }

  // Montaje de better-auth en /api/auth/* (Paso 9). Reconstruye una Request web a partir
  // de la petición de Fastify y reenvía la respuesta, preservando las cookies de sesión.
  if (deps.auth) {
    const auth = deps.auth
    app.route({
      method: ['GET', 'POST'],
      url: '/api/auth/*',
      async handler(request, reply) {
        const url = new URL(request.url, `${request.protocol}://${request.host}`)
        const init: RequestInit = { method: request.method, headers: toWebHeaders(request) }
        const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
        if (hasBody && request.body != null) {
          init.body = JSON.stringify(request.body)
        }
        const webRequest = new Request(url, init)

        const response = await auth.handler(webRequest)

        reply.status(response.status)
        for (const [key, value] of response.headers.entries()) {
          if (key.toLowerCase() === 'set-cookie') continue
          reply.header(key, value)
        }
        for (const cookie of response.headers.getSetCookie()) {
          reply.header('set-cookie', cookie)
        }
        const body = await response.text()
        return reply.send(body.length > 0 ? body : null)
      },
    })
  }

  // Creación y consulta del ciclista (SPEC 3, Pasos 14-16). Requiere auth y base de datos.
  if (deps.auth && deps.db) {
    const auth = deps.auth
    const db = deps.db

    const genderSchema = z.enum(['M', 'F'])
    const nameQuerySchema = z.object({
      country: z.string().length(2),
      gender: genderSchema,
      seed: z.string().min(1),
    })
    const createRiderSchema = z.object({
      vocation: z.enum(['escalada', 'velocidad', 'clasicas', 'crono', 'fondo']),
      gender: genderSchema,
      country: z.string().length(2),
      nameSeed: z.string().min(1),
    })

    const currentUserId = async (request: FastifyRequest): Promise<string | null> => {
      const session = await auth.api.getSession({ headers: toWebHeaders(request) })
      return session?.user.id ?? null
    }

    // País por IP (Paso 14): tras Cloudflare, cabecera CF-IPCountry. Sin ella, null (selector).
    app.get('/api/geo/country', (request) => {
      const raw = request.headers['cf-ipcountry']
      const code = typeof raw === 'string' ? raw.toUpperCase() : null
      return { country: code && isKnownCountry(code) ? code : null }
    })

    // Generación de nombre (Paso 13/15): server-side, respeta la lista de bloqueo y evita
    // colisiones con corredores en activo del mundo (ni bots ni humanos repetidos).
    app.get('/api/names/generate', async (request, reply) => {
      const parsed = nameQuerySchema.safeParse(request.query)
      if (!parsed.success) {
        return reply.status(400).send({ ok: false, error: 'validacion' })
      }
      const { country, gender, seed } = parsed.data
      if (!isKnownCountry(country)) {
        return reply.status(400).send({ ok: false, error: 'pais_desconocido' })
      }
      const world = await getCurrentWorld(db)
      if (!world) return generateName(seed, { country: country.toLowerCase(), gender })
      return generateUniqueRiderName(db, world.worldId, seed, {
        country: country.toLowerCase(),
        gender,
      })
    })

    // El ciclista del usuario (o null si aún no ha creado uno).
    app.get('/api/riders/me', async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) {
        return reply.status(401).send({ ok: false, error: 'no_autorizado' })
      }
      return { rider: await getRiderForUser(db, userId) }
    })

    // Estado de control de equipo del usuario: si es premium y si su equipo sigue siendo bot
    // (reclamable) o ya es suyo. La web lo usa para mostrar el botón de "tomar control".
    app.get('/api/me/team-control', async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return reply.status(401).send({ ok: false, error: 'no_autorizado' })
      return { control: await getAccountControl(db, userId) }
    })

    // Un jugador premium toma el control del equipo bot en el que corre su ciclista (SPEC 7).
    app.post('/api/teams/take-over', async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return reply.status(401).send({ ok: false, error: 'no_autorizado' })
      const result = await takeOverBotTeam(db, userId)
      if (!result.ok) {
        const status = result.reason === 'no_premium' ? 403 : 409
        return reply.status(status).send({ ok: false, error: result.reason })
      }
      return { ok: true, teamId: result.teamId, teamName: result.teamName }
    })

    // El dueño edita su equipo: nombre (validado como el de un ciclista), país y maillot (SPEC 7).
    app.put('/api/teams/me', async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return reply.status(401).send({ ok: false, error: 'no_autorizado' })
      const parsed = teamEditSchema.safeParse(request.body)
      if (!parsed.success) return reply.status(400).send({ ok: false, error: 'validacion' })
      const result = await updateOwnedTeam(db, userId, parsed.data)
      if (!result.ok) {
        const status = result.reason === 'sin_equipo' ? 409 : 400
        return reply.status(status).send({ ok: false, error: result.reason })
      }
      return { ok: true }
    })

    // Crear el ciclista (SPEC 3.5). El genoma lo genera el servidor (no lo controla el cliente).
    app.post('/api/riders', async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) {
        return reply.status(401).send({ ok: false, error: 'no_autorizado' })
      }
      const parsed = createRiderSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ ok: false, error: 'validacion' })
      }
      const { vocation, gender, country, nameSeed } = parsed.data
      if (!isKnownCountry(country)) {
        return reply.status(400).send({ ok: false, error: 'pais_desconocido' })
      }
      if (await getRiderForUser(db, userId)) {
        return reply.status(409).send({ ok: false, error: 'ya_tienes_ciclista' })
      }
      const world = await getCurrentWorld(db)
      if (!world) {
        return reply.status(409).send({ ok: false, error: 'mundo_no_inicializado' })
      }
      const name = await generateUniqueRiderName(db, world.worldId, nameSeed, {
        country: country.toLowerCase(),
        gender,
      })
      const genome = generateRiderGenome(randomUUID(), vocation)
      const created = await createRider(db, {
        worldId: world.worldId,
        userId,
        name: name.fullName,
        country: country.toUpperCase(),
        gender,
        archetype: vocation,
        birthSeason: seasonPosition(world.currentDay).season,
        faceSeed: randomUUID(),
        attributes: genome.attributes,
        hidden: genome.hidden,
      })
      return reply.status(201).send({ ok: true, id: created.id })
    })

    // Informe personal de la última carrera: qué ordené vs qué pasó (backlog extra).
    app.get('/api/riders/me/last-race', async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return reply.status(401).send({ ok: false, error: 'no_autorizado' })
      const rider = await getRiderForUser(db, userId)
      if (!rider) return { report: null }
      return { report: await getRiderLastRaceReport(db, rider.id) }
    })

    // Cambiar la vocación declarada (la "etiqueta") del corredor. No toca techos ni atributos:
    // el corredor decide luego alinear su entrenamiento; influye en las convocatorias por tipo.
    const archetypeSchema = z.object({
      archetype: z.enum(['escalada', 'velocidad', 'clasicas', 'crono', 'fondo']),
    })
    const teamEditSchema = z
      .object({
        name: z.string().trim().min(2).max(40).optional(),
        country: z.string().trim().length(2).optional(),
        jerseySeed: z.string().trim().min(1).max(120).optional(),
      })
      .refine(
        (v) => v.name !== undefined || v.country !== undefined || v.jerseySeed !== undefined,
        {
          message: 'nada_que_cambiar',
        },
      )
    app.put('/api/riders/me/archetype', async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return reply.status(401).send({ ok: false, error: 'no_autorizado' })
      const parsed = archetypeSchema.safeParse(request.body)
      if (!parsed.success) return reply.status(400).send({ ok: false, error: 'validacion' })
      const rider = await getRiderForUser(db, userId)
      if (!rider) return reply.status(404).send({ ok: false, error: 'sin_ciclista' })
      await setRiderArchetype(db, rider.id, parsed.data.archetype)
      return { ok: true }
    })

    // --- Planificador de entrenamiento (Paso 18) ---
    const TRAINING_HORIZON_DAYS = 28

    const orderSchema = z.object({
      gameDay: z.number().int().positive(),
      session: z.enum([
        'descanso_total',
        'descanso_activo',
        'fondo',
        'umbral',
        'puertos',
        'sprint',
        'crono',
        'bajada_paves',
        'gimnasio',
        'video_tactica',
        'viaje',
      ]),
      intensity: z.enum(['suave', 'normal', 'fuerte']),
    })
    const putOrdersSchema = z.object({ orders: z.array(orderSchema).max(TRAINING_HORIZON_DAYS) })
    const putRacePrefSchema = z.object({ raceId: z.string(), wanted: z.boolean() })

    app.get('/api/riders/me/orders', async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return reply.status(401).send({ ok: false, error: 'no_autorizado' })
      const rider = await getRiderForUser(db, userId)
      const world = await getCurrentWorld(db)
      if (!rider || !world)
        return {
          currentDay: world?.currentDay ?? 0,
          horizonDays: TRAINING_HORIZON_DAYS,
          orders: [],
          raceDays: [],
        }
      const orders = await getTrainingOrders(
        db,
        rider.id,
        world.currentDay + 1,
        world.currentDay + TRAINING_HORIZON_DAYS,
      )
      // Días con carrera: no se entrenan (la carrera es su carga).
      const raceDays = await getRiderRaceDays(
        db,
        rider.id,
        world.currentDay + 1,
        world.currentDay + TRAINING_HORIZON_DAYS,
      )
      return { currentDay: world.currentDay, horizonDays: TRAINING_HORIZON_DAYS, orders, raceDays }
    })

    // Serie de forma para la gráfica del perfil (Paso 20).
    app.get('/api/riders/me/form', async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return reply.status(401).send({ ok: false, error: 'no_autorizado' })
      const rider = await getRiderForUser(db, userId)
      if (!rider) return { log: [], form: null }
      const log = await getDailyLog(db, rider.id, 90)
      const latest = log[log.length - 1]
      const form = latest
        ? { stars: formStars(latest.ctl, latest.tsb), freshness: freshnessBar(latest.tsb) }
        : null
      return { log, form }
    })

    // Objetivos de calendario del corredor y su convocatoria (Paso 35).
    app.get('/api/riders/me/race-prefs', async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return reply.status(401).send({ ok: false, error: 'no_autorizado' })
      const rider = await getRiderForUser(db, userId)
      const world = await getCurrentWorld(db)
      if (!rider || !world) return { races: [] }
      const season = seasonPosition(world.currentDay).season
      return { races: await getRacePrefs(db, rider.id, season) }
    })

    app.put('/api/riders/me/race-prefs', async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return reply.status(401).send({ ok: false, error: 'no_autorizado' })
      const parsed = putRacePrefSchema.safeParse(request.body)
      if (!parsed.success) return reply.status(400).send({ ok: false, error: 'validacion' })
      const rider = await getRiderForUser(db, userId)
      if (!rider) return reply.status(409).send({ ok: false, error: 'sin_ciclista' })
      await setRacePref(db, rider.id, parsed.data.raceId, parsed.data.wanted)
      return { ok: true }
    })

    // Ranking individual de puntos de la temporada (Paso 40). Público.
    app.get('/api/rankings', async () => {
      const world = await getCurrentWorld(db)
      if (!world) return { ranking: [] }
      return { ranking: await getRanking(db, world.worldId) }
    })

    // Premios de la temporada (#60): líderes por categoría (mejor del año, sprinter, escalador, revelación).
    app.get('/api/season-awards', async () => {
      const world = await getCurrentWorld(db)
      if (!world) return { awards: null }
      const season = seasonPosition(world.currentDay).season
      return { awards: await getSeasonAwards(db, world.worldId, season) }
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

    // Palmarés del corredor de la sesión (Paso 40).
    app.get('/api/riders/me/palmares', async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return reply.status(401).send({ ok: false, error: 'no_autorizado' })
      const rider = await getRiderForUser(db, userId)
      if (!rider) return { palmares: [] }
      return { palmares: await getPalmares(db, rider.id) }
    })

    // Historial de ganadores de la vuelta de prueba (Paso 40). Público.
    app.get('/api/races/test-tour/history', async () => {
      const world = await getCurrentWorld(db)
      if (!world) return { history: [] }
      return { history: await getRaceHistory(db, world.worldId, TEST_TOUR_ID) }
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

    // Estado del corredor (equipo, moral, dinero, fama, puntos) para la cabecera del perfil.
    app.get('/api/riders/me/summary', async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return reply.status(401).send({ ok: false, error: 'no_autorizado' })
      const rider = await getRiderForUser(db, userId)
      if (!rider) return { summary: null }
      return { summary: await getRiderSummary(db, rider.id) }
    })

    // Libro de transacciones y saldo (Paso 38).
    app.get('/api/riders/me/ledger', async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return reply.status(401).send({ ok: false, error: 'no_autorizado' })
      const rider = await getRiderForUser(db, userId)
      if (!rider) return { balance: 0, entries: [] }
      return getLedger(db, rider.id)
    })

    // Bandeja de ofertas y contrato vigente (Paso 36).
    app.get('/api/riders/me/offers', async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return reply.status(401).send({ ok: false, error: 'no_autorizado' })
      const rider = await getRiderForUser(db, userId)
      if (!rider) return { offers: [], contract: null }
      return { offers: await getOffers(db, rider.id), contract: await getContract(db, rider.id) }
    })

    app.post<{ Params: { id: string } }>(
      '/api/riders/me/offers/:id/accept',
      async (request, reply) => {
        const userId = await currentUserId(request)
        if (!userId) return reply.status(401).send({ ok: false, error: 'no_autorizado' })
        const rider = await getRiderForUser(db, userId)
        if (!rider) return reply.status(409).send({ ok: false, error: 'sin_ciclista' })
        try {
          await acceptOffer(db, rider.id, request.params.id)
        } catch {
          return reply.status(409).send({ ok: false, error: 'oferta_no_disponible' })
        }
        return { ok: true }
      },
    )

    app.post<{ Params: { id: string } }>(
      '/api/riders/me/offers/:id/reject',
      async (request, reply) => {
        const userId = await currentUserId(request)
        if (!userId) return reply.status(401).send({ ok: false, error: 'no_autorizado' })
        const rider = await getRiderForUser(db, userId)
        if (!rider) return reply.status(409).send({ ok: false, error: 'sin_ciclista' })
        await rejectOffer(db, rider.id, request.params.id)
        return { ok: true }
      },
    )

    app.put('/api/riders/me/orders', async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return reply.status(401).send({ ok: false, error: 'no_autorizado' })
      const parsed = putOrdersSchema.safeParse(request.body)
      if (!parsed.success) return reply.status(400).send({ ok: false, error: 'validacion' })
      const rider = await getRiderForUser(db, userId)
      const world = await getCurrentWorld(db)
      if (!rider || !world) return reply.status(409).send({ ok: false, error: 'sin_ciclista' })
      // Solo días futuros dentro del horizonte (SPEC 5.2: cola de 7 a 28 días).
      const valid: TrainingOrderRow[] = parsed.data.orders.filter(
        (order) =>
          order.gameDay > world.currentDay &&
          order.gameDay <= world.currentDay + TRAINING_HORIZON_DAYS,
      )
      await setTrainingOrders(db, rider.id, valid)
      return { ok: true, saved: valid.length }
    })

    // --- Convocatorias y órdenes de etapa (Paso 29) ------------------------------------
    const TEST_TOUR_ID = 'test-tour'
    const stageOrderSchema = z.object({
      stageDay: z.number().int().positive(),
      role: z.enum([
        'lider',
        'sprinter',
        'lanzador',
        'gregario',
        'cazaetapas',
        'marcador',
        'libre',
      ]),
      targetRiderId: z.string().uuid().nullable(),
      mentality: z.enum(['reservon', 'oportunista', 'combativo', 'supercombativo']),
      effort: z.enum(['ahorrar', 'normal', 'a_tope']),
      triggerKm: z.number().int().nonnegative().nullable(),
      contestSprints: z.boolean(),
      contestClimbs: z.boolean(),
    })
    const putStageOrdersSchema = z.object({
      orders: z.array(stageOrderSchema).max(TEST_TOUR.length),
    })

    // La vuelta de prueba: sus etapas con altimetría y las órdenes actuales del corredor.
    app.get('/api/races/test-tour', async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return reply.status(401).send({ ok: false, error: 'no_autorizado' })
      const rider = await getRiderForUser(db, userId)
      const stages = TEST_TOUR.map((stage) => ({
        day: stage.day,
        name: stage.name,
        kind: stage.kind,
        timeTrial: stage.timeTrial ?? false,
        km: Math.round(stage.profile.segments.reduce((sum, s) => sum + s.km, 0)),
        altimetry: renderAltimetrySvg(stage.profile),
      }))
      if (!rider) return { stages, orders: [], roster: [] }
      // El corredor se convoca a la vuelta de prueba al visitarla (roster mínimo hasta los NPC).
      await addToRoster(db, TEST_TOUR_ID, rider.id)
      const orders = await getStageOrders(db, TEST_TOUR_ID, rider.id)
      const roster = [{ id: rider.id, name: rider.name }]
      return { stages, orders, roster }
    })

    app.put('/api/races/test-tour/orders', async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return reply.status(401).send({ ok: false, error: 'no_autorizado' })
      const parsed = putStageOrdersSchema.safeParse(request.body)
      if (!parsed.success) return reply.status(400).send({ ok: false, error: 'validacion' })
      const rider = await getRiderForUser(db, userId)
      if (!rider) return reply.status(409).send({ ok: false, error: 'sin_ciclista' })
      const validDays = new Set(TEST_TOUR.map((s) => s.day))
      const valid: StageOrderRow[] = parsed.data.orders.filter((o) => validDays.has(o.stageDay))
      await addToRoster(db, TEST_TOUR_ID, rider.id)
      await setStageOrders(db, TEST_TOUR_ID, rider.id, valid)
      return { ok: true, saved: valid.length }
    })

    // --- Resultados y replay (Paso 31) --------------------------------------------------
    const MARKER_LABEL: Record<string, string> = {
      fuga_formada: 'break',
      fuga_cazada: 'caught',
      banner: 'banner',
      meta: 'finish',
    }
    // Calendario de temporada autorizado (Paso 34): 28 carreras con sus etapas cargadas.
    app.get('/api/calendar', async () => {
      const world = await getCurrentWorld(db)
      // La temporada de almacenamiento es 0-indexada (floor(día/364)), como en el tick.
      const season = world ? Math.floor(world.currentDay / 364) : 0
      const winners = world ? await getSeasonWinners(db, world.worldId, season) : {}
      const races = SEASON_CALENDAR.map((race) => ({
        id: race.id,
        name: race.name,
        level: race.level,
        format: race.format,
        startDay: race.startDay,
        openTo: race.openTo,
        winner: winners[race.id] ?? null,
        stages: race.stages.map((stage) => ({
          index: stage.index,
          name: stage.name,
          label: stage.label,
          kind: stage.kind,
          km: Math.round(stage.profile.segments.reduce((sum, s) => sum + s.km, 0)),
          timeTrial: stage.timeTrial ?? false,
        })),
      }))
      return { races }
    })

    // Explorar el mundo (#13/#14/#15): equipos, ficha de equipo, ficha pública de corredor. Público.
    app.get('/api/teams', async () => {
      const world = await getCurrentWorld(db)
      if (!world) return { teams: [] }
      return { teams: await getTeams(db, world.worldId) }
    })

    app.get<{ Params: { id: string } }>('/api/teams/:id', async (request, reply) => {
      const team = await getTeamDetail(db, request.params.id)
      if (!team) return reply.status(404).send({ ok: false, error: 'no_encontrado' })
      return { team }
    })

    // Noticias del equipo (#16): titulares de sus corredores.
    app.get<{ Params: { id: string } }>('/api/teams/:id/news', async (request) => {
      return { news: await getTeamNews(db, request.params.id) }
    })

    // Logros de un corredor (#95).
    app.get<{ Params: { id: string } }>('/api/riders/:id/badges', async (request) => {
      return { badges: await getRiderBadges(db, request.params.id) }
    })

    app.get<{ Params: { id: string } }>('/api/riders/:id', async (request, reply) => {
      const world = await getCurrentWorld(db)
      const season = world ? Math.floor(world.currentDay / 364) : 0
      const rider = await getPublicRider(db, request.params.id, season)
      if (!rider) return reply.status(404).send({ ok: false, error: 'no_encontrado' })
      return { rider }
    })

    // Naciones (#7): lista de países con corredores y ranking nacional por país. Público.
    app.get('/api/countries', async () => {
      const world = await getCurrentWorld(db)
      if (!world) return { countries: [] }
      return { countries: await getCountriesSummary(db, world.worldId) }
    })

    app.get<{ Params: { code: string } }>('/api/countries/:code', async (request, reply) => {
      if (!isKnownCountry(request.params.code)) {
        return reply.status(404).send({ ok: false, error: 'no_encontrado' })
      }
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
        const season = seasonPosition(world.currentDay).season
        const country = request.query.country?.trim()
        const vocation = request.query.vocation?.trim()
        return {
          riders: await getFreeAgents(db, world.worldId, season, {
            ...(country ? { country } : {}),
            ...(vocation ? { archetype: vocation } : {}),
          }),
        }
      },
    )

    // Página de una carrera del calendario: general de la temporada, ganadores de etapa e historial.
    app.get<{ Params: { raceId: string } }>('/api/calendar/:raceId', async (request, reply) => {
      const race = SEASON_CALENDAR.find((r) => r.id === request.params.raceId)
      if (!race) return reply.status(404).send({ ok: false, error: 'no_encontrado' })
      const world = await getCurrentWorld(db)
      if (!world)
        return {
          race: { id: race.id, name: race.name, level: race.level },
          gc: [],
          stageWinners: [],
          history: [],
        }
      const season = Math.floor(world.currentDay / 364)
      const raceKey = `${race.id}:s${season}`
      const gc = (await getRaceGc(db, raceKey)).slice(0, 20)
      const stageWinners = await getStageWinners(db, raceKey)
      const history = await getRaceHistory(db, world.worldId, race.id)
      return {
        race: {
          id: race.id,
          name: race.name,
          level: race.level,
          format: race.format,
          stageCount: race.stages.length,
        },
        gc,
        stageWinners,
        history,
      }
    })

    // General de la vuelta + estado de cada etapa (corrida o no).
    app.get('/api/races/test-tour/results', async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return reply.status(401).send({ ok: false, error: 'no_autorizado' })
      const gc = await getRaceGc(db, TEST_TOUR_ID)
      const points = await getPointsClassification(db, TEST_TOUR_ID)
      const kom = await getKomClassification(db, TEST_TOUR_ID)
      const teamsGc = teamsClassification(gc)
      const run = new Set(await getRunStageDays(db, TEST_TOUR_ID))
      const stages = TEST_TOUR.map((stage) => ({
        day: stage.day,
        name: stage.name,
        kind: stage.kind,
        km: Math.round(stage.profile.segments.reduce((sum, s) => sum + s.km, 0)),
        run: run.has(stage.day),
      }))
      return { gc, points, kom, teamsGc, stages }
    })

    // Replay de una etapa: se regenera desde el snapshot sellado (SPEC 6.1).
    app.get<{ Params: { day: string } }>(
      '/api/races/test-tour/stages/:day',
      async (request, reply) => {
        const userId = await currentUserId(request)
        if (!userId) return reply.status(401).send({ ok: false, error: 'no_autorizado' })
        const day = Number(request.params.day)
        const stage = TEST_TOUR.find((s) => s.day === day)
        if (!stage) return reply.status(404).send({ ok: false, error: 'no_encontrado' })

        const snapshot = await getStageSnapshot(db, TEST_TOUR_ID, day)
        const results = await getStageResults(db, TEST_TOUR_ID, day)
        const km = Math.round(stage.profile.segments.reduce((sum, s) => sum + s.km, 0))
        if (!snapshot) {
          return {
            day,
            name: stage.name,
            km,
            run: false,
            altimetry: renderAltimetrySvg(stage.profile),
          }
        }

        // Regenera los eventos ejecutando el motor con la misma entrada y semilla.
        const output = simulateStage(snapshot.input as StageInput, snapshot.seed)
        const nameOf = new Map(results.map((r) => [r.riderId, r.name]))
        // Orden narrativo: por km y, a igual km, primero la fuga/cima y al final la victoria.
        const EVENT_ORDER: Record<string, number> = {
          breakaway_formed: 0,
          peloton_concedes: 1,
          sprinters_give_up: 1,
          sprint_intermediate: 2,
          climb_kom: 3,
          breakaway_caught: 4,
          stage_win: 5,
          stage_win_itt: 5,
        }
        const chronicle = output.events
          .map((e) => ({
            km: Math.round(e.km),
            tS: Math.round(e.tS),
            plantilla: e.plantilla,
            protagonists: e.protagonistas.map((id) => nameOf.get(id) ?? id),
          }))
          .sort(
            (a, b) =>
              a.km - b.km ||
              (EVENT_ORDER[a.plantilla] ?? 9) - (EVENT_ORDER[b.plantilla] ?? 9) ||
              a.tS - b.tS,
          )
          // Quita duplicados exactos consecutivos (misma frase, mismos protagonistas y km).
          .filter((e, i, arr) => {
            const prev = arr[i - 1]
            return (
              !prev ||
              prev.km !== e.km ||
              prev.plantilla !== e.plantilla ||
              prev.protagonists.join() !== e.protagonists.join()
            )
          })
        // Momentos clave sobre la altimetría: fuga, captura, banners y meta.
        const markers: AltimetryMarker[] = output.events
          .filter((e) => ['fuga_formada', 'fuga_cazada', 'banner', 'meta'].includes(e.tipo))
          .map((e) => ({ km: e.km, label: MARKER_LABEL[e.tipo] ?? '•' }))
        const altimetry = renderAltimetrySvg(stage.profile, { markers })
        // La general tal como quedó tras esta etapa (no solo la final).
        const gc = await getGcThroughStage(db, TEST_TOUR_ID, day)
        return { day, name: stage.name, km, run: true, altimetry, results, chronicle, gc }
      },
    )

    // Avance del mundo desde la web para pruebas (Paso 32): un usuario con sesión adelanta N días
    // de juego con un clic, sin consola ni token. Herramienta temporal de la fase alfa; el tick
    // automático (cron) la sustituye en producción (SPEC Paso 43).
    if (deps.onAdminAdvance) {
      const onAdminAdvance = deps.onAdminAdvance
      app.post<{ Querystring: { days?: string } }>('/api/world/advance', async (request, reply) => {
        const userId = await currentUserId(request)
        if (!userId) return reply.status(401).send({ ok: false, error: 'no_autorizado' })
        const days = Math.min(10, Math.max(1, Number(request.query.days ?? 1) || 1))
        const summary = await onAdminAdvance(days)
        return { ok: true, currentDay: summary.currentDay, daysProcessed: summary.daysProcessed }
      })
    }
  }

  // Servido de la web: por defecto se activa si existe una build con index.html.
  const serveWeb = deps.serveWeb ?? existsSync(join(webRoot, 'index.html'))
  if (serveWeb) {
    void app.register(fastifyStatic, { root: webRoot })
    app.setNotFoundHandler((request, reply) => {
      const isApiPath = request.url.startsWith('/api') || request.url.startsWith('/health')
      if (request.method === 'GET' && !isApiPath) {
        // Fallback SPA: cualquier ruta desconocida sirve el index de la web.
        void reply.sendFile('index.html')
        return
      }
      reply.status(404).send({ ok: false, error: 'no_encontrado' })
    })
  } else {
    app.setNotFoundHandler((_request, reply) => {
      reply.status(404).send({ ok: false, error: 'no_encontrado' })
    })
  }

  return app
}
