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
  getAttrTrend,
  getBlockReport,
  getCoachView,
  getRiderHealth,
  getRiderLastRaceReport,
  getRiderRaceDays,
  getRiderTravelDays,
  getRiderRaceResults,
  getRiderSummary,
  getRiderUpcomingRaces,
  getTeamTrainingPlan,
  getTrainingOrders,
  rejectOffer,
  retireFromRace,
  countRidersForUser,
  setRacePref,
  setRiderArchetype,
  setTeamTrainingPlan,
  setTrainingOrders,
  withdrawRace,
} from '@cyclingstar/db'
import { formStars, freshnessBar, generateRiderGenome } from '@cyclingstar/engine'
import {
  PLAYER_START_AGE,
  SESSIONS,
  birthSeasonForAge,
  currentSeason,
  isKnownCountry,
  resolveCountry,
} from '@cyclingstar/shared'
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
  /**
   * DERIVADO DEL CATÁLOGO, no copiado a mano. Era la tercera lista con los mismos once nombres —el
   * catálogo, el enum de la base y ésta— y la que se quedaba atrás: añadir una sesión la dejaba
   * fuera y la pantalla no podía pedirla, sin que nada fallara al compilar.
   */
  session: z.enum(SESSIONS),
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

  /**
   * PAÍS POR IP (Paso 14). Tras Cloudflare llega en `CF-IPCountry`, pero ése no es el único sitio:
   * cada capa de red delante pone la suya, y con una sola cabecera cualquier despliegue que no esté
   * exactamente detrás de Cloudflare devuelve `null` y deja al jugador sin país.
   *
   * `XX` es lo que Cloudflare manda cuando NO sabe de dónde viene (y `T1` para la red Tor): no es un
   * país, así que no se resuelve —si se dejara pasar, el fallback lo convertiría en Francia—.
   */
  app.get('/api/geo/country', (request) => {
    const CABECERAS = [
      'cf-ipcountry',
      'x-vercel-ip-country',
      'x-geo-country',
      'x-country-code',
      'fastly-client-country',
    ] as const
    let code: string | null = null
    let fuente: string | null = null
    /**
     * …Y SE CUENTA QUÉ SE HA VISTO (v58). El dueño siguió viendo el mensaje del país después del
     * arreglo, ahora desde Portugal, y pidió que la pantalla diga qué país cree que es. Sin esto la
     * respuesta es un `null` mudo y no hay forma de saber si el despliegue no pone la cabecera, si
     * la pone con `XX`, o si la pone bien y quien falla es lo de después.
     *
     * Se devuelven SOLO las cabeceras de geolocalización, con su nombre y su valor. Ninguna de ellas
     * identifica a nadie —son un código de país de dos letras—, así que esto no expone al que mira.
     */
    const vistas: Record<string, string> = {}
    for (const nombre of CABECERAS) {
      const raw = request.headers[nombre]
      const valor = typeof raw === 'string' ? raw.toUpperCase().trim() : null
      if (valor) vistas[nombre] = valor
      if (valor && valor.length === 2 && valor !== 'XX' && valor !== 'T1' && code === null) {
        code = valor
        fuente = nombre
      }
    }
    // Resuelve al país jugable: el propio si existe, si no su fallback más cercano (Vaticano→Italia…).
    return { country: resolveCountry(code), detectado: code, fuente, cabeceras: vistas }
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
    /**
     * SEMILLA REPRODUCIBLE. Esto era `generateRiderGenome(randomUUID(), vocation)`: el genoma del
     * jugador —sus techos, su talento, su fragilidad, lo que va a poder llegar a ser— salía de un
     * dado que no deja rastro. Dos consecuencias, y la segunda es la grave: no se podía reproducir
     * un caso que el dueño reportara («mira qué corredor me ha salido»), y el mundo tenía una
     * fuente de azar fuera de la semilla, que es justo lo que el resto del motor se prohíbe.
     *
     * `intento` cuenta los ciclistas que este usuario ya ha tenido, retirados incluidos, para que
     * empezar de nuevo tras una retirada no reparta otra vez el mismo genoma.
     */
    const intento = await countRidersForUser(db, userId)
    const semilla = `${world.worldSeed}:${userId}:${intento}`
    const genome = generateRiderGenome(semilla, vocation)
    const created = await createRider(db, {
      worldId: world.worldId,
      userId,
      name: name.fullName,
      country: country.toUpperCase(),
      gender,
      archetype: vocation,
      // A los 18, sin equipo y con las piernas de un chaval (v48). Ver `PLAYER_START_AGE`: la edad
      // se nombra y la `birthSeason` se deriva de ella, en vez del `currentSeason(...)` a pelo que
      // había antes —que por la época de las edades salía 20 sin decirlo en ninguna parte—.
      birthSeason: birthSeasonForAge(PLAYER_START_AGE, currentSeason(world.currentDay)),
      faceSeed: `${semilla}:cara`,
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
        travelDays: [],
      }
    const orders = await getTrainingOrders(
      db,
      rider.id,
      world.currentDay + 1,
      world.currentDay + TRAINING_HORIZON_DAYS,
    )
    // Días con carrera: no se entrenan (la carrera es su carga). Y días de VIAJE DE IDA: tampoco se
    // entrenan, y el plan tiene que enseñarlos ANTES de que lleguen —el jugador planifica su semana
    // contando con ellos, igual que cuenta con las etapas—.
    const raceDays = await getRiderRaceDays(
      db,
      rider.id,
      world.currentDay + 1,
      world.currentDay + TRAINING_HORIZON_DAYS,
    )
    const travelDays = await getRiderTravelDays(
      db,
      rider.id,
      world.currentDay + 1,
      world.currentDay + TRAINING_HORIZON_DAYS,
    )
    return {
      currentDay: world.currentDay,
      horizonDays: TRAINING_HORIZON_DAYS,
      orders,
      raceDays,
      travelDays,
    }
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

  /**
   * LA FICHA DEL CORREDOR (docs/entrenamiento.md §2.3 y §4.6). Tres rutas, una regla: **ningún
   * oculto cruza esta frontera**. El techo sale como una de tres frases, el talento y la fragilidad
   * como códigos, y `facilities` como «bajo / normal / alto». Nada de lo que devuelven permite
   * reconstruir un número interno, que es la condición que `MVP.md:114` pone a toda esta pantalla.
   */

  // Flecha de tendencia: Δ28 por atributo (SPEC 3.2, con la ventana y los niveles de §2.3).
  app.get('/api/riders/me/trend', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const rider = await getRiderForUser(db, userId)
    const world = await getCurrentWorld(db)
    if (!rider || !world) return { trend: [] }
    return { trend: await getAttrTrend(db, rider.id, world.currentDay) }
  })

  // Opinión del entrenador: una vez por temporada, difusa a propósito (SPEC 5.6).
  app.get('/api/riders/me/coach-view', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const rider = await getRiderForUser(db, userId)
    const world = await getCurrentWorld(db)
    if (!rider || !world) return { coachView: null }
    return {
      coachView: await getCoachView(db, rider.id, world.worldSeed, world.currentDay),
    }
  })

  // Informe del bloque: de dónde salió cada punto de los últimos 28 días (§4.6).
  app.get('/api/riders/me/report', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const rider = await getRiderForUser(db, userId)
    const world = await getCurrentWorld(db)
    if (!rider || !world) return { report: null }
    return { report: await getBlockReport(db, rider.id, world.currentDay) }
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
