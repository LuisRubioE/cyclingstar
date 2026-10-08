import { type PreStageInfo, raceIdFromKey } from '@cyclingstar/shared'
import { Link } from 'react-router-dom'
import { lastRaceReadyText, readyRaceKey } from '../domain/veil'
import { useHorizon } from '../queryClient'

/**
 * LA ÚLTIMA CARRERA, VELADA (E2, docs/retransmision.md §11.4; D-47; sups. H1 y H5; paso 9b). Si la última
 * etapa que corrió su corredor está en el velo de quien mira, `GET /api/riders/me/last-race` trae `ready`
 * (su `PreStageInfo`: carrera, etapa, km y tipo, nada del desenlace) y la tarjeta dice `Your last race ·
 * Race France, Stage 8 · Ready to watch`, con `Watch` en lugar de `Full story →`. La carrera para el enlace
 * sale del horizonte, porque la `PreStageInfo` no lleva su id (D-42).
 */
export function LastRaceReady({ ready }: { ready: PreStageInfo }) {
  const horizon = useHorizon()
  const raceKey = readyRaceKey(horizon.data, ready)
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-semibold text-slate-800">{lastRaceReadyText(ready)}</p>
      {raceKey !== null && (
        <Link
          to={`/world/races/${raceIdFromKey(raceKey)}/stages/${ready.stageDay}`}
          className="shrink-0 rounded-md bg-brand-cyan px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-cyan-light"
        >
          Watch
        </Link>
      )}
    </div>
  )
}
