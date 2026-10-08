import { type HorizonSummary, SPOILER } from '@cyclingstar/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchCalendar } from '../api/calendar'
import { postReveal, putFollow, putSpoilerScope, readAdaptive, writeAdaptive } from '../api/watch'
import { raceRevealQuestion, stageRange } from '../domain/stageGate'
import {
  type AwayBlock,
  type ExpiredNotice,
  type ReadyRow,
  type StageCard,
  adaptiveIgnored,
  adaptiveOfferDue,
  expiredNotices,
  homeBlocks,
} from '../domain/veil'
import {
  horizonKey,
  useHealth,
  useHorizon,
  useHorizonRev,
  useRevealActions,
  veilApplies,
} from '../queryClient'
import { Panel } from './Panel'
import { RevealConfirm } from './StageGate'

/**
 * LA PORTADA BAJO EL VELO (E2, docs/retransmision.md §11.4; D-39, I-37, H-20, 11-q; paso 9b). Encima de lo
 * de hoy, tres bloques por este orden, de `GET /api/me/horizon` y del calendario público, sin pedir nada
 * que dependa de lo que pasó:
 *
 * 1. `Continue watching`: las etapas a medias, `Race France · Stage 5 · 42 km to go`, que reanudan en
 *    `Watch`.
 * 2. `Ready to watch`: una fila por carrera en guardia que sigue en curso, la más antigua primero, con una
 *    tarjeta por etapa velada (carrera, número, km y tipo; `Your rider raced` si su corredor estaba en la
 *    lista de salida, nunca porque hiciera algo), `Watch` y, en el menú, `Show result` y `Stop protecting
 *    this race`. `Highlights` llega con los modos del 10a.
 * 3. `While you were away`: por cada carrera en guardia TERMINADA con etapas veladas, `Key stages` (las que
 *    marca el perfil), `Continue from stage 5` y `Show results` (revela la última y arrastra las demás, con
 *    su confirmación). El digest (`Watch the race in 33 minutes`) llega con el 10a (17-o).
 *
 * Y lo que sale una vez: el acuse de una carrera caducada (`Results of Race Italy are now shown (finished
 * 16 days ago)`, §10.5, que la web confirma con `POST /api/me/reveal` sobre su última etapa, 10-f) y la
 * oferta adaptativa (`Only protect your own races?`, DD-16, con su cuenta en `localStorage`, 10-b).
 *
 * Sin velo para quien mira (`SPOILER_MODE` apagado, o en `admins` para un jugador) no pinta nada: la
 * portada es la de hoy.
 */
export function WatchBlocks() {
  const rev = useHorizonRev()
  const horizon = useHorizon()
  const h = veilApplies(rev) ? (horizon.data ?? null) : null
  const wanted =
    h !== null &&
    (h.ready.length > 0 || h.watching.length > 0 || h.expiredSinceLastVisit.length > 0)
  // el calendario solo si hay algo que pintar: los km, el tipo y cuántas etapas tiene cada carrera
  const calendar = useQuery({
    queryKey: horizonKey(['calendar'], rev),
    queryFn: fetchCalendar,
    enabled: wanted && rev !== undefined,
  })
  const health = useHealth()
  if (h === null || !wanted || calendar.data === undefined) return null
  const blocks = homeBlocks(h, calendar.data.races)
  const expired =
    health.data?.gameDay == null
      ? []
      : expiredNotices(h, calendar.data.races, health.data.gameDay, health.data.tickIntervalMinutes)
  return (
    <div className="space-y-4">
      <ExpiredAndOffer h={h} notices={expired} />
      {blocks.watching.length > 0 && (
        <Panel title="Continue watching">
          <ul className="space-y-1.5">
            {blocks.watching.map((w) => (
              <li key={`${w.raceKey}/${w.stageDay}`} className="flex items-center gap-3 text-sm">
                <span className="min-w-0 flex-1 text-slate-700">{w.text}</span>
                <Link
                  to={`/world/races/${w.raceId}/stages/${w.stageDay}?tab=watch`}
                  className="shrink-0 rounded-md bg-brand-cyan px-3 py-1 text-xs font-medium text-white hover:bg-brand-cyan-light"
                >
                  Continue
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {blocks.ready.length > 0 && (
        <Panel title="Ready to watch">
          <div className="space-y-4">
            {blocks.ready.map((row) => (
              <ReadyRaceRow key={row.raceKey} row={row} h={h} />
            ))}
          </div>
        </Panel>
      )}
      {blocks.away.length > 0 && (
        <Panel title="While you were away">
          <div className="space-y-4">
            {blocks.away.map((block) => (
              <AwayRace key={block.raceKey} block={block} />
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}

const button =
  'rounded-md bg-brand-cyan px-3 py-1 text-xs font-medium text-white transition hover:bg-brand-cyan-light'
const quiet =
  'rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200 disabled:opacity-60'

/** Seguir o soltar una carrera y el `rev` de después en `['horizon']` (§10.9, regla 3). */
function useDropRace(raceKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => putFollow(raceKey, 'drop'),
    onSuccess: ({ rev }) => {
      queryClient.setQueryData<HorizonSummary | null>(['horizon'], (old) =>
        old == null ? old : { ...old, rev },
      )
      void queryClient.invalidateQueries({ queryKey: ['horizon'] })
    },
  })
}

/** Una fila de `Ready to watch`: su cabecera, sus tarjetas y, en el menú, soltar la carrera. */
function ReadyRaceRow({ row, h }: { row: ReadyRow; h: HorizonSummary }) {
  const drop = useDropRace(row.raceKey)
  const veiled = h.ready.find((r) => r.raceKey === row.raceKey)?.stages ?? []
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">{row.header}</h3>
        <button
          type="button"
          className={quiet}
          disabled={drop.isPending}
          onClick={() => drop.mutate()}
        >
          Stop protecting this race
        </button>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {row.cards.map((c) => (
          <ReadyCard
            key={c.stageDay}
            card={c}
            ownRider={row.ownRider}
            before={veiled.filter((d) => d < c.stageDay)}
          />
        ))}
      </ul>
      {drop.isError && <p className="mt-1 text-xs text-red-600">Could not change this race.</p>}
    </div>
  )
}

/** Una tarjeta: lo que dice de la etapa es recorrido; `Watch` y, en el menú, `Show result`. */
function ReadyCard({
  card,
  ownRider,
  before,
}: {
  card: StageCard
  ownRider: boolean
  /** las veladas de antes, que revelarla arrastra */
  before: readonly number[]
}) {
  const [revealed, setRevealed] = useState(false)
  return (
    <li className="rounded-md bg-slate-50 p-2.5 ring-1 ring-black/5">
      <p className="text-sm text-slate-700">{card.text}</p>
      {ownRider && <p className="text-xs text-emerald-700">Your rider raced</p>}
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <Link to={`/world/races/${card.raceId}/stages/${card.stageDay}`} className={button}>
          Watch
        </Link>
        {!revealed && (
          <RevealButton
            raceKey={card.raceKey}
            stageDay={card.stageDay}
            also={before}
            label="Show result"
            onRevealed={() => setRevealed(true)}
          />
        )}
      </div>
    </li>
  )
}

/** `Show result` o `Show results`, con la confirmación de §11.11 la primera vez (DD-17). */
function RevealButton({
  raceKey,
  stageDay,
  also,
  label,
  question,
  onRevealed,
}: {
  raceKey: string
  stageDay: number
  also: readonly number[]
  label: string
  question?: string
  onRevealed: () => void
}) {
  // Quien ve estos bloques tiene sesión: quien lee con `cs_viewer` no recibe las listas (14-i).
  const actions = useRevealActions(raceKey, onRevealed)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  if (actions === null) return null
  async function reveal(dontAsk: boolean): Promise<void> {
    if (actions === null) return
    setBusy(true)
    setFailed(false)
    try {
      if (dontAsk) await actions.dontAskAgain().catch(() => undefined)
      await actions.reveal(stageDay)
      setConfirming(false)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      {!confirming && (
        <button
          type="button"
          className={quiet}
          disabled={busy}
          onClick={() => (actions.askFirst ? setConfirming(true) : void reveal(false))}
        >
          {label}
        </button>
      )}
      {confirming && (
        <div className="w-full">
          <RevealConfirm
            stageDay={stageDay}
            also={also}
            busy={busy}
            {...(question === undefined ? {} : { question })}
            onConfirm={(dontAsk) => void reveal(dontAsk)}
            onCancel={() => setConfirming(false)}
          />
        </div>
      )}
      {failed && <span className="text-xs text-red-600">Could not show the result.</span>}
    </>
  )
}

/** Un bloque de `While you were away`: una carrera terminada con etapas veladas. */
function AwayRace({ block }: { block: AwayBlock }) {
  const [keyOpen, setKeyOpen] = useState(false)
  const oneDay = block.stageCount === 1
  const stageHref = (day: number): string => `/world/races/${block.raceId}/stages/${day}`
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800">{block.header}</h3>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {oneDay ? (
          <Link to={stageHref(1)} className={button}>
            Watch
          </Link>
        ) : (
          <>
            <button
              type="button"
              className={quiet}
              aria-expanded={keyOpen}
              onClick={() => setKeyOpen((o) => !o)}
            >
              Key stages
            </button>
            <Link to={stageHref(block.continueFrom)} className={button}>
              Continue from stage {block.continueFrom}
            </Link>
          </>
        )}
        <RevealButton
          raceKey={block.raceKey}
          stageDay={block.lastStage}
          also={stageRange(block.continueFrom, block.lastStage - 1)}
          label="Show results"
          question={raceRevealQuestion(block.raceName)}
          onRevealed={() => undefined}
        />
      </div>
      {/* Las que marca el perfil (reinas, cronos y la última); las demás se conocen por arrastre al ver
          las siguientes. En `Highlights` desde el 10a; hasta entonces, cada una abre en `Watch`. */}
      {keyOpen && !oneDay && (
        <ul className="mt-1.5 flex flex-wrap gap-2">
          {block.keyStages.map((d) => (
            <li key={d}>
              <Link
                to={stageHref(d)}
                className="text-xs font-medium text-brand-cyan hover:underline"
              >
                Stage {d} →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * LO QUE SALE UNA VEZ. El acuse de las carreras caducadas (§10.5, 10-f): se enseña y se confirma con
 * `POST /api/me/reveal` sobre su última etapa, que escribe `X` en las que faltaban; desde entonces la
 * carrera sale de `expiredSinceLastVisit` y el aviso se queda en esta página hasta salir de ella. `GET` no
 * cambia nada (D-51). El acuse no cambia lo que sirve ninguna ruta (la carrera caducada ya no estaba en el
 * velo), así que su `rev` nuevo no se lleva a `['horizon']`: con él cambiarían todas las claves de la
 * página y se pediría todo otra vez (medido en Chromium: de 12 peticiones a la API a 21 en la portada). Se
 * quita la carrera de la lista en la caché, y el `rev` nuevo llega con la siguiente carga o al enfocar. Antes de acusarlas, la oferta adaptativa (DD-16, 10-b) cuenta las de cabecera en
 * este navegador; con `SPOILER.adaptiveAskAfterRaces` ignoradas, la ofrece una vez.
 */
function ExpiredAndOffer({ h, notices }: { h: HorizonSummary; notices: readonly ExpiredNotice[] }) {
  const queryClient = useQueryClient()
  const [shown, setShown] = useState<readonly ExpiredNotice[]>([])
  const [offer, setOffer] = useState(false)
  const acknowledged = useRef(new Set<string>())
  useEffect(() => {
    // Solo con sesión llegan: quien lee con `cs_viewer` no recibe la lista (14-i), y acusar pide sesión.
    if (notices.length === 0) return
    const fresh = notices.filter((n) => !acknowledged.current.has(n.raceKey))
    if (fresh.length === 0) return
    for (const n of fresh) acknowledged.current.add(n.raceKey)
    setShown((prev) => [
      ...prev,
      ...fresh.filter((n) => !prev.some((p) => p.raceKey === n.raceKey)),
    ])
    // la oferta cuenta antes de acusar: después, la carrera ya no sale en la lista
    const before = readAdaptive()
    const ignored = adaptiveIgnored(
      before.ignored,
      fresh.map((n) => n.raceKey),
    )
    writeAdaptive(ignored, false)
    if (adaptiveOfferDue(ignored, before.asked, h.scope)) setOffer(true)
    const done = new Set(fresh.map((n) => n.raceKey))
    void Promise.all(fresh.map((n) => postReveal(n.raceKey, n.lastStage).catch(() => null))).then(
      () =>
        queryClient.setQueryData<HorizonSummary | null>(['horizon'], (old) =>
          old == null
            ? old
            : {
                ...old,
                expiredSinceLastVisit: old.expiredSinceLastVisit.filter((k) => !done.has(k)),
              },
        ),
    )
  }, [notices, h.scope, queryClient])
  const scope = useMutation({
    mutationFn: () => putSpoilerScope('own_only'),
    onSuccess: ({ rev }) => {
      queryClient.setQueryData<HorizonSummary | null>(['horizon'], (old) =>
        old == null ? old : { ...old, rev, scope: 'own_only' },
      )
      void queryClient.invalidateQueries({ queryKey: ['horizon'] })
    },
  })
  const all = [...shown, ...notices.filter((n) => !shown.some((s) => s.raceKey === n.raceKey))]
  if (all.length === 0 && !offer) return null
  const answer = (switchScope: boolean): void => {
    writeAdaptive(readAdaptive().ignored, true)
    setOffer(false)
    if (switchScope) scope.mutate()
  }
  return (
    <div className="space-y-2">
      {all.map((n) => (
        <p
          key={n.raceKey}
          role="status"
          className="rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-900 ring-1 ring-indigo-200"
        >
          {n.text}
        </p>
      ))}
      {offer && (
        <div
          role="dialog"
          aria-label="Spoiler protection"
          className="flex flex-wrap items-center gap-2 rounded-md bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-black/5"
        >
          <span>Only protect your own races?</span>
          <button type="button" className={button} onClick={() => answer(true)}>
            Switch
          </button>
          <button type="button" className={quiet} onClick={() => answer(false)}>
            Keep protecting
          </button>
          <span className="sr-only">
            After {SPOILER.adaptiveAskAfterRaces} headline races you did not finish watching
          </span>
        </div>
      )}
    </div>
  )
}
