import { type HorizonSummary, SPOILER } from '@cyclingstar/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
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
  watchHref,
} from '../domain/veil'
import {
  horizonKey,
  useHealth,
  useHorizon,
  useHorizonRev,
  useRevealActions,
  useWatchOn,
  veilApplies,
} from '../queryClient'
import { RevealConfirm } from './StageGate'
import { Button } from './ui/Button'
import { Notice } from './ui/Notice'
import { Panel } from './ui/Panel'
import { TextLink } from './ui/TextLink'
import { FOCUS } from './ui/styles'

/**
 * LA PORTADA BAJO EL VELO (E2, docs/retransmision.md §11.4; D-39, I-37, H-20, 11-q; paso 9b). Encima de lo
 * de hoy, tres bloques por este orden, de `GET /api/me/horizon` y del calendario público, sin pedir nada
 * que dependa de lo que pasó:
 *
 * 1. `Continue watching`: las etapas a medias, `Race France · Stage 5 · 42 km to go`, que reanudan en
 *    `Watch`.
 * 2. `Ready to watch`: una fila por carrera en guardia que sigue en curso, la más antigua primero, con una
 *    tarjeta por etapa velada (carrera, número, km y tipo; `Your rider raced` si su corredor estaba en la
 *    lista de salida, nunca porque hiciera algo), `Watch`, `Highlights` (10a) y, en el menú, `Show result`
 *    y `Stop protecting this race`.
 * 3. `While you were away`: por cada carrera en guardia TERMINADA con etapas veladas, el digest (`Watch the
 *    race in 33 minutes`, con los minutos de `digestMinutes`, 8-b; 10a, 17-o), `Key stages` (las que marca
 *    el perfil, en `Highlights`), `Continue from stage 5` (en `Watch`) y `Show results` (revela la última y
 *    arrastra las demás, con su confirmación).
 *
 * Y lo que sale una vez: el acuse de una carrera caducada (`Results of Race Italy are now shown (finished
 * 16 days ago)`, §10.5, que la web confirma con `POST /api/me/reveal` sobre su última etapa, 10-f) y la
 * oferta adaptativa (`Only protect your own races?`, DD-16, con su cuenta en `localStorage`, 10-b).
 *
 * Sin velo para quien mira (`SPOILER_MODE` apagado, o en `admins` para un jugador) no pinta nada: la
 * portada es la de hoy.
 *
 * Desde el PR 20 (E3, docs/visual.md §14.6; captura 17): con el catálogo, `Panel`, `Button`, `Notice` y
 * `TextLink`, y un solo `primary` por carrera: el digest si lo hay; si no, `Watch` o `Continue from stage
 * N`; en `Ready to watch`, el `Watch` de la primera etapa velada. Va en el claro de la portada y no en el
 * ámbito oscuro: es la portada y no `Watch`, y dentro del ámbito la confirmación de `Show result`, un
 * `Notice`, no se leería (la tinta pasa a blanca y su fondo se queda claro, 3-j).
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
  // `Highlights` y el digest son de `Watch`: con `Watch` apagado para quien mira (el velo encendido antes
  // que `Watch`), no se ofrecen (10a)
  const { watchOn } = useWatchOn(false, wanted)
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
          <ul className="space-y-2">
            {blocks.watching.map((w) => (
              <li key={`${w.raceKey}/${w.stageDay}`} className="flex items-center gap-3 text-meta">
                <span className="min-w-0 flex-1 text-ink">{w.text}</span>
                <Button
                  variant="primary"
                  size="sm"
                  to={`/world/races/${w.raceId}/stages/${w.stageDay}?tab=watch`}
                >
                  Continue
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {blocks.ready.length > 0 && (
        <Panel title="Ready to watch">
          <div className="space-y-4">
            {blocks.ready.map((row) => (
              <ReadyRaceRow
                key={row.raceKey}
                row={row}
                h={h}
                watchOn={watchOn}
                continuing={blocks.watching.some((w) => w.raceKey === row.raceKey)}
              />
            ))}
          </div>
        </Panel>
      )}
      {blocks.away.length > 0 && (
        <Panel title="While you were away">
          <div className="space-y-4">
            {blocks.away.map((block) => (
              <AwayRace key={block.raceKey} block={block} watchOn={watchOn} />
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}

/** `Key stages`, que despliega y que el catálogo no tiene: con el aspecto de un `Button` `quiet` de 44. */
const disclose = `inline-flex min-h-11 items-center rounded-ui px-4 text-body font-semibold text-accent hover:bg-surface-2 fine:min-h-8 fine:px-3 ${FOCUS}`

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

/**
 * Una fila de `Ready to watch`: su cabecera, sus tarjetas y, en el menú, soltar la carrera. Con la carrera
 * también en `Continue watching` (`continuing`), su `primary` es aquel `Continue`, y aquí ninguno (§14.6).
 */
function ReadyRaceRow({
  row,
  h,
  watchOn,
  continuing,
}: {
  row: ReadyRow
  h: HorizonSummary
  watchOn: boolean
  continuing: boolean
}) {
  const drop = useDropRace(row.raceKey)
  const veiled = h.ready.find((r) => r.raceKey === row.raceKey)?.stages ?? []
  return (
    <div data-race-block={row.raceKey}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-body font-semibold text-ink">{row.header}</h3>
        <Button variant="quiet" size="sm" busy={drop.isPending} onClick={() => drop.mutate()}>
          Stop protecting this race
        </Button>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {row.cards.map((c, i) => (
          <ReadyCard
            key={c.stageDay}
            card={c}
            primary={i === 0 && !continuing}
            ownRider={row.ownRider}
            before={veiled.filter((d) => d < c.stageDay)}
            watchOn={watchOn}
          />
        ))}
      </ul>
      {drop.isError && (
        <p role="alert" className="mt-1 text-caption text-bad">
          Could not change this race.
        </p>
      )}
    </div>
  )
}

/** Una tarjeta: lo que dice de la etapa es recorrido; `Watch` y, en el menú, `Show result`. */
function ReadyCard({
  card,
  primary,
  ownRider,
  before,
  watchOn,
}: {
  card: StageCard
  /** la primera etapa velada de la carrera: su `Watch` es el `primary` de la carrera (§14.6) */
  primary: boolean
  ownRider: boolean
  /** las veladas de antes, que revelarla arrastra */
  before: readonly number[]
  /** `Watch` encendido para quien mira: `Highlights` (10a) */
  watchOn: boolean
}) {
  const [revealed, setRevealed] = useState(false)
  return (
    <li className="rounded-ui bg-surface-2 p-3">
      <p className="text-meta text-ink">{card.text}</p>
      {ownRider && <p className="text-caption font-semibold text-good">Your rider raced</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          variant={primary ? 'primary' : 'secondary'}
          size="sm"
          to={`/world/races/${card.raceId}/stages/${card.stageDay}`}
        >
          Watch
        </Button>
        {watchOn && (
          <Button
            variant="quiet"
            size="sm"
            to={watchHref(card.raceId, card.stageDay, false, 'highlights')}
          >
            Highlights
          </Button>
        )}
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
        <Button
          variant="quiet"
          size="sm"
          busy={busy}
          onClick={() => (actions.askFirst ? setConfirming(true) : void reveal(false))}
        >
          {label}
        </Button>
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
      {failed && (
        <span role="alert" className="text-caption text-bad">
          Could not show the result.
        </span>
      )}
    </>
  )
}

/** Un bloque de `While you were away`: una carrera terminada con etapas veladas. */
function AwayRace({ block, watchOn }: { block: AwayBlock; watchOn: boolean }) {
  const [keyOpen, setKeyOpen] = useState(false)
  const oneDay = block.stageCount === 1
  const stageHref = (day: number): string => `/world/races/${block.raceId}/stages/${day}`
  return (
    <div data-race-block={block.raceKey}>
      <h3 className="text-body font-semibold text-ink">{block.header}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {/* el digest: la carrera entera deprisa, encadenada (§8.8, 8-c), y el primary de la carrera; a 320
            px su texto no cabe en un renglón, y con `max-w-full` parte en dos en lugar de salirse */}
        {watchOn && (
          <Button
            variant="primary"
            size="sm"
            layout="max-w-full"
            to={watchHref(block.raceId, block.continueFrom, oneDay, 'digest', block.lastStage)}
          >
            {`Watch the race in ${block.digestMinutes} ${block.digestMinutes === 1 ? 'minute' : 'minutes'}`}
          </Button>
        )}
        {oneDay ? (
          <Button variant={watchOn ? 'secondary' : 'primary'} size="sm" to={stageHref(1)}>
            Watch
          </Button>
        ) : (
          <>
            <button
              type="button"
              className={disclose}
              aria-expanded={keyOpen}
              onClick={() => setKeyOpen((o) => !o)}
            >
              Key stages
            </button>
            <Button
              variant={watchOn ? 'secondary' : 'primary'}
              size="sm"
              to={stageHref(block.continueFrom)}
            >
              {`Continue from stage ${block.continueFrom}`}
            </Button>
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
      {/* Las que marca el perfil (reinas, cronos y la última), en `Highlights` (§11.4); las demás se
          conocen por arrastre al ver las siguientes. */}
      {keyOpen && !oneDay && (
        <ul className="mt-2 flex flex-wrap gap-x-4">
          {block.keyStages.map((d) => (
            <li key={d}>
              <TextLink
                to={watchOn ? watchHref(block.raceId, d, false, 'highlights') : stageHref(d)}
              >
                {`Stage ${d} →`}
              </TextLink>
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
        <Notice key={n.raceKey} tone="info" role="status" title={n.text} />
      ))}
      {offer && (
        <div
          role="dialog"
          aria-label="Spoiler protection"
          className="flex flex-wrap items-center gap-2 rounded-ui border border-line bg-surface px-3 py-2 text-meta text-ink"
        >
          <span>Only protect your own races?</span>
          <Button variant="secondary" size="sm" onClick={() => answer(true)}>
            Switch
          </Button>
          <Button variant="quiet" size="sm" onClick={() => answer(false)}>
            Keep protecting
          </Button>
          <span className="sr-only">
            After {SPOILER.adaptiveAskAfterRaces} headline races you did not finish watching
          </span>
        </div>
      )}
    </div>
  )
}
