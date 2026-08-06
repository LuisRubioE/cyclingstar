import { type KeyboardEvent, type ReactNode, useCallback, useRef } from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'

/**
 * Pestañas reutilizables (docs/navegacion.md §3, §7). ÚNICO componente de pestañas del proyecto:
 * absorbió a `RaceTabs` (flujo de carrera) y a `PageTabs` (segundo nivel de página).
 *
 * Hay dos sabores y comparten aspecto, para que el jugador reconozca el patrón esté donde esté:
 *
 * - `NavTabs`  → pestañas que SON rutas. Cambiar de pestaña navega. Úsalo cuando la pestaña merece
 *                URL propia (las de contexto de la cabecera, `My Rider`, `My Team`, `World`).
 * - `Tabs`     → pestañas controladas (valor + onChange). Úsalo dentro de una página cuando la
 *                pestaña es un estado de la vista, no un destino (Race: Route/Startlist/…).
 *                Combínalo con `useTabParam` si quieres que además viva en `?tab=`.
 *
 * Variantes visuales:
 * - `header`    → sobre la banda azul de la cabecera (nivel 2 del menú).
 * - `page`      → dentro del contenido, sobre fondo claro.
 * - `underline` → pestañas principales de una página, subrayadas sobre una línea divisoria.
 * - `pill`      → sub-pestañas (p. ej. las clasificaciones dentro de la página de carrera).
 *
 * Móvil: la tira SIEMPRE se desplaza en horizontal y nunca parte a dos líneas; el juego se consulta
 * desde el teléfono y las pestañas tienen que caber sin romper el layout.
 *
 * Accesibilidad de `Tabs` (patrón ARIA de tablist): `role="tablist"`/`role="tab"` con
 * `aria-selected`, un solo elemento en el orden de tabulación (roving tabindex) y navegación con
 * flechas / Home / End activando al mover el foco. El panel se pinta con `TabPanel`, que se enlaza
 * con la pestaña activa por `id`/`aria-labelledby`.
 */

/** Clases del contenedor que hace de carril desplazable. */
const SCROLLER =
  'flex items-center gap-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

/** Aspecto de una pestaña según variante y estado. */
function tabClass(variant: TabVariant, active: boolean): string {
  const base = 'shrink-0 whitespace-nowrap text-sm transition'
  switch (variant) {
    case 'header':
      return `${base} rounded-md px-3 py-1.5 ${
        active
          ? 'bg-white/20 font-semibold text-white'
          : 'text-white/75 hover:bg-white/10 hover:text-white'
      }`
    case 'underline':
      return `${base} border-b-2 px-3 py-2 font-medium ${
        active
          ? 'border-brand-cyan text-brand-cyan'
          : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
      }`
    case 'pill':
      return `${base} rounded-full px-3 py-1 font-medium ${
        active ? 'bg-brand-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`
    default:
      return `${base} rounded-md px-3 py-1.5 ${
        active
          ? 'bg-brand-navy font-semibold text-white'
          : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
      }`
  }
}

export type TabVariant = 'header' | 'page' | 'underline' | 'pill'

/** Una pestaña-ruta de `NavTabs`. */
export interface NavTabItem {
  /** Ruta destino. Es también la clave de React. */
  to: string
  /** Texto visible (en inglés). */
  label: string
  /**
   * Exige coincidencia exacta de la URL para marcarla activa. Por defecto `false`: la pestaña
   * `/world/races` sigue activa dentro de `/world/races/tour-de-france`, que es lo que se quiere.
   */
  end?: boolean
  /** Adorno opcional a la derecha (un contador, un punto de "hay novedades"). */
  badge?: ReactNode
}

/**
 * Tira de pestañas que navegan. La pestaña activa la decide la URL (`NavLink`), así que también
 * queda bien al entrar por enlace directo o al recargar.
 *
 * ```tsx
 * <NavTabs
 *   label="Race sections"
 *   items={[
 *     { to: `/world/races/${id}`, label: 'Route', end: true },
 *     { to: `/world/races/${id}/startlist`, label: 'Startlist' },
 *   ]}
 * />
 * ```
 */
export function NavTabs({
  items,
  label,
  variant = 'page',
  className = '',
}: {
  items: readonly NavTabItem[]
  /** Nombre accesible de la tira (`aria-label`), p. ej. "World sections". */
  label: string
  variant?: TabVariant
  className?: string
}) {
  if (items.length === 0) return null
  return (
    <nav aria-label={label} className={`${SCROLLER} ${className}`}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end ?? false}
          className={({ isActive }) => tabClass(variant, isActive)}
        >
          {item.label}
          {item.badge != null && <span className="ml-1.5">{item.badge}</span>}
        </NavLink>
      ))}
    </nav>
  )
}

/** Una pestaña de `Tabs`, identificada por su clave. */
export interface TabOption<K extends string> {
  key: K
  /** Texto visible (en inglés). */
  label: string
  /** Adorno opcional a la derecha (un contador, un punto de "hay novedades"). */
  badge?: ReactNode
}

/** Id del botón de una pestaña, derivado del id del panel que gobierna. */
export function tabId(panelId: string, key: string): string {
  return `${panelId}-tab-${key}`
}

/**
 * Tira de pestañas controlada, para cambiar de vista dentro de una página sin navegar.
 *
 * Accesibilidad: `role="tablist"`/`role="tab"` con `aria-selected`, roving tabindex (solo la
 * pestaña activa está en el orden de tabulación) y flechas / Home / End para moverse, activando al
 * mover el foco. Si pasas `panelId`, las pestañas apuntan a él con `aria-controls` y reciben un
 * `id` estable; píntalo con `TabPanel` para cerrar el enlace en los dos sentidos.
 *
 * ```tsx
 * const [tab, setTab] = useTabParam(['story', 'result'] as const, 'story')
 * <Tabs label="Stage sections" options={OPTS} value={tab} onChange={setTab} panelId="stage" />
 * <TabPanel panelId="stage" active={tab}>…</TabPanel>
 * ```
 */
export function Tabs<K extends string>({
  options,
  value,
  onChange,
  label,
  variant = 'page',
  panelId,
  className = '',
}: {
  options: readonly TabOption<K>[]
  value: K
  onChange: (key: K) => void
  /** Nombre accesible de la tira (`aria-label`). */
  label: string
  variant?: TabVariant
  /** Id del panel que gobiernan las pestañas, si lo hay. */
  panelId?: string
  className?: string
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const index = options.findIndex((o) => o.key === value)
    if (index < 0) return
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % options.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + options.length) % options.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = options.length - 1
    else return
    event.preventDefault()
    const target = options[next]
    if (!target) return
    onChange(target.key)
    buttons.current[next]?.focus()
  }

  if (options.length === 0) return null
  const divider = variant === 'underline' ? 'border-b border-slate-200' : ''
  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={`${SCROLLER} ${divider} ${className}`}
    >
      {options.map((option, i) => {
        const active = option.key === value
        return (
          <button
            key={option.key}
            ref={(el) => {
              buttons.current[i] = el
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            {...(panelId ? { id: tabId(panelId, option.key), 'aria-controls': panelId } : {})}
            onClick={() => onChange(option.key)}
            className={tabClass(variant, active)}
          >
            {option.label}
            {option.badge != null && <span className="ml-1.5">{option.badge}</span>}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Panel gobernado por una tira de `Tabs`. Es SIEMPRE el mismo elemento (cambia su contenido, no su
 * identidad), así que el `aria-controls` de las pestañas nunca apunta a un nodo que no existe; lo
 * que cambia es a qué pestaña dice pertenecer, vía `aria-labelledby`.
 */
export function TabPanel({
  panelId,
  active,
  children,
  className = 'space-y-4',
}: {
  /** El mismo `panelId` que se le pasó a `Tabs`. */
  panelId: string
  /** Clave de la pestaña activa: la que etiqueta el panel. */
  active: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId(panelId, active)}
      tabIndex={-1}
      className={className}
    >
      {children}
    </div>
  )
}

/**
 * Guarda la pestaña activa en la query (`?tab=`), para que un enlace a una pestaña concreta
 * funcione y para no ensuciar el historial (se navega con `replace`).
 *
 * El valor de la URL se valida contra `options`: si no encaja, se usa `fallback`. Así la pestaña por
 * defecto puede depender del estado (p. ej. `Classifications` en una carrera ya corrida y `Route` en
 * una por correr) sin escribir nada en la URL hasta que el jugador toca una pestaña.
 */
export function useTabParam<K extends string>(
  options: readonly K[],
  fallback: K,
  param = 'tab',
): [K, (key: K) => void] {
  const [search, setSearch] = useSearchParams()
  const raw = search.get(param)
  const current = options.find((o) => o === raw) ?? fallback

  const setTab = useCallback(
    (key: K) => {
      const next = new URLSearchParams(search)
      next.set(param, key)
      setSearch(next, { replace: true })
    },
    [search, setSearch, param],
  )

  return [current, setTab]
}
