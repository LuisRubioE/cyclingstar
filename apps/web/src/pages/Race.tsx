import type { HorizonSummary, RaceLeaders, RaceRouteSource, RouteSource } from '@cyclingstar/shared'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Fragment, Suspense, lazy, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import type { RaceClass, RaceFormat } from '../api/calendar'
import { fetchRacePrefs, setRacePref } from '../api/objectives'
import {
  type GcRow,
  type PointsEntry,
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
import { Flag } from '../components/Flag'
import { Jersey, RiderJersey } from '../components/Jersey'
import { RiderName } from '../components/RiderName'
import { ShowAllButton, TOP_ROWS } from '../components/ShowAll'
import { DiagnosticStrip } from '../components/StageGate'
import { StageRoute } from '../components/StageRoute'
import { TeamClassNote, TeamClassTable } from '../components/TeamClassTable'
import { type TabOption, TabPanel, Tabs, useTabParam } from '../components/Tabs'
import { TeamLink } from '../components/TeamLink'
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

function fmtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function relTime(seconds: number, leader: number, isLeader: boolean): string {
  return isLeader ? fmtTime(seconds) : `+${fmtTime(seconds - leader)}`
}

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
const head = 'mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400'

const KIND_DOT: Record<string, string> = {
  llana: 'bg-emerald-400',
  media: 'bg-amber-400',
  reina: 'bg-rose-500',
  cri: 'bg-violet-400',
  clasica: 'bg-orange-500',
}

/**
 * El color de la marca de origen (docs/generador.md §11.4): verde solo lo real, ámbar lo que tiene
 * ciudades y distancia reales con el relieve generado, y gris lo inventado.
 */
const SOURCE_BADGE: Record<RouteSource | RaceRouteSource, string> = {
  real: 'bg-emerald-50 text-emerald-700',
  edicion: 'bg-amber-50 text-amber-700',
  mixto: 'bg-amber-50 text-amber-700',
  generado: 'bg-slate-100 text-slate-600',
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
    <div className={card}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {frozen ? 'Startlist' : 'Provisional startlist'}
        </h2>
        {data.daysUntil != null && (
          <span className="text-xs text-slate-400">
            starts in {data.daysUntil} {data.daysUntil === 1 ? 'day' : 'days'}
          </span>
        )}
      </div>
      {data.teams.length === 0 && data.freeAgents.length === 0 ? (
        <p className="text-sm text-slate-400">No entries yet.</p>
      ) : (
        <div className="space-y-3">
          {byDivision.map((g) => (
            <div key={g.div}>
              <h3 className="text-xs font-semibold text-slate-500">
                {DIVISION_LABEL[g.div] ?? g.div}{' '}
                <span className="font-normal text-slate-400">({g.teams.length})</span>
              </h3>
              {frozen ? (
                // Escuadra congelada: cada equipo con sus corredores reales.
                <div className="mt-1 space-y-2">
                  {g.teams.map((t) => (
                    <div key={t.id}>
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <Jersey seed={t.jerseySeed} size={18} />
                        {t.country && <Flag code={t.country} size={14} />}
                        <TeamLink teamId={t.id} name={t.name} className="text-slate-700" />
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 pl-1">
                        {t.riders.map((r) => (
                          <span key={r.id} className="flex items-center gap-1 text-sm">
                            {r.bib != null && (
                              <span className="tabular-nums text-xs text-slate-400">{r.bib}</span>
                            )}
                            <Flag code={r.country} size={12} />
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
                    <span key={t.id} className="flex items-center gap-1.5 text-sm">
                      <Jersey seed={t.jerseySeed} size={16} />
                      {t.country && <Flag code={t.country} size={14} />}
                      <TeamLink teamId={t.id} name={t.name} className="text-slate-700" />
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {data.freeAgents.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500">
                Free agents{frozen ? '' : ' signed up'}{' '}
                <span className="font-normal text-slate-400">({data.freeAgents.length})</span>
              </h3>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {data.freeAgents.map((r) => (
                  <span key={r.id} className="flex items-center gap-1.5 text-sm">
                    <Flag code={r.country} size={14} />
                    <RiderName riderId={r.id} name={r.name} isBot={r.isBot} />
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-slate-400">
        {frozen
          ? 'Entries closed — these are the confirmed squads for the race.'
          : 'Provisional — each team names its squad of riders when entries close, about two weeks out.'}
      </p>
    </div>
  )
}

/** General de la carrera: top 20 y "Show all" (nunca 176 filas de golpe, nunca truncada sin salida). */
function GcTable({ rows, leaders }: { rows: GcRow[]; leaders: RaceLeaders | undefined }) {
  const [showAll, setShowAll] = useState(false)
  const leader = rows[0]?.tiempoTotalS ?? 0
  const visible = showAll ? rows : rows.slice(0, TOP_ROWS)
  return (
    <>
      <table className="w-full text-sm">
        <caption className="sr-only">
          General classification: position, country, rider, team and time
        </caption>
        <tbody>
          {visible.map((r, i) => (
            <tr
              key={r.riderId}
              className={`border-b border-slate-100 last:border-0${r.dnf ? ' text-slate-300' : ''}`}
            >
              <td className="w-7 py-1 text-slate-400 tabular-nums">{r.dnf ? '' : i + 1}</td>
              <td className="w-6 py-1">
                <Flag code={r.country} size={16} />
              </td>
              <td className={`py-1 ${r.dnf ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                <RiderJersey leaders={leaders} riderId={r.riderId} />
                <RiderName riderId={r.riderId} name={r.name} isBot={r.isBot} />
                <span className="ml-2 text-xs text-slate-400">{raceTeamLabel(r.teamName)}</span>
              </td>
              <td className="py-1 text-right tabular-nums text-slate-500">
                {r.dnf ? (
                  <span className="text-amber-500">DNF</span>
                ) : (
                  relTime(r.tiempoTotalS, leader, i === 0)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ShowAllButton total={rows.length} expanded={showAll} onToggle={() => setShowAll(!showAll)} />
    </>
  )
}

/** Clasificación por puntos (montaña o metas volantes), con la misma regla de top 20 + "Show all". */
function PointsTable({ rows, leaders }: { rows: PointsEntry[]; leaders: RaceLeaders | undefined }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? rows : rows.slice(0, TOP_ROWS)
  return (
    <>
      <table className="w-full text-sm">
        <caption className="sr-only">Classification: position, country, rider and points</caption>
        <tbody>
          {visible.map((r, i) => (
            <tr key={r.riderId} className="border-b border-slate-100 last:border-0">
              <td className="w-7 py-1 tabular-nums text-slate-400">{i + 1}</td>
              <td className="w-6 py-1">
                <Flag code={r.country} size={16} />
              </td>
              <td className="py-1 text-slate-700">
                <RiderJersey leaders={leaders} riderId={r.riderId} />
                <RiderName riderId={r.riderId} name={r.name} isBot={r.isBot} />
              </td>
              <td className="py-1 text-right font-medium tabular-nums text-slate-600">
                {r.puntos} pts
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ShowAllButton total={rows.length} expanded={showAll} onToggle={() => setShowAll(!showAll)} />
    </>
  )
}

/** Recorrido de una etapa en una línea: tipo, salida → meta y kilómetros. */
function StageLine({ stage, oneDay }: { stage: RaceStagePlan; oneDay: boolean }) {
  return (
    <>
      <span
        className={`inline-block h-2 w-2 shrink-0 rounded-full ${KIND_DOT[stage.kind] ?? 'bg-slate-300'}`}
        aria-hidden
      />
      {/*
        En una carrera de un día no hay «Stage 1» que numerar: la etapa ES la carrera, y su nombre
        del calendario («Stage 1 · Classic») no dice nada que no diga ya la ficha de arriba. Se deja
        solo la etiqueta.
      */}
      <span className="font-medium text-slate-700">
        {oneDay ? stage.label : `Stage ${stage.index}`}
      </span>
      {/*
        La ETIQUETA del calendario, no el tipo. Son dos vocabularios para lo mismo —«Summit finish»
        contra «Mountain», «Uphill finish» contra «Hilly»— y el del calendario es el preciso: sabe
        distinguir la reina que muere arriba de la que baja a meta. El tipo sigue mandando en el
        color del punto, que es para lo que sirve.
      */}
      {!oneDay && <span className="hidden text-xs text-slate-400 sm:inline">{stage.label}</span>}
      <StageRoute from={stage.from} to={stage.to} className="truncate text-slate-500" />
      {stage.timeTrial && <span className="text-xs text-violet-500">ITT</span>}
      <span className="ml-auto shrink-0 tabular-nums text-slate-400">{stage.km} km</span>
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
    <div className="mb-1.5 space-y-1 pl-5 text-xs">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className={`rounded-full px-2 py-0.5 font-medium ${SOURCE_BADGE[stage.routeSource]}`}>
          {ROUTE_SOURCE_LABEL[stage.routeSource]}
        </span>
        {!real && <span className="text-slate-400">{editionLabel(stage.edicion)}</span>}
      </p>
      {!real && stage.arch && <p className="text-slate-600">{stage.arch.frase}</p>}
      {!real && stage.cambiosRespectoAnterior.length > 0 && (
        <div>
          <p className="text-slate-400">Changes from the last edition</p>
          <ul className="list-disc pl-4 text-slate-500">
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
    <div className={card}>
      <h2 className={head}>{oneDay ? 'Route' : 'Stage profiles'}</h2>
      <ol className="space-y-4">
        {data.stages.map((stage) => (
          <Fragment key={stage.index}>
            <li>
              <div className="mb-1 flex items-center gap-3 text-sm">
                <StageLine stage={stage} oneDay={oneDay} />
              </div>
              <StageRouteNote stage={stage} />
              {/* Altimetría del recorrido que el mundo corre (relieve + puertos). SVG del backend. */}
              <div
                className="w-full overflow-x-auto rounded-lg bg-slate-50 p-1"
                role="img"
                aria-label={`Elevation profile of ${stage.name}, ${stage.km} km`}
                dangerouslySetInnerHTML={{ __html: stage.altimetry }}
              />
            </li>
            {/* Día de descanso tras esta etapa (grandes vueltas y alguna vuelta por etapas). */}
            {data.restAfter.includes(stage.index) && (
              <li className="flex items-center gap-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                Rest day
                <span className="h-px flex-1 bg-slate-200" />
              </li>
            )}
          </Fragment>
        ))}
      </ol>
    </div>
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
    <div className={card}>
      <h2 className={head}>Stages</h2>
      <ol className="space-y-1.5">
        {data.stages.map((stage) => {
          const winner = winnerOf.get(stage.index)
          const state = stageRowState(stage, winnerOf, data.runDays)
          const link = stageRowLink(raceId, stage.index, state, watchOn)
          return (
            <Fragment key={stage.index}>
              <li className="border-b border-slate-100 py-1.5 last:border-0">
                <div className="flex items-center gap-3 text-sm">
                  <StageLine stage={stage} oneDay={data.stages.length === 1} />
                </div>
                <div className="mt-0.5 flex items-center gap-2 pl-5 text-sm">
                  {state === 'report' && winner ? (
                    <>
                      <Flag code={winner.country} size={14} />
                      <RiderName riderId={winner.riderId} name={winner.name} isBot={winner.isBot} />
                      <span className="hidden text-xs text-slate-400 sm:inline">
                        {raceTeamLabel(winner.teamName)}
                      </span>
                    </>
                  ) : state === 'watch' ? (
                    <span className="text-xs font-medium text-emerald-700">Ready to watch</span>
                  ) : (
                    <span className="text-xs text-slate-400">Not raced yet</span>
                  )}
                  {/* Directo al acta (o a la etapa, si está por ver), no a la etapa en su pestaña por
                      defecto: un clic menos en cada una de las 21 etapas de una gran vuelta. */}
                  {link !== null && (
                    <Link
                      to={link.to}
                      className="ml-auto shrink-0 text-xs font-medium text-brand-cyan hover:underline"
                    >
                      {link.label}
                    </Link>
                  )}
                </div>
              </li>
              {data.restAfter.includes(stage.index) && (
                <li className="flex items-center gap-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" />
                  Rest day
                  <span className="h-px flex-1 bg-slate-200" />
                </li>
              )}
            </Fragment>
          )
        })}
      </ol>
    </div>
  )
}

type ClassTabId = 'gc' | 'points' | 'kom' | 'teams'

const CLASS_TAB_IDS: readonly ClassTabId[] = ['gc', 'points', 'kom', 'teams']
const CLASS_TABS: readonly TabOption<ClassTabId>[] = [
  { key: 'gc', label: 'General' },
  { key: 'points', label: 'Points' },
  { key: 'kom', label: 'Mountains' },
  { key: 'teams', label: 'Teams' },
]
const CLASS_PANEL = 'race-classification'

/**
 * Pestaña `Classifications` (o `Result` en una carrera de un día): general, puntos, montaña y
 * equipos como sub-pestañas.
 *
 * Los maillots que se marcan son los de AHORA (`data.leaders`): la ficha de carrera enseña el
 * estado actual de la carrera, no el de un día concreto, así que aquí solo hay un juego. Y en una
 * carrera de un día no hay ninguno —no hay clasificación que arrastrar de una jornada a otra—, así
 * que la API los manda todos a null y no se pinta nada.
 * En una carrera de un día la "general" ES el resultado de la llegada,
 * así que se rotula como tal; y si además no hay nada más que enseñar, no se pinta ninguna tira de
 * sub-pestañas: sobra una pestaña única sobre una sola tabla.
 */
function ClassificationsTab({ data }: { data: RaceView }) {
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
  if (alone) {
    return (
      <div className={card}>
        <h2 className={head}>Result</h2>
        {data.gc.length > 0 ? (
          <GcTable rows={data.gc} leaders={data.leaders} />
        ) : (
          <p className="text-sm text-slate-400">No result yet.</p>
        )}
      </div>
    )
  }
  return (
    <div className={card}>
      <Tabs
        options={tabs}
        value={active}
        onChange={setActive}
        label="Classification"
        variant="pill"
        panelId={CLASS_PANEL}
      />
      <TabPanel panelId={CLASS_PANEL} active={active} className="mt-4">
        {active === 'gc' &&
          (data.gc.length > 0 ? (
            <GcTable rows={data.gc} leaders={data.leaders} />
          ) : (
            <p className="text-sm text-slate-400">No general classification yet.</p>
          ))}
        {active === 'points' &&
          (data.points.length > 0 ? (
            <PointsTable rows={data.points} leaders={data.leaders} />
          ) : (
            <p className="text-sm text-slate-400">No sprint points awarded yet.</p>
          ))}
        {active === 'kom' &&
          (data.kom.length > 0 ? (
            <PointsTable rows={data.kom} leaders={data.leaders} />
          ) : (
            <p className="text-sm text-slate-400">No mountain points awarded yet.</p>
          ))}
        {active === 'teams' &&
          (data.teamGc.length > 0 ? (
            <>
              <TeamClassTable rows={data.teamGc} />
              <TeamClassNote />
            </>
          ) : (
            <p className="text-sm text-slate-400">No team classification yet.</p>
          ))}
      </TabPanel>
    </div>
  )
}

/** Pestaña `Roll of honour`: quién ganó la carrera en temporadas anteriores. */
function HonoursTab({ data }: { data: RaceView }) {
  return (
    <div className={card}>
      <h2 className={head}>Roll of honour</h2>
      {data.history.length === 0 ? (
        <p className="text-sm text-slate-400">Nobody has won this race yet — it is a new one.</p>
      ) : (
        <ol className="space-y-1.5">
          {data.history.map((h) => (
            <li key={h.season} className="flex items-center gap-3 text-sm">
              <span className="w-20 shrink-0 text-slate-400">Season {h.season + 1}</span>
              <Flag code={h.winnerCountry} size={16} />
              <span className="font-medium text-slate-700">{h.winnerName}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

const STATUS_BADGE: Record<RaceStatus, { label: string; className: string }> = {
  upcoming: { label: 'Upcoming', className: 'bg-slate-100 text-slate-600' },
  racing: { label: 'Racing now', className: 'bg-emerald-100 text-emerald-700' },
  finished: { label: 'Finished', className: 'bg-indigo-100 text-indigo-700' },
}

const RACE_PANEL = 'race-section'

/** La pestaña `Startlist`: la lista provisional, o por qué no la hay. */
function StartlistTab({
  status,
  startlist,
}: {
  status: RaceStatus
  startlist: RaceStartlist | undefined
}) {
  if (startlist?.upcoming) return <Startlist data={startlist} />
  return (
    <div className={card}>
      <h2 className={head}>Startlist</h2>
      {status === 'racing' ? (
        <p className="text-sm text-slate-500">
          Entries are closed and the race is under way — everyone on the road is in the general
          classification.
        </p>
      ) : (
        <p className="text-sm text-slate-500">
          The startlist is published about two weeks before the start, when teams name their squads.
        </p>
      )}
    </div>
  )
}

/** El contador de una pestaña (`Tabs.tsx`, `badge`; sup. T4): cuenta etapas por ver, nunca resultados. */
function StagesBadge({ n }: { n: number }) {
  return (
    <span
      className="rounded-full bg-brand-cyan px-1.5 py-0.5 text-[10px] font-semibold text-white"
      aria-label={`${n} ${n === 1 ? 'stage' : 'stages'} ready to watch`}
    >
      {n}
    </span>
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
}: {
  data: RaceView
  raceId: string
  status: RaceStatus
  startlist: RaceStartlist | undefined
  watchOn: boolean
  veil: ReadyRace | null
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
        variant="underline"
        panelId={RACE_PANEL}
      />
      <TabPanel panelId={RACE_PANEL} active={active}>
        {active === 'classifications' && <ClassificationsTab data={data} />}
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
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => follow.mutate()}
        disabled={follow.isPending}
        className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200 disabled:opacity-60"
      >
        {protecting ? 'Stop protecting this race' : 'Follow without spoilers'}
      </button>
      {follow.isError && <span className="text-xs text-red-600">Could not change this race.</span>}
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
  const { data, isPending, isError } = useQuery({
    queryKey: raceViewKey(raceId, diag, rev),
    queryFn: () => fetchRace(raceId, { diag }),
    enabled: rev !== undefined,
    placeholderData: keepPreviousData,
  })
  // Lista provisional de inscritos (solo devuelve algo si la carrera está próxima y no se ha corrido). Es
  // L (se congela antes de la salida): no depende de lo visto y no espera al horizonte.
  const { data: startlist } = useQuery({
    queryKey: ['race-startlist', raceId],
    queryFn: () => fetchStartlist(raceId),
  })
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

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the race.</p>

  const status = data.status
  const untilStart = daysUntilStart(data)
  const stageCount = data.race.stageCount
  const startDay = data.race.startDay
  // Duración real de la carrera: sus etapas más los días de descanso intercalados.
  const endDay = raceEndDay(data)
  const badge = STATUS_BADGE[status]
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
    <section className="space-y-5">
      {/* Cabecera persistente: no cambia al cambiar de pestaña. */}
      <div>
        <Link to="/world/races" className="text-xs text-slate-400 hover:text-slate-600">
          ← Races
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            {data.race.country && <Flag code={data.race.country} size={22} />}
            {data.race.name}
          </h1>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
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
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${SOURCE_BADGE[data.race.routeSource]}`}
          >
            {raceRouteSourceLabel(data.race.routeSource, data.stages)}
          </span>
          {data.race.routeSource !== 'real' && data.stages[0] && (
            <span className="text-slate-400">{editionLabel(data.stages[0].edicion)}</span>
          )}
        </p>
        {status === 'finished' && winner && (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-400">Winner</span>
            <Flag code={winner.country} size={16} />
            <span className="font-semibold text-slate-800">
              <RiderName riderId={winner.riderId} name={winner.name} isBot={winner.isBot} />
            </span>
            <span className="text-xs text-slate-400">{raceTeamLabel(winner.teamName)}</span>
          </p>
        )}
        {finalHidden && (
          <p className="mt-2 text-sm font-medium text-emerald-700">Finished · ready to watch</p>
        )}
        {status === 'upcoming' && (
          <p className="mt-2 text-sm text-slate-500">
            {untilStart != null && untilStart > 0
              ? `Not raced this season yet — it starts in ${untilStart} ${untilStart === 1 ? 'day' : 'days'}.`
              : 'Not raced this season yet. It runs on its start GD.'}
          </p>
        )}
        {status === 'racing' && (
          <p className="mt-2 text-sm text-emerald-700">
            Under way — {data.runDays.length} of {stageCount} stages raced.
          </p>
        )}
        {/* LO QUE ESCONDE (§11.5, sup. C2): las tablas son las de tras la última etapa conocida, y lo
            dice con un texto que solo depende del horizonte, con la primera por ver a un toque. */}
        {veil !== null && stageCount > 1 && firstToWatch !== null && (
          <p
            role="note"
            className="mt-2 flex flex-wrap items-center gap-x-1.5 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200"
          >
            <span>{raceVeilNotice(veil.stages, stageCount)}</span>
            <span aria-hidden>·</span>
            <Link to={`${pagePath}/stages/${firstToWatch}`} className="font-medium underline">
              {sw.watchOn ? `Watch stage ${firstToWatch}` : `Stage ${firstToWatch} →`}
            </Link>
          </p>
        )}
        {(myPref || canFollow) && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {myPref && (
              <button
                type="button"
                onClick={() => targetMutation.mutate(!myPref.wanted)}
                disabled={targetMutation.isPending}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
                  myPref.wanted
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title="Your team weighs your targeted races when picking squads (and missing one you targeted stings your morale)."
              >
                {myPref.wanted ? '★ Targeted' : '☆ Target this race'}
              </button>
            )}
            {myPref?.callup === 'selected' && (
              <span className="text-xs font-medium text-emerald-600">You're in the squad</span>
            )}
            {myPref?.callup === 'not-selected' && (
              <span className="text-xs text-slate-400">Not selected this time</span>
            )}
            {canFollow && raceKey !== null && (
              <FollowRace raceKey={raceKey} protecting={veil !== null} />
            )}
          </div>
        )}
        {/* El modo diagnóstico del dueño (§11.15, 11-h): solo a un administrador con algo velado. */}
        {!diag && sw.isAdmin && veilRaw !== null && (
          <p className="mt-2 text-right">
            <Link
              to={hrefWith(pagePath, params, { diag: '1' })}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Diagnostic view
            </Link>
          </p>
        )}
      </div>

      {diagOn && <DiagnosticStrip exitHref={hrefWith(pagePath, params, { diag: null })} />}

      {stageCount === 1 && status === 'finished' ? (
        <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
          <OneDaySections
            raceId={raceId}
            watchOn={sw.watchOn}
            watchSettled={sw.settled}
            veil={veil}
            classifications={<ClassificationsTab data={data} />}
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
        />
      )}
    </section>
  )
}
