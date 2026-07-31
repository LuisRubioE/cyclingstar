import { Link } from 'react-router-dom'
import { authClient } from '../auth/client'

/**
 * Cabecera del layout. Muestra el nombre del juego y navegación según la sesión.
 * Los huecos de fecha del mundo, dinero y frescura se rellenarán cuando existan (Pasos 12+).
 */
export function Header() {
  const { data } = authClient.useSession()

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-600" aria-hidden />
          Cycling Star
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {data ? (
            <Link to="/account" className="font-medium text-slate-700 hover:text-slate-900">
              My account
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-slate-600 hover:text-slate-900">
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white transition hover:bg-indigo-500"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
