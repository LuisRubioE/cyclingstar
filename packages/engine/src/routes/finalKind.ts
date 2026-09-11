import type { StageProfile } from '../stage/types.js'

/**
 * LA GEOMETRÍA DEL FINAL DE UNA ETAPA DE MONTAÑA (docs/tactica.md §7.5, paso 0).
 *
 * **Es la función que nadie definía**, y de la que colgaban tres cosas a la vez: la hipótesis de
 * R28.2 («el escalador gana menos cuanto más valle queda tras la última cota»), el reparto
 * `queenFinalKindMix` que el paso 1 quiere justificar, y la partición de `medianLeadGroupRiders` en
 * `realQueens`, donde el tipo de final no lo pone ningún generador y hay que LEERLO del recorrido.
 *
 * Tres consumidores citándola y ninguno pudiéndola llamar es exactamente la clase de agujero que
 * este rediseño lleva persiguiendo: una hipótesis que no se puede medir no es una hipótesis, es una
 * opinión con nombre técnico.
 *
 * Es **pura y de geometría**, no de simulación: cuesta lo que cuesta recorrer los segmentos, así que
 * se puede correr sobre las ~157 reinas del calendario entero sin pensárselo. Lo caro es el
 * win-rate, no esto.
 */

export type FinalKind = 'alto' | 'cima_cerca' | 'valle_corto' | 'valle_largo'

/**
 * Los cuatro cortes, en km desde la última cota hasta la meta. Salen de §7.5 y R28.2 los reutiliza.
 *
 * `alto` es el final en alto de verdad —se cruza la pancarta y se acaba—; `cima_cerca` deja el
 * descenso justo para que un escalador aguante; a partir de ahí el valle empieza a devolver la
 * carrera a los que ruedan, y `valle_largo` es la etapa que el aficionado recuerda como «se lo
 * cazaron abajo».
 */
export const FINAL_KIND_CUTS = { alto: 0.5, cimaCerca: 5, valleCorto: 20 } as const

/** La puerta de «esto es un puerto y no una cuesta»: la misma de R28.1(c). */
export const CLIMB_MIN_KM = 1.5

/**
 * El km de la ÚLTIMA COTA de la etapa, o `null` si no hay ninguna.
 *
 * Se busca en dos sitios y en este orden, que no es arbitrario: primero la última pancarta `cima`
 * de `profile.banners` —si el recorrido trae cotas puntuables, ésas son LAS cotas, con su km oficial—
 * y solo si no hay ninguna se cae al último segmento `puerto` de al menos `CLIMB_MIN_KM`, cuyo final
 * se calcula acumulando los segmentos anteriores.
 *
 * Si no hay ni lo uno ni lo otro, la etapa **no es de montaña** y devuelve `null`: preguntarle a una
 * llana por su última cota es la clase de pregunta cuya respuesta correcta es «ninguna», no «cero».
 */
export function lastClimbKm(profile: StageProfile): number | null {
  const cimas = (profile.banners ?? []).filter((b) => b.tipo === 'cima')
  if (cimas.length > 0) return Math.max(...cimas.map((b) => b.km))

  let km = 0
  let ultima: number | null = null
  for (const s of profile.segments) {
    km += s.km
    if (s.tipo === 'puerto' && s.km >= CLIMB_MIN_KM) ultima = km
  }
  return ultima
}

/** Longitud total de la etapa, sumando los segmentos (el perfil no la guarda aparte). */
export function profileKm(profile: StageProfile): number {
  return profile.segments.reduce((a, s) => a + s.km, 0)
}

/** Km de valle entre la última cota y la meta, o `null` si la etapa no tiene cotas. */
export function kmAfterLastClimb(profile: StageProfile): number | null {
  const cota = lastClimbKm(profile)
  if (cota === null) return null
  return Math.max(0, profileKm(profile) - cota)
}

/**
 * En qué cubeta cae el final de esta etapa. `null` si no es de montaña.
 *
 * Los cortes van con `≤`, así que una cota clavada en meta (0 km) es `alto` y una a exactamente 20
 * km es `valle_corto`. Que los bordes estén escritos importa: `queenFinalKindMix` compara repartos y
 * un corte movido medio kilómetro cambia la tabla sin que nadie lo haya decidido.
 */
export function finalKindOf(profile: StageProfile): FinalKind | null {
  const tras = kmAfterLastClimb(profile)
  if (tras === null) return null
  if (tras <= FINAL_KIND_CUTS.alto) return 'alto'
  if (tras <= FINAL_KIND_CUTS.cimaCerca) return 'cima_cerca'
  if (tras <= FINAL_KIND_CUTS.valleCorto) return 'valle_corto'
  return 'valle_largo'
}
