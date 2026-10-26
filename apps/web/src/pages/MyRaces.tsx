import { raceIdFromKey, seasonPosition } from '@cyclingstar/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { RaceClass } from '../api/calendar'
import { type EnterableRace, enterRace, fetchEnterableRaces, withdrawRace } from '../api/raceEntry'
import { fetchRiderResults } from '../api/rankings'
import { fetchMyRider, fetchMyUpcomingRaces, fetchRiderSummary, retireFromRace } from '../api/rider'
import { Flag } from '../components/Flag'
import { Panel, SectionBar } from '../components/Panel'
import { ShowAllButton, TOP_ROWS } from '../components/ShowAll'
import { StageRoute } from '../components/StageRoute'
import { type TabOption, TabPanel, Tabs, useTabParam } from '../components/Tabs'
import { ActionRow } from '../components/ui/ActionRow'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { QueryView } from '../components/ui/QueryView'
import { Segmented } from '../components/ui/Segmented'
import { ShowAllRows } from '../components/ui/ShowAllRows'
import { TONES } from '../components/ui/styles'
import { raceClassLabel, travelDaysLabel } from '../domain/labels'
import {
  hasStageBreakdown,
  ordinal,
  placeTone,
  raceResultKey,
  raceResultKind,
  raceResultPlace,
  stagesSummary,
  stagesToWatchText,
} from '../domain/riderResults'
import { formatGameDay } from '../domain/words'
import { horizonKey, useHealth, useHorizonRev } from '../queryClient'

type TabId = 'upcoming' | 'enter' | 'results'

const TAB_LABEL: Record<TabId, string> = {
  upcoming: 'Upcoming',
  enter: 'Available to enter',
  results: 'Results',
}
const MY_RACES_PANEL = 'my-races-section'

/** El día de la temporada de un día de juego absoluto (el `startGameDay` del programa). */
const diaDeTemporada = (gameDay: number) => seasonPosition(gameDay).dayOfSeason

/** Hoy, en el día de la temporada; sin `/health` todavía, null. */
function useHoy(): number | null {
  const health = useHealth()
  return health.data?.gameDay ? diaDeTemporada(health.data.gameDay) : null
}

/** Una carrera y su clase, el primer renglón de una fila (E3, docs/visual.md §4.5; PR 12a). */
function CarreraYClase({ name, clase }: { readonly name: string; readonly clase: string }) {
  return (
    <>
      {name} <span className="text-caption font-semibold text-ink-3">{clase}</span>
    </>
  )
}

/**
 * La retirada de una carrera por etapas en curso (docs/motor.md §V.5), debajo de su fila: no se deshace, así
 * que nunca actúa a la primera; primero pregunta.
 */
function Retirada({
  confirming,
  busy,
  onAsk,
  onCancel,
  onConfirm,
}: {
  readonly confirming: boolean
  readonly busy: boolean
  readonly onAsk: () => void
  readonly onCancel: () => void
  readonly onConfirm: () => void
}) {
  if (!confirming)
    return (
      <Button variant="quiet" onClick={onAsk}>
        Abandon
      </Button>
    )
  return (
    <>
      <span className="text-meta text-ink-2">
        Abandon for good? You pull out of this race to prepare another one. This cannot be undone.
      </span>
      <Button variant="danger" busy={busy} onClick={onConfirm}>
        Yes, abandon
      </Button>
      <Button variant="quiet" onClick={onCancel}>
        Keep racing
      </Button>
    </>
  )
}

/**
 * Pestaña "Upcoming": lo ya cerrado (mi equipo me ha inscrito, o me apunté yo y la carrera ya me ha
 * convocado) y, debajo, lo que he pedido yo y aún está pendiente de convocatoria.
 */
function UpcomingTab() {
  const queryClient = useQueryClient()
  const rev = useHorizonRev()
  const hoy = useHoy()
  const upcoming = useQuery({
    queryKey: horizonKey(['rider', 'upcoming'], rev),
    queryFn: fetchMyUpcomingRaces,
    enabled: rev !== undefined,
  })
  const entries = useQuery({ queryKey: ['race-entries'], queryFn: fetchEnterableRaces })
  // Qué carrera está esperando confirmación de retirada. Retirarse no se deshace (docs/motor.md
  // §V.5), así que el botón nunca actúa a la primera: primero pregunta.
  const [confirming, setConfirming] = useState<string | null>(null)
  const retire = useMutation({
    mutationFn: (raceKey: string) => retireFromRace(raceKey),
    onSuccess: async () => {
      setConfirming(null)
      await queryClient.invalidateQueries({ queryKey: ['rider', 'upcoming'] })
      await queryClient.invalidateQueries({ queryKey: ['rider', 'results'] })
    },
  })

  // Los estados, con `QueryView` (E3, PR 10).
  if (upcoming.data === undefined)
    return (
      <QueryView query={upcoming} label="your races" skeleton={{ kind: 'rows', rowHeight: 64 }} />
    )

  const races = upcoming.data ?? []
  // Lo que pedí y todavía no es una convocatoria: la carrera aún no ha cerrado su lista de salida.
  const pending = (entries.data ?? []).filter((r) => r.entered && !r.enrolled)

  // El vacío, con las inscripciones ya en la mano: mientras llegan, o si fallan, no se dice que no hay nada.
  if (races.length === 0 && pending.length === 0 && entries.data !== undefined) {
    return (
      <EmptyState text="No races on your programme yet. Your team enters you about two weeks before the start — and as a free agent you can enter races yourself." />
    )
  }

  return (
    <>
      {races.length > 0 && (
        // las filas con su acción (E3, PR 12a): `Set orders`, y en una carrera por etapas en curso, la
        // retirada debajo
        <Panel title="On your programme" bodyClassName="px-3 pb-3">
          <ul className="divide-y divide-line lg:grid lg:grid-cols-2 lg:gap-x-6 lg:divide-y-0">
            {races.map((r) => (
              <ActionRow
                key={r.raceKey}
                title={
                  <CarreraYClase
                    name={r.raceName}
                    clase={`${raceClassLabel(r.raceClass as RaceClass)}${r.stageCount > 1 ? ` · ${r.stageCount} stages` : ''}`}
                  />
                }
                meta={[
                  r.bib != null ? `Bib ${r.bib}` : null,
                  r.ongoing ? 'Racing now' : formatGameDay(diaDeTemporada(r.startGameDay), hoy),
                  r.country,
                ]
                  .filter((p) => p !== null)
                  .join(' · ')}
                href={`/world/races/${raceIdFromKey(r.raceId)}`}
                action={{
                  label: 'Set orders',
                  ariaLabel: `Set orders for ${r.raceName}`,
                  to: `/me/orders?race=${encodeURIComponent(r.raceKey)}`,
                }}
                {...(r.ongoing && r.stageCount > 1
                  ? {
                      extra: (
                        <Retirada
                          confirming={confirming === r.raceKey}
                          busy={retire.isPending}
                          onAsk={() => setConfirming(r.raceKey)}
                          onCancel={() => setConfirming(null)}
                          onConfirm={() => retire.mutate(r.raceKey)}
                        />
                      ),
                    }
                  : {})}
              />
            ))}
          </ul>
          {retire.isError && (
            <p className="text-meta text-bad">Could not withdraw from the race.</p>
          )}
        </Panel>
      )}

      {/* las inscripciones que esperan la lista de salida, con sus estados (E3, PR 10) */}
      {entries.data === undefined && (
        <QueryView
          query={entries}
          label="your race entries"
          skeleton={{ kind: 'rows', rowHeight: 64 }}
        />
      )}
      {pending.length > 0 && (
        <Panel title="Entered — waiting for the start list">
          <ul className="divide-y divide-slate-100">
            {pending.map((r) => (
              <li key={r.raceId} className="flex items-center justify-between gap-3 py-2 text-sm">
                <Link
                  to={`/world/races/${raceIdFromKey(r.raceId)}`}
                  className="font-medium text-slate-700 hover:text-brand-cyan hover:underline"
                >
                  {r.country && <Flag code={r.country} size={14} className="mr-1.5" />}
                  {r.name}
                </Link>
                <span className="shrink-0 text-xs text-slate-500">
                  GD {r.startDay} · travel {r.travelMoney.toLocaleString('en-US')}
                  {r.travelDays > 0 && ` · ${travelDaysLabel(r.travelDays)}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            You pay the trip when the race calls you up. Until then you can still withdraw from the{' '}
            <span className="font-medium">Available to enter</span> tab.
          </p>
        </Panel>
      )}
    </>
  )
}

/**
 * Una carrera continental inscribible por un agente libre (E3, docs/visual.md §6.1; PR 12a): la carrera y su
 * clase, y en el segundo renglón el día, el país y su viaje; `Enter`, `Withdraw` o, convocado, `Called up`.
 * Sin dinero para el viaje, `Enter` deshabilitado con su porqué (hoy, en un `title`).
 */
function EnterableRow({
  race,
  hoy,
  busy,
  onEnter,
  onWithdraw,
}: {
  race: EnterableRace
  hoy: number | null
  busy: boolean
  onEnter: (id: string) => void
  onWithdraw: (id: string) => void
}) {
  const dias = travelDaysLabel(race.travelDays)
  const fila = {
    title: <CarreraYClase name={race.name} clase={`.${race.raceClass}`} />,
    meta: [
      formatGameDay(race.startDay, hoy),
      race.country,
      `Travel ${race.travelMoney.toLocaleString('en-US')}`,
      dias === '' ? null : dias,
    ]
      .filter((p) => p !== null)
      .join(' · '),
    href: `/world/races/${race.raceId}`,
  }
  if (race.enrolled) return <ActionRow {...fila} done={{ text: 'Called up', tone: 'good' }} />
  if (race.entered)
    return (
      <ActionRow
        {...fila}
        action={{
          label: 'Withdraw',
          ariaLabel: `Withdraw from ${race.name}`,
          onClick: () => onWithdraw(race.raceId),
          busy,
        }}
      />
    )
  return (
    <ActionRow
      {...fila}
      action={{
        label: 'Enter',
        ariaLabel: `Enter ${race.name}`,
        variant: 'primary',
        onClick: () => onEnter(race.raceId),
        busy,
        ...(race.affordable ? {} : { disabledReason: 'Not enough money for the trip' }),
      }}
    />
  )
}

/** Qué inscribibles se ven: todas, o las que se pueden pagar (y las que ya pedí). */
type Filtro = 'all' | 'affordable'
const FILTROS = [
  { key: 'all', label: 'All races' },
  { key: 'affordable', label: 'Affordable' },
] as const

/** Pestaña "Available to enter" (solo agente libre): auto-inscripción con su coste de viaje. */
function EnterTab({ money }: { money: number | null }) {
  const queryClient = useQueryClient()
  const hoy = useHoy()
  const [filtro, setFiltro] = useState<Filtro>('all')
  const [todas, setTodas] = useState(false)
  const entries = useQuery({
    queryKey: ['race-entries'],
    queryFn: fetchEnterableRaces,
  })
  const { data } = entries

  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'enter' | 'withdraw' }) =>
      action === 'enter' ? enterRace(id) : withdrawRace(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['race-entries'] })
      await queryClient.invalidateQueries({ queryKey: ['rider', 'upcoming'] })
    },
  })

  // Los estados, con `QueryView` (E3, PR 10).
  if (data === undefined)
    return (
      <QueryView
        query={entries}
        label="the races you can enter"
        skeleton={{ kind: 'rows', rowHeight: 64 }}
      />
    )

  const committed = data
    .filter((r) => r.entered && !r.enrolled)
    .reduce((s, r) => s + r.travelMoney, 0)
  const lista =
    filtro === 'affordable' ? data.filter((r) => r.affordable || r.entered || r.enrolled) : data

  return (
    <>
      <p className="text-sm text-slate-600">
        As a free agent you enter continental races (.1/.2) yourself, and you pay your own travel —
        transport and hotel — out of your balance when the race calls you up. National championships
        you qualify for automatically.
      </p>
      <div className="grid grid-cols-3 gap-3">
        <Panel title="Balance">
          <p className="text-lg font-bold tabular-nums text-slate-800">
            {money != null ? money.toLocaleString('en-US') : '—'}
          </p>
        </Panel>
        <Panel title="Committed">
          <p className="text-lg font-bold tabular-nums text-rose-600">
            −{committed.toLocaleString('en-US')}
          </p>
        </Panel>
        <Panel title="Entered">
          <p className="text-lg font-bold tabular-nums text-slate-800">
            {data.filter((r) => r.entered).length}
          </p>
        </Panel>
      </div>

      {data.length === 0 ? (
        <EmptyState text="No continental races left to enter this season." />
      ) : (
        // las filas con su acción (E3, PR 12a): de 193 filas en 19.914 px, a las 20 primeras
        <Panel title="Still open" bodyClassName="flex flex-col gap-3 px-3 pt-3 pb-3">
          <Segmented
            label="Which races"
            options={FILTROS}
            value={filtro}
            onChange={(f) => {
              setFiltro(f)
              setTodas(false)
            }}
          />
          {lista.length === 0 ? (
            <EmptyState text="You can't pay the trip to any race still open. Your balance grows with your prizes and your salary." />
          ) : (
            <ul className="divide-y divide-line lg:grid lg:grid-cols-2 lg:gap-x-6 lg:divide-y-0">
              {(todas ? lista : lista.slice(0, TOP_ROWS)).map((race) => (
                <EnterableRow
                  key={race.raceId}
                  race={race}
                  hoy={hoy}
                  busy={mutation.isPending && mutation.variables?.id === race.raceId}
                  onEnter={(id) => mutation.mutate({ id, action: 'enter' })}
                  onWithdraw={(id) => mutation.mutate({ id, action: 'withdraw' })}
                />
              ))}
            </ul>
          )}
          <ShowAllRows total={lista.length} expanded={todas} onToggle={() => setTodas((t) => !t)} />
        </Panel>
      )}
      {mutation.isError && <p className="text-sm text-red-600">Could not update your entry.</p>}
    </>
  )
}

/**
 * Pestaña "Results": mis carreras corridas. Una fila POR CARRERA con mi puesto en la general —el
 * resultado de una vuelta es la general, se gane o no (docs/navegacion.md §3.6)— y las etapas
 * plegadas debajo, cada una con su enlace a la crónica.
 */
function ResultsTab({ riderId }: { riderId: string | null }) {
  const rev = useHorizonRev()
  const results = useQuery({
    queryKey: horizonKey(['rider', 'results', riderId], rev),
    queryFn: () => fetchRiderResults(riderId!),
    enabled: !!riderId && rev !== undefined,
  })
  const { data } = results
  const [expanded, setExpanded] = useState(false)

  // Los estados, con `QueryView` (E3, PR 10). El corredor ya llegó (`MyRaces`): sin él, la consulta no
  // corre, y no se queda cargando para siempre.
  const empty = <EmptyState text="You haven't raced yet. Your results will land here." />
  if (!riderId) return empty
  if (data === undefined)
    return (
      <QueryView query={results} label="your results" skeleton={{ kind: 'rows', rowHeight: 64 }} />
    )
  if (data.length === 0) return empty

  // Regla común de tablas (§7.3): 20 filas y salida para ver el resto.
  const visible = expanded ? data : data.slice(0, TOP_ROWS)

  return (
    <Panel title="Races you have ridden" bodyClassName="p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Your races, most recent first: your overall place and the stages behind it
          </caption>
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-400">
              <th scope="col" className="px-3 py-2 font-medium">
                Race
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                Result
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Place
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={raceResultKey(r)}
                className="border-b border-slate-100 align-top last:border-0"
              >
                <th scope="row" className="px-3 py-2 text-left font-normal">
                  <Link
                    to={`/world/races/${r.raceId}`}
                    className="font-medium text-slate-800 hover:text-brand-cyan hover:underline"
                  >
                    {r.raceName}
                  </Link>
                  <span className="ml-2 text-xs text-slate-400">Season {r.season + 1}</span>
                  {/* Con etapas en su velo (sup. H7; 9b): `Race France · 3 stages to watch`. */}
                  {stagesToWatchText(r) !== null && (
                    <span className="ml-2 text-xs font-medium text-emerald-700">
                      · {stagesToWatchText(r)}
                    </span>
                  )}
                  {/* Un día: la etapa ES la carrera, y su de dónde a dónde va junto al nombre. */}
                  {r.isOneDay && (
                    <StageRoute
                      from={r.stages[0]?.from}
                      to={r.stages[0]?.to}
                      className="ml-2 text-xs text-slate-400"
                    />
                  )}
                  {/* El desglose de etapas cuelga de la carrera, plegado: el titular es la general. */}
                  {hasStageBreakdown(r) && (
                    <details className="mt-0.5">
                      <summary className="cursor-pointer list-none text-xs [&::-webkit-details-marker]:hidden text-slate-400 hover:text-brand-cyan">
                        <span className="underline decoration-dotted underline-offset-2">
                          {stagesSummary(r)}
                        </span>
                      </summary>
                      <ul className="mt-1 space-y-0.5">
                        {r.stages.map((s) => (
                          <li key={s.stageDay} className="flex items-baseline gap-2 text-xs">
                            <span
                              className={`w-9 shrink-0 text-right font-semibold tabular-nums ${
                                s.puesto === 1 ? 'text-amber-500' : 'text-slate-500'
                              }`}
                            >
                              {ordinal(s.puesto)}
                            </span>
                            <Link
                              to={`/world/races/${r.raceId}/stages/${s.stageDay}`}
                              className="text-slate-500 hover:text-brand-cyan hover:underline"
                            >
                              Stage {s.stageDay} of {r.stageCount}
                            </Link>
                            <StageRoute
                              from={s.from}
                              to={s.to}
                              className="truncate text-slate-400"
                            />
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </th>
                <td className="px-2 py-2 text-slate-500">{raceResultKind(r)}</td>
                <td
                  className={`px-3 py-2 text-right font-bold tabular-nums ${TONES[placeTone(r)].text}`}
                >
                  {raceResultPlace(r)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 pb-3">
        <ShowAllButton
          total={data.length}
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
        />
      </div>
    </Panel>
  )
}

/**
 * "My races" (navegación §3.2): una sola página que responde a "¿cuándo corro?" con tres pestañas —
 * lo que viene, lo que puedo pedir (solo agente libre) y lo que ya corrí—. Sustituye a la antigua
 * `/race-entry`, que estaba huérfana.
 */
export function MyRaces() {
  const rev = useHorizonRev()
  const summary = useQuery({
    queryKey: horizonKey(['rider', 'summary'], rev),
    queryFn: fetchRiderSummary,
    enabled: rev !== undefined,
  })
  const rider = useQuery({
    queryKey: horizonKey(['rider', 'me'], rev),
    queryFn: fetchMyRider,
    enabled: rev !== undefined,
  })

  // Ser agente libre solo decide si la pestaña de inscripción EXISTE; nunca cuál está abierta.
  const freeAgent = summary.data != null && summary.data.teamId == null
  const tabIds: readonly TabId[] = freeAgent
    ? ['upcoming', 'enter', 'results']
    : ['upcoming', 'results']
  // `useTabParam` valida el `?tab=` contra las pestañas que existen ahora mismo: si dejo de ser
  // agente libre con esa pestaña abierta, cae a Upcoming en vez de dejar un panel muerto.
  const [active, setActive] = useTabParam(tabIds, 'upcoming')
  const options: TabOption<TabId>[] = tabIds.map((id) => ({ key: id, label: TAB_LABEL[id] }))

  return (
    <section className="space-y-4">
      <SectionBar>My races</SectionBar>
      <Tabs
        options={options}
        value={active}
        onChange={setActive}
        label="My races sections"
        variant="underline"
        panelId={MY_RACES_PANEL}
      />
      <TabPanel panelId={MY_RACES_PANEL} active={active}>
        {active === 'upcoming' && <UpcomingTab />}
        {active === 'enter' && <EnterTab money={summary.data?.money ?? null} />}
        {/* los resultados esperan al corredor: si falla, su error, y ya no cargan para siempre (E3, PR 10) */}
        {active === 'results' &&
          (rider.data === undefined ? (
            <QueryView
              query={rider}
              label="your rider"
              skeleton={{ kind: 'rows', rowHeight: 64 }}
            />
          ) : (
            <ResultsTab riderId={rider.data?.id ?? null} />
          ))}
      </TabPanel>
    </section>
  )
}
