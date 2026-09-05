import {
  ATTRIBUTES,
  COUNTRIES,
  VOCATION_LABELS,
  type Attribute,
  type Vocation,
  birthdayDayOfSeason,
  raceIdFromKey,
} from '@cyclingstar/shared'
import { type Eff, eff0, matchCount, maxMatchCount } from '@cyclingstar/engine'
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
import { RaceEffortLog } from '../components/RaceEffortLog'
import { LastRaceReport } from '../components/LastRaceReport'
import { InfoRow, Panel, SectionBar } from '../components/Panel'
import { RaceResultList } from '../components/RaceResults'
import { RoleEditor } from '../components/RoleEditor'
import { StarRating } from '../components/StarRating'
import { TeamLink } from '../components/TeamLink'
import { conditionBars, conditionLabel } from '../domain/condition'
import { HEALTH_LOOK, healthNote, healthUntilLabel } from '../domain/health'
import { palmaresLabel } from '../domain/labels'

/**
 * Cabecera de identidad: lo mismo para todo el mundo, con o sin sesión. La salud va aquí, junto al
 * nombre, porque es pública (§3.6): una insignia sobria basta para distinguir los cuatro estados y,
 * si hay baja, decir hasta cuándo.
 */
function Identity({ rider, gameDay }: { rider: PublicRiderDetail; gameDay: number | null }) {
  const country = COUNTRIES.find((c) => c.code === rider.country)
  const abroad = rider.residence && rider.residence !== rider.country
  const residence = COUNTRIES.find((c) => c.code === rider.residence)
  const look = HEALTH_LOOK[rider.health.state]
  const until = healthUntilLabel(rider.health, gameDay)
  return (
    <div className="mb-3 flex items-center gap-3">
      <Flag code={rider.country} size={34} />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight">
          {rider.name}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              rider.isBot ? 'bg-slate-100 text-slate-500' : 'bg-cyan-50 text-brand-cyan'
            }`}
          >
            {rider.isBot ? 'NPC' : 'Player'}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${look.cls}`}
            title={look.note}
          >
            {look.label}
            {until && <span className="ml-1 font-normal opacity-80">· {until}</span>}
          </span>
        </p>
        <p className="text-sm text-slate-500">
          {VOCATION_LABELS[rider.archetype as Vocation] ?? rider.archetype}
          {' · '}
          <Link
            to={`/world/nations/${rider.country}`}
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
 * Una magnitud de condición en barra 0-100, con su etiqueta cualitativa. Se pinta la palabra
 * ("Good", "Low") y no el número interno del modelo: el jugador no maneja unidades de carga.
 */
function ConditionBar({
  label,
  hint,
  value,
  color,
}: {
  label: string
  hint: string
  value: number
  color: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span className="font-semibold text-slate-700">{conditionLabel(value)}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
    </div>
  )
}

/**
 * LOS CERILLOS DEL DÍA, con su escala a la vista (SPEC 6.6).
 *
 * Era una casilla pelada con un número dentro —«Matches / 1»— al lado de dos barras que sí se
 * explican, y el dueño la mandó a paseo con razón: «eso no aporta, ni se entiende». No lo hacía
 * porque un cerillo suelto no significa nada: **«1» solo se entiende si sabes que el máximo es 5**,
 * y ahí lo que estaba diciendo la casilla es que ese día sales al suelo de la escala, que es
 * justamente lo que más importa saber antes de una carrera.
 *
 * Así que se cuenta como las de al lado: escala visible (`n de N`, con el techo que da el motor),
 * los cerillos dibujados uno a uno, y una línea que dice para qué sirven y qué te los quita.
 */
function MatchRow({ value, max }: { value: number | null; max: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Matches — hard efforts you can make today</span>
        <span className="font-semibold text-slate-700 tabular-nums">
          {value == null ? '—' : `${value} of ${max}`}
        </span>
      </div>
      <div className="mt-1 flex gap-1" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={`h-2 flex-1 rounded-full ${
              value != null && i < value ? 'bg-amber-500' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        Every attack, chase or surge burns one. With none left you can still ride, but you cannot
        answer a move. Racing tired costs you one before the start.
      </p>
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
  const until = healthUntilLabel(health, gameDay)
  // Fondo y frescura del último día del diario, ya traducidos a 0-100 (domain/condition.ts).
  const bars = last ? conditionBars(last) : null

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
          className={`mb-3 rounded-md px-3 py-2 text-sm ring-1 ${HEALTH_LOOK[health.state].cls}`}
        >
          <span className="font-semibold">{HEALTH_LOOK[health.state].label}</span>
          {until && <span className="ml-1 tabular-nums">— {until}</span>}
          <span className="ml-2 opacity-80">
            {healthNote(health.state, bars?.freshness ?? null)}
          </span>
        </div>
      )}

      {/*
        Las DOS magnitudes que ve el jugador, ambas 0-100 y acotadas por el motor: el fondo que ha
        construido y lo descansado que está hoy. Antes aquí abajo había una rejilla con «Fitness
        (CTL)» y «Fatigue (ATL)» en crudo —carga acumulada del Banister, sin escala— y el dueño
        llegaba a leer «fatiga 118». La fatiga no necesita número propio: la frescura ES su cara
        legible (MVP.md Paso 20: forma en estrellas y frescura en barra, nunca números internos).
      */}
      {bars && (
        <div className="space-y-3">
          <ConditionBar
            label="Fitness — training base"
            hint="The condition you have built up over the past weeks. It grows with steady work and fades with rest."
            value={bars.fitness}
            color="bg-indigo-500"
          />
          <ConditionBar
            label="Freshness — race readiness"
            hint="How rested you are today. High = fresh and race-ready; low = fatigued from hard training. Easing off before a goal raises it: peaking is high fitness with high freshness."
            value={bars.freshness}
            color="bg-emerald-500"
          />
        </div>
      )}

      {/* Los cerillos van CON las barras: las tres dicen con qué sales hoy, y las tres se explican. */}
      <div className="mt-3">
        <MatchRow value={matches} max={maxMatchCount()} />
      </div>

      <dl className="mt-4">
        <div className="rounded-md bg-slate-50 p-2.5">
          <dt className="text-xs font-medium tracking-wide text-slate-400 uppercase">Morale</dt>
          <dd className="mt-0.5 text-sm font-bold text-slate-800 tabular-nums">
            {summaryQuery.data ? `${Math.round(summaryQuery.data.morale)}%` : '—'}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <FormChart points={log} />
      </div>

      {/*
        …Y EN QUÉ SE FUE ESA FORMA. La gráfica dice CUÁNTO se gastó y esto dice EN QUÉ: es la
        pregunta del dueño («me gustaría entender un poco mejor en qué se gastó la energía»), que la
        crónica no puede contestar porque solo narra lo que es noticia.
      */}
      <div className="mt-6">
        <h3 className="mb-1 text-xs font-medium tracking-wide text-slate-400 uppercase">
          Where the energy went
        </h3>
        <RaceEffortLog points={log} />
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
              to={`/world/races/${raceIdFromKey(r.raceId)}`}
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
  // El día de juego actual, para decir hasta cuándo dura una baja. Es la misma consulta pública que
  // ya hace la cabecera (misma clave ⇒ misma caché), así que no añade tráfico.
  const clock = useQuery({ queryKey: ['health'], queryFn: fetchHealth })

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
          <Identity rider={rider} gameDay={clock.data?.gameDay ?? null} />
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

      {/*
        Una línea por CARRERA con su general de titular (§3.6): en una vuelta el resultado del
        corredor es la general, y las etapas son el desglose que se despliega debajo.
      */}
      {resultsQuery.data && resultsQuery.data.length > 0 && (
        <Panel title="Recent results">
          <RaceResultList results={resultsQuery.data} />
        </Panel>
      )}

      {owner && <OwnerObjectives />}
      {owner && <LastRaceReport />}
    </section>
  )
}
