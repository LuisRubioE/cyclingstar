import { raceIdFromKey } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchForm } from '../api/form'
import { fetchHealth } from '../api/health'
import { fetchLastRace, lastRaceKey } from '../api/lastRace'
import { fetchMarket } from '../api/market'
import { fetchEnterableRaces } from '../api/raceEntry'
import { fetchRaceOrders } from '../api/raceOrders'
import { fetchMyRider, fetchMyUpcomingRaces, fetchRiderSummary } from '../api/rider'
import { fetchOrders } from '../api/training'
import { authClient } from '../auth/client'
import { Logo } from '../components/Logo'
import { LastRaceReady } from '../components/LastRaceReady'
import { InfoRow, Panel, SectionBar } from '../components/Panel'
import { StageRoute } from '../components/StageRoute'
import { StarRating } from '../components/StarRating'
import { TeamLink } from '../components/TeamLink'
import { WatchBlocks } from '../components/WatchBlocks'
import { WorldClock } from '../components/WorldClock'
import { type DashboardAction, buildDashboard } from '../domain/dashboard'
import { raceVerdict } from '../domain/narration'
import { horizonKey, useHorizonRev, veilApplies } from '../queryClient'

function SystemStatus() {
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth })
  return (
    <Panel title="System status">
      {health.isPending && <p className="text-slate-500">Checking…</p>}
      {health.isError && <p className="text-red-600">Could not reach the server.</p>}
      {health.data && (
        <div>
          <InfoRow label="Server">{health.data.ok ? 'Online' : 'Degraded'}</InfoRow>
          <InfoRow label="Engine version">{health.data.engineVersion}</InfoRow>
          <InfoRow label="Game day">
            {health.data.gameDay ?? 'the game has not started yet'}
          </InfoRow>
          <InfoRow label="Database">
            {health.data.migrationsApplied ? 'ready' : 'not migrated'}
          </InfoRow>
        </div>
      )}
    </Panel>
  )
}

/**
 * Guest landing: hero + how-to-play + system status. Quien vuelve sin sesión con `cs_viewer` lee el mundo
 * con el velo de su cuenta (§10.8): la portada de invitado no enseña resultados, y se lo dice (E2, §11.4;
 * 9b).
 */
function GuestHome() {
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth })
  return (
    <section className="space-y-4">
      {/* Solo con el velo para todos: con `admins`, un invitado no lo tiene, y preguntar por su cookie
          sería una petición más en cada portada de invitado. */}
      {health.data?.features?.spoilerMode === 'on' && <CookieReaderNotice />}
      <div className="space-y-4">
        <Logo size={96} className="mb-2" />
        <SectionBar>Race. Train. Rise.</SectionBar>
        <p className="max-w-xl text-slate-600">
          A persistent cycling world where your rider trains, gets called up, races a full season,
          signs contracts and builds a palmarès — and the world keeps moving without you.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/register"
            className="rounded-md bg-brand-cyan px-4 py-2.5 font-medium text-white transition hover:bg-brand-cyan-light"
          >
            Create account
          </Link>
          <Link
            to="/how-to-play"
            className="rounded-md border border-slate-300 px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-100"
          >
            How to play
          </Link>
        </div>
      </div>
      <SystemStatus />
    </section>
  )
}

/** `Sign in to see results as you know them` a quien lee con `cs_viewer` sin sesión (§10.8). */
function CookieReaderNotice() {
  const rev = useHorizonRev()
  if (!veilApplies(rev)) return null
  return (
    <p
      role="note"
      className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200"
    >
      <Link to="/login" className="font-medium underline">
        Sign in to see results as you know them
      </Link>
    </p>
  )
}

/** Logged in but no rider yet: a single clear next step. */
function NewPlayerHome() {
  return (
    <section className="space-y-4">
      <div className="space-y-4">
        <Logo size={80} className="mb-2" />
        <SectionBar>Welcome to Cycling Star</SectionBar>
        <p className="max-w-xl text-slate-600">
          You don't have a rider yet. Create one to enter the world — pick a specialty and a name,
          and you're on the start line.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/create"
            className="rounded-md bg-brand-cyan px-4 py-2.5 font-medium text-white transition hover:bg-brand-cyan-light"
          >
            Create your rider
          </Link>
          <Link
            to="/how-to-play"
            className="rounded-md border border-slate-300 px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-100"
          >
            How to play
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { title: 'Stars', text: 'Your abilities are shown in stars, never raw numbers.' },
          { title: 'Matches', text: 'A limited stock of efforts to burn wisely in a race.' },
          { title: 'Form', text: 'Train to improve, ease off to peak fresh for a goal.' },
        ].map((c) => (
          <div key={c.title} className="rounded-md bg-white p-4 shadow-sm ring-1 ring-black/5">
            <h3 className="text-sm font-semibold text-slate-800">{c.title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{c.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

const TONE_CLASS: Record<DashboardAction['tone'], string> = {
  urgent: 'border-l-4 border-l-rose-500 bg-rose-50/60',
  warn: 'border-l-4 border-l-amber-500 bg-amber-50/60',
  info: 'border-l-4 border-l-slate-300 bg-white',
}

/** Un aviso accionable: qué pasa, por qué importa y el único botón que lo resuelve. */
function ActionRow({ action }: { action: DashboardAction }) {
  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md px-4 py-3 ring-1 ring-black/5 ${TONE_CLASS[action.tone]}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{action.title}</p>
        {action.detail && <p className="text-xs text-slate-600">{action.detail}</p>}
      </div>
      <Link
        to={action.to}
        className="shrink-0 rounded-md bg-brand-cyan px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-cyan-light"
      >
        {action.cta} →
      </Link>
    </li>
  )
}

/**
 * Crónica de la última carrera corrida, con enlace a la etapa completa. Bajo el velo (E2, §11.4; sup. H1;
 * 9b), la de la última etapa CONOCIDA; si la última que corrió su corredor está velada, `Your last race ·
 * Race France, Stage 8 · Ready to watch` con `Watch` en lugar de `Full story →`.
 */
function LastRaceCard() {
  const rev = useHorizonRev()
  const last = useQuery({
    queryKey: lastRaceKey(rev),
    queryFn: fetchLastRace,
    enabled: rev !== undefined,
  })
  if (last.data?.ready != null)
    return (
      <Panel title="Last race">
        <LastRaceReady ready={last.data.ready} />
      </Panel>
    )
  const data = last.data?.report
  if (!data) return null
  const gap =
    data.position === 1
      ? 'winner'
      : data.timeGapToWinnerS > 0
        ? `+${Math.floor(data.timeGapToWinnerS / 60)}'${String(data.timeGapToWinnerS % 60).padStart(2, '0')}"`
        : 'same time'
  const highlight = data.personalEvents[data.personalEvents.length - 1] ?? null

  return (
    <Panel
      title="Last race"
      action={
        <Link
          to={`/world/races/${raceIdFromKey(data.raceId)}/stages/${data.stageDay}`}
          className="text-xs font-medium text-white/90 hover:text-white hover:underline"
        >
          Full story →
        </Link>
      }
    >
      <p className="text-sm font-semibold text-slate-800">
        {data.raceName} — {data.stageName}
        <StageRoute from={data.from} to={data.to} className="ml-2 font-normal text-slate-500" />
      </p>
      <p className="mt-0.5 text-sm text-slate-600">
        <span className="font-bold tabular-nums text-slate-800">{data.position}</span>
        {data.fieldSize > 0 && <span className="text-slate-400"> / {data.fieldSize}</span>}
        <span className="mx-1.5 text-slate-300">·</span>
        {gap}
        {highlight && (
          <>
            <span className="mx-1.5 text-slate-300">·</span>
            in the action at km {highlight.km}
          </>
        )}
      </p>
      <p className="mt-1 text-sm text-brand-cyan">{raceVerdict(data)}</p>
    </Panel>
  )
}

/** Panel del jugador: qué hago hoy, cómo estoy y qué pasó en mi última carrera. */
function PlayerHome({ name }: { name: string }) {
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth })
  const rev = useHorizonRev()
  const summary = useQuery({
    queryKey: horizonKey(['rider', 'summary'], rev),
    queryFn: fetchRiderSummary,
    enabled: rev !== undefined,
  })
  const training = useQuery({
    queryKey: horizonKey(['orders'], rev),
    queryFn: fetchOrders,
    enabled: rev !== undefined,
  })
  const upcoming = useQuery({
    queryKey: horizonKey(['rider', 'upcoming'], rev),
    queryFn: fetchMyUpcomingRaces,
    enabled: rev !== undefined,
  })
  const market = useQuery({ queryKey: ['market'], queryFn: fetchMarket })
  const form = useQuery({
    queryKey: horizonKey(['rider', 'form'], rev),
    queryFn: fetchForm,
    enabled: rev !== undefined,
  })

  // La carrera que toca: la que está en marcha o la más próxima. Sus órdenes deciden si hay aviso.
  const nextRace = upcoming.data?.find((r) => r.ongoing) ?? upcoming.data?.[0] ?? null
  const raceOrders = useQuery({
    queryKey: ['race-orders', nextRace?.raceKey],
    queryFn: () => fetchRaceOrders(nextRace!.raceKey),
    enabled: !!nextRace,
    // Si aún no estoy en la lista de salida el servidor responde 403: no hay nada que reintentar.
    retry: false,
  })

  const freeAgent = summary.data != null && summary.data.teamId == null
  const entries = useQuery({
    queryKey: ['race-entries'],
    queryFn: fetchEnterableRaces,
    enabled: freeAgent,
  })

  const planned = training.data?.orders ?? []
  const currentDay = training.data?.currentDay ?? 0
  const trainingPlannedDays = planned.reduce(
    (max, order) => Math.max(max, order.gameDay - currentDay),
    0,
  )
  const pendingEntries = (entries.data ?? []).filter((r) => r.entered).length

  const actions = buildDashboard({
    nextRace: nextRace
      ? {
          raceKey: nextRace.raceKey,
          raceName: nextRace.raceName,
          daysUntil: nextRace.daysUntil,
          ongoing: nextRace.ongoing,
          // Mientras no sepamos qué órdenes hay, no metemos ruido: se asume que están puestas.
          hasOrders: raceOrders.data ? raceOrders.data.orders.length > 0 : true,
        }
      : null,
    trainingPlannedDays: training.data ? trainingPlannedDays : 99,
    offers: market.data?.offers.length ?? 0,
    freeAgent,
    affordableEntries: (entries.data ?? []).filter((r) => !r.entered && r.affordable).length,
    bookedRaces: (upcoming.data?.length ?? 0) + pendingEntries,
  })

  const stats = summary.data
    ? [
        { label: 'Season points', value: summary.data.seasonPoints.toLocaleString('en-US') },
        { label: 'Money', value: summary.data.money.toLocaleString('en-US') },
        { label: 'Morale', value: `${Math.round(summary.data.morale)}%` },
      ]
    : []

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <SectionBar>{name}</SectionBar>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1">
          <p className="text-sm text-slate-500">
            {summary.data?.teamName ? (
              <TeamLink teamId={summary.data.teamId} name={summary.data.teamName} />
            ) : (
              'Free agent'
            )}
          </p>
          {health.data && (
            <WorldClock
              gameDay={health.data.gameDay}
              tickIntervalMinutes={health.data.tickIntervalMinutes}
              nextTickAtMs={health.data.nextTickAtMs ?? null}
            />
          )}
        </div>
      </div>

      {/* Lo que tiene por ver (E2, §11.4; 9b): a medias, listo para ver y lo que pasó mientras no
          estaba. Sin velo para él, nada. */}
      <WatchBlocks />

      {/* Solo lo accionable: si no hay nada que decidir, este bloque no existe. */}
      {actions.length > 0 && (
        <ul className="space-y-2">
          {actions.map((action) => (
            <ActionRow key={action.id} action={action} />
          ))}
        </ul>
      )}

      <Panel
        title="Condition"
        action={form.data?.form && <StarRating value={form.data.form.stars} />}
      >
        {form.data?.form ? (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Freshness</span>
              <span className="tabular-nums">{Math.round(form.data.form.freshness)} / 100</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${form.data.form.freshness}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No training data yet.</p>
        )}
        {stats.length > 0 && (
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-md bg-slate-50 p-2.5">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {s.label}
                </dt>
                <dd className="mt-0.5 text-sm font-bold tabular-nums text-slate-800">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="mt-3 text-xs">
          <Link to="/me/profile" className="font-medium text-brand-cyan hover:underline">
            See the full profile →
          </Link>
        </p>
      </Panel>

      <LastRaceCard />
    </section>
  )
}

export function Home() {
  const { data: session } = authClient.useSession()
  const rev = useHorizonRev()
  const riderQuery = useQuery({
    queryKey: horizonKey(['rider', 'me'], rev),
    queryFn: fetchMyRider,
    enabled: !!session && rev !== undefined,
  })

  if (!session) return <GuestHome />
  if (riderQuery.isPending) return <p className="text-slate-500">Loading…</p>
  if (!riderQuery.data) return <NewPlayerHome />
  return <PlayerHome name={riderQuery.data.name} />
}
