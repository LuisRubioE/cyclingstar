import type { HorizonSummary, RaceRouteSource, RouteSource } from '@cyclingstar/shared'
import {
  type UseQueryResult,
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { Fragment, Suspense, lazy, useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import type { RaceClass, RaceFormat } from '../api/calendar'
import { fetchRacePrefs, setRacePref } from '../api/objectives'
import {
  type RaceStagePlan,
  type RaceStartlist,
  type RaceStatus,
  type RaceView,
  daysUntilStart,
  endDay as raceEndDay,
  fetchRace,
  fetchStartlist,
  raceViewKey,
} from '../api/race'
import { putFollow } from '../api/watch'
import { authClient } from '../auth/client'
import { RiderName } from '../components/RiderName'
import { GcRankTable, PointsRankTable } from '../components/RaceRankTables'
import { DiagnosticStrip } from '../components/StageGate'
import { StageRoute } from '../components/StageRoute'
import { TeamClassNote, TeamClassTable } from '../components/TeamClassTable'
import { TabPanel, useTabParam } from '../components/Tabs'
import { TeamLink } from '../components/TeamLink'
import { useOwnIds } from '../components/useTableIdentity'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { EmptyState } from '../components/ui/EmptyState'
import { Flag } from '../components/ui/Flag'
import { Icon } from '../components/ui/Icon'
import { InfoButton } from '../components/ui/InfoButton'
import { Notice } from '../components/ui/Notice'
import { Panel } from '../components/ui/Panel'
import { LoadingState, QueryView } from '../components/ui/QueryView'
import { type TabOption, Tabs } from '../components/ui/Tabs'
import { TeamJersey } from '../components/ui/TeamJersey'
import { TextLink } from '../components/ui/TextLink'
import { FOCUS } from '../components/ui/styles'
import type { Tone } from '../components/ui/types'
import {
  ROUTE_SOURCE_LABEL,
  editionLabel,
  formatLabel,
  raceClassLabel,
  raceRouteSourceLabel,
  raceTeamLabel,
} from '../domain/labels'
import { usePageTitle } from '../domain/pageTitle'
import { stageRowLink, stageRowState } from '../domain/raceStages'
import { type TableIdentity, identityFromStartlist } from '../domain/tableIdentity'
import { type RaceTabId, raceTabLabel, raceTabOf, raceTabs } from '../domain/raceTabs'
import { type ReadyRace, finalVeiled, raceKeyOn, raceVeil, raceVeilNotice } from '../domain/veil'
import {
  diagOf,
  useHealth,
  useHorizon,
  useHorizonRev,
  useWatchOn,
  veilApplies,
} from '../queryClient'

/**
 * La ficha de una carrera de un día terminada (`OneDayRace.tsx`, 11-o), cargada solo cuando se pinta: lleva
 * la etapa (su ruta, el acta, la puerta, la radio y `Watch`), que la ficha de una vuelta no necesita.
 */
const OneDaySections = lazy(() =>
  import('./OneDayRace').then((m) => ({ default: m.OneDaySections })),
)

/**
 * El punto del tipo de etapa, junto a su palabra, que es la que lo dice (desde el PR 21a, con tokens): la
 * llana en `good`, la media en `warn`, la reina en `bad`, la crono en `accent` y la clásica en `gold`.
 */
const KIND_DOT: Record<string, string> = {
  llana: 'bg-good',
  media: 'bg-warn',
  reina: 'bg-bad',
  cri: 'bg-accent',
  clasica: 'bg-gold',
}

/**
 * El tono de la marca de origen (docs/generador.md §11.4), en un `Chip` desde el PR 21a: `good` solo lo
 * real, `warn` lo que tiene ciudades y distancia reales con el relieve generado, y `neutral` lo inventado.
 */
const SOURCE_TONE: Record<RouteSource | RaceRouteSource, Tone> = {
  real: 'good',
  edicion: 'warn',
  mixto: 'warn',
  generado: 'neutral',
}

const DIVISION_LABEL: Record<string, string> = {
  WT: 'WorldTour',
  PRS: 'ProTeams',
  CON: 'Continental',
}
const DIVISION_ORDER = ['WT', 'PRS', 'CON']

/**
 * Lista provisional de inscritos de una carrera a punto de empezar: los equipos que se espera que
 * acudan (agrupados por división) y los agentes libres ya apuntados. Las escuadras se nombran el día de
 * salida, así que aquí van los equipos, no aún sus 7-8 corredores.
 */
function Startlist({ data }: { data: RaceStartlist }) {
  const frozen = data.frozen ?? false
  const byDivision = DIVISION_ORDER.map((div) => ({
    div,
    teams: data.teams.filter((t) => t.division === div),
  })).filter((g) => g.teams.length > 0)
  return (
    <Panel
      title={frozen ? 'Startlist' : 'Provisional startlist'}
      action={
        data.daysUntil != null && (
          <span className="text-caption text-ink-3">
            starts in {data.daysUntil} {data.daysUntil === 1 ? 'day' : 'days'}
          </span>
        )
      }
    >
      {data.teams.length === 0 && data.freeAgents.length === 0 ? (
        <EmptyState text="No entries yet." />
      ) : (
        <div className="space-y-3">
          {byDivision.map((g) => (
            <div key={g.div}>
              <h3 className="text-meta font-semibold text-ink-2">
                {DIVISION_LABEL[g.div] ?? g.div}{' '}
                <span className="font-normal text-ink-3">({g.teams.length})</span>
              </h3>
              {frozen ? (
                // Escuadra congelada: cada equipo con sus corredores reales.
                <div className="mt-1 space-y-2">
                  {g.teams.map((t) => (
                    <div key={t.id}>
                      <div className="flex items-center gap-1.5 text-meta font-semibold">
                        <TeamJersey team={{ name: t.name, kit: t.kit }} size={28} />
                        {t.country && <Flag country={t.country} />}
                        <TeamLink teamId={t.id} name={t.name} className="text-ink" />
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 pl-1">
                        {t.riders.map((r) => (
                          <span key={r.id} className="flex items-center gap-1 text-meta">
                            {r.bib != null && (
                              <span className="tabular-nums text-caption text-ink-3">{r.bib}</span>
                            )}
                            <Flag country={r.country} height={12} />
                            <RiderName riderId={r.id} name={r.name} isBot={r.isBot} />
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Aún por congelar: solo los equipos previstos, sin nombrar corredores.
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  {g.teams.map((t) => (
                    <span key={t.id} className="flex items-center gap-1.5 text-meta">
                      <TeamJersey team={{ name: t.name, kit: t.kit }} size={28} />
                      {t.country && <Flag country={t.country} />}
                      <TeamLink teamId={t.id} name={t.name} className="text-ink" />
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {data.freeAgents.length > 0 && (
            <div>
              <h3 className="text-meta font-semibold text-ink-2">
                Free agents{frozen ? '' : ' signed up'}{' '}
                <span className="font-normal text-ink-3">({data.freeAgents.length})</span>
              </h3>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {data.freeAgents.map((r) => (
                  <span key={r.id} className="flex items-center gap-1.5 text-meta">
                    <Flag country={r.country} />
                    <RiderName riderId={r.id} name={r.name} isBot={r.isBot} />
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <p className="mt-3 text-caption text-ink-3">
        {frozen
          ? 'Entries closed — these are the confirmed squads for the race.'
          : 'Provisional — each team names its squad of riders when entries close, about two weeks out.'}
      </p>
    </Panel>
  )
}

/** Recorrido de una etapa en una línea: tipo, salida → meta y kilómetros. */
function StageLine({ stage, oneDay }: { stage: RaceStagePlan; oneDay: boolean }) {
  return (
    <>
      {/* redondo con el radio del tema, que en 8 px es un círculo: `rounded-full` es solo de `Chip` (D-07) */}
      <span
        className={`inline-block h-2 w-2 shrink-0 rounded-ui ${KIND_DOT[stage.kind] ?? 'bg-line-strong'}`}
        aria-hidden
      />
      {/*
        En una carrera de un día no hay «Stage 1» que numerar: la etapa ES la carrera, y su nombre
        del calendario («Stage 1 · Classic») no dice nada que no diga ya la ficha de arriba. Se deja
        solo la etiqueta.
      */}
      <span className="font-semibold text-ink">
        {oneDay ? stage.label : `Stage ${stage.index}`}
      </span>
      {/*
        La ETIQUETA del calendario, no el tipo. Son dos vocabularios para lo mismo —«Summit finish»
        contra «Mountain», «Uphill finish» contra «Hilly»— y el del calendario es el preciso: sabe
        distinguir la reina que muere arriba de la que baja a meta. El tipo sigue mandando en el
        color del punto, que es para lo que sirve.
      */}
      {!oneDay && <span className="hidden text-caption text-ink-3 sm:inline">{stage.label}</span>}
      <StageRoute from={stage.from} to={stage.to} className="truncate text-ink-2" />
      {stage.timeTrial && <span className="text-caption font-semibold text-accent">ITT</span>}
      <span className="ml-auto shrink-0 tabular-nums text-ink-3">{stage.km} km</span>
    </>
  )
}

/**
 * DE DÓNDE SALE EL RECORRIDO Y CÓMO ES, bajo la línea de cada etapa (docs/generador.md §10.8 y
 * §11.4; D10 con su valor por defecto). Siempre la marca de origen. En lo que no es real, además, la
 * edición, la frase de arquitectura, que es lo que hace reconocible una carrera un año después sin
 * mapa, y lo que cambió respecto de la edición anterior. Una etapa real no lleva ni frase ni edición:
 * no varía de un año a otro.
 *
 * La frase y los cambios los escribe el motor ya en inglés (`arch.frase`, `diffMotivos`; v87 §3),
 * como el resto de la interfaz del MVP, y se enseñan tal cual. Traducirlos aquí sería una segunda
 * gramática que mantener al lado de la del motor; el multiidioma (E10) los traducirá allí.
 */
function StageRouteNote({ stage }: { stage: RaceStagePlan }) {
  const real = stage.routeSource === 'real'
  return (
    <div className="mb-1.5 space-y-1 pl-4 text-caption">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <Chip tone={SOURCE_TONE[stage.routeSource]}>{ROUTE_SOURCE_LABEL[stage.routeSource]}</Chip>
        {!real && <span className="text-ink-3">{editionLabel(stage.edicion)}</span>}
      </p>
      {!real && stage.arch && <p className="text-ink-2">{stage.arch.frase}</p>}
      {!real && stage.cambiosRespectoAnterior.length > 0 && (
        <div>
          <p className="text-ink-3">Changes from the last edition</p>
          <ul className="list-disc pl-4 text-ink-2">
            {stage.cambiosRespectoAnterior.map((cambio) => (
              <li key={cambio}>{cambio}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** Pestaña `Route`: las altimetrías, que es donde el jugador las busca (y solo aquí). */
function RouteTab({ data }: { data: RaceView }) {
  const oneDay = data.stages.length === 1
  return (
    <Panel title={oneDay ? 'Route' : 'Stage profiles'}>
      <ol className="space-y-4">
        {data.stages.map((stage) => (
          <Fragment key={stage.index}>
            <li>
              <div className="mb-1 flex items-center gap-2 text-meta">
                <StageLine stage={stage} oneDay={oneDay} />
              </div>
              <StageRouteNote stage={stage} />
              {/* Altimetría del recorrido que el mundo corre (relieve + puertos). SVG del backend. */}
              <div
                className="w-full overflow-x-auto rounded-ui bg-surface-2 p-1"
                role="img"
                aria-label={`Elevation profile of ${stage.name}, ${stage.km} km`}
                dangerouslySetInnerHTML={{ __html: stage.altimetry }}
              />
            </li>
            {data.restAfter.includes(stage.index) && <RestDay />}
          </Fragment>
        ))}
      </ol>
    </Panel>
  )
}

/** El día de descanso tras una etapa (grandes vueltas y alguna vuelta por etapas), entre dos filetes. */
function RestDay() {
  return (
    <li className="flex items-center gap-2 py-1 text-caption font-semibold uppercase tracking-caps text-ink-3">
      <span className="h-px flex-1 bg-line" />
      Rest day
      <span className="h-px flex-1 bg-line" />
    </li>
  )
}

/**
 * Pestaña `Stages`: lista compacta de las etapas —día, tipo, recorrido y ganador, con enlace a la
 * crónica—. Sin altimetrías: una gran vuelta son 21 y su sitio es `Route`.
 *
 * SIN MAILLOTS a propósito: cada línea es el ganador de un día distinto, y el único juego de
 * maillots que esta página tiene es el de HOY. Poner el amarillo de hoy junto al ganador de la
 * etapa 3 diría algo que no es verdad de esa etapa. Los maillots de cada día están en su ficha.
 *
 * BAJO EL VELO (E2, §11.17; sup. C4; 9b): cada fila enseña lo que el servidor manda (`stageRowState`): el
 * ganador de las etapas que el velo de quien mira deja pasar, con su acta; `Ready to watch` en las corridas
 * sin ganador servido, que llevan a la etapa (que abre en `Watch`); y `Not raced yet` en las demás. Hasta el
 * 9b una etapa corrida y velada decía `Not raced yet`, que es falso.
 */
function StagesTab({
  data,
  raceId,
  watchOn,
}: {
  data: RaceView
  raceId: string
  watchOn: boolean
}) {
  const winnerOf = new Map(data.stageWinners.map((w) => [w.stageDay, w]))
  return (
    <Panel title="Stages">
      <ol>
        {data.stages.map((stage) => {
          const winner = winnerOf.get(stage.index)
          const state = stageRowState(stage, winnerOf, data.runDays)
          const link = stageRowLink(raceId, stage.index, state, watchOn)
          return (
            <Fragment key={stage.index}>
              <li className="border-b border-line py-1.5 last:border-0">
                <div className="flex items-center gap-2 text-meta">
                  <StageLine stage={stage} oneDay={data.stages.length === 1} />
                </div>
                <div className="flex min-h-11 items-center gap-2 pl-4 text-meta">
                  {state === 'report' && winner ? (
                    <>
                      <Flag country={winner.country} />
                      <RiderName riderId={winner.riderId} name={winner.name} isBot={winner.isBot} />
                      <span className="hidden text-caption text-ink-3 sm:inline">
                        {raceTeamLabel(winner.teamName)}
                      </span>
                    </>
                  ) : state === 'watch' ? (
                    <span className="text-caption font-semibold text-good">Ready to watch</span>
                  ) : (
                    <span className="text-caption text-ink-3">Not raced yet</span>
                  )}
                  {/* Directo al acta (o a la etapa, si está por ver), no a la etapa en su pestaña por
                      defecto: un clic menos en cada una de las 21 etapas de una gran vuelta. */}
                  {link !== null && (
                    <TextLink to={link.to} layout="ml-auto shrink-0">
                      {link.label}
                    </TextLink>
                  )}
                </div>
              </li>
              {data.restAfter.includes(stage.index) && <RestDay />}
            </Fragment>
          )
        })}
      </ol>
    </Panel>
  )
}

type ClassTabId = 'gc' | 'points' | 'kom' | 'teams'

const CLASS_TAB_IDS: readonly ClassTabId[] = ['gc', 'points', 'kom', 'teams']
const CLASS_PANEL = 'race-classification'
const CLASS_TABS: readonly TabOption<ClassTabId>[] = [
  { key: 'gc', label: 'General' },
  { key: 'points', label: 'Points' },
  { key: 'kom', label: 'Mountains' },
  { key: 'teams', label: 'Teams' },
]

/** Un vacío en un `Panel` de borde a borde, con el relleno de lado que el panel no le da. */
function Bare({ text }: { text: string }) {
  return (
    <div className="px-3 sm:px-4">
      <EmptyState text={text} />
    </div>
  )
}

/**
 * Pestaña `Classifications` (o `Result` en una carrera de un día): general, puntos, montaña y
 * equipos, que se eligen en las pestañas del catálogo desde el PR 21a.
 *
 * Los maillots que se marcan son los de AHORA (`data.leaders`): la ficha de carrera enseña el
 * estado actual de la carrera, no el de un día concreto, así que aquí solo hay un juego. Y en una
 * carrera de un día no hay ninguno —no hay clasificación que arrastrar de una jornada a otra—, así
 * que la API los manda todos a null y no se pinta nada.
 * En una carrera de un día la "general" ES el resultado de la llegada,
 * así que se rotula como tal; y si además no hay nada más que enseñar, no se pinta ninguna tira de
 * sub-pestañas: sobra una pestaña única sobre una sola tabla.
 *
 * Las tablas, en `RankTable` desde el PR 12b (E3, docs/visual.md §6.1; `components/RaceRankTables.tsx`):
 * con el dorsal y el dibujo del equipo de la lista de salida (`identity`) y la fila del jugador (`own`);
 * la que está a la vista contesta a la pantalla (§7.3).
 */
function ClassificationsTab({
  data,
  identity,
  own,
}: {
  data: RaceView
  identity: TableIdentity
  own: { readonly riderId: string | null; readonly teamId: string | null }
}) {
  const ctx = {
    leaders: data.leaders,
    champions: data.champions,
    identity,
    ownRiderId: own.riderId,
    answer: true,
  } as const
  // Sub-pestaña en `?cls=`, validada contra las opciones: un enlace a una clasificación concreta
  // funciona, y hasta que el jugador toca una no se escribe nada en la URL.
  const [active, setActive] = useTabParam(CLASS_TAB_IDS, 'gc', 'cls')
  const oneDay = data.stages.length === 1
  // Sin puntos, sin montaña y sin equipos no hay nada que elegir: una sola tabla no merece una tira
  // de sub-pestañas (docs/navegacion.md §7.1).
  const alone =
    oneDay && data.points.length === 0 && data.kom.length === 0 && data.teamGc.length === 0
  const tabs = oneDay
    ? [{ key: 'gc' as const, label: 'Result' }, ...CLASS_TABS.slice(1)]
    : CLASS_TABS
  // De borde a borde, en el `Panel` `bleed` de §6.1 (desde el PR 21a): a 320 el nombre cabe, y lo que no
  // es la tabla lleva su propio relleno de lado.
  if (alone) {
    return (
      <Panel title="Result" variant="bleed">
        {data.gc.length > 0 ? (
          <GcRankTable rows={data.gc} caption="Result" {...ctx} />
        ) : (
          <Bare text="No result yet." />
        )}
      </Panel>
    )
  }
  return (
    <Panel ariaLabel="Classifications" variant="bleed">
      {/* las cuatro, en las pestañas del catálogo, de 44, y no en un `Segmented`: con DejaVu Sans no
          caben a lo ancho a 320 (piden 310 px y hay 272), y el carril de `Tabs` se desplaza (§6.3) */}
      <Tabs
        options={tabs}
        value={active}
        onChange={setActive}
        label="Classification"
        panelId={CLASS_PANEL}
      />
      <TabPanel panelId={CLASS_PANEL} active={active} className="mt-3">
        {active === 'gc' &&
          (data.gc.length > 0 ? (
            <GcRankTable
              rows={data.gc}
              caption={oneDay ? 'Result' : 'General classification'}
              {...ctx}
            />
          ) : (
            <Bare text="No general classification yet." />
          ))}
        {active === 'points' &&
          (data.points.length > 0 ? (
            <PointsRankTable rows={data.points} caption="Points classification" {...ctx} />
          ) : (
            <Bare text="No sprint points awarded yet." />
          ))}
        {active === 'kom' &&
          (data.kom.length > 0 ? (
            <PointsRankTable rows={data.kom} caption="Mountains classification" {...ctx} />
          ) : (
            <Bare text="No mountain points awarded yet." />
          ))}
        {active === 'teams' &&
          (data.teamGc.length > 0 ? (
            <>
              <TeamClassTable
                rows={data.teamGc}
                ownTeamId={own.teamId}
                cumulative={!oneDay}
                answer
              />
              <TeamClassNote />
            </>
          ) : (
            <Bare text="No team classification yet." />
          ))}
      </TabPanel>
    </Panel>
  )
}

/** Pestaña `Roll of honour`: quién ganó la carrera en temporadas anteriores. */
function HonoursTab({ data }: { data: RaceView }) {
  return (
    <Panel title="Roll of honour">
      {data.history.length === 0 ? (
        <EmptyState text="Nobody has won this race yet — it is a new one." />
      ) : (
        <ol className="space-y-1.5">
          {data.history.map((h) => (
            <li key={h.season} className="flex items-center gap-3 text-meta">
              <span className="w-20 shrink-0 text-ink-3">Season {h.season + 1}</span>
              <Flag country={h.winnerCountry} />
              <span className="font-semibold text-ink">{h.winnerName}</span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}

/** El estado de la carrera, en un `Chip` desde el PR 21a: por correr, `neutral`; en curso, `good`; terminada, `info`. */
const STATUS_CHIP: Record<RaceStatus, { label: string; tone: Tone }> = {
  upcoming: { label: 'Upcoming', tone: 'neutral' },
  racing: { label: 'Racing now', tone: 'good' },
  finished: { label: 'Finished', tone: 'info' },
}

const RACE_PANEL = 'race-section'

/**
 * La pestaña `Startlist`: la lista provisional, o por qué no la hay. Sus estados, con `QueryView` (E3,
 * PR 10): mientras llega, o si falla, ya no dice que la lista aún no se ha publicado.
 */
function StartlistTab({
  status,
  startlist,
}: {
  status: RaceStatus
  startlist: UseQueryResult<RaceStartlist>
}) {
  if (startlist.data === undefined)
    return <QueryView query={startlist} label="the startlist" skeleton={{ kind: 'panel' }} />
  if (startlist.data.upcoming) return <Startlist data={startlist.data} />
  return (
    <Panel title="Startlist">
      <EmptyState
        text={
          status === 'racing'
            ? 'Entries are closed and the race is under way — everyone on the road is in the general classification.'
            : 'The startlist is published about two weeks before the start, when teams name their squads.'
        }
      />
    </Panel>
  )
}

/**
 * El contador de `Stages` (sup. T4): cuenta etapas por ver, nunca resultados. Desde el PR 21a, en el `Tabs`
 * del catálogo: la cifra en un `Chip` `accent`, que el lector no oye, y la frase entera, que oye en su lugar.
 */
function StagesBadge({ n }: { n: number }) {
  return (
    <>
      <span aria-hidden="true">
        <Chip tone="accent">{String(n)}</Chip>
      </span>
      <span className="sr-only">{`${n} ${n === 1 ? 'stage' : 'stages'} ready to watch`}</span>
    </>
  )
}

/**
 * La tira de pestañas y su panel de una carrera POR ETAPAS, o de una de un día sin terminar. Vive en su
 * propio componente porque el conjunto de pestañas depende del estado de la carrera, y ese estado solo se
 * conoce con los datos ya cargados: así el `useTabParam` se monta cuando sus opciones son estables, sin
 * hooks condicionados.
 */
function RaceSections({
  data,
  raceId,
  status,
  startlist,
  watchOn,
  veil,
  identity,
  own,
}: {
  data: RaceView
  raceId: string
  status: RaceStatus
  startlist: UseQueryResult<RaceStartlist>
  watchOn: boolean
  veil: ReadyRace | null
  identity: TableIdentity
  own: { readonly riderId: string | null; readonly teamId: string | null }
}) {
  const [params] = useSearchParams()
  // una vuelta, o una carrera de un día sin terminar, no mira `seen` ni `watchOn` (§11.17)
  const tabIds = raceTabs(status, data.race.stageCount, true, watchOn)
  // La pestaña por defecto la manda el estado (la primera del conjunto). `useTabParam` valida el
  // `?tab=` contra las opciones de ESTE estado y no escribe nada en la URL hasta que se toca una,
  // así que un enlace compartido abre donde toca y el resto se comporta como espera el jugador.
  const [active, setActive] = useTabParam(
    tabIds,
    raceTabOf(params.get('tab'), tabIds) ?? (tabIds[0] as RaceTabId),
  )
  const options: TabOption<RaceTabId>[] = tabIds.map((id) => ({
    key: id,
    label: raceTabLabel(id, watchOn),
    ...(id === 'stages' && veil !== null ? { badge: <StagesBadge n={veil.stages.length} /> } : {}),
  }))
  return (
    <>
      <Tabs
        options={options}
        value={active}
        onChange={setActive}
        label="Race"
        panelId={RACE_PANEL}
      />
      <TabPanel panelId={RACE_PANEL} active={active}>
        {active === 'classifications' && (
          <ClassificationsTab data={data} identity={identity} own={own} />
        )}
        {active === 'stages' && <StagesTab data={data} raceId={raceId} watchOn={watchOn} />}
        {active === 'route' && <RouteTab data={data} />}
        {active === 'startlist' && <StartlistTab status={status} startlist={startlist} />}
        {active === 'honours' && <HonoursTab data={data} />}
      </TabPanel>
    </>
  )
}

/**
 * `Follow without spoilers` y `Stop protecting this race` (E2, docs/retransmision.md §10.4, D-30; 9b): seguir
 * una carrera la pone en guardia (sus etapas corridas y no vistas se velan en toda la web) y soltarla la saca
 * aunque sea propia o de cabecera (`follow = −1` gana a toda fuente). Solo con el velo para quien mira y con
 * sesión: las escrituras de `/api/me/*` la piden (§10.8). El `rev` de después cambia las claves de una vez.
 */
function FollowRace({ raceKey, protecting }: { raceKey: string; protecting: boolean }) {
  const queryClient = useQueryClient()
  const follow = useMutation({
    mutationFn: () => putFollow(raceKey, protecting ? 'drop' : 'follow'),
    onSuccess: ({ rev }) => {
      queryClient.setQueryData<HorizonSummary | null>(['horizon'], (old) =>
        old == null ? old : { ...old, rev },
      )
      // lo que queda por ver también cambia: el horizonte se pide otra vez
      void queryClient.invalidateQueries({ queryKey: ['horizon'] })
    },
  })
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button variant="secondary" size="sm" busy={follow.isPending} onClick={() => follow.mutate()}>
        {protecting ? 'Stop protecting this race' : 'Follow without spoilers'}
      </Button>
      {follow.isError && (
        <span role="alert" className="text-caption text-bad">
          Could not change this race.
        </span>
      )}
    </span>
  )
}

/** La URL de la página con unos parámetros cambiados (null quita el parámetro). */
function hrefWith(path: string, params: URLSearchParams, patch: Record<string, string | null>) {
  const next = new URLSearchParams(params)
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) next.delete(k)
    else next.set(k, v)
  }
  const q = next.toString()
  return q === '' ? path : `${path}?${q}`
}

export function Race() {
  const { raceId = '' } = useParams()
  const [params] = useSearchParams()
  const diag = diagOf(params)
  const rev = useHorizonRev()
  const queryClient = useQueryClient()
  // La ficha, a horizonte (P, F; 8a): con etapas veladas, las clasificaciones y los ganadores de tras la
  // última conocida. Con `?diag=1`, la del mundo para un administrador (§11.15). Con otro `rev` se queda la
  // de antes mientras llega la nueva.
  const raceView = useQuery({
    queryKey: raceViewKey(raceId, diag, rev),
    queryFn: () => fetchRace(raceId, { diag }),
    enabled: rev !== undefined,
    placeholderData: keepPreviousData,
  })
  const { data } = raceView
  // Lista provisional de inscritos (solo devuelve algo si la carrera está próxima y no se ha corrido). Es
  // L (se congela antes de la salida): no depende de lo visto y no espera al horizonte.
  const startlist = useQuery({
    queryKey: ['race-startlist', raceId],
    queryFn: () => fetchStartlist(raceId),
  })
  // Lo que las clasificaciones no traen (E3, PR 12b): el dorsal y el dibujo del equipo, de esta misma
  // lista, que tras la salida sirve la escuadra congelada; y lo propio.
  const identidad = useMemo(
    () => identityFromStartlist(startlist.data, startlist.isPending),
    [startlist.data, startlist.isPending],
  )
  const propio = useOwnIds()
  // Objetivos del jugador: si su ciclista puede marcar esta carrera como objetivo (influye en la
  // convocatoria y en la moral). Vacío si no ha iniciado sesión o no tiene ciclista.
  const prefs = useQuery({ queryKey: ['race-prefs'], queryFn: fetchRacePrefs })
  const myPref = prefs.data?.find((p) => p.raceId === raceId)
  const targetMutation = useMutation({
    mutationFn: (wanted: boolean) => setRacePref(raceId, wanted),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['race-prefs'] }),
  })
  // Lo que quien mira tiene por ver de esta carrera (§11.5): solo del horizonte (I-39).
  const health = useHealth()
  const horizon = useHorizon()
  const session = authClient.useSession()
  const raceKey = raceKeyOn(raceId, health.data?.gameDay)
  const veilRaw = raceVeil(horizon.data, raceKey)
  // `Watch` encendido para quien mira y si es un administrador (el modo diagnóstico y su botón)
  const sw = useWatchOn(diag || veilRaw !== null)
  const diagOn = diag && sw.isAdmin
  // en el modo diagnóstico la ficha llega entera: nada que avisar
  const veil = diagOn ? null : veilRaw
  // El título (E2, §11.8; 9a): la carrera, con la información de su etapa 1, como el fallback de la SPA
  // antes del JavaScript (11-c). Nada del desenlace.
  usePageTitle(
    data === undefined
      ? null
      : { raceName: data.race.name, stageDay: 1, stageCount: data.race.stageCount },
    'race',
  )

  // Los estados de la ficha, con `QueryView` (E3, PR 10).
  if (data === undefined)
    return <QueryView query={raceView} label="the race" skeleton={{ kind: 'header' }} />

  const status = data.status
  const untilStart = daysUntilStart(data)
  const stageCount = data.race.stageCount
  const startDay = data.race.startDay
  // Duración real de la carrera: sus etapas más los días de descanso intercalados.
  const endDay = raceEndDay(data)
  const chip = STATUS_CHIP[status]
  // En una carrera de un día la carrera Y la etapa son la misma cosa: los datos de la etapa (los
  // kilómetros y el tipo de recorrido) son los de la carrera, y su sitio es esta cabecera.
  const single = stageCount === 1 ? data.stages[0] : undefined
  // La cabecera `Winner` (sup. C1): solo si la última etapa no está en el velo de quien mira (la conoce, o
  // la carrera está fuera de su guardia o caducada). Si lo está, `Finished · ready to watch`: la general
  // que llega es la de tras la última conocida, y su primero no es el ganador.
  const finalHidden = status === 'finished' && finalVeiled(veil, stageCount)
  const winner = finalHidden ? undefined : (data.gc.find((r) => !r.dnf) ?? data.gc[0])
  const firstToWatch = veil === null ? null : Math.min(...veil.stages)
  // Seguir o soltar la carrera: con el velo para quien mira y con sesión (§10.4)
  const canFollow =
    veilApplies(rev) && !diagOn && raceKey !== null && !session.isPending && session.data != null
  const pagePath = `/world/races/${raceId}`

  return (
    <section className="space-y-4">
      {/* Cabecera persistente: no cambia al cambiar de pestaña. Desde el PR 21a (E3, §17.21), con el sistema:
          la vuelta de 44 de `PageHeader`, el `h1` en `page` con su bandera, el estado y la marca de origen en
          `Chip`, el velo en un `Notice` y el objetivo y el seguimiento en `Button`. */}
      <header className="grid gap-1">
        <Link
          to="/world/races"
          className={`inline-flex min-h-11 items-center gap-1 self-start rounded-ui text-meta text-accent ${FOCUS}`}
        >
          <Icon name="chevron-left" size={20} />
          Races
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="flex items-center gap-2 text-page text-ink">
            {data.race.country && <Flag country={data.race.country} height={24} />}
            {data.race.name}
          </h1>
          <Chip tone={chip.tone}>{chip.label}</Chip>
        </div>
        <p className="text-meta text-ink-2">
          {data.race.level}
          {` · ${raceClassLabel(data.race.raceClass as RaceClass)}`}
          {` · ${formatLabel(data.race.format as RaceFormat)}`}
          {stageCount > 1 ? ` · ${stageCount} stages` : ''}
          {/* La etiqueta del calendario, por lo mismo que en la lista de etapas. Una crono ya se
              llama «ITT» en ella, así que no hay que añadírselo detrás. */}
          {single ? ` · ${single.km} km · ${single.label}` : ''}
          {endDay > startDay ? ` · GD ${startDay}–${endDay}` : ` · GD ${startDay}`}
        </p>
        {/* La marca de origen de la carrera entera (§11.4) y, si algo en ella se genera, su edición
            en este mundo: lo real no cambia de un año a otro y no tiene edición que contar. */}
        <p className="flex flex-wrap items-center gap-2 text-caption">
          <Chip tone={SOURCE_TONE[data.race.routeSource]}>
            {raceRouteSourceLabel(data.race.routeSource, data.stages)}
          </Chip>
          {data.race.routeSource !== 'real' && data.stages[0] && (
            <span className="text-ink-3">{editionLabel(data.stages[0].edicion)}</span>
          )}
        </p>
        {status === 'finished' && winner && (
          <p className="mt-1 flex flex-wrap items-center gap-2 text-meta">
            <span className="text-ink-3">Winner</span>
            <Flag country={winner.country} />
            <span className="font-semibold text-ink">
              <RiderName riderId={winner.riderId} name={winner.name} isBot={winner.isBot} />
            </span>
            <span className="text-caption text-ink-3">{raceTeamLabel(winner.teamName)}</span>
          </p>
        )}
        {finalHidden && (
          <p className="mt-1 text-meta font-semibold text-good">Finished · ready to watch</p>
        )}
        {status === 'upcoming' && (
          <p className="mt-1 text-meta text-ink-2">
            {untilStart != null && untilStart > 0
              ? `Not raced this season yet — it starts in ${untilStart} ${untilStart === 1 ? 'day' : 'days'}.`
              : 'Not raced this season yet. It runs on its start GD.'}
          </p>
        )}
        {status === 'racing' && (
          <p className="mt-1 text-meta text-good">
            Under way — {data.runDays.length} of {stageCount} stages raced.
          </p>
        )}
      </header>
      {/* LO QUE ESCONDE (§11.5, sup. C2): las tablas son las de tras la última etapa conocida, y lo dice
          con un texto que solo depende del horizonte, con la primera por ver a un toque; desde el PR 21a,
          un `Notice` `info` que está desde el principio (`note`). */}
      {veil !== null && stageCount > 1 && firstToWatch !== null && (
        <Notice
          tone="info"
          title={raceVeilNotice(veil.stages, stageCount)}
          action={{
            label: sw.watchOn ? `Watch stage ${firstToWatch}` : `Stage ${firstToWatch} →`,
            to: `${pagePath}/stages/${firstToWatch}`,
          }}
        />
      )}
      {(myPref || canFollow) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {myPref && (
            <>
              <Button
                variant="secondary"
                size="sm"
                icon={myPref.wanted ? 'star-full' : 'star-empty'}
                busy={targetMutation.isPending}
                onClick={() => targetMutation.mutate(!myPref.wanted)}
              >
                {myPref.wanted ? 'Targeted' : 'Target this race'}
              </Button>
              {/* el porqué, que antes vivía solo en un `title` que el dedo no abre (ui/4) */}
              <InfoButton label="About targeted races">
                Your team weighs your targeted races when picking squads (and missing one you
                targeted stings your morale).
              </InfoButton>
            </>
          )}
          {myPref?.callup === 'selected' && (
            <span className="text-caption font-semibold text-good">You&apos;re in the squad</span>
          )}
          {myPref?.callup === 'not-selected' && (
            <span className="text-caption text-ink-3">Not selected this time</span>
          )}
          {canFollow && raceKey !== null && (
            <FollowRace raceKey={raceKey} protecting={veil !== null} />
          )}
        </div>
      )}
      {/* El modo diagnóstico del dueño (§11.15, 11-h): solo a un administrador con algo velado; en
          pequeño, como en la etapa (PR 20). */}
      {!diag && sw.isAdmin && veilRaw !== null && (
        <p className="text-right text-caption">
          <TextLink to={hrefWith(pagePath, params, { diag: '1' })}>Diagnostic view</TextLink>
        </p>
      )}

      {diagOn && <DiagnosticStrip exitHref={hrefWith(pagePath, params, { diag: null })} />}

      {stageCount === 1 && status === 'finished' ? (
        <Suspense fallback={<LoadingState label="the race" />}>
          <OneDaySections
            raceId={raceId}
            watchOn={sw.watchOn}
            watchSettled={sw.settled}
            veil={veil}
            classifications={<ClassificationsTab data={data} identity={identidad} own={propio} />}
            identity={identidad}
            ownRiderId={propio.riderId}
            route={<RouteTab data={data} />}
            honours={<HonoursTab data={data} />}
          />
        </Suspense>
      ) : (
        <RaceSections
          data={data}
          raceId={raceId}
          status={status}
          startlist={startlist}
          watchOn={sw.watchOn}
          veil={veil}
          identity={identidad}
          own={propio}
        />
      )}
    </section>
  )
}
