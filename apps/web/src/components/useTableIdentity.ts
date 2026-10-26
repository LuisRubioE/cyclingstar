import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchTeams } from '../api/browse'
import { fetchStartlist } from '../api/race'
import { fetchMyRider, fetchRiderSummary } from '../api/rider'
import { useSessionState } from '../auth/useSessionState'
import {
  type TableIdentity,
  identityFromStartlist,
  identityFromTeams,
} from '../domain/tableIdentity'
import { horizonKey, useHorizonRev } from '../queryClient'

/**
 * Las consultas de lo que una fila de clasificación no trae (E3, docs/visual.md §6.1 y §6.2; PR 12b). Las
 * piden las páginas y se lo pasan a sus tablas, que siguen sin consultas: así se pintan en un test sin
 * `QueryClientProvider`.
 */

/**
 * El dorsal y el dibujo del equipo de una carrera: su lista de salida, la misma clave que `Race`. Con
 * `enabled` en falso (la ficha de etapa en `Watch`), no la pide.
 */
export function useRaceIdentity(raceId: string, enabled = true): TableIdentity {
  const startlist = useQuery({
    queryKey: ['race-startlist', raceId],
    queryFn: () => fetchStartlist(raceId),
    enabled,
  })
  return useMemo(() => identityFromStartlist(startlist.data), [startlist.data])
}

/** El dibujo del equipo de hoy, fuera de una carrera: `GET /api/teams`, la misma clave que `Teams`. */
export function useTeamsIdentity(): TableIdentity {
  const rev = useHorizonRev()
  const teams = useQuery({
    queryKey: horizonKey(['teams'], rev),
    queryFn: fetchTeams,
    enabled: rev !== undefined,
  })
  return useMemo(() => identityFromTeams(teams.data), [teams.data])
}

/**
 * Lo propio (§6.2; I-26): el corredor del jugador y su equipo, solo con la sesión confirmada. Las dos
 * claves son las de la cabecera y las demás páginas: casi siempre salen de la caché.
 */
export function useOwnIds(enabled = true): {
  readonly riderId: string | null
  readonly teamId: string | null
} {
  const { state } = useSessionState()
  const rev = useHorizonRev()
  const me = useQuery({
    queryKey: horizonKey(['rider', 'me'], rev),
    queryFn: fetchMyRider,
    enabled: enabled && state === 'signed-in' && rev !== undefined,
  })
  const summary = useQuery({
    queryKey: horizonKey(['rider', 'summary'], rev),
    queryFn: fetchRiderSummary,
    enabled: enabled && state === 'signed-in' && rev !== undefined,
  })
  return { riderId: me.data?.id ?? null, teamId: summary.data?.teamId ?? null }
}
