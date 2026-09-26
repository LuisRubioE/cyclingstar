/**
 * COMPOSICIÓN DE UNA VUELTA (docs/generador.md §3.6 y sección 7).
 *
 * El papel de cada etapa es IDENTIDAD (decisión 20): lo decide `itinerarioDe` en el subflujo
 * `arch|raceId` sin `season`, y la edición no lo mueve.
 *
 * Paso 1: solo los tipos. Paso 5: `kmDe`; paso 7: `TOUR_SKELETONS`, `tourSkeletonDe`, `garantias`,
 * `itinerarioDe`, `DEFAULT_ROUTE_CONTEXT`, `ventanaReina` y `composeTour`.
 */
import { ARCH, ROUTE, type EdicionCfg } from '../../constants.js' // EdicionCfg: RouteContext.edicion (§15.8)
import type { RaceFormat } from '../calendar.js' // SOLO tipos, sentencia `import type` entera: se borra al compilar (§3.8)
import type { RaceClass } from '../uci.js'
import type { GeoZone, Relieve } from './geo.js'
import { SKELETONS } from './skeletons.js'

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

/** Las cronos no se acortan en la última etapa (hoy `mixKm` tampoco lo hace). */
const esCrono = (role: KmRole): boolean =>
  role === 'cri' || role === 'cri_u23' || role === 'prologo' || role === 'cronoescalada'

/** `[min, amplitud]` de la crono de vuelta, la de `mixKm` de hoy: larga desde `ROUTE.ittLongStages` etapas. */
const cronoDeVuelta = (n: number): readonly [number, number] =>
  n >= ROUTE.ittLongStages
    ? [ROUTE.ittLongKmMin, ROUTE.ittLongKmRange]
    : [ROUTE.ittKmMin, ROUTE.ittKmRange]

/** El rango bruto de un esqueleto como `[min, amplitud]`: prólogo y cronoescalada miden lo de su esqueleto, no lo de la clase. */
const deEsqueleto = (km: readonly [number, number]): readonly [number, number] => [
  km[0],
  km[1] - km[0],
]

/**
 * Km de una etapa por clase y papel (sección 7, §7.4; decisión 36): `min + rand() · amplitud` de la
 * celda de `ARCH.km.porClase`, la última etapa de una vuelta × `ROUTE.lastStageKmFactor` (salvo
 * cronos), recortada a `ARCH.km.maxPorClase` y redondeada al km. Una tirada de `rand`. La crono de
 * vuelta sigue en `ROUTE.itt*` como hoy (por `n`); prólogo y cronoescalada miden lo de su esqueleto;
 * los cuatro nacionales tienen su columna en `NC`. Un papel sub-23 fuera de `NC`, o uno de vuelta en
 * `NC`, lanza: esa carrera no existe. Adelantada del paso 7 al 5 porque la galería la necesita.
 */
export function kmDe(
  role: KmRole,
  raceClass: RaceClass,
  n: number,
  last: boolean,
  rand: () => number,
): number {
  let celda: readonly [number, number]
  if (raceClass === 'NC') {
    const nc = ARCH.km.porClase.NC
    if (role === 'un_dia') celda = nc.ruta
    else if (role === 'un_dia_u23') celda = nc.rutaU23
    else if (role === 'cri') celda = nc.crono
    else if (role === 'cri_u23') celda = nc.cronoU23
    else throw new Error(`kmDe: el papel ${role} no existe en un campeonato nacional`)
  } else {
    if (role === 'un_dia_u23' || role === 'cri_u23')
      throw new Error(
        `kmDe: ${role} solo existe en los campeonatos nacionales (clase ${raceClass})`,
      )
    const fila = ARCH.km.porClase[raceClass]
    switch (role) {
      case 'llana':
      case 'llana_viento':
        celda = fila.llana
        break
      case 'media':
      case 'media_alto':
      case 'media_muro':
        celda = fila.media
        break
      case 'reina_alto':
      case 'reina_valle':
      case 'reina_encadenada':
        celda = fila.reina
        break
      case 'montana_corta':
        celda = fila.corta
        break
      case 'un_dia':
        celda = fila.unDia
        break
      case 'cri':
        celda = cronoDeVuelta(n)
        break
      case 'prologo':
        celda = deEsqueleto(SKELETONS.et_prologo.km)
        break
      case 'cronoescalada':
        celda = deEsqueleto(SKELETONS.et_cronoescalada.km)
        break
    }
  }
  const [min, amplitud] = celda
  let km = min + rand() * amplitud
  if (last && !esCrono(role)) km *= ROUTE.lastStageKmFactor
  return Math.round(Math.min(km, ARCH.km.maxPorClase[raceClass]))
}
