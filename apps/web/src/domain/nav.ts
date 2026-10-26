import type { IconName } from '../components/ui/types'

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
  /** el de las celdas de la barra inferior de menos de 76 px (E3, docs/visual.md §6.3; PR 11) */
  shortLabel: string
  /** el de la barra inferior (E3, §4.4) */
  icon: IconName
}

// Un destino se llama igual arriba y abajo, salvo en una celda de la barra inferior de menos de 76 px
// (con cinco destinos, toda ventana de menos de 380, la de 360 incluida), donde el rótulo largo no
// cabe y va el corto (E3, docs/visual.md §6.3, 6-e; Ruso-014): `Dashboard` mide 73 px en `caption` 600
// con la letra de la prueba. Lo decide una regla de contenedor, no el ancho de la ventana.
export const DASHBOARD: MainLink = {
  section: 'dashboard',
  to: '/',
  label: 'Dashboard',
  shortLabel: 'Home',
  icon: 'home',
}
export const MY_RIDER: MainLink = {
  section: 'me',
  to: '/me/profile',
  label: 'My Rider',
  shortLabel: 'Rider',
  icon: 'rider',
}
export const MY_TEAM: MainLink = {
  section: 'team',
  to: '/team/squad',
  label: 'My Team',
  shortLabel: 'Team',
  icon: 'team',
}
export const WORLD: MainLink = {
  section: 'world',
  to: '/world/races',
  label: 'World',
  shortLabel: 'World',
  icon: 'world',
}
export const NEWS: MainLink = {
  section: 'news',
  to: '/news',
  label: 'News',
  shortLabel: 'News',
  icon: 'news',
}
export const HOW_TO_PLAY: MainLink = {
  section: 'help',
  to: '/how-to-play',
  label: 'How to play',
  shortLabel: 'Help',
  icon: 'info',
}

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
