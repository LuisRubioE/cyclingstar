import type { Ref } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icon'
import { FOCUS_INSET } from './styles'
import type { IconName } from './types'

/**
 * LA BARRA DE ABAJO (E3, docs/visual.md §4.4 y §6.3; PR 11, D-17). Fija abajo y solo por debajo de 640
 * (`sm:hidden`), en `navy-dark` y en el ámbito oscuro, de 56 más el área segura: de tres a cinco destinos
 * del mismo ancho (`bottomBarLinks`, `domain/nav.ts`: tres sin sesión, cuatro sin equipo y cinco con él),
 * cada uno de 56 de alto con su icono de 24 en una pastilla de 56 × 28 y su rótulo en `caption` 600 debajo.
 * El activo, con `aria-current="page"` y la pastilla `gold` con el icono en `navy-dark` (6,72:1); los otros,
 * en `on-navy-2` y sin pastilla (la `surface-2` del ámbito quedaba a 1,30:1 de la barra; Ruso-008).
 *
 * **El rótulo, con una regla fija** (Ruso-014, 6-e): cada destino es `@container`, y en toda celda de menos
 * de 76 px va el corto (`Home`, `Rider`, `Team`); con cinco destinos, en toda ventana de menos de 380. Los
 * dos van con `whitespace-nowrap overflow-hidden` y sin `data-clip-ok`: la comprobación 2 cuenta el que no
 * quepa. Con el teclado abierto, escondida (§4.9). Quien la pinta en el marco la apunta en lo fijo
 * (`useFixedPiece`) con su `ref`.
 */

export interface BottomNavItem {
  readonly key: string
  readonly to: string
  /** `Dashboard` */
  readonly label: string
  /** `Home`, el de las celdas de menos de 76 px */
  readonly shortLabel: string
  readonly icon: IconName
}

export interface BottomNavProps {
  /** de tres a cinco */
  readonly items: readonly BottomNavItem[]
  /** el destino de la sección abierta; null en una página suelta */
  readonly activeKey: string | null
  /** con el teclado abierto */
  readonly hidden?: boolean
  readonly ref?: Ref<HTMLElement>
}

const ROTULO = 'max-w-full overflow-hidden text-caption font-semibold whitespace-nowrap'

export function BottomNav({ items, activeKey, hidden = false, ref }: BottomNavProps) {
  if (items.length < 3 || items.length > 5)
    throw new Error(`BottomNav: de tres a cinco destinos, y son ${items.length}`)
  return (
    <nav
      ref={ref}
      aria-label="Sections"
      data-ui="BottomNav"
      data-state={hidden ? 'hidden' : 'ready'}
      data-surface="dark"
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-navy-dark pb-[env(safe-area-inset-bottom)] shadow-bar sm:hidden${hidden ? ' hidden' : ''}`}
    >
      <ul className="flex">
        {items.map((d) => {
          const activo = d.key === activeKey
          const tinta = activo ? 'text-white' : 'text-on-navy-2'
          return (
            <li key={d.key} className="@container min-w-0 flex-1">
              <Link
                to={d.to}
                {...(activo ? { 'aria-current': 'page' as const } : {})}
                data-state={activo ? 'active' : 'inactive'}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 ${FOCUS_INSET}`}
              >
                <span
                  data-pill={activo ? 'active' : 'inactive'}
                  className={`flex h-7 w-14 items-center justify-center rounded-full ${activo ? 'bg-gold text-navy-dark' : 'text-on-navy-2'}`}
                >
                  <Icon name={d.icon} size={24} />
                </span>
                <span data-label="long" className={`${ROTULO} ${tinta} @max-[4.75rem]:hidden`}>
                  {d.label}
                </span>
                <span
                  data-label="short"
                  className={`${ROTULO} ${tinta} hidden @max-[4.75rem]:inline`}
                >
                  {d.shortLabel}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
