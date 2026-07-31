import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import fastifyStatic from '@fastify/static'
import { type Database, gameState } from '@cyclingstar/db'
import { ENGINE_VERSION } from '@cyclingstar/engine'
import type { Health } from '@cyclingstar/shared'
import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type FastifyServerOptions,
} from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'

export interface AppDeps {
  /** Base de datos (opcional en tests). Cuando está, /health lee la fecha de juego. */
  db?: Database
  /** Si las migraciones se aplicaron al arrancar (SPEC 12). */
  migrationsApplied?: boolean
  /** Config del logger pino de Fastify. */
  logger?: FastifyServerOptions['logger']
  /** Servir la web compilada. Por defecto se autodetecta si existe la build de Vite. */
  serveWeb?: boolean
}

/** Carpeta de la web compilada (apps/web/dist). Vacía de index.html hasta el Paso 8. */
const webRoot = fileURLToPath(new URL('../../web/dist', import.meta.url))

/**
 * Construye la instancia de Fastify de la API (SPEC 12).
 * Paso 7: logging pino, validación Zod en los bordes, manejo uniforme de errores,
 * servido de los estáticos de apps/web (latente hasta que exista la build) y /health.
 */
export function buildApp(deps: AppDeps = {}): FastifyInstance {
  const app = Fastify({ logger: deps.logger ?? false })

  // Zod como validador/serializador en los bordes: las rutas futuras validan su
  // entrada y salida con esquemas Zod.
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // Manejo uniforme de errores.
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (error.validation) {
      reply.status(400).send({ ok: false, error: 'validacion', detalles: error.validation })
      return
    }
    const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500
    if (statusCode >= 500) {
      request.log.error(error)
      reply.status(500).send({ ok: false, error: 'interno' })
      return
    }
    reply.status(statusCode).send({ ok: false, error: error.message })
  })

  app.get('/health', async (): Promise<Health> => {
    let gameDay: number | null = null
    if (deps.db) {
      const rows = await deps.db
        .select({ currentDay: gameState.currentDay })
        .from(gameState)
        .limit(1)
      gameDay = rows[0]?.currentDay ?? null
    }
    return {
      ok: true,
      engineVersion: ENGINE_VERSION,
      gameDay,
      migrationsApplied: deps.migrationsApplied ?? false,
    }
  })

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
      reply.status(404).send({ ok: false, error: 'no_encontrado' })
    })
  } else {
    app.setNotFoundHandler((_request, reply) => {
      reply.status(404).send({ ok: false, error: 'no_encontrado' })
    })
  }

  return app
}
