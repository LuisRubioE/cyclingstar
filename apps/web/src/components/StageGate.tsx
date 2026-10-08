import type { StageGate } from '@cyclingstar/shared'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { type GatePlace, alsoRevealsText, revealPlan, revealQuestion } from '../domain/stageGate'

/**
 * LA PUERTA Y REVELAR SIN CASTIGO (E2, docs/retransmision.md §6.10, §10.12, §11.10 a §11.12 y §11.15;
 * D-37, D-38, D-40, D-57, DD-17; paso 9a).
 *
 * `StageGateCard` es lo que sale en lugar de lo que enseñaría el resultado de una etapa que quien mira
 * no ha visto ni revelado (`watch.gate` de la ruta de etapa, o el 403 del acta como `GateError`): en
 * `Report`, `Result`, `Classifications`, `Race Radio` y `/report`, `This page shows the result of Stage
 * 7. Watch it instead?`; y en `Watch`, cuando falta por ver la anterior (`previous_unseen`), `You haven't
 * watched stage 6 yet` (§11.12). Tres salidas, ninguna cierra: verla, `Show result` con su confirmación
 * (la primera vez, con `Don't ask again`, DD-17) y, solo para un administrador, el último y en pequeño,
 * `Diagnostic view` (§11.15). `Highlights of stage 6` llega con los modos del 10a. Quien lee con
 * `cs_viewer` sin sesión no puede revelar (las escrituras piden sesión, §10.8) y ve `Sign in to see
 * results as you know them`.
 */

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
const primary =
  'rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60'
const secondary =
  'rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-60'

/** Revelar desde la puerta: lo que la página sabe hacer y si hay que preguntar antes. */
export interface RevealActions {
  /** `POST /api/me/reveal/:raceKey/:day` y el `rev` nuevo en `['horizon']`; lanza si falla */
  readonly reveal: (stageDay: number) => Promise<void>
  /** `Don't ask again`: `users.reveal_confirm = false` (`PUT /api/me/spoiler-scope`, DD-17) */
  readonly dontAskAgain: () => Promise<void>
  /** `users.reveal_confirm`: preguntar antes de revelar */
  readonly askFirst: boolean
}

/**
 * LA CONFIRMACIÓN DE REVELAR (§11.11, DD-17): la pregunta, lo que arrastra si faltaban anteriores y
 * `Don't ask again`. Se exporta para probarla sin estado.
 */
export function RevealConfirm({
  stageDay,
  also,
  busy,
  onConfirm,
  onCancel,
}: {
  stageDay: number
  also: readonly number[]
  busy: boolean
  onConfirm: (dontAskAgain: boolean) => void
  onCancel: () => void
}) {
  const [dontAsk, setDontAsk] = useState(false)
  const alsoText = alsoRevealsText(also)
  return (
    <div
      role="dialog"
      aria-label="Show the result"
      className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3"
    >
      <p className="text-sm text-slate-700">{revealQuestion(stageDay)}</p>
      {alsoText !== null && <p className="text-sm text-slate-500">{alsoText}</p>}
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={dontAsk} onChange={(e) => setDontAsk(e.target.checked)} />
        Don&apos;t ask again
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={primary}
          disabled={busy}
          onClick={() => onConfirm(dontAsk)}
        >
          Show result
        </button>
        <button type="button" className={secondary} disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export function StageGateCard({
  gate,
  stageDay,
  place,
  raceId,
  watchOn,
  watchable,
  onWatch,
  actions,
  signIn,
  diagHref,
}: {
  gate: StageGate
  /** la etapa de la página */
  stageDay: number
  place: GatePlace
  raceId: string
  /** `Watch` está encendido para quien mira: la puerta de la anterior ofrece verla */
  watchOn: boolean
  /** hay `Watch` para esta etapa: la puerta ofrece verla en lugar de leerla */
  watchable: boolean
  /** cambiar a la pestaña `Watch` de esta etapa; sin él, un enlace a su página */
  onWatch?: () => void
  /** revelar; null si no se puede (quien lee con `cs_viewer` sin sesión) */
  actions: RevealActions | null
  /** quien lee con `cs_viewer` sin sesión: `Sign in to see results as you know them` (§10.8) */
  signIn: boolean
  /** el modo diagnóstico, solo para un administrador con sesión (11-h); null para los demás */
  diagHref: string | null
}) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const plan = revealPlan(gate, stageDay, place)
  const first = gate.k === 'previous_unseen' ? gate.firstUnseen : null
  const stageHref = (day: number): string => `/world/races/${raceId}/stages/${day}?tab=watch`

  async function reveal(dontAsk: boolean): Promise<void> {
    if (actions === null) return
    setBusy(true)
    setFailed(false)
    try {
      // `Don't ask again` no puede impedir revelar: si no se guarda, la próxima vez se vuelve a preguntar
      if (dontAsk) await actions.dontAskAgain().catch(() => undefined)
      await actions.reveal(plan.stageDay)
      setConfirming(false)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  // con la anterior sin ver, lo que se ofrece ver es ella; si no, esta etapa, si tiene `Watch`
  const offerWatch = first !== null ? watchOn : watchable
  const heading =
    place === 'watch' && first !== null
      ? `You haven't watched stage ${first} yet`
      : `This page shows the result of Stage ${stageDay}.${offerWatch ? ' Watch it instead?' : ''}`
  const showLabel =
    place === 'watch' ? `Show result of stage ${plan.stageDay} and continue` : 'Show result'

  return (
    <div className={card} role="region" aria-label="Not watched yet">
      <p className="text-sm font-medium text-slate-800">{heading}</p>
      {place === 'result' && first !== null && (
        <p className="mt-1 text-sm text-slate-500">You haven&apos;t watched stage {first} yet.</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {first !== null
          ? offerWatch && (
              <Link to={stageHref(first)} className={primary}>
                Watch stage {first}
              </Link>
            )
          : offerWatch &&
            (onWatch !== undefined ? (
              <button type="button" className={primary} onClick={onWatch}>
                Watch
              </button>
            ) : (
              <Link to={stageHref(stageDay)} className={primary}>
                Watch
              </Link>
            ))}
        {actions !== null && !confirming && (
          <button
            type="button"
            className={secondary}
            disabled={busy}
            onClick={() => (actions.askFirst ? setConfirming(true) : void reveal(false))}
          >
            {showLabel}
          </button>
        )}
        {actions === null && signIn && (
          <Link to="/login" className="text-sm font-medium text-brand-cyan hover:underline">
            Sign in to see results as you know them
          </Link>
        )}
      </div>
      {confirming && (
        <RevealConfirm
          stageDay={plan.stageDay}
          also={plan.also}
          busy={busy}
          onConfirm={(dontAsk) => void reveal(dontAsk)}
          onCancel={() => setConfirming(false)}
        />
      )}
      {failed && <p className="mt-2 text-sm text-red-600">Could not show the result.</p>}
      {diagHref !== null && (
        <p className="mt-4 text-right">
          <Link to={diagHref} className="text-xs text-slate-400 hover:text-slate-600">
            Diagnostic view
          </Link>
        </p>
      )}
    </div>
  )
}

/**
 * DOS DISPOSITIVOS (§10.12, D-57): la etapa que se estaba viendo aquí se vio o se reveló en otro. La
 * pantalla no salta al acta: lo dice, y quien mira elige.
 */
export function TwoDeviceNotice({
  onWatchAnyway,
  onShowReport,
}: {
  onWatchAnyway: () => void
  onShowReport: () => void
}) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-900"
    >
      <span>You finished this stage on another device</span>
      <span aria-hidden>·</span>
      <button type="button" className="font-medium underline" onClick={onWatchAnyway}>
        Watch anyway
      </button>
      <span aria-hidden>·</span>
      <button type="button" className="font-medium underline" onClick={onShowReport}>
        Show report
      </button>
    </div>
  )
}

/**
 * EL MODO DIAGNÓSTICO EN PANTALLA (§11.15, D-40, 11-h): una franja fija encima de las pestañas. Lo que
 * se ve en este modo lo sabe el dueño, no su cuenta: nada se escribe.
 */
export function DiagnosticStrip({ exitHref }: { exitHref: string }) {
  return (
    <div
      role="note"
      className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-xl bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900"
    >
      <span>Diagnostic view · not counted as watched</span>
      <Link to={exitHref} className="text-xs font-normal underline">
        Exit
      </Link>
    </div>
  )
}
