import type { FastifyInstance } from 'fastify'
import { apiError } from './http.js'

/**
 * LA PUERTA DE LA FECHA EN LA API (docs/cuenta.md §4.5; D-09, 4-g). Una cuenta sin `birth_date` (las de antes
 * del PR 9 de E4) no escribe nada hasta darla: un gancho `preHandler` de la app, global y no de un grupo de
 * rutas, responde 403 `BIRTH_DATE_REQUIRED` a toda petición con sesión que no sea de lectura bajo `/api/`,
 * salvo las de esta lista. Así cubre también las rutas de juego que no cuelgan de `/api/riders/*` ni de
 * `/api/me/*` (`POST /api/teams/take-over`, `PUT /api/my-orders`…). Sin sesión no hace nada: la ruta da su
 * 401. `birthDate.test.ts` recorre las rutas registradas (`onRoute`) y exige el 403 en cada una que no esté
 * aquí.
 *
 * Lo que queda fuera (la puerta no bloquea salir, leer las condiciones ni borrar la cuenta): el proxy de
 * better-auth (salir, borrar la cuenta), el panel, los webhooks, dar la fecha, exportar los datos, los
 * aparatos y los avisos. La lista vive aquí, junto al gancho (O-11).
 */
export const BIRTH_DATE_GATE_EXEMPT: readonly {
  readonly method?: string
  readonly path: string
  /** la ruta y todo lo que cuelga de ella (`/api/auth` y `/api/auth/*`) */
  readonly prefix?: true
}[] = [
  { path: '/api/auth', prefix: true },
  { path: '/api/admin', prefix: true },
  { path: '/api/webhooks', prefix: true },
  { method: 'PUT', path: '/api/me/birth-date' },
  { method: 'POST', path: '/api/me/export' },
  { path: '/api/me/devices', prefix: true },
  { path: '/api/me/push-targets', prefix: true },
  { path: '/api/me/notices', prefix: true },
]

/** Los métodos que solo leen: la puerta no los mira. */
const LECTURAS: ReadonlySet<string> = new Set(['GET', 'HEAD'])

/** ¿Pasa la petición por la puerta? `url` es la plantilla de la ruta (`/api/teams/me/calendar/:raceId`). */
export function birthDateGateApplies(method: string, url: string): boolean {
  if (LECTURAS.has(method) || !url.startsWith('/api/')) return false
  // `/api/me/push-targets*` y `/api/me/notices*` casan también sin barra (`/api/me/notices-seen`).
  return !BIRTH_DATE_GATE_EXEMPT.some(
    (e) =>
      (e.method === undefined || e.method === method) &&
      (e.prefix ? url.startsWith(e.path) : url === e.path),
  )
}

/**
 * Instala el gancho. `hasBirthDate` dice si la cuenta tiene fecha (null si no existe: entonces la ruta
 * responde lo suyo). El usuario sale de `request.viewer()`, memorizado por petición, así que la ruta no
 * vuelve a leer la sesión; una `cs_viewer` sola (solo lectura) no cuenta como sesión.
 */
export function registerBirthDateGate(
  app: FastifyInstance,
  hasBirthDate: (userId: string) => Promise<boolean | null>,
): void {
  app.addHook('preHandler', async (request, reply) => {
    const url = request.routeOptions.url
    if (url === undefined || !birthDateGateApplies(request.method, url)) return
    const viewer = await request.viewer()
    if (viewer === null || viewer.readOnly) return
    if ((await hasBirthDate(viewer.userId)) !== false) return
    return reply.status(403).send(apiError('BIRTH_DATE_REQUIRED'))
  })
}
