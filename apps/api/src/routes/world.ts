import type { TickSummary } from '@cyclingstar/db'
import type { FastifyPluginAsync } from 'fastify'
import type { AdminGuard } from '../security.js'

export interface WorldRouteContext {
  requireAdmin: AdminGuard
  onAdminAdvance: (days: number) => Promise<TickSummary>
}

/**
 * Avance del mundo desde la web para pruebas (Paso 32): adelanta N días de juego con un clic.
 *
 * SEGURIDAD: hasta ahora bastaba con tener SESIÓN, así que cualquier usuario registrado podía
 * avanzar el mundo hasta 10 días por petición de forma IRREVERSIBLE (se corren carreras, se
 * reparten puntos y dinero, envejecen los corredores) — y index.ts cablea `onAdminAdvance` siempre,
 * también en producción. Al abrir el registro eso es un botón de destruir la partida de todos.
 * Ahora exige el mismo ADMIN_TOKEN que /admin/tick y /admin/advance.
 */
export const worldRoutes: FastifyPluginAsync<WorldRouteContext> = async (app, ctx) => {
  const { requireAdmin, onAdminAdvance } = ctx
  app.post<{ Querystring: { days?: string } }>('/api/world/advance', async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const days = Math.min(10, Math.max(1, Number(request.query.days ?? 1) || 1))
    const summary = await onAdminAdvance(days)
    return { ok: true, currentDay: summary.currentDay, daysProcessed: summary.daysProcessed }
  })
}
