import { Link } from 'react-router-dom'

/**
 * CÓMO SE VE QUE UN NOMBRE LLEVA A SU FICHA (v59).
 *
 * Hasta aquí el enlace solo se notaba al pasar el ratón por encima (`hover:underline`), así que en
 * una tabla de treinta nombres no había forma de saber que eran enlaces. El dueño lo pidió dos
 * veces —«te pedí que pusieras link desde los nombres de los ciclistas a su perfil… y nada»— y la
 * segunda no era que faltara el enlace: era que **no se veía**. Un subrayado punteado y flojo es la
 * pista mínima que se ve sin gritar, y en el hover pasa a ser un enlace de verdad.
 *
 * Vive aquí y lo usan también el diario y la radio, para que el mismo nombre no se pinte de tres
 * maneras según dónde salga.
 */
export const RIDER_LINK_CLASS =
  'underline decoration-dotted decoration-slate-300 underline-offset-2 hover:text-indigo-600 hover:decoration-indigo-400'

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
      to={`/world/riders/${riderId}`}
      className={`${RIDER_LINK_CLASS} ${isBot ? 'italic' : 'font-semibold'} ${className}`}
    >
      {name}
    </Link>
  )
}
