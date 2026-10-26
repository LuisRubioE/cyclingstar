import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { fetchRiderSummary } from '../api/rider'
import { useSessionState } from '../auth/useSessionState'
import { bottomBarLinks, sectionOf } from '../domain/nav'
import { horizonKey, useHorizonRev } from '../queryClient'
import { BottomNav as BottomNavView } from './ui/BottomNav'
import { useFixedPiece } from './ui/fixedBottom'
import { useKeyboardOpen } from './ui/keyboard'

/**
 * Barra inferior fija del teléfono (docs/navegacion.md §5, fase G), con el aspecto de E3 (`ui/BottomNav`,
 * docs/visual.md §6.3; PR 11): sus iconos y la regla de los rótulos cortos.
 *
 * En móvil SUSTITUYE al nivel 1 de la cabecera, que se oculta, y deja las pestañas de nivel 2 donde están,
 * desplazables: los destinos principales al alcance del pulgar. En escritorio no existe (`sm:hidden`, o sea
 * `display:none`: tampoco está en el árbol de accesibilidad, así que no duplica la fila de la cabecera).
 * Con el teclado abierto se esconde (§4.9), y se apunta en lo fijo (`useFixedPiece`): su alto medido es el
 * sitio de la `ActionBar` y parte del relleno de abajo del marco.
 */
export function BottomNav() {
  // Como la cabecera: con la sesión sin saber y la marca, la barra del jugador (§12.1; PR 4), y el
  // resumen solo con la sesión confirmada.
  const { state, signedIn } = useSessionState()
  const { pathname } = useLocation()
  // Misma consulta (y misma caché) que la cabecera: saber si pertenezco a un equipo no cuesta una
  // petición extra.
  const rev = useHorizonRev()
  const summary = useQuery({
    queryKey: horizonKey(['rider', 'summary'], rev),
    queryFn: fetchRiderSummary,
    enabled: state === 'signed-in' && rev !== undefined,
  })
  const teclado = useKeyboardOpen()
  const ref = useFixedPiece('nav')

  const links = bottomBarLinks({ signedIn, hasTeam: Boolean(summary.data?.teamId) })
  return (
    <BottomNavView
      ref={ref}
      items={links.map((l) => ({
        key: l.section,
        to: l.to,
        label: l.label,
        shortLabel: l.shortLabel,
        icon: l.icon,
      }))}
      activeKey={sectionOf(pathname)}
      hidden={teclado}
    />
  )
}
