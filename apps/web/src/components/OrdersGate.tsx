import { raceIdFromKey } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { broadcastHeadKey, fetchBroadcastHead } from '../api/broadcast'
import { useHorizon, useHorizonRev, useRevealActions, useWatchOn } from '../queryClient'
import { RevealConfirm } from './StageGate'
import { Button } from './ui/Button'
import { Panel } from './ui/Panel'

/**
 * LA PUERTA DE LAS ÓRDENES DE LA N+1 (E2, docs/retransmision.md §11.12, punto 3; D-37, DD-09; paso 9b). La
 * página de órdenes de una carrera con una etapa corrida y no conocida abre con `Stage 6 is waiting for
 * you` · `Watch (about 9 min)` · `Show result` · `Give orders anyway`. Los minutos son los de la cabecera
 * de la retransmisión (`estimateS`, de `playbackEstimateS`: solo el recorrido, §8.2), que solo se pide con
 * `Watch` encendido; sin él, `Open stage`, que lleva a la página de la etapa con su puerta. `Show result` revela la etapa (y arrastra las anteriores que faltaran), con su
 * confirmación la primera vez. `Give orders anyway` deja la página tal cual: la respuesta de las órdenes
 * no lleva la general, sus compañeros y rivales no miran el abandono, y los rivales se ordenan por una fama
 * que no se escribe (sup. W6).
 *
 * Con el sistema desde el 21i de E3 (docs/visual.md §17.21): su `Panel`, con el aviso por título, que contesta
 * la pantalla mientras espera (§7.3); verla, un `Button` `primary` que enlaza a la etapa, y revelarla y
 * ordenar igual, `secondary`; el fallo, en su `alert`.
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
    <Panel title={`Stage ${stageDay} is waiting for you`} answer>
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button to={`/world/races/${raceId}/stages/${stageDay}`} variant="primary">
            {!watchOn ? 'Open stage' : minutes === null ? 'Watch' : `Watch (about ${minutes} min)`}
          </Button>
          {actions !== null && !confirming && (
            <Button
              variant="secondary"
              busy={busy}
              onClick={() => (actions.askFirst ? setConfirming(true) : void reveal(false))}
            >
              Show result
            </Button>
          )}
          <Button variant="secondary" onClick={onGiveOrders}>
            Give orders anyway
          </Button>
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
        {failed && (
          <p role="alert" className="text-meta text-bad">
            Could not show the result.
          </p>
        )}
      </div>
    </Panel>
  )
}
