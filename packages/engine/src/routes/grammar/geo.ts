/**
 * GEOGRAFÍA DE LA GRAMÁTICA (docs/generador.md §3.4).
 *
 * La firma de una zona dice qué existe y qué no, y la palabra para lo segundo es `null`.
 *
 * Paso 0: nació `GeoZone`, porque `RouteStats` del censo la cita. Paso 1: `Relieve`, `GeoSignature`
 * y `Territorio`. Paso 2: las tablas y funciones (`ZONAS`, `TERRITORIOS`, `admite`, `degradar`…).
 */
import type { Motif } from './motifs.js'
import type { SkeletonId } from './skeletons.js' // solo tipos: skeletons.ts importará valores de aquí

export type GeoZone =
  | 'flandes'
  | 'ardenas'
  | 'bretana'
  | 'francia_norte'
  | 'macizo_central'
  | 'alpes'
  | 'pirineos'
  | 'provenza'
  | 'italia_norte'
  | 'italia_centro'
  | 'dolomitas'
  | 'italia_sur'
  | 'cantabrico'
  | 'meseta'
  | 'andalucia'
  | 'levante'
  | 'portugal'
  | 'centroeuropa'
  | 'escandinavia'
  | 'britanicas'
  | 'balcanes'
  | 'anatolia'
  | 'andes'
  | 'cono_sur'
  | 'norteamerica'
  | 'australia'
  | 'asia_oriental'
  | 'golfo'
  | 'africa_llana'
  | 'montana_sur' // MY, RW, MA: sin fila en el mapa 07, juicio (sección 6 §6.2)
  | 'generico'

export type Relieve = 'llano' | 'ondulado' | 'media' | 'montana' | 'alta'

/** `null` significa "aquí no existe" y los vetos V1 a V4 lo hacen cumplir. */
export interface GeoSignature {
  zona: GeoZone
  relieve: Relieve
  puerto: { km: [number, number]; g: [number, number]; forma: Motif['forma'] } | null
  cota: { km: [number, number]; g: [number, number] } | null
  muro: { km: [number, number]; g: [number, number]; adoquin: boolean } | null
  adoquin: 0 | 1 | 2 | 3 // 0 ninguno · 1 urbano · 2 sectores · 3 masivo
  sterrato: boolean
  viento: 0 | 1 | 2 | 3 // METADATO: no llega al motor (mapa 03 §5.1)
  altitud: 'mar' | 'colina' | 'media' | 'alta' | 'altiplano' // METADATO y veto V4; no hay altitud en `Segment`
  amplitud: number // ondulación del `enlace`, en % (tope ARCH.motivo.enlace.ampMax 2,4)
  finalesAlto: 'ninguno' | 'corto' | 'largo'
  pesos: Partial<Record<SkeletonId, number>> // multiplican `Skeleton.pesoBase`
}

/** Cómo entra un país en una vuelta: su ruta ordenada de zonas y la cordillera que una vuelta de montaña tiene que atravesar. */
export interface Territorio {
  ruta: readonly { zona: GeoZone; peso: number }[] // orden = recorrido plausible por el país
  cordillera: GeoZone | null // null = el país no tiene reina; si no, la zona que una vuelta `mountain` tiene que contener
  fallback?: boolean // país sin tabla: territorio genérico, contado en test
}
