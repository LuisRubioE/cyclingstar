import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Fragment, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
} from '../api/race'
import { fetchCalendarStage } from '../api/results'
import { Flag } from '../components/Flag'
import { Jersey } from '../components/Jersey'
import { RiderName } from '../components/RiderName'
import { ShowAllButton, TOP_ROWS } from '../components/ShowAll'
import { StageStory } from '../components/StageStory'
import { type TabOption, TabPanel, Tabs, useTabParam } from '../components/Tabs'
import { TeamLink } from '../components/TeamLink'
import { formatLabel, raceClassLabel } from '../domain/labels'
import { RACE_TAB_LABEL, type RaceTabId, raceTabs } from '../domain/raceTabs'

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

/** Nombre legible del tipo de etapa (el dato del motor viene en español). */
const KIND_LABEL: Record<string, string> = {
  llana: 'Flat',
  media: 'Hilly',
  reina: 'Mountain',
  cri: 'Time trial',
  clasica: 'Classic',
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
function GcTable({ rows }: { rows: GcRow[] }) {
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
                <RiderName riderId={r.riderId} name={r.name} isBot={r.isBot} />
                {r.teamName && <span className="ml-2 text-xs text-slate-400">{r.teamName}</span>}
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
function PointsTable({ rows }: { rows: PointsEntry[] }) {
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
      <span className="font-medium text-slate-700">
        {oneDay ? stage.name : `Stage ${stage.index}`}
      </span>
      <span className="hidden text-xs text-slate-400 sm:inline">
        {KIND_LABEL[stage.kind] ?? stage.kind}
      </span>
      {stage.from && stage.to && (
        <span className="truncate text-slate-500">
          {stage.from === stage.to ? stage.from : `${stage.from} → ${stage.to}`}
        </span>
      )}
      {stage.timeTrial && <span className="text-xs text-violet-500">ITT</span>}
      <span className="ml-auto shrink-0 tabular-nums text-slate-400">{stage.km} km</span>
    </>
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
              {/* Altimetría real de autoría de la carrera (relieve + puertos). SVG del backend. */}
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
 */
function StagesTab({ data, raceId }: { data: RaceView; raceId: string }) {
  const winnerOf = new Map(data.stageWinners.map((w) => [w.stageDay, w]))
  return (
    <div className={card}>
      <h2 className={head}>Stages</h2>
      <ol className="space-y-1.5">
        {data.stages.map((stage) => {
          const winner = winnerOf.get(stage.index)
          return (
            <Fragment key={stage.index}>
              <li className="border-b border-slate-100 py-1.5 last:border-0">
                <div className="flex items-center gap-3 text-sm">
                  <StageLine stage={stage} oneDay={data.stages.length === 1} />
                </div>
                <div className="mt-0.5 flex items-center gap-2 pl-5 text-sm">
                  {winner ? (
                    <>
                      <Flag code={winner.country} size={14} />
                      <RiderName riderId={winner.riderId} name={winner.name} isBot={winner.isBot} />
                      {winner.teamName && (
                        <span className="hidden text-xs text-slate-400 sm:inline">
                          {winner.teamName}
                        </span>
                      )}
                      {/* Directo a la crónica, no a la etapa en su pestaña por defecto: un clic
                          menos en cada una de las 21 etapas de una gran vuelta. */}
                      <Link
                        to={`/world/races/${raceId}/stages/${stage.index}?tab=story`}
                        className="ml-auto shrink-0 text-xs font-medium text-brand-cyan hover:underline"
                      >
                        Read the story →
                      </Link>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">Not raced yet</span>
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

type ClassTabId = 'gc' | 'points' | 'kom'

const CLASS_TAB_IDS: readonly ClassTabId[] = ['gc', 'points', 'kom']
const CLASS_TABS: readonly TabOption<ClassTabId>[] = [
  { key: 'gc', label: 'General' },
  { key: 'points', label: 'Points' },
  { key: 'kom', label: 'Mountains' },
]
const CLASS_PANEL = 'race-classification'

/**
 * Pestaña `Classifications` (o `Result` en una carrera de un día): general, puntos y montaña como
 * sub-pestañas. En una carrera de un día la "general" ES el resultado de la llegada, así que se
 * rotula como tal; y si además no hay puntos ni montaña que enseñar, no se pinta ninguna tira de
 * sub-pestañas: sobra una pestaña única sobre una sola tabla.
 */
function ClassificationsTab({ data }: { data: RaceView }) {
  // Sub-pestaña en `?cls=`, validada contra las opciones: un enlace a una clasificación concreta
  // funciona, y hasta que el jugador toca una no se escribe nada en la URL.
  const [active, setActive] = useTabParam(CLASS_TAB_IDS, 'gc', 'cls')
  const oneDay = data.stages.length === 1
  const alone = oneDay && data.points.length === 0 && data.kom.length === 0
  const tabs = oneDay
    ? [{ key: 'gc' as const, label: 'Result' }, ...CLASS_TABS.slice(1)]
    : CLASS_TABS
  if (alone) {
    return (
      <div className={card}>
        <h2 className={head}>Result</h2>
        {data.gc.length > 0 ? (
          <GcTable rows={data.gc} />
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
            <GcTable rows={data.gc} />
          ) : (
            <p className="text-sm text-slate-400">No general classification yet.</p>
          ))}
        {active === 'points' &&
          (data.points.length > 0 ? (
            <PointsTable rows={data.points} />
          ) : (
            <p className="text-sm text-slate-400">No sprint points awarded yet.</p>
          ))}
        {active === 'kom' &&
          (data.kom.length > 0 ? (
            <PointsTable rows={data.kom} />
          ) : (
            <p className="text-sm text-slate-400">No mountain points awarded yet.</p>
          ))}
      </TabPanel>
    </div>
  )
}

/**
 * Pestaña `Story` de una carrera de UN DÍA: el journal de su única etapa, aquí mismo.
 *
 * Antes esto costaba tres clics —`Stages`, entrar en la lista de un solo elemento, y ya dentro
 * `Story`— para lo único que de verdad importa de una clásica. La crónica se pide solo cuando se
 * abre la pestaña, así que la ficha de carrera no carga nada de más.
 */
function OneDayStory({ raceId, onFullResult }: { raceId: string; onFullResult: () => void }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['stage-replay', raceId, 1],
    queryFn: () => fetchCalendarStage(raceId, 1),
  })
  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the story.</p>
  return <StageStory data={data} onFullResult={onFullResult} />
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

/**
 * La tira de pestañas y su panel. Vive en su propio componente porque el conjunto de pestañas
 * depende del estado de la carrera, y ese estado solo se conoce con los datos ya cargados: así el
 * `useTabParam` se monta cuando sus opciones son estables, sin hooks condicionados.
 */
function RaceSections({
  data,
  raceId,
  status,
  startlist,
}: {
  data: RaceView
  raceId: string
  status: RaceStatus
  startlist: RaceStartlist | undefined
}) {
  const tabIds = raceTabs(status, data.race.stageCount)
  // La pestaña por defecto la manda el estado (la primera del conjunto). `useTabParam` valida el
  // `?tab=` contra las opciones de ESTE estado y no escribe nada en la URL hasta que se toca una,
  // así que un enlace compartido abre donde toca y el resto se comporta como espera el jugador.
  const [active, setActive] = useTabParam(tabIds, tabIds[0] as RaceTabId)
  const options = tabIds.map((id) => ({ key: id, label: RACE_TAB_LABEL[id] }))
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
        {(active === 'classifications' || active === 'result') && (
          <ClassificationsTab data={data} />
        )}
        {active === 'story' && (
          <OneDayStory raceId={raceId} onFullResult={() => setActive('result')} />
        )}
        {active === 'stages' && <StagesTab data={data} raceId={raceId} />}
        {active === 'route' && <RouteTab data={data} />}
        {active === 'startlist' &&
          (startlist?.upcoming ? (
            <Startlist data={startlist} />
          ) : (
            <div className={card}>
              <h2 className={head}>Startlist</h2>
              {status === 'racing' ? (
                <p className="text-sm text-slate-500">
                  Entries are closed and the race is under way — everyone on the road is in the
                  general classification.
                </p>
              ) : (
                <p className="text-sm text-slate-500">
                  The startlist is published about two weeks before the start, when teams name their
                  squads.
                </p>
              )}
            </div>
          ))}
        {active === 'honours' && <HonoursTab data={data} />}
      </TabPanel>
    </>
  )
}

export function Race() {
  const { raceId = '' } = useParams()
  const queryClient = useQueryClient()
  const { data, isPending, isError } = useQuery({
    queryKey: ['race', raceId],
    queryFn: () => fetchRace(raceId),
  })
  // Lista provisional de inscritos (solo devuelve algo si la carrera está próxima y no se ha corrido).
  const { data: startlist } = useQuery({
    queryKey: ['race', raceId, 'startlist'],
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

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the race.</p>

  const status = data.status
  const winner = data.gc.find((r) => !r.dnf) ?? data.gc[0]
  const untilStart = daysUntilStart(data)
  const stageCount = data.race.stageCount
  const startDay = data.race.startDay
  // Duración real de la carrera: sus etapas más los días de descanso intercalados.
  const endDay = raceEndDay(data)
  const badge = STATUS_BADGE[status]
  // En una carrera de un día la carrera Y la etapa son la misma cosa: los datos de la etapa (los
  // kilómetros y el tipo de recorrido) son los de la carrera, y su sitio es esta cabecera.
  const single = stageCount === 1 ? data.stages[0] : undefined

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
          {single ? ` · ${single.km} km · ${KIND_LABEL[single.kind] ?? single.kind}` : ''}
          {single?.timeTrial ? ' · ITT' : ''}
          {endDay > startDay ? ` · GD ${startDay}–${endDay}` : ` · GD ${startDay}`}
        </p>
        {status === 'finished' && winner && (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-400">Winner</span>
            <Flag code={winner.country} size={16} />
            <span className="font-semibold text-slate-800">
              <RiderName riderId={winner.riderId} name={winner.name} isBot={winner.isBot} />
            </span>
            {winner.teamName && <span className="text-xs text-slate-400">{winner.teamName}</span>}
          </p>
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
        {myPref && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
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
            {myPref.callup === 'selected' && (
              <span className="text-xs font-medium text-emerald-600">You're in the squad</span>
            )}
            {myPref.callup === 'not-selected' && (
              <span className="text-xs text-slate-400">Not selected this time</span>
            )}
          </div>
        )}
      </div>

      <RaceSections data={data} raceId={raceId} status={status} startlist={startlist} />
    </section>
  )
}
