import { stageRouteText } from '@cyclingstar/shared'

/**
 * DE DÓNDE A DÓNDE VA UNA ETAPA, al lado de su número. El dueño: «cada vez que mencione una etapa,
 * por ejemplo desde donde se ven los resultados o desde las race orders, que diga siempre el origen y
 * destino». Toda pantalla que cita una etapa concreta lo pinta con esto, para que se lea igual en
 * todas: «Tarragona → Barcelona», o una sola ciudad si salida y llegada coinciden. No pinta nada si
 * la etapa no tiene ciudades.
 */
export function StageRoute({
  from,
  to,
  className = 'text-slate-500',
}: {
  from: string | null | undefined
  to: string | null | undefined
  className?: string
}) {
  const text = stageRouteText(from, to)
  if (text === null) return null
  return <span className={className}>{text}</span>
}
