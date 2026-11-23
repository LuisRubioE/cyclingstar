import { useLocation } from 'react-router-dom'
import { useSessionState } from '../auth/useSessionState'
import { Button } from '../components/ui/Button'
import { Notice } from '../components/ui/Notice'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { LoadingState } from '../components/ui/QueryView'
import { readVerificationLink } from '../domain/authLinks'

/**
 * Vuelta de los enlaces del correo. El servidor hace el trabajo y redirige aquí: sin parámetros si
 * todo fue bien, con `?step=approved` si era la aprobación de un cambio de correo (falta el segundo
 * enlace) y con `?error=…` si el enlace ya no valía.
 *
 * Es una página PÚBLICA a propósito: el enlace se abre a menudo desde el móvil o desde otro
 * navegador. Al confirmar, el servidor deja la sesión abierta (`autoSignInAfterVerification`) en el
 * navegador que abrió el enlace, así que «Continue» lleva directo al juego; en otro, o si el enlace falló,
 * «Log in» (que, sin confirmar, manda otro solo). Desde E4 la página mira la sesión antes de decirlo.
 *
 * Con el sistema desde el 21j (E3, docs/visual.md §17.21): lo que pasó, en la cabecera; el porqué, en el
 * `Panel` que contesta, y el fallo en `role="alert"`; y las dos salidas en `Button`, la primera la primaria.
 */
export function VerifyEmail() {
  const outcome = readVerificationLink(useLocation().search)
  // la sesión, antes de hablar: no se dice `you are signed in` a quien no lo está, ni se le pide entrar a
  // quien ya está dentro (docs/cuenta.md §5.2 y §12.4; mapa 05 §5, captura 22)
  const { state, isPending } = useSessionState()
  if (isPending) return <LoadingState label="your session" />
  const dentro = state === 'signed-in'
  const title =
    outcome.kind === 'error'
      ? 'That did not work'
      : outcome.kind === 'approved'
        ? 'Change approved'
        : 'Confirm your email'

  return (
    <section className="mx-auto grid max-w-form gap-4">
      <PageHeader title={title} />
      <Panel ariaLabel="The link from your email" answer>
        <div className="grid gap-3">
          {outcome.kind === 'error' ? (
            <>
              <p role="alert" className="text-body text-bad">
                {outcome.message}
              </p>
              {!dentro && (
                <p className="text-meta text-ink-2">
                  Logging in with an unconfirmed email sends you a fresh link.
                </p>
              )}
            </>
          ) : outcome.kind === 'approved' ? (
            <p className="text-body text-ink-2">
              One step left: we have sent a link to your new address. Your email changes only when
              you open it.
            </p>
          ) : (
            // el final de confirmar el correo (§12.4; D-56)
            <Notice tone="good" title="Email confirmed" role="status">
              {dentro ? "You're in. Let's create your rider." : 'Log in to start playing.'}
            </Notice>
          )}
          <div className="flex flex-wrap gap-3">
            {dentro ? (
              <>
                <Button to="/me/profile" variant="primary">
                  Continue
                </Button>
                <Button to="/account">Account</Button>
              </>
            ) : (
              <Button to="/login" variant="primary">
                Log in
              </Button>
            )}
          </div>
        </div>
      </Panel>
    </section>
  )
}
