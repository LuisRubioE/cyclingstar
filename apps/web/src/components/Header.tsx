import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { fetchHealth } from '../api/health'
import { authClient } from '../auth/client'
import { Logo } from './Logo'
import { WorldClock } from './WorldClock'

/**
 * Cabecera del layout, estilo manager: banda superior oscura con logo y reloj del mundo, y una barra
 * de navegación azul debajo. En móvil, la navegación se colapsa en un menú.
 */

const WORLD_LINKS = [
  { to: '/calendar', label: 'Calendar' },
  { to: '/teams', label: 'Teams' },
  { to: '/free-agents', label: 'Free agents' },
  { to: '/countries', label: 'Nations' },
  { to: '/rankings', label: 'Rankings' },
  { to: '/hall-of-fame', label: 'Hall of Fame' },
  { to: '/news', label: 'News' },
]

const RIDER_LINKS = [
  { to: '/rider', label: 'My rider' },
  { to: '/training', label: 'Training' },
  { to: '/objectives', label: 'Objectives' },
  { to: '/race-orders', label: 'Orders' },
  { to: '/results', label: 'Results' },
  { to: '/race-entry', label: 'Race entry' },
  { to: '/market', label: 'Market' },
  { to: '/finances', label: 'Finances' },
]

const navClass = ({ isActive }: { isActive: boolean }): string =>
  `rounded px-2.5 py-1 text-sm transition ${
    isActive
      ? 'bg-white/15 font-semibold text-white'
      : 'text-white/80 hover:bg-white/10 hover:text-white'
  }`

export function Header() {
  const { data } = authClient.useSession()
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth })
  const [open, setOpen] = useState(false)

  const links = data ? [...WORLD_LINKS, ...RIDER_LINKS] : [...WORLD_LINKS]

  return (
    <header className="bg-gradient-to-b from-brand-navy to-brand-navy-dark shadow-md">
      {/* Banda superior: logo + reloj + sesión */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-white"
        >
          <Logo size={30} />
          Cycling Star
        </Link>

        {health.data && (
          <div className="hidden text-white/90 md:block">
            <WorldClock
              gameDay={health.data.gameDay}
              tickIntervalMinutes={health.data.tickIntervalMinutes}
              nextTickAtMs={health.data.nextTickAtMs ?? null}
            />
          </div>
        )}

        <div className="flex items-center gap-3 text-sm">
          <Link
            to="/how-to-play"
            className="hidden text-white/70 hover:text-white sm:inline"
            title="How to play"
          >
            ?
          </Link>
          {data ? (
            <NavLink to="/account" className="hidden text-white/80 hover:text-white sm:inline">
              Account
            </NavLink>
          ) : (
            <>
              <Link to="/login" className="hidden text-white/80 hover:text-white sm:inline">
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded bg-brand-gold px-3 py-1.5 font-semibold text-white transition hover:brightness-110"
              >
                Sign up
              </Link>
            </>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded border border-white/30 p-1.5 text-white lg:hidden"
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
      </div>

      {/* Barra de navegación (escritorio) */}
      <nav className="hidden border-t border-white/10 bg-black/15 lg:block">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-3 py-1">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={navClass}>
              {l.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Menú móvil */}
      {open && (
        <nav className="border-t border-white/10 bg-black/20 px-3 py-2 lg:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={navClass} onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            ))}
            <Link
              to="/how-to-play"
              className="rounded px-2.5 py-1 text-sm text-white/80 hover:bg-white/10"
              onClick={() => setOpen(false)}
            >
              How to play
            </Link>
            {data ? (
              <NavLink to="/account" className={navClass} onClick={() => setOpen(false)}>
                Account
              </NavLink>
            ) : (
              <>
                <NavLink to="/login" className={navClass} onClick={() => setOpen(false)}>
                  Log in
                </NavLink>
                <NavLink to="/register" className={navClass} onClick={() => setOpen(false)}>
                  Sign up
                </NavLink>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
