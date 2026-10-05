import {
  type WatchKey,
  type WorldRef,
  getRunStageDays,
  horizonSummary,
  lastRunStages,
  raceExpired,
  readSpoilerPrefs,
  revealStage,
  setFollow,
  setSpoilerScope,
  stageGateOf,
} from '@cyclingstar/db'
import {
  type HorizonSummary,
  followBodySchema,
  fromDs,
  instantAt,
  photoBlocksOf,
  revealBodySchema,
  type revResponseSchema,
  spoilerScopeBodySchema,
  visibilityOf,
  watchProgressBodySchema,
  type watchResponseSchema,
} from '@cyclingstar/shared'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { z } from 'zod'
import { timelineForStage } from '../broadcastSource.js'
import { badRequest, notFound, sendGate, unauthorized } from '../http.js'
import { PLAYER_RATE_LIMIT } from '../security.js'
import type { RoutePlugin } from './context.js'
import { parseRaceKey, parseStageDay } from './params.js'

/**
 * LO VISTO POR LA RED (E2, docs/retransmision.md §10.3, §10.5, §14.2 y §14.7; D-28 a D-31, D-51, D-55;
 * paso 7a). Las cinco rutas de `/api/me`:
 *
 * - `POST /api/me/watch/:raceKey/:day`: lo alcanzado, `{ reachedS, mode }`, en JSON o, de respaldo para
 *   `sendBeacon`, el mismo JSON en `text/plain` (14-g). Pasa por la memoria del proceso (D-55, 10-l),
 *   que decide si escribe; nunca rompe el prefijo: con una etapa anterior en el velo, 403
 *   `previous_unseen` y nada escrito. Lleva su propio límite de peticiones (14-q).
 * - `POST /api/me/reveal/:raceKey/:day`: conocer la etapa sin verla (`R`, y `A` en los huecos); con la
 *   carrera caducada, el acuse del aviso, `X` en todas las que faltan (10-f).
 * - `PUT /api/me/follow/:raceKey` y `PUT /api/me/spoiler-scope`: la guardia (D-30).
 * - `GET /api/me/horizon`: lo que el espectador tiene por ver (`HorizonSummary`); con `cs_viewer` y sin
 *   sesión, solo `rev` y `scope` (14-i); sin nada, 401.
 *
 * Las escrituras piden sesión (una `cs_viewer` sola da 401, D-34) y escriben igual con `SPOILER_MODE`
 * apagado: lo visto tiene que estar ahí cuando el modo se encienda (§14.6). Devuelven el `rev` de
 * después de escribir (§14.2): `${currentDay}.${horizon_rev}` si el modo vale para quien pide, y
 * `'world'` si no, para que la web cambie sus claves de una vez (§10.9).
 */

type WatchResponse = z.infer<typeof watchResponseSchema>
type RevResponse = z.infer<typeof revResponseSchema>
type StageParams = { readonly raceKey: string; readonly day: string }

const FOLLOW_OF = { follow: 1, drop: -1, default: 0 } as const

export const meRoutes: RoutePlugin = async (app, routeCtx) => {
  const { db, progress } = routeCtx

  /** El usuario de la SESIÓN, o 401: la cookie que solo restringe no escribe (D-34). */
  async function sessionUser(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
    const v = await request.viewer()
    if (v === null || v.readOnly) {
      unauthorized(reply)
      return null
    }
    return v.userId
  }

  /** El rev de después de escribir (§14.2): el de la escritura si subió; si no, el del horizonte de la petición. */
  async function revAfter(
    request: FastifyRequest,
    world: WorldRef,
    horizonRev: number | null,
  ): Promise<string> {
    if (!(await request.spoilerApplies())) return 'world'
    return horizonRev === null ? (await request.horizon()).rev : `${world.currentDay}.${horizonRev}`
  }

  /** La carrera y la etapa de la URL, contra el calendario; null y 404 si no valen. */
  function stageOf(
    request: FastifyRequest<{ Params: StageParams }>,
    reply: FastifyReply,
  ): { readonly raceKey: string; readonly day: number } | null {
    const race = parseRaceKey(request.params.raceKey)
    const day = parseStageDay(request.params.day)
    if (race === null || day === null) {
      notFound(reply)
      return null
    }
    return { raceKey: `${race.raceId}:s${race.season}`, day }
  }

  app.post<{ Params: StageParams }>(
    '/api/me/watch/:raceKey/:day',
    { config: { rateLimit: PLAYER_RATE_LIMIT, spoiler: 'watch', veil: { by: ['B'] } } },
    async (request, reply) => {
      const userId = await sessionUser(request, reply)
      if (userId === null) return reply
      const stage = stageOf(request, reply)
      if (stage === null) return reply
      // El respaldo de sendBeacon (14-g): con text/plain, fastify entrega el cuerpo como cadena.
      let raw: unknown = request.body
      if (typeof raw === 'string') {
        try {
          raw = JSON.parse(raw)
        } catch {
          return badRequest(reply)
        }
      }
      const body = watchProgressBodySchema.safeParse(raw)
      if (!body.success) return badRequest(reply)
      const world = await request.world()
      if (world === null) return notFound(reply)
      // Nunca se rompe el prefijo (§10.3): con una anterior en el velo, la puerta y nada escrito.
      const h = await request.horizon()
      const gate = stageGateOf(h, stage.raceKey, stage.day)
      if (gate?.k === 'previous_unseen') return sendGate(reply, gate)
      // La meta de la etapa es la de su línea: sin línea no hay retransmisión que informar.
      const tl = await timelineForStage(db, h, stage.raceKey, stage.day)
      if (tl === null) {
        const run = (await getRunStageDays(db, stage.raceKey)).includes(stage.day)
        return notFound(reply, run ? 'broadcast_unavailable' : 'no_encontrado')
      }
      const finishS = fromDs(visibilityOf(tl).finishDs)
      const key: WatchKey = { userId, worldId: world.worldId, raceKey: stage.raceKey }
      const r = await progress.report(
        db,
        key,
        stage.day,
        body.data.reachedS,
        body.data.mode,
        finishS,
        Date.now(),
      )
      return {
        status: r.status,
        rev: await revAfter(request, world, r.horizonRev),
      } satisfies WatchResponse
    },
  )

  app.post<{ Params: StageParams }>(
    '/api/me/reveal/:raceKey/:day',
    { config: { spoiler: 'watch', veil: { by: ['G'] } } },
    async (request, reply) => {
      const userId = await sessionUser(request, reply)
      if (userId === null) return reply
      const stage = stageOf(request, reply)
      if (stage === null) return reply
      if (!revealBodySchema.safeParse(request.body ?? {}).success) return badRequest(reply)
      const world = await request.world()
      if (world === null) return notFound(reply)
      if (!(await getRunStageDays(db, stage.raceKey)).includes(stage.day)) return notFound(reply)
      // Con la carrera caducada, el acuse del aviso (10-f): X en todas las que faltan.
      const lastRun = (await lastRunStages(db, world)).get(stage.raceKey) ?? stage.day
      const expired = raceExpired(stage.raceKey, lastRun, world.currentDay)
      const key: WatchKey = { userId, worldId: world.worldId, raceKey: stage.raceKey }
      const r = await revealStage(db, key, stage.day, expired)
      // Lo que se recordaba de lo alcanzado puede ser de una etapa que ahora es conocida.
      progress.forget(key)
      return { rev: await revAfter(request, world, r.horizonRev) } satisfies RevResponse
    },
  )

  app.put<{ Params: { readonly raceKey: string } }>(
    '/api/me/follow/:raceKey',
    { config: { spoiler: 'safe' } },
    async (request, reply) => {
      const userId = await sessionUser(request, reply)
      if (userId === null) return reply
      const race = parseRaceKey(request.params.raceKey)
      if (race === null) return notFound(reply)
      const body = followBodySchema.safeParse(request.body)
      if (!body.success) return badRequest(reply)
      const world = await request.world()
      if (world === null) return notFound(reply)
      const key: WatchKey = {
        userId,
        worldId: world.worldId,
        raceKey: `${race.raceId}:s${race.season}`,
      }
      const r = await setFollow(db, key, FOLLOW_OF[body.data.follow])
      return { rev: await revAfter(request, world, r.horizonRev) } satisfies RevResponse
    },
  )

  app.put('/api/me/spoiler-scope', { config: { spoiler: 'safe' } }, async (request, reply) => {
    const userId = await sessionUser(request, reply)
    if (userId === null) return reply
    const body = spoilerScopeBodySchema.safeParse(request.body)
    if (!body.success) return badRequest(reply)
    const world = await request.world()
    if (world === null) return notFound(reply)
    // exactOptionalPropertyTypes: ausente no es undefined, y setSpoilerScope recibe lo que llegó.
    const r = await setSpoilerScope(db, userId, body.data.scope, body.data.revealConfirm)
    return { rev: await revAfter(request, world, r.horizonRev) } satisfies RevResponse
  })

  app.get(
    '/api/me/horizon',
    { config: { spoiler: 'horizon', veil: { by: ['N'] } } },
    async (request, reply) => {
      const viewer = await request.viewer()
      if (viewer === null) return unauthorized(reply)
      const world = await request.world()
      const empty = { ready: [], watching: [], expiredSinceLastVisit: [] }
      const scopeOf = async () =>
        (await readSpoilerPrefs(db, viewer.userId))?.scope ?? ('guarded' as const)
      // Con el modo apagado para quien pide: el rev 'world' y las listas vacías (§14.6).
      if (world === null || !(await request.spoilerApplies()))
        return { rev: 'world', scope: await scopeOf(), ...empty } satisfies HorizonSummary
      // Con cs_viewer y sin sesión, solo rev y scope: en un dispositivo compartido, el segundo no ve lo
      // que el primero tiene por ver (14-i).
      if (viewer.readOnly)
        return {
          rev: (await request.horizon()).rev,
          scope: await scopeOf(),
          ...empty,
        } satisfies HorizonSummary
      const h = await request.horizon()
      const summary: HorizonSummary = await horizonSummary(
        db,
        viewer,
        world,
        async (raceKey, stageDay, reachedS) => {
          // Lo que le queda a la cabeza en lo alcanzado, sobre la línea de la etapa (la grabada o la
          // del adaptador): es lo que el espectador ya ha visto. Sin línea no hay nada a medias.
          const tl = await timelineForStage(db, h, raceKey, stageDay)
          if (tl === null) return 0
          return instantAt(tl, reachedS, {
            own: new Set(),
            start: {
              leaders: { gc: null, points: null, kom: null },
              gcTop: [],
              racingAtStart: tl.riderIds.length,
            },
            photoBlocks: photoBlocksOf(tl.lengthKm, tl.dx),
          }).toGoKm
        },
      )
      return summary
    },
  )
}
