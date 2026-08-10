import { randomUUID } from 'node:crypto'
import {
  type TrainingOrderRow,
  acceptOffer,
  createRider,
  enterRace,
  generateName,
  generateUniqueRiderName,
  getAccountControl,
  getContract,
  getCurrentWorld,
  getDailyLog,
  getEnterableRaces,
  getLedger,
  getOffers,
  getPalmares,
  getPublicRider,
  getRacePrefs,
  getRiderBadges,
  getRiderForUser,
  getRiderHealth,
  getRiderLastRaceReport,
  getRiderRaceDays,
  getRiderRaceResults,
  getRiderSummary,
  getRiderUpcomingRaces,
  getTeamTrainingPlan,
  getTrainingOrders,
  rejectOffer,
  retireFromRace,
  setRacePref,
  setRiderArchetype,
  setTeamTrainingPlan,
  setTrainingOrders,
  withdrawRace,
} from '@cyclingstar/db'
import { formStars, freshnessBar, generateRiderGenome } from '@cyclingstar/engine'
import { currentSeason, isKnownCountry, resolveCountry } from '@cyclingstar/shared'
import { z } from 'zod'
import { badRequest, notFound, sendError, unauthorized } from '../http.js'
import type { RoutePlugin } from './context.js'
import { parseRaceId, parseRaceKey, parseUuid } from './params.js'

/** Horizonte del planificador de entrenamiento (SPEC 5.2: cola de 7 a 28 días). */
export const TRAINING_HORIZON_DAYS = 28

const genderSchema = z.enum(['M', 'F'])
const vocationSchema = z.enum(['escalada', 'velocidad', 'clasicas', 'crono', 'fondo'])

const nameQuerySchema = z.object({
  country: z.string().length(2),
  gender: genderSchema,
  seed: z.string().min(1),
})
const createRiderSchema = z.object({
  vocation: vocationSchema,
  gender: genderSchema,
  country: z.string().length(2),
  nameSeed: z.string().min(1),
})
const archetypeSchema = z.object({ archetype: vocationSchema })

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
/** Cola de entrenamiento: la comparten el planificador propio y el plan sugerido del equipo. */
export const putOrdersSchema = z.object({
  orders: z.array(orderSchema).max(TRAINING_HORIZON_DAYS),
})
const putRacePrefSchema = z.object({ raceId: z.string().min(1).max(80), wanted: z.boolean() })

/**
 * Rutas del corredor: creación, perfil propio (/api/riders/me/*), cuenta del jugador (/api/me/*)
 * y ficha pública de cualquier corredor (/api/riders/:id*).
 */
export const riderRoutes: RoutePlugin = async (app, ctx) => {
  const { db, currentUserId } = ctx

  // País por IP (Paso 14): tras Cloudflare, cabecera CF-IPCountry. Sin ella, null (selector).
  app.get('/api/geo/country', (request) => {
    const raw = request.headers['cf-ipcountry']
    const code = typeof raw === 'string' ? raw.toUpperCase() : null
    // Resuelve al país jugable: el propio si existe, si no su fallback más cercano (Vaticano→Italia…).
    return { country: resolveCountry(code) }
  })

  // Generación de nombre (Paso 13/15): server-side, respeta la lista de bloqueo y evita
  // colisiones con corredores en activo del mundo (ni bots ni humanos repetidos).
  app.get('/api/names/generate', async (request, reply) => {
    const parsed = nameQuerySchema.safeParse(request.query)
    if (!parsed.success) return badRequest(reply)
    const { country, gender, seed } = parsed.data
    if (!isKnownCountry(country)) return badRequest(reply, 'pais_desconocido')
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
    if (!userId) return unauthorized(reply)
    return { rider: await getRiderForUser(db, userId) }
  })

  // Próximas carreras del ciclista del jugador (convocatorias ya congeladas + en curso).
  app.get('/api/riders/me/upcoming-races', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const rider = await getRiderForUser(db, userId)
    const world = await getCurrentWorld(db)
    if (!rider || !world) return { races: [] }
    return { races: await getRiderUpcomingRaces(db, rider.id, world.currentDay) }
  })

  // Estado de control de equipo del usuario: si es premium y si su equipo sigue siendo bot
  // (reclamable) o ya es suyo. La web lo usa para mostrar el botón de "tomar control".
  app.get('/api/me/team-control', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    return { control: await getAccountControl(db, userId) }
  })

  // Crear el ciclista (SPEC 3.5). El genoma lo genera el servidor (no lo controla el cliente).
  app.post('/api/riders', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const parsed = createRiderSchema.safeParse(request.body)
    if (!parsed.success) return badRequest(reply)
    const { vocation, gender, country, nameSeed } = parsed.data
    if (!isKnownCountry(country)) return badRequest(reply, 'pais_desconocido')
    if (await getRiderForUser(db, userId)) return sendError(reply, 409, 'ya_tienes_ciclista')
    const world = await getCurrentWorld(db)
    if (!world) return sendError(reply, 409, 'mundo_no_inicializado')
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
      birthSeason: currentSeason(world.currentDay),
      faceSeed: randomUUID(),
      attributes: genome.attributes,
      hidden: genome.hidden,
    })
    return reply.status(201).send({ ok: true, id: created.id })
  })

  // Informe personal de la última carrera: qué ordené vs qué pasó (backlog extra).
  app.get('/api/riders/me/last-race', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const rider = await getRiderForUser(db, userId)
    if (!rider) return { report: null }
    return { report: await getRiderLastRaceReport(db, rider.id) }
  })

  // Cambiar la vocación declarada (la "etiqueta") del corredor. No toca techos ni atributos:
  // el corredor decide luego alinear su entrenamiento; influye en las convocatorias por tipo.
  app.put('/api/riders/me/archetype', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const parsed = archetypeSchema.safeParse(request.body)
    if (!parsed.success) return badRequest(reply)
    const rider = await getRiderForUser(db, userId)
    if (!rider) return notFound(reply, 'sin_ciclista')
    await setRiderArchetype(db, rider.id, parsed.data.archetype)
    return { ok: true }
  })

  // --- Planificador de entrenamiento (Paso 18) ---------------------------------------------
  app.get('/api/riders/me/orders', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
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

  app.put('/api/riders/me/orders', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const parsed = putOrdersSchema.safeParse(request.body)
    if (!parsed.success) return badRequest(reply)
    const rider = await getRiderForUser(db, userId)
    const world = await getCurrentWorld(db)
    if (!rider || !world) return sendError(reply, 409, 'sin_ciclista')
    // Solo días futuros dentro del horizonte (SPEC 5.2: cola de 7 a 28 días).
    const valid: TrainingOrderRow[] = parsed.data.orders.filter(
      (order) =>
        order.gameDay > world.currentDay &&
        order.gameDay <= world.currentDay + TRAINING_HORIZON_DAYS,
    )
    await setTrainingOrders(db, rider.id, valid)
    return { ok: true, saved: valid.length }
  })

  // Plan de entrenamiento SUGERIDO por el equipo (para que la plantilla entrene junta y gane el
  // bonus de grupo). Cualquier corredor del equipo lo LEE; solo el mánager (dueño) lo edita.
  app.get('/api/me/team-training', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const rider = await getRiderForUser(db, userId)
    const world = await getCurrentWorld(db)
    const summary = rider ? await getRiderSummary(db, rider.id) : null
    const teamId = summary?.teamId ?? null
    if (!teamId || !world) return { plan: [], canEdit: false, teamName: null }
    const control = await getAccountControl(db, userId)
    const plan = await getTeamTrainingPlan(
      db,
      teamId,
      world.currentDay + 1,
      world.currentDay + TRAINING_HORIZON_DAYS,
    )
    return {
      plan,
      canEdit: control?.team?.ownedByMe ?? false,
      teamName: summary?.teamName ?? null,
    }
  })

  app.put('/api/me/team-training', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const parsed = putOrdersSchema.safeParse(request.body)
    if (!parsed.success) return badRequest(reply)
    const control = await getAccountControl(db, userId)
    const teamId = control?.team?.ownedByMe ? control.team.id : null
    if (!teamId) return sendError(reply, 403, 'no_eres_manager')
    await setTeamTrainingPlan(db, teamId, parsed.data.orders)
    return { ok: true, saved: parsed.data.orders.length }
  })

  // Serie de forma para la gráfica del perfil (Paso 20).
  app.get('/api/riders/me/form', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const rider = await getRiderForUser(db, userId)
    if (!rider) return { log: [], form: null }
    const log = await getDailyLog(db, rider.id, 90)
    const latest = log[log.length - 1]
    const form = latest
      ? { stars: formStars(latest.ctl, latest.tsb), freshness: freshnessBar(latest.tsb) }
      : null
    const health = await getRiderHealth(db, rider.id)
    return { log, form, health }
  })

  // Objetivos de calendario del corredor y su convocatoria (Paso 35).
  app.get('/api/riders/me/race-prefs', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const rider = await getRiderForUser(db, userId)
    const world = await getCurrentWorld(db)
    if (!rider || !world) return { races: [] }
    return { races: await getRacePrefs(db, rider.id, currentSeason(world.currentDay)) }
  })

  app.put('/api/riders/me/race-prefs', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const parsed = putRacePrefSchema.safeParse(request.body)
    if (!parsed.success) return badRequest(reply)
    const rider = await getRiderForUser(db, userId)
    if (!rider) return sendError(reply, 409, 'sin_ciclista')
    await setRacePref(db, rider.id, parsed.data.raceId, parsed.data.wanted)
    return { ok: true }
  })

  // Palmarés del corredor de la sesión (Paso 40).
  app.get('/api/riders/me/palmares', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const rider = await getRiderForUser(db, userId)
    if (!rider) return { palmares: [] }
    return { palmares: await getPalmares(db, rider.id) }
  })

  // Estado del corredor (equipo, moral, dinero, fama, puntos) para la cabecera del perfil.
  app.get('/api/riders/me/summary', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const rider = await getRiderForUser(db, userId)
    if (!rider) return { summary: null }
    return { summary: await getRiderSummary(db, rider.id) }
  })

  // Libro de transacciones y saldo (Paso 38).
  app.get('/api/riders/me/ledger', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const rider = await getRiderForUser(db, userId)
    if (!rider) return { balance: 0, entries: [], gameDay: null, salary: null }
    const [ledger, world, contract] = await Promise.all([
      getLedger(db, rider.id),
      getCurrentWorld(db),
      getContract(db, rider.id),
    ])
    // Para el aviso de "próximo sueldo": la nómina cae cada día de juego múltiplo de 7 (GD7, GD14…).
    return { ...ledger, gameDay: world?.currentDay ?? null, salary: contract?.salary ?? null }
  })

  // Bandeja de ofertas y contrato vigente (Paso 36).
  app.get('/api/riders/me/offers', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const rider = await getRiderForUser(db, userId)
    if (!rider) return { offers: [], contract: null }
    return { offers: await getOffers(db, rider.id), contract: await getContract(db, rider.id) }
  })

  app.post<{ Params: { id: string } }>(
    '/api/riders/me/offers/:id/accept',
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const offerId = parseUuid(request.params.id)
      if (!offerId) return badRequest(reply)
      const rider = await getRiderForUser(db, userId)
      if (!rider) return sendError(reply, 409, 'sin_ciclista')
      try {
        await acceptOffer(db, rider.id, offerId)
      } catch {
        return sendError(reply, 409, 'oferta_no_disponible')
      }
      return { ok: true }
    },
  )

  app.post<{ Params: { id: string } }>(
    '/api/riders/me/offers/:id/reject',
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const offerId = parseUuid(request.params.id)
      if (!offerId) return badRequest(reply)
      const rider = await getRiderForUser(db, userId)
      if (!rider) return sendError(reply, 409, 'sin_ciclista')
      // Mismo blindaje que en accept: rechazar una oferta ya resuelta o de otro corredor no puede
      // acabar en un 500. Antes rejectOffer era el único de los dos sin try/catch.
      try {
        await rejectOffer(db, rider.id, offerId)
      } catch {
        return sendError(reply, 409, 'oferta_no_disponible')
      }
      return { ok: true }
    },
  )

  // Auto-inscripción del agente libre a carreras continentales (economía de viajes). Lista lo que
  // puede correr con el coste de viaje, y permite inscribirse/darse de baja hasta que empiece.
  app.get('/api/riders/me/race-entries', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const rider = await getRiderForUser(db, userId)
    const world = await getCurrentWorld(db)
    if (!rider || !world) return { races: [] }
    return { races: await getEnterableRaces(db, rider.id, world.currentDay) }
  })

  app.post<{ Params: { raceId: string } }>(
    '/api/riders/me/race-entries/:raceId',
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const raceId = parseRaceId(request.params.raceId)
      if (!raceId) return badRequest(reply)
      const rider = await getRiderForUser(db, userId)
      const world = await getCurrentWorld(db)
      if (!rider || !world) return sendError(reply, 409, 'sin_ciclista')
      const res = await enterRace(db, rider.id, raceId, world.currentDay)
      if (!res.ok) return sendError(reply, 409, res.error ?? 'no_disponible')
      return { ok: true }
    },
  )

  app.delete<{ Params: { raceId: string } }>(
    '/api/riders/me/race-entries/:raceId',
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const raceId = parseRaceId(request.params.raceId)
      if (!raceId) return badRequest(reply)
      const rider = await getRiderForUser(db, userId)
      const world = await getCurrentWorld(db)
      if (!rider || !world) return sendError(reply, 409, 'sin_ciclista')
      const res = await withdrawRace(db, rider.id, raceId, world.currentDay)
      if (!res.ok) return sendError(reply, 409, res.error ?? 'no_disponible')
      return { ok: true }
    },
  )

  /**
   * RETIRARSE de una carrera por etapas en marcha (docs/motor.md §V.5). Es una decisión de gestión
   * del jugador —«voy mal, arriesgo lesión, no voy a ganar nada, mejor preparo otra carrera»— y no
   * se deshace, de ahí que la web pida confirmación antes de llamar.
   *
   * No se confunde con `DELETE /race-entries/:raceId`, que cancela una INSCRIPCIÓN antes de que la
   * carrera empiece: esto retira al corredor de una carrera que ya está rodando, con las mismas
   * consecuencias que un abandono automático (`race_rosters.abandoned_day`).
   */
  app.post<{ Params: { raceKey: string } }>(
    '/api/riders/me/races/:raceKey/retire',
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      // El parámetro es la clave con temporada (`race-france:s3`), que es como se guarda el roster.
      if (!parseRaceKey(request.params.raceKey)) return badRequest(reply)
      const rider = await getRiderForUser(db, userId)
      const world = await getCurrentWorld(db)
      if (!rider || !world) return sendError(reply, 409, 'sin_ciclista')
      const res = await retireFromRace(db, {
        worldId: world.worldId,
        riderId: rider.id,
        raceKey: request.params.raceKey,
        currentDay: world.currentDay,
      })
      if (!res.ok) return sendError(reply, 409, res.reason)
      return { ok: true, raceName: res.raceName, alreadyOut: res.alreadyOut }
    },
  )

  // --- Ficha pública de cualquier corredor -------------------------------------------------
  // Un id mal formado responde 404 (lo mismo que un id válido de un corredor que no existe),
  // no un 500 por consulta uuid inválida como antes.

  // Logros de un corredor (#95).
  app.get<{ Params: { id: string } }>('/api/riders/:id/badges', async (request, reply) => {
    const riderId = parseUuid(request.params.id)
    if (!riderId) return notFound(reply)
    return { badges: await getRiderBadges(db, riderId) }
  })

  // Palmarés público de cualquier corredor (lo que ha ganado): para ver el detalle desde su ficha.
  app.get<{ Params: { id: string } }>('/api/riders/:id/palmares', async (request, reply) => {
    const riderId = parseUuid(request.params.id)
    if (!riderId) return notFound(reply)
    return { palmares: await getPalmares(db, riderId) }
  })

  // Resultados públicos de cualquier corredor, AGRUPADOS POR CARRERA: la general de titular (se
  // gane o no) y las etapas como desglose (docs/navegacion.md §3.6).
  app.get<{ Params: { id: string } }>('/api/riders/:id/results', async (request, reply) => {
    const riderId = parseUuid(request.params.id)
    if (!riderId) return notFound(reply)
    return { results: await getRiderRaceResults(db, riderId) }
  })

  app.get<{ Params: { id: string } }>('/api/riders/:id', async (request, reply) => {
    const riderId = parseUuid(request.params.id)
    if (!riderId) return notFound(reply)
    const world = await getCurrentWorld(db)
    const season = world ? currentSeason(world.currentDay) : 0
    const rider = await getPublicRider(db, riderId, season)
    if (!rider) return notFound(reply)
    return { rider }
  })
}
