import { raceIdFromKey } from '@cyclingstar/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'
import { Link } from 'react-router-dom'
import type { RaceClass } from '../api/calendar'
import { type EnterableRace, enterRace, fetchEnterableRaces, withdrawRace } from '../api/raceEntry'
import { fetchRiderResults } from '../api/rankings'
import { fetchMyRider, fetchMyUpcomingRaces, fetchRiderSummary } from '../api/rider'
import { Flag } from '../components/Flag'
import { Panel, SectionBar } from '../components/Panel'
import { ShowAllButton, TOP_ROWS } from '../components/ShowAll'
import { type TabOption, TabPanel, Tabs, useTabParam } from '../components/Tabs'
import { raceClassLabel } from '../domain/labels'
import {
  hasStageBreakdown,
  ordinal,
  raceResultKey,
  raceResultKind,
  raceResultPlace,
  stagesSummary,
} from '../domain/riderResults'

type TabId = 'upcoming' | 'enter' | 'results'

const TAB_LABEL: Record<TabId, string> = {
  upcoming: 'Upcoming',
  enter: 'Available to enter',
  results: 'Results',
}
const MY_RACES_PANEL = 'my-races-section'

/** Fila vacía con el mismo aire en las tres pestañas. */
function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
      {children}
    </p>
  )
}

/** Cuándo empieza (o si ya está en marcha), en una frase corta. */
function whenLabel(daysUntil: number, ongoing: boolean): string {
  if (ongoing) return 'Racing now'
  if (daysUntil <= 0) return 'Starts today'
  return `in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`
}

/**
 * Pestaña "Upcoming": lo ya cerrado (mi equipo me ha inscrito, o me apunté yo y la carrera ya me ha
 * convocado) y, debajo, lo que he pedido yo y aún está pendiente de convocatoria.
 */
function UpcomingTab() {
  const upcoming = useQuery({ queryKey: ['rider', 'upcoming'], queryFn: fetchMyUpcomingRaces })
  const entries = useQuery({ queryKey: ['race-entries'], queryFn: fetchEnterableRaces })

  if (upcoming.isPending) return <p className="text-slate-500">Loading…</p>
  if (upcoming.isError) return <p className="text-red-600">Could not load your races.</p>

  const races = upcoming.data ?? []
  // Lo que pedí y todavía no es una convocatoria: la carrera aún no ha cerrado su lista de salida.
  const pending = (entries.data ?? []).filter((r) => r.entered && !r.enrolled)

  if (races.length === 0 && pending.length === 0) {
    return (
      <Empty>
        No races on your programme yet. Your team enters you about two weeks before the start — and
        as a free agent you can enter races yourself.
      </Empty>
    )
  }

  return (
    <>
      {races.length > 0 && (
        <Panel title="On your programme" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Races you are entered in</caption>
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-400">
                  <th scope="col" className="px-3 py-2 font-medium">
                    Race
                  </th>
                  <th scope="col" className="px-2 py-2 font-medium">
                    Bib
                  </th>
                  <th scope="col" className="px-2 py-2 font-medium">
                    Starts
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Orders
                  </th>
                </tr>
              </thead>
              <tbody>
                {races.map((r) => (
                  <tr key={r.raceKey} className="border-b border-slate-100 last:border-0">
                    <th scope="row" className="px-3 py-2 text-left font-normal">
                      <Link
                        to={`/world/races/${raceIdFromKey(r.raceId)}`}
                        className="font-medium text-slate-800 hover:text-brand-cyan hover:underline"
                      >
                        {r.country && <Flag code={r.country} size={14} className="mr-1.5" />}
                        {r.raceName}
                      </Link>
                      <span className="ml-2 font-mono text-[11px] text-slate-400">
                        {raceClassLabel(r.raceClass as RaceClass)}
                        {r.stageCount > 1 ? ` · ${r.stageCount} stages` : ''}
                      </span>
                    </th>
                    <td className="px-2 py-2 tabular-nums text-slate-500">
                      {r.bib != null ? `#${r.bib}` : '—'}
                    </td>
                    <td className="px-2 py-2 text-slate-600">
                      {whenLabel(r.daysUntil, r.ongoing)}
                    </td>
                    {/* Aquí irá también la retirada voluntaria entre etapas de una carrera por
                        etapas en curso, cuando el motor la soporte (docs/motor.md §V.5). */}
                    <td className="px-3 py-2 text-right">
                      <Link
                        to={`/me/orders?race=${encodeURIComponent(r.raceKey)}`}
                        className="font-medium text-brand-cyan hover:underline"
                      >
                        Set orders
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
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

/** Una carrera continental inscribible por un agente libre, con su coste de viaje y estado. */
function EnterableRow({
  race,
  busy,
  onEnter,
  onWithdraw,
}: {
  race: EnterableRace
  busy: boolean
  onEnter: (id: string) => void
  onWithdraw: (id: string) => void
}) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-3 py-2 text-xs tabular-nums text-slate-400">GD {race.startDay}</td>
      <th scope="row" className="px-2 py-2 text-left font-normal">
        <Link
          to={`/world/races/${race.raceId}`}
          className="font-medium text-slate-800 hover:text-brand-cyan hover:underline"
        >
          {race.country && <Flag code={race.country} size={14} className="mr-1.5" />}
          {race.name}
        </Link>
        <span className="ml-2 font-mono text-[11px] text-slate-400">.{race.raceClass}</span>
      </th>
      <td className="px-2 py-2 text-right text-sm tabular-nums">
        <span className={race.affordable ? 'text-slate-700' : 'text-rose-600'}>
          {race.travelMoney.toLocaleString('en-US')}
        </span>
        {race.travelDays > 0 && (
          <span className="ml-1 text-xs text-slate-400">· {race.travelDays}d</span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        {race.enrolled ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Called up
          </span>
        ) : race.entered ? (
          <button
            type="button"
            onClick={() => onWithdraw(race.raceId)}
            disabled={busy}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Withdraw
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onEnter(race.raceId)}
            disabled={busy || !race.affordable}
            title={race.affordable ? 'Enter this race' : 'Not enough money for the trip'}
            className="rounded-md bg-brand-cyan px-2.5 py-1 text-xs font-medium text-white transition hover:bg-brand-cyan-light disabled:opacity-50"
          >
            Enter
          </button>
        )}
      </td>
    </tr>
  )
}

/** Pestaña "Available to enter" (solo agente libre): auto-inscripción con su coste de viaje. */
function EnterTab({ money }: { money: number | null }) {
  const queryClient = useQueryClient()
  const { data, isPending, isError } = useQuery({
    queryKey: ['race-entries'],
    queryFn: fetchEnterableRaces,
  })

  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'enter' | 'withdraw' }) =>
      action === 'enter' ? enterRace(id) : withdrawRace(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['race-entries'] })
      await queryClient.invalidateQueries({ queryKey: ['rider', 'upcoming'] })
    },
  })

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the races you can enter.</p>

  const committed = data
    .filter((r) => r.entered && !r.enrolled)
    .reduce((s, r) => s + r.travelMoney, 0)

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
        <Empty>No continental races left to enter this season.</Empty>
      ) : (
        <Panel title="Still open" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Races you can still enter, with their travel cost
              </caption>
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-400">
                  <th scope="col" className="px-3 py-2 font-medium">
                    Day
                  </th>
                  <th scope="col" className="px-2 py-2 font-medium">
                    Race
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">
                    Travel
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Entry
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((race) => (
                  <EnterableRow
                    key={race.raceId}
                    race={race}
                    busy={mutation.isPending}
                    onEnter={(id) => mutation.mutate({ id, action: 'enter' })}
                    onWithdraw={(id) => mutation.mutate({ id, action: 'withdraw' })}
                  />
                ))}
              </tbody>
            </table>
          </div>
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
  const { data, isPending, isError } = useQuery({
    queryKey: ['rider', 'results', riderId],
    queryFn: () => fetchRiderResults(riderId!),
    enabled: !!riderId,
  })
  const [expanded, setExpanded] = useState(false)

  if (!riderId || isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load your results.</p>
  if (data.length === 0) return <Empty>You haven't raced yet. Your results will land here.</Empty>

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
                  {/* El desglose de etapas cuelga de la carrera, plegado: el titular es la general. */}
                  {hasStageBreakdown(r) && (
                    <details className="mt-0.5">
                      <summary className="cursor-pointer list-none text-xs text-slate-400 hover:text-brand-cyan">
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
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </th>
                <td className="px-2 py-2 text-slate-500">{raceResultKind(r)}</td>
                <td
                  className={`px-3 py-2 text-right font-bold tabular-nums ${
                    r.dnf || r.gcPuesto == null
                      ? 'text-slate-400'
                      : r.gcPuesto === 1
                        ? 'text-amber-500'
                        : r.gcPuesto <= 3
                          ? 'text-slate-700'
                          : 'text-slate-500'
                  }`}
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
  const summary = useQuery({ queryKey: ['rider', 'summary'], queryFn: fetchRiderSummary })
  const rider = useQuery({ queryKey: ['rider', 'me'], queryFn: fetchMyRider })

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
        {active === 'results' && <ResultsTab riderId={rider.data?.id ?? null} />}
      </TabPanel>
    </section>
  )
}
