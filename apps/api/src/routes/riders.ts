import {
  type Horizon,
  type RiderRaceReport,
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
  getPlanForDay,
  getTrainingMode,
  saveLiveTrainingPlan,
  getBlockReport,
  getCoachView,
  getRiderHealth,
  getRiderLastRaceReport,
  getRiderMorale,
  getRiderRaceDays,
  getRiderTravelDays,
  getRiderRaceResults,
  getRiderSummary,
  getRiderUpcomingRaces,
  getTeamTrainingPlan,
  getTrainingOrders,
  lastReadyStageOf,
  rejectOffer,
  retireFromRace,
  countRidersForUser,
  setRacePref,
  setRiderArchetype,
  setTeamTrainingPlan,
  setTrainingOrders,
  stageGameDay,
  withdrawRace,
  worldHorizon,
  type ProjectedTrainingDay,
  projectTraining,
} from '@cyclingstar/db'
import { generateRiderGenome, stageCities } from '@cyclingstar/engine'
import {
  type OrdersDay,
  PLAYER_START_AGE,
  type PreStageInfo,
  SESSIONS,
  birthSeasonForAge,
  currentSeason,
  isKnownCountry,
  loadLevelOf,
  planPreviewRequestSchema,
  planPreviewResponseSchema,
  putTrainingPlanSchema,
  badgesResponseSchema,
  blockReportResponseSchema,
  coachViewResponseSchema,
  createdRiderResponseSchema,
  enterableRacesResponseSchema,
  formResponseSchema,
  generatedNameSchema,
  lastRaceResponseSchema,
  ledgerResponseSchema,
  marketResponseSchema,
  myRiderResponseSchema,
  okResponseSchema,
  ordersResponseSchema,
  palmaresResponseSchema,
  publicRiderDetailResponseSchema,
  racePrefsResponseSchema,
  retireFromRaceResponseSchema,
  riderResultsResponseSchema,
  riderSummaryResponseSchema,
  savedResponseSchema,
  teamControlResponseSchema,
  teamTrainingResponseSchema,
  trainingPlanResponseSchema,
  trendResponseSchema,
  upcomingRacesResponseSchema,
} from '@cyclingstar/shared'
import { z } from 'zod'
import { riderChampion } from '../champions.js'
import type { ChronicleEntry } from '../chronicle.js'
import { badRequest, notFound, sendError, unauthorized } from '../http.js'
import {
  attributeStars,
  conditionDay,
  conditionToday,
  moraleStars,
  ownAttributes,
  trendCode,
} from '../screenShape.js'
import { preStageInfoOf, riderMomentsOf, stageContextOf } from '../stageReplay.js'
import type { RoutePlugin } from './context.js'
import { parseRaceId, parseRaceKey, parseUuid } from './params.js'

/**
 * De dónde a dónde fue la etapa de un día de CARRERA del registro diario (`carrera:${raceId}:e${n}`,
 * `stageRun.ts`), con las ciudades de la temporada de ese día; nada si el día no fue de carrera o la
 * carrera ya no está en el calendario.
 */
function ciudadesDelDia(activity: string, gameDay: number): { from?: string; to?: string } {
  const m = /^carrera:([^:]+):e(\d+)$/.exec(activity)
  const c = m ? stageCities(m[1]!, currentSeason(gameDay), Number(m[2])) : null
  return c ? { from: c.from, to: c.to } : {}
}

/** Horizonte del planificador de entrenamiento (SPEC 5.2: cola de 7 a 28 días). */
export const TRAINING_HORIZON_DAYS = 28

/** Un día de la proyección, como lo dice `GET /orders` (`ordersDaySchema`): sin su clase ni su carga. */
function diaDeOrdenes({ gameDay, day }: ProjectedTrainingDay): OrdersDay {
  return {
    gameDay,
    session: day.session,
    intensity: day.intensity,
    source: day.source,
    block: day.block,
    raceKey: day.raceKey,
  }
}

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

  // Generación de nombre (Paso 13/15): server-side, respeta la lista de bloqueo y evita
  // colisiones con corredores en activo del mundo (ni bots ni humanos repetidos).
  app.get(
    '/api/names/generate',
    { config: { response: { 200: generatedNameSchema }, spoiler: 'safe' } },
    async (request, reply) => {
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
    },
  )

  // El ciclista del usuario (o null si aún no ha creado uno).
  app.get(
    '/api/riders/me',
    {
      config: {
        response: { 200: myRiderResponseSchema },
        spoiler: 'horizon',
        veil: {
          by: ['L'],
          why: 'DD-08: los atributos propios se enseñan aunque los mueva lo aprendido en carrera',
        },
      },
    },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const rider = await getRiderForUser(db, userId)
      // en su forma de pantalla (E3, §13.5; 19b): las estrellas y la marca, no el valor del que salen
      return { rider: rider && { ...rider, attributes: ownAttributes(rider.attributes) } }
    },
  )

  // Próximas carreras del ciclista del jugador (convocatorias ya congeladas + en curso).
  app.get(
    '/api/riders/me/upcoming-races',
    {
      config: {
        response: { 200: upcomingRacesResponseSchema },
        spoiler: 'horizon',
        veil: { by: ['M'] },
      },
    },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const rider = await getRiderForUser(db, userId)
      const world = await getCurrentWorld(db)
      if (!rider || !world) return { races: [] }
      const h = await request.horizon()
      return { races: await getRiderUpcomingRaces(db, h, rider.id, world.currentDay) }
    },
  )

  // Estado de control de equipo del usuario: si es premium y si su equipo sigue siendo bot
  // (reclamable) o ya es suyo. La web lo usa para mostrar el botón de "tomar control".
  app.get(
    '/api/me/team-control',
    { config: { response: { 200: teamControlResponseSchema }, spoiler: 'safe' } },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      return { control: await getAccountControl(db, userId) }
    },
  )

  // Crear el ciclista (SPEC 3.5). El genoma lo genera el servidor (no lo controla el cliente).
  app.post(
    '/api/riders',
    { config: { response: { 201: createdRiderResponseSchema }, spoiler: 'safe' } },
    async (request, reply) => {
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
    },
  )

  /**
   * La última corrida, si está velada y es posterior a la del informe (E2, docs/retransmision.md §12.9
   * y §14.2, D-47; paso 8a): lo único que se sabe de ella (`PreStageInfo`, D-42), para «Ready to
   * watch». La decide la lista de salida y el horizonte (`lastReadyStageOf`), nunca lo que pasó en ella.
   */
  async function readyOf(
    h: Horizon,
    riderId: string,
    report: RiderRaceReport | null,
  ): Promise<PreStageInfo | null> {
    const last = await lastReadyStageOf(db, h, riderId)
    if (last === null) return null
    if (report !== null && last.gameDay <= stageGameDay(report.raceId, report.stageDay)) return null
    const key = parseRaceKey(last.raceKey)
    const ctx =
      key === null ? null : await stageContextOf(db, key.raceId, last.stageDay, key.season)
    return ctx === null ? null : preStageInfoOf(ctx)
  }

  /**
   * LOS MOMENTOS DEL CORREDOR EN LA ETAPA DEL INFORME (E2, docs/retransmision.md §12.9, 12-k; paso 12):
   * las líneas del acta en que es protagonista o destinatario, de los sucesos guardados de esa etapa y con
   * la identidad del día (`riderMomentsOf`). Se arman aquí y no en `getRiderLastRaceReport`, porque
   * `packages/db` no puede llamar a `buildChronicle`, que vive en `apps/api`. Sin sucesos guardados, el
   * informe va sin la clave.
   */
  async function withMoments(
    h: Horizon,
    riderId: string,
    report: RiderRaceReport,
  ): Promise<RiderRaceReport & { readonly moments?: readonly ChronicleEntry[] }> {
    const key = parseRaceKey(report.raceId)
    const ctx =
      key === null ? null : await stageContextOf(db, key.raceId, report.stageDay, key.season)
    const moments = ctx === null ? null : await riderMomentsOf(db, h, ctx, riderId)
    return moments === null ? report : { ...report, moments }
  }

  // Informe personal de la última carrera: qué ordené vs qué pasó (backlog extra). Sobre la última
  // etapa CONOCIDA (P y G; E2, docs/retransmision.md §12.9, D-47; paso 8a), con los momentos del
  // corredor (12-k; paso 12) y con `ready` si la última corrida está velada. Sin velo, sin esa clave.
  app.get(
    '/api/riders/me/last-race',
    {
      config: {
        response: { 200: lastRaceResponseSchema },
        spoiler: 'horizon',
        veil: { by: ['P', 'G'] },
      },
    },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const rider = await getRiderForUser(db, userId)
      if (!rider) return { report: null }
      const h = await request.horizon()
      const known = await getRiderLastRaceReport(db, h, rider.id)
      const report = known === null ? null : await withMoments(h, rider.id, known)
      const ready = await readyOf(h, rider.id, known)
      return ready === null ? { report } : { report, ready }
    },
  )

  // Cambiar la vocación declarada (la "etiqueta") del corredor. No toca techos ni atributos:
  // el corredor decide luego alinear su entrenamiento; influye en las convocatorias por tipo.
  app.put(
    '/api/riders/me/archetype',
    { config: { response: { 200: okResponseSchema }, spoiler: 'safe' } },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const parsed = archetypeSchema.safeParse(request.body)
      if (!parsed.success) return badRequest(reply)
      const rider = await getRiderForUser(db, userId)
      if (!rider) return notFound(reply, 'sin_ciclista')
      await setRiderArchetype(db, rider.id, parsed.data.archetype)
      return { ok: true }
    },
  )

  // --- Planificador de entrenamiento (Paso 18) ---------------------------------------------
  app.get(
    '/api/riders/me/orders',
    {
      config: {
        response: { 200: ordersResponseSchema },
        spoiler: 'horizon',
        // Los 28 días (E3, PR 13b): lo que el entrenador hará cada uno mira la carga y la tensión del
        // corredor, que cambian al correrse una etapa velada; la salud y los días de carrera, con el
        // horizonte (M). Su lista blanca en B1b: `days.[].session` y `days.[].intensity` (§11.18).
        veil: {
          by: ['M', 'L'],
          why: 'DD-08: lo que el entrenador hará cada día mira la condición propia, que se enseña',
        },
      },
    },
    async (request, reply) => {
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
          days: [],
        }
      const h = await request.horizon()
      const orders = await getTrainingOrders(
        db,
        rider.id,
        world.currentDay + 1,
        world.currentDay + TRAINING_HORIZON_DAYS,
      )
      // Días con carrera: no se entrenan (la carrera es su carga). Y días de VIAJE, de ida y de vuelta:
      // tampoco se entrenan, y el plan tiene que enseñarlos ANTES de que lleguen —el jugador planifica
      // su semana contando con ellos, igual que cuenta con las etapas—.
      const raceDays = (
        await getRiderRaceDays(
          db,
          h,
          rider.id,
          world.currentDay + 1,
          world.currentDay + TRAINING_HORIZON_DAYS,
        )
      ).map((d) => d.gameDay)
      const travelDays = await getRiderTravelDays(
        db,
        rider.id,
        world.currentDay + 1,
        world.currentDay + TRAINING_HORIZON_DAYS,
      )
      // Los 28 días con lo guardado: los mismos que da la vista previa con lo de la pantalla (11-a).
      const { days } = await projectTraining(db, h, {
        riderId: rider.id,
        currentDay: world.currentDay,
        horizonDays: TRAINING_HORIZON_DAYS,
      })
      return {
        currentDay: world.currentDay,
        horizonDays: TRAINING_HORIZON_DAYS,
        orders,
        raceDays,
        travelDays,
        days: days.map(diaDeOrdenes),
      }
    },
  )

  app.put(
    '/api/riders/me/orders',
    { config: { response: { 200: savedResponseSchema }, spoiler: 'safe' } },
    async (request, reply) => {
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
      /**
       * Se guarda con VENTANA, y eso es lo que hace posible deshacer. Los días del horizonte que no
       * vengan en `orders` se BORRAN, o sea vuelven a ser del entrenador (o del bloque). Sin la
       * ventana, quitar una orden era imposible: el borrado solo alcanzaba a los días que se enviaban.
       */
      await setTrainingOrders(db, rider.id, valid, {
        fromDay: world.currentDay + 1,
        toDay: world.currentDay + TRAINING_HORIZON_DAYS,
      })
      return { ok: true, saved: valid.length }
    },
  )

  /**
   * EL PLAN POR BLOQUES (D0-D4, docs/entrenamiento.md §5.3, paso 11).
   *
   * Sube el NIVEL de la decisión: hasta aquí el jugador elegía 28 × (sesión, intensidad) —56
   * desplegables— y no veía absolutamente nada hasta que los días pasaban de uno en uno. Ahora elige
   * un objetivo, cuatro bloques y un énfasis, y **ve cómo va a llegar antes de guardar**. Los 28 días
   * siguen ahí y siguen siendo editables, que es dictado del dueño; lo que cambia es que ya no hace
   * falta pasar por ellos.
   */
  app.get(
    '/api/riders/me/plan',
    { config: { response: { 200: trainingPlanResponseSchema }, spoiler: 'safe' } },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const rider = await getRiderForUser(db, userId)
      const world = await getCurrentWorld(db)
      if (!rider || !world) return { mode: 'mixto', plan: null, currentDay: world?.currentDay ?? 0 }
      const inicio = world.currentDay + 1
      return {
        mode: await getTrainingMode(db, rider.id),
        plan: (await getPlanForDay(db, rider.id, inicio))?.plan ?? null,
        currentDay: world.currentDay,
      }
    },
  )

  app.put(
    '/api/riders/me/plan',
    { config: { response: { 200: okResponseSchema }, spoiler: 'safe' } },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const parsed = putTrainingPlanSchema.safeParse(request.body)
      if (!parsed.success) return badRequest(reply)
      const rider = await getRiderForUser(db, userId)
      const world = await getCurrentWorld(db)
      if (!rider || !world) return sendError(reply, 409, 'sin_ciclista')
      // UN SOLO PLAN VIVO (E3, docs/visual.md §11.5; PR 13a): sobre el `startDay` del plan vivo, o desde
      // mañana si no hay o si el jugador empieza de cero; nunca hoy, que ya se entrenó (o se está
      // entrenando) y reescribirlo sería prometer un cambio que el tick no va a aplicar. El modo, el plan y
      // el borrado de los planes que pisa, en una transacción.
      await saveLiveTrainingPlan(db, rider.id, {
        currentDay: world.currentDay,
        mode: parsed.data.mode,
        plan: parsed.data.plan,
        startFresh: parsed.data.startFresh === true,
      })
      return { ok: true }
    },
  )

  /**
   * «¿CÓMO VOY A LLEGAR?» — la proyección, ANTES de guardar (docs/entrenamiento.md §5.3; E3,
   * docs/visual.md §11.2 y §11.3, PR 13b). Proyecta lo que hará el tick con lo de la pantalla: el modo, el
   * plan con las semanas del plan vivo (o desde mañana con `startFresh`) y la ventana de órdenes, con la
   * misma precedencia (`resolveTrainingDay`) y la curva que escribe el tick (`applyDailyLoad`), desde el
   * último diario. Una tarjeta por carrera, con la llegada a su salida, y los 28 días con quién decide cada
   * uno y su carga en palabras: ningún número interno (D-41), y su esquema de respuesta lo garantiza.
   */
  app.post(
    '/api/riders/me/plan/preview',
    {
      config: {
        response: { 200: planPreviewResponseSchema },
        spoiler: 'horizon',
        veil: { by: ['M'] },
      },
    },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const parsed = planPreviewRequestSchema.safeParse(request.body)
      if (!parsed.success) return badRequest(reply)
      const rider = await getRiderForUser(db, userId)
      const world = await getCurrentWorld(db)
      if (!rider || !world) return sendError(reply, 409, 'sin_ciclista')
      const { mode, plan, edits, startFresh } = parsed.data
      const p = await projectTraining(db, await request.horizon(), {
        riderId: rider.id,
        currentDay: world.currentDay,
        horizonDays: TRAINING_HORIZON_DAYS,
        mode,
        plan,
        startFresh,
        orders: edits,
      })
      return {
        races: p.races.map((r) => ({
          ...r,
          travelOut: [...r.travelOut],
          travelBack: [...r.travelBack],
        })),
        days: p.days.map((d) => ({ ...diaDeOrdenes(d), kind: d.kind, load: loadLevelOf(d.tss) })),
      }
    },
  )

  // Plan de entrenamiento SUGERIDO por el equipo (para que la plantilla entrene junta y gane el
  // bonus de grupo). Cualquier corredor del equipo lo LEE; solo el mánager (dueño) lo edita.
  app.get(
    '/api/me/team-training',
    { config: { response: { 200: teamTrainingResponseSchema }, spoiler: 'safe' } },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const rider = await getRiderForUser(db, userId)
      const world = await getCurrentWorld(db)
      // Solo el equipo de hoy, que no nace de ninguna etapa: con `worldHorizon` (la ruta es `safe`).
      const summary = rider ? await getRiderSummary(db, worldHorizon, rider.id) : null
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
    },
  )

  app.put(
    '/api/me/team-training',
    { config: { response: { 200: savedResponseSchema }, spoiler: 'safe' } },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const parsed = putOrdersSchema.safeParse(request.body)
      if (!parsed.success) return badRequest(reply)
      const control = await getAccountControl(db, userId)
      const teamId = control?.team?.ownedByMe ? control.team.id : null
      if (!teamId) return sendError(reply, 403, 'no_eres_manager')
      await setTeamTrainingPlan(db, teamId, parsed.data.orders)
      return { ok: true, saved: parsed.data.orders.length }
    },
  )

  // Serie de forma para la gráfica del perfil (Paso 20).
  app.get(
    '/api/riders/me/form',
    {
      config: {
        response: { 200: formResponseSchema },
        spoiler: 'horizon',
        veil: {
          by: ['L', 'F', 'M'],
          why: 'DD-08: la condición propia se enseña; el parte y la actividad de los días velados, no',
        },
      },
    },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const rider = await getRiderForUser(db, userId)
      if (!rider) return { log: [], form: null }
      const h = await request.horizon()
      const rows = await getDailyLog(db, h, rider.id, 90)
      const health = await getRiderHealth(db, h, rider.id)
      // En su forma de pantalla (E3, §13.5; 19b): cada día en sus dos barras y su carga en palabras, y la
      // condición de hoy con los cerillos que cuenta el motor; el ctl, la atl, el tsb y el TSS no cruzan.
      const log = rows.map((p) => conditionDay({ ...p, ...ciudadesDelDia(p.activity, p.gameDay) }))
      const latest = rows[rows.length - 1]
      const form = latest
        ? conditionToday(
            latest,
            health?.state ?? null,
            await getRiderMorale(db, rider.id),
            rider.attributes,
          )
        : null
      return { log, form, health }
    },
  )

  /**
   * LA FICHA DEL CORREDOR (docs/entrenamiento.md §2.3 y §4.6). Tres rutas, una regla: **ningún
   * oculto cruza esta frontera**. El techo sale como una opinión RELATIVA del entrenador (dónde
   * tiene el corredor más margen y dónde menos, cada vez más segura con los años), el talento y la
   * fragilidad como códigos, y `facilities` como «bajo / normal / alto». Nada de lo que devuelven
   * permite reconstruir un número interno, que es la condición que `MVP.md:114` pone a toda esta
   * pantalla.
   *
   * Y la regla tiene una segunda mitad que se aprendió por las malas (docs/agenda.md §4.20): **la
   * API no manda lo que la pantalla no enseña**. La opinión viajaba como `tres` / `cuatro` /
   * `cinco`, que no es un número crudo pero ES el techo en estrellas, y cualquiera lo leía en la
   * pestaña de red. Los códigos de hoy son exactamente las frases de la pantalla.
   */

  // Flecha de tendencia: Δ28 por atributo (SPEC 3.2, con la ventana y los niveles de §2.3).
  app.get(
    '/api/riders/me/trend',
    { config: { response: { 200: trendResponseSchema }, spoiler: 'horizon', veil: { by: ['F'] } } },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const rider = await getRiderForUser(db, userId)
      const world = await getCurrentWorld(db)
      if (!rider || !world) return { trend: [] }
      const trend = await getAttrTrend(db, await request.horizon(), rider.id, world.currentDay)
      // la flecha en su código (E3, §13.2; 13-a, 19b): el Δ28 no cruza
      return { trend: trend.map((t) => ({ attr: t.attr, arrow: trendCode(t.delta28) })) }
    },
  )

  // Opinión del entrenador: una vez por temporada, relativa y borrosa al principio (SPEC 5.6).
  app.get(
    '/api/riders/me/coach-view',
    {
      config: {
        response: { 200: coachViewResponseSchema },
        spoiler: 'horizon',
        veil: {
          by: ['L'],
          why: 'DD-08: las notas del preparador miran los atributos propios, que mueve lo aprendido en carrera',
        },
      },
    },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const rider = await getRiderForUser(db, userId)
      const world = await getCurrentWorld(db)
      if (!rider || !world) return { coachView: null }
      return {
        coachView: await getCoachView(db, rider.id, world.worldSeed, world.currentDay),
      }
    },
  )

  // Informe del bloque: de dónde salió cada punto de los últimos 28 días (§4.6).
  app.get(
    '/api/riders/me/report',
    {
      config: {
        response: { 200: blockReportResponseSchema },
        spoiler: 'horizon',
        veil: { by: ['F'] },
      },
    },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const rider = await getRiderForUser(db, userId)
      const world = await getCurrentWorld(db)
      if (!rider || !world) return { report: null }
      return {
        report: await getBlockReport(db, await request.horizon(), rider.id, world.currentDay),
      }
    },
  )

  // Objetivos de calendario del corredor y su convocatoria (Paso 35).
  app.get(
    '/api/riders/me/race-prefs',
    {
      config: {
        response: { 200: racePrefsResponseSchema },
        spoiler: 'horizon',
        veil: {
          by: ['L'],
          why: 'convocatorias decididas con el mundo al día; no nombran ninguna etapa',
        },
      },
    },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const rider = await getRiderForUser(db, userId)
      const world = await getCurrentWorld(db)
      if (!rider || !world) return { races: [] }
      return { races: await getRacePrefs(db, rider.id, currentSeason(world.currentDay)) }
    },
  )

  app.put(
    '/api/riders/me/race-prefs',
    { config: { response: { 200: okResponseSchema }, spoiler: 'safe' } },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const parsed = putRacePrefSchema.safeParse(request.body)
      if (!parsed.success) return badRequest(reply)
      const rider = await getRiderForUser(db, userId)
      if (!rider) return sendError(reply, 409, 'sin_ciclista')
      await setRacePref(db, rider.id, parsed.data.raceId, parsed.data.wanted)
      return { ok: true }
    },
  )

  // Palmarés del corredor de la sesión (Paso 40).
  app.get(
    '/api/riders/me/palmares',
    {
      config: {
        response: { 200: palmaresResponseSchema },
        spoiler: 'horizon',
        veil: { by: ['F'] },
      },
    },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const rider = await getRiderForUser(db, userId)
      if (!rider) return { palmares: [] }
      return { palmares: await getPalmares(db, await request.horizon(), rider.id) }
    },
  )

  // Estado del corredor (equipo, moral, dinero, fama, puntos) para la cabecera del perfil.
  app.get(
    '/api/riders/me/summary',
    {
      config: {
        response: { 200: riderSummaryResponseSchema },
        spoiler: 'horizon',
        veil: { by: ['R'] },
      },
    },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const rider = await getRiderForUser(db, userId)
      if (!rider) return { summary: null }
      const summary = await getRiderSummary(db, await request.horizon(), rider.id)
      if (!summary) return { summary: null }
      // la moral en medias estrellas (E3, §13.7; DD-12, 19b): la exacta no cruza
      const { morale, ...rest } = summary
      return { summary: { ...rest, moraleStars: moraleStars(morale) } }
    },
  )

  // Libro de transacciones y saldo (Paso 38).
  app.get(
    '/api/riders/me/ledger',
    {
      config: {
        response: { 200: ledgerResponseSchema },
        spoiler: 'horizon',
        veil: { by: ['F', 'R'] },
      },
    },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const rider = await getRiderForUser(db, userId)
      if (!rider) return { balance: 0, entries: [], gameDay: null, salary: null }
      const h = await request.horizon()
      const [ledger, world, contract] = await Promise.all([
        getLedger(db, h, rider.id),
        getCurrentWorld(db),
        getContract(db, rider.id),
      ])
      // Para el aviso de "próximo sueldo": la nómina cae cada día de juego múltiplo de 7 (GD7, GD14…).
      return { ...ledger, gameDay: world?.currentDay ?? null, salary: contract?.salary ?? null }
    },
  )

  // Bandeja de ofertas y contrato vigente (Paso 36).
  app.get(
    '/api/riders/me/offers',
    {
      config: {
        response: { 200: marketResponseSchema },
        spoiler: 'horizon',
        veil: {
          by: ['L'],
          why: 'ofertas con el rating y los presupuestos del mundo al día; no nombran ninguna etapa',
        },
      },
    },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const rider = await getRiderForUser(db, userId)
      if (!rider) return { offers: [], contract: null }
      return { offers: await getOffers(db, rider.id), contract: await getContract(db, rider.id) }
    },
  )

  app.post<{ Params: { id: string } }>(
    '/api/riders/me/offers/:id/accept',
    { config: { response: { 200: okResponseSchema }, spoiler: 'safe' } },
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
    { config: { response: { 200: okResponseSchema }, spoiler: 'safe' } },
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
  app.get(
    '/api/riders/me/race-entries',
    { config: { response: { 200: enterableRacesResponseSchema }, spoiler: 'safe' } },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const rider = await getRiderForUser(db, userId)
      const world = await getCurrentWorld(db)
      if (!rider || !world) return { races: [] }
      return { races: await getEnterableRaces(db, rider.id, world.currentDay) }
    },
  )

  app.post<{ Params: { raceId: string } }>(
    '/api/riders/me/race-entries/:raceId',
    { config: { response: { 200: okResponseSchema }, spoiler: 'safe' } },
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
    { config: { response: { 200: okResponseSchema }, spoiler: 'safe' } },
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
    {
      config: {
        response: { 200: retireFromRaceResponseSchema },
        spoiler: 'horizon',
        veil: { by: ['M'] },
      },
    },
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      // El parámetro es la clave con temporada (`race-france:s3`), que es como se guarda el roster.
      if (!parseRaceKey(request.params.raceKey)) return badRequest(reply)
      const rider = await getRiderForUser(db, userId)
      const world = await getCurrentWorld(db)
      if (!rider || !world) return sendError(reply, 409, 'sin_ciclista')
      const res = await retireFromRace(db, await request.horizon(), {
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
  app.get<{ Params: { id: string } }>(
    '/api/riders/:id/badges',
    {
      config: { response: { 200: badgesResponseSchema }, spoiler: 'horizon', veil: { by: ['R'] } },
    },
    async (request, reply) => {
      const riderId = parseUuid(request.params.id)
      if (!riderId) return notFound(reply)
      return { badges: await getRiderBadges(db, await request.horizon(), riderId) }
    },
  )

  // Palmarés público de cualquier corredor (lo que ha ganado): para ver el detalle desde su ficha.
  app.get<{ Params: { id: string } }>(
    '/api/riders/:id/palmares',
    {
      config: {
        response: { 200: palmaresResponseSchema },
        spoiler: 'horizon',
        veil: { by: ['F'] },
      },
    },
    async (request, reply) => {
      const riderId = parseUuid(request.params.id)
      if (!riderId) return notFound(reply)
      return { palmares: await getPalmares(db, await request.horizon(), riderId) }
    },
  )

  // Resultados públicos de cualquier corredor, AGRUPADOS POR CARRERA: la general de titular (se
  // gane o no) y las etapas como desglose (docs/navegacion.md §3.6).
  app.get<{ Params: { id: string } }>(
    '/api/riders/:id/results',
    {
      config: {
        response: { 200: riderResultsResponseSchema },
        spoiler: 'horizon',
        veil: { by: ['F', 'P'] },
      },
    },
    async (request, reply) => {
      const riderId = parseUuid(request.params.id)
      if (!riderId) return notFound(reply)
      return { results: await getRiderRaceResults(db, await request.horizon(), riderId) }
    },
  )

  app.get<{ Params: { id: string } }>(
    '/api/riders/:id',
    {
      config: {
        response: { 200: publicRiderDetailResponseSchema },
        spoiler: 'horizon',
        // F desde el 17a de E3: `champion`, sin los títulos de un campeonato velado (docs/visual.md §8.5)
        veil: {
          by: ['R', 'M', 'F', 'L'],
          why: 'DD-08: los atributos se enseñan aunque los mueva lo aprendido en carrera, también los de un rival',
        },
      },
    },
    async (request, reply) => {
      const riderId = parseUuid(request.params.id)
      if (!riderId) return notFound(reply)
      const world = await getCurrentWorld(db)
      const season = world ? currentSeason(world.currentDay) : 0
      const h = await request.horizon()
      const rider = await getPublicRider(db, h, riderId, season)
      if (!rider) return notFound(reply)
      // El maillot de `RiderHeader` (E3, docs/visual.md §8.5; 4-l, 17a): su título vigente de mayor
      // alcance, sin los de un campeonato que quien mira no ha visto.
      const champion = world === null ? null : await riderChampion(db, h, world, riderId)
      // de un corredor cualquiera, sus estrellas y nada más (E3, §13.5; 19b)
      return { rider: { ...rider, attributes: attributeStars(rider.attributes), champion } }
    },
  )
}
