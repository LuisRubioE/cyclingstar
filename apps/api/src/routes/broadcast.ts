import {
  type Horizon,
  type Viewer,
  type WatchKey,
  type WatchRow,
  getCastIdentities,
  getOwnRiderIds,
  getRaceRiderIdentities,
  getRunStageDays,
  getStageNews,
  getStageNonFinishers,
  getStageResults,
  readStageTemplateRev,
  readWatch,
  recordProgress,
  stageGateOf,
  veilCast,
  worldHorizon,
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
  type ProfileStrip,
  type RaceS,
  type RiderIx,
  type StageClosing,
  type StagePreview,
  type StageReport,
  type StageTimeline,
  type StartState,
  type WatchMode,
  chunkOf,
  chunkQuerySchema,
  finishBodySchema,
  fromDs,
  playbackEstimateS,
  stageQuerySchema,
  startStateOf,
  ttPlaybackEstimateS,
  visibilityOf,
} from '@cyclingstar/shared'
import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  leadersThroughStage,
  lineSourceOf,
  serveCast,
  threeKmRuleRiders,
  timelineForStage,
  withClimbFeet,
} from '../broadcastSource.js'
import { type ChronicleNames, buildChronicle, chronicleNames } from '../chronicle.js'
import { badRequest, notFound, sendError, sendGate } from '../http.js'
import { PLAYER_RATE_LIMIT } from '../security.js'
import { stageHead } from '../stageHistory.js'
import { type StageContext, preStageInfoOf, stageContextOf, stageReplayOf } from '../stageReplay.js'
import { lineVoiceOf, storedWithRoles } from '../voiceRoles.js'
import type { RoutePlugin } from './context.js'
import { parseRaceId, parseStageDay } from './params.js'

/**
 * LAS RUTAS DE LA RETRANSMISIÓN (E2, docs/retransmision.md §14.2 a §14.4; D-06, D-50, D-51). Nacen en
 * el 3a: la cabecera (`GET …/broadcast`), el tramo con su voz (`GET …/broadcast/chunk`), el paquete de
 * meta (`POST …/broadcast/finish`, que desde el 7a escribe la letra de lo visto) y el acta
 * (`GET …/report`), con `?season=` y `?diag=1` aceptados (el modo diagnóstico actúa en el 7b).
 *
 * Las tres de `…/broadcast` responden 404 `broadcast_off` a quien `BROADCAST_WATCH` no alcanza; el acta
 * no depende de ese interruptor (§14.2). El horizonte existe desde el 7a (`SPOILER_MODE`), y con él la
 * cabecera dice lo visto (`view`) y la meta lo escribe. El 7b pone la puerta (D-37, §10.11, §14.2): la
 * cabecera la lleva si es `previous_unseen` y su reparto sale degradado por el velo (`veilCast`, §10.10);
 * el tramo y la meta dan 403 `previous_unseen`, y el acta, 403 `not_seen` o `previous_unseen`, todos con
 * `sendGate`. Y el tope de lo alcanzado de los tramos (B18, 409 `beyond_reached`, 17-m). Con `?diag=1`, un
 * administrador con sesión recibe las cuatro con el horizonte del mundo, sin puerta ni tope, y la meta no
 * escribe (D-40, §11.15). Cada respuesta se construye con `satisfies` de su tipo, atado a su esquema
 * (§14.7).
 *
 * Desde el 6a sirven la línea grabada de las etapas que la tienen (`timelineForStage`, §14.4), con el
 * reloj exacto, la revisión de plantillas de su fila (`tplRev`, 12-c) en la cabecera, el acta y la
 * meta, y la preparación pública de la crono en la cabecera (`tt`); una lápida es 404
 * `broadcast_unavailable` (D-12), y una etapa sin fila sigue con el adaptador.
 */

type StageParams = { readonly raceId: string; readonly day: string }

/** Lo que una ruta de etapa sabe tras admitir la petición. */
interface Admitted {
  readonly ctx: StageContext
  /** el de quien mira; con el modo diagnóstico, el del mundo (D-40) */
  readonly h: Horizon
  /** `?diag=1` de un administrador con sesión (§11.15): sin velo, sin puerta, sin tope y sin escribir */
  readonly diag: boolean
}

/** Los parámetros, la consulta y la etapa; responde y da null si algo no vale. */
async function admitStage(
  db: Parameters<RoutePlugin>[1]['db'],
  request: FastifyRequest<{ Params: StageParams }>,
  reply: FastifyReply,
  query: { readonly season?: number | undefined; readonly diag?: '1' | undefined },
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
  // El horizonte resuelve siempre al espectador; `?diag=1` de quien no es administrador se ignora y la
  // respuesta es la misma, byte a byte, que sin él (11-h).
  const h = await request.horizon()
  const diag = query.diag === '1' && (await request.diagAllowed())
  return { ctx, h: diag ? worldHorizon : h, diag }
}

/** La letra de la etapa en la fila de lo visto, o '' si no la tiene. */
function letterOf(row: WatchRow | null, day: number): string {
  return row !== null && day <= row.knownThrough ? row.how.charAt(day - 1) : ''
}

/** Conocida: vista, revelada o arrastrada (W, S, R o A); la X no, caducada no es conocida (10-e). */
function knownIn(row: WatchRow | null, day: number): boolean {
  const letter = letterOf(row, day)
  return letter === 'W' || letter === 'S' || letter === 'R' || letter === 'A'
}

/**
 * EL TOPE DE LO SERVIDO (§10.11, B18): lo alcanzado, en décimas hacia abajo, más `prefetchRaceS`. Es la
 * cuenta del reproductor (`floorDs` y `PREFETCH_DS`, `apps/web/src/domain/broadcast/player.ts`), con el
 * mismo margen de coma flotante, para que lo que pide la web no pase nunca de lo que admite el servidor.
 */
export function servableUpToDs(reachedS: RaceS): number {
  return Math.floor(reachedS * 10 + 1e-6) + BROADCAST.prefetchRaceS * 10
}

export const broadcastRoutes: RoutePlugin = async (app, routeCtx) => {
  const { db } = routeCtx

  /** La línea de la etapa, o la respuesta 404 que toca: sin correr, `no_encontrado`; corrida, `broadcast_unavailable`. */
  async function lineOf(a: Admitted, reply: FastifyReply): Promise<StageTimeline | null> {
    const tl = await timelineForStage(db, a.h, a.ctx.raceKey, a.ctx.day)
    if (tl !== null) return tl
    const run = (await getRunStageDays(db, a.h, a.ctx.raceKey)).includes(a.ctx.day)
    notFound(reply, run ? 'broadcast_unavailable' : 'no_encontrado')
    return null
  }

  /**
   * Lo visto de la etapa para la cabecera (§4.11; 7a): si ya es conocida (W, S, R o A; la X no, 10-e) y
   * lo alcanzado, el mayor de lo escrito en race_watch y lo último informado a este proceso, para
   * reanudar (8-l). null para el visitante y para quien lee con cs_viewer, que no escribe progreso.
   */
  async function viewOf(viewer: Viewer, ctx: StageContext): Promise<BroadcastHead['view']> {
    if (viewer === null || viewer.readOnly) return null
    const key = { userId: viewer.userId, worldId: ctx.worldId, raceKey: ctx.raceKey }
    const row = await readWatch(db, key)
    const known = knownIn(row, ctx.day)
    if (known) return { reachedS: null, known }
    return { reachedS: reachedOf(key, ctx.day, row), known }
  }

  /**
   * LO ALCANZADO de una etapa no conocida (§10.11): el mayor de `race_watch.reached_s`, si la etapa a
   * medias es esta, y de lo último informado a este proceso (`ProgressMemory`, aunque no esté escrito);
   * null si no hay ninguno.
   */
  function reachedOf(key: WatchKey, day: number, row: WatchRow | null): number | null {
    const stored = row !== null && row.watchingStage === day ? row.reachedS : null
    const remembered = routeCtx.progress.reachedOf(key, day)
    if (stored === null) return remembered
    return remembered === null ? stored : Math.max(stored, remembered)
  }

  /**
   * ¿PASA EL TRAMO DEL TOPE? (§10.11, B18, decisión 17-m). El tope vale para un espectador con sesión,
   * con `SPOILER_MODE` aplicado (se revierte con `SPOILER_MODE=off`, §17.18) y la etapa no conocida: lo
   * servido no pasa de lo alcanzado más `prefetchRaceS`. El visitante y quien lee con `cs_viewer` no
   * tienen tope, porque el servidor no guarda su progreso (D-28), ni el modo diagnóstico (D-40). Primero
   * se mira la memoria del proceso, que cubre el caso de siempre sin leer la base (el reproductor informa
   * antes de pedir más allá, 8-d); solo si el tramo pasa de lo que ella dice se lee la fila, que también
   * dice si la etapa ya es conocida (sin tope: ya sabe cómo acaba).
   */
  async function beyondReached(
    request: FastifyRequest,
    a: Admitted,
    toDs: number,
  ): Promise<boolean> {
    if (a.diag || !(await request.spoilerApplies())) return false
    const viewer = await request.viewer()
    if (viewer === null || viewer.readOnly) return false
    const key = { userId: viewer.userId, worldId: a.ctx.worldId, raceKey: a.ctx.raceKey }
    if (toDs <= servableUpToDs(routeCtx.progress.reachedOf(key, a.ctx.day) ?? 0)) return false
    const row = await readWatch(db, key)
    if (knownIn(row, a.ctx.day)) return false
    return toDs > servableUpToDs(reachedOf(key, a.ctx.day, row) ?? 0)
  }

  /**
   * LA META ESCRIBE LA LETRA (§10.3, 14-f; 7a): con sesión, `recordProgress` hasta `finishS` con el modo
   * con que se llegó, y la memoria de lo alcanzado de esa carrera sobra. Nunca rompe el prefijo: con una
   * anterior en el velo la ruta ya respondió 403 `previous_unseen` (7b), porque `recordProgress` solo se
   * llama sin esa puerta (§10.3). En el modo diagnóstico no escribe nada (D-40, §11.15).
   */
  async function finishWatch(
    request: FastifyRequest,
    a: Admitted,
    finishS: RaceS,
    mode: WatchMode,
  ): Promise<void> {
    if (a.diag) return
    const viewer = await request.viewer()
    if (viewer === null || viewer.readOnly) return
    const key = { userId: viewer.userId, worldId: a.ctx.worldId, raceKey: a.ctx.raceKey }
    await recordProgress(db, key, a.ctx.day, finishS, mode, finishS)
    routeCtx.progress.forget(key)
  }

  /**
   * La revisión de plantillas con que se redactan la voz y el acta (12-c): la de la fila de la línea
   * grabada, de la misma entrada del LRU (§5.6); con el adaptador, 0.
   */
  async function tplRevOf(tl: StageTimeline, a: Admitted): Promise<number> {
    return tl.clock === 'exact' ? readStageTemplateRev(db, a.h, a.ctx.raceKey, a.ctx.day) : 0
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
      // La puerta de la cabecera es solo `previous_unseen` (D-37, 10-j): ver la N sin conocer la N − 1
      // destripa la N − 1. Se sirve igual, con el reparto degradado, y la pantalla pinta la puerta.
      const gate = stageGateOf(a.h, ctx.raceKey, ctx.day)
      const identities = await getCastIdentities(
        db,
        tl.cast.riders.map((c) => c.riderId),
        tl.cast.teams.map((t) => t.teamId),
      )
      // El reparto, las cartas y la salida, degradados por el velo de quien mira (§10.10; B13).
      const cast = serveCast(
        tl.cast,
        a.h,
        {
          rider: (id) => identities.riders.get(id)?.name ?? id,
          team: (id) => identities.teams.get(id)?.name ?? id,
        },
        { own: await ownOf(request, tl), dayCategory: ctx.race.championshipCategory ?? 'elite' },
      )
      const startState = startStateOf(veilCast(tl.cast, a.h), tl.riderIds.length)
      // El nombre, la etiqueta y el tipo, como la ruta de etapa para una etapa corrida (stageHead).
      const raced = (await lineSourceOf(db, tl, ctx.raceKey, ctx.day)).racedProfile
      // Las cimas que el grabador dejó sin pie, con el de su recorrido (nota 5 del 3c, 6b).
      const profile = withClimbFeet(tl.profile, raced)
      const head =
        raced === null
          ? ctx.spec
          : stageHead(ctx.day, ctx.spec, {
              profile: raced,
              timeTrial: tl.timeTrial,
              km: Math.round(tl.lengthKm),
            })
      const view = await viewOf(await request.viewer(), ctx)
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
          // Los de la línea, sin redondear, para que la web rehaga la suya con los tramos (3c):
          // espaciales, del recorrido.
          lengthKm: tl.lengthKm,
          dx: tl.dx,
          blocks: tl.blocks,
        },
        profile,
        weather: tl.weather,
        cast,
        startState,
        pace: BROADCAST.pace,
        // La duración que se anuncia (§8.2; en una crono, §9.4 y 9-h): solo el recorrido y el plan público.
        estimateS:
          tl.tt === null
            ? playbackEstimateS(tl.profile, BROADCAST.pace)
            : ttPlaybackEstimateS(tl.profile, {
                riders: tl.riderIds.length,
                intervalS: tl.tt.intervalS,
              }),
        clock: tl.clock,
        source: tl.clock === 'estimated' ? 'radio' : 'timeline',
        preview: previewOf(tl, profile, startState),
        // Lo visto (7a): de race_watch y de la memoria del proceso; null para el visitante.
        view,
        gate: gate?.k === 'previous_unseen' ? gate : null,
        // la preparación pública de la crono (9-i), sin un solo reloj; null en línea y con el adaptador
        tt:
          tl.tt === null
            ? null
            : { order: tl.tt.order, intervalS: tl.tt.intervalS, checksKm: [...tl.tt.checksKm] },
        tplRev: await tplRevOf(tl, a),
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
      // LA ADMISIÓN (§10.11, `admitirTramo`): la puerta, el recorte al borde de la meta (lo de después
      // no existe para un tramo) y el tope de lo alcanzado (B18).
      const gate = stageGateOf(a.h, a.ctx.raceKey, a.ctx.day)
      if (gate?.k === 'previous_unseen') return sendGate(reply, gate)
      const { finishDs } = visibilityOf(tl)
      const toDs = Math.max(q.data.fromDs, Math.min(q.data.toDs, finishDs))
      if (await beyondReached(request, a, toDs)) return sendError(reply, 409, 'beyond_reached')
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
      // Con una anterior en el velo, la puerta y nada escrito (§10.3, §14.2): la meta es de la N, que
      // se ve sabiendo cómo acabó la N − 1.
      const gate = stageGateOf(a.h, a.ctx.raceKey, a.ctx.day)
      if (gate?.k === 'previous_unseen') return sendGate(reply, gate)
      // el acta con las palabras de papel: esta ruta ya exige Watch encendido (§12.6); sin la radio,
      // que el paquete de meta no lleva (14-b)
      const replay = await stageReplayOf(db, a.ctx, {
        annotate: (stored) => storedWithRoles(tl, stored),
        radio: false,
      })
      if (!replay.run) return notFound(reply)
      await finishWatch(request, a, fromDs(visibilityOf(tl).finishDs), body.data.mode)
      const ix = new Map(tl.riderIds.map((id, i) => [id, i] as const))
      const first = tl.finish.arrivals[0]?.[0] ?? 0
      return {
        arrivals: tl.finish.arrivals.map(([ds, riders]) => ({
          gapS: (ds - first) / 10,
          riders: [...riders],
        })),
        result: replay.results,
        closing: await closingOf(a.ctx, tl, replay, ix),
        report: { ...withoutRadio(replay), tplRev: await tplRevOf(tl, a) },
        // La meta se sirve tras su puerta y con ella la etapa pasa a conocida: sus noticias, enteras.
        news: await getStageNews(db, worldHorizon, a.ctx.worldId, a.ctx.raceKey, a.ctx.day),
        // las caídas de la línea grabada (sus `mishap` de estado); el tipo de final, por la etiqueta
        // (en alto, sin la regla), que es lo que la API sabe del `bunchFinish` del motor (6-o)
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
      // LA PUERTA DEL ACTA (§14.2, D-37; 7b): la etapa que no se conoce da 403 `not_seen`, y la que tiene
      // una anterior velada, `previous_unseen`. Una etapa sin correr sigue siendo un 404: no está en
      // ningún velo, y su puerta solo podría ser la de la anterior.
      const gate = stageGateOf(a.h, a.ctx.raceKey, a.ctx.day)
      if (gate !== null) {
        if (
          gate.k === 'not_seen' ||
          (await getRunStageDays(db, a.h, a.ctx.raceKey)).includes(a.ctx.day)
        )
          return sendGate(reply, gate)
        return notFound(reply)
      }
      // Las palabras de papel de la voz (`the chase group`), solo para quien tiene Watch encendido
      // (§12.6, §14.5): para los demás, el acta de hoy, que dice `the bunch`. Sin línea servible,
      // tampoco (las etapas sin línea ni radio dicen `the bunch`, como hoy).
      const tl = (await request.broadcastOn())
        ? await timelineForStage(db, a.h, a.ctx.raceKey, a.ctx.day)
        : null
      // la radio desde la línea nombra a los corredores propios de quien pide (11a, R23.7)
      const radio = { h: a.h, userId: (await request.viewer())?.userId ?? null }
      const replay = await stageReplayOf(
        db,
        a.ctx,
        tl === null ? { radio } : { annotate: (stored) => storedWithRoles(tl, stored), radio },
      )
      if (!replay.run) return notFound(reply)
      // tplRev: el de la fila de la línea grabada (6a), sin construir el adaptador; sin fila o con
      // lápida, 0 (12-c, §5.6).
      const tplRev = await readStageTemplateRev(db, a.h, a.ctx.raceKey, a.ctx.day)
      return { ...replay, tplRev } satisfies StageReport
    },
  )

  /**
   * LA VOZ DEL TRAMO (§14.3). Los pasos que no dependen del tramo (los sucesos de antes de la meta con
   * su hora, los papeles de grupo de `withGroupRoles` ANTES de atar las horas, 12-n, los racimos en
   * vivo si `BROADCAST.liveClusters` está encendida, con la política de nombres real, y los nombres, que
   * son los de la ruta de etapa) se hacen una vez por línea (`lineVoiceOf`); el paso 4, `buildChronicle`
   * con `live` hasta el final del tramo, en cada uno, y el tramo se queda con las líneas nuevas (B19).
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
    const source = await lineSourceOf(db, tl, ctx.raceKey, ctx.day)
    const { entrada, revealOf } = lineVoiceOf(
      tl,
      source.stored,
      source.view,
      BROADCAST.liveClusters ? 'named' : 'off',
    )
    const names = await namesOf(tl, ctx)
    // 4. La voz hasta el final del tramo; el tramo, con las líneas nuevas.
    return (fromS, toS) =>
      chunkLinesOf(
        buildChronicle(entrada, names, {
          byClock: tl.timeTrial,
          live: { untilS: toS, stageKm: tl.lengthKm, revealS: (ev) => revealOf.get(ev) ?? toS },
        }),
        fromS,
      )
  }

  /**
   * Los nombres de la voz, como los de la ruta de etapa: la lista de salida y el resultado, con los
   * maillots de tras la N − 1. Con `worldHorizon` (E2, §10.6): de la hoja solo se toma la identidad de
   * cada corredor, no su puesto, y la voz se corta por lo alcanzado (B, §10.11).
   */
  async function namesOf(tl: StageTimeline, ctx: StageContext): Promise<ChronicleNames> {
    const results = [
      ...(await getStageResults(db, worldHorizon, ctx.raceKey, ctx.day)),
      ...(await getStageNonFinishers(db, worldHorizon, ctx.raceKey, ctx.day, tl.riderIds)),
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
      // el mayor kmEnFuga (DD-14) tampoco va en la línea grabada: lo guarda el parte de cada corredor
      // (`rider_daily_log.parte`); lo lee el cierre del 10a
      mostKmOutFront: null,
      outOfRace,
      tomorrow: await tomorrowOf(ctx),
    }
  }

  /** La etapa siguiente de la carrera, lo único que un aviso sabe de ella (D-42); null tras la última. */
  async function tomorrowOf(ctx: StageContext): Promise<PreStageInfo | null> {
    if (ctx.day >= ctx.race.stages.length) return null
    const next = await stageContextOf(db, ctx.race.id, ctx.day + 1, ctx.season)
    return next === null ? null : preStageInfoOf(next)
  }
}

/** La voz de un tramo: sus líneas nuevas. */
type LiveLines = readonly LiveLine[]

/**
 * La voz de un tramo: de la voz hasta su final, las líneas que se ven después de su `fromS`; en el
 * primero, también las de la salida (`revealS` 0), con el mismo borde que `chunkOf` (3c). Así los
 * tramos, uno tras otro, son la voz entera hasta la meta, y ninguna línea viaja dos veces (B19).
 */
export function chunkLinesOf(voice: LiveLines, fromS: RaceS): LiveLines {
  return voice.filter((l) => (fromS === 0 ? l.revealS >= 0 : l.revealS > fromS))
}

/** El acta sin la radio (decisión 14-b): el paquete de meta no la lleva. */
function withoutRadio<T extends object>(replay: T): Omit<T, 'radio'> {
  const out: T & { radio?: unknown } = { ...replay }
  delete out.radio
  return out
}

/**
 * La previa (D-22, §8.6): el recorrido, el tiempo, los maillots en juego con quién los amenaza y los
 * favoritos. Con el reparto provisional del adaptador, la amenaza solo se sabe de la general (los
 * siguientes de la general de salida) y los favoritos son los tres primeros de esa general: los de
 * atributo los graba el reparto congelado (8-g).
 */
function previewOf(tl: StageTimeline, route: ProfileStrip, start: StartState): StagePreview {
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
    route,
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
