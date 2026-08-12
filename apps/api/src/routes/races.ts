import {
  type Database,
  type StageOrderRow,
  addToRoster,
  getCurrentWorld,
  getGcThroughStage,
  getKomClassification,
  getPointsClassification,
  getRaceGc,
  getRaceHistory,
  getRaceRiderIdentities,
  getRaceRivals,
  getRosterTeammates,
  getRunStageDays,
  getStageOrders,
  getStageResults,
  getStageSnapshot,
  getRiderForUser,
  getTeamClassifications,
  isOnRoster,
  setStageOrders,
} from '@cyclingstar/db'
import {
  SEASON_CALENDAR,
  type StageInput,
  TEST_TOUR,
  renderAltimetrySvg,
  simulateStage,
} from '@cyclingstar/engine'
import { NO_LEADERS, type RaceLeaders, currentSeason, raceLeaders } from '@cyclingstar/shared'
import { z } from 'zod'
import { type ChronicleEvent, buildChronicle, buildMarkers, chronicleNames } from '../chronicle.js'
import { badRequest, notFound, sendError, unauthorized } from '../http.js'
import { stageHead } from '../stageHistory.js'
import type { RoutePlugin } from './context.js'
import { parseRaceId, parseRaceKey, parseStageDay } from './params.js'

/** La vuelta de prueba vive fuera del calendario de temporada, con su propia clave. */
const TEST_TOUR_ID = 'test-tour'

const stageOrderSchema = z.object({
  stageDay: z.number().int().positive(),
  role: z.enum(['lider', 'sprinter', 'lanzador', 'gregario', 'cazaetapas', 'marcador', 'libre']),
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
const putMyOrdersSchema = z.object({
  raceKey: z.string().min(1).max(120),
  orders: z.array(stageOrderSchema).max(30),
})

/** Kilómetros de una etapa a partir de su perfil. */
const stageKm = (segments: readonly { km: number }[]): number =>
  Math.round(segments.reduce((sum, s) => sum + s.km, 0))

/**
 * Quién llevaba cada maillot TRAS la etapa `day` (y por tanto quién lo lleva PUESTO en la `day+1`).
 *
 * Es la misma pregunta que responde la ficha con sus tablas, hecha un día antes: por eso relee las
 * mismas cuatro clasificaciones con `throughStage = day` en vez de inventar una consulta nueva. Con
 * `day < 1` no hay nada que arrastrar —la etapa 1 se corre sin maillots, se ganan el día anterior—
 * y se devuelve el juego vacío sin tocar la base.
 */
async function leadersThroughStage(
  db: Database,
  raceKey: string,
  day: number,
): Promise<RaceLeaders> {
  if (day < 1) return NO_LEADERS
  const [gc, points, kom, teams] = await Promise.all([
    getGcThroughStage(db, raceKey, day),
    getPointsClassification(db, raceKey, day),
    getKomClassification(db, raceKey, day),
    getTeamClassifications(db, raceKey, day),
  ])
  return raceLeaders({ gc, points, kom, teams: teams.overall })
}

/**
 * Rutas de carrera: la vuelta de prueba (etapas, órdenes, resultados y replay), las órdenes del
 * corredor para una carrera real del calendario y la crónica pública de una etapa corrida.
 */
export const raceRoutes: RoutePlugin = async (app, ctx) => {
  const { db, currentUserId } = ctx

  // La vuelta de prueba: sus etapas con altimetría y las órdenes actuales del corredor.
  //
  // ESCRITURA EN UN GET: `addToRoster` inscribe al corredor en la vuelta de prueba al visitarla.
  // Es deuda conocida de la herramienta de pruebas de la alfa (la web no tiene un botón de
  // "inscribirme" al que mover la escritura y este repo no puede tocar apps/web). Se deja aquí,
  // acotada: la operación es idempotente (INSERT ... ON CONFLICT DO NOTHING) y su fallo no debe
  // tumbar la lectura, así que va aislada y solo se registra en el log.
  app.get('/api/races/test-tour', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const rider = await getRiderForUser(db, userId)
    const stages = TEST_TOUR.map((stage) => ({
      day: stage.day,
      name: stage.name,
      kind: stage.kind,
      timeTrial: stage.timeTrial ?? false,
      km: stageKm(stage.profile.segments),
      altimetry: renderAltimetrySvg(stage.profile),
    }))
    if (!rider) return { stages, orders: [], roster: [] }
    try {
      await addToRoster(db, TEST_TOUR_ID, rider.id)
    } catch (err) {
      request.log.warn({ err }, 'no se pudo inscribir al corredor en la vuelta de prueba')
    }
    const orders = await getStageOrders(db, TEST_TOUR_ID, rider.id)
    const roster = [{ id: rider.id, name: rider.name }]
    return { stages, orders, roster }
  })

  app.put('/api/races/test-tour/orders', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const parsed = putStageOrdersSchema.safeParse(request.body)
    if (!parsed.success) return badRequest(reply)
    const rider = await getRiderForUser(db, userId)
    if (!rider) return sendError(reply, 409, 'sin_ciclista')
    const validDays = new Set(TEST_TOUR.map((s) => s.day))
    const valid: StageOrderRow[] = parsed.data.orders.filter((o) => validDays.has(o.stageDay))
    await addToRoster(db, TEST_TOUR_ID, rider.id)
    await setStageOrders(db, TEST_TOUR_ID, rider.id, valid)
    return { ok: true, saved: valid.length }
  })

  // Historial de ganadores de la vuelta de prueba (Paso 40). Público.
  app.get('/api/races/test-tour/history', async () => {
    const world = await getCurrentWorld(db)
    if (!world) return { history: [] }
    return { history: await getRaceHistory(db, world.worldId, TEST_TOUR_ID) }
  })

  // General de la vuelta + estado de cada etapa (corrida o no).
  app.get('/api/races/test-tour/results', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const gc = await getRaceGc(db, TEST_TOUR_ID)
    const points = await getPointsClassification(db, TEST_TOUR_ID)
    const kom = await getKomClassification(db, TEST_TOUR_ID)
    const { overall: teamGc } = await getTeamClassifications(db, TEST_TOUR_ID)
    const run = new Set(await getRunStageDays(db, TEST_TOUR_ID))
    const stages = TEST_TOUR.map((stage) => ({
      day: stage.day,
      name: stage.name,
      kind: stage.kind,
      km: stageKm(stage.profile.segments),
      run: run.has(stage.day),
    }))
    return { gc, points, kom, teamGc, stages }
  })

  // Replay de una etapa de la vuelta de prueba: se regenera desde el snapshot sellado (SPEC 6.1).
  app.get<{ Params: { day: string } }>(
    '/api/races/test-tour/stages/:day',
    async (request, reply) => {
      const userId = await currentUserId(request)
      if (!userId) return unauthorized(reply)
      const day = parseStageDay(request.params.day)
      const stage = day === null ? undefined : TEST_TOUR.find((s) => s.day === day)
      if (day === null || !stage) return notFound(reply)

      const snapshot = await getStageSnapshot(db, TEST_TOUR_ID, day)
      const results = await getStageResults(db, TEST_TOUR_ID, day)
      const km = stageKm(stage.profile.segments)
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
      // La vuelta de prueba no tiene roster de carrera: las identidades salen de los resultados, así
      // que van sin dorsal (y la crónica lo omite, en vez de inventarlo).
      const chronicle = buildChronicle(output.events, chronicleNames(results), {
        // Una crono se lee por el reloj de carrera, no por el kilómetro (v18).
        byClock: stage.timeTrial === true,
      })
      const altimetry = renderAltimetrySvg(stage.profile, { markers: buildMarkers(output.events) })
      // La general tal como quedó tras esta etapa (no solo la final).
      const gc = await getGcThroughStage(db, TEST_TOUR_ID, day)
      return {
        day,
        name: stage.name,
        km,
        run: true,
        timeTrial: stage.timeTrial ?? false,
        altimetry,
        results,
        chronicle,
        gc,
      }
    },
  )

  // Órdenes del corredor para una carrera REAL del calendario a la que está convocado (raceKey
  // = `${raceId}:s${season}`). Devuelve sus etapas con altimetría, las órdenes actuales y los
  // compañeros de equipo en el roster (posibles objetivos). Solo si el corredor está convocado.
  app.get<{ Querystring: { raceKey?: string } }>('/api/my-orders', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const raceKey = request.query.raceKey ?? ''
    const parsedKey = parseRaceKey(raceKey)
    const race = parsedKey ? SEASON_CALENDAR.find((r) => r.id === parsedKey.raceId) : null
    // La clave se valida ANTES de consultar la base: una raceKey basura es un 404, no un 500.
    if (!race) return notFound(reply)
    const rider = await getRiderForUser(db, userId)
    if (!rider) return notFound(reply)
    if (!(await isOnRoster(db, raceKey, rider.id))) {
      return sendError(reply, 403, 'no_convocado')
    }
    const stages = race.stages.map((stage, i) => ({
      day: i + 1,
      name: `Stage ${i + 1}`,
      kind: stage.kind,
      timeTrial: stage.timeTrial ?? false,
      km: stageKm(stage.profile.segments),
      altimetry: renderAltimetrySvg(stage.profile),
    }))
    const orders = await getStageOrders(db, raceKey, rider.id)
    const teammates = await getRosterTeammates(db, raceKey, rider.id)
    const rivals = await getRaceRivals(db, raceKey, rider.id)
    return { race: { id: race.id, name: race.name }, stages, orders, teammates, rivals }
  })

  app.put('/api/my-orders', async (request, reply) => {
    const userId = await currentUserId(request)
    if (!userId) return unauthorized(reply)
    const parsed = putMyOrdersSchema.safeParse(request.body)
    if (!parsed.success) return badRequest(reply)
    const parsedKey = parseRaceKey(parsed.data.raceKey)
    const race = parsedKey ? SEASON_CALENDAR.find((r) => r.id === parsedKey.raceId) : null
    if (!race) return notFound(reply)
    const rider = await getRiderForUser(db, userId)
    if (!rider) return notFound(reply)
    if (!(await isOnRoster(db, parsed.data.raceKey, rider.id))) {
      return sendError(reply, 403, 'no_convocado')
    }
    const validDays = new Set(race.stages.map((_, i) => i + 1))
    const valid: StageOrderRow[] = parsed.data.orders.filter((o) => validDays.has(o.stageDay))
    await setStageOrders(db, parsed.data.raceKey, rider.id, valid)
    return { ok: true, saved: valid.length }
  })

  // Crónica/journal de una etapa de CALENDARIO (pública): cuenta lo que pasó (fuga, caza, cimas,
  // sprints, meta) a partir de los eventos congelados al correrla, aunque no hayas corrido tú.
  app.get<{ Params: { raceId: string; day: string } }>(
    '/api/races/:raceId/stages/:day',
    async (request, reply) => {
      const raceId = parseRaceId(request.params.raceId)
      const day = parseStageDay(request.params.day)
      if (!raceId || day === null) return notFound(reply)
      // La carrera y la etapa se resuelven contra el calendario (dato del motor) ANTES de tocar la
      // base: un raceId o un día inexistentes son un 404, no un 500 por consulta con basura.
      const race = SEASON_CALENDAR.find((r) => r.id === raceId)
      const stage = race?.stages[day - 1]
      if (!race || !stage) return notFound(reply)
      const world = await getCurrentWorld(db)
      if (!world) return notFound(reply)
      const raceKey = `${race.id}:s${currentSeason(world.currentDay)}`
      const km = stageKm(stage.profile.segments)
      // Contexto de la etapa: a qué carrera pertenece y cuántas etapas tiene. Sin esto la página de
      // etapa es un callejón sin salida (docs/navegacion.md §6.3): no sabe ni su carrera ni si hay
      // anterior/siguiente. Va en las TRES ramas de respuesta, corrida o no.
      const raceInfo = {
        id: race.id,
        name: race.name,
        country: race.country ?? null,
        stageCount: race.stages.length,
      }
      const snapshot = await getStageSnapshot(db, raceKey, day)
      if (!snapshot) {
        return {
          day,
          name: stage.name,
          km,
          run: false,
          race: raceInfo,
          kind: stage.kind,
          timeTrial: stage.timeTrial ?? false,
          altimetry: renderAltimetrySvg(stage.profile),
        }
      }
      // LA HISTORIA DE UNA ETAPA CORRIDA SE LEE DE SU SNAPSHOT, NO DEL CALENDARIO DE HOY: el
      // porqué y el caso de producción que lo destapó, en `stageHistory.ts`.
      const racedInput = snapshot.input as StageInput
      const racedProfile = racedInput.profile
      const racedTimeTrial = racedInput.timeTrial === true
      const head = stageHead(
        day,
        { name: stage.name, kind: stage.kind, timeTrial: stage.timeTrial ?? false, km },
        {
          profile: racedProfile,
          timeTrial: racedTimeTrial,
          km: stageKm(racedProfile.segments),
        },
      )

      const results = await getStageResults(db, raceKey, day)
      const gc = await getGcThroughStage(db, raceKey, day)
      // Montaña y puntos tal como quedaron TRAS esta etapa (acumulado hasta el día `day`).
      const kom = await getKomClassification(db, raceKey, day)
      const points = await getPointsClassification(db, raceKey, day)
      // Clasificación por equipos: la de ESTA etapa y la acumulada tras ella, igual que la general.
      const { stage: teamStage, overall: teamGc } = await getTeamClassifications(db, raceKey, day)
      // LOS MAILLOTS, en dos juegos (ver `stageReplaySchema.leaders`): los de la carretera de ese
      // día —la clasificación tras la N−1, que es lo que cuenta el journal— y los de después de la
      // etapa, que es lo que muestran las tablas de esta misma página. En una carrera de UN DÍA no
      // hay ninguno: no hay clasificación anterior que arrastrar ni día siguiente que defender.
      const oneDay = race.stages.length === 1
      const onRoad = oneDay ? NO_LEADERS : await leadersThroughStage(db, raceKey, day - 1)
      const afterStage: RaceLeaders = oneDay
        ? NO_LEADERS
        : raceLeaders({ gc, points, kom, teams: teamGc })
      const leaders = { onRoad, afterStage }
      // El journal se lee de los eventos CONGELADOS al correr la etapa (no se re-simula): así siempre
      // cuadra con el resultado guardado. Las etapas corridas antes de guardarlos no tienen journal
      // detallado (no lo inventamos re-simulando, que daría una historia distinta al resultado real).
      const storedEvents = snapshot.events as ChronicleEvent[] | null
      if (!storedEvents) {
        return {
          day,
          name: head.name,
          km: head.km,
          run: true,
          race: raceInfo,
          kind: head.kind,
          timeTrial: head.timeTrial,
          altimetry: renderAltimetrySvg(racedProfile),
          results,
          gc,
          kom,
          points,
          teamStage,
          teamGc,
          leaders,
          journalUnavailable: true,
        }
      }
      // La identidad de los protagonistas sale del ROSTER (dorsal, equipo, país de todos los
      // inscritos) y, para quien no esté en él, de los resultados de la etapa: los eventos están
      // congelados y hay que resolverlos con lo que haya hoy, sin romperse por lo que falte.
      const identities = await getRaceRiderIdentities(db, raceKey)
      // …y con el maillot que llevaba PUESTO ese día, que es parte de su identidad en la carretera
      // exactamente igual que el dorsal: así sale en TODAS las menciones sin tocar una sola frase.
      const chronicle = buildChronicle(
        storedEvents,
        chronicleNames([...identities, ...results], onRoad),
        // Una crono se lee por el reloj de carrera, no por el kilómetro (v18); y si se corrió contra
        // el reloj lo dice el snapshot, que es quien vio la etapa.
        { byClock: racedTimeTrial },
      )
      const altimetry = renderAltimetrySvg(racedProfile, { markers: buildMarkers(storedEvents) })
      return {
        day,
        name: head.name,
        km: head.km,
        run: true,
        race: raceInfo,
        kind: head.kind,
        timeTrial: head.timeTrial,
        altimetry,
        results,
        chronicle,
        gc,
        kom,
        points,
        teamStage,
        teamGc,
        leaders,
      }
    },
  )
}
