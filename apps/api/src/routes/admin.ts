import {
  type BlockedKind,
  addBlocked,
  deleteUserAsAdmin,
  getCurrentWorld,
  getRaceRiderIdentities,
  getStageSnapshot,
  getWorldHealth,
  isRootAdminUser,
  listBlocked,
  listUsersForAdmin,
  removeBlocked,
  setUserPremium,
  updateUserAsAdmin,
} from '@cyclingstar/db'
import { checkReplay } from '@cyclingstar/engine'
import { currentSeason } from '@cyclingstar/shared'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { badRequest, notFound, sendError } from '../http.js'
import type { AdminRouteContext } from './context.js'
import { isCalendarRaceId, parseRaceId, parseStageDay } from './params.js'

const kindSchema = z.enum(['team', 'rider'])
const addSchema = z.object({
  kind: kindSchema,
  value: z.string().trim().min(1).max(120),
  note: z.string().trim().max(200).optional(),
})
const premiumSchema = z.object({
  email: z.string().trim().email().max(200),
  premium: z.boolean(),
})
const userIdSchema = z.string().uuid()
const userSearchSchema = z.string().trim().max(200).optional()
/** Al menos un campo: un PATCH vacío es un error del cliente, no un «no hacer nada» silencioso. */
const userPatchSchema = z
  .object({
    emailVerified: z.boolean().optional(),
    isAdmin: z.boolean().optional(),
    premium: z.boolean().optional(),
  })
  .strict()
  .refine((p) => Object.keys(p).length > 0)
/** Temporada de la clave de carrera; si no viene, la del mundo. */
const seasonSchema = z.coerce.number().int().min(0).max(9999)

/**
 * Rutas de administración, TODAS tras la guarda de admin (ADMIN_TOKEN en x-admin-token, o sesión
 * de un usuario administrador): tick manual, avance forzado, cuentas, lista de bloqueo de nombres,
 * salud del mundo, premium y el snapshot de una etapa corrida.
 */
export const adminRoutes: FastifyPluginAsync<AdminRouteContext> = async (app, ctx) => {
  const { db, requireAdmin, rootEmail } = ctx

  /*
    ¿Soy admin? La web lo pregunta para decidir si enseña el panel. 200 con cómo, o el 401 de la
    guarda: la respuesta a «no» es la misma que la de cualquier otra ruta de admin.
  */
  app.get('/api/admin/whoami', async (request, reply) => {
    const actor = await requireAdmin(request, reply)
    if (!actor) return
    return { ok: true, via: actor.via, userId: actor.via === 'session' ? actor.userId : null }
  })

  // Cuentas (panel de administración): listar con búsqueda por correo, cambiar y borrar.
  app.get<{ Querystring: { q?: string } }>('/api/admin/users', async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return
    const q = userSearchSchema.safeParse(request.query.q)
    if (!q.success) return badRequest(reply)
    return { ok: true, users: await listUsersForAdmin(db, { search: q.data, rootEmail }) }
  })

  app.patch<{ Params: { id: string } }>('/api/admin/users/:id', async (request, reply) => {
    const actor = await requireAdmin(request, reply)
    if (!actor) return
    const id = userIdSchema.safeParse(request.params.id)
    const patch = userPatchSchema.safeParse(request.body)
    if (!id.success || !patch.success) return badRequest(reply)
    // Quitarse el permiso a uno mismo es la forma más tonta de quedarse sin administrador.
    if (actor.via === 'session' && actor.userId === id.data && patch.data.isAdmin === false) {
      return sendError(reply, 409, 'no_puedes_quitarte_admin')
    }
    if (!(await updateUserAsAdmin(db, id.data, patch.data))) return notFound(reply)
    return { ok: true }
  })

  app.delete<{ Params: { id: string } }>('/api/admin/users/:id', async (request, reply) => {
    const actor = await requireAdmin(request, reply)
    if (!actor) return
    const id = userIdSchema.safeParse(request.params.id)
    if (!id.success) return badRequest(reply)
    // La propia cuenta se borra desde ajustes, con contraseña: aquí sería un clic sin vuelta atrás.
    if (actor.via === 'session' && actor.userId === id.data) {
      return sendError(reply, 409, 'borra_tu_cuenta_desde_ajustes')
    }
    // El administrador raíz lo pone el despliegue (ADMIN_EMAIL): otro admin no puede echarlo.
    if (await isRootAdminUser(db, id.data, rootEmail)) {
      return sendError(reply, 409, 'es_el_admin_raiz')
    }
    if (!(await deleteUserAsAdmin(db, id.data))) return notFound(reply)
    return { ok: true }
  })

  // Tick manual protegido (Paso 10): recuperación y desarrollo (SPEC 12).
  if (ctx.onAdminTick) {
    const onAdminTick = ctx.onAdminTick
    app.post('/admin/tick', async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return
      const summary = await onAdminTick()
      return reply.send({ ok: true, ...summary })
    })
  }

  // Avance forzado de días para pruebas (Paso 32): POST /admin/advance?days=N. Ignora el tiempo
  // real y procesa N días de juego (carreras + entrenamiento). Protegido por ADMIN_TOKEN.
  if (ctx.onAdminAdvance) {
    const onAdminAdvance = ctx.onAdminAdvance
    app.post<{ Querystring: { days?: string } }>('/admin/advance', async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return
      const days = Math.min(30, Math.max(1, Number(request.query.days ?? 1) || 1))
      const summary = await onAdminAdvance(days)
      return reply.send({ ok: true, ...summary })
    })
  }

  // Lista de bloqueo de nombres (equipos reales, ciclistas/famosos reales), curada por admins.
  // "Base secreta" no enlazada en la web.
  app.get<{ Querystring: { kind?: string } }>('/api/admin/blocklist', async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return
    const kind = kindSchema.safeParse(request.query.kind)
    if (!kind.success) return badRequest(reply)
    return { ok: true, items: await listBlocked(db, kind.data as BlockedKind) }
  })

  app.post('/api/admin/blocklist', async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return
    const parsed = addSchema.safeParse(request.body)
    if (!parsed.success) return badRequest(reply)
    const { kind, value, note } = parsed.data
    const { inserted } = await addBlocked(db, kind as BlockedKind, value, note ?? null)
    return reply.status(inserted ? 201 : 200).send({ ok: true, inserted })
  })

  app.delete<{ Params: { id: string } }>('/api/admin/blocklist/:id', async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return
    const id = z.string().uuid().safeParse(request.params.id)
    if (!id.success) return badRequest(reply)
    await removeBlocked(db, id.data)
    return { ok: true }
  })

  // Salud del mundo para el panel de admin (#84): día, censo y últimos ticks. Solo lectura.
  app.get('/api/admin/health', async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return
    return { ok: true, health: await getWorldHealth(db) }
  })

  // Concede/retira premium por email (admin). Premium habilita tomar el control de un equipo bot.
  app.post('/api/admin/premium', async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return
    const parsed = premiumSchema.safeParse(request.body)
    if (!parsed.success) return badRequest(reply)
    const { updated } = await setUserPremium(db, parsed.data.email, parsed.data.premium)
    if (!updated) return notFound(reply, 'usuario_no_encontrado')
    return { ok: true }
  })

  /**
   * EL SNAPSHOT DE UNA ETAPA CORRIDA: la semilla, la entrada y la versión del motor con que corrió.
   *
   * Es lo que hace falta para RECONSTRUIRLA entera —el motor es determinista, así que con la misma
   * entrada y la misma semilla sale la misma carrera— y es lo que la Race Radio (`scripts/race-
   * radio.mjs --db`) necesitaba y no podía pedir: hasta ahora solo se llegaba a `stage_snapshots`
   * con `DATABASE_URL` en la máquina de quien mira, así que el camino estaba escrito y sin correr.
   *
   * VA TRAS EL TOKEN DE ADMIN Y NO PUEDE DEJAR DE ESTARLO. `input` lleva el estado de partida de
   * todos los corredores (atributos efectivos, depósito, órdenes) y `seed` es la semilla exacta:
   * con los dos se puede predecir el desenlace de una etapa antes de que se publique, que es
   * justamente lo que un jugador no debe poder hacer.
   *
   * No devuelve `events` (la crónica congelada): esa ya es pública en la página de la etapa y aquí
   * solo abultaría la respuesta. Lo que se sirve es lo que `checkReplay()` necesita, y el propio
   * veredicto de la guarda de versión ya resuelto, para que quien lo consuma no lo reimplemente.
   */
  app.get<{ Params: { raceId: string; day: string }; Querystring: { season?: string } }>(
    '/api/admin/stage-snapshot/:raceId/:day',
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return
      const raceId = parseRaceId(request.params.raceId)
      const day = parseStageDay(request.params.day)
      if (!raceId || day === null || !isCalendarRaceId(raceId)) return badRequest(reply)
      const season =
        request.query.season === undefined ? null : seasonSchema.safeParse(request.query.season)
      if (season && !season.success) return badRequest(reply)
      const world = await getCurrentWorld(db)
      // Sin temporada explícita se usa la del mundo, que es lo que quiere el 99 % de las veces
      // quien mira una etapa «de ahora mismo»; sin mundo no hay temporada que suponer.
      const seasonNumber = season ? season.data : world ? currentSeason(world.currentDay) : null
      if (seasonNumber === null) return notFound(reply, 'sin_mundo')
      const raceKey = `${raceId}:s${seasonNumber}`
      const snapshot = await getStageSnapshot(db, raceKey, day)
      // Una etapa que no se ha corrido no tiene snapshot: es un 404, no una respuesta vacía.
      if (!snapshot) return notFound(reply)
      // Dorsal, nombre y equipo NO los sabe el motor y no debe saberlos: se cruzan aquí, con la
      // misma consulta que ya usan el journal y el camino `--db` de la radio.
      const riders = await getRaceRiderIdentities(db, raceKey)
      return {
        ok: true,
        raceKey,
        stageDay: day,
        seed: snapshot.seed,
        engineVersion: snapshot.engineVersion,
        input: snapshot.input,
        replay: checkReplay(snapshot.engineVersion),
        riders,
      }
    },
  )
}
