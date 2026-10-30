import type { StageGate } from '@cyclingstar/shared'
import { useState } from 'react'
import { type GatePlace, alsoRevealsText, revealPlan, revealQuestion } from '../domain/stageGate'
import { Button } from './ui/Button'
import { Notice } from './ui/Notice'
import { TextLink } from './ui/TextLink'

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
 * `Diagnostic view` (§11.15). Desde el 10a, con la anterior sin ver, también `Highlights of stage 6`, que
 * la abre en `Highlights` (§8.1). Quien lee con `cs_viewer` sin sesión no puede revelar (las escrituras
 * piden sesión, §10.8) y ve `Sign in to see results as you know them`.
 *
 * Desde el PR 20 (E3, docs/visual.md §14.1 y §14.6; Rcobertura-038): la tarjeta, la confirmación, los dos
 * dispositivos y el modo diagnóstico toman el aspecto de `Notice` y de `Button`, con sus papeles de hoy
 * (la región, el diálogo, `status` y `note`) y sin cambiar su lógica ni sus textos.
 */

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
  question,
}: {
  stageDay: number
  also: readonly number[]
  busy: boolean
  onConfirm: (dontAskAgain: boolean) => void
  onCancel: () => void
  /** otra pregunta: la de revelar una carrera entera, `Show results` de la portada (9b) */
  question?: string
}) {
  const [dontAsk, setDontAsk] = useState(false)
  const alsoText = alsoRevealsText(also)
  return (
    <div role="dialog" aria-label="Show the result" className="mt-3">
      <Notice tone="info" title={question ?? revealQuestion(stageDay)}>
        {alsoText !== null && <p>{alsoText}</p>}
        <label className="mt-1 flex min-h-11 items-center gap-2 text-ink">
          <input type="checkbox" checked={dontAsk} onChange={(e) => setDontAsk(e.target.checked)} />
          Don&apos;t ask again
        </label>
        <div className="mt-1 flex flex-wrap gap-2">
          <Button variant="primary" busy={busy} onClick={() => onConfirm(dontAsk)}>
            Show result
          </Button>
          {/* ocupado, cerrar no deshace nada: revelar sigue y su fallo se dice en la puerta */}
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </Notice>
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
    <div role="region" aria-label="Not watched yet">
      <Notice tone="info" title={heading}>
        {place === 'result' && first !== null && <p>You haven&apos;t watched stage {first} yet.</p>}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {first !== null
            ? offerWatch && (
                <>
                  <Button variant="primary" to={stageHref(first)}>
                    {`Watch stage ${first}`}
                  </Button>
                  <Button variant="secondary" to={`${stageHref(first)}&view=highlights`}>
                    {`Highlights of stage ${first}`}
                  </Button>
                </>
              )
            : offerWatch &&
              (onWatch !== undefined ? (
                <Button variant="primary" onClick={onWatch}>
                  Watch
                </Button>
              ) : (
                <Button variant="primary" to={stageHref(stageDay)}>
                  Watch
                </Button>
              ))}
          {actions !== null && !confirming && (
            <Button
              variant="secondary"
              busy={busy}
              onClick={() => (actions.askFirst ? setConfirming(true) : void reveal(false))}
            >
              {showLabel}
            </Button>
          )}
          {actions === null && signIn && (
            <TextLink to="/login">Sign in to see results as you know them</TextLink>
          )}
        </div>
      </Notice>
      {confirming && (
        <RevealConfirm
          stageDay={plan.stageDay}
          also={plan.also}
          busy={busy}
          onConfirm={(dontAsk) => void reveal(dontAsk)}
          onCancel={() => setConfirming(false)}
        />
      )}
      {failed && (
        <p role="alert" className="mt-2 text-meta text-bad">
          Could not show the result.
        </p>
      )}
      {diagHref !== null && (
        <p className="mt-4 text-right text-caption">
          <TextLink to={diagHref}>Diagnostic view</TextLink>
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
    <Notice tone="info" role="status" title="You finished this stage on another device">
      <span className="flex flex-wrap items-center gap-x-1">
        <Button variant="quiet" layout="-ml-4" onClick={onWatchAnyway}>
          Watch anyway
        </Button>
        <span aria-hidden>·</span>
        <Button variant="quiet" onClick={onShowReport}>
          Show report
        </Button>
      </span>
    </Notice>
  )
}

/**
 * EL MODO DIAGNÓSTICO EN PANTALLA (§11.15, D-40, 11-h): una franja fija encima de las pestañas. Lo que
 * se ve en este modo lo sabe el dueño, no su cuenta: nada se escribe.
 */
export function DiagnosticStrip({ exitHref }: { exitHref: string }) {
  return (
    <div className="sticky top-0 z-10">
      <Notice
        tone="warn"
        title="Diagnostic view · not counted as watched"
        action={{ label: 'Exit', to: exitHref }}
      />
    </div>
  )
}
