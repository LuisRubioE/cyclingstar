import Fastify, { type FastifyInstance } from 'fastify'

/**
 * apps/api: monolito Fastify que sirve API y estáticos de Vite (SPEC 12).
 *
 * Paso 4: solo el "hola mundo" desplegable con la ruta GET /health -> { ok: true }.
 * El logging pino completo, la validación Zod en los bordes, el manejo uniforme de errores
 * y el servido de los estáticos de apps/web llegan en el Paso 7.
 */
export function buildApp(options: { logger?: boolean } = {}): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? false })

  app.get('/health', () => {
    return { ok: true }
  })

  return app
}
