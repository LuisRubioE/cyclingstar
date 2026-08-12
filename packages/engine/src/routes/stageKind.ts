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
 * La clasificación no inventa umbrales: se calibra contra los propios generadores
 * (`routes/profileGen.ts`), que es lo que comprueba `stageKind.test.ts` sobre cientos de semillas.
 * Puro y determinista, como todo `routes/`.
 */
import type { Segment, StageProfile } from '../stage/types.js'
import type { StageKind } from './testTour.js'

export interface StageShape {
  kind: StageKind
  /** La etiqueta que usa el calendario para este tipo de etapa (`TERRAIN_KIND`). */
  label: string
}

/** Los metros que sube un segmento (solo lo que sube: las bajadas no restan). */
function climbMetres(segment: Segment): number {
  const ramps = segment.tramos
  if (!ramps || ramps.length === 0) return 0
  let m = 0
  for (const ramp of ramps) if (ramp.g > 0) m += ramp.g * ramp.km * 10
  return m
}

/** Longitud y pendiente media de la parte que sube de un segmento. */
function climbSize(segment: Segment): { km: number; g: number } {
  const ramps = (segment.tramos ?? []).filter((r) => r.g > 0)
  const km = ramps.reduce((a, r) => a + r.km, 0)
  if (km <= 0) return { km: 0, g: 0 }
  const m = ramps.reduce((a, r) => a + r.g * r.km * 10, 0)
  return { km, g: m / (km * 10) }
}

/**
 * LOS UMBRALES, MEDIDOS. Sobre 10.800 etapas de cada generador (9 kilometrajes de 130 a 215 km ×
 * 300 semillas), la cota MÁS LARGA de la etapa separa las cuatro familias sin un solo solape:
 *
 * ```
 *              cota más larga      desnivel
 *   classic      1,4 – 2,5 km    1541 – 3150 m
 *   hilly        3,3 – 7,0 km    1259 – 2955 m
 *   hillyUphill  4,0 – 8,0 km    1387 – 3078 m
 *   mountain     9,1 – 15,0 km   2303 – 4880 m
 * ```
 *
 * El desnivel acumulado, en cambio, se solapa DE PARTE A PARTE (una media montaña de 2955 m contra
 * una reina de 2303 m): por eso no decide, y solo entra como red para los recorridos REALES, que no
 * salen de estos generadores y pueden acumular 4000 m sin un puerto largo.
 */
const WALL_MAX_KM = 3
/** Puerto de alta montaña: por debajo de la reina más corta (9,1) y por encima de la media más larga (8,0). */
const PASS_MIN_KM = 8.5
/** Desnivel de reina para un recorrido real sin puerto largo: por encima de toda media generada. */
const QUEEN_MIN_CLIMB_METRES = 3200

/**
 * El tipo de etapa que dibuja un recorrido. `timeTrial` viene del snapshot y no del perfil porque
 * una crono y una llana tienen EL MISMO perfil: `ittSegments` y `flatSegments` generan lo mismo
 * (ondulación suave sin puertos), y lo único que las separa es correrla en grupo o contra el reloj.
 */
export function stageKindOf(profile: StageProfile, timeTrial: boolean): StageShape {
  if (timeTrial) return { kind: 'cri', label: 'ITT' }

  const segments = profile.segments
  if (segments.some((s) => s.tipo === 'paves')) return { kind: 'clasica', label: 'Cobbles' }

  const climbs = segments.filter((s) => s.tipo === 'puerto')
  if (climbs.length === 0) return { kind: 'llana', label: 'Flat' }

  const metres = segments.reduce((a, s) => a + climbMetres(s), 0)
  const longest = climbs.reduce((mx, s) => Math.max(mx, climbSize(s).km), 0)
  // ¿Muere arriba? El último segmento de la etapa es el puerto, sin bajada ni llano detrás: es lo
  // que hacen `mountainSegments` y `hillyUphillSegments`, y lo que decide la etiqueta del final.
  const summitFinish = segments[segments.length - 1]?.tipo === 'puerto'

  // La clásica de muros: TODO lo que sube son rampas cortas y explosivas, ni una cota de verdad. Si
  // muere arriba ya no es una clásica de muros sino un final en alto, y manda el final.
  if (!summitFinish && longest <= WALL_MAX_KM) return { kind: 'clasica', label: 'Classic' }

  if (longest >= PASS_MIN_KM || metres >= QUEEN_MIN_CLIMB_METRES) {
    return summitFinish
      ? { kind: 'reina', label: 'Summit finish' }
      : { kind: 'reina', label: 'Mountains' }
  }
  return summitFinish
    ? { kind: 'media', label: 'Uphill finish' }
    : { kind: 'media', label: 'Hills' }
}
