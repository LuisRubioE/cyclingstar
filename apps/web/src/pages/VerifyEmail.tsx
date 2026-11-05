import { useLocation } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { readVerificationLink } from '../domain/authLinks'

/**
 * Vuelta de los enlaces del correo. El servidor hace el trabajo y redirige aquí: sin parámetros si
 * todo fue bien, con `?step=approved` si era la aprobación de un cambio de correo (falta el segundo
 * enlace) y con `?error=…` si el enlace ya no valía.
 *
 * Es una página PÚBLICA a propósito: el enlace se abre a menudo desde el móvil o desde otro
 * navegador. Al confirmar, el servidor deja la sesión abierta (`autoSignInAfterVerification`),
 * así que «Continue» lleva directo al juego; si el enlace falló, «Log in» manda otro solo.
 *
 * Con el sistema desde el 21j (E3, docs/visual.md §17.21): lo que pasó, en la cabecera; el porqué, en el
 * `Panel` que contesta, y el fallo en `role="alert"`; y las dos salidas en `Button`, la primera la primaria.
 */
export function VerifyEmail() {
  const outcome = readVerificationLink(useLocation().search)
  const title =
    outcome.kind === 'error'
      ? 'That did not work'
      : outcome.kind === 'approved'
        ? 'Change approved'
        : 'Email confirmed'

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
              <p className="text-meta text-ink-2">
                Logging in with an unconfirmed email sends you a fresh link.
              </p>
            </>
          ) : outcome.kind === 'approved' ? (
            <p className="text-body text-ink-2">
              One step left: we have sent a link to your new address. Your email changes only when
              you open it.
            </p>
          ) : (
            <p className="text-body text-ink-2">Your address is verified and you are signed in.</p>
          )}
          <div className="flex flex-wrap gap-3">
            {outcome.kind === 'error' ? (
              <Button to="/login" variant="primary">
                Log in
              </Button>
            ) : (
              <Button to="/me/profile" variant="primary">
                Continue
              </Button>
            )}
            <Button to="/account">Account</Button>
          </div>
        </div>
      </Panel>
    </section>
  )
}
