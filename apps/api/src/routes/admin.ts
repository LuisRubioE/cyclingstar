import {
  type BlockedKind,
  type Database,
  ADMIN_AUDIT_MAX_ROWS,
  addBlockedAsAdmin,
  approvePendingUser,
  deleteUserAsAdmin,
  getCurrentWorld,
  getRaceRiderIdentities,
  getStageSnapshot,
  getWorldHealth,
  isRootAdminUser,
  listAdminAudit,
  listBlocked,
  listUsersForAdmin,
  rejectPendingUser,
  removeBlockedAsAdmin,
  renameTeamAsAdmin,
  revertTeamKit,
  setUserPremiumAsAdmin,
  teamOwnerOf,
  teamsOfTheDay,
  updateUserAsAdmin,
  worldHorizon,
  writeAdminAudit,
} from '@cyclingstar/db'
import { type StageInput, checkReplay } from '@cyclingstar/engine'
import {
  currentSeason,
  kitRevertBodySchema,
  kitRevertResponseSchema,
  adminAuditResponseSchema,
  adminTeamPatchSchema,
  adminUserPatchSchema,
  adminUsersResponseSchema,
  adminWhoamiResponseSchema,
  blocklistAddResponseSchema,
  blocklistResponseSchema,
  okResponseSchema,
  worldHealthResponseSchema,
} from '@cyclingstar/shared'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import type { Auth } from '../auth.js'
import { badRequest, notFound, sendError } from '../http.js'
import type { AdminActor } from '../security.js'
import { ADMIN_VEIL } from '../spoiler.js'
import type { AdminRouteContext } from './context.js'
import { mailBudgetOpen } from '../mailBudget.js'
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
const userStatusQuerySchema = z.enum(['pending']).optional()
/** `?limit=` hasta 500 y `?before=` un instante (8-f). */
const auditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(ADMIN_AUDIT_MAX_ROWS).default(50),
  before: z.string().datetime({ offset: true }).optional(),
})

/** Quién firma una fila de `admin_audit`: el id de la cuenta, o `'token'` (8-d). */
function actorId(actor: AdminActor): string {
  return actor.via === 'token' ? 'token' : actor.userId
}

/** Los campos que la cuenta raíz no deja cambiar desde el panel (8-h). */
const ROOT_LOCKED_FIELDS = ['emailVerified', 'isAdmin', 'email'] as const

/**
 * Manda el `verify_signup` de una cuenta recién aprobada (docs/cuenta.md §4.9): `sendVerificationEmail`
 * sin sesión encuentra la cuenta sin confirmar y lo manda, ya aprobada; es el mismo correo del registro.
 */
export function verificationSender(auth: Auth): (email: string) => Promise<void> {
  return async (email) => {
    await auth.api.sendVerificationEmail({ body: { email } })
  }
}
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
  app.get(
    '/api/admin/whoami',
    {
      config: {
        response: { 200: adminWhoamiResponseSchema },
        spoiler: 'horizon',
        veil: ADMIN_VEIL,
      },
    },
    async (request, reply) => {
      const actor = await requireAdmin(request, reply)
      if (!actor) return
      return { ok: true, via: actor.via, userId: actor.via === 'session' ? actor.userId : null }
    },
  )

  // Cuentas (panel de administración): listar con búsqueda por correo, cambiar y borrar.
  app.get<{ Querystring: { q?: string; status?: string } }>(
    '/api/admin/users',
    {
      config: { response: { 200: adminUsersResponseSchema }, spoiler: 'horizon', veil: ADMIN_VEIL },
    },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return
      const q = userSearchSchema.safeParse(request.query.q)
      const status = userStatusQuerySchema.safeParse(request.query.status)
      if (!q.success || !status.success) return badRequest(reply)
      return {
        ok: true,
        users: await listUsersForAdmin(db, { search: q.data, rootEmail, status: status.data }),
      }
    },
  )

  app.patch<{ Params: { id: string } }>(
    '/api/admin/users/:id',
    { config: { response: { 200: okResponseSchema }, spoiler: 'horizon', veil: ADMIN_VEIL } },
    async (request, reply) => {
      const actor = await requireAdmin(request, reply)
      if (!actor) return
      const id = userIdSchema.safeParse(request.params.id)
      const patch = adminUserPatchSchema.safeParse(request.body)
      if (!id.success || !patch.success) return badRequest(reply)
      // Quitarse el permiso a uno mismo es la forma más tonta de quedarse sin administrador.
      if (actor.via === 'session' && actor.userId === id.data && patch.data.isAdmin === false) {
        return sendError(reply, 409, 'no_puedes_quitarte_admin')
      }
      // La cuenta raíz la pone el despliegue (8-h): quitarle la confirmación, el permiso o el correo
      // la dejaría fuera, como ya impide el DELETE. Premium sí se le puede cambiar.
      if (
        ROOT_LOCKED_FIELDS.some((f) => patch.data[f] !== undefined) &&
        (await isRootAdminUser(db, id.data, rootEmail))
      ) {
        return sendError(reply, 409, 'es_el_admin_raiz')
      }
      const out = await updateUserAsAdmin(db, id.data, patch.data, {
        actor: actorId(actor),
        rootEmail,
      })
      if (!out.ok) {
        if (out.reason === 'no_existe') return notFound(reply)
        return sendError(reply, out.reason === 'admin_email_fijo' ? 400 : 409, out.reason)
      }
      return { ok: true }
    },
  )

  app.delete<{ Params: { id: string } }>(
    '/api/admin/users/:id',
    { config: { response: { 200: okResponseSchema }, spoiler: 'horizon', veil: ADMIN_VEIL } },
    async (request, reply) => {
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
      if (!(await deleteUserAsAdmin(db, id.data, actorId(actor)))) return notFound(reply)
      return { ok: true }
    },
  )

  /*
    LA COLA DE APROBACIÓN (docs/cuenta.md §4.9; 8-k). Aprobar y rechazar solo valen sobre una cuenta
    `pending` (409 `no_pendiente` si otro administrador ya decidió). Aprobar manda después el
    `verify_signup`; rechazar borra la cuenta y no manda nada.
  */
  app.post<{ Params: { id: string } }>(
    '/api/admin/users/:id/approve',
    { config: { response: { 200: okResponseSchema }, spoiler: 'horizon', veil: ADMIN_VEIL } },
    async (request, reply) => {
      const actor = await requireAdmin(request, reply)
      if (!actor) return
      const id = userIdSchema.safeParse(request.params.id)
      if (!id.success) return badRequest(reply)
      // El presupuesto de `verify_signup` (§7.6): con el día gastado, 503 y la cuenta sigue pendiente.
      if (!(await mailBudgetOpen(db, 'verify_signup', ctx.mailDailyBudget))) {
        return sendError(reply, 503, 'MAIL_BUDGET_EXHAUSTED')
      }
      const out = await approvePendingUser(db, id.data, actorId(actor))
      if (!out.ok) {
        return out.reason === 'no_existe' ? notFound(reply) : sendError(reply, 409, out.reason)
      }
      if (ctx.sendVerification) {
        try {
          await ctx.sendVerification(out.email)
        } catch (err) {
          // La cuenta ya está aprobada: el enlace se puede volver a pedir al intentar entrar.
          request.log.error({ err, userId: id.data }, 'aprobada, pero el enlace no salió')
        }
      }
      return { ok: true }
    },
  )

  app.post<{ Params: { id: string } }>(
    '/api/admin/users/:id/reject',
    { config: { response: { 200: okResponseSchema }, spoiler: 'horizon', veil: ADMIN_VEIL } },
    async (request, reply) => {
      const actor = await requireAdmin(request, reply)
      if (!actor) return
      const id = userIdSchema.safeParse(request.params.id)
      if (!id.success) return badRequest(reply)
      const out = await rejectPendingUser(db, id.data, actorId(actor))
      if (!out.ok) {
        return out.reason === 'no_existe' ? notFound(reply) : sendError(reply, 409, out.reason)
      }
      return { ok: true }
    },
  )

  /*
    Un administrador cambia el nombre de cualquier equipo (8-e, DD-14 B), también el de una cuenta
    borrada o el de un bot, con las reglas de su dueño.
  */
  app.patch<{ Params: { id: string } }>(
    '/api/admin/teams/:id',
    { config: { response: { 200: okResponseSchema }, spoiler: 'horizon', veil: ADMIN_VEIL } },
    async (request, reply) => {
      const actor = await requireAdmin(request, reply)
      if (!actor) return
      const id = z.string().uuid().safeParse(request.params.id)
      const body = adminTeamPatchSchema.safeParse(request.body)
      if (!id.success || !body.success) return badRequest(reply)
      const out = await renameTeamAsAdmin(db, id.data, body.data.name, actorId(actor))
      if (!out.ok) {
        if (out.reason === 'no_existe') return notFound(reply)
        return sendError(reply, out.reason === 'nombre_repetido' ? 409 : 400, out.reason)
      }
      return { ok: true }
    },
  )

  /*
    EL REGISTRO DEL PANEL (8-f): las más nuevas primero, hasta 500, y la página anterior con `before`.
    Solo administradores; E7 la abrirá a un papel más.
  */
  app.get<{ Querystring: { limit?: string; before?: string } }>(
    '/api/admin/audit',
    {
      config: { response: { 200: adminAuditResponseSchema }, spoiler: 'horizon', veil: ADMIN_VEIL },
    },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return
      const q = auditQuerySchema.safeParse(request.query)
      if (!q.success) return badRequest(reply)
      const entries = await listAdminAudit(db, {
        limit: q.data.limit,
        before: q.data.before ? new Date(q.data.before) : undefined,
      })
      return { ok: true as const, entries }
    },
  )

  // Tick manual protegido (Paso 10): recuperación y desarrollo (SPEC 12).
  if (ctx.onAdminTick) {
    const onAdminTick = ctx.onAdminTick
    app.post(
      '/admin/tick',
      { config: { spoiler: 'horizon', veil: ADMIN_VEIL } },
      async (request, reply) => {
        const actor = await requireAdmin(request, reply)
        if (!actor) return
        const summary = await onAdminTick()
        // El tick corre en sus propias transacciones: la fila va detrás, cuando ya ha corrido (8-i).
        await writeAdminAudit(db, actorId(actor), [
          {
            action: 'world.tick',
            targetUserId: null,
            detail: { field: 'days', from: null, to: 1 },
          },
        ])
        return reply.send({ ok: true, ...summary })
      },
    )
  }

  // Avance forzado de días para pruebas (Paso 32): POST /admin/advance?days=N. Ignora el tiempo
  // real y procesa N días de juego (carreras + entrenamiento). Protegido por ADMIN_TOKEN.
  if (ctx.onAdminAdvance) {
    const onAdminAdvance = ctx.onAdminAdvance
    app.post<{ Querystring: { days?: string } }>(
      '/admin/advance',
      { config: { spoiler: 'horizon', veil: ADMIN_VEIL } },
      async (request, reply) => {
        const actor = await requireAdmin(request, reply)
        if (!actor) return
        const days = Math.min(30, Math.max(1, Number(request.query.days ?? 1) || 1))
        const summary = await onAdminAdvance(days)
        await writeAdminAudit(db, actorId(actor), [
          {
            action: 'world.advance',
            targetUserId: null,
            detail: { field: 'days', from: null, to: days },
          },
        ])
        return reply.send({ ok: true, ...summary })
      },
    )
  }

  // Lista de bloqueo de nombres (equipos reales, ciclistas/famosos reales), curada por admins.
  // "Base secreta" no enlazada en la web.
  app.get<{ Querystring: { kind?: string } }>(
    '/api/admin/blocklist',
    {
      config: { response: { 200: blocklistResponseSchema }, spoiler: 'horizon', veil: ADMIN_VEIL },
    },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return
      const kind = kindSchema.safeParse(request.query.kind)
      if (!kind.success) return badRequest(reply)
      // `createdAt` sale como texto: el esquema de la respuesta no acepta un `Date` (daba 500).
      const items = await listBlocked(db, kind.data as BlockedKind)
      return { ok: true, items: items.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() })) }
    },
  )

  app.post(
    '/api/admin/blocklist',
    {
      config: {
        response: { 200: blocklistAddResponseSchema, 201: blocklistAddResponseSchema },
        spoiler: 'horizon',
        veil: ADMIN_VEIL,
      },
    },
    async (request, reply) => {
      const actor = await requireAdmin(request, reply)
      if (!actor) return
      const parsed = addSchema.safeParse(request.body)
      if (!parsed.success) return badRequest(reply)
      const { kind, value, note } = parsed.data
      const { inserted } = await addBlockedAsAdmin(db, kind, value, note ?? null, actorId(actor))
      return reply.status(inserted ? 201 : 200).send({ ok: true, inserted })
    },
  )

  app.delete<{ Params: { id: string } }>(
    '/api/admin/blocklist/:id',
    { config: { response: { 200: okResponseSchema }, spoiler: 'horizon', veil: ADMIN_VEIL } },
    async (request, reply) => {
      const actor = await requireAdmin(request, reply)
      if (!actor) return
      const id = z.string().uuid().safeParse(request.params.id)
      if (!id.success) return badRequest(reply)
      await removeBlockedAsAdmin(db, id.data, actorId(actor))
      return { ok: true }
    },
  )

  // LA REVERSIÓN DEL MAILLOT PARA E9 (E3, docs/visual.md §8.8; PR 18a): para mañana, una fila
  // `moderator` con el último maillot `system` del equipo, o uno nuevo si ese no vale, y su noticia en
  // el diario. El motivo va al registro de la API hasta que E9 tenga el suyo.
  app.post<{ Params: { id: string } }>(
    '/api/admin/teams/:id/kit/revert',
    {
      config: { response: { 200: kitRevertResponseSchema }, spoiler: 'horizon', veil: ADMIN_VEIL },
    },
    async (request, reply) => {
      const actor = await requireAdmin(request, reply)
      if (!actor) return
      const id = z.string().uuid().safeParse(request.params.id)
      const body = kitRevertBodySchema.safeParse(request.body)
      if (!id.success || !body.success) return badRequest(reply)
      const teamId = id.data
      const result = await db.transaction(async (tx) => {
        const t = tx as unknown as Database
        const hecho = await revertTeamKit(t, teamId, body.data.reason)
        if (hecho) {
          await writeAdminAudit(t, actorId(actor), [
            {
              action: 'team.kit_revert',
              targetUserId: await teamOwnerOf(t, teamId),
              detail: { field: 'kit', from: null, to: hecho.kit, teamId },
            },
          ])
        }
        return hecho
      })
      if (!result) return notFound(reply)
      request.log.info(
        { teamId: id.data, kit: result.kit, reason: body.data.reason, via: actor.via },
        'maillot revertido por un moderador',
      )
      return { ok: true as const, ...result }
    },
  )

  // Salud del mundo para el panel de admin (#84): día, censo y últimos ticks. Solo lectura.
  app.get(
    '/api/admin/health',
    {
      config: {
        response: { 200: worldHealthResponseSchema },
        spoiler: 'horizon',
        veil: ADMIN_VEIL,
      },
    },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return
      return { ok: true, health: await getWorldHealth(db) }
    },
  )

  // Concede/retira premium por email (admin). Premium habilita tomar el control de un equipo bot.
  app.post(
    '/api/admin/premium',
    { config: { response: { 200: okResponseSchema }, spoiler: 'horizon', veil: ADMIN_VEIL } },
    async (request, reply) => {
      const actor = await requireAdmin(request, reply)
      if (!actor) return
      const parsed = premiumSchema.safeParse(request.body)
      if (!parsed.success) return badRequest(reply)
      const { email, premium } = parsed.data
      const { updated } = await setUserPremiumAsAdmin(db, email, premium, actorId(actor))
      if (!updated) return notFound(reply, 'usuario_no_encontrado')
      return { ok: true }
    },
  )

  /**
   * Lo que devuelve el snapshot (E3, docs/visual.md §13.2; 19a): lo lee la radio (`scripts/race-radio.mjs`),
   * no la web. `input` es la entrada entera del motor y cruza tal cual, porque reconstruir la etapa es
   * justo para lo que sirve, y por eso va tras el token de administración.
   */
  const stageSnapshotResponseSchema = z.object({
    ok: z.literal(true),
    raceKey: z.string(),
    stageDay: z.number().int(),
    seed: z.string(),
    engineVersion: z.number().int(),
    input: z.unknown(),
    replay: z.object({
      faithful: z.boolean(),
      ranWith: z.number().int(),
      today: z.number().int(),
    }),
    riders: z.array(
      z.object({
        riderId: z.string(),
        name: z.string(),
        country: z.string(),
        teamName: z.string().nullable(),
        bib: z.number().int().nullable(),
      }),
    ),
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
    {
      config: {
        response: { 200: stageSnapshotResponseSchema },
        spoiler: 'horizon',
        veil: ADMIN_VEIL,
      },
    },
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
      // Solo administradores (L, §11.3): el mundo entero, sin velo (§10.6, punto 1).
      const snapshot = await getStageSnapshot(db, worldHorizon, raceKey, day)
      // Una etapa que no se ha corrido no tiene snapshot: es un 404, no una respuesta vacía.
      if (!snapshot) return notFound(reply)
      // Dorsal, nombre y equipo NO los sabe el motor y no debe saberlos: se cruzan aquí, con la
      // misma consulta que ya usan el journal y el camino `--db` de la radio, y el equipo del día, el
      // de la entrada de la etapa, como el journal (E2, §12.7; paso 12).
      const input = snapshot.input as StageInput
      const riders = await getRaceRiderIdentities(db, raceKey, teamsOfTheDay(input.riders))
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
