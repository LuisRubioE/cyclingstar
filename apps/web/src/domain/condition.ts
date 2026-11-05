/**
 * La condición del corredor tal como se le enseña al jugador.
 *
 * Regla del proyecto (MVP.md Paso 20 y packages/shared/src/rider.ts): «la forma en estrellas y la
 * frescura en barra, NUNCA números internos». Las dos magnitudes que entiende un jugador, el FONDO (el
 * construido, `fitnessFactor`) y la FRESCURA (lo descansado que está hoy, `freshnessBar`), llegan ya hechas
 * de la API desde el 19b de E3, en barras enteras de 0 a 100 (`GET /api/riders/me/form`; docs/visual.md
 * §13.5): el diario del Banister, con su `ctl`, su `atl` y su `tsb`, ya no cruza. Un ATL de 118 no
 * significaba nada para el dueño del corredor, y encima se salía de cualquier escala de 0 a 100.
 *
 * Aquí queda lo que la web pone encima: la palabra de cada barra y los segmentos del medidor. Lógica pura y
 * probada; la página solo pinta.
 */

/**
 * Etiqueta cualitativa de una magnitud 0-100. Cinco escalones, para que el jugador lea una palabra
 * y no un número: es lo que hace legible «freshness 34» sin inventarse una escala nueva.
 */
export function conditionLabel(value: number): string {
  if (value >= 80) return 'Excellent'
  if (value >= 60) return 'Good'
  if (value >= 40) return 'Fair'
  if (value >= 20) return 'Low'
  return 'Very low'
}

/**
 * Los segmentos llenos del `Meter` de cuatro (§4.8; 19b), de 0 a 4: los mismos escalones que la palabra,
 * ninguno en `Very low` y los cuatro en `Excellent`, para que el medidor y su palabra no se contradigan.
 */
export function conditionLevel(value: number): 0 | 1 | 2 | 3 | 4 {
  if (value >= 80) return 4
  if (value >= 60) return 3
  if (value >= 40) return 2
  if (value >= 20) return 1
  return 0
}
