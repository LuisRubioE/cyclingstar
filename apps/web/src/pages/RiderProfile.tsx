import {
  ATTRIBUTES,
  COUNTRIES,
  VOCATION_LABELS,
  type Attribute,
  type Vocation,
  birthdayDayOfSeason,
} from '@cyclingstar/shared'
import { type Eff, eff0, matchCount } from '@cyclingstar/engine'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { type PublicRiderDetail, fetchPublicRider } from '../api/browse'
import { fetchForm } from '../api/form'
import { fetchHealth } from '../api/health'
import { fetchRacePrefs } from '../api/objectives'
import { fetchRiderPalmares, fetchRiderResults } from '../api/rankings'
import { fetchMyRider, fetchRiderSummary } from '../api/rider'
import { AttributeList } from '../components/AttributeList'
import { Badges } from '../components/Badges'
import { Flag } from '../components/Flag'
import { FormChart } from '../components/FormChart'
import { LastRaceReport } from '../components/LastRaceReport'
import { InfoRow, Panel, SectionBar } from '../components/Panel'
import { RoleEditor } from '../components/RoleEditor'
import { StarRating } from '../components/StarRating'
import { TeamLink } from '../components/TeamLink'
import { palmaresLabel } from '../domain/labels'

/** Etiquetas y consejo de cada estado de salud (solo se ve en modo propietario). */
const HEALTH_META: Record<string, { label: string; cls: string; note: string }> = {
  sano: {
    label: 'Healthy',
    cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    note: 'Fit to race and train.',
  },
  molestias: {
    label: 'Minor niggle',
    cls: 'bg-amber-50 text-amber-700 ring-amber-200',
    note: 'Can race, but at a slight disadvantage until it clears.',
  },
  enfermo: {
    label: 'Ill',
    cls: 'bg-orange-50 text-orange-700 ring-orange-200',
    note: "Resting to recover — won't be called up until fit again.",
  },
  lesionado: {
    label: 'Injured',
    cls: 'bg-red-50 text-red-700 ring-red-200',
    note: "Out with an injury — can't race until recovered.",
  },
}

/** Cabecera de identidad: lo mismo para todo el mundo, con o sin sesión. */
function Identity({ rider }: { rider: PublicRiderDetail }) {
  const country = COUNTRIES.find((c) => c.code === rider.country)
  const abroad = rider.residence && rider.residence !== rider.country
  const residence = COUNTRIES.find((c) => c.code === rider.residence)
  return (
    <div className="mb-3 flex items-center gap-3">
      <Flag code={rider.country} size={34} />
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-xl font-bold tracking-tight">
          {rider.name}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              rider.isBot ? 'bg-slate-100 text-slate-500' : 'bg-cyan-50 text-brand-cyan'
            }`}
          >
            {rider.isBot ? 'NPC' : 'Player'}
          </span>
        </p>
        <p className="text-sm text-slate-500">
          {VOCATION_LABELS[rider.archetype as Vocation] ?? rider.archetype}
          {' · '}
          <Link
            to={`/countries/${rider.country}`}
            className="hover:text-brand-cyan hover:underline"
          >
            {country?.name ?? rider.country}
          </Link>
          {rider.teamName && (
            <>
              {' · '}
              <TeamLink teamId={rider.teamId} name={rider.teamName} className="text-brand-cyan" />
            </>
          )}
          {abroad && (
            <span className="inline-flex items-center gap-1">
              {' · lives in '}
              <Flag code={rider.residence} size={12} />
              {residence?.name ?? rider.residence}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

/**
 * Bloque privado: forma, frescura, salud, cerillos y moral. Solo se monta si el perfil es MÍO, así
 * que sus consultas (`/api/riders/me/...`) no se disparan nunca en la vista pública.
 */
function OwnerCondition({ attributes }: { attributes: Record<Attribute, number> }) {
  const formQuery = useQuery({ queryKey: ['rider', 'form'], queryFn: fetchForm })
  const summaryQuery = useQuery({ queryKey: ['rider', 'summary'], queryFn: fetchRiderSummary })
  const healthQuery = useQuery({ queryKey: ['health'], queryFn: fetchHealth })

  const form = formQuery.data?.form ?? null
  const health = formQuery.data?.health ?? null
  const log = formQuery.data?.log ?? []
  const last = log[log.length - 1] ?? null
  const gameDay = healthQuery.data?.gameDay ?? null
  const daysLeft =
    health?.untilDay != null && gameDay != null ? Math.max(0, health.untilDay - gameDay + 1) : null

  // Cerillos del día: la MISMA cuenta que hará la etapa (SPEC 6.6), sobre los atributos efectivos
  // de hoy —forma, salud y moral incluidas—, para que el jugador vea con qué sale de casa.
  const morale = summaryQuery.data?.morale ?? null
  const matches =
    last && health && morale != null
      ? matchCount(
          Object.fromEntries(
            ATTRIBUTES.map((a) => [
              a,
              eff0(attributes[a], last.ctl, last.tsb, health.state, morale),
            ]),
          ) as Eff,
          last.tsb,
        )
      : null

  return (
    <Panel title="Condition" action={form && <StarRating value={form.stars} />}>
      {health && (
        <div
          className={`mb-3 rounded-md px-3 py-2 text-sm ring-1 ${HEALTH_META[health.state]?.cls ?? ''}`}
        >
          <span className="font-semibold">{HEALTH_META[health.state]?.label ?? health.state}</span>
          {daysLeft != null &&
            daysLeft > 0 &&
            (health.state === 'enfermo' || health.state === 'lesionado') && (
              <span className="ml-1 tabular-nums">
                — ~{daysLeft} day{daysLeft === 1 ? '' : 's'} to go
              </span>
            )}
          <span className="ml-2 opacity-80">{HEALTH_META[health.state]?.note}</span>
        </div>
      )}

      {form && (
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Freshness — race readiness</span>
            <span className="tabular-nums">{Math.round(form.freshness)} / 100</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${form.freshness}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            How rested you are today. High = fresh and race-ready; low = fatigued from hard
            training. Easing off before a goal raises it: peaking is high fitness with high
            freshness.
          </p>
        </div>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Fitness (CTL)', value: last ? Math.round(last.ctl) : '—' },
          { label: 'Fatigue (ATL)', value: last ? Math.round(last.atl) : '—' },
          { label: 'Matches', value: matches ?? '—' },
          {
            label: 'Morale',
            value: summaryQuery.data ? `${Math.round(summaryQuery.data.morale)}%` : '—',
          },
        ].map((s) => (
          <div key={s.label} className="rounded-md bg-slate-50 p-2.5">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {s.label}
            </dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums text-slate-800">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4">
        <FormChart points={log} />
      </div>
    </Panel>
  )
}

/** Objetivos de temporada del corredor: qué carreras ha pedido y si le convocaron. Solo mío. */
function OwnerObjectives() {
  const { data } = useQuery({ queryKey: ['rider', 'race-prefs'], queryFn: fetchRacePrefs })
  const wanted = (data ?? []).filter((r) => r.wanted)
  if (wanted.length === 0) return null
  return (
    <Panel title="Season objectives">
      <ul className="divide-y divide-slate-100">
        {wanted.map((r) => (
          <li key={r.raceId} className="flex items-center justify-between gap-3 py-2 text-sm">
            <Link
              to={`/races/${r.raceId}`}
              className="font-medium text-slate-700 hover:text-brand-cyan hover:underline"
            >
              {r.name}
            </Link>
            <span className="shrink-0 text-xs text-slate-500">
              {r.callup === 'selected'
                ? 'Selected'
                : r.callup === 'not-selected'
                  ? 'Not selected'
                  : `GD ${r.startDay}`}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/**
 * Ficha del corredor (navegación §3.6): UNA página con dos modos. Sin `:id` en la URL es mi
 * corredor (`/me/profile`); con `:id` es la ficha pública de cualquiera (`/world/riders/:id`), que
 * también entra en modo propietario si resulta ser el mío. Todo lo privado —frescura, fatiga,
 * gráfica de forma, cerillos, moral, objetivos— vive en componentes que solo se montan si es mío,
 * de modo que la vista pública ni siquiera pide esos datos al servidor.
 */
export function RiderProfile() {
  const { id: routeId } = useParams()
  // Mi corredor: hace falta para saber si el `:id` de la URL soy yo. Sin sesión devuelve null.
  const mine = useQuery({ queryKey: ['rider', 'me'], queryFn: fetchMyRider })
  const riderId = routeId ?? mine.data?.id ?? null
  const owner = riderId != null && mine.data?.id === riderId

  const riderQuery = useQuery({
    queryKey: ['public-rider', riderId],
    queryFn: () => fetchPublicRider(riderId!),
    enabled: !!riderId,
  })
  const palmaresQuery = useQuery({
    queryKey: ['public-rider', riderId, 'palmares'],
    queryFn: () => fetchRiderPalmares(riderId!),
    enabled: !!riderId,
  })
  const resultsQuery = useQuery({
    queryKey: ['public-rider', riderId, 'results'],
    queryFn: () => fetchRiderResults(riderId!),
    enabled: !!riderId,
  })

  // Sin `:id` y sin corredor propio: el jugador aún no ha creado el suyo.
  if (!routeId && mine.isPending) return <p className="text-slate-500">Loading…</p>
  if (!routeId && !mine.data) {
    return (
      <section className="mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight">No rider yet</h1>
        <p className="text-slate-600">Create your rider to enter the world.</p>
        <Link
          to="/create"
          className="inline-block rounded-md bg-brand-cyan px-4 py-2.5 font-medium text-white transition hover:bg-brand-cyan-light"
        >
          Create your rider
        </Link>
      </section>
    )
  }

  if (riderQuery.isPending) return <p className="text-slate-500">Loading…</p>
  if (riderQuery.isError || !riderQuery.data)
    return <p className="text-red-600">Could not load the rider.</p>

  const rider = riderQuery.data
  const attributes = Object.fromEntries(
    ATTRIBUTES.map((a) => [a, rider.attributes[a] ?? 0]),
  ) as Record<Attribute, number>

  return (
    <section className="space-y-4">
      <SectionBar>{rider.name}</SectionBar>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Rider" className="lg:col-span-2">
          <Identity rider={rider} />
          <InfoRow label="Age">
            {rider.age} · born day {birthdayDayOfSeason(rider.id)} of the season
          </InfoRow>
          <InfoRow label="Team">
            <TeamLink teamId={rider.teamId} name={rider.teamName} fallback="Free agent" />
          </InfoRow>
          <InfoRow label="Role">
            {owner ? (
              <RoleEditor current={rider.archetype as Vocation} />
            ) : (
              (VOCATION_LABELS[rider.archetype as Vocation] ?? rider.archetype)
            )}
          </InfoRow>
          {rider.fieldSize > 0 && (
            <InfoRow label="Season rank">
              #{rider.seasonRank.toLocaleString('en-US')} of{' '}
              {rider.fieldSize.toLocaleString('en-US')}
            </InfoRow>
          )}
        </Panel>

        <Panel title="Season" bodyClassName="p-0">
          <dl>
            {[
              { label: 'Season points', value: rider.seasonPoints.toLocaleString('en-US') },
              { label: 'Fame', value: String(Math.round(rider.fame)) },
            ].map((s, i) => (
              <div
                key={s.label}
                className={`flex items-baseline justify-between px-4 py-2 ${
                  i % 2 === 0 ? 'bg-slate-50' : ''
                }`}
              >
                <dt className="text-sm font-semibold text-slate-600">{s.label}</dt>
                <dd className="text-sm font-bold tabular-nums text-slate-800">{s.value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <Badges riderId={rider.id} />

      {owner && <OwnerCondition attributes={attributes} />}

      <Panel title="Attributes">
        <p className="mb-1 text-xs text-slate-400">Tap an attribute to see what it does.</p>
        <AttributeList attributes={attributes} />
      </Panel>

      {palmaresQuery.data && palmaresQuery.data.length > 0 && (
        <Panel title="Palmarès">
          <ul className="space-y-1.5">
            {palmaresQuery.data.map((p, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="w-20 shrink-0 text-slate-400">Season {p.season + 1}</span>
                <span className="font-medium text-slate-700">{p.raceName}</span>
                <span className="text-slate-500">
                  {palmaresLabel(p.kind)}
                  {p.detail && ` · ${p.detail}`}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {resultsQuery.data && resultsQuery.data.length > 0 && (
        <Panel title="Recent results">
          <ul className="space-y-1.5">
            {resultsQuery.data.map((r, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span
                  className={`w-8 shrink-0 text-right font-bold tabular-nums ${
                    r.puesto === 1
                      ? 'text-amber-500'
                      : r.puesto <= 3
                        ? 'text-slate-600'
                        : 'text-slate-400'
                  }`}
                >
                  {r.puesto}
                </span>
                <Link
                  to={r.isOneDay ? `/races/${r.raceId}` : `/races/${r.raceId}/stages/${r.stageDay}`}
                  className="font-medium text-slate-700 hover:underline"
                >
                  {r.raceName}
                </Link>
                {!r.isOneDay && <span className="text-xs text-slate-400">Stage {r.stageDay}</span>}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {owner && <OwnerObjectives />}
      {owner && <LastRaceReport />}
    </section>
  )
}
