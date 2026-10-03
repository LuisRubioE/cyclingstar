import {
  type Horizon,
  getCastIdentities,
  getOwnRiderIds,
  getRaceRiderIdentities,
  getRunStageDays,
  getStageNews,
  getStageNonFinishers,
  getStageResults,
} from '@cyclingstar/db'
import {
  BROADCAST,
  type BroadcastChunk,
  type BroadcastFinish,
  type BroadcastHead,
  JERSEY_PRIORITY,
  type LiveLine,
  NO_LEADERS,
  type PreStageInfo,
  type RaceS,
  type RiderIx,
  type StageClosing,
  type StagePreview,
  type StageReport,
  type StageTimeline,
  type StartState,
  chunkOf,
  chunkQuerySchema,
  finishBodySchema,
  fromDs,
  playbackEstimateS,
  stageQuerySchema,
  visibilityOf,
} from '@cyclingstar/shared'
import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  adaptedSourceOf,
  leadersThroughStage,
  serveCast,
  threeKmRuleRiders,
  timelineForStage,
} from '../broadcastSource.js'
import {
  type ChronicleEvent,
  type ChronicleNames,
  buildChronicle,
  chronicleNames,
} from '../chronicle.js'
import { badRequest, notFound } from '../http.js'
import { liveClusters } from '../liveClusters.js'
import { PLAYER_RATE_LIMIT } from '../security.js'
import { stageHead } from '../stageHistory.js'
import { type StageContext, stageContextOf, stageReplayOf } from '../stageReplay.js'
import type { RoutePlugin } from './context.js'
import { parseRaceId, parseStageDay } from './params.js'

/**
 * LAS RUTAS DE LA RETRANSMISIÓN (E2, docs/retransmision.md §14.2 a §14.4; D-06, D-50, D-51). Nacen en
 * el 3a: la cabecera (`GET …/broadcast`), el tramo con su voz (`GET …/broadcast/chunk`), el paquete de
 * meta (`POST …/broadcast/finish`, que en el 3a no escribe nada: `race_watch` llega en el 7a) y el acta
 * (`GET …/report`), con `?season=` y `?diag=1` aceptados (el modo diagnóstico actúa en el 7b).
 *
 * Las tres de `…/broadcast` responden 404 `broadcast_off` a quien `BROADCAST_WATCH` no alcanza; el acta
 * no depende de ese interruptor (§14.2). La puerta de una etapa velada y el tope de lo alcanzado (B18,
 * 409 `beyond_reached`) llegan con el horizonte (7a y 7b): hasta entonces `spoilerApplies()` es falso.
 * Cada respuesta se construye con `satisfies` de su tipo, atado a su esquema (§14.7).
 */

type StageParams = { readonly raceId: string; readonly day: string }

/** Lo que una ruta de etapa sabe tras admitir la petición. */
interface Admitted {
  readonly ctx: StageContext
  readonly h: Horizon
}

/** Los parámetros, la consulta y la etapa; responde y da null si algo no vale. */
async function admitStage(
  db: Parameters<RoutePlugin>[1]['db'],
  request: FastifyRequest<{ Params: StageParams }>,
  reply: FastifyReply,
  query: { readonly season?: number | undefined },
): Promise<Admitted | null> {
  const raceId = parseRaceId(request.params.raceId)
  const day = parseStageDay(request.params.day)
  if (!raceId || day === null) {
    notFound(reply)
    return null
  }
  const ctx = await stageContextOf(db, raceId, day, query.season)
  if (!ctx) {
    notFound(reply)
    return null
  }
  // ?diag=1 (D-40) se acepta y no cambia nada hasta el 7b: hasta el 7a todo horizonte es sin velo.
  return { ctx, h: await request.horizon() }
}

export const broadcastRoutes: RoutePlugin = async (app, routeCtx) => {
  const { db } = routeCtx

  /** La línea de la etapa, o la respuesta 404 que toca: sin correr, `no_encontrado`; corrida, `broadcast_unavailable`. */
  async function lineOf(a: Admitted, reply: FastifyReply): Promise<StageTimeline | null> {
    const tl = await timelineForStage(db, a.h, a.ctx.raceKey, a.ctx.day)
    if (tl !== null) return tl
    const run = (await getRunStageDays(db, a.ctx.raceKey)).includes(a.ctx.day)
    notFound(reply, run ? 'broadcast_unavailable' : 'no_encontrado')
    return null
  }

  /** Los corredores propios de quien mira, como RiderIx de la línea (R23.7). */
  async function ownOf(request: FastifyRequest, tl: StageTimeline): Promise<Set<RiderIx>> {
    const v = await request.viewer()
    if (v === null) return new Set()
    const ids = new Set(await getOwnRiderIds(db, v.userId))
    const out = new Set<RiderIx>()
    tl.riderIds.forEach((id, i) => {
      if (ids.has(id)) out.add(i)
    })
    return out
  }

  app.get<{ Params: StageParams }>(
    '/api/races/:raceId/stages/:day/broadcast',
    { config: { spoiler: 'watch', veil: { by: ['B', 'G'] } } },
    async (request, reply) => {
      const q = stageQuerySchema.safeParse(request.query)
      if (!q.success) return badRequest(reply)
      if (!(await request.broadcastOn())) return notFound(reply, 'broadcast_off')
      const a = await admitStage(db, request, reply, q.data)
      if (a === null) return reply
      const tl = await lineOf(a, reply)
      if (tl === null) return reply
      const { ctx } = a
      const identities = await getCastIdentities(
        db,
        tl.cast.riders.map((c) => c.riderId),
        tl.cast.teams.map((t) => t.teamId),
      )
      const cast = serveCast(
        tl.cast,
        a.h,
        {
          rider: (id) => identities.riders.get(id)?.name ?? id,
          team: (id) => identities.teams.get(id)?.name ?? id,
        },
        { own: await ownOf(request, tl) },
      )
      const startState = startStateOf(tl)
      // El nombre, la etiqueta y el tipo, como la ruta de etapa para una etapa corrida (stageHead).
      const raced = adaptedSourceOf(tl)?.racedProfile ?? null
      const head =
        raced === null
          ? ctx.spec
          : stageHead(ctx.day, ctx.spec, {
              profile: raced,
              timeTrial: tl.timeTrial,
              km: Math.round(tl.lengthKm),
            })
      const viewer = await request.viewer()
      return {
        stage: {
          raceKey: ctx.raceKey,
          raceId: ctx.race.id,
          day: ctx.day,
          name: head.name,
          km: head.km,
          kind: head.kind,
          timeTrial: tl.timeTrial,
          label: head.label,
        },
        profile: tl.profile,
        weather: tl.weather,
        cast,
        startState,
        pace: BROADCAST.pace,
        estimateS: playbackEstimateS(tl.profile, BROADCAST.pace),
        clock: tl.clock,
        source: tl.clock === 'estimated' ? 'radio' : 'timeline',
        preview: previewOf(tl, startState),
        // Lo visto llega en el 7a (race_watch): hasta entonces, quien tiene sesión no ha visto nada.
        view: viewer === null ? null : { reachedS: null, known: false },
        gate: null,
        tt: null,
        tplRev: 0,
      } satisfies BroadcastHead
    },
  )

  app.get<{ Params: StageParams }>(
    '/api/races/:raceId/stages/:day/broadcast/chunk',
    { config: { rateLimit: PLAYER_RATE_LIMIT, spoiler: 'watch', veil: { by: ['B'] } } },
    async (request, reply) => {
      const q = chunkQuerySchema.safeParse(request.query)
      if (!q.success) return badRequest(reply)
      if (!(await request.broadcastOn())) return notFound(reply, 'broadcast_off')
      const a = await admitStage(db, request, reply, q.data)
      if (a === null) return reply
      const tl = await lineOf(a, reply)
      if (tl === null) return reply
      // El recorte al borde de la meta (§10.11): lo de después no existe para un tramo.
      const { finishDs } = visibilityOf(tl)
      const toDs = Math.max(q.data.fromDs, Math.min(q.data.toDs, finishDs))
      const voice = await voiceOf(tl, a.ctx)
      const lines = voice(fromDs(q.data.fromDs), fromDs(toDs))
      // Un tramo no cambia nunca y solo se sirve dentro de lo permitido: el navegador lo guarda (§14.9).
      void reply.header('cache-control', `private, max-age=${BROADCAST.chunkCacheMaxAgeS}`)
      void reply.header('vary', 'Cookie')
      return { ...chunkOf(tl, q.data.fromDs, toDs), lines } satisfies BroadcastChunk
    },
  )

  app.post<{ Params: StageParams }>(
    '/api/races/:raceId/stages/:day/broadcast/finish',
    { config: { spoiler: 'watch', veil: { by: ['G'] } } },
    async (request, reply) => {
      const q = stageQuerySchema.safeParse(request.query)
      const body = finishBodySchema.safeParse(request.body)
      if (!q.success || !body.success) return badRequest(reply)
      if (!(await request.broadcastOn())) return notFound(reply, 'broadcast_off')
      const a = await admitStage(db, request, reply, q.data)
      if (a === null) return reply
      const tl = await lineOf(a, reply)
      if (tl === null) return reply
      const replay = await stageReplayOf(db, a.ctx)
      if (!replay.run) return notFound(reply)
      const ix = new Map(tl.riderIds.map((id, i) => [id, i] as const))
      const first = tl.finish.arrivals[0]?.[0] ?? 0
      return {
        arrivals: tl.finish.arrivals.map(([ds, riders]) => ({
          gapS: (ds - first) / 10,
          riders: [...riders],
        })),
        result: replay.results,
        closing: await closingOf(a.ctx, tl, replay, ix),
        report: { ...withoutRadio(replay), tplRev: 0 },
        news: await getStageNews(db, a.ctx.worldId, a.ctx.raceKey, a.ctx.day),
        threeKmRule: threeKmRuleRiders(tl, a.ctx.spec.label === 'Summit finish'),
      } satisfies BroadcastFinish
    },
  )

  app.get<{ Params: StageParams }>(
    '/api/races/:raceId/stages/:day/report',
    { config: { spoiler: 'watch', veil: { by: ['G'] } } },
    async (request, reply) => {
      const q = stageQuerySchema.safeParse(request.query)
      if (!q.success) return badRequest(reply)
      const a = await admitStage(db, request, reply, q.data)
      if (a === null) return reply
      const replay = await stageReplayOf(db, a.ctx)
      if (!replay.run) return notFound(reply)
      // tplRev: el de la línea grabada (6a); con el adaptador, o sin línea, 0 (12-c).
      return { ...replay, tplRev: 0 } satisfies StageReport
    },
  )

  /**
   * LA VOZ DEL TRAMO (§14.3), sin los papeles de grupo (`withGroupRoles`, 6b). Los pasos que no
   * dependen del tramo (los sucesos de antes de la meta con su hora, los racimos en vivo si
   * `BROADCAST.liveClusters` está encendida, y los nombres, que son los de la ruta de etapa) se hacen
   * una vez por línea; el paso 4, `buildChronicle` con `live` hasta el final del tramo, en cada uno, y
   * el tramo se queda con las líneas nuevas (B19).
   */
  const voices = new WeakMap<StageTimeline, Promise<(fromS: RaceS, toS: RaceS) => LiveLines>>()
  function voiceOf(
    tl: StageTimeline,
    ctx: StageContext,
  ): Promise<(fromS: RaceS, toS: RaceS) => LiveLines> {
    let v = voices.get(tl)
    if (v === undefined) {
      v = buildVoice(tl, ctx)
      voices.set(tl, v)
      void v.catch(() => voices.delete(tl))
    }
    return v
  }

  async function buildVoice(
    tl: StageTimeline,
    ctx: StageContext,
  ): Promise<(fromS: RaceS, toS: RaceS) => LiveLines> {
    const finishS = fromDs(visibilityOf(tl).finishDs)
    const source = adaptedSourceOf(tl)
    // 1. Los sucesos de antes de la meta, cada uno con su hora, en el orden de tl.events.
    const sucesos: ChronicleEvent[] = []
    const revealOf = new Map<ChronicleEvent, RaceS>()
    for (const e of tl.events) {
      if (e.revealS >= finishS) continue // el mismo borde que chunkOf: lo de la meta va en el paquete de meta
      const ev: ChronicleEvent = source?.stored[e.source] ?? {
        km: e.km,
        tS: e.tS,
        tipo: 'caida',
        plantilla: e.plantilla,
        protagonistas: e.riders.map((r) => tl.riderIds[r] ?? ''),
        ...(e.datos === null ? {} : { datos: { ...e.datos } }),
      }
      sucesos.push(ev)
      revealOf.set(ev, e.revealS)
    }
    // 3. Los racimos en vivo (§12.3), solo con BROADCAST.liveClusters: entran con su hora y sus sueltos salen.
    let entrada: readonly ChronicleEvent[] = sucesos
    if (BROADCAST.liveClusters && source !== null) {
      const racimos = liveClusters(sucesos, source.view, (ev) => revealOf.get(ev) ?? finishS)
      const absorbidos = new Set(racimos.flatMap((c) => c.members))
      const enVivo = racimos.filter((c) => c.revealS < finishS)
      for (const c of enVivo) revealOf.set(c.event, c.revealS)
      entrada = [...sucesos.filter((ev) => !absorbidos.has(ev)), ...enVivo.map((c) => c.event)]
    }
    const names = await namesOf(tl, ctx)
    // 4. La voz hasta el final del tramo; el tramo, con las líneas nuevas.
    return (fromS, toS) =>
      buildChronicle(entrada, names, {
        byClock: tl.timeTrial,
        live: { untilS: toS, stageKm: tl.lengthKm, revealS: (ev) => revealOf.get(ev) ?? toS },
      }).filter((l) => l.revealS > fromS)
  }

  /** Los nombres de la voz, como los de la ruta de etapa: la lista de salida y el resultado, con los maillots de tras la N − 1. */
  async function namesOf(tl: StageTimeline, ctx: StageContext): Promise<ChronicleNames> {
    const results = [
      ...(await getStageResults(db, ctx.raceKey, ctx.day)),
      ...(await getStageNonFinishers(db, ctx.raceKey, ctx.day, tl.riderIds)),
    ]
    const identities = await getRaceRiderIdentities(db, ctx.raceKey)
    const onRoad =
      ctx.race.stages.length === 1
        ? NO_LEADERS
        : await leadersThroughStage(db, ctx.raceKey, ctx.day - 1)
    return chronicleNames([...identities, ...results], onRoad)
  }

  /** El cierre (D-22, I-22): podio, general, maillots de mañana, fuera de carrera y la etapa siguiente. */
  async function closingOf(
    ctx: StageContext,
    tl: StageTimeline,
    replay: Extract<Awaited<ReturnType<typeof stageReplayOf>>, { run: true }>,
    ix: ReadonlyMap<string, RiderIx>,
  ): Promise<StageClosing> {
    const riderOf = (id: string | null): RiderIx | null =>
      id === null ? null : (ix.get(id) ?? null)
    const podium = replay.results
      .filter((r) => !r.dnf && r.puesto >= 1 && r.puesto <= 3)
      .sort((x, y) => x.puesto - y.puesto)
      .flatMap((r) => {
        const rider = riderOf(r.riderId)
        return rider === null ? [] : [rider]
      })
    const ranked = replay.gc.filter((r) => !r.dnf)
    const leaderS = ranked[0]?.tiempoTotalS ?? 0
    const gcAfter = ranked.slice(0, BROADCAST.closingResultTop).flatMap((r, i) => {
      const rider = riderOf(r.riderId)
      if (rider === null) return []
      const startRank = tl.cast.riders[rider]?.start.gcRank ?? null
      return [
        {
          rider,
          rank: i + 1,
          gapS: r.tiempoTotalS - leaderS,
          move: startRank === null ? 0 : startRank - (i + 1),
        },
      ]
    })
    const { onRoad, afterStage } = replay.leaders
    const jerseysTomorrow = JERSEY_PRIORITY.flatMap((jersey) => {
      const rider = riderOf(afterStage[jersey])
      return rider === null
        ? []
        : [{ jersey, rider, changed: afterStage[jersey] !== onRoad[jersey] }]
    })
    const outOfRace = replay.results.flatMap((r) => {
      const rider = r.dnf ? riderOf(r.riderId) : null
      return rider === null
        ? []
        : [
            {
              rider,
              reason: r.reason === 'fuera_control' ? ('time_cut' as const) : ('abandon' as const),
            },
          ]
    })
    return {
      podium,
      gcAfter,
      jerseysTomorrow,
      // el mayor kmEnFuga no se guarda hasta la línea grabada (DD-14): el adaptador no lo sabe
      mostKmOutFront: null,
      outOfRace,
      tomorrow: await tomorrowOf(ctx),
    }
  }

  /** La etapa siguiente de la carrera, lo único que un aviso sabe de ella (D-42); null tras la última. */
  async function tomorrowOf(ctx: StageContext): Promise<PreStageInfo | null> {
    if (ctx.day >= ctx.race.stages.length) return null
    const next = await stageContextOf(db, ctx.race.id, ctx.day + 1, ctx.season)
    if (next === null) return null
    return {
      raceName: ctx.race.name,
      season: ctx.season,
      stageDay: next.day,
      stageCount: ctx.race.stages.length,
      km: next.km,
      label: next.spec.label,
      stageKind: next.spec.kind,
    }
  }
}

/** La voz de un tramo: sus líneas nuevas. */
type LiveLines = readonly LiveLine[]

/** El acta sin la radio (decisión 14-b): el paquete de meta no la lleva. */
function withoutRadio<T extends object>(replay: T): Omit<T, 'radio'> {
  const out: T & { radio?: unknown } = { ...replay }
  delete out.radio
  return out
}

/** La salida (§4.11): quién lleva cada maillot, los diez primeros de la general de salida y cuántos salen. */
function startStateOf(tl: StageTimeline): StartState {
  const leaders: { gc: RiderIx | null; points: RiderIx | null; kom: RiderIx | null } = {
    gc: null,
    points: null,
    kom: null,
  }
  for (const c of tl.cast.riders) if (c.worn.kind === 'leader') leaders[c.worn.jersey] = c.rider
  const gcTop = tl.cast.riders
    .flatMap((c) =>
      c.start.gcRank !== null && c.start.gcRank <= BROADCAST.virtualGcTop
        ? [{ rider: c.rider, rank: c.start.gcRank, gapS: c.start.gcDeficitS ?? 0 }]
        : [],
    )
    .sort((x, y) => x.rank - y.rank || x.rider - y.rider)
  return { leaders, gcTop, racingAtStart: tl.riderIds.length }
}

/**
 * La previa (D-22, §8.6): el recorrido, el tiempo, los maillots en juego con quién los amenaza y los
 * favoritos. Con el reparto provisional del adaptador, la amenaza solo se sabe de la general (los
 * siguientes de la general de salida) y los favoritos son los tres primeros de esa general: los de
 * atributo los graba el reparto congelado (8-g).
 */
function previewOf(tl: StageTimeline, start: StartState): StagePreview {
  const jerseysInPlay = JERSEY_PRIORITY.flatMap((jersey) => {
    const holder = start.leaders[jersey]
    if (holder === null) return []
    const threats =
      jersey === 'gc'
        ? start.gcTop
            .filter((r) => r.rider !== holder)
            .slice(0, BROADCAST.previewThreatsMax)
            .map((r) => r.rider)
        : []
    return [{ jersey, holder, threats }]
  })
  return {
    route: tl.profile,
    weather: tl.weather,
    jerseysInPlay,
    favourites: [
      ...start.gcTop
        .slice(0, BROADCAST.previewGcTop)
        .map((r) => ({ rider: r.rider, why: 'gc' as const })),
      ...tl.cast.favourites,
    ],
  }
}
