import { COUNTRIES, VOCATION_LABELS, type Vocation } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  type TeamDetail,
  fetchTeam,
  fetchTeamControl,
  fetchTeamNews,
  fetchTeams,
} from '../api/browse'
import { fetchRiderSummary } from '../api/rider'
import { Flag } from '../components/Flag'
import { Jersey } from '../components/Jersey'
import { InfoRow, Panel, SectionBar } from '../components/Panel'
import { TeamManager } from '../components/TeamManager'

/**
 * `My Team → Identity` (docs/navegacion.md §3.4): quién es mi equipo — maillot, país, división,
 * filosofía e historia reciente.
 *
 * La "filosofía" no es un texto inventado guardado en ninguna parte: se DEDUCE de la plantilla
 * (edad media, cuánta cantera hay y qué especialidad domina). Así siempre dice la verdad sobre el
 * equipo que hay hoy, y cambia cuando cambia la plantilla.
 */

const DIVISION_LABEL: Record<string, string> = {
  WT: 'World Tour',
  PRS: 'Pro Series',
  CON: 'Continental',
}

const DIVISION_BLURB: Record<string, string> = {
  WT: 'Top flight: invited to every WorldTour race on the calendar.',
  PRS: 'Second tier: races the ProSeries and takes wildcards into the big ones.',
  CON: 'Continental level: its season is built around its own region.',
}

/** Especialidad dominante de la plantilla, con cuántos corredores la comparten. */
function dominantVocation(team: TeamDetail): { label: string; count: number } | null {
  const tally = new Map<string, number>()
  for (const r of team.roster) tally.set(r.archetype, (tally.get(r.archetype) ?? 0) + 1)
  let best: { archetype: string; count: number } | null = null
  for (const [archetype, count] of tally) {
    if (!best || count > best.count) best = { archetype, count }
  }
  if (!best) return null
  return {
    label: VOCATION_LABELS[best.archetype as Vocation] ?? best.archetype,
    count: best.count,
  }
}

/**
 * Una frase que resume el carácter del equipo a partir de su plantilla real: de dónde salen sus
 * corredores y a qué terreno tiran.
 */
function philosophy(team: TeamDetail): string {
  if (team.roster.length === 0) return 'No riders under contract yet.'
  const home = team.roster.filter((r) => !r.foreign).length
  const homeShare = home / team.roster.length
  const dominant = dominantVocation(team)

  const identity =
    homeShare >= 0.75
      ? 'A home-grown squad, built almost entirely from riders of its own country'
      : homeShare >= 0.4
        ? 'A squad with a strong local core and a handful of riders from abroad'
        : 'A cosmopolitan squad, recruited wherever the talent is'

  const style =
    dominant && dominant.count >= 3
      ? ` — and one that leans on its ${dominant.label.toLowerCase()}s (${dominant.count} of ${team.roster.length}).`
      : ' — with no single specialty dominating the roster.'

  return identity + style
}

export function TeamIdentity() {
  const summary = useQuery({ queryKey: ['rider', 'summary'], queryFn: fetchRiderSummary })
  const teamId = summary.data?.teamId ?? null
  const team = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => fetchTeam(teamId!),
    enabled: teamId != null,
  })
  const news = useQuery({
    queryKey: ['team-news', teamId],
    queryFn: () => fetchTeamNews(teamId!),
    enabled: teamId != null,
  })
  const teams = useQuery({ queryKey: ['teams'], queryFn: fetchTeams })
  const control = useQuery({ queryKey: ['team-control'], queryFn: fetchTeamControl })

  if (summary.isPending) return <p className="text-slate-500">Loading…</p>

  if (!teamId) {
    return (
      <section className="space-y-4">
        <SectionBar>Identity</SectionBar>
        <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          You do not belong to a team yet. Browse the peloton in{' '}
          <Link to="/world/teams" className="font-medium text-indigo-600 hover:underline">
            World → Teams
          </Link>
          .
        </p>
      </section>
    )
  }

  if (team.isPending) return <p className="text-slate-500">Loading…</p>
  if (team.isError || !team.data) return <p className="text-red-600">Could not load your team.</p>

  const data = team.data
  const country = COUNTRIES.find((c) => c.code === data.country)
  // Puesto del equipo en la clasificación por puntos de la temporada, si ya hay lista de equipos.
  const ranked = [...(teams.data ?? [])].sort((a, b) => b.pointsSeason - a.pointsSeason)
  const rank = ranked.findIndex((t) => t.id === data.id)
  const ownedByMe = control.data?.team?.id === data.id && control.data.team.ownedByMe === true

  return (
    <section className="space-y-4">
      <SectionBar>Identity · {data.name}</SectionBar>

      <Panel>
        <div className="flex flex-wrap items-center gap-4">
          <Jersey seed={data.jerseySeed} size={72} />
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-lg font-bold text-slate-800">
              {data.country && <Flag code={data.country} size={22} />}
              {data.name}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              {DIVISION_LABEL[data.division] ?? data.division}
              {country ? ` · ${country.name}` : ''} ·{' '}
              {data.human ? 'player-managed' : 'run by the computer'}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">{philosophy(data)}</p>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2">
        <Panel title="The team">
          <InfoRow label="Division">{DIVISION_LABEL[data.division] ?? data.division}</InfoRow>
          <InfoRow label="Based in">
            <span className="inline-flex items-center gap-1.5">
              {data.country && <Flag code={data.country} size={14} />}
              {country?.name ?? data.country ?? '—'}
            </span>
          </InfoRow>
          <InfoRow label="Riders">{data.roster.length}</InfoRow>
          <InfoRow label="Season points">{data.pointsSeason.toLocaleString('en-US')}</InfoRow>
          <InfoRow label="Rank among teams">
            {rank >= 0 ? `#${rank + 1} of ${ranked.length}` : '—'}
          </InfoRow>
          <InfoRow label="Budget">{data.budget.toLocaleString('en-US')}</InfoRow>
          <p className="pt-3 text-xs text-slate-400">
            {DIVISION_BLURB[data.division] ?? 'Its calendar follows its licence level.'}
          </p>
        </Panel>

        <Panel title="Jersey">
          <div className="flex items-center gap-4">
            <Jersey seed={data.jerseySeed} size={96} />
            <p className="text-sm text-slate-500">
              Every kit is drawn from the team&apos;s own seed, so it is the same everywhere it
              appears — start lists, results and the peloton.
            </p>
          </div>
        </Panel>
      </div>

      {/* Si además gestiono el equipo, aquí es donde se cambian nombre, país y maillot (§3.4). */}
      {ownedByMe && <TeamManager team={data} />}

      <Panel title="History" bodyClassName="p-0">
        {news.data && news.data.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {news.data.map((n, i) => (
              <li key={i} className="flex gap-3 px-4 py-2.5 text-sm">
                <span className="w-16 shrink-0 text-xs tabular-nums text-slate-400">
                  Day {n.gameDay}
                </span>
                <span className="text-slate-700">{n.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            Nothing has happened to this team yet — its story starts with the next race.
          </p>
        )}
      </Panel>
    </section>
  )
}
