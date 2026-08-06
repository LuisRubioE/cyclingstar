import { Link } from 'react-router-dom'

/**
 * Enlace a la ficha de un equipo. Cualquier mención de un equipo en la web debería poder pincharse
 * para verlo (ofertas, contratos, rankings, perfil…). Si no hay `teamId` (p. ej. un agente libre),
 * cae a texto plano — o al placeholder de "sin equipo".
 */
export function TeamLink({
  teamId,
  name,
  className,
  fallback = '—',
}: {
  teamId: string | null | undefined
  name: string | null | undefined
  className?: string
  fallback?: string
}) {
  if (!name) return <span className={className}>{fallback}</span>
  if (!teamId) return <span className={className}>{name}</span>
  return (
    <Link to={`/world/teams/${teamId}`} className={`hover:underline ${className ?? ''}`}>
      {name}
    </Link>
  )
}
