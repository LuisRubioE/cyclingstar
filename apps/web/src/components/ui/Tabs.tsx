import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useMatch, useResolvedPath } from 'react-router-dom'
import { FOCUS_INSET, withLayout } from './styles'
import type { Layout } from './types'

/**
 * LAS PESTAÑAS (E3, docs/visual.md §4.4 y §6.3; PR 9a). Un carril de 44 que se desplaza de lado sin barra
 * a la vista, con un desvanecido de 24 px en el borde mientras haya más (hoy, en `My Rider`, `Contract`
 * y `Finances` quedan fuera de los 360 px sin ningún indicio, mapa 05 §9), y la activa centrada al entrar
 * con `scrollIntoView({ inline: 'center', block: 'nearest' })`, que no mueve la página: con solo
 * `inline`, el `block` por defecto la bajaba 48 px (Ruso-005).
 *
 * Dos aspectos: `nav`, bajo la cabecera, en `navy-dark` y en el ámbito oscuro (la activa en blanco con su
 * raya `gold` de 3 px); y `page`, en el contenido (la activa en `ink` con su raya `accent`). Y dos
 * conductas: con `items`, enlaces, la activa con `aria-current="page"`; con `options`, el patrón de
 * `components/Tabs.tsx` (l. 153-222): `tablist`, `tab` con `aria-selected`, índice móvil y flechas.
 */

export interface TabItem {
  readonly to: string
  readonly label: string
  /** solo con la ruta exacta; por defecto, también en sus hijas */
  readonly end?: boolean
}

export interface TabOption<K extends string> {
  readonly key: K
  readonly label: string
}

interface TabsBase {
  /** el nombre del carril, para el lector: `Rider sections` */
  readonly label: string
  readonly variant?: 'nav' | 'page'
  readonly layout?: Layout
}

export type TabsProps<K extends string> = TabsBase &
  (
    | { readonly items: readonly TabItem[] }
    | {
        readonly options: readonly TabOption<K>[]
        readonly value: K
        readonly onChange: (key: K) => void
        /** el id del panel que gobiernan, si lo hay (`TabPanel` de `components/Tabs.tsx`) */
        readonly panelId?: string
      }
  )

/** El id de la pestaña de `key` que gobierna `panelId`, el mismo de `components/Tabs.tsx`. */
export const tabId = (panelId: string, key: string): string => `${panelId}-tab-${key}`

const ASPECTO = {
  nav: {
    carril: 'bg-navy-dark',
    activa: 'border-gold text-white',
    otra: 'border-transparent text-on-navy-2 hover:text-white',
  },
  page: {
    carril: 'border-b border-line',
    activa: 'border-accent text-ink',
    otra: 'border-transparent text-ink-2 hover:text-ink',
  },
} as const

const PESTANA = `flex min-h-11 shrink-0 items-center border-b-3 px-3 text-meta font-semibold whitespace-nowrap ${FOCUS_INSET}`

/** El desvanecido, mientras haya más a la derecha (el arbitrario permitido de §5.1). */
const DESVANECIDO = '[mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent)]'

/** Si al carril le queda algo a la derecha, con el desplazamiento y el tamaño. */
function useHayMas(): [(el: HTMLDivElement | null) => void, boolean] {
  const [el, setEl] = useState<HTMLDivElement | null>(null)
  const [hayMas, setHayMas] = useState(false)
  useEffect(() => {
    if (el === null) return
    const mira = () => setHayMas(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
    mira()
    el.addEventListener('scroll', mira, { passive: true })
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(mira)
    ro?.observe(el)
    return () => {
      el.removeEventListener('scroll', mira)
      ro?.disconnect()
    }
  }, [el])
  return [useCallback((x: HTMLDivElement | null) => setEl(x), []), hayMas]
}

/** Una pestaña enlace: activa si la ruta es la suya, como `NavLink`, y con `aria-current="page"`. */
function NavTab({
  item,
  variant,
  onActive,
}: {
  readonly item: TabItem
  readonly variant: 'nav' | 'page'
  readonly onActive: (el: HTMLAnchorElement | null) => void
}) {
  const { pathname } = useResolvedPath(item.to)
  const es = useMatch({ path: pathname, end: item.end ?? false }) !== null
  const aspecto = ASPECTO[variant]
  return (
    <Link
      to={item.to}
      ref={es ? onActive : undefined}
      {...(es ? { 'aria-current': 'page' as const } : {})}
      data-state={es ? 'active' : 'inactive'}
      className={`${PESTANA} ${es ? aspecto.activa : aspecto.otra}`}
    >
      {item.label}
    </Link>
  )
}

export function Tabs<K extends string>(props: TabsProps<K>) {
  const { label, variant = 'page', layout } = props
  const [carril, hayMas] = useHayMas()
  const activa = useRef<HTMLElement | null>(null)
  const botones = useRef<(HTMLButtonElement | null)[]>([])
  const aspecto = ASPECTO[variant]

  // la activa, centrada al entrar, sin mover la página (Ruso-005)
  useEffect(() => {
    activa.current?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [])

  const clasesCarril = `flex overflow-x-auto scrollbar-none${hayMas ? ` ${DESVANECIDO}` : ''}`
  const raiz = {
    'data-ui': 'Tabs',
    'data-variant': variant,
    'data-state': 'ready',
    ...(variant === 'nav' ? { 'data-surface': 'dark' } : {}),
    className: withLayout(aspecto.carril, layout),
  }

  if ('items' in props)
    return (
      <nav aria-label={label} {...raiz}>
        <div ref={carril} className={clasesCarril}>
          {props.items.map((item) => (
            <NavTab
              key={item.to}
              item={item}
              variant={variant}
              onActive={(el) => {
                activa.current = el
              }}
            />
          ))}
        </div>
      </nav>
    )

  const { options, value, onChange, panelId } = props
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const i = options.findIndex((o) => o.key === value)
    if (i < 0) return
    const n = options.length
    let j = i
    if (event.key === 'ArrowRight') j = (i + 1) % n
    else if (event.key === 'ArrowLeft') j = (i - 1 + n) % n
    else if (event.key === 'Home') j = 0
    else if (event.key === 'End') j = n - 1
    else return
    event.preventDefault()
    const destino = options[j]
    if (destino === undefined) return
    onChange(destino.key)
    botones.current[j]?.focus()
  }
  return (
    <div {...raiz}>
      <div
        ref={carril}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className={clasesCarril}
      >
        {options.map((o, i) => {
          const es = o.key === value
          return (
            <button
              key={o.key}
              ref={(el) => {
                botones.current[i] = el
                if (es) activa.current = el
              }}
              type="button"
              role="tab"
              aria-selected={es}
              tabIndex={es ? 0 : -1}
              data-state={es ? 'active' : 'inactive'}
              {...(panelId !== undefined ? { id: tabId(panelId, o.key), 'aria-controls': panelId } : {})}
              onClick={() => onChange(o.key)}
              className={`${PESTANA} ${es ? aspecto.activa : aspecto.otra}`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
