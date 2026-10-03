import {
  type StageOrderRow,
  getCurrentWorld,
  getGcThroughStage,
  getKomClassification,
  getPointsClassification,
  getRaceRiderIdentities,
  getRaceRivals,
  getRaceTeams,
  getRosterTeammates,
  getStageOrders,
  getStageNonFinishers,
  getStageResults,
  getStageSnapshot,
  getRiderForUser,
  getTeamClassifications,
  isOnRoster,
  raceStagesForWorld,
  setStageOrders,
} from '@cyclingstar/db'
import {
  ENGINE_VERSION,
  SEASON_CALENDAR,
  type StageInput,
  renderAltimetrySvg,
  stageDayOfSeason,
  stagePlace,
  stageSeed,
  stagesForSeason,
  weatherForecast,
} from '@cyclingstar/engine'
import {
  DAYS_PER_SEASON,
  NO_LEADERS,
  type RaceLeaders,
  chasePolicySchema,
  currentSeason,
  dayGoalSchema,
  raceLeaders,
  triggerCondSchema,
} from '@cyclingstar/shared'
import { z } from 'zod'
import {
  type ChronicleEvent,
  buildChronicle,
  buildMarkers,
  buildRaceRadio,
  chronicleNames,
} from '../chronicle.js'
import { leadersThroughStage } from '../broadcastSource.js'
import { badRequest, notFound, sendError, unauthorized } from '../http.js'
import { calendarStageSpec, stageHead } from '../stageHistory.js'
import { congeladaComoEtapa } from '../stageRoute.js'
import type { RoutePlugin } from './context.js'
import { parseRaceId, parseRaceKey, parseStageDay } from './params.js'

const stageOrderSchema = z.object({
  stageDay: z.number().int().positive(),
  role: z.enum(['lider', 'sprinter', 'lanzador', 'gregario', 'cazaetapas', 'marcador', 'libre']),
  targetRiderId: z.string().uuid().nullable(),
  mentality: z.enum(['reservon', 'oportunista', 'combativo', 'supercombativo']),
  effort: z.enum(['ahorrar', 'normal', 'a_tope']),
  triggerKm: z.number().int().nonnegative().nullable(),
  contestSprints: z.boolean(),
  contestClimbs: z.boolean(),
  /**
   * LAS CUATRO DEL PASO 17a. `.nullish()` por las dos puntas: la hoja guardada antes de la migración
   * las trae a `null`, y un cliente que aún no se ha desplegado no las manda. Las dos cosas
   * significan «no hay preferencia», que es la conducta de hoy. Esta validación es la de ENTRADA y
   * por eso es más estricta que el contrato: aquí sí se acotan los identificadores a UUID y los
   * vetos a un número razonable de equipos, porque esto lo escribe un cliente cualquiera.
   */
  triggerOn: triggerCondSchema.nullish(),
  chasePolicy: chasePolicySchema.nullish(),
  refuseRelayTeams: z.array(z.string().uuid()).max(30).nullish(),
  dayGoal: dayGoalSchema.nullish(),
})
const putMyOrdersSchema = z.object({
  raceKey: z.string().min(1).max(120),
  orders: z.array(stageOrderSchema).max(30),
})

/** Kilómetros de una etapa a partir de su perfil. */
const stageKm = (segments: readonly { km: number }[]): number =>
  Math.round(segments.reduce((sum, s) => sum + s.km, 0))

/**
 * Rutas de carrera: las órdenes del corredor para una carrera real del calendario y la crónica
 * pública de una etapa corrida. La vuelta de prueba del MVP (`/api/races/test-tour*`) se retiró
 * por decisión del dueño (02/10/2026).
 */
export const raceRoutes: RoutePlugin = async (app, ctx) => {
  const { db, currentUserId } = ctx

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
    if (!parsedKey || !race) return notFound(reply)
    const rider = await getRiderForUser(db, userId)
    if (!rider) return notFound(reply)
    if (!(await isOnRoster(db, raceKey, rider.id))) {
      return sendError(reply, 403, 'no_convocado')
    }
    // El reloj del mundo, que es lo que convierte un tiempo en una PREVISIÓN: sin saber qué día es
    // hoy no se puede decir a cuántos días está la etapa.
    const world = await getCurrentWorld(db)
    /**
     * EL PARTE METEOROLÓGICO DE CADA ETAPA (v44). Es la mitad de E5 que faltaba: `weatherForecast`
     * existía en el motor desde la v42 y no salía por ninguna parte, así que el clima era un
     * modificador y no una decisión. Sale AQUÍ, que es la pantalla en la que el jugador decide a
     * quién manda y qué le pide.
     *
     * LO QUE HACE QUE ESTO NO MIENTA: el parte se calcula con EXACTAMENTE la misma semilla y el
     * mismo sitio con los que `packages/db` va a correr la etapa. La semilla es la de `runOneStage`
     * —mundo, clave de carrera, número de etapa y versión del motor— y el sitio sale de `stagePlace`,
     * que es la MISMA función que usa `calendarRun`: por eso se extrajo, para que las dos cuentas no
     * puedan separarse y el parte no acabe anunciando el tiempo de otra carrera.
     */
    const hoy = world?.currentDay ?? 0
    const season = currentSeason(hoy)
    // Las etapas que el mundo va a correr en la temporada de ESTA clave (congeladas, o su edición si
    // la carrera aún no se ha congelado), no las de la temporada 0 (docs/generador.md §10.7).
    const frozen = world
      ? await raceStagesForWorld(db, world.worldId, raceKey, race.id, parsedKey.season)
      : null
    const stages = stagesForSeason(race.id, parsedKey.season).map((deLaTemporada, i) => {
      const congelada = frozen?.[i]
      const stage = congelada ? congeladaComoEtapa(deLaTemporada, congelada) : deLaTemporada
      const spec = calendarStageSpec(stage, stageKm(stage.profile.segments))
      const dia = i + 1
      const parte =
        world == null
          ? null
          : weatherForecast(
              stageSeed({
                worldSeed: world.worldSeed,
                raceId: raceKey,
                stageDay: dia,
                engineVersion: ENGINE_VERSION,
              }),
              stagePlace(race, dia),
              // Cuántos días faltan DE VERDAD, descansos incluidos: eso sí es distancia en el
              // calendario y no la fecha del clima.
              season * DAYS_PER_SEASON + stageDayOfSeason(race, dia) - hoy,
            )
      return {
        day: dia,
        name: `Stage ${dia}`,
        // De dónde a dónde se corre: la hoja de órdenes también lo dice (encargo del dueño).
        from: deLaTemporada.from,
        to: deLaTemporada.to,
        label: spec.label,
        kind: spec.kind,
        timeTrial: spec.timeTrial,
        km: spec.km,
        altimetry: renderAltimetrySvg(stage.profile),
        forecast:
          parte == null
            ? null
            : {
                lluvia: Math.round(100 * parte.lluvia),
                grados: Math.round(parte.grados),
                fiabilidad: Math.round(100 * parte.fiabilidad),
              },
      }
    })
    const orders = await getStageOrders(db, raceKey, rider.id)
    const teammates = await getRosterTeammates(db, raceKey, rider.id)
    const rivals = await getRaceRivals(db, raceKey, rider.id)
    const teams = await getRaceTeams(db, raceKey, rider.id)
    return { race: { id: race.id, name: race.name }, stages, orders, teammates, rivals, teams }
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
      if (!race || !race.stages[day - 1]) return notFound(reply)
      const world = await getCurrentWorld(db)
      if (!world) return notFound(reply)
      const season = currentSeason(world.currentDay)
      const raceKey = `${race.id}:s${season}`
      // La etapa que el MUNDO corre este año (congelada, o la edición de la temporada si aún no), no
      // la de la temporada 0: es la que se enseña mientras no se haya corrido (docs/generador.md §10.7).
      const frozen = (await raceStagesForWorld(db, world.worldId, raceKey, race.id, season))[
        day - 1
      ]
      const deLaTemporada = stagesForSeason(race.id, season)[day - 1]
      if (!deLaTemporada) return notFound(reply)
      const stage = frozen ? congeladaComoEtapa(deLaTemporada, frozen) : deLaTemporada
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
      // De dónde a dónde va la etapa ESTE año; viaja en las tres ramas, corrida o no.
      const ciudades = { from: deLaTemporada.from, to: deLaTemporada.to }
      // La etiqueta del final la pone el RECORRIDO, no el terreno declarado (ver stageHistory.ts).
      const spec = calendarStageSpec(stage, km)
      const snapshot = await getStageSnapshot(db, raceKey, day)
      if (!snapshot) {
        return {
          day,
          name: spec.name,
          km,
          run: false,
          race: raceInfo,
          ...ciudades,
          label: spec.label,
          kind: spec.kind,
          timeTrial: spec.timeTrial,
          altimetry: renderAltimetrySvg(stage.profile),
        }
      }
      // LA HISTORIA DE UNA ETAPA CORRIDA SE LEE DE SU SNAPSHOT, NO DEL CALENDARIO DE HOY: el
      // porqué y el caso de producción que lo destapó, en `stageHistory.ts`.
      const racedInput = snapshot.input as StageInput
      const racedProfile = racedInput.profile
      const racedTimeTrial = racedInput.timeTrial === true
      const head = stageHead(day, spec, {
        profile: racedProfile,
        timeTrial: racedTimeTrial,
        km: stageKm(racedProfile.segments),
      })

      /**
       * LA HOJA DE LA ETAPA LLEVA TAMBIÉN A LOS QUE NO ACABARON (v50). El dueño: «los DNF no salen
       * en la clasificación de la etapa», y antes: «no sé si se retiró antes de salir o en medio».
       * La lista de salida es la del SNAPSHOT —el campo que el motor corrió ese día—, así que quien
       * está en ella y no está clasificado se retiró en carretera, y quien no está ni en ella es que
       * no tomó la salida. Ver `getStageNonFinishers`.
       */
      const started = racedInput.riders.map((r) => r.riderId)
      const results = [
        ...(await getStageResults(db, raceKey, day)),
        ...(await getStageNonFinishers(db, raceKey, day, started)),
      ]
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
          ...ciudades,
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
      // El índice de identidades se construye UNA vez: lo comparten el journal y la radio, así que
      // no pueden llamar de dos maneras distintas al mismo corredor.
      const names = chronicleNames([...identities, ...results], onRoad)
      const chronicle = buildChronicle(
        storedEvents,
        names,
        // Una crono se lee por el reloj de carrera, no por el kilómetro (v18); y si se corrió contra
        // el reloj lo dice el snapshot, que es quien vio la etapa.
        { byClock: racedTimeTrial },
      )
      const altimetry = renderAltimetrySvg(racedProfile, { markers: buildMarkers(storedEvents) })
      // LA RADIO DE CARRERA, con la misma gente que el journal. `null` en las etapas corridas antes
      // de guardarla, y ahí la vista lo dice en vez de inventarla. A quién se sigue lo decidió quien
      // la escribió; aquí solo se le pone cara.
      const radio = buildRaceRadio(snapshot.radio, names)
      return {
        day,
        name: head.name,
        km: head.km,
        run: true,
        race: raceInfo,
        ...ciudades,
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
        ...(radio ? { radio } : {}),
      }
    },
  )
}
