import { type RiderRaceResult, raceIdFromKey, seasonPosition } from '@cyclingstar/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { RaceClass } from '../api/calendar'
import { type EnterableRace, enterRace, fetchEnterableRaces, withdrawRace } from '../api/raceEntry'
import { fetchRiderResults } from '../api/rankings'
import { fetchMyRider, fetchMyUpcomingRaces, fetchRiderSummary, retireFromRace } from '../api/rider'
import { TOP_ROWS } from '../components/ShowAll'
import { StageRoute } from '../components/StageRoute'
import { TabPanel, useTabParam } from '../components/Tabs'
import { ActionRow } from '../components/ui/ActionRow'
import { Button } from '../components/ui/Button'
import { Disclosure } from '../components/ui/Disclosure'
import { EmptyState } from '../components/ui/EmptyState'
import { Flag } from '../components/ui/Flag'
import { Icon } from '../components/ui/Icon'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { QueryView } from '../components/ui/QueryView'
import { RankTable, type RankTableColumn } from '../components/ui/RankTable'
import { Segmented } from '../components/ui/Segmented'
import { ShowAllRows } from '../components/ui/ShowAllRows'
import { Stat } from '../components/ui/Stat'
import { type TabOption, Tabs } from '../components/ui/Tabs'
import { TextLink } from '../components/ui/TextLink'
import { TONES } from '../components/ui/styles'
import { raceClassLabel, travelDaysLabel } from '../domain/labels'
import { programmeTravel } from '../domain/programme'
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

  // Los estados, con `QueryView` (E3, PR 10), y en cada uno la respuesta de la 02 (§7.3; desde la revisión
  // del 21b): el programa; sin él, lo pedido, o lo que lo espera; y si no hay nada, el vacío
  if (upcoming.data === undefined)
    return (
      <QueryView
        query={upcoming}
        label="your races"
        skeleton={{ kind: 'rows', rowHeight: 64 }}
        answer
      />
    )

  const races = upcoming.data ?? []
  // Lo que pedí y todavía no es una convocatoria: la carrera aún no ha cerrado su lista de salida.
  const pending = (entries.data ?? []).filter((r) => r.entered && !r.enrolled)

  // El vacío, con las inscripciones ya en la mano: mientras llegan, o si fallan, no se dice que no hay nada.
  if (races.length === 0 && pending.length === 0 && entries.data !== undefined) {
    return (
      <EmptyState
        text="No races on your programme yet. Your team enters you about two weeks before the start — and as a free agent you can enter races yourself."
        answer
      />
    )
  }

  return (
    <>
      {races.length > 0 && (
        // las filas con su acción (E3, PR 12a): `Set orders`, y en una carrera por etapas en curso, la
        // retirada debajo
        // la respuesta de la 02 (§7.3; desde el PR 21b, en el `Panel` del catálogo)
        <Panel title="On your programme" answer>
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
                meta={
                  <>
                    {[
                      r.bib != null ? `Bib ${r.bib}` : null,
                      r.ongoing ? 'Racing now' : formatGameDay(diaDeTemporada(r.startGameDay), hoy),
                      r.country,
                    ]
                      .filter((p) => p !== null)
                      .join(' · ')}
                    {/* el viaje, donde se decide (E3, §11.6; PR 15): cuándo sale, cuándo vuelve y lo pagado */}
                    {programmeTravel(r) !== null && (
                      <span className="flex items-center gap-1">
                        <Icon name="travel" size={16} />
                        {programmeTravel(r)}
                      </span>
                    )}
                  </>
                }
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
            <p role="alert" className="text-meta text-bad">
              Could not withdraw from the race.
            </p>
          )}
        </Panel>
      )}

      {/* las inscripciones que esperan la lista de salida, con sus estados (E3, PR 10) */}
      {entries.data === undefined && (
        <QueryView
          query={entries}
          label="your race entries"
          skeleton={{ kind: 'rows', rowHeight: 64 }}
          answer={races.length === 0}
        />
      )}
      {pending.length > 0 && (
        <Panel title="Entered — waiting for the start list" answer={races.length === 0}>
          <ul className="divide-y divide-line">
            {pending.map((r) => (
              <li
                key={r.raceId}
                className="flex flex-wrap items-center justify-between gap-x-3 text-meta"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {r.country && <Flag country={r.country} />}
                  <TextLink to={`/world/races/${raceIdFromKey(r.raceId)}`}>{r.name}</TextLink>
                </span>
                <span className="text-caption text-ink-2">
                  {formatGameDay(r.startDay, hoy)} · travel {r.travelMoney.toLocaleString('en-US')}
                  {r.travelDays > 0 && ` · ${travelDaysLabel(r.travelDays)}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-caption text-ink-2">
            You pay the trip when the race calls you up. Until then you can still withdraw from the{' '}
            <span className="font-semibold">Available to enter</span> tab.
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
        answer
      />
    )

  const committed = data
    .filter((r) => r.entered && !r.enrolled)
    .reduce((s, r) => s + r.travelMoney, 0)
  const lista =
    filtro === 'affordable' ? data.filter((r) => r.affordable || r.entered || r.enrolled) : data

  return (
    <>
      <p className="text-meta text-ink-2">
        As a free agent you enter continental races (.1/.2) yourself, and you pay your own travel —
        transport and hotel — out of your balance when the race calls you up. National championships
        you qualify for automatically.
      </p>
      {/* las cifras, en `Stat` (§4.4; desde el PR 21b): lo comprometido con su signo, y el cero sin él ni rosa
          (captura 03). En el teléfono, en un renglón que parte, y no en columnas: cada una mide lo que su cifra
          y la que no cabe baja, porque en `display` y con DejaVu Sans `100,000` pide 146 px y `−12,000` 150, y
          media columna a 320 da 136 (medido; la revisión del 21b) */}
      <div className="flex flex-wrap gap-x-6 gap-y-3 sm:grid sm:grid-cols-3">
        <Stat label="Balance" value={money ?? '—'} />
        <Stat label="Committed" value={-committed} signed />
        <Stat label="Entered" value={data.filter((r) => r.entered).length} />
      </div>

      {data.length === 0 ? (
        <EmptyState text="No continental races left to enter this season." answer />
      ) : (
        // las filas con su acción (E3, PR 12a): de 193 filas en 19.914 px, a las 20 primeras; la respuesta de
        // la 03 (§7.3; desde el PR 21b, en el `Panel` del catálogo)
        <Panel title="Still open" answer>
          <div className="flex flex-col gap-3">
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
            <ShowAllRows
              total={lista.length}
              expanded={todas}
              onToggle={() => setTodas((t) => !t)}
            />
          </div>
        </Panel>
      )}
      {mutation.isError && (
        <p role="alert" className="text-meta text-bad">
          Could not update your entry.
        </p>
      )}
    </>
  )
}

/** El desglose de las etapas de una vuelta, plegado: el titular es la general (docs/navegacion.md §3.6). */
function Etapas({ r }: { readonly r: RiderRaceResult }) {
  return (
    // sin región: una por fila, y abiertas, todas se llamarían `Hide the stages` (la revisión del 21b)
    <Disclosure showLabel={stagesSummary(r)} hideLabel="Hide the stages" region={false}>
      <ul className="px-3 pb-1">
        {r.stages.map((s) => (
          // las cifras, tabulares: `Stage 1 of 5` y `Stage 2 of 5` miden lo mismo, y los recorridos empiezan a la
          // vez mientras las etapas tengan las mismas cifras (en una de 21, de la 10 en adelante, uno más allá)
          <li key={s.stageDay} className="flex items-center gap-2 text-meta tabular-nums">
            <span
              className={`w-10 shrink-0 text-right font-semibold ${
                s.puesto === 1 ? TONES.good.text : 'text-ink-2'
              }`}
            >
              {ordinal(s.puesto)}
            </span>
            <TextLink to={`/world/races/${r.raceId}/stages/${s.stageDay}`} layout="shrink-0">
              {`Stage ${s.stageDay} of ${r.stageCount}`}
            </TextLink>
            <StageRoute from={s.from} to={s.to} className="min-w-0 text-ink-3" />
          </li>
        ))}
      </ul>
    </Disclosure>
  )
}

/**
 * Las columnas de mis resultados (§6.1): la temporada y qué es el resultado, en el segundo renglón hasta
 * 640 (`Season 1 · Overall`); el puesto, siempre, con su tono (`placeTone`).
 */
const COLUMNAS: readonly RankTableColumn<RiderRaceResult>[] = [
  {
    key: 'season',
    header: 'Season',
    priority: 'secondary',
    numeric: true,
    render: (r) => r.season + 1,
    second: (r) => `Season ${r.season + 1}`,
  },
  { key: 'result', header: 'Result', priority: 'secondary', render: raceResultKind },
  {
    key: 'place',
    header: 'Place',
    priority: 'primary',
    numeric: true,
    render: (r) => (
      <span className={`font-bold ${TONES[placeTone(r)].text}`}>{raceResultPlace(r)}</span>
    ),
  },
]

/**
 * Pestaña "Results": mis carreras corridas. Una fila POR CARRERA con mi puesto en la general —el
 * resultado de una vuelta es la general, se gane o no (docs/navegacion.md §3.6)— y las etapas
 * plegadas debajo, cada una con su enlace a la crónica. Desde el PR 21b, en la `RankTable` del catálogo:
 * la respuesta de la 37 (§7.3), sin puesto ni enlace de fila, porque la carrera enlaza en su nombre y
 * cada etapa en el suyo; y las etapas, en un `Disclosure` de 44 debajo del segundo renglón (`detail`).
 */
function ResultsTab({ riderId }: { riderId: string | null }) {
  const rev = useHorizonRev()
  const results = useQuery({
    queryKey: horizonKey(['rider', 'results', riderId], rev),
    queryFn: () => fetchRiderResults(riderId!),
    enabled: !!riderId && rev !== undefined,
  })
  const { data } = results

  // Los estados, con `QueryView` (E3, PR 10). El corredor ya llegó (`MyRaces`): sin él, la consulta no
  // corre, y no se queda cargando para siempre.
  const empty = <EmptyState text="You haven't raced yet. Your results will land here." answer />
  if (!riderId) return empty
  if (data === undefined)
    return (
      <QueryView
        query={results}
        label="your results"
        skeleton={{ kind: 'rows', rowHeight: 64 }}
        answer
      />
    )
  if (data.length === 0) return empty

  return (
    <Panel title="Races you have ridden" variant="bleed">
      <RankTable
        caption="Your races, most recent first: your overall place and the stages behind it"
        rows={data}
        rowKey={raceResultKey}
        identityHeader="Race"
        identity={(r) => (
          <>
            <TextLink to={`/world/races/${r.raceId}`}>{r.raceName}</TextLink>
            {/* con etapas en su velo (sup. H7; 9b): `3 stages to watch` */}
            {stagesToWatchText(r) !== null && (
              <span className={`block text-meta font-semibold ${TONES.good.text}`}>
                {stagesToWatchText(r)}
              </span>
            )}
            {/* un día: la etapa ES la carrera, y su de dónde a dónde va debajo del nombre */}
            {r.isOneDay && (
              <StageRoute
                from={r.stages[0]?.from}
                to={r.stages[0]?.to}
                className="block text-meta text-ink-3"
              />
            )}
          </>
        )}
        columns={COLUMNAS}
        detail={(r) => (hasStageBreakdown(r) ? <Etapas r={r} /> : null)}
        answer
      />
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
      <PageHeader title="My races" />
      <Tabs
        options={options}
        value={active}
        onChange={setActive}
        label="My races sections"
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
              answer
            />
          ) : (
            <ResultsTab riderId={rider.data?.id ?? null} />
          ))}
      </TabPanel>
    </section>
  )
}
