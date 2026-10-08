import {
  type Database,
  type Horizon,
  TtlMemo,
  type Viewer,
  type WatchRow,
  type WorldRef,
  anonHorizon,
  computeHorizon,
  getCurrentWorld,
  stageGateOf,
  touchLastSeen,
  worldHorizon,
} from '@cyclingstar/db'
import { SPOILER, type StageGate, type SwitchMode, type WatchState } from '@cyclingstar/shared'
import { getSessionCookie } from 'better-auth/cookies'
import type {
  FastifyContextConfig,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HTTPMethods,
} from 'fastify'
import { z } from 'zod'
import { toWebHeaders } from './routes/context.js'
import {
  DAY_S,
  VIEWER_COOKIE,
  cookieValue,
  readViewerCookie,
  signViewerCookie,
  viewerCookieHeader,
} from './viewerCookie.js'

/**
 * EL SIN DESTRIPE EN LA API (E2, docs/retransmision.md §10.8, §10.13, §14.5 y §14.9; decisión 17-h).
 *
 * Se construyó en tres PR. El 3a puso el registro que apunta cada ruta en `app.spoilerRegistry`, sin
 * lanzar, y los cuatro métodos de cada petición sin horizonte. El 7a les dio su forma: `viewer()`
 * es el de la sesión, con su usuario memorizado 60 s por el valor de la cookie de sesión (10-n), o el de
 * `cs_viewer` EN LECTURA (§10.8); `spoilerApplies()` dice si `SPOILER_MODE` vale para quien pide
 * (`on`, o `admins` y es administrador); `horizon()` es `computeHorizon` cuando vale y, si no, el del
 * mundo con sesión o el del visitante sin ella (§10.13); y el gancho `onSend` pone a toda ruta con
 * horizonte (`horizon` o `watch`) `Vary: Cookie`, `Cache-Control: private, no-store` (salvo un 2xx que
 * ya traiga el suyo, como el tramo) y, a una petición con sesión, `cs_viewer` firmada de nuevo si la que
 * llega falta, no vale, es de otro usuario o tiene más de un día (10-g). El 8a (su tercera forma,
 * 17-h) hace obligatorios `policy` y `veil`: el registro lanza al arrancar si a una ruta le falta la
 * política, si una con horizonte no dice su mecanismo o si una L no lleva su motivo escrito. Un
 * `onRoute` que lanza hace que `ready()` rechace con su mensaje, así que `app.listen` rechaza en
 * `index.ts` y el proceso sale con 1: una ruta sin clasificar no llega a producción, porque antes deja
 * B1d en rojo (`spoilerRegistry.test.ts`, que escribe la tabla de §11.3 entera).
 *
 * Además de los cuatro métodos de §14.5, la petición gana `world()`: el mundo y su día de juego, leídos
 * una vez por petición (los usan `horizon()` y las rutas de `/api/me`, que necesitan el mundo de la
 * fila de `race_watch` y el día del `rev`).
 *
 * El 7b añade `stageAccessOf` (§14.1, 14-e), la regla de qué sirve la ruta de etapa, y `diagAllowed()`,
 * si `?diag=1` vale para quien pide: un administrador con sesión (D-40, §11.15). Para cualquier otro el
 * parámetro no existe y la respuesta es la misma, byte a byte, que sin él (11-h). El 8a lo lleva a la
 * ficha de carrera y al feed con `diagHorizon`.
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

/** El mecanismo de una ruta; con L, el motivo escrito es obligatorio (el registro lanza sin él). */
export interface VeilSpec {
  readonly by: readonly [SurfaceMechanism, ...SurfaceMechanism[]]
  readonly why?: string
}

/** Una ruta registrada, con su política y su mecanismo: sin ellos no arranca (8a). */
export interface RouteEntry {
  readonly method: HTTPMethods
  readonly url: string
  readonly policy: SpoilerPolicy
  readonly veil: VeilSpec
  readonly origin: 'app' | 'static'
}

/**
 * El mecanismo de las trece rutas de administración (§11.3, §14.5): `horizon` con L, todas y no solo
 * las que devuelven datos de una etapa, para que lleven `private, no-store` y nadie tenga que decidir
 * ruta a ruta qué dato de administración es de juego.
 */
export const ADMIN_VEIL: VeilSpec = {
  by: ['L'],
  why: 'solo administradores (requireAdmin): ven el mundo con worldHorizon',
}

/** Lo que registró Fastify, por `${método} ${url}`. B1a a B1d lo recorren (§16.3). */
export type RouteRegistry = ReadonlyMap<string, RouteEntry>

declare module 'fastify' {
  interface FastifyContextConfig {
    spoiler?: SpoilerPolicy
    veil?: VeilSpec
  }
  interface FastifyRequest {
    /** de la sesión, o de cs_viewer en lectura, o null (§10.8); una vez por petición */
    viewer(): Promise<Viewer>
    /** con SPOILER_MODE aplicado (§10.13), el de quien mira; si no, el del mundo o el del visitante */
    horizon(): Promise<Horizon>
    /** SPOILER_MODE vale para quien pide: `on`, o `admins` y es administrador */
    spoilerApplies(): Promise<boolean>
    /** BROADCAST_WATCH vale para quien pide: `on`, o `admins` y un administrador con sesión */
    broadcastOn(): Promise<boolean>
    /** el mundo y su día de juego (game_state), o null sin mundo; una vez por petición */
    world(): Promise<WorldRef | null>
    /** `?diag=1` vale para quien pide: un administrador con sesión (D-40, §11.15; 7b) */
    diagAllowed(): Promise<boolean>
  }
  interface FastifyInstance {
    spoilerRegistry: RouteRegistry
  }
}

export interface SpoilerGuardDeps {
  readonly db: Database
  /** SPOILER_MODE (§10.13) */
  readonly mode: SwitchMode
  /** BROADCAST_WATCH */
  readonly broadcast: SwitchMode
  /** createCurrentUserId (routes/context.ts): getSession de better-auth */
  readonly currentUserId: (request: FastifyRequest) => Promise<string | null>
  /** isUserAdmin con ADMIN_EMAIL (app.ts) */
  readonly isAdmin: (userId: string) => Promise<boolean>
  /** SESSION_SECRET, que firma cs_viewer; null: la cookie ni se firma ni se lee */
  readonly viewerSecret: string | null
  /** APP_URL por https: cs_viewer lleva Secure, la regla de la cookie de sesión (auth.ts) */
  readonly secureCookies: boolean
}

/** Las rutas de un plugin de terceros que no admite `config`: la web compilada de @fastify/static. */
export const STATIC_ROUTES: ReadonlySet<string> = new Set(['/*'])

/**
 * El registro y los métodos de la petición. `deps` es null en una app sin base o sin better-auth (los
 * tests de /health): entonces `viewer()` da null, `horizon()` el del visitante, `world()` null y los
 * otros dos, falso; sin base no se registra ninguna ruta de juego, así que nadie los lee.
 *
 * Lanza al registrar una ruta sin política, una con horizonte (`horizon` o `watch`) sin mecanismo o
 * una L sin motivo (§14.5): `ready()` rechaza con el mensaje. Una `safe` sin `veil` es N. Las `HEAD`
 * que Fastify crea por cada `GET` heredan su `config` y pasan solas.
 */
export function registerSpoilerGuard(
  app: FastifyInstance,
  deps: SpoilerGuardDeps | null,
): RouteRegistry {
  const registry = new Map<string, RouteEntry>()
  app.addHook('onRoute', (r) => {
    const methods = Array.isArray(r.method) ? r.method : [r.method]
    const at = `${methods.join(',')} ${r.url}`
    const isStatic = STATIC_ROUTES.has(r.url) && r.config?.spoiler === undefined
    const policy: SpoilerPolicy | undefined = isStatic ? 'safe' : r.config?.spoiler
    if (policy === undefined)
      throw new Error(`ruta sin política de destripe (config.spoiler): ${at}`)
    const veil: VeilSpec | undefined = isStatic
      ? { by: ['N'], why: 'la web compilada: ningún dato de juego' }
      : (r.config?.veil ?? (policy === 'safe' ? { by: ['N'] } : undefined))
    if (veil === undefined) throw new Error(`ruta con horizonte sin mecanismo (config.veil): ${at}`)
    if (veil.by.includes('L') && (veil.why ?? '').trim() === '')
      throw new Error(`mecanismo L sin motivo escrito (config.veil.why): ${at}`)
    for (const method of methods)
      registry.set(`${method} ${r.url}`, {
        method,
        url: r.url,
        policy,
        veil,
        origin: isStatic ? 'static' : 'app',
      })
  })
  installViewerAndHorizon(app, deps)
  app.decorate('spoilerRegistry', registry)
  return registry
}

/** El espectador de una petición y si salió de la sesión (y no de cs_viewer): solo entonces se firma cs_viewer. */
interface ResolvedViewer {
  readonly viewer: Viewer
  readonly session: boolean
}

/**
 * Los cinco métodos de FastifyRequest, cada uno memorizado por petición en un WeakMap, y el gancho
 * onSend de las cabeceras (§14.9). Con `deps` null, inertes.
 */
function installViewerAndHorizon(app: FastifyInstance, deps: SpoilerGuardDeps | null): void {
  const viewers = new WeakMap<FastifyRequest, Promise<ResolvedViewer>>()
  const worlds = new WeakMap<FastifyRequest, Promise<WorldRef | null>>()
  const applies = new WeakMap<FastifyRequest, Promise<boolean>>()
  const admins = new WeakMap<FastifyRequest, Promise<boolean>>()
  const broadcasts = new WeakMap<FastifyRequest, Promise<boolean>>()
  const horizons = new WeakMap<FastifyRequest, Promise<Horizon>>()
  /** El usuario de una cookie de sesión, 60 s, solo los aciertos (10-n): sin él, cada informe y cada tramo leían la sesión en la base. */
  const sessionMemo = new TtlMemo<string>(SPOILER.horizonMemoS * 1000, SPOILER.horizonMemoEntries)

  const memo = <T>(
    map: WeakMap<FastifyRequest, Promise<T>>,
    request: FastifyRequest,
    make: () => Promise<T>,
  ): Promise<T> => {
    let p = map.get(request)
    if (p === undefined) {
      p = make()
      map.set(request, p)
    }
    return p
  }

  const resolveViewer = async (request: FastifyRequest): Promise<ResolvedViewer> => {
    if (deps === null) return { viewer: null, session: false }
    const nowMs = Date.now()
    const sessionCookie = getSessionCookie(toWebHeaders(request))
    let userId: string | null | undefined =
      sessionCookie === null ? undefined : sessionMemo.get(sessionCookie, nowMs)
    if (userId === undefined) {
      userId = await deps.currentUserId(request)
      if (userId !== null && sessionCookie !== null) sessionMemo.set(sessionCookie, userId, nowMs)
    }
    if (userId !== null) {
      // Sin esperar y con su .catch: en Node 22 un rechazo sin atender tumba el proceso (10-k).
      touchLastSeen(deps.db, userId).catch((err: unknown) =>
        request.log.warn({ err }, 'touchLastSeen'),
      )
      return { viewer: { userId, readOnly: false }, session: true }
    }
    const cookie =
      deps.viewerSecret === null
        ? null
        : readViewerCookie(
            cookieValue(request.headers.cookie, VIEWER_COOKIE),
            deps.viewerSecret,
            nowMs / 1000,
          )
    return {
      viewer: cookie === null ? null : { userId: cookie.userId, readOnly: true },
      session: false,
    }
  }
  const viewerOf = (request: FastifyRequest): Promise<ResolvedViewer> =>
    memo(viewers, request, () => resolveViewer(request))

  const worldOf = (request: FastifyRequest): Promise<WorldRef | null> =>
    memo(worlds, request, async () => {
      if (deps === null) return null
      const w = await getCurrentWorld(deps.db)
      return w === null ? null : { worldId: w.worldId, currentDay: w.currentDay }
    })

  const appliesOf = (request: FastifyRequest): Promise<boolean> =>
    memo(applies, request, async () => {
      if (deps === null || deps.mode === 'off') return false
      if (deps.mode === 'on') return true
      const { viewer } = await viewerOf(request)
      return viewer !== null && (await deps.isAdmin(viewer.userId))
    })

  /** Un administrador con SESIÓN (no con cs_viewer): el de `BROADCAST_WATCH=admins` y el de `?diag=1`. */
  const adminSessionOf = (request: FastifyRequest): Promise<boolean> =>
    memo(admins, request, async () => {
      if (deps === null) return false
      const { viewer, session } = await viewerOf(request)
      return viewer !== null && session && (await deps.isAdmin(viewer.userId))
    })

  app.decorateRequest('viewer', function (this: FastifyRequest): Promise<Viewer> {
    return viewerOf(this).then((r) => r.viewer)
  })
  app.decorateRequest('world', function (this: FastifyRequest): Promise<WorldRef | null> {
    return worldOf(this)
  })
  app.decorateRequest('spoilerApplies', function (this: FastifyRequest): Promise<boolean> {
    return appliesOf(this)
  })
  app.decorateRequest('broadcastOn', function (this: FastifyRequest): Promise<boolean> {
    return memo(broadcasts, this, async () => {
      if (deps === null || deps.broadcast === 'off') return false
      if (deps.broadcast === 'on') return true
      return adminSessionOf(this)
    })
  })
  app.decorateRequest('diagAllowed', function (this: FastifyRequest): Promise<boolean> {
    return adminSessionOf(this)
  })
  app.decorateRequest('horizon', function (this: FastifyRequest): Promise<Horizon> {
    return memo(horizons, this, async () => {
      const { viewer } = await viewerOf(this)
      // SPOILER_MODE alrededor de computeHorizon y no dentro (§10.13): con el modo apagado para quien
      // pide, el del mundo con sesión o con cookie, el del visitante sin nada, y ninguna consulta.
      if (deps === null || !(await appliesOf(this)))
        return viewer === null ? anonHorizon() : worldHorizon
      const w = await worldOf(this)
      return w === null ? worldHorizon : computeHorizon(deps.db, viewer, w)
    })
  })

  // LAS CABECERAS DE UNA RUTA CON HORIZONTE (§14.9): nada que dependa del horizonte se guarda para otra
  // cuenta, ni en el navegador ni en un intermediario. Añade `Cookie` a `Vary` sin quitar lo que haya
  // (el `accept-encoding` de @fastify/compress, que va después en la cadena de onSend).
  app.addHook('onSend', async (request, reply, payload) => {
    // La de un 404 no tiene config (fastify, request.js: `context.config?.method`).
    const config = request.routeOptions.config as FastifyContextConfig | undefined
    const policy = config?.spoiler
    if (policy !== 'horizon' && policy !== 'watch') return payload
    addVary(reply, 'Cookie')
    const ok = reply.statusCode >= 200 && reply.statusCode < 300
    if (!(ok && reply.hasHeader('cache-control')))
      void reply.header('cache-control', 'private, no-store')
    const resolved = viewers.get(request)
    if (deps === null || deps.viewerSecret === null || resolved === undefined) return payload
    const { viewer, session } = await resolved
    if (!session || viewer === null) return payload
    const nowS = Date.now() / 1000
    const came = readViewerCookie(
      cookieValue(request.headers.cookie, VIEWER_COOKIE),
      deps.viewerSecret,
      nowS,
    )
    if (came === null || came.userId !== viewer.userId || nowS - came.issuedAtS > DAY_S)
      appendSetCookie(
        reply,
        viewerCookieHeader(
          signViewerCookie(viewer.userId, deps.viewerSecret, nowS),
          deps.secureCookies,
        ),
      )
    return payload
  })
}

/** Añade un valor a `Vary` si no está ya (sin distinguir mayúsculas). */
function addVary(reply: FastifyReply, value: string): void {
  const prev = reply.getHeader('vary')
  const list = (Array.isArray(prev) ? prev.join(',') : prev === undefined ? '' : String(prev))
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v !== '')
  if (list.some((v) => v.toLowerCase() === value.toLowerCase() || v === '*')) return
  void reply.header('vary', [...list, value].join(', '))
}

/** Añade un Set-Cookie sin pisar los que ya lleve la respuesta: fastify acumula los de `set-cookie` (reply.js). */
export function appendSetCookie(reply: FastifyReply, cookie: string): void {
  void reply.header('set-cookie', cookie)
}

// ------------------------------------- `?diag=1` en la ficha de carrera y el feed (§11.15; paso 8a)

/** `?diag=1`, como `stageQuerySchema.diag` (§14.2): cualquier otro valor es como no mandarlo. */
const diagQuerySchema = z.object({ diag: z.literal('1').optional() })

/**
 * EL HORIZONTE DE UNA RUTA QUE ACEPTA `?diag=1` fuera de las de etapa (D-40, §11.15, decisión 11-h; 8a):
 * la ficha de carrera (`GET /api/calendar/:raceId`) y el feed (`GET /api/news` y
 * `GET /api/teams/:id/news`). Con el parámetro y un administrador con sesión, el del mundo: lo de antes,
 * sin velo, para cazar defectos en lo agregado, y sin escribir nada. Para cualquier otro, `horizon()`:
 * el parámetro no existe y la respuesta es la misma, byte a byte, que sin él. Las fichas, los rankings y
 * la portada no lo aceptan: no es ahí donde se depura una carrera.
 */
export async function diagHorizon(request: FastifyRequest): Promise<Horizon> {
  const diag = diagQuerySchema.safeParse(request.query).data?.diag === '1'
  if (diag && (await request.diagAllowed())) return worldHorizon
  return request.horizon()
}

// ------------------------------------------------------- la ruta de etapa (§14.1, 14-e; paso 7b)

/** Lo que `stageAccessOf` necesita saber de quien pide y de la etapa. */
export interface StageAccessInput {
  readonly h: Horizon
  /** SPOILER_MODE vale para quien pide: `on`, o `admins` y es administrador (§10.13) */
  readonly applies: boolean
  /** BROADCAST_WATCH vale para quien pide (§14.6): si no, no hay `Watch` que abrir */
  readonly watchOn: boolean
  /** su fila de race_watch (`readWatch`, §10.3); null sin sesión ni cookie, o sin fila */
  readonly row: WatchRow | null
  readonly raceKey: string
  readonly day: number
  readonly run: boolean
}

/**
 * QUÉ SIRVE LA RUTA DE ETAPA (§14.1, decisión 14-e; [DOC 5], D-50): el resultado solo si la pantalla lo
 * va a enseñar, que no es lo mismo que «si la etapa no está velada» (10-e). Vista (`W`, `S` o `R`), se
 * sirve. Arrastrada (`A`), caducada (`X`), fuera de guardia o la de cualquier visitante abren en `Watch`
 * (6-r, D-30, D-31, D-36): se sirven solo si no hay `Watch` que abrir y están fuera del velo, que es el
 * acta de siempre. Velada, nunca. Sin `SPOILER_MODE` para quien pide, el producto de hoy: todo, sin
 * `watch` (§10.13). `watch` dice lo visto: conocida con `W`, `S`, `R` o `A` (la `X` no, 10-e), vista
 * con `W`, `S` o `R` (6-r), lo alcanzado si está a medias, y la puerta de `stageGateOf`.
 */
export function stageAccessOf(a: StageAccessInput): {
  readonly serveResult: boolean
  readonly watch: WatchState | undefined
} {
  if (!a.applies) return { serveResult: true, watch: undefined }
  const letter = a.row !== null && a.day <= a.row.knownThrough ? a.row.how.charAt(a.day - 1) : ''
  const seen = letter === 'W' || letter === 'S' || letter === 'R'
  const known = seen || letter === 'A'
  const gate: StageGate | null = stageGateOf(a.h, a.raceKey, a.day)
  const reachedS = a.row !== null && a.row.watchingStage === a.day ? a.row.reachedS : null
  return {
    serveResult: a.run && (seen || (gate === null && !a.watchOn)),
    watch: { known, reachedS, gate, seen },
  }
}
