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
  addToRoster,
  createRider,
  gameState,
  generateName,
  getCurrentWorld,
  getDailyLog,
  getGcThroughStage,
  getKomClassification,
  getPointsClassification,
  getRaceGc,
  getRiderForUser,
  getRunStageDays,
  getStageOrders,
  getStageResults,
  getStageSnapshot,
  getTrainingOrders,
  setStageOrders,
  setTrainingOrders,
} from '@cyclingstar/db'
import {
  ENGINE_VERSION,
  type AltimetryMarker,
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
    if (deps.db) {
      const rows = await deps.db
        .select({ currentDay: gameState.currentDay })
        .from(gameState)
        .limit(1)
      gameDay = rows[0]?.currentDay ?? null
    }
    return {
      ok: true,
      engineVersion: ENGINE_VERSION,
      gameDay,
      migrationsApplied: deps.migrationsApplied ?? false,
      tickIntervalMinutes: deps.tickIntervalMinutes ?? 360,
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

    // Generación de nombre (Paso 13/15): server-side, respeta la lista de bloqueo.
    app.get('/api/names/generate', (request, reply) => {
      const parsed = nameQuerySchema.safeParse(request.query)
      if (!parsed.success) {
        return reply.status(400).send({ ok: false, error: 'validacion' })
      }
      const { country, gender, seed } = parsed.data
      if (!isKnownCountry(country)) {
        return reply.status(400).send({ ok: false, error: 'pais_desconocido' })
      }
      return generateName(seed, { country: country.toLowerCase(), gender })
    })

    // El ciclista del usuario (o null si aún no ha creado uno).
    app.get('/api/riders/me', async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) {
        return reply.status(401).send({ ok: false, error: 'no_autorizado' })
      }
      return { rider: await getRiderForUser(db, userId) }
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
      const name = generateName(nameSeed, { country: country.toLowerCase(), gender })
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
        }
      const orders = await getTrainingOrders(
        db,
        rider.id,
        world.currentDay + 1,
        world.currentDay + TRAINING_HORIZON_DAYS,
      )
      return { currentDay: world.currentDay, horizonDays: TRAINING_HORIZON_DAYS, orders }
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
    // General de la vuelta + estado de cada etapa (corrida o no).
    app.get('/api/races/test-tour/results', async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return reply.status(401).send({ ok: false, error: 'no_autorizado' })
      const gc = await getRaceGc(db, TEST_TOUR_ID)
      const points = await getPointsClassification(db, TEST_TOUR_ID)
      const kom = await getKomClassification(db, TEST_TOUR_ID)
      const run = new Set(await getRunStageDays(db, TEST_TOUR_ID))
      const stages = TEST_TOUR.map((stage) => ({
        day: stage.day,
        name: stage.name,
        kind: stage.kind,
        km: Math.round(stage.profile.segments.reduce((sum, s) => sum + s.km, 0)),
        run: run.has(stage.day),
      }))
      return { gc, points, kom, stages }
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
        const chronicle = output.events.map((e) => ({
          km: Math.round(e.km),
          tS: Math.round(e.tS),
          plantilla: e.plantilla,
          protagonists: e.protagonistas.map((id) => nameOf.get(id) ?? id),
        }))
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
