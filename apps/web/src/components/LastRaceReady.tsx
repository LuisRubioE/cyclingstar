import { type PreStageInfo, raceIdFromKey } from '@cyclingstar/shared'
import { lastRaceReadyText, readyRaceKey } from '../domain/veil'
import { useHorizon } from '../queryClient'
import { Panel } from './ui/Panel'
import { TextLink } from './ui/TextLink'

/**
 * LA ÚLTIMA CARRERA, VELADA (E2, docs/retransmision.md §11.4; D-47; sups. H1 y H5; paso 9b). Si la última
 * etapa que corrió su corredor está en el velo de quien mira, `GET /api/riders/me/last-race` trae `ready`
 * (su `PreStageInfo`: carrera, etapa, km y tipo, nada del desenlace) y la tarjeta dice `Race France, Stage 8
 * · Ready to watch`, con `Watch` en lugar de `Open stage`. La carrera para el enlace sale del horizonte,
 * porque la `PreStageInfo` no lleva su id (D-42).
 *
 * Con el sistema desde el 21g de E3 (docs/visual.md §17.21): su `Panel`, con el título de quien la pinta
 * (`Last race` en la portada, `Your last race` en la ficha), y `Watch`, un `TextLink` de 44 en su cabecera,
 * donde la otra cara lleva `Open stage` (`Full story` hasta W4). Antes, un botón cian de 28 px con el
 * texto a 3,3:1.
 */
export function LastRaceReady({
  ready,
  title,
}: {
  readonly ready: PreStageInfo
  readonly title: string
}) {
  const horizon = useHorizon()
  const raceKey = readyRaceKey(horizon.data, ready)
  return (
    <Panel
      title={title}
      action={
        raceKey === null ? null : (
          <TextLink to={`/world/races/${raceIdFromKey(raceKey)}/stages/${ready.stageDay}`}>
            Watch
          </TextLink>
        )
      }
    >
      <p className="text-row font-semibold text-ink">{lastRaceReadyText(ready)}</p>
    </Panel>
  )
}
