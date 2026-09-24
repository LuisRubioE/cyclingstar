import { Link, useLocation } from 'react-router-dom'
import { readVerificationLink } from '../domain/authLinks'

/**
 * Vuelta de los enlaces del correo. El servidor hace el trabajo y redirige aquí: sin parámetros si
 * todo fue bien, con `?step=approved` si era la aprobación de un cambio de correo (falta el segundo
 * enlace) y con `?error=…` si el enlace ya no valía.
 *
 * Es una página PÚBLICA a propósito: el enlace se abre a menudo desde el móvil o desde otro
 * navegador. Al confirmar, el servidor deja la sesión abierta (`autoSignInAfterVerification`),
 * así que «Continue» lleva directo al juego; si el enlace falló, «Log in» manda otro solo.
 */
export function VerifyEmail() {
  const outcome = readVerificationLink(useLocation().search)

  return (
    <div className="mx-auto max-w-sm text-center">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {outcome.kind === 'error' ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">That did not work</h1>
            <p className="mt-3 text-sm text-red-600">{outcome.message}</p>
            <p className="mt-2 text-xs text-slate-500">
              Logging in with an unconfirmed email sends you a fresh link.
            </p>
          </>
        ) : outcome.kind === 'approved' ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Change approved</h1>
            <p className="mt-3 text-sm text-slate-600">
              One step left: we have sent a link to your new address. Your email changes only when
              you open it.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Email confirmed</h1>
            <p className="mt-3 text-sm text-slate-600">
              Your address is verified and you are signed in.
            </p>
          </>
        )}
        <div className="mt-5 flex justify-center gap-3 text-sm font-medium">
          {outcome.kind === 'error' ? (
            <Link to="/login" className="rounded-xl bg-brand-navy px-4 py-2 text-white">
              Log in
            </Link>
          ) : (
            <Link to="/me/profile" className="rounded-xl bg-brand-navy px-4 py-2 text-white">
              Continue
            </Link>
          )}
          <Link to="/account" className="rounded-xl bg-slate-100 px-4 py-2 text-slate-700">
            Account
          </Link>
        </div>
      </div>
    </div>
  )
}
