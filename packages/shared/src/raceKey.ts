/**
 * Clave de almacenamiento de una carrera frente a su identificador.
 *
 * Los resultados, la general y los snapshots se indexan por `raceKey`, que lleva la temporada
 * pegada: `${raceId}:s${season}` (por ejemplo `race-flanders:s0`). La única excepción era la vuelta
 * de prueba del MVP (`test-tour`, retirada el 02/10/2026), cuya clave no llevaba sufijo.
 *
 * El identificador que entiende la API y que va en las URLs es el `raceId` **sin** sufijo, y su
 * validación exige forma de slug (`^[a-z0-9]+(?:-[a-z0-9]+)*$`), así que los dos puntos de la clave
 * la hacen fallar. Enlazar directamente con la clave almacenada producía un error de carga en las
 * cuatro pantallas que muestran resultados pasados.
 */

/** Separa una clave de almacenamiento en su carrera y su temporada. */
export function parseRaceKey(raceKey: string): { raceId: string; season: number | null } {
  const m = /^(.*):s(\d+)$/.exec(raceKey)
  if (!m || !m[1]) return { raceId: raceKey, season: null }
  return { raceId: m[1], season: Number(m[2]) }
}

/**
 * Identificador de carrera apto para una URL o para la API, a partir de una clave almacenada.
 * Si la clave no lleva temporada (ya es un id), se devuelve tal cual.
 */
export function raceIdFromKey(raceKey: string): string {
  return parseRaceKey(raceKey).raceId
}
