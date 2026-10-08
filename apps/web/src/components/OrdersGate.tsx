import { raceIdFromKey } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { broadcastHeadKey, fetchBroadcastHead } from '../api/broadcast'
import { useHorizon, useHorizonRev } from '../queryClient'
import { useWatchOn } from '../watchSwitch'
import { RevealConfirm, useRevealActions } from './StageGate'

const primary =
  'rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60'
const secondary =
  'rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-60'

/**
 * LA PUERTA DE LAS ÓRDENES DE LA N+1 (E2, docs/retransmision.md §11.12, punto 3; D-37, DD-09; paso 9b). La
 * página de órdenes de una carrera con una etapa corrida y no conocida abre con `Stage 6 is waiting for
 * you` · `Watch (about 9 min)` · `Show result` · `Give orders anyway`. Los minutos son los de la cabecera
 * de la retransmisión (`estimateS`, de `playbackEstimateS`: solo el recorrido, §8.2), que solo se pide con
 * `Watch` encendido; sin él, `Open stage`, que lleva a la página de la etapa con su puerta. `Show result` revela la etapa (y arrastra las anteriores que faltaran), con su
 * confirmación la primera vez. `Give orders anyway` deja la página tal cual: la respuesta de las órdenes
 * no lleva la general, sus compañeros y rivales no miran el abandono, y los rivales se ordenan por una fama
 * que no se escribe (sup. W6).
 */
export function OrdersGate({
  raceKey,
  stageDay,
  onGiveOrders,
}: {
  raceKey: string
  /** la etapa que espera: la primera corrida y no conocida de la carrera */
  stageDay: number
  onGiveOrders: () => void
}) {
  const raceId = raceIdFromKey(raceKey)
  const rev = useHorizonRev()
  const horizon = useHorizon()
  const { watchOn } = useWatchOn()
  const head = useQuery({
    queryKey: broadcastHeadKey(raceId, stageDay, undefined, false, rev),
    queryFn: () => fetchBroadcastHead(raceId, stageDay),
    enabled: watchOn && rev !== undefined,
  })
  const actions = useRevealActions(raceKey, () => undefined)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const minutes =
    watchOn && head.data !== undefined ? Math.max(1, Math.round(head.data.estimateS / 60)) : null
  // revelarla arrastra con `A` las anteriores que faltaran (§10.3): las veladas de antes
  const veiled = horizon.data?.ready.find((r) => r.raceKey === raceKey)?.stages ?? [stageDay]
  const also = veiled.filter((d) => d < stageDay)

  async function reveal(dontAsk: boolean): Promise<void> {
    if (actions === null) return
    setBusy(true)
    setFailed(false)
    try {
      if (dontAsk) await actions.dontAskAgain().catch(() => undefined)
      await actions.reveal(stageDay)
      setConfirming(false)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      role="region"
      aria-label="Not watched yet"
    >
      <p className="text-sm font-medium text-slate-800">Stage {stageDay} is waiting for you</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link to={`/world/races/${raceId}/stages/${stageDay}`} className={primary}>
          {!watchOn ? 'Open stage' : minutes === null ? 'Watch' : `Watch (about ${minutes} min)`}
        </Link>
        {actions !== null && !confirming && (
          <button
            type="button"
            className={secondary}
            disabled={busy}
            onClick={() => (actions.askFirst ? setConfirming(true) : void reveal(false))}
          >
            Show result
          </button>
        )}
        <button type="button" className={secondary} onClick={onGiveOrders}>
          Give orders anyway
        </button>
      </div>
      {confirming && (
        <RevealConfirm
          stageDay={stageDay}
          also={also}
          busy={busy}
          onConfirm={(dontAsk) => void reveal(dontAsk)}
          onCancel={() => setConfirming(false)}
        />
      )}
      {failed && <p className="mt-2 text-sm text-red-600">Could not show the result.</p>}
    </div>
  )
}
