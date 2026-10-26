import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { fetchHealth } from '../api/health'
import { fetchRiderSummary } from '../api/rider'
import { useSessionState } from '../auth/useSessionState'
import { HOW_TO_PLAY, NEWS, type Section, sectionLinks, sectionOf } from '../domain/nav'
import { worldClock } from '../domain/words'
import { horizonKey, useHorizonRev } from '../queryClient'
import { AppHeader, type AppHeaderState } from './ui/AppHeader'
import { type TabItem, Tabs } from './ui/Tabs'
import { useWorldCountdown } from './useWorldCountdown'

/**
 * Cabecera de DOS niveles (docs/navegacion.md §3.1-§3.4), con el marco de E3 (docs/visual.md §6.3; PR 11):
 *
 *   ┌ logo · reloj del mundo · cuenta ─────────────────────────┐  `AppHeader`
 *   ├ Dashboard · My Rider · My Team* · World · News ──────────┤  nivel 1, solo desde 640
 *   └ Profile · Training · Race orders · …  ───────────────────┘  nivel 2: contexto
 *
 * Los dos niveles van en `Tabs` `nav`, con su desvanecido mientras haya más y la activa centrada. `My Team`
 * sale solo si pertenezco a un equipo (basta ser corredor de la plantilla); sin sesión, el nivel 1 se
 * reduce a `World · How to play · News`. Por debajo de 640 el nivel 1 no se pinta aquí: lo sustituye la
 * barra de abajo (`BottomNav`), con los mismos destinos al alcance del pulgar.
 *
 * No hay menú de hamburguesa: todo enlace es visible y alcanzable con el teclado.
 */

const ME_TABS: readonly TabItem[] = [
  { to: '/me/profile', label: 'Profile' },
  { to: '/me/training', label: 'Training' },
  { to: '/me/orders', label: 'Race orders' },
  { to: '/me/races', label: 'My races' },
  { to: '/me/contract', label: 'Contract' },
  { to: '/me/finances', label: 'Finances' },
]

const TEAM_TABS: readonly TabItem[] = [
  { to: '/team/squad', label: 'Squad' },
  { to: '/team/calendar', label: 'Race calendar' },
  { to: '/team/identity', label: 'Identity' },
]

const WORLD_TABS: readonly TabItem[] = [
  // `Calendar` y `Races` eran dos entradas para lo mismo (las dos respondían a "¿qué viene?" y
  // "¿qué pasó?"): ahora hay una sola página, la línea temporal de la temporada con buscador.
  { to: '/world/races', label: 'Races' },
  { to: '/world/teams', label: 'Teams' },
  { to: '/world/nations', label: 'Nations' },
  { to: '/world/rankings', label: 'Rankings' },
  { to: '/world/hall-of-fame', label: 'Hall of Fame' },
]

/** Pestañas de contexto de la sección abierta (nivel 2); vacío si la sección no tiene. */
function tabsOf(section: Section): readonly TabItem[] {
  if (section === 'me') return ME_TABS
  if (section === 'team') return TEAM_TABS
  if (section === 'world') return WORLD_TABS
  return []
}

export function Header() {
  // Con la sesión sin saber y la marca de este navegador, la cabecera del jugador (§12.1; PR 4): nunca
  // `Log in` a quien tenía sesión y ha perdido la red. Sin nada de la cuenta: el resumen solo se pide con
  // la sesión confirmada (`useSessionState`).
  const { state, signedIn } = useSessionState()
  const { pathname } = useLocation()
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth })
  const restante = useWorldCountdown(health.data)
  // ¿Pertenezco a un equipo? Solo importa con sesión; sin ella la consulta ni se lanza. El resumen es
  // de una ruta con horizonte (sus puntos y su dinero, R): su clave lleva el `rev` (§10.9; 9b).
  const rev = useHorizonRev()
  const summary = useQuery({
    queryKey: horizonKey(['rider', 'summary'], rev),
    queryFn: fetchRiderSummary,
    enabled: state === 'signed-in' && rev !== undefined,
  })

  const section = sectionOf(pathname)
  const tabs = tabsOf(section)
  const nivel1: readonly TabItem[] = [
    ...sectionLinks({ signedIn, hasTeam: Boolean(summary.data?.teamId) }),
    ...(signedIn ? [] : [HOW_TO_PLAY]),
    NEWS,
  ].map((l) => ({ to: l.to, label: l.label, active: section === l.section }))
  const estado: AppHeaderState = state === 'unknown' ? (signedIn ? 'unknown' : 'signed-out') : state

  return (
    <AppHeader
      state={estado}
      clock={health.data === undefined ? null : worldClock(health.data.gameDay, restante)}
      sections={<Tabs label="Sections" variant="nav" items={nivel1} />}
    >
      {tabs.length > 0 && (
        <Tabs
          label={`${section === 'me' ? 'My rider' : section === 'team' ? 'My team' : 'World'} sections`}
          variant="nav"
          items={tabs}
        />
      )}
    </AppHeader>
  )
}
