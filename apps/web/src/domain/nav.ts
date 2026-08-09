/**
 * El NIVEL 1 de la navegación (docs/navegacion.md §3.1, §5), en un solo sitio y sin React.
 *
 * Los mismos destinos se pintan de dos maneras según el tamaño de la pantalla: en escritorio, la
 * fila de secciones de la cabecera; en el teléfono, una barra inferior fija (patrón de app nativa,
 * alcanzable con el pulgar). Que el modelo viva aparte evita que las dos listas se separen y deja la
 * regla —qué destinos salen según haya sesión y equipo— probada como lógica pura.
 */

/** Las secciones del nivel 1. `dashboard`, `news` y `help` no tienen pestañas de contexto. */
export type Section = 'dashboard' | 'me' | 'team' | 'world' | 'news' | 'help' | null

/** Destino del nivel 1: la sección y su puerta de entrada. */
export interface MainLink {
  section: Exclude<Section, null>
  to: string
  label: string
}

// Un destino se llama IGUAL arriba y abajo: cambiar el rótulo según el tamaño de la pantalla es
// obligar a aprender dos nombres para el mismo sitio.
export const DASHBOARD: MainLink = { section: 'dashboard', to: '/', label: 'Dashboard' }
export const MY_RIDER: MainLink = { section: 'me', to: '/me/profile', label: 'My Rider' }
export const MY_TEAM: MainLink = { section: 'team', to: '/team/squad', label: 'My Team' }
export const WORLD: MainLink = { section: 'world', to: '/world/races', label: 'World' }
export const NEWS: MainLink = { section: 'news', to: '/news', label: 'News' }
export const HOW_TO_PLAY: MainLink = { section: 'help', to: '/how-to-play', label: 'How to play' }

/** Lo que decide qué destinos existen para este jugador ahora mismo. */
export interface NavState {
  signedIn: boolean
  /** ¿Pertenezco a un equipo? Basta ser corredor de la plantilla (§3.4). */
  hasTeam: boolean
}

/** Qué sección está abierta, deducida de la URL. `null` en páginas sueltas (login, privacy…). */
export function sectionOf(pathname: string): Section {
  if (pathname === '/') return 'dashboard'
  if (pathname.startsWith('/me/')) return 'me'
  if (pathname.startsWith('/team/')) return 'team'
  if (pathname.startsWith('/world/')) return 'world'
  if (pathname === '/news') return 'news'
  if (pathname === '/how-to-play') return 'help'
  return null
}

/**
 * Las SECCIONES del nivel 1: cuatro como mucho. `My Team` sale solo si pertenezco a un equipo, y
 * sin sesión no hay nada "mío" que enseñar: queda el mundo.
 */
export function sectionLinks({ signedIn, hasTeam }: NavState): MainLink[] {
  if (!signedIn) return [WORLD]
  return [DASHBOARD, MY_RIDER, ...(hasTeam ? [MY_TEAM] : []), WORLD]
}

/**
 * Los destinos de la barra inferior del teléfono, en el mismo orden en el que se leen arriba en
 * escritorio. La barra SUSTITUYE al nivel 1, así que lleva todo lo que hay en esa fila: las
 * secciones y, a la derecha, `News` (y `How to play` mientras no haya sesión). Dejar fuera a `News`
 * la haría inalcanzable en el teléfono, que es justo lo que la barra viene a arreglar.
 */
export function bottomBarLinks(state: NavState): MainLink[] {
  return [...sectionLinks(state), ...(state.signedIn ? [] : [HOW_TO_PLAY]), NEWS]
}
