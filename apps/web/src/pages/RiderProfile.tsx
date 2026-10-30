import {
  COUNTRIES,
  type FormResponse,
  VOCATIONS,
  birthdayDayOfSeason,
  raceIdFromKey,
  seasonPosition,
  stageRouteText,
} from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { type PublicRiderDetail, fetchPublicRider } from '../api/browse'
import { fetchForm } from '../api/form'
import { fetchHealth } from '../api/health'
import { fetchRacePrefs } from '../api/objectives'
import { fetchRiderPalmares, fetchRiderResults } from '../api/rankings'
import { fetchMyRider, fetchRiderSummary } from '../api/rider'
import { type CoachNote, fetchCoachView, fetchTrend } from '../api/sheet'
import { AttributeList, type AttributeDetail } from '../components/AttributeList'
import { Badges } from '../components/Badges'
import { BlockReport } from '../components/BlockReport'
import { LastRaceReport } from '../components/LastRaceReport'
import { RaceEffortLog } from '../components/RaceEffortLog'
import { RaceResultsTable } from '../components/RaceResultsTable'
import { RoleEditor } from '../components/RoleEditor'
import { useTeamsIdentity } from '../components/useTableIdentity'
import { VeilNotice } from '../components/VeilNotice'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { Disclosure } from '../components/ui/Disclosure'
import { EmptyState } from '../components/ui/EmptyState'
import { Flag } from '../components/ui/Flag'
import { FormChart } from '../components/ui/FormChart'
import { InfoButton } from '../components/ui/InfoButton'
import { Meter } from '../components/ui/Meter'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { QueryView } from '../components/ui/QueryView'
import { RIDER_NOT_FOUND, RiderHeader } from '../components/ui/RiderHeader'
import { Stat } from '../components/ui/Stat'
import { StarRating } from '../components/ui/StarRating'
import { TextLink } from '../components/ui/TextLink'
import { conditionLabel, conditionLevel } from '../domain/condition'
import { HEALTH_LOOK, healthChip, healthNote, healthTone, healthUntilLabel } from '../domain/health'
import { archetypeLabel, palmaresLabel } from '../domain/labels'
import { rowTeam } from '../domain/tableIdentity'
import { formatGameDay } from '../domain/words'
import { horizonKey, useHorizonRev } from '../queryClient'

/**
 * LA FICHA DEL CORREDOR CON EL SISTEMA (E3, docs/visual.md §4.6 y §17.21, la cola larga; PR 21h). Una
 * composición fija, en este orden: (1) `RiderHeader`, la bandera, el nombre y el maillot que lleva, que abre
 * su hoja, con su `Chip` de jugador, el de su salud si no está sano y su papel; (2) en la propia, `Condition`,
 * la respuesta (§7.3): la forma, el fondo y la frescura en su `Meter`, los cerillos en uno de cinco, la salud,
 * la moral, `FormChart` y `Where the energy went`; (3) `Attributes`, la respuesta en la ajena, con (4) la frase
 * del entrenador a la vista junto al de techo más alto; (5) `Season objectives` y `Season`; (6) el palmarés, los
 * logros y los resultados en `RankTable`. Detrás, los datos de `Rider` y, en la propia, los dos informes. La
 * ajena es la misma sin lo privado (`docs/navegacion.md` §3.6).
 */

/**
 * LAS FRASES POR REGLA (docs/entrenamiento.md §2.3). El servidor manda códigos y el texto vive aquí,
 * que es donde vive el inglés de la UI. Ninguna dice un número: todas dicen algo que el jugador
 * puede USAR, que es la diferencia entre informar y decorar.
 */
const COACH_NOTE_TEXT: Record<CoachNote, string> = {
  progresa_rapido: "You're coming on faster than I expected at your age.",
  recupera_rapido: 'You recover quickly — you can taper shorter than most.',
  fragil: 'You tend to fall ill when you load up. Careful with the hard weeks.',
  declive: "Now it's about defending what you have, and keeping on learning the trade.",
  techo_cerca: "You're close to what you can give here. The room is somewhere else.",
}

/** La palabra de una barra de 0 a 100, en minúscula tras los dos puntos (§4.6): `Fitness: good`. */
const palabra = (v: number): string => conditionLabel(v).toLowerCase()

/** Un medidor con su porqué al lado, que parte de línea si no cabe (§4.3). */
function ConPorque({ children, about, why }: { children: ReactNode; about: string; why: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1">
      {children}
      <InfoButton label={about}>{why}</InfoButton>
    </div>
  )
}

/** Lo que dice la condición, con `/form` ya en la mano. */
function Condicion({
  data,
  morale,
  gameDay,
}: {
  readonly data: FormResponse
  readonly morale: number | null
  readonly gameDay: number | null
}) {
  const { form, health, log } = data
  const last = log[log.length - 1] ?? null
  const until = healthUntilLabel(health, gameDay)
  return (
    <div className="grid gap-4">
      {form && (
        <p className="flex items-center gap-2 text-row font-semibold text-ink">
          Form
          <StarRating value={form.stars} size={20} />
        </p>
      )}

      {/*
        Las DOS magnitudes que ve el jugador, ambas 0-100 y acotadas por el motor: el fondo que ha construido y
        lo descansado que está hoy, en su `Meter` con la palabra y nunca la cifra (§4.8). La fatiga no necesita
        número propio: la frescura ES su cara legible (MVP.md Paso 20).
      */}
      {last && (
        <div className="grid gap-1">
          <ConPorque
            about="About fitness"
            why="Your training base: the condition you have built up over the past weeks. It grows with steady work and fades with rest."
          >
            <Meter
              label="Fitness"
              value={conditionLevel(last.fitness)}
              valueText={palabra(last.fitness)}
            />
          </ConPorque>
          <ConPorque
            about="About freshness"
            why="Your race readiness: how rested you are today. High = fresh and race-ready; low = fatigued from hard training. Easing off before a goal raises it: peaking is high fitness with high freshness."
          >
            <Meter
              label="Freshness"
              value={conditionLevel(last.freshness)}
              valueText={palabra(last.freshness)}
            />
          </ConPorque>
          {/* los cerillos del día, de 2 a 5 (SPEC §6.6), uno a uno en un `Meter` de cinco (decisión 4-c) */}
          <ConPorque
            about="About matches"
            why="Hard efforts you can make today. Every attack, chase or surge burns one. With none left you can still ride, but you cannot answer a move. Racing tired costs you one before the start."
          >
            <Meter label="Matches" value={form?.matches ?? null} steps={5} />
          </ConPorque>
        </div>
      )}

      {health && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Chip tone={healthTone(health.state)}>{HEALTH_LOOK[health.state].label}</Chip>
          <span className="text-meta text-ink-2">
            {until !== null && `${until}. `}
            {healthNote(health.state, last?.freshness ?? null)}
          </span>
        </p>
      )}

      {morale !== null && (
        // en medias estrellas (DD-12, §13.7), en su `dl`, como en la portada
        <dl className="grid gap-1">
          <dt className="text-caption font-semibold tracking-caps text-ink-3 uppercase">Morale</dt>
          <dd className="flex min-h-10 items-center">
            <StarRating value={morale} size={20} />
          </dd>
        </dl>
      )}

      <FormChart points={log} />

      {/*
        …Y EN QUÉ SE FUE ESA FORMA. La gráfica dice CUÁNTO se gastó y esto dice EN QUÉ: es la pregunta del dueño
        («me gustaría entender un poco mejor en qué se gastó la energía»), que la crónica no puede contestar
        porque solo narra lo que es noticia. Plegado, debajo (§4.6).
      */}
      <Disclosure showLabel="Where the energy went" hideLabel="Hide where the energy went">
        <div className="px-3">
          <RaceEffortLog points={log} />
        </div>
      </Disclosure>
    </div>
  )
}

/**
 * Bloque privado: forma, frescura, salud, cerillos y moral. Solo se monta si el perfil es MÍO, así que sus
 * consultas (`/api/riders/me/...`) no se disparan nunca en la vista pública. Es la respuesta de la propia, y
 * contesta también mientras llega `/form`, con su espera (§7.3).
 */
function OwnerCondition() {
  const rev = useHorizonRev()
  const formQuery = useQuery({
    queryKey: horizonKey(['rider', 'form'], rev),
    queryFn: fetchForm,
    enabled: rev !== undefined,
  })
  const summaryQuery = useQuery({
    queryKey: horizonKey(['rider', 'summary'], rev),
    queryFn: fetchRiderSummary,
    enabled: rev !== undefined,
  })
  const healthQuery = useQuery({ queryKey: ['health'], queryFn: fetchHealth })
  return (
    <Panel title="Condition" answer>
      <QueryView query={formQuery} label="your condition" skeleton={{ kind: 'panel' }}>
        {(data) => (
          <Condicion
            data={data}
            morale={summaryQuery.data?.moraleStars ?? null}
            gameDay={healthQuery.data?.gameDay ?? null}
          />
        )}
      </QueryView>
    </Panel>
  )
}

/**
 * Objetivos de temporada del corredor: qué carreras ha pedido y si le convocaron, con su `Chip`, o el día en que
 * empiezan, `Day 205`, y nunca `GD` (§4.10). Solo mío.
 */
function OwnerObjectives() {
  const rev = useHorizonRev()
  const { data } = useQuery({
    queryKey: horizonKey(['rider', 'race-prefs'], rev),
    queryFn: fetchRacePrefs,
    enabled: rev !== undefined,
  })
  const clock = useQuery({ queryKey: ['health'], queryFn: fetchHealth })
  const hoy = clock.data?.gameDay ? seasonPosition(clock.data.gameDay).dayOfSeason : null
  const wanted = (data ?? []).filter((r) => r.wanted)
  if (wanted.length === 0) return null
  return (
    <Panel title="Season objectives">
      <ul className="divide-y divide-line">
        {wanted.map((r) => (
          <li key={r.raceId} className="flex min-h-11 items-center justify-between gap-3">
            <TextLink to={`/world/races/${raceIdFromKey(r.raceId)}`}>{r.name}</TextLink>
            {r.callup === 'selected' ? (
              <Chip tone="good">Selected</Chip>
            ) : r.callup === 'not-selected' ? (
              <Chip tone="neutral">Not selected</Chip>
            ) : (
              <span className="shrink-0 text-meta text-ink-2">
                {formatGameDay(seasonPosition(r.startDay).dayOfSeason, hoy)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/** Una fila de los datos del corredor, de 44 (§4.5). */
function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 border-b border-line py-1 last:border-0">
      <dt className="text-meta font-semibold text-ink-2">{label}</dt>
      <dd className="flex flex-wrap items-center gap-2 text-right text-row text-ink">{children}</dd>
    </div>
  )
}

/** Los datos del corredor, detrás de lo demás (§4.6): la edad, de dónde es, dónde vive, el equipo, el papel. */
function RiderFacts({
  rider,
  owner,
  declining,
}: {
  readonly rider: PublicRiderDetail
  readonly owner: boolean
  readonly declining: boolean
}) {
  const country = COUNTRIES.find((c) => c.code === rider.country)
  const abroad = rider.residence !== '' && rider.residence !== rider.country
  const residence = COUNTRIES.find((c) => c.code === rider.residence)
  const vocation = VOCATIONS.find((v) => v === rider.archetype)
  return (
    <Panel title="Rider">
      <dl className="grid">
        <Dato label="Age">
          {`${rider.age} · born day ${birthdayDayOfSeason(rider.id)} of the season`}
          {declining && <Chip tone="warn">Declining</Chip>}
        </Dato>
        <Dato label="Nation">
          <Flag country={rider.country} height={16} />
          <TextLink to={`/world/nations/${rider.country}`}>{country?.name ?? rider.country}</TextLink>
        </Dato>
        {abroad && (
          <Dato label="Lives in">
            <Flag country={rider.residence} height={16} />
            {residence?.name ?? rider.residence}
          </Dato>
        )}
        <Dato label="Team">
          {rider.teamId !== null && rider.teamName !== null ? (
            <TextLink to={`/world/teams/${rider.teamId}`}>{rider.teamName}</TextLink>
          ) : (
            'Free agent'
          )}
        </Dato>
        <Dato label="Role">
          {owner && vocation !== undefined ? (
            <RoleEditor current={vocation} />
          ) : (
            archetypeLabel(rider.archetype)
          )}
        </Dato>
        {rider.fieldSize > 0 && (
          <Dato label="Season rank">
            {`#${rider.seasonRank.toLocaleString('en-US')} of ${rider.fieldSize.toLocaleString('en-US')}`}
          </Dato>
        )}
      </dl>
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
  const rev = useHorizonRev()
  const mine = useQuery({
    queryKey: horizonKey(['rider', 'me'], rev),
    queryFn: fetchMyRider,
    enabled: rev !== undefined,
  })
  const riderId = routeId ?? mine.data?.id ?? null
  const owner = riderId != null && mine.data?.id === riderId

  const riderQuery = useQuery({
    queryKey: horizonKey(['public-rider', riderId], rev),
    queryFn: () => fetchPublicRider(riderId!),
    enabled: !!riderId && rev !== undefined,
  })
  const palmaresQuery = useQuery({
    queryKey: horizonKey(['public-rider', riderId, 'palmares'], rev),
    queryFn: () => fetchRiderPalmares(riderId!),
    enabled: !!riderId && rev !== undefined,
  })
  const resultsQuery = useQuery({
    queryKey: horizonKey(['public-rider', riderId, 'results'], rev),
    queryFn: () => fetchRiderResults(riderId!),
    enabled: !!riderId && rev !== undefined,
  })
  // El día de juego actual, para decir hasta cuándo dura una baja. Es la misma consulta pública que
  // ya hace la cabecera (misma clave ⇒ misma caché), así que no añade tráfico.
  const clock = useQuery({ queryKey: ['health'], queryFn: fetchHealth })
  // El maillot de su equipo, el de mañana, de `GET /api/teams` (17-q): mientras llega, su hueco.
  const teams = useTeamsIdentity()

  /**
   * LA CAPA QUE SOLO TIENE LA FICHA PROPIA (docs/entrenamiento.md §2.3): la marca de progreso, la
   * flecha de 28 días y la opinión del entrenador. Las dos consultas van con `enabled: owner`, así
   * que **el perfil de otro ni siquiera las pide**: no es que la UI las esconda, es que el dato no
   * sale del servidor. Fisgonear el potencial de otro es una función de ojeo que todavía no existe.
   */
  const trendQuery = useQuery({
    queryKey: horizonKey(['rider-trend'], rev),
    queryFn: fetchTrend,
    enabled: owner && rev !== undefined,
  })
  const coachQuery = useQuery({
    queryKey: ['coach-view'],
    queryFn: fetchCoachView,
    enabled: owner,
  })

  // Los estados, con `QueryView` (E3, PR 10), que contestan (§7.3). Sin `:id` y sin corredor propio, el
  // jugador aún no ha creado el suyo; y un fallo de `mine` ya no se pinta como «no tienes corredor».
  if (!routeId && mine.data === undefined)
    return <QueryView query={mine} label="your rider" skeleton={{ kind: 'header' }} answer />
  if (!routeId && mine.data === null) {
    return (
      <section className="mx-auto grid max-w-md gap-4">
        <PageHeader title="No rider yet" />
        <EmptyState
          icon="rider"
          text="Create your rider to enter the world."
          action={
            <Button to="/create" variant="primary">
              Create your rider
            </Button>
          }
          answer
        />
      </section>
    )
  }

  // Un corredor que no existe dice que no existe: la respuesta de la pantalla 47.
  if (riderQuery.data === undefined)
    return (
      <QueryView
        query={riderQuery}
        label="the rider"
        notFound={RIDER_NOT_FOUND}
        skeleton={{ kind: 'header' }}
        answer
      />
    )

  const rider = riderQuery.data
  // Las estrellas de cualquiera son las de su ficha pública; las del propio, con su marca, las de
  // `GET /api/riders/me`, que solo se le mandan a él (E3, §13.5; 19b).
  const attributes = owner && mine.data ? mine.data.attributes : rider.attributes

  const coach = coachQuery.data ?? null
  const detail: AttributeDetail = {
    trend: Object.fromEntries((trendQuery.data ?? []).map((t) => [t.attr, t.arrow])),
    opinion: Object.fromEntries((coach?.ceilings ?? []).map((c) => [c.attr, c.opinion])),
  }
  const notes = coach?.notes ?? []
  const declining = owner && (coach?.declining ?? false)
  const gameDay = clock.data?.gameDay ?? null
  const palmares = palmaresQuery.data ?? []
  const results = resultsQuery.data ?? []

  return (
    <section className="grid gap-4">
      <RiderHeader
        rider={{ id: rider.id, name: rider.name, human: !rider.isBot, country: rider.country }}
        team={rowTeam(rider.teamId, rider.teamName, teams) ?? null}
        champion={rider.champion}
        player={!rider.isBot}
        health={healthChip(rider.health, gameDay)}
        role={archetypeLabel(rider.archetype)}
      />
      <VeilNotice kind="results" />

      {owner && <OwnerCondition />}

      <Panel title="Attributes" answer={!owner}>
        <div className="grid gap-3">
          {owner ? (
            <AttributeList attributes={attributes} detail={detail} />
          ) : (
            <AttributeList attributes={attributes} />
          )}
          {owner && notes.length > 0 && (
            <ul className="grid gap-1 border-t border-line pt-3">
              {notes.map((note) => (
                <li key={note} className="text-meta text-ink-2">
                  “{COACH_NOTE_TEXT[note]}”
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      {owner && <OwnerObjectives />}

      <Panel title="Season">
        <Stat label="Season points" value={rider.seasonPoints} />
      </Panel>

      {palmares.length > 0 && (
        <Panel title="Palmarès">
          <ul className="divide-y divide-line">
            {palmares.map((p, i) => {
              // una victoria de etapa dice también de dónde a dónde fue
              const route = stageRouteText(p.from, p.to)
              return (
                <li key={i} className="grid gap-0.5 py-2">
                  <p className="text-row text-ink">
                    <span className="font-semibold">{p.raceName}</span>
                    {` · ${palmaresLabel(p.kind)}`}
                    {p.detail && ` · ${p.detail}`}
                  </p>
                  <p className="text-meta text-ink-2">
                    {`Season ${p.season + 1}`}
                    {route !== null && ` · ${route}`}
                  </p>
                </li>
              )
            })}
          </ul>
        </Panel>
      )}

      <Badges riderId={rider.id} />

      {/*
        Una línea por CARRERA con su general de titular (§3.6): en una vuelta el resultado del corredor es la
        general, y las etapas son el desglose que se despliega debajo. En la `RankTable` de `My races` (§6.1).
      */}
      {results.length > 0 && (
        <Panel title="Recent results" variant="bleed">
          <RaceResultsTable
            results={results}
            caption={`${rider.name}'s races, most recent first: the overall place and the stages behind it`}
          />
        </Panel>
      )}

      <RiderFacts rider={rider} owner={owner} declining={declining} />

      {owner && <BlockReport />}
      {owner && <LastRaceReport />}
    </section>
  )
}
