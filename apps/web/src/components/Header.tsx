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
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          Cycling Star
        </Link>
        <nav className="flex items-center gap-4 text-sm text-slate-600">
          {data ? (
            <Link to="/cuenta" className="font-medium">
              Mi cuenta
            </Link>
          ) : (
            <>
              <Link to="/acceso">Acceso</Link>
              <Link to="/registro" className="font-medium">
                Registro
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
