import { buildApp } from './app.js'

/**
 * Punto de arranque del servicio `web` de Railway: `node apps/api/dist/index.js` (SPEC 12).
 * Escucha en el puerto que inyecta la plataforma (PORT) y en 0.0.0.0.
 */
const app = buildApp({ logger: true })
const port = Number(process.env.PORT ?? 3000)
const host = '0.0.0.0'

app.listen({ port, host }).catch((err: unknown) => {
  app.log.error(err)
  process.exitCode = 1
})
