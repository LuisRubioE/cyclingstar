import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import {
  type StageClassEntry,
  type StageGcEntry,
  type StageResultEntry,
  type TeamClassEntry,
  fetchCalendarStage,
} from '../api/results'
import { Flag } from '../components/Flag'
import { RiderName } from '../components/RiderName'
import { ShowAllButton, TOP_ROWS } from '../components/ShowAll'
import { StageStory } from '../components/StageStory'
import { type TabOption, TabPanel, Tabs, useTabParam } from '../components/Tabs'
import { TeamClassNote, TeamClassTable } from '../components/TeamClassTable'
import { formatTime } from '../domain/format'
import { oneDayStageTarget } from '../domain/raceTabs'

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
const head = 'text-xs font-semibold uppercase tracking-wide text-slate-400'

/** Nombre legible del tipo de etapa (el dato del motor viene en español). */
const KIND_LABEL: Record<string, string> = {
  llana: 'Flat',
  media: 'Hilly',
  reina: 'Mountain',
  cri: 'Time trial',
  clasica: 'Classic',
}

type StageTabId = 'story' | 'result' | 'classifications' | 'profile'

/** Orden de las pestañas: `Story` primero, que es la carga emocional de la etapa (§7.2). */
const STAGE_TAB_IDS: readonly StageTabId[] = ['story', 'result', 'classifications', 'profile']
const STAGE_TAB_LABEL: Record<StageTabId, string> = {
  story: 'Story',
  result: 'Result',
  classifications: 'Classifications',
  profile: 'Profile',
}
const STAGE_PANEL = 'stage-section'

type StageClassTabId = 'gc' | 'points' | 'kom' | 'teams'

const STAGE_CLASS_TAB_IDS: readonly StageClassTabId[] = ['gc', 'points', 'kom', 'teams']
const STAGE_CLASS_TABS: readonly TabOption<StageClassTabId>[] = [
  { key: 'gc', label: 'General' },
  { key: 'points', label: 'Points' },
  { key: 'kom', label: 'Mountains' },
  { key: 'teams', label: 'Teams' },
]
const STAGE_CLASS_PANEL = 'stage-classification'

/** Resultado de la etapa: top 20 y "Show all" (antes se truncaba a 15 sin forma de ver el resto). */
function ResultTable({ rows }: { rows: StageResultEntry[] }) {
  const [showAll, setShowAll] = useState(false)
  const winnerTime = rows[0]?.tiempoS ?? 0
  const visible = showAll ? rows : rows.slice(0, TOP_ROWS)
  return (
    <>
      <table className="mt-2 w-full text-sm">
        <caption className="sr-only">Stage result: position, country, rider and time</caption>
        <tbody>
          {visible.map((r) => (
            <tr key={r.riderId} className="border-b border-slate-100 last:border-0">
              <td className="w-7 py-1 text-slate-400 tabular-nums">{r.puesto}</td>
              <td className="w-6 py-1">
                <Flag code={r.country} size={16} />
              </td>
              <td className="py-1 text-slate-700">
                <RiderName riderId={r.riderId} name={r.name} isBot={r.isBot} />
                {r.teamName && <span className="ml-2 text-xs text-slate-400">{r.teamName}</span>}
              </td>
              <td className="py-1 text-right tabular-nums text-slate-500">
                {r.puesto === 1 ? formatTime(r.tiempoS) : `+${formatTime(r.tiempoS - winnerTime)}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ShowAllButton total={rows.length} expanded={showAll} onToggle={() => setShowAll(!showAll)} />
    </>
  )
}

/** General tal como quedó tras esta etapa, con la misma regla de top 20 + "Show all". */
function GcTable({ rows }: { rows: StageGcEntry[] }) {
  const [showAll, setShowAll] = useState(false)
  // El líder es el primer CLASIFICADO, no la primera fila: los no clasificados van al final, pero si
  // la general entera fuera de abandonos el `?? 0` de antes daba diferencias contra cero.
  const leader = (rows.find((r) => !r.dnf) ?? rows[0])?.tiempoTotalS ?? 0
  const visible = showAll ? rows : rows.slice(0, TOP_ROWS)
  return (
    <>
      <table className="mt-2 w-full text-sm">
        <caption className="sr-only">
          General classification: position, country, rider, team and time
        </caption>
        <tbody>
          {visible.map((r, i) => (
            // Quien no está clasificado —abandonó, o le falta una etapa— sale como DNF y sin
            // puesto. Su tiempo acumulado no significa nada: enseñarlo fue lo que puso a un
            // corredor líder por 4h36 por no haber corrido la etapa 8 (ver `getGcThroughStage`).
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
                ) : i === 0 ? (
                  formatTime(r.tiempoTotalS)
                ) : (
                  `+${formatTime(r.tiempoTotalS - leader)}`
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

/** Clasificación por puntos (montaña o metas volantes): puesto, bandera, nombre, puntos. */
function PointsTable({ rows, unit }: { rows: StageClassEntry[]; unit: string }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? rows : rows.slice(0, TOP_ROWS)
  return (
    <>
      <table className="mt-2 w-full text-sm">
        <caption className="sr-only">Classification: position, country, rider and {unit}</caption>
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
                {r.puntos} {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ShowAllButton total={rows.length} expanded={showAll} onToggle={() => setShowAll(!showAll)} />
    </>
  )
}

/**
 * Sub-pestañas de clasificación de la etapa: general, puntos y montaña tras correrla.
 *
 * Solo aparece en carreras POR ETAPAS: en una de un día la etapa ES la carrera y su ficha ya enseña
 * el resultado (esta página redirige allí), así que aquí no hay caso especial que atender.
 */
function StageClassifications({
  gc,
  points,
  kom,
  teamStage,
  teamGc,
}: {
  gc: StageGcEntry[]
  points: StageClassEntry[]
  kom: StageClassEntry[]
  teamStage: TeamClassEntry[]
  teamGc: TeamClassEntry[]
}) {
  const [active, setActive] = useTabParam(STAGE_CLASS_TAB_IDS, 'gc', 'cls')
  return (
    <div className={card}>
      <p className="mb-3 text-xs text-slate-400">Standings after this stage.</p>
      <Tabs
        options={STAGE_CLASS_TABS}
        value={active}
        onChange={setActive}
        label="Stage classification"
        variant="pill"
        panelId={STAGE_CLASS_PANEL}
      />
      <TabPanel panelId={STAGE_CLASS_PANEL} active={active} className="mt-3">
        {active === 'gc' &&
          (gc.length > 0 ? (
            <GcTable rows={gc} />
          ) : (
            <p className="text-sm text-slate-400">No general classification yet.</p>
          ))}
        {active === 'points' &&
          (points.length > 0 ? (
            <PointsTable rows={points} unit="pts" />
          ) : (
            <p className="text-sm text-slate-400">No sprint points awarded yet.</p>
          ))}
        {active === 'kom' &&
          (kom.length > 0 ? (
            <PointsTable rows={kom} unit="pts" />
          ) : (
            <p className="text-sm text-slate-400">No mountain points awarded yet.</p>
          ))}
        {/* Equipos: la clasificación de ESTA etapa y la acumulada tras ella, una debajo de otra
            —son dos preguntas distintas ("¿quién ganó hoy?" y "¿quién va ganando?") y las dos se
            responden aquí, sin obligar a saltar entre páginas—. */}
        {active === 'teams' &&
          (teamStage.length > 0 || teamGc.length > 0 ? (
            <div className="space-y-5">
              {teamStage.length > 0 && (
                <div>
                  <h3 className={head}>Stage</h3>
                  <TeamClassTable rows={teamStage} />
                </div>
              )}
              {teamGc.length > 0 && (
                <div>
                  <h3 className={head}>Overall after this stage</h3>
                  <TeamClassTable rows={teamGc} />
                </div>
              )}
              <TeamClassNote />
            </div>
          ) : (
            <p className="text-sm text-slate-400">No team classification for this stage.</p>
          ))}
      </TabPanel>
    </div>
  )
}

/**
 * Página de una etapa de una carrera POR ETAPAS. Ya no es un callejón sin salida: la cabecera dice a
 * qué carrera pertenece y qué etapa es de cuántas, hay anterior/siguiente para leer las 21 crónicas
 * seguidas, y el contenido va en pestañas con `Story` por delante.
 *
 * En una carrera de UN DÍA esta página ya no existe: la carrera y la etapa son la misma cosa y su
 * contenido vive en la ficha de carrera. La URL sigue funcionando —hay enlaces compartidos y en las
 * noticias—, pero redirige allí, a la pestaña equivalente.
 */
export function StageReplay() {
  const { raceId = '', day = '' } = useParams()
  const dayNum = Number(day)
  const [params] = useSearchParams()
  const { data, isPending, isError } = useQuery({
    queryKey: ['stage-replay', raceId, dayNum],
    queryFn: () => fetchCalendarStage(raceId, dayNum),
  })
  // Una etapa sin correr solo tiene recorrido que enseñar: no hay historia, resultado ni general.
  // El conjunto de pestañas depende de eso, así que las opciones se calculan aquí (con `data` aún
  // posiblemente ausente) para que el hook se llame siempre y en el mismo orden.
  const isOneDay = (data?.race?.stageCount ?? 0) === 1
  const tabIds: readonly StageTabId[] = data?.run ? STAGE_TAB_IDS : ['profile']
  const [active, setActive] = useTabParam(tabIds, tabIds[0] as StageTabId)

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the stage.</p>

  // Carrera de un día: la ficha de carrera ya contiene todo esto. Se redirige sin dejar rastro en el
  // historial, así que el botón "atrás" no rebota entre las dos páginas.
  if (isOneDay) return <Navigate to={oneDayStageTarget(raceId, params)} replace />

  const race = data.race
  const stageCount = race?.stageCount ?? 0
  const prevDay = data.day > 1 ? data.day - 1 : null
  const nextDay = stageCount > 0 && data.day < stageCount ? data.day + 1 : null
  const options = tabIds.map((id) => ({ key: id, label: STAGE_TAB_LABEL[id] }))

  // La pestaña viaja en la URL (enlace compartido) y se conserva al saltar de etapa: quien está
  // leyendo crónicas sigue leyendo crónicas.
  function stageHref(target: number): string {
    const suffix = params.toString()
    return `/world/races/${raceId}/stages/${target}${suffix ? `?${suffix}` : ''}`
  }

  const navButton =
    'rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200'
  const kom = data.kom ?? []
  const points = data.points ?? []

  return (
    <section className="space-y-4">
      {/* Cabecera con contexto: de qué carrera es la etapa, y anterior/siguiente para no volver atrás. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to={`/world/races/${raceId}`}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
        >
          <span aria-hidden>←</span>
          {race?.country && <Flag code={race.country} size={14} />}
          <span className="font-medium">{race?.name ?? 'Back to the race'}</span>
          {race && stageCount > 0 && (
            <span className="text-slate-400">
              · Stage {data.day} of {stageCount}
            </span>
          )}
        </Link>
        {stageCount > 0 && (
          <nav aria-label="Stages" className="flex items-center gap-2">
            {prevDay != null ? (
              <Link to={stageHref(prevDay)} className={navButton}>
                ‹ Stage {prevDay}
              </Link>
            ) : (
              <span className={`${navButton} pointer-events-none opacity-40`} aria-hidden>
                ‹ Prev
              </span>
            )}
            {nextDay != null ? (
              <Link to={stageHref(nextDay)} className={navButton}>
                Stage {nextDay} ›
              </Link>
            ) : (
              <span className={`${navButton} pointer-events-none opacity-40`} aria-hidden>
                Next ›
              </span>
            )}
          </nav>
        )}
      </div>

      <header>
        <h1 className="text-xl font-bold tracking-tight text-slate-800">
          {`Stage ${data.day}`}
          {data.name ? ` · ${data.name}` : ''}
        </h1>
        <p className="text-sm text-slate-500">
          {data.km} km
          {data.kind ? ` · ${KIND_LABEL[data.kind] ?? data.kind}` : ''}
          {data.timeTrial ? ' · ITT' : ''}
          {!data.run ? ' · not raced yet' : ''}
        </p>
      </header>

      <Tabs
        options={options}
        value={active}
        onChange={setActive}
        label="Stage"
        variant="underline"
        panelId={STAGE_PANEL}
      />

      <TabPanel panelId={STAGE_PANEL} active={active}>
        {active === 'story' && <StageStory data={data} onFullResult={() => setActive('result')} />}

        {active === 'result' &&
          (data.results && data.results.length > 0 ? (
            <div className={card}>
              <h2 className={head}>Stage result</h2>
              <ResultTable rows={data.results} />
            </div>
          ) : (
            <div className={card}>
              <p className="text-sm text-slate-400">No result for this stage.</p>
            </div>
          ))}

        {active === 'classifications' && (
          <StageClassifications
            gc={data.gc ?? []}
            points={points}
            kom={kom}
            teamStage={data.teamStage ?? []}
            teamGc={data.teamGc ?? []}
          />
        )}

        {active === 'profile' && (
          <div className={card}>
            <h2 className={head}>Profile</h2>
            {data.altimetry ? (
              <div
                className="mt-2 w-full overflow-x-auto"
                role="img"
                aria-label={`Elevation profile of stage ${data.day}, ${data.km} km`}
                dangerouslySetInnerHTML={{ __html: data.altimetry }}
              />
            ) : (
              <p className="text-sm text-slate-400">No profile available for this stage.</p>
            )}
            {!data.run && (
              <p className="mt-3 text-sm text-slate-500">This stage hasn't been raced yet.</p>
            )}
          </div>
        )}
      </TabPanel>
    </section>
  )
}
