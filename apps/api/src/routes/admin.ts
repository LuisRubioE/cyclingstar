import {
  type BlockedKind,
  addBlocked,
  getWorldHealth,
  listBlocked,
  removeBlocked,
  setUserPremium,
} from '@cyclingstar/db'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { badRequest, notFound } from '../http.js'
import type { AdminRouteContext } from './context.js'

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

/**
 * Rutas de administración, TODAS tras la guarda de ADMIN_TOKEN (cabecera x-admin-token):
 * tick manual, avance forzado, lista de bloqueo de nombres, salud del mundo y premium.
 */
export const adminRoutes: FastifyPluginAsync<AdminRouteContext> = async (app, ctx) => {
  const { db, requireAdmin } = ctx

  // Tick manual protegido (Paso 10): recuperación y desarrollo (SPEC 12).
  if (ctx.onAdminTick) {
    const onAdminTick = ctx.onAdminTick
    app.post('/admin/tick', async (request, reply) => {
      if (!requireAdmin(request, reply)) return
      const summary = await onAdminTick()
      return reply.send({ ok: true, ...summary })
    })
  }

  // Avance forzado de días para pruebas (Paso 32): POST /admin/advance?days=N. Ignora el tiempo
  // real y procesa N días de juego (carreras + entrenamiento). Protegido por ADMIN_TOKEN.
  if (ctx.onAdminAdvance) {
    const onAdminAdvance = ctx.onAdminAdvance
    app.post<{ Querystring: { days?: string } }>('/admin/advance', async (request, reply) => {
      if (!requireAdmin(request, reply)) return
      const days = Math.min(30, Math.max(1, Number(request.query.days ?? 1) || 1))
      const summary = await onAdminAdvance(days)
      return reply.send({ ok: true, ...summary })
    })
  }

  // Lista de bloqueo de nombres (equipos reales, ciclistas/famosos reales), curada por admins.
  // "Base secreta" no enlazada en la web.
  app.get<{ Querystring: { kind?: string } }>('/api/admin/blocklist', async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const kind = kindSchema.safeParse(request.query.kind)
    if (!kind.success) return badRequest(reply)
    return { ok: true, items: await listBlocked(db, kind.data as BlockedKind) }
  })

  app.post('/api/admin/blocklist', async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const parsed = addSchema.safeParse(request.body)
    if (!parsed.success) return badRequest(reply)
    const { kind, value, note } = parsed.data
    const { inserted } = await addBlocked(db, kind as BlockedKind, value, note ?? null)
    return reply.status(inserted ? 201 : 200).send({ ok: true, inserted })
  })

  app.delete<{ Params: { id: string } }>('/api/admin/blocklist/:id', async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const id = z.string().uuid().safeParse(request.params.id)
    if (!id.success) return badRequest(reply)
    await removeBlocked(db, id.data)
    return { ok: true }
  })

  // Salud del mundo para el panel de admin (#84): día, censo y últimos ticks. Solo lectura.
  app.get('/api/admin/health', async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    return { ok: true, health: await getWorldHealth(db) }
  })

  // Concede/retira premium por email (admin). Premium habilita tomar el control de un equipo bot.
  app.post('/api/admin/premium', async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const parsed = premiumSchema.safeParse(request.body)
    if (!parsed.success) return badRequest(reply)
    const { updated } = await setUserPremium(db, parsed.data.email, parsed.data.premium)
    if (!updated) return notFound(reply, 'usuario_no_encontrado')
    return { ok: true }
  })
}
