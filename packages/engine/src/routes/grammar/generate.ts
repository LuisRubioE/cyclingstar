/**
 * PETICIÓN Y SALIDA DE `generateStage` (docs/generador.md §3.7).
 *
 * `StageRequest` es todo lo que el generador sabe de la etapa; `GeneratedStage` es el perfil que ve
 * el motor más la ficha (`arch`) que ven la pantalla y el banco.
 *
 * Paso 0: nació `RouteSource`, porque `RouteStats` del censo la cita. Paso 1: el resto de tipos, sin
 * ningún `import` con valor (el de `stageKindOf` llega con `labelDe`). Paso 5: `generateStage`,
 * `labelDe` y `ETIQUETAS_DE_ESQUELETO`; paso 6: `raceRouteSourceOf`.
 */
import type { EdicionCfg } from '../../constants.js'
import type { StageProfile } from '../../stage/types.js'
import type { RaceFormat } from '../calendar.js' // solo tipo, sentencia `import type` entera (§3.8)
import type { RouteTerrain } from '../featureProfile.js'
import type { FinalKind } from '../finalKind.js'
import type { StageKind } from '../testTour.js'
import type { RaceClass } from '../uci.js'
import type { GeoSignature, GeoZone } from './geo.js'
import type { Motif } from './motifs.js'
import type { SkeletonId } from './skeletons.js'
import type { StageRole } from './tour.js'
import type { Veto } from './veto.js'

/** De dónde sale el recorrido de UNA etapa: rasgos reales, edición real sin rasgos o inventado. */
export type RouteSource = 'real' | 'edicion' | 'generado'

/** Origen por CARRERA, agregado de sus etapas (§3.11): `mixto` si no son todas del mismo origen. */
export type RaceRouteSource = 'real' | 'mixto' | 'generado'

export interface StageRequest {
  raceId: string
  stageIndex: number // con base 1; 1 en un día
  season: number // BASE_SEASON = 0 es la canónica y tira sus propios dados
  km: number // contrato al 0,1 si `routeSource` es `edicion`
  role: StageRole | 'un_dia'
  terrain: RouteTerrain // sesgo, nunca orden
  geo: GeoSignature // un día y edición: ZONAS[regionOf(...)]; vuelta compuesta: ZONAS[itinerario.metas[i-1]]
  desde?: GeoZone // etapa de transición (40 % con la ondulación de `desde`)
  raceClass: RaceClass
  format: RaceFormat
  routeSource: 'edicion' | 'generado'
  editionKey?: string // `${from}|${to}|${km}` de editions.ts, para la semilla de edición
  edicion?: EdicionCfg // ARCH.edicion si falta; solo lo rellena buildRace cuando calendarForSeason recibe otro cfg (§10.5)
  fixed?: { skeleton?: SkeletonId; finalKind?: FinalKind; dPlus?: number } // bancos
}

export interface GeneratedStage {
  profile: StageProfile
  kind: StageKind // = stageKindOf(profile, timeTrial).kind, garantizado por V6
  label: string // = labelDe(sk, profile, timeTrial), tras V6 (§3.3; sección 11 §11.5)
  timeTrial: boolean // = sk.timeTrial ?? false
  arch: {
    skeleton: SkeletonId
    geo: GeoZone
    motivos: Motif[]
    finalKind: FinalKind | null
    dPlus: number // dPlusDe(profile), relleno incluido
    intentos: number
    degradado: boolean
    garantiasClase: number // cuántas reglas 1 a 4 de garantizaClase tocaron la etapa (§8.9)
    rechazos: Veto[] // uno por intento fallido, en orden; [] si el primero pasó (galería, sección 16)
    frase: string // "Circuito de 14 km × 9 vueltas con un muro de 1,1 km al 11 %; meta a 2 km del muro"
    metadatos: { viento: 0 | 1 | 2 | 3; altitud: GeoSignature['altitud'] } // ficha, no física
  }
  routeSource: 'edicion' | 'generado'
}
