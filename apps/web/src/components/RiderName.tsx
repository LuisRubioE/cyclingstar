import { Link } from 'react-router-dom'

/**
 * Nombre de un corredor, enlazable a su ficha (#14). Los NPC (bots) van en cursiva y los humanos
 * en negrita (#9), para distinguirlos de un vistazo en cualquier listado.
 */
export function RiderName({
  riderId,
  name,
  isBot,
  className = '',
}: {
  riderId: string
  name: string
  isBot: boolean
  className?: string
}) {
  return (
    <Link
      to={`/riders/${riderId}`}
      className={`hover:text-indigo-600 hover:underline ${isBot ? 'italic' : 'font-semibold'} ${className}`}
    >
      {name}
    </Link>
  )
}
