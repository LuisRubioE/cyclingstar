import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { fetchStageReport, stageReportKey } from '../api/broadcast'
import { ApiError, GateError } from '../api/request'
import { diagOf, fetchCalendarStage, stageReplayKey } from '../api/results'
import { authClient } from '../auth/client'
import { Flag } from '../components/Flag'
import { ShareStage } from '../components/ShareStage'
import { DiagnosticStrip, StageGateCard } from '../components/StageGate'
import { stageTitleInfo, usePageTitle } from '../domain/pageTitle'
import { useHealth, useHorizonRev } from '../queryClient'
import { useWatchOn } from '../watchSwitch'
import { StageReportView, raceKeyOf, useRevealActions } from './StageReplay'

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

  const info = stage.data ?? acta.data
  const race = info?.race
  const stagePath = `/world/races/${raceId}/stages/${day}`
  const notRun = acta.error instanceof ApiError && acta.error.status === 404
  const diagOn = diag && isAdmin

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to={`/world/races/${raceId}`}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
        >
          <span aria-hidden>←</span>
          {race?.country && <Flag code={race.country} size={14} />}
          <span className="font-medium">{race?.name ?? 'Back to the race'}</span>
          {race && race.stageCount > 1 && (
            <span className="text-slate-400">
              · Stage {day} of {race.stageCount}
            </span>
          )}
        </Link>
        <Link to={stagePath} className="text-xs font-medium text-brand-cyan hover:underline">
          Stage page →
        </Link>
      </div>
      <header>
        <h1 className="text-xl font-bold tracking-tight text-slate-800">
          {info?.name ?? `Stage ${day}`} · Report
        </h1>
      </header>

      {diagOn && <DiagnosticStrip exitHref={`/world/races/${raceId}/stages/${day}/report`} />}

      {rev === undefined || acta.isPending ? (
        <p className="text-slate-500">Loading…</p>
      ) : gate !== null ? (
        <StageGateCard
          gate={gate}
          stageDay={day}
          place="result"
          raceId={raceId}
          watchOn={watchOn}
          watchable={watchOn}
          actions={actions}
          signIn={readingWithCookie}
          diagHref={isAdmin ? `/world/races/${raceId}/stages/${day}/report?diag=1` : null}
        />
      ) : notRun ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">This stage hasn&apos;t been raced yet.</p>
        </div>
      ) : acta.isError ? (
        <p className="text-red-600">Could not load the report.</p>
      ) : (
        <>
          <ShareStage raceId={raceId} day={day} report />
          <StageReportView data={acta.data} />
          {watchOn && (
            <p className="text-sm">
              <Link to={`${stagePath}?tab=watch`} className="font-medium text-brand-cyan">
                Watch this stage →
              </Link>
            </p>
          )}
        </>
      )}
    </section>
  )
}
