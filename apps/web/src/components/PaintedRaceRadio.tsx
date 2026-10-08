import type { BroadcastChunk, BroadcastHead, RaceS } from '@cyclingstar/shared'
import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { broadcastChunkKey, fetchBroadcastChunk } from '../api/broadcast'
import {
  chunkChainOf,
  missingSpansOf,
  paintedRadioFromChunks,
} from '../domain/broadcast/paintedRadio'
import { RaceRadioPanel } from './RaceRadioPanel'

/**
 * LA RACE RADIO DE UNA ETAPA SIN VER, HASTA LO PINTADO (E2, docs/retransmision.md §11.16 y §12.10;
 * decisión 11-i; paso 11a). Sustituye en la pestaña a la puerta del 7b al 10, en el velo y con línea
 * grabada: la radio que la web construye con la cabecera y los tramos de `Watch` cortados en lo que ha
 * visto quien mira (`paintedRadio.ts`), con solo las fotos cerradas, el deslizador hasta la última y sin
 * `Finish`. Los tramos son los de la caché de `Watch` (su misma clave) y, si faltan hasta lo alcanzado,
 * se piden igual que los pide el reproductor; uno que no llega corta ahí la radio, que enseña lo que hay
 * y nunca más.
 */
export function PaintedRaceRadio({
  head,
  raceId,
  day,
  reachedS,
  onWatch,
}: {
  head: BroadcastHead
  raceId: string
  day: number
  /** lo alcanzado: el mayor de lo que dice la cabecera (o el `localStorage` del visitante) y lo visto aquí */
  reachedS: RaceS
  onWatch?: () => void
}) {
  const queryClient = useQueryClient()
  const reachedDs = Math.floor(reachedS * 10 + 1e-6)
  const chunks = useQuery({
    queryKey: ['painted-radio', raceId, day, reachedDs],
    queryFn: () => paintedChunks(queryClient, raceId, day, reachedS),
    staleTime: Number.POSITIVE_INFINITY,
  })
  const radio = useMemo(
    () => (chunks.data === undefined ? null : paintedRadioFromChunks(head, chunks.data, reachedS)),
    [head, chunks.data, reachedS],
  )
  if (radio === null) return <p className="text-slate-500">Loading…</p>
  if (radio.kms.length === 0)
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Race Radio</h2>
        <p className="mt-1 text-sm text-slate-500">
          Nothing to show yet: the race radio fills in as far as you&apos;ve watched.
        </p>
        {onWatch && (
          <button
            type="button"
            onClick={onWatch}
            className="mt-3 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Watch
          </button>
        )}
      </div>
    )
  return <RaceRadioPanel radio={radio} painted />
}

/**
 * Los tramos de la etapa hasta lo alcanzado: los de la caché que se juntan desde 0 (`chunkChainOf`) y los
 * que falten, pedidos con la clave de `Watch` para que el reproductor también los encuentre. Sin el modo
 * diagnóstico, que sirve la ficha entera y no pasa por aquí.
 */
async function paintedChunks(
  queryClient: QueryClient,
  raceId: string,
  day: number,
  reachedS: RaceS,
): Promise<BroadcastChunk[]> {
  const cached = queryClient
    .getQueriesData<BroadcastChunk>({ queryKey: ['broadcast-chunk', raceId, day, undefined] })
    .flatMap(([key, data]) => (data !== undefined && key[6] === false ? [data] : []))
  const chain = chunkChainOf(cached)
  const end = chain.at(-1)
  if (end?.atFinish === true) return chain
  for (const [fromDs, toDs] of missingSpansOf(end?.toDs ?? 0, reachedS)) {
    try {
      const chunk = await queryClient.fetchQuery({
        queryKey: broadcastChunkKey(raceId, day, undefined, fromDs, toDs),
        queryFn: () => fetchBroadcastChunk(raceId, day, fromDs, toDs),
      })
      chain.push(chunk)
      if (chunk.atFinish) break
    } catch {
      // lo que no llega no se pinta: la radio se queda en lo que hay (nunca enseña de más)
      break
    }
  }
  return chain
}
