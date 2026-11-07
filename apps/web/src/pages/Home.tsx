import {
  type RiderSummary,
  raceIdFromKey,
  seasonPosition,
  stageRouteText,
} from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { fetchForm } from '../api/form'
import { fetchHealth } from '../api/health'
import { fetchLastRace, lastRaceKey } from '../api/lastRace'
import { fetchMarket } from '../api/market'
import { fetchEnterableRaces } from '../api/raceEntry'
import { fetchRaceOrders } from '../api/raceOrders'
import { ApiError } from '../api/request'
import { fetchMyRider, fetchMyUpcomingRaces, fetchRiderSummary } from '../api/rider'
import { fetchTrainingPlan } from '../api/sheet'
import { fetchOrders } from '../api/training'
import { useSessionState } from '../auth/useSessionState'
import { LastRaceReady } from '../components/LastRaceReady'
import { Logo } from '../components/Logo'
import { StageRoute } from '../components/StageRoute'
import { WatchBlocks } from '../components/WatchBlocks'
import { ActionRow } from '../components/ui/ActionRow'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { EmptyState } from '../components/ui/EmptyState'
import { Meter } from '../components/ui/Meter'
import { Notice } from '../components/ui/Notice'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { LoadingState, QueryView, type QueryViewProps } from '../components/ui/QueryView'
import { StarRating } from '../components/ui/StarRating'
import { Stat } from '../components/ui/Stat'
import { TextLink } from '../components/ui/TextLink'
import { conditionLabel, conditionLevel } from '../domain/condition'
import { type DashboardAction, buildDashboard } from '../domain/dashboard'
import { gapToWinnerText, raceVerdict } from '../domain/narration'
import { livePlan } from '../domain/trainingPlan'
import { horizonKey, useHorizonRev, veilApplies } from '../queryClient'

/**
 * LA PORTADA CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21g): sus tres caras, cada una con su
 * `PageHeader` y su respuesta (§7.3). El visitante, con el `Panel` de bienvenida y `Create account` (la 18);
 * el nuevo, con su `EmptyState` (la 44); y el jugador, con `Next up`, los avisos de `dashboard.ts` (la 17),
 * que contesta siempre, también sin avisos, y va arriba, antes de lo que tiene por ver. Fuera el reloj de la
 * portada (`WorldClock`), que ya dice la cabecera desde el PR 11 y decía `GD` (§4.10), y las flechas de
 * texto (ui/10).
 *
 * Tras su revisión: `Next up` espera a lo que necesita antes de decir que no hay nada, y con un fallo lo dice;
 * la espera de la sesión ya no es la portada del visitante; el aviso del visitante va bajo su cabecera (4-e);
 * y la última carrera velada, con el sistema (`LastRaceReady`).
 */

/** El día del mundo en palabras de la temporada (§4.10): `Day 50 · Season 1`, y nunca `GD 50`. */
function gameDayText(gameDay: number | null): string {
  if (gameDay === null || gameDay < 1) return 'the game has not started yet'
  const { season, dayOfSeason } = seasonPosition(gameDay)
  return `Day ${dayOfSeason} · Season ${season}`
}

function SystemStatus() {
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth })
  return (
    <Panel title="System status">
      <QueryView query={health} label="the server status" skeleton={{ kind: 'panel' }}>
        {(h) => (
          // palabras y no cifras: en `Stat` irían a 32 px
          <dl className="grid text-meta">
            {(
              [
                ['Server', h.ok ? 'Online' : 'Degraded'],
                ['Engine version', String(h.engineVersion)],
                ['Game day', gameDayText(h.gameDay)],
                ['Database', h.migrationsApplied ? 'ready' : 'not migrated'],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-0"
              >
                <dt className="font-semibold text-ink">{label}</dt>
                <dd className="text-right tabular-nums text-ink-2">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </QueryView>
    </Panel>
  )
}

/**
 * Guest landing: hero + how-to-play + system status. Quien vuelve sin sesión con `cs_viewer` lee el mundo
 * con el velo de su cuenta (§10.8): la portada de invitado no enseña resultados, y se lo dice (E2, §11.4;
 * 9b). Desde el PR 21g, la bienvenida es el `Panel` que contesta a la 18 (§7.3), con `Create account`.
 */
function GuestHome() {
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth })
  return (
    <section className="space-y-4">
      <Logo size={96} />
      <PageHeader title="Race. Train. Rise." />
      {/* Bajo la cabecera, como todo aviso de página (4-e). Solo con el velo para todos: con `admins`, un
          invitado no lo tiene, y preguntar por su cookie sería una petición más en cada portada de invitado. */}
      {health.data?.features?.spoilerMode === 'on' && <CookieReaderNotice />}
      <Panel ariaLabel="Welcome" answer>
        <div className="grid gap-3">
          <p className="text-body text-ink-2">
            A persistent cycling world where your rider trains, gets called up, races a full season,
            signs contracts and builds a palmarès — and the world keeps moving without you.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button to="/register" variant="primary">
              Create account
            </Button>
            <Button to="/how-to-play">How to play</Button>
          </div>
        </div>
      </Panel>
      <SystemStatus />
    </section>
  )
}

/** `Sign in to see results as you know them` a quien lee con `cs_viewer` sin sesión (§10.8). */
function CookieReaderNotice() {
  const rev = useHorizonRev()
  if (!veilApplies(rev)) return null
  return (
    <Notice
      tone="info"
      title="Sign in to see results as you know them"
      action={{ label: 'Sign in', to: '/login' }}
    />
  )
}

/** Logged in but no rider yet: a single clear next step. */
function NewPlayerHome() {
  return (
    <section className="space-y-4">
      <Logo size={80} />
      <PageHeader title="Welcome to Cycling Star" />
      {/* Sin corredor, el vacío dice por qué y qué hacer (E3, PR 10): la respuesta de la pantalla 44. */}
      <EmptyState
        icon="rider"
        text="You don't have a rider yet. Create one to enter the world — pick a specialty and a name, and you're on the start line."
        action={
          <div className="flex flex-wrap gap-3">
            <Button to="/create" variant="primary">
              Create your rider
            </Button>
            <Button to="/how-to-play">How to play</Button>
          </div>
        }
        answer
      />

      <Panel title="How it works">
        <dl className="grid gap-3 sm:grid-cols-3">
          {[
            { title: 'Stars', text: 'Your abilities are shown in stars, never raw numbers.' },
            { title: 'Matches', text: 'A limited stock of efforts to burn wisely in a race.' },
            { title: 'Form', text: 'Train to improve, ease off to peak fresh for a goal.' },
          ].map((c) => (
            <div key={c.title}>
              <dt className="text-row font-semibold text-ink">{c.title}</dt>
              <dd className="text-meta text-ink-2">{c.text}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </section>
  )
}

/** El tono de un aviso, con su palabra (D-13): lo informativo no lleva chapa. */
const TONE_CHIP: Record<DashboardAction['tone'], { tone: 'bad' | 'warn'; text: string } | null> = {
  urgent: { tone: 'bad', text: 'Urgent' },
  warn: { tone: 'warn', text: 'Soon' },
  info: null,
}

/**
 * LO SIGUIENTE (E3, §7.3; PR 21g): los avisos accionables, cada uno una `ActionRow` con qué pasa, por qué
 * importa y el único enlace que lo resuelve, con su nombre entero para el lector (`Set orders: You race
 * tomorrow: Race Var`); el tono, con su palabra. Es la respuesta de la 17, y contesta siempre: sin avisos,
 * con su vacío dentro (hasta aquí, sin avisos no había bloque). Pero el vacío solo cuando se sabe (la revisión
 * del 21g): mientras falte algo de lo que necesita, su espera, y con un fallo, su `ErrorState`, los de su
 * `QueryView`. Se exporta para su test, que siembra sus avisos a mano.
 */
export function NextUp({
  actions,
  pending = null,
}: {
  readonly actions: readonly DashboardAction[]
  /** la primera consulta de las suyas que no ha llegado, la que falló antes que las que faltan */
  readonly pending?: QueryViewProps<unknown>['query'] | null
}) {
  return (
    <Panel title="Next up" answer>
      {pending !== null ? (
        <QueryView
          query={pending}
          label="your next steps"
          skeleton={{ kind: 'rows', rowHeight: 64 }}
        />
      ) : actions.length === 0 ? (
        <EmptyState icon="check" text="Nothing needs you right now." />
      ) : (
        <ul className="divide-y divide-line">
          {actions.map((action) => {
            const chip = TONE_CHIP[action.tone]
            return (
              <ActionRow
                key={action.id}
                title={
                  <>
                    {action.title}
                    {chip !== null && (
                      <>
                        {' '}
                        <Chip tone={chip.tone}>{chip.text}</Chip>
                      </>
                    )}
                  </>
                }
                meta={action.detail ?? ''}
                action={{
                  label: action.cta,
                  ariaLabel: `${action.cta}: ${action.title}`,
                  to: action.to,
                }}
              />
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

/**
 * La última carrera corrida, con enlace a su etapa (`Open stage`; hasta W4, `Full story`, cuando la etapa
 * tenía crónica). Bajo el velo (E2, §11.4; sup. H1; 9b), la de la última etapa CONOCIDA; si la última que
 * corrió su corredor está velada, `Your last race · Race France, Stage 8 · Ready to watch` con `Watch` en
 * lugar de `Open stage`.
 */
function LastRaceCard() {
  const rev = useHorizonRev()
  const last = useQuery({
    queryKey: lastRaceKey(rev),
    queryFn: fetchLastRace,
    enabled: rev !== undefined,
  })
  if (last.data?.ready != null) return <LastRaceReady ready={last.data.ready} title="Last race" />
  const data = last.data?.report
  if (!data) return null
  const gap = gapToWinnerText(data)
  // el último momento del corredor en el acta (E2, §12.9, 12-k; paso 12), no la etapa re-simulada
  const moments = data.moments ?? []
  const highlight = moments[moments.length - 1] ?? null

  return (
    <Panel
      title="Last race"
      action={
        <TextLink to={`/world/races/${raceIdFromKey(data.raceId)}/stages/${data.stageDay}`}>
          Open stage
        </TextLink>
      }
    >
      <div className="grid gap-1">
        <p className="text-row font-semibold text-ink">
          {/* La etapa y su recorrido, como toda etapa (§4.10): `Stage 3 · Gandia → Alcoi` */}
          {data.raceName} · {data.stageName}
          {stageRouteText(data.from, data.to) !== null && ' · '}
          <StageRoute from={data.from} to={data.to} className="font-normal text-ink-2" />
        </p>
        <p className="text-meta text-ink-2">
          <span className="font-semibold tabular-nums text-ink">{data.position}</span>
          {data.fieldSize > 0 && <span className="text-ink-3"> / {data.fieldSize}</span>}
          {' · '}
          {gap}
          {highlight && ` · in the action at km ${highlight.km}`}
        </p>
        <p className="text-meta text-accent">{raceVerdict(data)}</p>
      </div>
    </Panel>
  )
}

/**
 * El equipo del jugador, un `TextLink`, que se ve enlace sin pasar el dedo por encima; `Free agent` sin él; y
 * nada mientras llega, con su renglón guardado (la revisión del 21g: decía `Free agent` mientras cargaba).
 */
function TeamLine({ summary }: { readonly summary: RiderSummary | null | undefined }) {
  if (summary === undefined) return null
  if (summary === null || summary.teamName === null) return <>Free agent</>
  if (summary.teamId === null) return <>{summary.teamName}</>
  return (
    <TextLink inline to={`/world/teams/${summary.teamId}`}>
      {summary.teamName}
    </TextLink>
  )
}

/** Panel del jugador: qué hago hoy, cómo estoy y qué pasó en mi última carrera. */
export function PlayerHome({ name }: { name: string }) {
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
  // El modo y el plan vivo (E3, §11.7; PR 15): la portada habla del plan, no solo de las órdenes.
  const stored = useQuery({ queryKey: ['training-plan'], queryFn: fetchTrainingPlan })
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
  // El plan vivo con algún bloque, como lo cuenta el cuadro (`livePlan`): su último día.
  const vivo = livePlan(stored.data?.plan ?? null)
  // Mañana es día de ida: la carrera del programa cuya ida sale mañana.
  const viajeDeManana = upcoming.data?.find((r) => r.travelOut.includes(currentDay + 1)) ?? null

  const actions = buildDashboard({
    currentDay,
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
    // Mientras no se sabe el modo, no se pide planificar: como la cola, que se da por llena.
    mode: stored.data?.mode ?? 'entrenador',
    plan: vivo === null ? null : { endDay: vivo.startDay + 27 },
    tomorrowTravel:
      viajeDeManana === null
        ? null
        : {
            raceName: viajeDeManana.raceName,
            out: viajeDeManana.travelOut.length,
            back: viajeDeManana.travelBack.length,
          },
    trainingPlannedDays: training.data ? trainingPlannedDays : 99,
    offers: market.data?.offers.length ?? 0,
    freeAgent,
    affordableEntries: (entries.data ?? []).filter((r) => !r.entered && r.affordable).length,
    bookedRaces: (upcoming.data?.length ?? 0) + pendingEntries,
  })
  // Lo que `Next up` necesita saber antes de decir nada (la revisión del 21g): sus avisos dan por bueno lo que
  // falta (las órdenes, puestas; la cola, llena; ninguna oferta), y sin esto dirían «nada que hacer» mientras
  // cargan, o para siempre tras un fallo. Las apagadas no cuentan; las órdenes con un 403, tampoco: sin estar
  // aún en la lista de salida, no hay órdenes que poner.
  const fueraDeLaSalida = raceOrders.error instanceof ApiError && raceOrders.error.status === 403
  const necesita = [
    summary,
    training,
    upcoming,
    market,
    stored,
    ...(nextRace !== null && !fueraDeLaSalida ? [raceOrders] : []),
    ...(freeAgent ? [entries] : []),
  ]
  const pending =
    necesita.find((q) => q.data === undefined && q.isError) ??
    necesita.find((q) => q.data === undefined) ??
    null

  return (
    <section className="space-y-4">
      <div className="grid gap-1">
        <PageHeader title={name} />
        {/* el equipo, enlazado: la línea de estado de `PageHeader` es texto, y lo perdería */}
        <p className="min-h-5 text-meta text-ink-2">
          <TeamLine summary={summary.data} />
        </p>
      </div>

      {/* Lo siguiente, la respuesta de la 17 (§7.3), arriba: lo que se decide antes de que caduque. */}
      <NextUp actions={actions} pending={pending} />

      {/* Lo que tiene por ver (E2, §11.4; 9b): a medias, listo para ver y lo que pasó mientras no
          estaba. Sin velo para él, nada. Encima de la última carrera, como en E2. */}
      <WatchBlocks />

      <Panel title="Condition">
        <div className="grid gap-3">
          {/* mientras llega la forma, su espera, y con un fallo, el suyo: no `No training data yet.`, que es lo que
              se sabe cuando llega sin ella (la revisión del 21g) */}
          {form.data === undefined ? (
            <QueryView
              query={form}
              label="your condition"
              skeleton={{ kind: 'rows', rows: 2, rowHeight: 44 }}
            />
          ) : form.data.form ? (
            <>
              <p className="flex items-center gap-2 text-meta font-semibold text-ink">
                Form
                <StarRating value={form.data.form.stars} />
              </p>
              {/* en el medidor y con su palabra, nunca la cifra (E3, §13.7; D-44, 19b): `Freshness: low` */}
              <Meter
                label="Freshness"
                value={conditionLevel(form.data.form.freshness)}
                valueText={conditionLabel(form.data.form.freshness).toLowerCase()}
              />
            </>
          ) : (
            <p className="text-meta text-ink-2">No training data yet.</p>
          )}
          {summary.data && (
            // en un renglón que parte en el teléfono, como las cifras del 21c
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <Stat label="Season points" value={summary.data.seasonPoints} />
              <Stat label="Money" value={summary.data.money} />
              {/* en medias estrellas (E3, §13.7; DD-12, 19b): no es una cifra, y no va en `Stat` */}
              <dl className="grid gap-1">
                <dt className="text-caption font-semibold tracking-caps text-ink-3 uppercase">
                  Morale
                </dt>
                <dd className="flex min-h-10 items-center">
                  <StarRating value={summary.data.moraleStars} size={20} />
                </dd>
              </dl>
            </div>
          )}
          <TextLink to="/me/profile" layout="justify-self-start">
            See the full profile
          </TextLink>
        </div>
      </Panel>

      <LastRaceCard />
    </section>
  )
}

export function Home() {
  const { state, isPending } = useSessionState()
  const signedIn = state === 'signed-in'
  const rev = useHorizonRev()
  const riderQuery = useQuery({
    queryKey: horizonKey(['rider', 'me'], rev),
    queryFn: fetchMyRider,
    enabled: signedIn && rev !== undefined,
  })

  // mientras llega la sesión, su espera, y no la portada del visitante con `Create account` (la revisión del
  // 21g): quien vuelve con su sesión la veía un momento en cada carga
  if (isPending) return <LoadingState label="your session" />
  if (!signedIn) return <GuestHome />
  // Los estados, con `QueryView` (E3, PR 10): un fallo ya no se pinta como «no tienes corredor».
  if (riderQuery.data === undefined)
    return <QueryView query={riderQuery} label="your rider" skeleton={{ kind: 'panel' }} answer />
  if (riderQuery.data === null) return <NewPlayerHome />
  return <PlayerHome name={riderQuery.data.name} />
}
