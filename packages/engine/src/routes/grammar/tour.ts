/**
 * COMPOSICIÓN DE UNA VUELTA (docs/generador.md §3.6 y sección 7).
 *
 * El papel de cada etapa es IDENTIDAD (decisión 20): lo decide `itinerarioDe` en el subflujo
 * `arch|raceId` sin `season`, y la edición no lo mueve.
 *
 * Paso 1: solo los tipos. Paso 5: `kmDe`; paso 7: `TOUR_SKELETONS`, `tourSkeletonDe`, `garantias`,
 * `itinerarioDe`, `DEFAULT_ROUTE_CONTEXT`, `ventanaReina` y `composeTour`.
 */
import type { EdicionCfg } from '../../constants.js' // RouteContext.edicion (sección 15, §15.8)
import type { RaceFormat } from '../calendar.js' // SOLO tipos, sentencia `import type` entera: se borra al compilar (§3.8)
import type { RaceClass } from '../uci.js'
import type { GeoZone, Relieve } from './geo.js'

export type StageRole =
  | 'llana'
  | 'llana_viento'
  | 'media'
  | 'media_alto'
  | 'media_muro'
  | 'reina_alto'
  | 'reina_valle'
  | 'reina_encadenada'
  | 'montana_corta'
  | 'cri'
  | 'prologo'
  | 'cronoescalada'

export type TourSkeletonId = 'vu_corta' | 'vu_semana' | 'vu_larga' | 'vu_gran_vuelta'

/** Reparación determinista de los papeles ya sorteados, de atrás hacia delante (sección 7, §7.2). */
export interface BlockRule {
  id:
    | 'reinaTarde'
    | 'bloqueMontana'
    | 'llanasEntreBloques'
    | 'maxCronos'
    | 'maxFinalesAlto'
    | 'descansos'
  aplica: (n: number) => boolean
  repara: (roles: StageRole[], zonas: GeoZone[]) => StageRole[] // pura; devuelve copia; de atrás hacia delante
}

/** Pesos relativos: no tienen que sumar 1 (se normalizan al sortear) y una clave ausente pesa 0. */
export type Weighted<T extends string> = Partial<Record<T, number>>

export interface TourSkeleton {
  id: TourSkeletonId
  n: [number, number]
  bloques: BlockRule[]
  primera: Weighted<StageRole> // `primera.prologo` es la p del prólogo (0,25; D3)
  ultima: Weighted<StageRole> | 'ROUTE.lastDecisiveChance'
  pesos: Record<Relieve, Weighted<StageRole>> // ARCH.pesosComposicion
}

export interface Itinerario {
  metas: GeoZone[] // zona de la meta de cada etapa
  papeles: StageRole[]
  km: number[] // ya con ARCH.km.porClase, maxPorClase y ROUTE.lastStageKmFactor
  desde: GeoZone[] // desde[0] = metas[0]; desde[i] = metas[i-1]; desde[i] !== metas[i] es transición
  notas: string[] // reparaciones anotadas ("e5: reina → media_alto, ventana sin cordillera"), decisión 18
}

/** Lo que `stageMix` y `composeTour` saben de la carrera; `StageRequest` lo extiende por etapa. */
export interface RouteContext {
  raceId?: string // si falta, `stageMix` usa `seedBase` como raceId
  country: string | null // ISO alpha-2; null → FALLBACK (zona `generico`)
  raceClass: RaceClass
  format: RaceFormat
  season: number
  edicion?: EdicionCfg // ARCH.edicion si falta; composeTour lo copia a cada StageRequest (§15.8); DEFAULT_ROUTE_CONTEXT no lo lleva
}

/** Papeles que `kmDe` admite: los de vuelta más tres que solo usan `buildRace` y `nationalChampionships`. */
export type KmRole = StageRole | 'un_dia' | 'un_dia_u23' | 'cri_u23'
