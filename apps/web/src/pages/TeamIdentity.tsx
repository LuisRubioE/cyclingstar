import {
  type BibStyle,
  COUNTRIES,
  type Kit as KitData,
  kitCode,
  parseKit,
} from '@cyclingstar/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useEffect, useState } from 'react'
import {
  type TeamDetail,
  fetchTeam,
  fetchTeamControl,
  fetchTeamNews,
  fetchTeams,
  updateMyTeam,
} from '../api/browse'
import { type TeamKitResponse, checkMyKit, fetchMyKit, saveMyKit } from '../api/kit'
import { ApiError } from '../api/request'
import { fetchRiderSummary } from '../api/rider'
import { TeamFeed } from '../components/TeamFeed'
import { TeamManager, teamEditError } from '../components/TeamManager'
import { ActionBar, type ActionBarStatus } from '../components/ui/ActionBar'
import { Button } from '../components/ui/Button'
import { Disclosure } from '../components/ui/Disclosure'
import { EmptyState } from '../components/ui/EmptyState'
import { Flag } from '../components/ui/Flag'
import { Kit } from '../components/ui/Kit'
import { KitPicker } from '../components/ui/KitPicker'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { QueryView } from '../components/ui/QueryView'
import { TextLink } from '../components/ui/TextLink'
import {
  type CheckState,
  type KitDraft,
  bibFor,
  draftCode,
  draftKit,
  draftOf,
  kitConsequence,
  lockedText,
  pickerState,
  saveFailure,
  saveIdentity,
  saveSummary,
  scheduledText,
  verdictLine,
} from '../domain/kitPicker'
import { archetypeLabel, bibWords } from '../domain/labels'
import { useOnline } from '../net'
import { horizonKey, useHealth, useHorizonRev } from '../queryClient'

/**
 * `My Team → Identity` (docs/navegacion.md §3.4): quién es mi equipo — maillot, país, división,
 * filosofía e historia reciente.
 *
 * La "filosofía" no es un texto inventado guardado en ninguna parte: se DEDUCE de la plantilla
 * (edad media, cuánta cantera hay y qué especialidad domina). Así siempre dice la verdad sobre el
 * equipo que hay hoy, y cambia cuando cambia la plantilla.
 *
 * El orden de la página (E3, docs/visual.md §8.7; PR 18b, 8-u): el `PageHeader` con la división en su
 * línea de estado; el maillot, que es la respuesta (`KitPicker`, el editor para el dueño y la vista para
 * los demás); el nombre y el país; `The team` y `History`, como antes; y los rivales plegados. El dueño
 * guarda todo con una sola `ActionBar` (8-h): primero el nombre y el país, después el maillot.
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
    label: archetypeLabel(best.archetype),
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

/** El veredicto se pide a los 300 ms del último toque (§8.7). */
const CHECK_DELAY_MS = 300

/** El valor, cuando lleva `ms` sin cambiar. */
function useSettled<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return settled
}

const countryName = (code: string): string => COUNTRIES.find((c) => c.code === code)?.name ?? code

/** El maillot del que parte el editor: el programado o, sin él, el de hoy. */
const startKit = (k: TeamKitResponse): KitData | null => {
  const code = k.pending?.kit ?? k.current
  return code === null ? null : parseKit(code)
}

/** Sin maillot todavía (antes de la traducción del 17b), el editor parte de uno liso. */
const PLAIN_DRAFT: KitDraft = { figure: 'plain', base: 'navy', secondary: 'white' }

/**
 * El dueño: el editor, el nombre y el país, lo que va en medio y los rivales, con un solo guardado (8-h).
 * El borrador, el culote, el nombre y el país viven aquí, y no en sus piezas, porque los guarda la misma
 * `ActionBar`.
 */
function OwnerIdentity({
  team,
  kit,
  today,
  children,
}: {
  readonly team: TeamDetail
  readonly kit: TeamKitResponse
  /** el día de juego de hoy, de `/health`; null mientras no llega */
  readonly today: number | null
  /** `The team` y `History`, entre los campos y los rivales */
  readonly children: ReactNode
}) {
  const queryClient = useQueryClient()
  const online = useOnline()
  const [draft, setDraft] = useState<KitDraft | null>(null)
  const [bibChoice, setBibChoice] = useState<BibStyle | null>(null)
  const [name, setName] = useState<string | null>(null)
  const [country, setCountry] = useState<string | null>(null)
  const [save, setSave] = useState<ActionBarStatus>('idle')
  const [editError, setEditError] = useState<string | null>(null)

  const saved = startKit(kit)
  const lockedReason =
    kit.changesLeft === 0 && kit.nextChangeDay !== null ? lockedText(kit.nextChangeDay) : null
  // Ya cambiado esta temporada, el maillot no se mueve (D-00k): el borrador es el guardado.
  const start = saved === null ? PLAIN_DRAFT : draftOf(saved)
  const d = draft !== null && lockedReason === null ? draft : start
  const dKit = draftKit(d)
  const code = draftCode(d)
  const bib = bibFor(dKit, bibChoice ?? kit.bib)
  const kitChanged = saved === null || code !== kitCode(saved)
  const bibChanged = bib !== kit.bib
  const homeCountry = team.country ?? 'ES'
  const nameNow = name ?? team.name
  const countryNow = country ?? homeCountry
  const nameChanged = nameNow.trim() !== team.name
  const countryChanged = countryNow !== homeCountry

  // El veredicto, la autoridad (§8.7): a los 300 ms del último toque, y solo de un maillot nuevo.
  const settled = useSettled(code, CHECK_DELAY_MS)
  const needCheck = kitChanged && lockedReason === null
  const checkQ = useQuery({
    queryKey: ['kit-check', settled],
    queryFn: () => checkMyKit(settled),
    enabled: needCheck && settled === code,
  })
  // Sin red, la consulta se queda en pausa (`networkMode: 'online'`): eso es un fallo, no una espera.
  const check: CheckState = !needCheck
    ? { status: 'idle' }
    : settled !== code
      ? { status: 'busy' }
      : checkQ.isError || checkQ.fetchStatus === 'paused'
        ? { status: 'error' }
        : checkQ.data !== undefined
          ? { status: 'done', verdict: checkQ.data }
          : { status: 'busy' }

  const blocked = new Map(kit.options.map((o) => [o.kit, o.why]))
  const edited = <T,>(set: (v: T) => void) => {
    return (v: T) => {
      setSave('idle')
      set(v)
    }
  }

  const summary = saveSummary({
    kit: kitChanged ? kitConsequence(today) : null,
    bib: bibChanged ? bibWords(dKit, bib) : null,
    name: nameChanged ? nameNow.trim() : null,
    country: countryChanged ? countryName(countryNow) : null,
  })
  const refused =
    kitChanged && check.status === 'done' && check.verdict.code !== null
      ? verdictLine(check.verdict).text
      : undefined

  // Un solo guardado (8-h): primero `PUT /api/teams/me` y después `PUT /api/teams/me/kit`.
  const onSave = async () => {
    setSave('saving')
    setEditError(null)
    const r = await saveIdentity(
      {
        team:
          nameChanged || countryChanged
            ? {
                name: nameChanged ? nameNow.trim() : undefined,
                country: countryChanged ? countryNow : undefined,
              }
            : null,
        kit:
          kitChanged || bibChanged
            ? { ...(kitChanged ? { kit: code } : {}), ...(bibChanged ? { bib } : {}) }
            : null,
      },
      {
        updateTeam: updateMyTeam,
        saveKit: saveMyKit,
        codeOf: (e) => (e instanceof ApiError ? e.code : null),
      },
    )
    // El equipo, otra vez, si cambió su nombre o su país, aunque el maillot fallara después.
    const refreshTeam = r.teamSaved
      ? [
          queryClient.invalidateQueries({ queryKey: ['team', team.id] }),
          queryClient.invalidateQueries({ queryKey: ['teams'] }),
          queryClient.invalidateQueries({ queryKey: ['team-control'] }),
        ]
      : []
    if (r.ok) {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['team-kit'] }), ...refreshTeam])
      setDraft(null)
      setBibChoice(null)
      setSave('saved')
      return
    }
    const failure = saveFailure(r.code)
    if (failure !== 'other') {
      // Lo que ha cambiado desde el veredicto: el `GET` trae el bloqueo de la temporada (8-v) o lo tachado,
      // y el veredicto se vuelve a pedir; la `ActionBar` vuelve con su porqué. Ya cambiado esta temporada,
      // el borrador vuelve al guardado.
      if (failure === 'locked') setDraft(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['team-kit'] }),
        queryClient.invalidateQueries({ queryKey: ['kit-check'] }),
        ...refreshTeam,
      ])
      setSave('idle')
    } else if (r.code !== null && teamEditError(r.code).field !== null) {
      setEditError(r.code)
      setSave('idle')
    } else {
      await Promise.all(refreshTeam)
      setSave('failed')
    }
  }

  return (
    <>
      <Panel title="Your kit">
        <KitPicker
          mode="edit"
          teamName={team.name}
          draft={d}
          onDraft={edited(setDraft)}
          bib={bib}
          onBib={edited(setBibChoice)}
          blocked={blocked}
          scheduled={
            kit.pending !== null && !kitChanged
              ? scheduledText(kit.pending.validFromDay, today)
              : null
          }
          state={pickerState({
            readonly: false,
            locked: lockedReason !== null,
            kitChanged,
            bibChanged,
            save,
            check,
            online,
          })}
          check={check}
          onRetry={() => void checkQ.refetch()}
          lockedReason={lockedReason}
        />
      </Panel>
      <TeamManager
        name={nameNow}
        country={countryNow}
        onName={edited((v: string) => {
          setEditError(null)
          setName(v)
        })}
        onCountry={edited((v: string) => {
          setEditError(null)
          setCountry(v)
        })}
        error={editError}
      />
      {children}
      <Disclosure showLabel="Show the teams you race" hideLabel="Hide the teams you race">
        <ul className="grid">
          {kit.rivals.map((r) => (
            <li key={r.teamId} className="flex min-h-11 items-center gap-3 border-b border-line">
              {r.kit === null ? (
                <span className="inline-block size-7" />
              ) : (
                <Kit code={r.kit} teamName={r.name} size={28} />
              )}
              <TextLink to={`/world/teams/${r.teamId}`}>{r.name}</TextLink>
              <span className="ml-auto text-meta text-ink-2">
                {r.races} {r.races === 1 ? 'race' : 'races'}
              </span>
            </li>
          ))}
        </ul>
      </Disclosure>
      <ActionBar
        changes={summary.changes}
        consequence={summary.consequence}
        actionLabel={summary.actionLabel}
        status={save}
        onSave={() => void onSave()}
        {...(refused === undefined ? {} : { disabledReason: refused })}
      />
    </>
  )
}

/** Una fila del `dl` del equipo: su rótulo encima, en `meta` 600, y lo que dice debajo (PR 21l). */
function Dato({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="grid content-start gap-1">
      <dt className="text-meta font-semibold text-ink">{label}</dt>
      <dd className="text-body text-ink">{children}</dd>
    </div>
  )
}

export function TeamIdentity() {
  const rev = useHorizonRev()
  const summary = useQuery({
    queryKey: horizonKey(['rider', 'summary'], rev),
    queryFn: fetchRiderSummary,
    enabled: rev !== undefined,
  })
  const teamId = summary.data?.teamId ?? null
  const team = useQuery({
    queryKey: horizonKey(['team', teamId], rev),
    queryFn: () => fetchTeam(teamId!),
    enabled: teamId != null && rev !== undefined,
  })
  const news = useQuery({
    queryKey: horizonKey(['team-news', teamId], rev),
    queryFn: () => fetchTeamNews(teamId!),
    enabled: teamId != null && rev !== undefined,
  })
  const teams = useQuery({
    queryKey: horizonKey(['teams'], rev),
    queryFn: fetchTeams,
    enabled: rev !== undefined,
  })
  const control = useQuery({ queryKey: ['team-control'], queryFn: fetchTeamControl })
  const ownedByMe =
    team.data !== undefined &&
    control.data?.team?.id === team.data.id &&
    control.data.team.ownedByMe === true
  const myKit = useQuery({ queryKey: ['team-kit'], queryFn: fetchMyKit, enabled: ownedByMe })
  const health = useHealth()
  const today = health.data?.gameDay ?? null

  // Los estados, con `QueryView` (E3, PR 10): un fallo del resumen ya no se pinta como «sin equipo».
  if (summary.data === undefined)
    return <QueryView query={summary} label="your rider" skeleton={{ kind: 'panel' }} />

  if (!teamId) {
    return (
      <section className="space-y-4">
        <PageHeader title="Identity" />
        <EmptyState
          icon="team"
          text="You do not belong to a team yet. Browse the peloton in World, under Teams."
          action={<Button to="/world/teams">Browse the teams</Button>}
        />
      </section>
    )
  }

  if (team.data === undefined)
    return <QueryView query={team} label="your team" skeleton={{ kind: 'panel' }} />

  const data = team.data
  const country = COUNTRIES.find((c) => c.code === data.country)
  // Puesto del equipo en la clasificación por puntos de la temporada, si ya hay lista de equipos.
  const ranked = [...(teams.data ?? [])].sort((a, b) => b.pointsSeason - a.pointsSeason)
  const rank = ranked.findIndex((t) => t.id === data.id)
  const division = DIVISION_LABEL[data.division] ?? data.division

  // `The team` y `History`, como antes (§8.7); la frase de la filosofía, que iba en la tarjeta de identidad
  // que se fue, abre `The team`. Con el sistema (E3, §17.21; PR 21l): los dos, `Panel` del catálogo, y los
  // datos del equipo en un `dl`, donde iban los paneles cian con sus `InfoRow`; sin país ni puesto, en
  // palabras, donde iba una raya.
  const middle = (
    <div className="grid gap-3 sm:grid-cols-2">
      <Panel title="The team">
        <p className="text-body text-ink-2">{philosophy(data)}</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
          <Dato label="Division">{division}</Dato>
          <Dato label="Based in">
            {country === undefined ? (
              (data.country ?? 'None')
            ) : (
              <span className="inline-flex items-center gap-2">
                {/* su nombre va al lado: la bandera, para el ojo */}
                <span aria-hidden="true">
                  <Flag country={data.country} />
                </span>
                {country.name}
              </span>
            )}
          </Dato>
          <Dato label="Riders">{data.roster.length}</Dato>
          <Dato label="Season points">{data.pointsSeason.toLocaleString('en-US')}</Dato>
          <Dato label="Rank among teams">
            {rank >= 0 ? `#${rank + 1} of ${ranked.length}` : 'Not ranked yet'}
          </Dato>
          <Dato label="Budget">{data.budget.toLocaleString('en-US')}</Dato>
        </dl>
        <p className="mt-3 text-meta text-ink-2">
          {DIVISION_BLURB[data.division] ?? 'Its calendar follows its licence level.'}
        </p>
      </Panel>

      {/* Los estados, con `QueryView` (E3, PR 10): cargando o con un fallo ya no se pinta «nada todavía». */}
      <Panel title="History" variant="bleed">
        {news.data && news.data.length > 0 ? (
          <TeamFeed items={news.data} padding="px-3 sm:px-4" />
        ) : (
          <div className="px-3 sm:px-4">
            <QueryView
              query={news}
              label="your team's history"
              skeleton={{ kind: 'rows', rowHeight: 44 }}
              isEmpty={(d) => d.length === 0}
              empty={{
                text: 'Nothing has happened to this team yet — its story starts with the next race.',
              }}
            />
          </div>
        )}
      </Panel>
    </div>
  )

  return (
    <section className="space-y-4">
      <PageHeader title="Identity" status={`${data.name} · ${division}`} />
      {ownedByMe ? (
        myKit.data === undefined ? (
          <Panel title="Your kit">
            <QueryView query={myKit} label="your kit" skeleton={{ kind: 'panel' }} answer />
          </Panel>
        ) : (
          <OwnerIdentity team={data} kit={myKit.data} today={today}>
            {middle}
          </OwnerIdentity>
        )
      ) : (
        <>
          <Panel title="Team kit">
            <KitPicker mode="readonly" team={{ name: data.name, kit: data.kit }} bib={data.bib} />
          </Panel>
          {middle}
        </>
      )}
    </section>
  )
}
