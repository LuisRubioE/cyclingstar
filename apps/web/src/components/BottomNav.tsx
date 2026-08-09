import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { fetchRiderSummary } from '../api/rider'
import { authClient } from '../auth/client'
import { bottomBarLinks, sectionOf } from '../domain/nav'

/**
 * Barra inferior fija del teléfono (docs/navegacion.md §5, fase G).
 *
 * En móvil SUSTITUYE al nivel 1 de la cabecera —que se oculta— y deja las pestañas de nivel 2 donde
 * están, desplazables. Es el patrón de app nativa: los destinos principales al alcance del pulgar en
 * vez de arriba del todo. En escritorio no existe (`sm:hidden`, o sea `display:none`: tampoco está
 * en el árbol de accesibilidad, así que no duplica la fila de secciones de la cabecera).
 *
 * Cuidados de teléfono:
 * - Área táctil de 56 px de alto por destino, que supera el mínimo recomendado de 44.
 * - `env(safe-area-inset-bottom)`: en los móviles con muesca la barra se despega del borde y no la
 *   pisa el indicador de inicio. El hueco que deja al final del contenido lo pone `App.tsx`.
 * - El destino activo se marca con `aria-current="page"`, color y una pastilla de fondo: en una
 *   barra sin iconos el estado tiene que verse sin depender solo del color.
 */
export function BottomNav() {
  const { data: session } = authClient.useSession()
  const { pathname } = useLocation()
  // Misma consulta (y misma caché) que la cabecera: saber si pertenezco a un equipo no cuesta una
  // petición extra.
  const summary = useQuery({
    queryKey: ['rider', 'summary'],
    queryFn: fetchRiderSummary,
    enabled: Boolean(session),
  })

  const links = bottomBarLinks({
    signedIn: Boolean(session),
    hasTeam: Boolean(summary.data?.teamId),
  })
  const section = sectionOf(pathname)

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-brand-navy-dark pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(0,0,0,0.25)] sm:hidden"
    >
      <ul className="flex items-stretch">
        {links.map((link) => {
          const active = section === link.section
          return (
            <li key={link.section} className="min-w-0 flex-1">
              <Link
                to={link.to}
                aria-current={active ? 'page' : undefined}
                className={`flex h-14 items-center justify-center px-1 text-center text-[11px] font-medium leading-tight transition ${
                  active ? 'text-white' : 'text-white/70 active:text-white'
                }`}
              >
                <span
                  className={`truncate rounded-full px-2.5 py-1.5 ${
                    active ? 'bg-white/15 font-semibold' : ''
                  }`}
                >
                  {link.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
