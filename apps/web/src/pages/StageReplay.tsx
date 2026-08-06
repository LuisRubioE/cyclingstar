import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import {
  type ChronicleEntry,
  type StageClassEntry,
  type StageResultEntry,
  fetchCalendarStage,
} from '../api/results'
import { formatTime } from '../domain/format'
import { Flag } from '../components/Flag'
import { RiderName } from '../components/RiderName'

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

/** Journal/crónica de una etapa de calendario ya corrida: lo que pasó, más resultado y general. */
export function StageReplay() {
  const { raceId = '', day = '' } = useParams()
  const dayNum = Number(day)
  const { data, isPending, isError } = useQuery({
    queryKey: ['stage-replay', raceId, dayNum],
    queryFn: () => fetchCalendarStage(raceId, dayNum),
  })
  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the stage.</p>

  const leader = data.gc?.[0]?.tiempoTotalS ?? 0
  const stageWinnerTime = data.results?.[0]?.tiempoS ?? 0
  const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
  const head = 'text-xs font-semibold uppercase tracking-wide text-slate-400'

  return (
    <section className="space-y-4">
      <Link to={`/races/${raceId}`} className="text-xs text-slate-400 hover:text-slate-600">
        ← Back to the race
      </Link>
      <header>
        <h1 className="text-xl font-bold tracking-tight text-slate-800">
          Stage {data.day}
          {data.name ? ` · ${data.name}` : ''}
        </h1>
        <p className="text-sm text-slate-500">{data.km} km</p>
      </header>

      {data.altimetry && (
        <div className={card}>
          <div
            className="w-full overflow-x-auto"
            role="img"
            aria-label={`Elevation profile of stage ${data.day}, ${data.km} km`}
            dangerouslySetInnerHTML={{ __html: data.altimetry }}
          />
        </div>
      )}

      {!data.run && <p className="text-slate-500">This stage hasn't been raced yet.</p>}

      {data.run && data.journalUnavailable && (
        <div className={card}>
          <p className="text-sm text-slate-500">
            The detailed journal wasn't recorded for this stage — it was raced before the chronicle
            was saved. The result below is the official one.
          </p>
        </div>
      )}

      {/* Crono: sin fuga ni sprint que narrar, se cuenta la historia del reloj desde los tiempos. */}
      {data.run && data.timeTrial && data.results && data.results.length > 0 && (
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

      {data.results && data.results.length > 0 && (
        <div className={card}>
          <h2 className={head}>Stage result</h2>
          <table className="mt-2 w-full text-sm">
            <caption className="sr-only">Stage result: position, country, rider and time</caption>
            <tbody>
              {data.results.slice(0, 15).map((r) => (
                <tr key={r.riderId} className="border-b border-slate-100 last:border-0">
                  <td className="w-7 py-1 text-slate-400 tabular-nums">{r.puesto}</td>
                  <td className="w-6 py-1">
                    <Flag code={r.country} size={16} />
                  </td>
                  <td className="py-1 text-slate-700">
                    <RiderName riderId={r.riderId} name={r.name} isBot={r.isBot} />
                  </td>
                  <td className="py-1 text-right tabular-nums text-slate-500">
                    {r.puesto === 1
                      ? formatTime(r.tiempoS)
                      : `+${formatTime(r.tiempoS - stageWinnerTime)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.gc && data.gc.length > 0 && (
        <div className={card}>
          <h2 className={head}>General classification after the stage</h2>
          <table className="mt-2 w-full text-sm">
            <caption className="sr-only">
              General classification: position, country, rider and time
            </caption>
            <tbody>
              {data.gc.slice(0, 15).map((r, i) => (
                <tr key={r.riderId} className="border-b border-slate-100 last:border-0">
                  <td className="w-7 py-1 text-slate-400 tabular-nums">{i + 1}</td>
                  <td className="w-6 py-1">
                    <Flag code={r.country} size={16} />
                  </td>
                  <td className="py-1 text-slate-700">
                    <RiderName riderId={r.riderId} name={r.name} isBot={r.isBot} />
                  </td>
                  <td className="py-1 text-right tabular-nums text-slate-500">
                    {i === 0
                      ? formatTime(r.tiempoTotalS)
                      : `+${formatTime(r.tiempoTotalS - leader)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.kom && data.kom.length > 0 && (
        <div className={card}>
          <h2 className={head}>Mountains classification (KOM) after the stage</h2>
          <PointsTable rows={data.kom} unit="pts" />
        </div>
      )}

      {data.points && data.points.length > 0 && (
        <div className={card}>
          <h2 className={head}>Points classification after the stage</h2>
          <PointsTable rows={data.points} unit="pts" />
        </div>
      )}
    </section>
  )
}

/** Tabla compacta de una clasificación por puntos (montaña o metas volantes): puesto, bandera, nombre, puntos. */
function PointsTable({ rows, unit }: { rows: StageClassEntry[]; unit: string }) {
  return (
    <table className="mt-2 w-full text-sm">
      <caption className="sr-only">Classification: position, country, rider and {unit}</caption>
      <tbody>
        {rows.slice(0, 10).map((r, i) => (
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
  )
}
