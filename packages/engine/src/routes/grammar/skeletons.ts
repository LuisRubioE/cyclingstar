/**
 * ESQUELETOS DE ETAPA (docs/generador.md §3.3).
 *
 * Un esqueleto es una secuencia de huecos con cardinalidad y ventana de posición: el molde de una
 * etapa. Su `kind` es una PROMESA que V6 hace cumplir, no una etiqueta.
 *
 * Paso 0: nació `SkeletonId`, porque `RouteStats` del censo la cita y las poblaciones de
 * `ROUTE_CENSUS_TARGETS` se escriben con literales de esqueleto. Paso 1: el resto de tipos y
 * `SKELETON_IDS`. Paso 4: el catálogo (`SKELETONS`, `CANONICO`…) y `candidatos`.
 */
import type { FinalKind } from '../finalKind.js'
import type { StageKind } from '../testTour.js'
import type { StageRequest } from './generate.js'
import type { GeoSignature, Relieve } from './geo.js'
import type { MetaKind, Motif, MotifKind } from './motifs.js'

/** Lo que el esqueleto exige de la zona (sección 5, §5.1); `admite` (geo.ts) es la única función que lo lee. Un campo ausente no exige nada. */
export interface Requiere {
  puerto?: true // geo.puerto !== null
  cota?: true // geo.cota !== null
  muro?: true | { adoquin: true } // geo.muro !== null; { adoquin: true } además geo.muro.adoquin
  cotaKmMin?: number // geo.cota !== null && geo.cota.km[1] >= n (3,3: una cota que saque de `clasica`)
  cotaCortaMax?: number // geo.cota !== null && geo.cota.km[0] <= n (2,9: una cota que siga siendo `clasica`; solo `ud_circuito`)
  adoquin?: 1 | 2 | 3 // geo.adoquin >= n
  sterrato?: true // geo.sterrato
  viento?: 1 | 2 | 3 // geo.viento >= n
  relieve?: Relieve // mínimo: orden(geo.relieve) >= orden(r), llano < ondulado < media < montana < alta
  finalesAlto?: 'corto' | 'largo' // 'corto': geo.finalesAlto ∈ {corto, largo}; 'largo': === 'largo'
  altitud?: GeoSignature['altitud'] // igualdad: geo.altitud === a (una disyunción se escribe como lista de Requiere)
}

export interface SlotParams extends Partial<
  Pick<Motif, 'g' | 'forma' | 'adoquin' | 'estrellas' | 'vueltas' | 'firme'>
> {
  kmRango?: [number, number] // km del motivo; en `circuito`, km de la vuelta
  gRango?: [number, number]
  estrellasRango?: [number, number] // solo `sector`
  vueltasRango?: [number, number] // solo `circuito`
  separacionRango?: [number, number] // `cadena`, `racimo`, `circuito`: enlace entre hijos (defecto ARCH.motivo.cadena/racimo)
  adoquinShare?: [number, number] // `cadena` de muros: fracción de hijos con `adoquin: true`
  firmaCount?: number // `racimo`: hijos 5★ de firma que el esqueleto reparte
}

export interface Slot {
  motif: MotifKind
  n: [number, number] // cardinalidad; 0 en el mínimo = hueco opcional
  ventana: [number, number] // fracción de la etapa (o de la vuelta o cadena, en `hijos`) donde EMPIEZA el motivo
  params?: SlotParams
  hijos?: Slot[] // solo `cadena`, `racimo`, `circuito`; `[]` en `circuito` es una vuelta de solo enlace
  firma?: boolean
}

/** Rotación declarada de nivel 2 (sección 10, §10.3): un juego de RANGOS por hueco de firma más una plantilla literal. */
export interface Alternativa {
  nombre: string // "Bérgamo", "Angliru", "Lagos": frase y diffMotivos
  meta?: MetaKind // si la opción cambia la meta; V7 exige finalKindDe(meta)
  metaParams?: { kmRango?: [number, number]; gRango?: [number, number] } // rango de `cotaFinal` de la opción
  slots?: Record<number, SlotParams> // por índice de hueco con firma: sustituyen a los `params` del hueco
  canonico: Motif[] // plantilla de la opción: galería, degradado y skeletons.test.ts
}

export interface Skeleton {
  id: SkeletonId
  kind: StageKind // lo que `stageKindOf` TIENE que devolver (V6)
  label: string // la etiqueta de la ficha; OBLIGATORIA y compatible con `kind` (test)
  timeTrial?: true // solo `et_crono`, `et_prologo`, `et_cronoescalada`, `nc_crono`
  finalKind?: FinalKind // reinas y medias con un solo final posible: lo que `finalKindOf` TIENE que devolver (V7)
  meta: MetaKind
  metaParams?: {
    aMeta?: [number, number]
    cotaFinal?: { km: [number, number]; g: [number, number] }
  } // columnas "Meta" de la sección 5
  slots: Slot[]
  dPlus: [number, number] // objetivo TOTAL, relleno incluido (ARCH.reina.dPlusIncluyeRelleno)
  km: [number, number] // rango bruto antes de ARCH.km.porClase
  requiere?: Requiere | Requiere[] // lista = alternativas ("o bien"); lo lee solo admite (geo.ts)
  pesoBase: number // peso del catálogo antes de zona y clase
  canonico: Motif[] // instancia fija escrita a mano: pasa todos los vetos por construcción
  alternativas?: Alternativa[] // rotación DECLARADA (ARCH.edicion.nivel 2): opcionDe elige (§3.8)
}

export type SkeletonId =
  // un día (16)
  | 'ud_esprint'
  | 'ud_esprint_capi'
  | 'ud_circuito'
  | 'ud_muro_final'
  | 'ud_muros'
  | 'ud_muros_adoquin'
  | 'ud_sterrato'
  | 'ud_adoquin'
  | 'ud_adoquin_ligero'
  | 'ud_montana'
  | 'ud_montana_media'
  | 'ud_repecho'
  | 'ud_montana_alto'
  | 'ud_criterium'
  | 'nc_ruta'
  | 'nc_crono'
  // etapa de vuelta (16)
  | 'et_llana'
  | 'et_llana_viento'
  | 'et_media_valle'
  | 'et_media_alto'
  | 'et_media_muro'
  | 'et_media_tendida'
  | 'et_reina_alto_largo'
  | 'et_reina_alto_corto'
  | 'et_reina_cima_cerca'
  | 'et_reina_valle'
  | 'et_reina_encadenada'
  | 'et_montana_corta'
  | 'et_reina_blanda'
  | 'et_crono'
  | 'et_prologo'
  | 'et_cronoescalada'

/** La unión como lista literal (16 de un día + 16 de etapa); `skeletons.test.ts` (paso 4) la compara con `Object.keys(SKELETONS)`. */
export const SKELETON_IDS: readonly SkeletonId[] = [
  'ud_esprint',
  'ud_esprint_capi',
  'ud_circuito',
  'ud_muro_final',
  'ud_muros',
  'ud_muros_adoquin',
  'ud_sterrato',
  'ud_adoquin',
  'ud_adoquin_ligero',
  'ud_montana',
  'ud_montana_media',
  'ud_repecho',
  'ud_montana_alto',
  'ud_criterium',
  'nc_ruta',
  'nc_crono',
  'et_llana',
  'et_llana_viento',
  'et_media_valle',
  'et_media_alto',
  'et_media_muro',
  'et_media_tendida',
  'et_reina_alto_largo',
  'et_reina_alto_corto',
  'et_reina_cima_cerca',
  'et_reina_valle',
  'et_reina_encadenada',
  'et_montana_corta',
  'et_reina_blanda',
  'et_crono',
  'et_prologo',
  'et_cronoescalada',
]

/** Lo que `cabe` y `candidatos` (paso 4) leen de la petición. */
export type Peticion = Pick<
  StageRequest,
  'role' | 'terrain' | 'geo' | 'raceClass' | 'format' | 'km' | 'routeSource'
>
