/**
 * `WATCH` ENCENDIDO PARA QUIEN MIRA (E2, docs/retransmision.md §11.17 y §14.6; 11-h): lo mismo que decide
 * `request.broadcastOn()` en la API. `BROADCAST_WATCH` viene en `/health` (`features.broadcastWatch`, que la
 * cabecera pide ya en toda página): `on`, para todos; `admins`, solo para un administrador con sesión,
 * que la web sabe por `GET /api/admin/whoami` (`routes/admin.ts`, `api/admin.ts`); `off` o una API sin
 * interruptores, para nadie.
 *
 * Nació dentro de la página de etapa (9a) y el 9b lo saca aquí para la ficha de carrera, la de una
 * carrera de un día y el acta: la pestaña `Report` se llama `Story` y la carrera de un día terminada abre
 * en `Result` mientras `Watch` esté apagado para quien mira (§20.5).
 */
import { useQuery } from '@tanstack/react-query'
import { fetchAdminWhoami } from './api/admin'
import { useHealth } from './queryClient'

export interface WatchSwitch {
  /** `Watch` encendido para quien mira */
  readonly watchOn: boolean
  /** un administrador con sesión: el de `admins` y el del modo diagnóstico (§11.15) */
  readonly isAdmin: boolean
  /** ya se sabe `watchOn`: el interruptor y, con `admins`, quién mira */
  readonly settled: boolean
  /** ya se sabe `isAdmin` (o no se ha pedido) */
  readonly adminSettled: boolean
}

/**
 * `needAdmin`: saber si es administrador aunque el interruptor no lo pida (el modo diagnóstico, una puerta
 * o un velo que ofrece `Diagnostic view`). `whoami` se pide solo entonces o con `admins`: un 401 para un
 * jugador, que la web lee como nadie (`requestOptionalAuth`).
 */
export function useWatchOn(needAdmin = false): WatchSwitch {
  const health = useHealth()
  const watchSwitch = health.data?.features?.broadcastWatch ?? 'off'
  const wanted = watchSwitch === 'admins' || needAdmin
  const whoami = useQuery({
    queryKey: ['admin-whoami'],
    queryFn: fetchAdminWhoami,
    retry: false,
    enabled: wanted,
  })
  const isAdmin = whoami.data?.via === 'session'
  return {
    watchOn: watchSwitch === 'on' || (watchSwitch === 'admins' && isAdmin),
    isAdmin,
    settled: !health.isPending && (watchSwitch !== 'admins' || !whoami.isPending),
    adminSettled: !wanted || !whoami.isPending,
  }
}
