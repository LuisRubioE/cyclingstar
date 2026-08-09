import { COUNTRIES, VOCATION_LABELS, type Vocation } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { type TeamRider, fetchPublicRider, fetchTeam } from '../api/browse'
import { fetchRiderPalmares, fetchRiderResults } from '../api/rankings'
import { fetchMyRider, fetchRiderSummary } from '../api/rider'
import { AttributeList } from '../components/AttributeList'
import { Flag } from '../components/Flag'
import { Jersey } from '../components/Jersey'
import { Panel, SectionBar } from '../components/Panel'
import { RaceResultList } from '../components/RaceResults'
import { RiderName } from '../components/RiderName'
import { palmaresLabel } from '../domain/labels'

/**
 * `My Team → Squad` (docs/navegacion.md §3.4): mis compañeros de equipo, en SOLO LECTURA.
 *
 * Es la pestaña que da sentido a `My Team` para un corredor de a pie: hoy no hay mánagers humanos,
 * pero sí compañeros, y saber quiénes son —su especialidad, su nivel y lo que han ganado— es lo que
 * explica qué papel me toca a mí en la carretera.
 *
 * El nivel y el palmarés de cada compañero se piden solo al desplegar su ficha: una plantilla son
 * ~25 corredores y no tiene sentido traerse 50 peticiones para una tabla que se lee de un vistazo.
 */

const DIVISION_LABEL: Record<string, string> = {
  WT: 'World Tour',
  PRS: 'Pro Series',
  CON: 'Continental',
}

/** Distintivo de salud junto al nombre; los sanos no llevan, para no meter ruido. */
const HEALTH_BADGE: Record<string, { label: string; cls: string } | undefined> = {
  molestias: { label: 'Niggle', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  enfermo: { label: 'Ill', cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
  lesionado: { label: 'Injured', cls: 'bg-red-50 text-red-700 ring-red-200' },
}

/** Ficha desplegable de un compañero: atributos, últimos resultados y palmarés. */
function TeammateDetail({ riderId }: { riderId: string }) {
  const rider = useQuery({
    queryKey: ['public-rider', riderId],
    queryFn: () => fetchPublicRider(riderId),
  })
  const results = useQuery({
    queryKey: ['public-rider', riderId, 'results'],
    queryFn: () => fetchRiderResults(riderId),
  })
  const palmares = useQuery({
    queryKey: ['public-rider', riderId, 'palmares'],
    queryFn: () => fetchRiderPalmares(riderId),
  })

  if (rider.isPending) return <p className="px-4 py-3 text-sm text-slate-500">Loading…</p>
  if (rider.isError)
    return <p className="px-4 py-3 text-sm text-red-600">Could not load this rider.</p>

  return (
    <div className="grid gap-5 border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:grid-cols-2">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Attributes</h3>
        <p className="mt-0.5 text-xs text-slate-400">
          Age {rider.data.age} · {rider.data.seasonPoints.toLocaleString('en-US')} season points ·
          fame {Math.round(rider.data.fame)}
        </p>
        <AttributeList attributes={rider.data.attributes} />
      </div>

      <div className="space-y-5">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Recent results
          </h3>
          {results.data && results.data.length > 0 ? (
            // Una línea por carrera con su general de titular; el desglose de etapas se pliega.
            <div className="mt-2">
              <RaceResultList results={results.data} limit={6} />
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-400">No results yet.</p>
          )}
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Palmarès</h3>
          {palmares.data && palmares.data.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {palmares.data.slice(0, 8).map((p, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-16 shrink-0 text-xs text-slate-400">
                    Season {p.season + 1}
                  </span>
                  <span className="font-medium text-slate-700">{p.raceName}</span>
                  <span className="text-xs text-slate-500">{palmaresLabel(p.kind)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Nothing won yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

/** Una fila de la plantilla; se despliega para ver nivel y palmarés. */
function SquadRow({ rider, isMe }: { rider: TeamRider; isMe: boolean }) {
  const [open, setOpen] = useState(false)
  const health = HEALTH_BADGE[rider.health]
  return (
    <li className={isMe ? 'bg-brand-cyan/5' : ''}>
      <div className="flex items-center gap-3 px-4 py-2">
        <Flag code={rider.country} size={16} />
        <span className="min-w-0 flex-1 truncate">
          <RiderName riderId={rider.id} name={rider.name} isBot={rider.isBot} />
          {isMe && (
            <span className="ml-2 rounded bg-brand-navy px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              You
            </span>
          )}
          {health && (
            <span className={`ml-2 rounded px-1.5 py-0.5 text-xs ring-1 ${health.cls}`}>
              {health.label}
            </span>
          )}
        </span>
        <span className="hidden w-32 shrink-0 text-sm text-slate-500 sm:block">
          {VOCATION_LABELS[rider.archetype as Vocation] ?? rider.archetype}
        </span>
        <span className="w-20 shrink-0 text-right text-sm tabular-nums text-slate-400">
          {rider.seasonPoints.toLocaleString('en-US')}
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="shrink-0 rounded px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          {open ? 'Hide' : 'Detail'}
        </button>
      </div>
      {open && <TeammateDetail riderId={rider.id} />}
    </li>
  )
}

export function TeamSquad() {
  const summary = useQuery({ queryKey: ['rider', 'summary'], queryFn: fetchRiderSummary })
  const me = useQuery({ queryKey: ['rider', 'me'], queryFn: fetchMyRider })
  const teamId = summary.data?.teamId ?? null
  const team = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => fetchTeam(teamId!),
    enabled: teamId != null,
  })

  if (summary.isPending) return <p className="text-slate-500">Loading…</p>

  // Sin equipo no hay plantilla que enseñar. Las ofertas viven en My Rider → Contract, siempre en
  // el mismo sitio tenga equipo o no (principio 7 de docs/navegacion.md).
  if (!teamId) {
    return (
      <section className="space-y-4">
        <SectionBar>Squad</SectionBar>
        <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          You are a free agent, so you have no teammates yet. Any contract offer you receive shows
          up in{' '}
          <Link to="/me/contract" className="font-medium text-indigo-600 hover:underline">
            My Rider → Contract
          </Link>
          .
        </p>
      </section>
    )
  }

  if (team.isPending) return <p className="text-slate-500">Loading…</p>
  if (team.isError || !team.data) return <p className="text-red-600">Could not load your team.</p>

  const roster = [...team.data.roster].sort((a, b) => b.seasonPoints - a.seasonPoints)
  const country = COUNTRIES.find((c) => c.code === team.data.country)
  const myId = me.data?.id ?? null

  return (
    <section className="space-y-4">
      <SectionBar>Squad · {team.data.name}</SectionBar>

      <Panel>
        <div className="flex flex-wrap items-center gap-3">
          <Jersey seed={team.data.jerseySeed} size={40} />
          {team.data.country && <Flag code={team.data.country} size={26} />}
          <p className="text-sm text-slate-500">
            {DIVISION_LABEL[team.data.division] ?? team.data.division}
            {country ? ` · ${country.name}` : ''} · {roster.length} riders ·{' '}
            {team.data.pointsSeason.toLocaleString('en-US')} season points
          </p>
          <Link
            to={`/world/teams/${team.data.id}`}
            className="ml-auto text-xs font-medium text-indigo-600 hover:text-indigo-500"
          >
            Public team page →
          </Link>
        </div>
      </Panel>

      <Panel
        title={`Riders (${roster.length})`}
        action={<span className="text-xs text-white/80">Season points</span>}
        bodyClassName="p-0"
      >
        <ul className="divide-y divide-slate-100">
          {roster.map((r) => (
            <SquadRow key={r.id} rider={r} isMe={r.id === myId} />
          ))}
        </ul>
      </Panel>

      <p className="text-xs text-slate-400">
        Read-only for now: picking who races, signing and releasing riders is manager work, and no
        human manages a team yet.
      </p>
    </section>
  )
}
