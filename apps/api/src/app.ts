import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import fastifyHelmet from '@fastify/helmet'
import fastifyRateLimit from '@fastify/rate-limit'
import fastifyStatic from '@fastify/static'
import type { Database, TickSummary } from '@cyclingstar/db'
import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type FastifyServerOptions,
} from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import type { Auth } from './auth.js'
import { apiError } from './http.js'
import { adminRoutes } from './routes/admin.js'
import { authProxyRoutes } from './routes/authProxy.js'
import { calendarRoutes } from './routes/calendar.js'
import { type RouteContext, createCurrentUserId } from './routes/context.js'
import { healthRoutes } from './routes/health.js'
import { raceRoutes } from './routes/races.js'
import { rankingRoutes } from './routes/rankings.js'
import { riderRoutes } from './routes/riders.js'
import { teamRoutes } from './routes/teams.js'
import { worldRoutes } from './routes/world.js'
import { GLOBAL_RATE_LIMIT, createAdminGuard } from './security.js'

export interface AppDeps {
  /** Base de datos (opcional en tests). Cuando está, /health lee la fecha de juego. */
  db?: Database
  /** Si las migraciones se aplicaron al arrancar (SPEC 12). */
  migrationsApplied?: boolean
  /** Minutos reales por día de juego (TICK_INTERVAL_MINUTES); lo reporta /health. */
  tickIntervalMinutes?: number
  /** Config del logger pino de Fastify. */
  logger?: FastifyServerOptions['logger']
  /** Servir la web compilada. Por defecto se autodetecta si existe la build de Vite. */
  serveWeb?: boolean
  /** Instancia de better-auth; si está, se monta en /api/auth/* (Paso 9). */
  auth?: Auth
  /** Token que protege las rutas de admin y el avance del mundo (Paso 10). */
  adminToken?: string
  /** Ejecutor del tick manual para POST /admin/tick (Paso 10). */
  onAdminTick?: () => Promise<TickSummary>
  /** Avance forzado de N días de juego para pruebas: POST /admin/advance (Paso 32). */
  onAdminAdvance?: (days: number) => Promise<TickSummary>
}

/** Carpeta de la web compilada (apps/web/dist). Vacía de index.html hasta el Paso 8. */
const webRoot = fileURLToPath(new URL('../../web/dist', import.meta.url))

/**
 * Construye la instancia de Fastify de la API (SPEC 12): logging pino, validación Zod en los
 * bordes, cabeceras de seguridad, rate limiting, manejo uniforme de errores y servido de los
 * estáticos de apps/web.
 *
 * Las rutas viven en plugins por dominio bajo `routes/` (admin, auth, riders, teams, races,
 * calendar, rankings, world). Además de ordenar el código, registrarlas como plugins es lo que
 * hace efectivo el rate limiting: los hooks de Fastify solo alcanzan a las rutas declaradas
 * DESPUÉS del plugin que los instala, y los plugins se cargan en el orden en que se registran.
 */
export function buildApp(deps: AppDeps = {}): FastifyInstance {
  // trustProxy: detrás del proxy de Railway (TLS terminado), para resolver bien
  // protocolo (https), host e IP de cliente a partir de las cabeceras X-Forwarded-*.
  const app = Fastify({ logger: deps.logger ?? false, trustProxy: true })

  // Zod como validador/serializador en los bordes: las rutas validan su entrada con esquemas Zod.
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // Cabeceras de seguridad (@fastify/helmet).
  //
  // La CSP es deliberadamente pragmática, no máxima: la SPA se sirve desde el MISMO origen que la
  // API, así que 'self' cubre scripts, estilos y fetch. Se deja `style-src 'unsafe-inline'` porque
  // la web inyecta las altimetrías como SVG en línea (con atributos style) y React aplica estilos
  // en línea; sin eso la web se rompe. El resto queda cerrado: nada de objetos, nada de iframes de
  // terceros y nadie puede embebernos (frame-ancestors 'none').
  void app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        formAction: ["'self'"],
      },
    },
    // No servimos recursos que necesiten aislamiento cruzado; activarlo rompería la carga de la web.
    crossOriginEmbedderPolicy: false,
    // HSTS: 180 días. Railway termina el TLS delante, la app siempre se sirve por https.
    hsts: { maxAge: 15_552_000, includeSubDomains: true },
  })

  // Rate limiting global por IP (@fastify/rate-limit). Antes no había ninguno: /api/auth/* aceptaba
  // intentos de contraseña ilimitados. Los límites concretos y su porqué están en security.ts.
  void app.register(fastifyRateLimit, {
    global: true,
    ...GLOBAL_RATE_LIMIT,
    // trustProxy ya está activo: la clave es la IP real del cliente, no la del proxy de Railway.
    // El plugin LANZA lo que devuelva este constructor, así que hay que devolver un Error con
    // statusCode; el manejador de errores lo traduce al formato uniforme `{ ok, error }`.
    errorResponseBuilder: (_request, context) => {
      const err = new Error('demasiadas_peticiones') as Error & { statusCode: number }
      err.statusCode = context.statusCode
      return err
    },
  })

  // Guarda de admin (ADMIN_TOKEN en x-admin-token), en tiempo constante. Único punto de control.
  const requireAdmin = createAdminGuard(deps.adminToken)

  // Manejo uniforme de errores: SIEMPRE `{ ok: false, error: <codigo> }` (ver http.ts). Las
  // validaciones nativas de Fastify+Zod adjuntaban `detalles: error.validation`, que describe la
  // forma interna del esquema; ahora usan el mismo formato opaco que las validaciones manuales.
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (error.validation) {
      // El detalle se queda en el log del servidor, no en la respuesta.
      request.log.debug({ validation: error.validation }, 'validacion de entrada fallida')
      reply.status(400).send(apiError('validacion'))
      return
    }
    const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500
    if (statusCode >= 500) {
      request.log.error(error)
      reply.status(500).send(apiError('interno'))
      return
    }
    reply.status(statusCode).send(apiError(error.message))
  })

  void app.register(healthRoutes, {
    ...(deps.db ? { db: deps.db } : {}),
    ...(deps.migrationsApplied !== undefined ? { migrationsApplied: deps.migrationsApplied } : {}),
    ...(deps.tickIntervalMinutes !== undefined
      ? { tickIntervalMinutes: deps.tickIntervalMinutes }
      : {}),
  })

  // Rutas de admin: necesitan base de datos (lista de bloqueo, censo, premium) y el token.
  if (deps.db) {
    void app.register(adminRoutes, {
      db: deps.db,
      requireAdmin,
      ...(deps.onAdminTick ? { onAdminTick: deps.onAdminTick } : {}),
      ...(deps.onAdminAdvance ? { onAdminAdvance: deps.onAdminAdvance } : {}),
    })
  }

  // Montaje de better-auth en /api/auth/* (Paso 9).
  if (deps.auth) {
    void app.register(authProxyRoutes, { auth: deps.auth })
  }

  // Rutas de juego: requieren sesión (better-auth) y base de datos.
  if (deps.auth && deps.db) {
    const ctx: RouteContext = {
      db: deps.db,
      auth: deps.auth,
      currentUserId: createCurrentUserId(deps.auth),
      requireAdmin,
    }
    void app.register(riderRoutes, ctx)
    void app.register(teamRoutes, ctx)
    void app.register(raceRoutes, ctx)
    void app.register(calendarRoutes, ctx)
    void app.register(rankingRoutes, ctx)
    if (deps.onAdminAdvance) {
      void app.register(worldRoutes, { requireAdmin, onAdminAdvance: deps.onAdminAdvance })
    }
  }

  // Servido de la web: por defecto se activa si existe una build con index.html.
  const serveWeb = deps.serveWeb ?? existsSync(join(webRoot, 'index.html'))
  if (serveWeb) {
    void app.register(fastifyStatic, { root: webRoot })
    app.setNotFoundHandler((request, reply) => {
      const isApiPath = request.url.startsWith('/api') || request.url.startsWith('/health')
      if (request.method === 'GET' && !isApiPath) {
        // Fallback SPA: cualquier ruta desconocida sirve el index de la web.
        void reply.sendFile('index.html')
        return
      }
      reply.status(404).send(apiError('no_encontrado'))
    })
  } else {
    app.setNotFoundHandler((_request, reply) => {
      reply.status(404).send(apiError('no_encontrado'))
    })
  }

  return app
}
