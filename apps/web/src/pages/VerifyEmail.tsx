import { Link, useLocation } from 'react-router-dom'
import { readVerificationLink } from '../domain/authLinks'

/**
 * Vuelta del enlace de verificación del correo. El servidor hace el trabajo y redirige aquí;
 * sin parámetros si todo fue bien, con `?error=…` si el enlace ya no valía.
 *
 * Es una página PÚBLICA a propósito: el enlace se abre a menudo desde el móvil o desde otro
 * navegador, donde no hay sesión, y mandar a esa persona al login sería decirle que ha fallado.
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
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Email confirmed</h1>
            <p className="mt-3 text-sm text-slate-600">
              Your address is verified — it can now be used to recover your account.
            </p>
          </>
        )}
        <div className="mt-5 flex justify-center gap-3 text-sm font-medium">
          <Link to="/" className="rounded-xl bg-brand-navy px-4 py-2 text-white">
            Dashboard
          </Link>
          <Link to="/account" className="rounded-xl bg-slate-100 px-4 py-2 text-slate-700">
            Account
          </Link>
        </div>
      </div>
    </div>
  )
}
