import type { TickSummary } from '@cyclingstar/db'
import type { AppDeps } from '../app.js'
import { buildApp } from '../app.js'
import type { RouteRegistry } from '../spoiler.js'

/**
 * EL REGISTRO DE PRODUCCIÓN, SIN BASE (E2, paso 8a; E3, PR 19a): la app con las dependencias con que la
 * arranca `index.ts`, en dobles. Qué rutas se registran depende de QUÉ dependencias hay, no de lo que
 * contengan, y ni la base ni la sesión se tocan hasta que llega una petición. Lo recorren
 * `spoilerRegistry.test.ts` (la tabla de §11.3) y `frontera.test.ts` (los esquemas de respuesta).
 */

const summary = { currentDay: 1, daysProcessed: 0 } as unknown as TickSummary

/** Las dependencias con que `index.ts` arranca la app, en dobles. */
export function productionDeps(serveWeb: boolean): AppDeps {
  return {
    db: {} as never,
    auth: {
      api: { getSession: async () => null },
      handler: async () => new Response('{}', { status: 200 }),
    } as unknown as NonNullable<AppDeps['auth']>,
    migrationsApplied: true,
    tickIntervalMinutes: 360,
    adminToken: 'a'.repeat(32),
    adminEmail: 'dueno@example.com',
    onAdminTick: async () => summary,
    onAdminAdvance: async () => summary,
    switches: { broadcastWatch: 'off', spoilerMode: 'off' },
    serveWeb,
  }
}

/** El registro de la app ya lista (los `register` de buildApp no cargan nada hasta `ready()`). */
export async function registryOf(deps: AppDeps): Promise<RouteRegistry> {
  const app = buildApp(deps)
  await app.ready()
  await app.close()
  return app.spoilerRegistry
}
