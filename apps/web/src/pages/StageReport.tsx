import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router-dom'
import { fetchStageReport, stageReportKey } from '../api/broadcast'
import { ApiError, GateError } from '../api/request'
import { fetchCalendarStage, stageReplayKey } from '../api/results'
import { authClient } from '../auth/client'
import { ShareStage } from '../components/ShareStage'
import { DiagnosticStrip, StageGateCard } from '../components/StageGate'
import { EmptyState } from '../components/ui/EmptyState'
import { Flag } from '../components/ui/Flag'
import { QueryView } from '../components/ui/QueryView'
import { TextLink } from '../components/ui/TextLink'
import { useOwnIds, useRaceIdentity } from '../components/useTableIdentity'
import { stageTitleInfo, usePageTitle } from '../domain/pageTitle'
import { diagOf, useHealth, useHorizonRev, useRevealActions, useWatchOn } from '../queryClient'
// de `stageView.tsx` y no de `StageReplay.tsx`: el acta no carga la página de la etapa ni el reproductor
import { StageReportView, raceKeyOf } from './stageView'

/**
 * EL ACTA COMPARTIBLE, `/world/races/:raceId/stages/:day/report` (E2, docs/retransmision.md §11.10;
 * D-36, DD-12; paso 9a). La vista de espectador que se comparte y que indexa un buscador: el resultado y
 * la crónica de una etapa corrida (`GET …/report`), pública, también para el visitante. Solo deja de ser
 * lo primero que se ve: la página de la etapa abre en `Watch` a quien no la ha visto.
 *
 * A quien tiene la etapa en el velo, la puerta (`This page shows the result of Stage 7. Watch it
 * instead?`, con `Watch` y `Show result`): el servidor no le manda el acta (403 con la puerta, que la web
 * lee como `GateError`). El título es el del acta (`Stage 7 report · Race France · Cycling Star`), el
 * mismo que inyecta el fallback de la SPA antes del JavaScript (11-c), y sale de la ficha de la etapa, que
 * llega también con la puerta. Con `?diag=1`, un administrador la ve entera sin gastarla (§11.15).
 */
export function StageReportPage() {
  const { raceId = '', day = '' } = useParams()
  const [params] = useSearchParams()
  return (
    <ReportPage
      key={`${raceId}/${day}/${diagOf(params) ? 'diag' : ''}`}
      raceId={raceId}
      day={Number(day)}
    />
  )
}

function ReportPage({ raceId, day }: { raceId: string; day: number }) {
  const [params] = useSearchParams()
  const diag = diagOf(params)
  const rev = useHorizonRev()
  const session = authClient.useSession()
  // la ficha de la etapa: la carrera, el día y cuántas tiene (la cabecera y el título), sin resultado
  const stage = useQuery({
    queryKey: stageReplayKey(raceId, day, diag, rev),
    queryFn: () => fetchCalendarStage(raceId, day, { diag }),
    enabled: rev !== undefined,
    placeholderData: keepPreviousData,
  })
  const acta = useQuery({
    queryKey: stageReportKey(raceId, day, undefined, diag, rev),
    queryFn: () => fetchStageReport(raceId, day, undefined, { diag }),
    enabled: rev !== undefined,
    placeholderData: keepPreviousData,
  })
  const health = useHealth()
  const gate = acta.error instanceof GateError ? acta.error.gate : null
  // `Watch` encendido para quien mira, y si es un administrador (el modo diagnóstico y su botón)
  const { watchOn, isAdmin } = useWatchOn(diag || gate !== null)
  const readingWithCookie =
    !session.isPending &&
    session.data == null &&
    rev !== undefined &&
    !['anon', 'world', 'unavailable'].includes(rev)
  const actions = useRevealActions(
    readingWithCookie ? null : raceKeyOf(raceId, undefined, health.data?.gameDay),
    () => undefined,
  )
  usePageTitle(stageTitleInfo(stage.data ?? acta.data), 'report')
  // Lo que la llegada no trae (E3, PR 12b): el dorsal y el dibujo del equipo, y lo propio.
  const identidad = useRaceIdentity(raceId)
  const propio = useOwnIds()

  const info = stage.data ?? acta.data
  const race = info?.race
  const stagePath = `/world/races/${raceId}/stages/${day}`
  // el 404 del acta es la etapa sin correr: un vacío con su porqué, no un fallo
  const notRun =
    acta.data === undefined && acta.error instanceof ApiError && acta.error.status === 404
  const diagOn = diag && isAdmin

  return (
    <section className="space-y-4">
      {/* la cabeza del acta (E3, §14.2 y §14.6; PR 20): la carrera, a su ficha, y la página de la etapa */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 text-meta text-ink-2">
        <p className="flex min-w-0 flex-wrap items-center gap-x-1.5">
          {race?.country != null && <Flag country={race.country} height={12} />}
          <TextLink to={`/world/races/${raceId}`}>{race?.name ?? 'Back to the race'}</TextLink>
          {race && race.stageCount > 1 && (
            <span>
              · Stage {day} of {race.stageCount}
            </span>
          )}
        </p>
        <TextLink to={stagePath}>Stage page →</TextLink>
      </div>
      <header>
        <h1 className="text-title text-ink">{info?.name ?? `Stage ${day}`} · Report</h1>
      </header>

      {diagOn && <DiagnosticStrip exitHref={`/world/races/${raceId}/stages/${day}/report`} />}

      {/* Los estados del acta, con `QueryView` (E3, PR 10): la puerta del velo (el 403, `GateError`) y un
          fallo, que ya dice qué falló; la etapa sin correr (el 404), su vacío. */}
      {notRun ? (
        <EmptyState icon="race" text="This stage hasn't been raced yet." />
      ) : (
        <QueryView
          query={acta}
          label="the report"
          skeleton={{ kind: 'panel' }}
          gate={(g) => (
            <StageGateCard
              gate={g}
              stageDay={day}
              place="result"
              raceId={raceId}
              watchOn={watchOn}
              watchable={watchOn}
              actions={actions}
              signIn={readingWithCookie}
              diagHref={isAdmin ? `/world/races/${raceId}/stages/${day}/report?diag=1` : null}
            />
          )}
        >
          {(d) => (
            <>
              <ShareStage raceId={raceId} day={day} report />
              <StageReportView
                data={d}
                identity={identidad}
                ownRiderId={propio.riderId}
                answer
                // solo en una carrera por etapas: en una de un día, la ficha de la carrera no las tiene
                classificationsHref={
                  race !== undefined && race.stageCount > 1
                    ? `${stagePath}?tab=classifications`
                    : undefined
                }
              />
              {watchOn && <TextLink to={`${stagePath}?tab=watch`}>Watch this stage →</TextLink>}
            </>
          )}
        </QueryView>
      )}
    </section>
  )
}
