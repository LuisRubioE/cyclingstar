import { COUNTRIES, seasonPosition } from '@cyclingstar/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchCalendar } from '../api/calendar'
import { type NewsItem, fetchNews, newsKey } from '../api/news'
import { TOP_ROWS } from '../components/ShowAll'
import { DiagnosticStrip } from '../components/StageGate'
import { StageReadyLine } from '../components/StageReadyLine'
import { ActionRow } from '../components/ui/ActionRow'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Field } from '../components/ui/Field'
import { Flag } from '../components/ui/Flag'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { QueryView } from '../components/ui/QueryView'
import { ShowAllRows } from '../components/ui/ShowAllRows'
import { TextLink } from '../components/ui/TextLink'
import { newsLabel } from '../domain/labels'
import {
  NO_FILTER,
  type NewsFilter,
  feedEntries,
  groupByGameDay,
  headlineTarget,
  matchesFilter,
  raceOfItem,
} from '../domain/newsFeed'
import { diagOf, horizonKey, useHorizonRev, useWatchOn } from '../queryClient'

/**
 * Un desplegable de filtro, en su `Field` (E3, PR 21l): `All`, el `''`, es "sin filtrar". Sin nada servido que
 * elegir (un marcador no aporta corredor, sup. N3), desactivado con su porqué (§4.1), como estaba.
 */
function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  readonly id: string
  readonly label: string
  readonly value: string | null
  readonly options: readonly { readonly value: string; readonly label: string }[]
  readonly onChange: (value: string | null) => void
}) {
  return (
    <Field
      kind="select"
      id={id}
      label={label}
      value={value ?? ''}
      options={[{ value: '', label: 'All' }, ...options]}
      onChange={(v) => onChange(v === '' ? null : v)}
      {...(options.length === 0
        ? { disabledReason: `No ${label.toLowerCase()}s in these headlines.` }
        : {})}
    />
  )
}

/**
 * Un titular, una `ActionRow` (E3, docs/visual.md §6.1; PR 21l): el hecho, con la bandera de su país delante,
 * que no dice su nombre; su familia y si es mío, en `meta`; y su enlace, si lo tiene. Iba en una fila a mano,
 * con la familia a 11 px en `slate-400`.
 */
function Headline({ item, raceId }: { item: NewsItem; raceId: string | null }) {
  const target = headlineTarget(item, raceId)
  return (
    <ActionRow
      {...(target ? { href: target } : {})}
      title={
        <>
          {item.country && <Flag country={item.country} layout="mr-2" />}
          {item.text}
        </>
      }
      meta={item.personal ? `${newsLabel(item.kind)} · you` : newsLabel(item.kind)}
    />
  )
}

/**
 * News (navegación §3.5): el MISMO feed global para todo el mundo, sin personalizar, agrupado por
 * día de juego y con filtros por equipo, corredor, nación y carrera para poder preguntarle cosas
 * concretas ("¿qué ha hecho mi equipo?", "¿quién ganó en la Volta?").
 *
 * BAJO EL VELO (E2, docs/retransmision.md §11.7 y §11.15; paso 9b): la API ya no manda las noticias de las
 * etapas que quien mira no ha visto, sino un marcador por etapa (8a), que aquí es una línea `Watch` que
 * lleva a la etapa; con más de `SPOILER.newsGroupAbove` de una carrera, una sola línea (`feedEntries`).
 * Los desplegables se construyen con lo servido (sup. N3): un marcador aporta su carrera y ningún
 * corredor. Y el modo diagnóstico del dueño: `?diag=1` de un administrador pide el feed con el horizonte
 * del mundo, con su franja; el botón `Diagnostic view` sale solo a un administrador con algo velado.
 */
export function News() {
  const [params] = useSearchParams()
  const diag = diagOf(params)
  const rev = useHorizonRev()
  const query = useQuery({
    queryKey: newsKey(diag, rev),
    queryFn: () => fetchNews({ diag }),
    enabled: rev !== undefined,
    placeholderData: keepPreviousData,
  })
  const data = query.data
  const calendar = useQuery({
    queryKey: horizonKey(['calendar'], rev),
    queryFn: fetchCalendar,
    enabled: rev !== undefined,
  })
  const veiled = (data ?? []).some((item) => item.kind === 'stage_ready')
  // ¿Es un administrador con sesión? Solo se pregunta con `?diag=1` o con algo velado, y el feed no
  // pinta nada distinto con `Watch` (`needWatch` falso): con `BROADCAST_WATCH=admins`, ningún `whoami` más.
  const { isAdmin } = useWatchOn(diag || veiled, false)
  const diagOn = diag && isAdmin
  // El filtro es estado de la vista: nunca se deriva de la respuesta del servidor.
  const [filter, setFilter] = useState<NewsFilter>(NO_FILTER)
  // Los días con todos sus titulares a la vista, pasados los 20 primeros (§6.1).
  const [abiertos, setAbiertos] = useState<ReadonlySet<number>>(() => new Set())

  const races = useMemo(
    () => (calendar.data?.races ?? []).map((r) => ({ id: r.id, name: r.name })),
    [calendar.data],
  )

  // Carrera de cada titular: la de sus datos (`raceId`), no la que se adivinaba en el texto.
  const withRace = useMemo(
    () => (data ?? []).map((item) => ({ item, raceId: raceOfItem(item) })),
    [data],
  )

  const options = useMemo(() => {
    const teams = new Map<string, string>()
    const riders = new Map<string, string>()
    const nations = new Set<string>()
    const raceIds = new Set<string>()
    for (const { item, raceId } of withRace) {
      if (item.teamId && item.teamName) teams.set(item.teamId, item.teamName)
      if (item.riderId && item.riderName) riders.set(item.riderId, item.riderName)
      if (item.country) nations.add(item.country)
      if (raceId) raceIds.add(raceId)
    }
    const byLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label)
    return {
      teams: [...teams].map(([value, label]) => ({ value, label })).sort(byLabel),
      riders: [...riders].map(([value, label]) => ({ value, label })).sort(byLabel),
      nations: [...nations]
        .map((code) => ({
          value: code,
          label: COUNTRIES.find((c) => c.code === code)?.name ?? code,
        }))
        .sort(byLabel),
      races: races
        .filter((r) => raceIds.has(r.id))
        .map((r) => ({ value: r.id, label: r.name }))
        .sort(byLabel),
    }
  }, [withRace, races])

  // Los estados, con `QueryView` (E3, PR 10).
  if (data === undefined)
    return (
      <QueryView query={query} label="the news feed" skeleton={{ kind: 'rows', rowHeight: 44 }} />
    )

  const shown = withRace.filter(({ item, raceId }) => matchesFilter(item, filter, raceId))
  const visible = shown.map(({ item }) => item)
  const days = groupByGameDay(feedEntries(visible))
  const filtered = Object.values(filter).some((v) => v !== null)

  const alternar = (gameDay: number) =>
    setAbiertos((prev) => {
      const next = new Set(prev)
      if (next.has(gameDay)) next.delete(gameDay)
      else next.add(gameDay)
      return next
    })

  // Con el sistema (E3, §17.21; PR 21l): la cabecera en `PageHeader`; los filtros en su `Panel`, cada uno en
  // su `Field`, y sin titulares no se pintan, porque no filtran nada; cada día en su `Panel`, por su día de
  // la temporada (§4.10), el primero la respuesta de la 19 (§7.3), con sus 20 primeros y `Show all`; sin
  // titulares, su vacío, que contesta. Iban la barra dorada, cajas a mano y la letra a 11 px.
  return (
    <section className="space-y-4">
      <PageHeader title="News" />
      {diagOn && <DiagnosticStrip exitHref="/news" />}
      {!diag && isAdmin && veiled && (
        <p className="flex justify-end">
          <TextLink to="/news?diag=1">Diagnostic view</TextLink>
        </p>
      )}

      {data.length > 0 && (
        <Panel ariaLabel="Filters">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FilterSelect
              id="news-team"
              label="Team"
              value={filter.teamId}
              options={options.teams}
              onChange={(teamId) => setFilter({ ...filter, teamId })}
            />
            <FilterSelect
              id="news-rider"
              label="Rider"
              value={filter.riderId}
              options={options.riders}
              onChange={(riderId) => setFilter({ ...filter, riderId })}
            />
            <FilterSelect
              id="news-nation"
              label="Nation"
              value={filter.country}
              options={options.nations}
              onChange={(country) => setFilter({ ...filter, country })}
            />
            <FilterSelect
              id="news-race"
              label="Race"
              value={filter.raceId}
              options={options.races}
              onChange={(raceId) => setFilter({ ...filter, raceId })}
            />
          </div>
          {filtered && (
            <Button variant="quiet" layout="mt-3 -ml-4" onClick={() => setFilter(NO_FILTER)}>
              Clear filters
            </Button>
          )}
        </Panel>
      )}

      {days.length === 0 ? (
        <EmptyState
          icon="news"
          text={
            filtered
              ? 'No headlines match these filters.'
              : 'Nothing has happened yet. Advance the world and the headlines will roll in.'
          }
          answer
        />
      ) : (
        days.map((day, i) => {
          const position = seasonPosition(day.gameDay)
          const todos = abiertos.has(day.gameDay)
          return (
            <Panel
              key={day.gameDay}
              title={`Day ${position.dayOfSeason} · Season ${position.season}`}
              answer={i === 0}
            >
              <ol className="divide-y divide-line">
                {(todos ? day.items : day.items.slice(0, TOP_ROWS)).map((entry, n) =>
                  entry.kind === 'news' ? (
                    <Headline
                      key={`${day.gameDay}-${n}`}
                      item={entry.item}
                      raceId={raceOfItem(entry.item)}
                    />
                  ) : (
                    <StageReadyLine key={`${day.gameDay}-${n}`} entry={entry} />
                  ),
                )}
              </ol>
              <ShowAllRows
                total={day.items.length}
                expanded={todos}
                onToggle={() => alternar(day.gameDay)}
              />
            </Panel>
          )
        })
      )}
    </section>
  )
}
