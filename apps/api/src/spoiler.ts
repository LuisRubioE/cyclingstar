import { type Horizon, type Viewer, anonHorizon, worldHorizon } from '@cyclingstar/db'
import type { SwitchMode } from '@cyclingstar/shared'
import type { FastifyInstance, FastifyRequest, HTTPMethods } from 'fastify'

/**
 * EL SIN DESTRIPE EN LA API, EN SU PRIMERA FORMA (E2, docs/retransmision.md §14.5; decisión 17-h).
 *
 * Nace en el 3a con lo que las rutas de la retransmisión necesitan: los tipos del registro, el aumento
 * de `FastifyContextConfig` y de `FastifyRequest`, y `registerSpoilerGuard`, que apunta cada ruta en
 * `app.spoilerRegistry` y pone en cada petición sus cuatro métodos. Hasta el 8a la política y el
 * mecanismo de cada ruta son opcionales (el servidor arranca aunque falten: el inventario de
 * `spoilerRegistry.test.ts` sigue siendo la lista), `viewer()` solo mira la sesión (la cookie
 * `cs_viewer` llega en el 7a), `spoilerApplies()` es siempre falso y `horizon()` da el horizonte del
 * mundo con sesión y el del visitante sin ella, los dos con el velo vacío. `computeHorizon` y el gancho
 * `onSend` de las cabeceras llegan en el 7a y el 8a.
 */

/** Qué hace una ruta con lo que nace de una etapa corrida (D-32). */
export type SpoilerPolicy =
  /** no devuelve nada nacido de una etapa, o solo lo que el jugador acaba de escribir */
  | 'safe'
  /** lo devuelve, y lo lee de packages/db con request.horizon() */
  | 'horizon'
  /** lee o mueve lo visto: la retransmisión, el acta y el progreso */
  | 'watch'

/** Cómo aplica el velo (definiciones en §10.6). */
export type SurfaceMechanism = 'P' | 'R' | 'F' | 'M' | 'G' | 'B' | 'N' | 'L'

/** El mecanismo de una ruta; con L, el motivo escrito es obligatorio (desde el 8a). */
export interface VeilSpec {
  readonly by: readonly [SurfaceMechanism, ...SurfaceMechanism[]]
  readonly why?: string
}

/** Una ruta registrada. `policy` y `veil` son null mientras la ruta no los declare (hasta el 8a). */
export interface RouteEntry {
  readonly method: HTTPMethods
  readonly url: string
  readonly policy: SpoilerPolicy | null
  readonly veil: VeilSpec | null
  readonly origin: 'app' | 'static'
}

/** Lo que registró Fastify, por `${método} ${url}`. B1a a B1d lo recorrerán (§16.3). */
export type RouteRegistry = ReadonlyMap<string, RouteEntry>

declare module 'fastify' {
  interface FastifyContextConfig {
    spoiler?: SpoilerPolicy
    veil?: VeilSpec
  }
  interface FastifyRequest {
    /** de la sesión (desde el 7a, también de cs_viewer en lectura), o null; una vez por petición */
    viewer(): Promise<Viewer>
    /** con SPOILER_MODE aplicado, el de quien mira (7a); hasta entonces, el del mundo o el del visitante */
    horizon(): Promise<Horizon>
    /** SPOILER_MODE vale para quien pide; siempre falso hasta el 7a (17-h) */
    spoilerApplies(): Promise<boolean>
    /** BROADCAST_WATCH vale para quien pide: `on`, o `admins` y un administrador con sesión */
    broadcastOn(): Promise<boolean>
  }
  interface FastifyInstance {
    spoilerRegistry: RouteRegistry
  }
}

export interface SpoilerGuardDeps {
  /** SPOILER_MODE: se publica en /health y se aplica desde el 7a */
  readonly mode: SwitchMode
  /** BROADCAST_WATCH */
  readonly broadcast: SwitchMode
  /** createCurrentUserId (routes/context.ts) */
  readonly currentUserId: (request: FastifyRequest) => Promise<string | null>
  /** isUserAdmin con ADMIN_EMAIL (app.ts) */
  readonly isAdmin: (userId: string) => Promise<boolean>
}

/** Las rutas de un plugin de terceros que no admite `config`: la web compilada de @fastify/static. */
export const STATIC_ROUTES: ReadonlySet<string> = new Set(['/*'])

/**
 * El registro y los cuatro métodos de la petición. `deps` es null en una app sin base o sin
 * better-auth (los tests de /health): entonces `viewer()` da null, `horizon()` el del visitante y los
 * otros dos, falso; sin base no se registra ninguna ruta de juego, así que nadie los lee.
 */
export function registerSpoilerGuard(
  app: FastifyInstance,
  deps: SpoilerGuardDeps | null,
): RouteRegistry {
  const registry = new Map<string, RouteEntry>()
  app.addHook('onRoute', (r) => {
    const methods = Array.isArray(r.method) ? r.method : [r.method]
    const isStatic = STATIC_ROUTES.has(r.url) && r.config?.spoiler === undefined
    const policy: SpoilerPolicy | null = isStatic ? 'safe' : (r.config?.spoiler ?? null)
    const veil: VeilSpec | null = isStatic
      ? { by: ['N'], why: 'la web compilada: ningún dato de juego' }
      : (r.config?.veil ?? (policy === 'safe' ? { by: ['N'] } : null))
    for (const method of methods)
      registry.set(`${method} ${r.url}`, {
        method,
        url: r.url,
        policy,
        veil,
        origin: isStatic ? 'static' : 'app',
      })
  })
  installRequestMethods(app, deps)
  app.decorate('spoilerRegistry', registry)
  return registry
}

/** Los cuatro métodos de FastifyRequest, cada uno memorizado por petición. */
function installRequestMethods(app: FastifyInstance, deps: SpoilerGuardDeps | null): void {
  const viewers = new WeakMap<FastifyRequest, Promise<Viewer>>()
  const broadcast = new WeakMap<FastifyRequest, Promise<boolean>>()
  const viewerOf = (request: FastifyRequest): Promise<Viewer> => {
    let v = viewers.get(request)
    if (v === undefined) {
      v =
        deps === null
          ? Promise.resolve(null)
          : deps
              .currentUserId(request)
              .then((userId) => (userId === null ? null : { userId, readOnly: false }))
      viewers.set(request, v)
    }
    return v
  }
  app.decorateRequest('viewer', function (this: FastifyRequest): Promise<Viewer> {
    return viewerOf(this)
  })
  app.decorateRequest('spoilerApplies', function (): Promise<boolean> {
    return Promise.resolve(false)
  })
  app.decorateRequest('broadcastOn', function (this: FastifyRequest): Promise<boolean> {
    let on = broadcast.get(this)
    if (on === undefined) {
      on = broadcastOnFor(deps, viewerOf(this))
      broadcast.set(this, on)
    }
    return on
  })
  app.decorateRequest('horizon', function (this: FastifyRequest): Promise<Horizon> {
    return viewerOf(this).then((v) => (v === null ? anonHorizon() : worldHorizon))
  })
}

/** BROADCAST_WATCH para quien pide: `on`, o `admins` y un administrador con sesión (§14.6). */
async function broadcastOnFor(
  deps: SpoilerGuardDeps | null,
  viewer: Promise<Viewer>,
): Promise<boolean> {
  if (deps === null || deps.broadcast === 'off') return false
  if (deps.broadcast === 'on') return true
  const v = await viewer
  return v !== null && !v.readOnly && (await deps.isAdmin(v.userId))
}
