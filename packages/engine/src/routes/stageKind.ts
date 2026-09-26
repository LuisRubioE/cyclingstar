/**
 * QUÉ CLASE DE ETAPA ES UN RECORRIDO, leído del propio recorrido.
 *
 * El calendario asigna el tipo de cada etapa (`llana`, `media`, `reina`, `cri`, `clasica`) a la vez
 * que le genera el perfil, así que normalmente no hace falta deducirlo: viene con la ficha. Pero el
 * perfil de una etapa CORRIDA se congela en su snapshot mientras que la ficha del calendario se
 * recalcula desde el código en cada petición, y si el generador de recorridos cambia —una mezcla de
 * etapas distinta, una edición real que antes era inventada—, la ficha de hoy deja de describir la
 * carrera que se corrió. Visto en producción, Race Sharjah etapa 4: la ficha dice «crono de 15 km»
 * sobre una crónica de 170 km con fuga, dos cimas y sprint masivo, y la página anuncia un ganador
 * a 3,5 km/h. Cuando eso pasa, el tipo hay que sacarlo del recorrido que SÍ se corrió.
 *
 * La clasificación no inventa umbrales: se calibró contra los generadores de recorridos, y desde la
 * v87 `stageKind.test.ts` comprueba que cada esqueleto de la gramática cae en su clase sobre cientos
 * de semillas. Puro y determinista, como todo `routes/`.
 */
import type { Segment, StageProfile } from '../stage/types.js'
import type { StageKind } from './testTour.js'

export interface StageShape {
  kind: StageKind
  /** La etiqueta que usa el calendario para este tipo de etapa (`TERRAIN_KIND`). */
  label: string
}

/** Los metros que sube un segmento (solo lo que sube: las bajadas no restan). */
export function climbMetres(segment: Segment): number {
  const ramps = segment.tramos
  if (!ramps || ramps.length === 0) return 0
  let m = 0
  for (const ramp of ramps) if (ramp.g > 0) m += ramp.g * ramp.km * 10
  return m
}

/** Longitud y pendiente media de la parte que sube de un segmento. */
export function climbSize(segment: Segment): { km: number; g: number } {
  const ramps = (segment.tramos ?? []).filter((r) => r.g > 0)
  const km = ramps.reduce((a, r) => a + r.km, 0)
  if (km <= 0) return { km: 0, g: 0 }
  const m = ramps.reduce((a, r) => a + r.g * r.km * 10, 0)
  return { km, g: m / (km * 10) }
}

/**
 * LOS UMBRALES, MEDIDOS. Se calibraron en la v64 sobre 10.800 etapas de cada generador viejo, donde
 * la cota más larga separaba las familias sin solape (clásica 1,4 a 2,5 km; media 3,3 a 8,0; reina
 * 9,1 a 15,0). Desde la v87 el calendario lo dibuja la gramática, que NO los recalibra (decisión 26):
 * cada esqueleto se acota con holgura para caber en ellos (`cota` hasta 8,0 y `puerto` desde 9,0
 * alrededor de `PASS_MIN_KM`; `muro` hasta 2,5 bajo `WALL_MAX_KM`). Medido en la v88 con el
 * barrido de `stageKind.test.ts` (20 semillas × 3 zonas × 5 km por esqueleto; sin cronos ni pavé,
 * que se clasifican antes de mirar ninguna subida, ni etapas sin puerto, que son llanas). El
 * desnivel es el que suma `stageKindOf` (`climbMetres` de todos los segmentos):
 *
 * ```
 *              etapas   cota más larga    desnivel acumulado
 *   clásica       740    0,5 a 2,7 km        857 a 3468 m
 *   media        2500    1,3 a 8,0 km        637 a 2898 m
 *   reina        2700    9,0 a 25,0 km      1194 a 5405 m
 * ```
 *
 * Media y reina no se tocan: 8,0 contra 9,0 a los dos lados de `PASS_MIN_KM`. Clásica y media sí se
 * solapan en la cota más larga, porque una cota corta que muere en meta es media (`meteEnAlto`). El
 * desnivel acumulado se solapa DE PARTE A PARTE (una clásica de muros de 3.468 m contra una reina
 * blanda de 1.194): por eso no decide, y solo entra como red para los recorridos REALES, que no salen
 * de la gramática y pueden acumular 4000 m sin un puerto largo.
 */
export const WALL_MAX_KM = 3
/** Puerto de alta montaña: por debajo de la reina más corta (9,0) y por encima de la media más larga (8,0). */
export const PASS_MIN_KM = 8.5
/** Desnivel de reina para un recorrido real sin puerto largo: por encima de toda media generada. */
export const QUEEN_MIN_CLIMB_METRES = 3200

/**
 * CUÁNTA CARRETERA TRAS LA ÚLTIMA CIMA deja de ser un final en alto, y no es un número de gusto:
 * sale de correr las etapas del calendario y mirar quién gana. Vivía en `apps/api/src/stageHistory.ts`
 * y se mueve aquí sin cambios en la v87 (docs/generador.md §11.5 regla 2, decisión 23), para que la
 * etiqueta del final tenga UNA sola regla: la del clasificador, la de la ficha y la del etiquetador.
 *
 * No puede ser cero. Los perfiles construidos con los rasgos REALES de la etapa colocan cada puerto
 * en su kilómetro de coronación, así que un final en alto de verdad suele quedar con una cola de
 * redondeo detrás (Race France e15, el Plateau de Solaison, deja 0,1 km) y el test ingenuo de «el
 * último segmento es un puerto» lo degradaría. Y no puede ser grande: por encima de 5 km la etapa
 * deja de comportarse como un final en alto.
 *
 * Medido sobre las 19 etapas del calendario que anuncian final en alto con carretera detrás, 4
 * corridas cada una, contra un control de 24 finales en alto de verdad (mediana 1 juntos en meta,
 * 14 % de victorias de un velocista):
 *
 * ```
 *   cola ≤ 5 km   mediana 3 juntos en meta   velocista gana el 15 %   ← indistinguible del control
 *   cola > 5 km   mediana 17 juntos en meta  velocista gana el 46 %
 * ```
 */
export const SUMMIT_RUN_IN_KM = 5

/** Kilómetros de carretera tras la última cima (el último segmento `puerto`, de cualquier longitud); `Infinity` si la etapa no tiene ni un puerto. */
export function runInAfterLastClimb(segments: readonly Segment[]): number {
  let last = -1
  for (let i = segments.length - 1; i >= 0; i--) {
    if (segments[i]?.tipo === 'puerto') {
      last = i
      break
    }
  }
  if (last < 0) return Number.POSITIVE_INFINITY
  let km = 0
  for (let i = last + 1; i < segments.length; i++) km += segments[i]?.km ?? 0
  return km
}

/**
 * El tipo de etapa que dibuja un recorrido. `timeTrial` viene del snapshot y no del perfil porque
 * una crono y una llana pueden tener EL MISMO perfil (ondulación suave sin puertos), y lo único que
 * las separa es correrla en grupo o contra el reloj.
 *
 * Dos variables donde antes había una (v87, §11.5 regla 2): `meteEnAlto` (el último segmento es el
 * puerto) decide SOLO la rama de la clásica, como siempre; `cimaCerca` (la última cima a
 * ≤ `SUMMIT_RUN_IN_KM` de meta) decide SOLO la etiqueta del final. `kind` no cambia de regla
 * (decisión 26), y como `meteEnAlto` implica `cimaCerca`, nada que antes fuera «Summit finish» o
 * «Uphill finish» deja de serlo.
 */
export function stageKindOf(profile: StageProfile, timeTrial: boolean): StageShape {
  if (timeTrial) return { kind: 'cri', label: 'ITT' }

  const segments = profile.segments
  if (segments.some((s) => s.tipo === 'paves')) return { kind: 'clasica', label: 'Cobbles' }

  const climbs = segments.filter((s) => s.tipo === 'puerto')
  if (climbs.length === 0) return { kind: 'llana', label: 'Flat' }

  const metres = segments.reduce((a, s) => a + climbMetres(s), 0)
  const longest = climbs.reduce((mx, s) => Math.max(mx, climbSize(s).km), 0)
  // ¿Muere arriba? El último segmento de la etapa es el puerto, sin bajada ni llano detrás.
  const meteEnAlto = segments[segments.length - 1]?.tipo === 'puerto'
  // ¿Corona cerca de la meta? Es lo que decide la etiqueta del final (la regla de la ficha).
  const cimaCerca = runInAfterLastClimb(segments) <= SUMMIT_RUN_IN_KM

  // La clásica de muros: TODO lo que sube son rampas cortas y explosivas, ni una cota de verdad. Si
  // muere arriba ya no es una clásica de muros sino un final en alto, y manda el final.
  if (!meteEnAlto && longest <= WALL_MAX_KM) return { kind: 'clasica', label: 'Classic' }

  if (longest >= PASS_MIN_KM || metres >= QUEEN_MIN_CLIMB_METRES) {
    return cimaCerca
      ? { kind: 'reina', label: 'Summit finish' }
      : { kind: 'reina', label: 'Mountains' }
  }
  return cimaCerca ? { kind: 'media', label: 'Uphill finish' } : { kind: 'media', label: 'Hills' }
}
