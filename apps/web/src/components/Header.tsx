import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchHealth } from '../api/health'
import { authClient } from '../auth/client'
import { WorldClock } from './WorldClock'

/**
 * Cabecera del layout. Nombre del juego, reloj del mundo y navegación según la sesión.
 * Los huecos de dinero y frescura se rellenarán cuando existan (Pasos 20+).
 */
export function Header() {
  const { data } = authClient.useSession()
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth })

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3.5">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-600" aria-hidden />
          Cycling Star
        </Link>

        {health.data && (
          <div className="hidden sm:block">
            <WorldClock
              gameDay={health.data.gameDay}
              tickIntervalMinutes={health.data.tickIntervalMinutes}
            />
          </div>
        )}

        <nav className="flex items-center gap-4 text-sm">
          <Link to="/routes" className="text-slate-600 hover:text-slate-900">
            Routes
          </Link>
          <Link to="/calendar" className="text-slate-600 hover:text-slate-900">
            Calendar
          </Link>
          {data ? (
            <>
              <Link to="/training" className="text-slate-600 hover:text-slate-900">
                Training
              </Link>
              <Link to="/objectives" className="text-slate-600 hover:text-slate-900">
                Objectives
              </Link>
              <Link to="/market" className="text-slate-600 hover:text-slate-900">
                Market
              </Link>
              <Link to="/race-orders" className="text-slate-600 hover:text-slate-900">
                Orders
              </Link>
              <Link to="/results" className="text-slate-600 hover:text-slate-900">
                Results
              </Link>
              <Link to="/rider" className="font-medium text-slate-700 hover:text-slate-900">
                My rider
              </Link>
            </>
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
