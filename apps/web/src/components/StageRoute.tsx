import { stageRouteText } from '@cyclingstar/shared'

/**
 * DE DÓNDE A DÓNDE VA UNA ETAPA, al lado de su número. El dueño: «cada vez que mencione una etapa,
 * por ejemplo desde donde se ven los resultados o desde las race orders, que diga siempre el origen y
 * destino». Toda pantalla que cita una etapa concreta lo pinta con esto, para que se lea igual en
 * todas: «Tarragona → Barcelona», o una sola ciudad si salida y llegada coinciden. No pinta nada si
 * la etapa no tiene ciudades. Con su `data-ui` desde el PR 12b (E3, docs/visual.md §16.3): los tests la
 * buscan por él y no por su clase.
 */
export function StageRoute({
  from,
  to,
  className = 'text-ink-2',
}: {
  from: string | null | undefined
  to: string | null | undefined
  className?: string
}) {
  const text = stageRouteText(from, to)
  if (text === null) return null
  return (
    <span data-ui="StageRoute" className={className}>
      {text}
    </span>
  )
}
