/**
 * EL «DE DÓNDE A DÓNDE» DE UNA ETAPA, escrito siempre igual.
 *
 * El dueño: «cada vez que mencione una etapa, por ejemplo desde donde se ven los resultados o desde
 * las race orders, que diga siempre el origen y destino». Lo escriben la web (cada pantalla que cita
 * una etapa) y el motor (los titulares de noticias), así que vive aquí, en un solo sitio:
 * «Tarragona → Barcelona», y una sola ciudad si salida y llegada coinciden (una crono, un circuito,
 * un campeonato), como hacía ya la ficha de carrera.
 */

/** «Salida → Llegada», o la ciudad sola si coinciden; `null` si falta alguna de las dos. */
export function stageRouteText(
  from: string | null | undefined,
  to: string | null | undefined,
): string | null {
  if (!from || !to) return null
  return from === to ? from : `${from} → ${to}`
}
