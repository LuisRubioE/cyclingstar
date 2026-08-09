import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { fetchHealth } from '../api/health'
import { fetchRiderSummary } from '../api/rider'
import { authClient } from '../auth/client'
import {
  type MainLink,
  type Section,
  HOW_TO_PLAY,
  NEWS,
  sectionLinks,
  sectionOf,
} from '../domain/nav'
import { Logo } from './Logo'
import { NavTabs, type NavTabItem } from './Tabs'
import { WorldClock } from './WorldClock'

/**
 * Cabecera de DOS niveles (docs/navegacion.md §3.1-§3.4).
 *
 *   ┌ logo · reloj del mundo · cuenta ─────────────────────────┐  banda superior
 *   ├ Dashboard · My Rider · My Team* · World          News ───┤  nivel 1: sección
 *   └ Profile · Training · Race orders · …  ───────────────────┘  nivel 2: contexto
 *
 * Cuatro destinos en vez de doce, y las pestañas del nivel 2 dependen de la sección abierta.
 * `My Team` sale solo si pertenezco a un equipo (basta ser corredor de la plantilla, no hace falta
 * gestionarlo). Sin sesión la barra se reduce a `World · News · How to play`, con `Log in`/`Sign up`
 * en la banda superior.
 *
 * No hay menú de hamburguesa: todo enlace es visible y alcanzable con el teclado, sin gestión de
 * foco que se pueda romper.
 *
 * EN MÓVIL el nivel 1 no se pinta aquí: lo sustituye la barra inferior fija (`BottomNav`, §5), que
 * lleva los mismos destinos al alcance del pulgar. Las pestañas de nivel 2 se quedan donde están y
 * se desplazan en horizontal.
 */

const ME_TABS: readonly NavTabItem[] = [
  { to: '/me/profile', label: 'Profile' },
  { to: '/me/training', label: 'Training' },
  { to: '/me/orders', label: 'Race orders' },
  { to: '/me/races', label: 'My races' },
  { to: '/me/contract', label: 'Contract' },
  { to: '/me/finances', label: 'Finances' },
]

const TEAM_TABS: readonly NavTabItem[] = [
  { to: '/team/squad', label: 'Squad' },
  { to: '/team/calendar', label: 'Race calendar' },
  { to: '/team/identity', label: 'Identity' },
]

const WORLD_TABS: readonly NavTabItem[] = [
  // `Calendar` y `Races` eran dos entradas para lo mismo (las dos respondían a "¿qué viene?" y
  // "¿qué pasó?"): ahora hay una sola página, la línea temporal de la temporada con buscador.
  { to: '/world/races', label: 'Races' },
  { to: '/world/teams', label: 'Teams' },
  { to: '/world/nations', label: 'Nations' },
  { to: '/world/rankings', label: 'Rankings' },
  { to: '/world/hall-of-fame', label: 'Hall of Fame' },
]

/** Pestañas de contexto de la sección abierta (nivel 2); vacío si la sección no tiene. */
function tabsOf(section: Section): readonly NavTabItem[] {
  if (section === 'me') return ME_TABS
  if (section === 'team') return TEAM_TABS
  if (section === 'world') return WORLD_TABS
  return []
}

/** Un destino del nivel 1. Lo activo lo decide la SECCIÓN, no la coincidencia exacta de ruta. */
function MainNavLink({ link, active }: { link: MainLink; active: boolean }) {
  return (
    <Link
      to={link.to}
      aria-current={active ? 'page' : undefined}
      className={`shrink-0 rounded px-3 py-1.5 text-sm transition ${
        active
          ? 'bg-white/15 font-semibold text-white'
          : 'text-white/80 hover:bg-white/10 hover:text-white'
      }`}
    >
      {link.label}
    </Link>
  )
}

export function Header() {
  const { data: session } = authClient.useSession()
  const { pathname } = useLocation()
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth })
  // ¿Pertenezco a un equipo? Solo importa con sesión; sin ella la consulta ni se lanza.
  const summary = useQuery({
    queryKey: ['rider', 'summary'],
    queryFn: fetchRiderSummary,
    enabled: Boolean(session),
  })

  const section = sectionOf(pathname)
  const tabs = tabsOf(section)
  const mainLinks = sectionLinks({
    signedIn: Boolean(session),
    hasTeam: Boolean(summary.data?.teamId),
  })

  return (
    <header className="bg-gradient-to-b from-brand-navy to-brand-navy-dark shadow-md">
      {/* Banda superior: logo + reloj + sesión */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight text-white"
        >
          <Logo size={30} />
          <span className="hidden sm:inline">Cycling Star</span>
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

        <div className="flex shrink-0 items-center gap-3 text-sm">
          {session ? (
            <Link to="/account" className="text-white/80 hover:text-white">
              Account
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-white/80 hover:text-white">
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
        </div>
      </div>

      {/*
        Nivel 1: secciones. News se separa a la derecha porque no es "una sección más".
        Oculto en móvil: ahí este nivel lo pinta la barra inferior fija (§5), y tener las dos sería
        el mismo menú dos veces.
      */}
      <nav
        aria-label="Sections"
        className="hidden border-t border-white/10 bg-black/15 sm:block [&::-webkit-scrollbar]:hidden"
      >
        <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto whitespace-nowrap px-3 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {mainLinks.map((link) => (
            <MainNavLink key={link.section} link={link} active={section === link.section} />
          ))}
          <span className="ml-auto flex shrink-0 items-center gap-1 pl-2">
            {!session && <MainNavLink link={HOW_TO_PLAY} active={section === 'help'} />}
            <MainNavLink link={NEWS} active={section === 'news'} />
          </span>
        </div>
      </nav>

      {/* Nivel 2: pestañas de contexto de la sección abierta. */}
      {tabs.length > 0 && (
        <div className="border-t border-white/10 bg-black/25">
          <NavTabs
            items={tabs}
            label={`${section === 'me' ? 'My rider' : section === 'team' ? 'My team' : 'World'} sections`}
            variant="header"
            className="mx-auto max-w-6xl px-3 py-1"
          />
        </div>
      )}
    </header>
  )
}
