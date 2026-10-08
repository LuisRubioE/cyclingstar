import {
  type StageOrderRow,
  getCurrentWorld,
  getRaceRivals,
  getRaceTeams,
  getRosterTeammates,
  getStageOrders,
  getStageSnapshot,
  getRiderForUser,
  isOnRoster,
  raceStagesForWorld,
  readWatch,
  setStageOrders,
  worldHorizon,
} from '@cyclingstar/db'
import {
  ENGINE_VERSION,
  SEASON_CALENDAR,
  renderAltimetrySvg,
  stageDayOfSeason,
  stagePlace,
  stageSeed,
  stagesForSeason,
  weatherForecast,
} from '@cyclingstar/engine'
import {
  DAYS_PER_SEASON,
  type StageReplay,
  chasePolicySchema,
  currentSeason,
  dayGoalSchema,
  stageQuerySchema,
  triggerCondSchema,
} from '@cyclingstar/shared'
import { z } from 'zod'
import { badRequest, notFound, sendError, unauthorized } from '../http.js'
import { stageAccessOf } from '../spoiler.js'
import { calendarStageSpec } from '../stageHistory.js'
import { stageContextOf, stageReplayOf, stageShellOf } from '../stageReplay.js'
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
  app.get<{ Querystring: { raceKey?: string } }>(
    '/api/my-orders',
    {
      config: {
        spoiler: 'safe',
        veil: { by: ['N', 'L'], why: 'rivales por fama, que no se escribe' },
      },
    },
    async (request, reply) => {
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
    },
  )

  app.put('/api/my-orders', { config: { spoiler: 'safe' } }, async (request, reply) => {
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

  /**
   * LA FICHA DE UNA ETAPA DE CALENDARIO (pública): cuenta lo que pasó (fuga, caza, cimas, sprints,
   * meta) a partir de los eventos congelados al correrla, aunque no hayas corrido tú.
   *
   * Desde el 7b (E2, docs/retransmision.md §14.1 y §14.2; D-40, D-50, decisiones 14-e y 11-h) sirve el
   * resultado solo si la pantalla lo va a enseñar (`stageAccessOf`): una etapa que no se ha visto da su
   * ficha sin resultado (`stageShellOf`) y gana `watch`, lo visto, con su puerta. Solo con
   * `SPOILER_MODE` aplicado a quien pide (§10.13): sin él, la ficha de hoy, entera y sin `watch`. Con
   * `?diag=1`, un administrador con sesión recibe la ficha entera, sin `watch` ni horizonte y sin
   * escribir nada (§11.15); para cualquier otro, el parámetro no existe. `?season=` abre una etapa de
   * otra temporada (§14.2); sin él, la de hoy, como siempre.
   */
  app.get<{ Params: { raceId: string; day: string } }>(
    '/api/races/:raceId/stages/:day',
    { config: { spoiler: 'horizon', veil: { by: ['G', 'P'] } } },
    async (request, reply) => {
      const q = stageQuerySchema.safeParse(request.query)
      if (!q.success) return badRequest(reply)
      const raceId = parseRaceId(request.params.raceId)
      const day = parseStageDay(request.params.day)
      if (!raceId || day === null) return notFound(reply)
      // La carrera, la etapa y la edición que corre el mundo (stageReplay.ts): un raceId o un día que
      // el calendario no tiene son un 404, no un 500 por consulta con basura.
      const ctx = await stageContextOf(db, raceId, day, q.data.season)
      if (!ctx) return notFound(reply)
      // El espectador se resuelve siempre, con `?diag=1` o sin él: así quien no es administrador recibe
      // lo mismo, cabeceras incluidas (la `cs_viewer` de §14.9), que sin el parámetro (11-h).
      const viewer = await request.viewer()
      // La radio desde la línea nombra siempre a sus corredores propios (11a, R23.7).
      const userId = viewer?.userId ?? null
      if (q.data.diag === '1' && (await request.diagAllowed()))
        return stageReplayOf(db, ctx, { radio: { h: worldHorizon, userId } })
      if (!(await request.spoilerApplies()))
        return stageReplayOf(db, ctx, { radio: { h: worldHorizon, userId } })
      // El snapshot con el horizonte de quien pide (G, §10.6): de una etapa velada, sin sucesos ni
      // radio, que la ficha sin resultado (`stageShellOf`) no lee; la entrada es el recorrido (N).
      const h = await request.horizon()
      const [watchOn, row, snapshot] = await Promise.all([
        request.broadcastOn(),
        viewer === null
          ? null
          : readWatch(db, { userId: viewer.userId, worldId: ctx.worldId, raceKey: ctx.raceKey }),
        getStageSnapshot(db, h, ctx.raceKey, ctx.day),
      ])
      const access = stageAccessOf({
        h,
        applies: true,
        watchOn,
        row,
        raceKey: ctx.raceKey,
        day: ctx.day,
        run: snapshot !== null,
      })
      const body = access.serveResult
        ? await stageReplayOf(db, ctx, { snapshot, radio: { h, userId } })
        : stageShellOf(ctx, snapshot)
      return {
        ...body,
        ...(access.watch === undefined ? {} : { watch: access.watch }),
      } satisfies StageReplay
    },
  )
}
