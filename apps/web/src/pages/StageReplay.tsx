import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  type ChronicleEntry,
  type StageClassEntry,
  type StageGcEntry,
  type StageResultEntry,
  fetchCalendarStage,
} from '../api/results'
import { Flag } from '../components/Flag'
import { RiderName } from '../components/RiderName'
import { ShowAllButton, TOP_ROWS } from '../components/ShowAll'
import { type TabOption, TabPanel, Tabs, useTabParam } from '../components/Tabs'
import { formatTime } from '../domain/format'

/** Segundos como diferencia de carrera: 45s, 1:30, 12:05. */
function fmtGap(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = String(seconds % 60).padStart(2, '0')
  return `${m}:${s}`
}

/** Índice determinista para elegir una variante de frase (misma entrada ⇒ misma variante). */
function variantIndex(seed: string, mod: number): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0
  return mod > 0 ? h % mod : 0
}

/** Une una lista con comas y "and" al final: "A", "A and B", "A, B and C". */
function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * Convierte un evento del motor en una frase del journal. Varias redacciones por evento, elegidas
 * de forma determinista (misma etapa ⇒ mismo relato, pero variado entre eventos y etapas), y con
 * nombres de corredores y de equipos para que se lea como una crónica de verdad.
 */
function chronicleLine(e: ChronicleEntry): string {
  const who = listNames(e.protagonists)
  const team = e.protagonistTeams?.[0]
  const teams = listNames(e.protagonistTeams ?? [])
  const seed = `${e.plantilla}:${e.km}:${who}`
  const pick = (opts: string[]): string => opts[variantIndex(seed, opts.length)] ?? opts[0] ?? ''
  switch (e.plantilla) {
    case 'breakaway_formed':
      return pick([
        `${who || 'A group'} attack and open up the day's break.`,
        `${who || 'A handful of riders'} jump clear off the front.`,
        `The break of the day forms: ${who || 'an early move'} go up the road.`,
        `${who || 'A move'} slip away and get a gap.`,
      ])
    case 'break_cooperation':
      return e.datos?.cooperating === 1
        ? pick([
            'Up front they collaborate well, rolling smooth turns.',
            'The break is working like a well-drilled team, sharing the load.',
            'Good understanding in the move — everyone takes their turn.',
          ])
        : pick([
            'There is little cooperation up front — the move looks disorganised.',
            'The escapees eye each other and few want to work.',
            'No unity in the break; the turns are ragged.',
          ])
    case 'sprinters_chase':
      return team
        ? pick([
            `${team} hit the front and take up the chase.`,
            `${team} mass at the head of the bunch to reel the break in.`,
            `${team} take control, winding up the pace behind ${e.protagonists[0] ?? 'their sprinter'}.`,
          ])
        : pick([
            "The sprinters' teams take up the chase.",
            'The bunch organises behind — the chase is on.',
          ])
    case 'time_gap': {
      const g = fmtGap(Number(e.datos?.gapS ?? 0))
      const trend = Number(e.datos?.trend ?? 0)
      if (trend > 0)
        return pick([`The lead stretches out to ${g}.`, `Out front the gap grows to ${g}.`])
      if (trend < 0)
        return pick([
          `The advantage is down to ${g} and falling.`,
          `The bunch has the gap back to ${g}.`,
        ])
      return pick([`The break leads by ${g}.`, `Out front the advantage holds at ${g}.`])
    }
    case 'peloton_concedes':
      return pick([
        'The peloton concedes — the break is given room to fight for the win.',
        'The bunch eases and lets the move take its rope.',
        'No panic behind: the favourites wave the break up the road.',
      ])
    case 'sprinters_give_up':
      return pick([
        "The sprinters' teams give up the chase.",
        'The lead-out trains sit up — the catch looks off.',
        'Behind, the fast men run out of legs and abandon the pursuit.',
      ])
    case 'breakaway_caught':
      return pick([
        'The peloton catches the breakaway — everyone back together.',
        'The break is caught; the race is all together again.',
        'The chase succeeds and the escapees are reeled back in.',
      ])
    case 'sprint_intermediate':
      return pick([
        `${who} takes the intermediate sprint.`,
        `${who} kicks first at the intermediate.`,
        `${who} grabs the points at the intermediate sprint.`,
      ])
    case 'climb_kom': {
      const cat = String(e.datos?.category ?? '')
      const catLabel =
        cat === 'HC'
          ? 'hors-catégorie climb'
          : cat.startsWith('cat')
            ? `category ${cat.slice(3)} climb`
            : 'climb'
      const pts = Number(e.datos?.points ?? 0)
      const t = team ? ` (${team})` : ''
      const ptsPart = pts > 0 ? `, taking ${pts} KOM point${pts === 1 ? '' : 's'}` : ''
      const leadPart = e.datos?.leads === 1 ? ' — he now leads the mountains classification' : ''
      return `${who}${t} is first over the ${catLabel}${ptsPart}${leadPart}.`
    }
    case 'peloton_split': {
      const dropped = Number(e.datos?.dropped ?? 0)
      const remaining = e.datos?.remaining
      const left = remaining != null ? ` — about ${remaining} left in front` : ''
      // El protagonista es quien impone el ritmo (su equipo tira); si no hay, se narra sin nombre.
      const driver = team
        ? `${team} lift the pace`
        : who
          ? `${who} lifts the pace`
          : 'The pace lifts'
      return pick([
        `${driver} on the climb — ${dropped} riders are shelled${left}.`,
        `${driver} and ${dropped} riders slip off the back${left}.`,
        `${driver}; the climb thins the lead group by ${dropped}${left}.`,
      ])
    }
    case 'final_km': {
      const margin = Number(e.datos?.margin ?? 0)
      const field = Number(e.datos?.field ?? 0)
      const m = margin > 0 ? ` by ${fmtGap(margin)}` : ''
      if (field <= 1)
        return `Into the final kilometre ${who} leads alone${m} — barring mishap the stage is won.`
      return `Into the final kilometre ${who} are clear${m} — the win will be fought out among them.`
    }
    case 'bunch_sprint': {
      const led = e.datos?.ledOut === 1
      const trio = listNames(e.protagonists.slice(0, 3))
      return pick([
        `Into the final kilometre it's a bunch sprint — ${trio} fight it out.`,
        `The trains wind up for a mass gallop; ${trio} are in the mix.`,
        led
          ? `Perfectly led out, ${e.protagonists[0] ?? 'the sprinter'} launches with ${trio} for company.`
          : `All together for the sprint: ${trio} line it up.`,
      ])
    }
    case 'stage_win': {
      const t = team ? ` (${team})` : ''
      const won = e.datos?.won
      const margin = Number(e.datos?.margin ?? 0)
      if (won === 'solo')
        return pick([
          `${who}${t} solos to victory, ${fmtGap(margin)} clear of the chase.`,
          `${who}${t} holds on alone to win by ${fmtGap(margin)}.`,
        ])
      if (won === 'sprint')
        return pick([
          `${who}${t} wins the bunch sprint.`,
          `${who}${t} takes the sprint from the bunch.`,
          `${who}${t} throws up the arms — fastest in the sprint.`,
        ])
      if (won === 'group')
        return pick([
          `${who}${t} wins from the lead group.`,
          `${who}${t} outkicks the leaders for the stage.`,
        ])
      return `${who}${t} wins the stage.`
    }
    case 'stage_win_itt':
      return `${who} sets the fastest time.`
    default:
      return `${e.plantilla}${who ? `: ${who}` : ''}${teams ? ` (${teams})` : ''}`
  }
}

/** Diferencia contra el mejor tiempo, formateada (+Ns o +m:ss). */
function gapToBest(seconds: number): string {
  if (seconds < 60) return `+${seconds}s`
  const m = Math.floor(seconds / 60)
  const ss = String(seconds % 60).padStart(2, '0')
  return `+${m}:${ss}`
}

/**
 * Relato de una contrarreloj a partir de los tiempos reales: una crono no tiene fuga ni sprint que
 * narrar, así que el journal cuenta lo que importa —mejor tiempo, quién se acercó, y cuán apretada
 * quedó la clasificación contra el crono—.
 */
function timeTrialStory(results: StageResultEntry[]): string[] {
  if (results.length === 0) return []
  const winner = results[0]!
  const gap = (r: StageResultEntry) => r.tiempoS - winner.tiempoS
  const lines = [`Best time of the day: ${winner.name} — ${formatTime(winner.tiempoS)}.`]
  if (results[1]) lines.push(`${results[1].name} came closest, ${gapToBest(gap(results[1]))} down.`)
  if (results[2])
    lines.push(`${results[2].name} rounded out the podium at ${gapToBest(gap(results[2]))}.`)
  const within = results.filter((r) => gap(r) <= 60).length
  if (within >= 2)
    lines.push(`${within} riders finished within a minute of the best time — a tight one.`)
  return lines
}

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

type StageClassTabId = 'gc' | 'points' | 'kom'

const STAGE_CLASS_TAB_IDS: readonly StageClassTabId[] = ['gc', 'points', 'kom']
const STAGE_CLASS_TABS: readonly TabOption<StageClassTabId>[] = [
  { key: 'gc', label: 'General' },
  { key: 'points', label: 'Points' },
  { key: 'kom', label: 'Mountains' },
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
  const leader = rows[0]?.tiempoTotalS ?? 0
  const visible = showAll ? rows : rows.slice(0, TOP_ROWS)
  return (
    <>
      <table className="mt-2 w-full text-sm">
        <caption className="sr-only">
          General classification: position, country, rider, team and time
        </caption>
        <tbody>
          {visible.map((r, i) => (
            <tr key={r.riderId} className="border-b border-slate-100 last:border-0">
              <td className="w-7 py-1 text-slate-400 tabular-nums">{i + 1}</td>
              <td className="w-6 py-1">
                <Flag code={r.country} size={16} />
              </td>
              <td className="py-1 text-slate-700">
                <RiderName riderId={r.riderId} name={r.name} isBot={r.isBot} />
                {r.teamName && <span className="ml-2 text-xs text-slate-400">{r.teamName}</span>}
              </td>
              <td className="py-1 text-right tabular-nums text-slate-500">
                {i === 0 ? formatTime(r.tiempoTotalS) : `+${formatTime(r.tiempoTotalS - leader)}`}
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
 * En una carrera de UN DÍA no se enseña la general: la etapa ES el resultado, así que la general
 * sería una copia exacta de la pestaña `Result` de al lado (y enseñar las dos era justo lo que
 * confundía en producción).
 */
function StageClassifications({
  gc,
  points,
  kom,
  oneDay,
}: {
  gc: StageGcEntry[]
  points: StageClassEntry[]
  kom: StageClassEntry[]
  oneDay: boolean
}) {
  const ids = oneDay ? STAGE_CLASS_TAB_IDS.filter((id) => id !== 'gc') : STAGE_CLASS_TAB_IDS
  const options = oneDay ? STAGE_CLASS_TABS.filter((o) => o.key !== 'gc') : STAGE_CLASS_TABS
  const [active, setActive] = useTabParam(ids, ids[0] as StageClassTabId, 'cls')
  return (
    <div className={card}>
      <p className="mb-3 text-xs text-slate-400">
        {oneDay ? 'Standings from this race.' : 'Standings after this stage.'}
      </p>
      <Tabs
        options={options}
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
      </TabPanel>
    </div>
  )
}

/**
 * Página de una etapa del calendario. Ya no es un callejón sin salida: la cabecera dice a qué carrera
 * pertenece y qué etapa es de cuántas, hay anterior/siguiente para leer las 21 crónicas seguidas, y el
 * contenido va en pestañas con `Story` por delante, que es la carga emocional de la etapa.
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
  //
  // En una carrera de un día la general es una copia del resultado, así que `Classifications` solo
  // aparece si hay algo propio que enseñar (puntos o montaña); si no, sobra la pestaña entera.
  const isOneDay = (data?.race?.stageCount ?? 0) === 1
  const hasSideClassifications = (data?.points?.length ?? 0) > 0 || (data?.kom?.length ?? 0) > 0
  const tabIds: readonly StageTabId[] = !data?.run
    ? ['profile']
    : isOneDay && !hasSideClassifications
      ? STAGE_TAB_IDS.filter((id) => id !== 'classifications')
      : STAGE_TAB_IDS
  const [active, setActive] = useTabParam(tabIds, tabIds[0] as StageTabId)

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the stage.</p>

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
          {race && !isOneDay && stageCount > 0 && (
            <span className="text-slate-400">
              · Stage {data.day} of {stageCount}
            </span>
          )}
        </Link>
        {!isOneDay && stageCount > 0 && (
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
          {isOneDay ? (race?.name ?? data.name) : `Stage ${data.day}`}
          {!isOneDay && data.name ? ` · ${data.name}` : ''}
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
        {active === 'story' && (
          <>
            {data.journalUnavailable && (
              <div className={card}>
                <p className="text-sm text-slate-500">
                  The detailed journal wasn't recorded for this stage — it was raced before the
                  chronicle was saved. The result is still the official one.
                </p>
              </div>
            )}
            {/* Crono: sin fuga ni sprint que narrar, se cuenta la historia del reloj desde los tiempos. */}
            {data.timeTrial && data.results && data.results.length > 0 && (
              <div className={card}>
                <h2 className={head}>Against the clock</h2>
                <ul className="mt-3 space-y-2">
                  {timeTrialStory(data.results).map((line, i) => (
                    <li key={i} className="text-sm text-slate-700">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!data.timeTrial && data.chronicle && data.chronicle.length > 0 && (
              <div className={card}>
                <h2 className={head}>How the stage unfolded</h2>
                <ol className="mt-3 space-y-2">
                  {data.chronicle.map((e, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="w-14 shrink-0 text-right tabular-nums text-slate-400">
                        km {e.km}
                      </span>
                      <span className="text-slate-700">{chronicleLine(e)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {/* El desenlace, sin cambiar de pestaña: los tres primeros y la salida al resultado completo. */}
            {data.results && data.results.length > 0 && (
              <div className={card}>
                <h2 className={head}>Podium</h2>
                <ol className="mt-2 space-y-1.5">
                  {data.results.slice(0, 3).map((r) => (
                    <li key={r.riderId} className="flex items-center gap-3 text-sm">
                      <span className="w-5 shrink-0 tabular-nums text-slate-400">{r.puesto}</span>
                      <Flag code={r.country} size={16} />
                      <RiderName riderId={r.riderId} name={r.name} isBot={r.isBot} />
                      {r.teamName && <span className="text-xs text-slate-400">{r.teamName}</span>}
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  onClick={() => setActive('result')}
                  className="mt-2 text-sm font-medium text-brand-cyan hover:underline"
                >
                  Full result →
                </button>
              </div>
            )}
          </>
        )}

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
          <StageClassifications gc={data.gc ?? []} points={points} kom={kom} oneDay={isOneDay} />
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
