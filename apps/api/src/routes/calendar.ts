import {
  ENROLL_LOCK_DAYS,
  type FrozenStage,
  ensureRaceRosterFrozen,
  getCurrentWorld,
  getKomClassification,
  getPointsClassification,
  getRaceGc,
  getRaceHistory,
  getRacedStageProfiles,
  getRunStageDays,
  getSeasonWinners,
  getStageWinners,
  getTeamClassifications,
  predictStartlist,
  raceStagesForWorld,
} from '@cyclingstar/db'
import {
  BASE_SEASON,
  SEASON_CALENDAR,
  type StageProfile,
  calendarForSeason,
  stageEndpoints,
  stagesForSeason,
} from '@cyclingstar/engine'
import { DAYS_PER_SEASON, NO_LEADERS, currentSeason, raceLeaders } from '@cyclingstar/shared'
import { notFound } from '../http.js'
import { type RacedStage, calendarStageSpec } from '../stageHistory.js'
import { frozenFromCalendar, raceRouteSource, stageKm, stagePlanEntry } from '../stageRoute.js'
import type { RoutePlugin } from './context.js'
import { parseRaceId } from './params.js'

/** Calendario de temporada (Paso 34): la lista, la ficha de cada carrera y su lista de inscritos. */
export const calendarRoutes: RoutePlugin = async (app, ctx) => {
  const { db } = ctx

  // Calendario de temporada autorizado (Paso 34): 28 carreras con sus etapas cargadas. Público.
  app.get('/api/calendar', async () => {
    const world = await getCurrentWorld(db)
    const season = world ? currentSeason(world.currentDay) : 0
    const winners = world ? await getSeasonWinners(db, world.worldId, season) : {}
    // La edición de la temporada del mundo (docs/generador.md sección 10): mismas carreras, mismos
    // días y mismas etapas que la temporada 0, con los km y las etiquetas de ESTE año.
    const races = calendarForSeason(season).map((race) => ({
      id: race.id,
      name: race.name,
      level: race.level,
      raceClass: race.raceClass,
      championshipCountry: race.championshipCountry ?? null,
      championshipCategory: race.championshipCategory ?? null,
      country: race.country ?? null,
      format: race.format,
      startDay: race.startDay,
      openTo: race.openTo,
      winner: winners[race.id] ?? null,
      // Índices de etapa (1-based) tras los que hay descanso (grandes vueltas y alguna vuelta por
      // etapas); vacío en las que no tienen. Permite marcar el descanso en la lista del calendario.
      restAfter: race.restAfter ?? [],
      stages: race.stages.map((stage) => {
        // De dónde a dónde va la etapa: localidades reales del recorrido de autoría de la carrera.
        const ends = stageEndpoints(race.id, stage.index)
        // La etiqueta del final la pone el RECORRIDO, no el terreno declarado (ver stageHistory.ts).
        const spec = calendarStageSpec(stage, stageKm(stage.profile.segments))
        return {
          index: stage.index,
          name: spec.name,
          label: spec.label,
          kind: spec.kind,
          km: spec.km,
          timeTrial: spec.timeTrial,
          from: ends?.from ?? null,
          to: ends?.to ?? null,
        }
      }),
    }))
    // Día actual de la temporada (0..363) para marcar "hoy" en el calendario; null si no hay mundo.
    return { races, dayOfSeason: world ? world.currentDay % DAYS_PER_SEASON : null }
  })

  // Página de una carrera del calendario: general de la temporada, ganadores de etapa e historial.
  app.get<{ Params: { raceId: string } }>('/api/calendar/:raceId', async (request, reply) => {
    const raceId = parseRaceId(request.params.raceId)
    const race = raceId ? SEASON_CALENDAR.find((r) => r.id === raceId) : null
    if (!race) return notFound(reply)
    /**
     * El plan de etapas: la altimetría de la carrera —relieve, puertos y sus categorías—, su origen,
     * su frase de arquitectura y su edición (docs/generador.md §10.8 y §11.4; D10).
     *
     * El recorrido es el del MUNDO: lo corrido (el snapshot) manda en las etapas ya disputadas; en
     * las demás, el congelado en `race_routes` o, si la carrera aún no se ha congelado, la edición de
     * la temporada del mundo. Nunca el de la temporada 0 a secas: un cambio en el generador, o
     * simplemente otro año, reescribiría la ficha de lo que se va a correr.
     */
    const planFrom = (
      season: number,
      frozen: readonly FrozenStage[],
      anterior: readonly FrozenStage[] | null,
      raced: Map<number, RacedStage>,
    ) =>
      stagesForSeason(race.id, season).map((deLaTemporada, i) =>
        stagePlanEntry({
          raceId: race.id,
          season,
          deLaTemporada,
          frozen: frozen[i] ?? frozenFromCalendar(deLaTemporada),
          anterior: anterior?.[i] ?? null,
          run: raced.get(deLaTemporada.index),
          ends: stageEndpoints(race.id, deLaTemporada.index),
        }),
      )
    // Días de descanso: índices de etapa (1-based) tras los que hay descanso (grandes vueltas y
    // alguna carrera por etapas como la Volta a Portugal). Vacío en las que no tienen.
    const restAfter = race.restAfter ?? []
    // Ficha de la carrera, igual haya mundo o no: `startDay` la sitúa en la temporada, y con él la
    // web sabe cuánto falta para la salida sin tener que cruzar con /api/calendar.
    const raceInfo = (frozen: readonly FrozenStage[]) => ({
      id: race.id,
      name: race.name,
      level: race.level,
      raceClass: race.raceClass,
      format: race.format,
      stageCount: race.stages.length,
      country: race.country ?? null,
      startDay: race.startDay,
      routeSource: raceRouteSource(frozen),
    })
    const world = await getCurrentWorld(db)
    if (!world) {
      // Sin mundo no hay carrera corrida ni congelada que consultar: el plan es la temporada base.
      const base = stagesForSeason(race.id, BASE_SEASON).map(frozenFromCalendar)
      return {
        race: raceInfo(base),
        dayOfSeason: null,
        status: 'upcoming' as const,
        runDays: [],
        stages: planFrom(BASE_SEASON, base, null, new Map()),
        restAfter,
        gc: [],
        points: [],
        kom: [],
        teamGc: [],
        leaders: NO_LEADERS,
        stageWinners: [],
        history: [],
      }
    }
    const season = currentSeason(world.currentDay)
    const raceKey = `${race.id}:s${season}`
    // Lo que el mundo corre este año y lo que corrió el anterior: congelado, o la edición si aún no.
    const frozen = await raceStagesForWorld(db, world.worldId, raceKey, race.id, season)
    const anterior =
      season > BASE_SEASON
        ? await raceStagesForWorld(
            db,
            world.worldId,
            `${race.id}:s${season - 1}`,
            race.id,
            season - 1,
          )
        : null
    // La general va COMPLETA: la web muestra el top 20 y ofrece "Show all" (regla común de tablas,
    // docs/navegacion.md §7.3). Antes se truncaba aquí y no había forma de ver el resto.
    const gc = await getRaceGc(db, raceKey)
    const stageWinners = await getStageWinners(db, raceKey)
    const history = await getRaceHistory(db, world.worldId, race.id)
    // Puntos y montaña: las otras dos clasificaciones que el jugador consulta junto a la general.
    const points = await getPointsClassification(db, raceKey)
    const kom = await getKomClassification(db, raceKey)
    // Clasificación por equipos acumulada de la carrera. Se sirve de lo que el tick dejó escrito y,
    // en carreras corridas antes de que existiera, se deriva al vuelo desde `stage_results`.
    const { overall: teamGc } = await getTeamClassifications(db, raceKey)
    // Estado de la carrera ESTA temporada; es lo que decide qué pestañas tiene su página y cuál abre
    // por defecto (§7.1). La regla de "terminada" es la misma que usa el tick para repartir puntos de
    // general: existe resultado de su última etapa.
    const runDays = await getRunStageDays(db, raceKey)
    // Los recorridos que se corrieron de verdad, en una sola consulta para toda la carrera.
    const raced = new Map<number, RacedStage>()
    for (const row of await getRacedStageProfiles(db, raceKey)) {
      if (!row.profile) continue
      const profile = row.profile as StageProfile
      raced.set(row.stageDay, {
        profile,
        timeTrial: row.timeTrial,
        km: stageKm(profile.segments),
      })
    }
    const status = runDays.includes(race.stages.length)
      ? ('finished' as const)
      : runDays.length > 0
        ? ('racing' as const)
        : ('upcoming' as const)
    // Quién lleva cada maillot AHORA en la carrera: se deriva de las cuatro clasificaciones que ya
    // se acaban de leer, sin una sola consulta más. En una carrera de UN DÍA no hay maillots —no
    // hay clasificación que arrastrar de un día para otro—, y el «líder» de su única tabla es
    // simplemente el ganador.
    const leaders =
      race.stages.length === 1 ? NO_LEADERS : raceLeaders({ gc, points, kom, teams: teamGc })
    return {
      race: raceInfo(frozen),
      // Día actual de la temporada (0..363): con `startDay` sitúa la carrera en el tiempo.
      dayOfSeason: world.currentDay % DAYS_PER_SEASON,
      status,
      runDays,
      stages: planFrom(season, frozen, anterior, raced),
      restAfter,
      gc,
      points,
      kom,
      teamGc,
      leaders,
      stageWinners,
      history,
    }
  })

  // Lista de inscritos de una carrera que está a punto de empezar (dentro de la ventana de cierre de
  // inscripciones): una vez pasado el cierre (~2 semanas antes) la escuadra está congelada y trae a los
  // corredores reales; antes, solo se prevén los equipos que acudirán. Vacía si la carrera no está
  // próxima o ya se corrió esta temporada.
  app.get<{ Params: { raceId: string } }>(
    '/api/calendar/:raceId/startlist',
    async (request, reply) => {
      const raceId = parseRaceId(request.params.raceId)
      const race = raceId ? SEASON_CALENDAR.find((r) => r.id === raceId) : null
      if (!race) return notFound(reply)
      const world = await getCurrentWorld(db)
      if (!world) return { upcoming: false, teams: [], freeAgents: [] }
      const season = currentSeason(world.currentDay)
      const dayOfSeason = world.currentDay % DAYS_PER_SEASON
      const daysUntil = race.startDay - dayOfSeason
      // Solo si aún no ha empezado esta temporada y arranca dentro de la ventana de cierre.
      if (daysUntil <= 0 || daysUntil > ENROLL_LOCK_DAYS) {
        return { upcoming: false, daysUntil, teams: [], freeAgents: [] }
      }
      // ESCRITURA EN UN GET: dentro de la ventana la escuadra ya debería estar congelada por el
      // tick; si no lo está (mundo que entró en la ventana justo al desplegar), esta llamada la
      // congela para poder enseñar corredores reales. Es una reparación idempotente y serializada
      // por advisory lock en la propia función de db, no una acción del usuario, y la web no tiene
      // ningún POST al que moverla. Se aísla: si falla, la lista se sirve igualmente con la
      // previsión de equipos en vez de devolver un 500.
      try {
        await ensureRaceRosterFrozen(db, world.worldId, world.worldSeed, race, world.currentDay)
      } catch (err) {
        request.log.warn({ err, raceId: race.id }, 'no se pudo congelar la escuadra de la carrera')
      }
      const startlist = await predictStartlist(db, world.worldId, race, season)
      return { upcoming: true, daysUntil, ...startlist }
    },
  )
}
