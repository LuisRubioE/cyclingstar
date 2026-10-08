import { type Database, getWorldClock } from '@cyclingstar/db'
import { ENGINE_VERSION } from '@cyclingstar/engine'
import type { Health, SwitchMode } from '@cyclingstar/shared'
import type { FastifyPluginAsync } from 'fastify'

export interface HealthRouteContext {
  db?: Database
  migrationsApplied?: boolean
  tickIntervalMinutes?: number
  /**
   * Los interruptores de E2 (docs/retransmision.md §14.6, 14-l): si están, /health los publica en
   * `features`, que no dice nada de nadie. Sin ellos la respuesta es la de siempre.
   */
  features?: { readonly broadcastWatch: SwitchMode; readonly spoilerMode: SwitchMode }
}

/** GET /health: versión del motor, fecha de juego y estado de las migraciones (SPEC 12). */
export const healthRoutes: FastifyPluginAsync<HealthRouteContext> = async (app, ctx) => {
  // /health queda fuera del rate limit: lo sondea el healthcheck de Railway y no debe poder
  // agotarse el cupo de nadie (ni agotar el suyo) por un sondeo de infraestructura.
  app.get(
    '/health',
    { config: { rateLimit: false, spoiler: 'safe' } },
    async (): Promise<Health> => {
      let gameDay: number | null = null
      let nextTickAtMs: number | null = null
      const tickIntervalMinutes = ctx.tickIntervalMinutes ?? 360
      if (ctx.db) {
        const clock = await getWorldClock(ctx.db)
        if (clock) {
          gameDay = clock.currentDay
          // Próximo avance: creación del mundo + (día+1) periodos (targetGameDay = floor(elapsed/ms)).
          const msPerGameDay = tickIntervalMinutes * 60_000
          nextTickAtMs = clock.createdAtMs + (clock.currentDay + 1) * msPerGameDay
        }
      }
      return {
        ok: true,
        engineVersion: ENGINE_VERSION,
        gameDay,
        migrationsApplied: ctx.migrationsApplied ?? false,
        tickIntervalMinutes,
        nextTickAtMs,
        ...(ctx.features
          ? {
              features: {
                broadcastWatch: ctx.features.broadcastWatch,
                spoilerMode: ctx.features.spoilerMode,
              },
            }
          : {}),
      }
    },
  )
}
