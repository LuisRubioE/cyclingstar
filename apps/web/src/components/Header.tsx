import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { fetchHealth } from '../api/health'
import { authClient } from '../auth/client'
import { Logo } from './Logo'
import { WorldClock } from './WorldClock'

/**
 * Cabecera del layout. Nombre del juego, reloj del mundo y navegación responsiva (Paso 41):
 * en móvil se colapsa en un menú; en escritorio se agrupan "mundo" y "mi ciclista".
 */

const WORLD_LINKS = [
  { to: '/calendar', label: 'Calendar' },
  { to: '/teams', label: 'Teams' },
  { to: '/rankings', label: 'Rankings' },
  { to: '/news', label: 'News' },
]

const RIDER_LINKS = [
  { to: '/rider', label: 'My rider' },
  { to: '/training', label: 'Training' },
  { to: '/objectives', label: 'Objectives' },
  { to: '/race-orders', label: 'Orders' },
  { to: '/results', label: 'Results' },
  { to: '/market', label: 'Market' },
  { to: '/finances', label: 'Finances' },
]

const linkClass = ({ isActive }: { isActive: boolean }): string =>
  `hover:text-slate-900 ${isActive ? 'font-medium text-slate-900' : 'text-slate-600'}`

export function Header() {
  const { data } = authClient.useSession()
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth })
  const [open, setOpen] = useState(false)

  const links = data ? [...WORLD_LINKS, ...RIDER_LINKS] : [...WORLD_LINKS]

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3.5">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Logo size={30} />
          Cycling Star
        </Link>

        {health.data && (
          <div className="hidden md:block">
            <WorldClock
              gameDay={health.data.gameDay}
              tickIntervalMinutes={health.data.tickIntervalMinutes}
            />
          </div>
        )}

        {/* Escritorio */}
        <nav className="hidden items-center gap-4 text-sm lg:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
          {data ? (
            <Link
              to="/how-to-play"
              className="text-slate-400 hover:text-slate-700"
              title="How to play"
            >
              ?
            </Link>
          ) : (
            <>
              <Link to="/how-to-play" className="text-slate-600 hover:text-slate-900">
                How to play
              </Link>
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

        {/* Móvil: botón de menú */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-slate-300 p-2 text-slate-600 lg:hidden"
          aria-label="Menu"
          aria-expanded={open}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {open ? (
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {/* Móvil: menú desplegable */}
      {open && (
        <nav className="border-t border-slate-100 px-4 py-3 text-sm lg:hidden">
          <div className="flex flex-col gap-2">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass} onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            ))}
            <Link
              to="/how-to-play"
              className="text-slate-600 hover:text-slate-900"
              onClick={() => setOpen(false)}
            >
              How to play
            </Link>
            {!data && (
              <>
                <Link
                  to="/login"
                  className="text-slate-600 hover:text-slate-900"
                  onClick={() => setOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="text-indigo-600 hover:text-indigo-500"
                  onClick={() => setOpen(false)}
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
