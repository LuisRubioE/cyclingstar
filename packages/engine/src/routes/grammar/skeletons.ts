/**
 * ESQUELETOS DE ETAPA (docs/generador.md §3.3 y sección 5).
 *
 * Un esqueleto es una secuencia de huecos con cardinalidad y ventana de posición: el molde de una
 * etapa. Su `kind` es una PROMESA que V6 hace cumplir, no una etiqueta.
 *
 * Paso 0: nació `SkeletonId`, porque `RouteStats` del censo la cita y las poblaciones de
 * `ROUTE_CENSUS_TARGETS` se escriben con literales de esqueleto. Paso 1: el resto de tipos y
 * `SKELETON_IDS`. Paso 4: el catálogo (`SKELETONS`, `CANONICO`, `NC_RUTA_CLASICA`), las tablas de
 * elección (`SESGO_TERRENO`, `ESCALON_TERRENO`, `ESCALON_ROLE`, `POR_TERRENO_EDICION`) y las
 * funciones que las leen (`degradarPapel`, `skeletonFor`, `cabe`, `candidatos`). Paso 5: las cuatro
 * funciones de la `cotaFinal` (regla 2 de §5.1), que leen claves de `ARCH.veto` de ese paso, y la
 * deuda de `dPlus` del paso 4 saldada (docs/balance.md, vN §0, anexo del paso 5): el suelo de los
 * esqueletos no reina se re-deriva con 3,0 m/km de relleno en vez de 5,5; en los reina el suelo no
 * baja y la canónica se endurece dentro de `ARCH.motivo` (`ud_montana`, `et_reina_alto_corto`,
 * `et_reina_cima_cerca`), y `ud_montana_alto` baja su Ventoux al 6 % para caber en V4c.
 *
 * Las tablas son DATOS de intención (sección 12): se corrigen como dato cuando la galería (sección
 * 16) diga que algo no se parece a lo real. Las filas son las de §5.2 y §5.3; las plantillas, las de
 * §5.4; las rotaciones de nivel 2, las de §5.5. Cómo se leen los huecos, decidido aquí porque la
 * notación de las tablas no lo fija:
 *  - la `meta` NO es un hueco (§5.2: «es el último motivo de todo esqueleto, siempre de firma»): vive
 *    en `Skeleton.meta` y `metaParams`, y los índices de `slots` son los que citan `Alternativa.slots`
 *    y `Instancia.slot` (en `ud_montana`, `[0 enlace, 1 puerto (firma), 2 cota]`, §5.5);
 *  - los huecos van en el orden de su ventana (el `a` de `ventana`), que es el que usa `colocar`;
 *  - un hueco sin cardinalidad en la tabla (`enlace@[0; 0,45]`) es `n: [1, 1]`, y uno de hijos sin
 *    ventana (`{ muro×[3; 8] }` en una cadena) tiene la ventana entera de la cadena, `[0, 1]`;
 *  - lo que la tabla dice solo de la PRIMERA instancia de un hueco («la primera km [3,3; 8,0]», «la
 *    última km [3,3; 4,2]») no cabe en `SlotParams` y lo aplica `instanciar` (paso 5); aquí va en el
 *    comentario de la fila.
 */
import { ARCH } from '../../constants.js'
import type { EditionTerrain } from '../editions.js'
import type { RouteTerrain } from '../featureProfile.js'
import type { FinalKind } from '../finalKind.js'
import { WALL_MAX_KM } from '../stageKind.js'
import type { StageKind } from '../testTour.js'
import type { StageRequest } from './generate.js'
import { admite, type GeoSignature, type Relieve } from './geo.js'
import type { MetaKind, Motif, MotifKind } from './motifs.js'
import type { StageRole } from './tour.js'

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

/** La unión como lista literal (16 de un día + 16 de etapa); `skeletons.test.ts` la compara con `Object.keys(SKELETONS)`. */
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

/** Lo que `cabe` y `candidatos` leen de la petición. */
export type Peticion = Pick<
  StageRequest,
  'role' | 'terrain' | 'geo' | 'raceClass' | 'format' | 'km' | 'routeSource'
>

// ---------------------------------------------------------------------------------------------------
// Plantillas canónicas (§5.4): constructores de una línea y una instancia fija por esqueleto.
// ---------------------------------------------------------------------------------------------------

/**
 * La cota más corta que saca una etapa de `clasica`: `WALL_MAX_KM` 3 del clasificador más
 * `ARCH.veto.margenClaseKm` 0,3 (regla 1 de §5.1). Es el `cotaKmMin` de la columna `requiere` y el
 * umbral con que `skeletonFor` pasa `nc_ruta` a su variante clásica.
 */
const COTA_MEDIA_KM = Math.round((WALL_MAX_KM + ARCH.veto.margenClaseKm) * 10) / 10

const suma = (xs: (Motif | number)[]): number =>
  Math.round(xs.reduce<number>((a, x) => a + (typeof x === 'number' ? x : x.km), 0) * 10) / 10
const E = (km: number): Motif => ({ kind: 'enlace', km })
const X = (km: number): Motif => ({ kind: 'expuesto', km })
const T = (km: number, g: number): Motif => ({ kind: 'tendida', km, g })
const C = (km: number, g: number): Motif => ({ kind: 'cota', km, g })
const P = (km: number, g: number, firma = false): Motif => ({
  kind: 'puerto',
  km,
  g,
  forma: 'regular',
  firma,
})
const M = (km: number, g: number, adoquin = false): Motif => ({ kind: 'muro', km, g, adoquin })
const D = (km: number): Motif => ({ kind: 'descenso', km, g: -5 })
const S = (
  km: number,
  estrellas: number,
  firme: 'adoquin' | 'tierra' = 'adoquin',
  firma = false,
): Motif => ({ kind: 'sector', km, estrellas, firme, firma })
/** `sep` son los enlaces internos (hijos.length − 1); `km` es la suma de todo. */
const CAD = (hijos: Motif[], sep: number[]): Motif => ({
  kind: 'cadena',
  km: suma([...hijos, ...sep]),
  hijos,
  separaciones: sep,
})
const RAC = (hijos: Motif[], sep: number[]): Motif => ({
  kind: 'racimo',
  km: suma([...hijos, ...sep]),
  hijos,
  separaciones: sep,
})
/** `sep[h]` es el enlace ANTES del hijo h; `kmVuelta − Σ hijos − Σ sep` (≥ 1,5) cierra la vuelta. */
const K = (
  kmVuelta: number,
  vueltas: number,
  hijos: Motif[],
  sep: number[],
  firma = false,
): Motif => ({ kind: 'circuito', km: kmVuelta, vueltas, hijos, separaciones: sep, firma })
/** `km` del meta: en `cima_cerca`, `descenso_meta` y `valle` es `cotaFinal.km` + valle; en `muro_meta`,
 *  `ARCH.meta.muro.aproxKm` 2 + `cotaFinal.km`; en `alto_*` y `repecho`, `cotaFinal.km`; en `esprint`,
 *  el llano final; en `sector_meta`, sector (`hijos[0]`) + llano. */
const META = (
  meta: MetaKind,
  km: number,
  cotaFinal?: { km: number; g: number },
  hijos?: Motif[],
): Motif => ({
  kind: 'meta',
  meta,
  km,
  ...(cotaFinal ? { cotaFinal } : {}),
  ...(hijos ? { hijos } : {}),
  firma: true,
})

export const CANONICO: Record<SkeletonId, Motif[]> = {
  // ---- un día (16) ----
  ud_esprint: [E(40), X(50), E(20), T(6, 2.5), E(30), X(30), E(20), META('esprint', 4)], // 200 km
  ud_esprint_capi: [E(258.5), C(5.6, 4.1), D(4.2), E(12), C(3.7, 4), D(2.7), META('esprint', 3.3)], // 290 km; Poggio corona a 6,0 (pancarta 284)
  ud_circuito: [E(5.5), K(12, 16, [M(0.4, 10), M(1.0, 8)], [4.9, 4.2], true), META('esprint', 2.5)], // 200 km; último muro a 4,0
  ud_muro_final: [
    E(108.3),
    C(4, 6),
    D(4.4),
    E(20),
    K(30, 2, [M(1.3, 9.6), M(1.3, 8)], [11, 14]),
    META('muro_meta', 3.3, { km: 1.3, g: 9.6 }),
  ], // 200 km; Huy ×3
  ud_muros: [
    E(132.4),
    CAD([M(1.0, 9), M(0.6, 11), M(2.2, 8), M(0.5, 12), M(0.8, 9)], [3, 4, 3, 5]),
    E(25), // 20,1 km
    CAD(
      [M(1.2, 10), M(0.4, 13), M(1.5, 9), M(0.9, 11), M(2.0, 8), M(0.7, 12)],
      [2.5, 3, 4, 2, 3.5],
    ),
    E(20), // 21,7 km
    CAD([M(1.1, 10), M(0.6, 13), M(2.2, 8), M(0.4, 13), M(1.0, 9)], [3, 2.5, 4, 3]),
    META('esprint', 13),
  ], // 17,8 km; 250 km; 16 muros, último a 13
  ud_muros_adoquin: [
    E(132.7),
    S(1.5, 3),
    E(12),
    S(2.0, 3),
    E(20),
    CAD(
      [M(2.2, 8, true), M(0.4, 13, true), M(0.6, 12, true), M(1.0, 9), M(0.5, 10)],
      [3, 4, 3.5, 4],
    ),
    E(18),
    S(1.2, 2),
    E(15), // 19,2 km; 3 de 5 adoquinados
    CAD([M(1.0, 9, true), M(0.8, 10), M(2.2, 8, true), M(0.4, 13, true), M(1.0, 8)], [3, 5, 3, 4]),
    META('esprint', 13),
  ], // 20,4 km; 255 km
  ud_sterrato: [
    E(67.4),
    C(4, 6),
    D(4.4),
    RAC(
      [S(2.1, 3, 'tierra'), S(3.5, 3, 'tierra'), S(1.8, 2, 'tierra'), S(2.6, 3, 'tierra')],
      [3, 4, 3],
    ),
    E(15),
    C(3.5, 6),
    D(3.8),
    E(6), // 20,0 km
    RAC(
      [
        S(3.7, 3, 'tierra'),
        S(3.7, 3, 'tierra'),
        S(3.0, 3, 'tierra'),
        S(2.4, 2, 'tierra'),
        S(3.2, 3, 'tierra'),
      ],
      [2, 2, 5, 4],
    ), // 29,0 km
    E(10),
    C(5, 5.5),
    D(5),
    E(5),
    M(0.8, 12),
    E(6),
    RAC(
      [S(2.5, 3, 'tierra'), S(1.1, 2, 'tierra'), S(3.0, 3, 'tierra'), S(1.5, 2, 'tierra')],
      [3, 4, 2.5],
    ),
    E(8), // 17,6 km
    META('muro_meta', 2.5, { km: 0.5, g: 16 }),
  ], // 213 km; Santa Caterina
  ud_adoquin: [
    X(79.2),
    E(36),
    RAC(
      [S(2.2, 3), S(2.4, 2), S(2.3, 5, 'adoquin', true), S(2.0, 2), S(3.0, 4), S(2.0, 2)],
      [4, 3, 5, 4, 3],
    ),
    E(20), // 32,9 km; Arenberg
    RAC(
      [
        S(2.5, 3),
        S(1.8, 3),
        S(3.0, 5, 'adoquin', true),
        S(1.7, 2),
        S(2.4, 3),
        S(1.5, 2),
        S(2.7, 4),
      ],
      [3, 2, 4, 3, 4, 3],
    ),
    E(24), // 34,6 km; Mons-en-Pévèle
    RAC(
      [S(1.4, 3), S(2.0, 3), S(1.9, 2), S(2.1, 5, 'adoquin', true), S(1.8, 3), S(1.0, 2)],
      [3, 4, 3, 4, 5],
    ), // 29,2 km; Carrefour de l'Arbre
    META('sector_meta', 2.1, undefined, [S(0.3, 1)]),
  ], // 258 km; 20 sectores (19 en tres racimos más el de meta), 40,0 km de adoquín
  ud_adoquin_ligero: [
    E(73.5),
    RAC([S(1.2, 2), S(0.8, 2), S(1.5, 3), S(1.0, 2)], [3, 4, 3]),
    E(20),
    M(0.6, 9),
    E(15), // 14,5 km
    RAC([S(1.8, 3), S(1.0, 2), S(2.2, 3), S(0.9, 2), S(1.4, 3)], [3, 4, 3, 4]),
    E(22), // 21,3 km
    RAC([S(1.5, 3), S(1.1, 2), S(0.8, 2), S(1.3, 3)], [3, 2.5, 3]),
    E(6),
    M(0.9, 10),
    E(4),
    META('esprint', 4),
  ], // 13,2 km; 195 km; 13 sectores; último muro a 8
  ud_montana: [
    E(98),
    P(9.0, 7.5),
    D(10),
    E(20),
    P(13, 8, true),
    D(10),
    E(37),
    C(4, 7),
    D(5.1),
    E(19.5),
    C(4.2, 7),
    D(5.3),
    E(1.5),
    META('descenso_meta', 8.4, { km: 2.7, g: 7.2 }),
  ], // 245 km; Como: Ghisallo (8,6 → 9,0), Sormano, Civiglio (9,7 → 7), San Fermo a 5,7. Paso 5: endurecida para llegar al suelo de 3.000 m (6,2 → 7,5 y 6,6 → 8, dentro de ARCH.motivo.puerto.g)
  ud_montana_media: [
    E(80.5),
    C(6, 6),
    D(6.5),
    E(20),
    C(4.5, 6.5),
    D(5.3),
    E(18),
    M(1.2, 10),
    E(12),
    C(5, 6),
    D(5.5),
    E(15),
    META('descenso_meta', 15.5, { km: 3.5, g: 8 }),
  ], // 195 km
  ud_repecho: [
    E(70),
    C(5, 6),
    D(5.5),
    E(30),
    C(4, 6.5),
    D(4.7),
    E(25),
    C(3.5, 6),
    D(3.8),
    E(36.5),
    META('repecho', 2.0, { km: 2.0, g: 6 }),
  ], // 190 km
  ud_montana_alto: [E(93.5), P(15, 7), D(10), E(30), META('alto_largo', 21.5, { km: 21.5, g: 6 })], // 170 km; Ventoux por Bédoin, a la media del 6 %: 21,5 × 6 × 10 = 1.290 m ≤ puertoDplusMax.media 1.300 (V4c; al 7 % eran 1.505)
  ud_criterium: [E(2.5), K(2.5, 22, [], [], true), META('esprint', 2.5)], // 60 km
  nc_ruta: [E(47.5), K(20, 8, [C(3.5, 4), M(1.0, 8)], [3.0, 11.0], true), META('esprint', 2.5)], // 210 km; media: 1.760 m en dificultades; último muro a 4,0
  nc_crono: [E(20), C(2.5, 4), D(2), E(7.5), META('esprint', 3)], // 35 km
  // ---- etapa (16) ----
  et_llana: [E(60), T(8, 2.5), E(40), T(6, 2), E(62), META('esprint', 4)], // 180 km
  et_llana_viento: [E(52), X(40), E(15), X(35), E(10), X(15), META('esprint', 3)], // 170 km
  et_media_valle: [
    E(72),
    C(5, 6),
    D(5.5),
    E(20),
    C(7, 5.5),
    D(7),
    E(18),
    M(1.5, 9),
    E(10),
    META('valle', 29, { km: 4, g: 6.5 }),
  ], // 175 km; última a 25
  et_media_alto: [
    E(53.5),
    C(6, 5),
    D(5.5),
    E(44.5),
    C(8, 6),
    D(8.7),
    E(26.8),
    META('alto_corto', 7, { km: 7, g: 7 }),
  ], // 160 km; plantilla 4 del mapa 07 §5
  et_media_muro: [
    E(108.7),
    CAD([M(1.0, 10), M(0.7, 12), M(1.8, 8), M(0.5, 13)], [3, 4, 3.5]),
    E(20), // 14,5 km
    CAD([M(1.2, 9), M(0.6, 14), M(1.5, 9)], [3, 4.5]),
    E(8),
    META('muro_meta', 3.0, { km: 1.0, g: 12 }),
  ], // 10,8 km; 165 km; muro de meta 1,0 → `muro`
  et_media_tendida: [
    E(30),
    T(20, 2.5),
    E(25),
    T(12, 3),
    E(20),
    C(5, 5),
    D(4.5),
    E(25.5),
    META('valle', 28, { km: 4, g: 5 }),
  ], // 170 km
  et_reina_alto_largo: [
    E(52.5),
    P(12, 7),
    D(10),
    E(20),
    P(17, 7.3),
    D(10),
    E(8),
    P(10, 7.8),
    D(10),
    E(9.7),
    META('alto_largo', 15.8, { km: 15.8, g: 7.9 }),
  ], // 175 km; plantilla 3 (Pirineos, 4.800 m)
  et_reina_alto_corto: [
    E(79.1),
    P(11, 7.5),
    D(10),
    E(20),
    P(14, 7),
    D(10),
    E(15),
    META('alto_corto', 5.9, { km: 5.9, g: 8.5 }),
  ], // 165 km; Planche. Paso 5: endurecida para llegar al suelo de 2.600 m (7 → 7,5 y 6,5 → 7)
  et_reina_cima_cerca: [
    E(73),
    P(12, 7),
    D(10),
    E(22),
    P(13, 7.2),
    D(10),
    E(15),
    META('cima_cerca', 15, { km: 12, g: 7.5 }),
  ], // 170 km; cima a 3. Paso 5: endurecida para llegar al suelo de 3.000 m (10 × 7 → 12 × 7 y 6,8 → 7,2)
  et_reina_valle: [
    E(57),
    P(9, 6.5),
    D(10),
    E(15),
    P(12, 7),
    D(10),
    E(15),
    P(10, 7.5),
    D(10),
    E(12),
    META('descenso_meta', 25, { km: 11, g: 7 }),
  ], // 185 km; cima a 14
  et_reina_encadenada: [
    E(20),
    P(14, 7.5),
    D(10),
    E(6),
    P(12, 8),
    D(10),
    E(6),
    P(14, 7.5),
    D(10),
    E(6),
    P(11, 8),
    D(10),
    E(4),
    META('alto_corto', 7, { km: 7, g: 8.5 }),
  ], // 140 km; Dolomitas (puertos de [9; 14] km, la firma de la zona)
  et_montana_corta: [
    E(20),
    P(16, 7),
    D(10),
    E(8),
    P(20, 6.5),
    D(10),
    E(8),
    META('alto_largo', 18, { km: 18, g: 7 }),
  ], // 110 km
  et_reina_blanda: [
    E(50),
    C(6, 5.5),
    D(6),
    E(30),
    C(7, 6),
    D(7.6),
    E(42.4),
    META('alto_largo', 11, { km: 11, g: 6.5 }),
  ], // 160 km; 2.138 m con relleno (estimado a 5,5 m/km)
  et_crono: [E(15), C(2.5, 4), D(2), E(5.5), META('esprint', 3)], // 28 km
  et_prologo: [E(4), META('esprint', 2)], // 6 km
  et_cronoescalada: [E(7), META('alto_largo', 11, { km: 11, g: 7.5 })], // 18 km
}

/**
 * `nc_ruta` en zonas sin cota ≥ 3,3 km (§5.7 regla 2): mismo esqueleto con `kind: 'clasica'`,
 * `label: 'Circuit'` y `finalKind` sin declarar. Muros sin adoquín y al ≤ 10 %: la plantilla vale en
 * las zonas donde `skeletonFor` la usa (`flandes`, `francia_norte`, `bretana`: cota nula o hasta 3,0
 * km, §6.2), y `bretana` tiene `muro.adoquin` falso.
 */
export const NC_RUTA_CLASICA: Motif[] = [
  E(17),
  K(16, 12, [M(1.0, 9), M(0.5, 10)], [4, 7.5], true),
  META('esprint', 1),
] // 210 km; último muro a 4,0, dentro del aMeta [1,2; 4,3] de V5(c)

// ---------------------------------------------------------------------------------------------------
// El catálogo (§5.2 y §5.3).
// ---------------------------------------------------------------------------------------------------

const TODA: [number, number] = [0, 1]

export const SKELETONS: Record<SkeletonId, Skeleton> = {
  // ---- un día (16) ----
  // Brugge-De Panne, Scheldeprijs. La «cota testimonial» es `tendida`: un `puerto` la sacaría de `llana`.
  ud_esprint: {
    id: 'ud_esprint',
    kind: 'llana',
    label: 'Flat',
    meta: 'esprint',
    slots: [
      { motif: 'expuesto', n: [0, 2], ventana: [0.1, 0.8] },
      {
        motif: 'tendida',
        n: [0, 1],
        ventana: [0.3, 0.7],
        params: { kmRango: [5, 10], gRango: [1.5, 3] },
      },
    ],
    dPlus: [400, 1500],
    km: [150, 240],
    pesoBase: 30,
    canonico: CANONICO.ud_esprint,
  },
  // La semiclásica de capi finales (Sanremo es su modelo, pero va por rasgos reales). `media` porque
  // Poggio y Cipressa pasan de 3 km. La última cota mide [3,3; 4,2] (lo aplica `instanciar`).
  ud_esprint_capi: {
    id: 'ud_esprint_capi',
    kind: 'media',
    label: 'Hills',
    finalKind: 'valle_corto',
    meta: 'esprint',
    metaParams: { aMeta: [5.7, 8] },
    slots: [
      {
        motif: 'cota',
        n: [2, 3],
        ventana: [0.7, 0.97],
        params: { kmRango: [3.3, 5.6], gRango: [4, 5] },
      },
    ],
    dPlus: [1200, 2300],
    km: [200, 295],
    requiere: { cota: true, cotaKmMin: COTA_MEDIA_KM },
    pesoBase: 6,
    canonico: CANONICO.ud_esprint_capi,
  },
  // Québec, Montréal, Japan Cup. Todas sus cotas miden ≤ 2,9 km: `clasica`. Con la variante de cotas
  // (zonas sin muro), los hijos son cotas de [2,5; 2,9] km, y eso solo cabe donde la cota baja de 2,9.
  ud_circuito: {
    id: 'ud_circuito',
    kind: 'clasica',
    label: 'Circuit',
    finalKind: 'cima_cerca',
    meta: 'esprint',
    metaParams: { aMeta: [1.2, 4.3] },
    slots: [
      { motif: 'enlace', n: [0, 1], ventana: [0, 0.05] },
      {
        motif: 'circuito',
        n: [1, 1],
        ventana: [0, 0.3],
        firma: true,
        params: { kmRango: [10, 18], vueltasRango: [6, 18] },
        hijos: [
          {
            motif: 'muro',
            n: [1, 2],
            ventana: [0.1, 0.9],
            params: { kmRango: [0.4, 2.5], gRango: [8, 12] },
          },
        ],
      },
    ],
    dPlus: [1800, 4000],
    km: [140, 275],
    requiere: [{ muro: true }, { cota: true, cotaCortaMax: 2.9 }],
    pesoBase: 20,
    canonico: CANONICO.ud_circuito,
  },
  // Flèche (Huy ×3), Emilia (San Luca ×5). Su hueco `cota` es obligatorio: sin él no llega a 1.500 m.
  ud_muro_final: {
    id: 'ud_muro_final',
    kind: 'media',
    label: 'Wall finish',
    finalKind: 'alto',
    meta: 'muro_meta',
    metaParams: { cotaFinal: { km: [0.5, 2.2], g: [8, 16] } },
    slots: [
      { motif: 'cota', n: [1, 3], ventana: [0.3, 0.8], params: { kmRango: [2.5, 6] } },
      {
        motif: 'circuito',
        n: [0, 1],
        ventana: [0.55, 0.75],
        params: { kmRango: [9, 30], vueltasRango: [2, 3] },
        hijos: [
          { motif: 'muro', n: [1, 1], ventana: [0, 0.4], firma: true }, // el de la meta: mismo km y g
          { motif: 'muro', n: [0, 1], ventana: [0.5, 0.9] },
        ],
      },
    ],
    dPlus: [1100, 2900],
    km: [180, 215],
    requiere: { muro: true, cota: true },
    pesoBase: 10,
    canonico: CANONICO.ud_muro_final,
  },
  // Ronde, Omloop, E3, Amstel, Brabantse: 12 a 20 muros, los tres últimos en los últimos 30 km.
  // v87: `cadena`×[2; 3] con `muro`×[5; 7] (eran [2; 4] y [3; 8]): da de 10 a 21 muros, la banda
  // `muros.cotas` del censo (p10 ≥ 10, p90 ≤ 20; §12.12 «[10; 20] en ud_muros»), que con [2; 4] × [3; 8]
  // bajaba a 6 por construcción (p10 medido 8 en las 16 del calendario). Las canónicas ya cabían.
  ud_muros: {
    id: 'ud_muros',
    kind: 'clasica',
    label: 'Classic',
    meta: 'esprint',
    metaParams: { aMeta: [1.2, 15] },
    slots: [
      { motif: 'enlace', n: [1, 1], ventana: [0, 0.45] },
      {
        motif: 'cadena',
        n: [2, 3],
        ventana: [0.45, 0.97],
        params: { separacionRango: [1.5, 5] },
        hijos: [
          {
            motif: 'muro',
            n: [5, 7],
            ventana: TODA,
            params: { kmRango: [0.4, 2.5], gRango: [8, 13] },
          },
        ],
      },
    ],
    dPlus: [1500, 3500],
    km: [180, 275],
    requiere: { muro: true },
    pesoBase: 25,
    canonico: CANONICO.ud_muros,
  },
  // Ronde, Omloop con sus sectores llanos. `Cobbles` por el `paves` (regla 1 de §5.1).
  ud_muros_adoquin: {
    id: 'ud_muros_adoquin',
    kind: 'clasica',
    label: 'Cobbles',
    meta: 'esprint',
    metaParams: { aMeta: [1.2, 15] },
    slots: [
      { motif: 'enlace', n: [1, 1], ventana: [0, 0.45] },
      {
        motif: 'sector',
        n: [2, 7],
        ventana: [0.3, 0.9],
        params: { kmRango: [1, 2.5], estrellasRango: [2, 3] },
      },
      {
        // v87: [2; 3] × [5; 7], como `ud_muros` (la banda `muros.cotas` los mide juntos).
        motif: 'cadena',
        n: [2, 3],
        ventana: [0.45, 0.97],
        params: { separacionRango: [1.5, 5], adoquinShare: [0.4, 0.7] },
        hijos: [
          {
            motif: 'muro',
            n: [5, 7],
            ventana: TODA,
            params: { kmRango: [0.4, 2.5], gRango: [8, 13] },
          },
        ],
      },
    ],
    dPlus: [1050, 2800],
    km: [180, 275],
    requiere: { adoquin: 2, muro: { adoquin: true } },
    pesoBase: 12,
    canonico: CANONICO.ud_muros_adoquin,
  },
  // Strade Bianche. Monte Sante Marie (11,5 km) son tres sectores de 3,7 separados por 2 km.
  ud_sterrato: {
    id: 'ud_sterrato',
    kind: 'clasica',
    label: 'Cobbles',
    finalKind: 'alto',
    meta: 'muro_meta',
    metaParams: { cotaFinal: { km: [0.5, 1.0], g: [12, 16] } },
    slots: [
      {
        motif: 'cota',
        n: [2, 4],
        ventana: [0.15, 0.9],
        params: { kmRango: [2.5, 5], gRango: [5, 7] },
      },
      {
        motif: 'racimo',
        n: [2, 3],
        ventana: [0.25, 0.9],
        params: { separacionRango: [2, 5] },
        hijos: [
          {
            motif: 'sector',
            n: [4, 5],
            ventana: TODA,
            params: { kmRango: [1, 3.7], estrellasRango: [2, 3], firme: 'tierra' },
          },
        ],
      },
      {
        motif: 'muro',
        n: [1, 3],
        ventana: [0.5, 0.95],
        params: { kmRango: [0.4, 2], gRango: [10, 16] },
      },
    ],
    dPlus: [1250, 2800],
    km: [180, 215],
    requiere: { sterrato: true, muro: true, cota: true },
    pesoBase: 8,
    canonico: CANONICO.ud_sterrato,
  },
  // Roubaix: tres sectores 5★ de firma, uno por racimo. El sector de meta mide [0,3; 2,5] km.
  ud_adoquin: {
    id: 'ud_adoquin',
    kind: 'clasica',
    label: 'Cobbles',
    meta: 'sector_meta',
    metaParams: { aMeta: [1, 8] },
    slots: [
      { motif: 'expuesto', n: [1, 1], ventana: [0, 0.35] },
      {
        motif: 'racimo',
        n: [3, 4],
        ventana: [0.35, 0.97],
        params: { firmaCount: 3 },
        hijos: [
          {
            motif: 'sector',
            n: [5, 8],
            ventana: TODA,
            params: { kmRango: [0.3, 3.7], estrellasRango: [1, 5] },
          },
        ],
      },
    ],
    dPlus: [300, 1200],
    km: [200, 260],
    requiere: { adoquin: 2 },
    pesoBase: 10,
    canonico: CANONICO.ud_adoquin,
  },
  // Denain, Le Samyn, Tro Bro Léon (con `sterrato`, los sectores son de tierra).
  ud_adoquin_ligero: {
    id: 'ud_adoquin_ligero',
    kind: 'clasica',
    label: 'Cobbles',
    meta: 'esprint',
    metaParams: { aMeta: [2, 8] },
    slots: [
      {
        motif: 'racimo',
        n: [2, 3],
        ventana: [0.3, 0.95],
        params: { separacionRango: [2, 4] },
        hijos: [
          {
            motif: 'sector',
            n: [4, 5],
            ventana: TODA,
            params: { kmRango: [0.8, 2.2], estrellasRango: [2, 3] },
          },
        ],
      },
      {
        motif: 'muro',
        n: [0, 3],
        ventana: [0.5, 0.97],
        params: { kmRango: [0.4, 1.5], gRango: [8, 12] },
      },
    ],
    dPlus: [450, 1800],
    km: [170, 215],
    requiere: [{ adoquin: 2 }, { sterrato: true }],
    pesoBase: 8,
    canonico: CANONICO.ud_adoquin_ligero,
  },
  // Lombardía, Lieja, San Sebastián: el caso v40 en positivo. La cotaFinal sale de
  // `ARCH.meta.unDiaUltimaCota` y corona a [3; 17] km (V5c), así que no se declara.
  ud_montana: {
    id: 'ud_montana',
    kind: 'reina',
    label: 'Mountains classic',
    meta: 'descenso_meta',
    slots: [
      { motif: 'enlace', n: [1, 1], ventana: [0, 0.4] },
      { motif: 'puerto', n: [2, 3], ventana: [0.4, 0.85], firma: true }, // el más largo es de firma
      {
        motif: 'cota',
        n: [1, 2],
        ventana: [0.8, 0.97],
        params: { kmRango: [2.5, 4.2], gRango: [6, 7] },
      },
    ],
    dPlus: [3000, 4600],
    km: [200, 260],
    requiere: { puerto: true, cota: true, relieve: 'montana' },
    pesoBase: 12,
    canonico: CANONICO.ud_montana,
    // Rotación de nivel 2 (§5.5): el puerto de firma es la Valcava (11,6 × 8); la canónica, Sormano.
    alternativas: [
      {
        nombre: 'Bérgamo',
        slots: { 1: { kmRango: [10.5, 12.5], gRango: [7.5, 8.5] } },
        // Roncola, Valcava, Ganda; Colle Aperto (1,2 km al 7 %, subido a 1,3, el suelo de
        // unDiaUltimaCota.km) a 5,7 km (real 3, subido al suelo de descensoMeta.valle).
        canonico: [
          E(116),
          P(9.4, 6.6),
          D(10),
          E(20),
          P(11.6, 8, true),
          D(10),
          E(20),
          P(9.2, 7.3),
          D(10),
          E(10),
          C(3.0, 7),
          D(3.8),
          E(10),
          META('descenso_meta', 7.0, { km: 1.3, g: 7 }),
        ], // 250 km
      },
    ],
  },
  // Piemonte, Agostoni, Laigueglia, Frankfurt. La primera cota mide [3,3; 8,0] (`instanciar`).
  ud_montana_media: {
    id: 'ud_montana_media',
    kind: 'media',
    label: 'Hills',
    finalKind: 'valle_corto',
    meta: 'descenso_meta',
    metaParams: { aMeta: [5.7, 17], cotaFinal: { km: [2.5, 4.2], g: [7, 9] } },
    slots: [
      { motif: 'cota', n: [3, 5], ventana: [0.3, 0.95] },
      { motif: 'muro', n: [0, 2], ventana: [0.4, 0.9] },
    ],
    dPlus: [1600, 2900],
    km: [170, 215],
    requiere: { cota: true, cotaKmMin: COTA_MEDIA_KM },
    pesoBase: 12,
    canonico: CANONICO.ud_montana_media,
  },
  // Amstel con meta en el Cauberg: la clásica de colinas con meta en repecho. La primera cota mide
  // [3,3; 8,0] (`instanciar`); la meta, `ARCH.meta.repecho` y, en un día, ≤ 2,2 km (V5b).
  ud_repecho: {
    id: 'ud_repecho',
    kind: 'media',
    label: 'Uphill finish',
    finalKind: 'alto',
    meta: 'repecho',
    slots: [{ motif: 'cota', n: [2, 4], ventana: [0.3, 0.9] }],
    dPlus: [1150, 2900],
    km: [160, 215],
    requiere: { cota: true, cotaKmMin: COTA_MEDIA_KM },
    pesoBase: 12,
    canonico: CANONICO.ud_repecho,
  },
  // Ventoux Dénivelé, Mercan'Tour: tres carreras sobre doscientas. Rareza (decisión 37, D1): pesa
  // 60 × 0,02 y solo en .1. El puerto es obligatorio por V8b: con `puerto`×0 sería `reina-150`.
  ud_montana_alto: {
    id: 'ud_montana_alto',
    kind: 'reina',
    label: 'Summit finish',
    finalKind: 'alto',
    meta: 'alto_largo',
    metaParams: { cotaFinal: { km: [13, 22], g: [6, 7] } },
    slots: [
      { motif: 'enlace', n: [1, 1], ventana: [0, 0.6] },
      { motif: 'puerto', n: [1, 1], ventana: [0.3, 0.6] },
    ],
    dPlus: [2500, 3800],
    km: [150, 185],
    requiere: { puerto: true, finalesAlto: 'largo' },
    pesoBase: 60,
    canonico: CANONICO.ud_montana_alto,
  },
  // Critériums: «fiesta y no carrera puntuable». Vuelta sin hijos: solo enlace. × 0 en todas las
  // clases hasta D5 (el peso base es 1, como el resto de esqueletos que no compiten por peso).
  ud_criterium: {
    id: 'ud_criterium',
    kind: 'llana',
    label: 'Flat',
    meta: 'esprint',
    slots: [
      {
        motif: 'circuito',
        n: [1, 1],
        ventana: [0, 0.1],
        firma: true,
        params: { kmRango: [1.5, 3], vueltasRango: [20, 40] },
        hijos: [],
      },
    ],
    dPlus: [0, 450],
    km: [45, 100],
    pesoBase: 1,
    canonico: CANONICO.ud_criterium,
  },
  // Campeonatos nacionales, «siempre circuito». La cota es obligatoria en la variante `media`; en
  // zonas sin cota ≥ 3,3 km `skeletonFor` devuelve la variante clásica (§5.7 regla 2). Los muros solo
  // si la zona los tiene y los sectores solo con `adoquin ≥ 2` (lo resuelve `instanciar`).
  nc_ruta: {
    id: 'nc_ruta',
    kind: 'media',
    label: 'Circuit',
    finalKind: 'cima_cerca',
    meta: 'esprint',
    metaParams: { aMeta: [1.2, 4.3] },
    slots: [
      { motif: 'enlace', n: [0, 1], ventana: [0, 0.25] },
      {
        motif: 'circuito',
        n: [1, 1],
        ventana: [0, 0.25],
        firma: true,
        params: { kmRango: [10, 25], vueltasRango: [8, 16] },
        hijos: [
          { motif: 'cota', n: [1, 1], ventana: [0.05, 0.4], params: { kmRango: [3.3, 6] } },
          { motif: 'muro', n: [0, 2], ventana: [0.4, 0.9] },
          { motif: 'sector', n: [0, 2], ventana: [0.2, 0.8] },
        ],
      },
    ],
    dPlus: [1800, 2900],
    km: [180, 240],
    pesoBase: 1,
    canonico: CANONICO.nc_ruta,
  },
  // Crono nacional; Chrono des Nations (`race-chrono`, .1, 45 km).
  nc_crono: {
    id: 'nc_crono',
    kind: 'cri',
    label: 'ITT',
    timeTrial: true,
    meta: 'esprint',
    slots: [
      { motif: 'enlace', n: [1, 1], ventana: TODA },
      {
        motif: 'cota',
        n: [0, 1],
        ventana: [0.3, 0.7],
        params: { kmRango: [2.5, 5], gRango: [4, 6] },
      },
    ],
    dPlus: [100, 500],
    km: [25, 45],
    pesoBase: 1,
    canonico: CANONICO.nc_crono,
  },
  // ---- etapa (16) ----
  // Llana de gran vuelta: cat 4/3 como `tendida`, no como `cota` (regla 1).
  et_llana: {
    id: 'et_llana',
    kind: 'llana',
    label: 'Flat',
    meta: 'esprint',
    slots: [
      {
        motif: 'tendida',
        n: [0, 2],
        ventana: [0.2, 0.7],
        params: { kmRango: [5, 12], gRango: [1.5, 3] },
      },
    ],
    dPlus: [500, 1500],
    km: [110, 230],
    pesoBase: 30,
    canonico: CANONICO.et_llana,
  },
  // Pólder, desierto. El abanico sigue en `streams('viento')` (decisión 17).
  et_llana_viento: {
    id: 'et_llana_viento',
    kind: 'llana',
    label: 'Flat',
    meta: 'esprint',
    slots: [{ motif: 'expuesto', n: [2, 3], ventana: [0.3, 0.95] }],
    dPlus: [150, 900],
    km: [110, 210],
    requiere: { viento: 2 },
    pesoBase: 12,
    canonico: CANONICO.et_llana_viento,
  },
  // Media montaña de fuga: última a 20-40 km. La primera cota mide [3,3; 8,0] (`instanciar`).
  et_media_valle: {
    id: 'et_media_valle',
    kind: 'media',
    label: 'Hills',
    finalKind: 'valle_largo',
    meta: 'valle',
    metaParams: { cotaFinal: { km: [2.5, 8], g: [4, 7] } },
    slots: [
      { motif: 'cota', n: [2, 4], ventana: [0.25, 0.8] },
      { motif: 'muro', n: [0, 2], ventana: [0.4, 0.85] },
    ],
    dPlus: [1250, 2900],
    km: [120, 200],
    requiere: { cota: true, cotaKmMin: COTA_MEDIA_KM },
    pesoBase: 25,
    canonico: CANONICO.et_media_valle,
  },
  // Arrate, Planche, Xorret, Willunga.
  et_media_alto: {
    id: 'et_media_alto',
    kind: 'media',
    label: 'Uphill finish',
    finalKind: 'alto',
    meta: 'alto_corto',
    metaParams: { cotaFinal: { km: [3, 7], g: [6, 11] } },
    slots: [{ motif: 'cota', n: [1, 2], ventana: [0.3, 0.8], params: { kmRango: [3.3, 8.0] } }],
    dPlus: [1300, 2900],
    km: [110, 190],
    requiere: { cota: true, cotaKmMin: COTA_MEDIA_KM, finalesAlto: 'corto' },
    pesoBase: 20,
    canonico: CANONICO.et_media_alto,
  },
  // Tirreno (Sant'Elpidio), Benelux (Muur), Itzulia.
  et_media_muro: {
    id: 'et_media_muro',
    kind: 'media',
    label: 'Wall finish',
    finalKind: 'alto',
    meta: 'muro_meta',
    metaParams: { cotaFinal: { km: [0.5, 2.2], g: [8, 16] } },
    slots: [
      {
        motif: 'cadena',
        n: [1, 2],
        ventana: [0.5, 0.95],
        hijos: [
          {
            motif: 'muro',
            n: [3, 6],
            ventana: TODA,
            params: { kmRango: [0.4, 2], gRango: [8, 14] },
          },
        ],
      },
    ],
    dPlus: [1150, 2900],
    km: [120, 200],
    requiere: { muro: true },
    pesoBase: 12,
    canonico: CANONICO.et_media_muro,
  },
  // Meseta, altiplano andino, Anatolia.
  et_media_tendida: {
    id: 'et_media_tendida',
    kind: 'media',
    label: 'Hills',
    finalKind: 'valle_largo',
    meta: 'valle',
    metaParams: { cotaFinal: { km: [2.5, 6], g: [4, 6] } },
    slots: [
      { motif: 'tendida', n: [1, 2], ventana: [0.1, 0.6], params: { kmRango: [10, 30] } },
      { motif: 'cota', n: [1, 2], ventana: [0.4, 0.75], params: { kmRango: [3.3, 8.0] } },
    ],
    dPlus: [1500, 2500],
    km: [120, 200],
    requiere: [
      { cota: true, cotaKmMin: COTA_MEDIA_KM, altitud: 'altiplano' },
      { cota: true, cotaKmMin: COTA_MEDIA_KM, altitud: 'media' },
      { cota: true, cotaKmMin: COTA_MEDIA_KM, relieve: 'ondulado' },
    ],
    pesoBase: 8,
    canonico: CANONICO.et_media_tendida,
  },
  // Alpe d'Huez, Beille, Angliru, Lagos: el 70-80 % de los finales en alto de gran vuelta. Cada
  // puerto lleva su bajada canónica (la pone `colocar`).
  et_reina_alto_largo: {
    id: 'et_reina_alto_largo',
    kind: 'reina',
    label: 'Summit finish',
    finalKind: 'alto',
    meta: 'alto_largo',
    metaParams: { cotaFinal: { km: [9, 22], g: [6, 9] } },
    slots: [
      { motif: 'enlace', n: [1, 1], ventana: [0, 0.35] },
      { motif: 'puerto', n: [2, 3], ventana: [0.3, 0.85] },
    ],
    dPlus: [3500, 5500],
    km: [110, 200],
    requiere: { puerto: true, relieve: 'montana', finalesAlto: 'largo' },
    pesoBase: 20,
    canonico: CANONICO.et_reina_alto_largo,
    // Rotación de nivel 2 (§5.5): la meta de cada opción SUSTITUYE al rango del esqueleto.
    alternativas: [
      {
        nombre: 'Angliru',
        metaParams: { kmRango: [12, 13], gRango: [8.5, 9.5] },
        // 12,5 km al 9 % (real 9,8; 12,5 × 9 × 10 = 1.125 m ≤ puertoDplusMax.media 1.300)
        canonico: [
          E(52.5),
          P(12, 7),
          D(10),
          E(20),
          P(14, 7),
          D(10),
          E(18),
          P(10, 7.5),
          D(10),
          E(6.0),
          META('alto_largo', 12.5, { km: 12.5, g: 9 }),
        ], // 175 km
      },
      {
        nombre: 'Lagos',
        metaParams: { kmRango: [11.5, 12.8], gRango: [6.8, 7.6] },
        // Lagos de Covadonga: 12,2 km al 7,2 %
        canonico: [
          E(52.5),
          P(12, 7),
          D(10),
          E(20),
          P(14, 7),
          D(10),
          E(18),
          P(10, 7.5),
          D(10),
          E(6.3),
          META('alto_largo', 12.2, { km: 12.2, g: 7.2 }),
        ], // 175 km
      },
    ],
  },
  // Planche, Xorret, Tre Cime por el último tramo. Al menos dos puertos ≥ 9 km (V8a).
  et_reina_alto_corto: {
    id: 'et_reina_alto_corto',
    kind: 'reina',
    label: 'Summit finish',
    finalKind: 'alto',
    meta: 'alto_corto',
    metaParams: { cotaFinal: { km: [4, 7], g: [8, 11] } },
    slots: [{ motif: 'puerto', n: [2, 3], ventana: [0.3, 0.85] }],
    dPlus: [2600, 4800],
    km: [110, 190],
    requiere: { puerto: true, relieve: 'montana', finalesAlto: 'corto' },
    pesoBase: 12,
    canonico: CANONICO.et_reina_alto_corto,
  },
  // Livigno 2024, Isola 2024. `Summit finish` por la decisión 23 (cima a ≤ 5 km de meta).
  et_reina_cima_cerca: {
    id: 'et_reina_cima_cerca',
    kind: 'reina',
    label: 'Summit finish',
    finalKind: 'cima_cerca',
    meta: 'cima_cerca',
    metaParams: { cotaFinal: { km: [9, 16], g: [6, 9] } },
    slots: [{ motif: 'puerto', n: [2, 3], ventana: [0.25, 0.8] }],
    dPlus: [3000, 4800],
    km: [120, 200],
    requiere: { puerto: true, relieve: 'montana' },
    pesoBase: 10,
    canonico: CANONICO.et_reina_cima_cerca,
  },
  // «Montaña sin final en alto»: 1 a 3 por gran vuelta. Cada puerto con su bajada.
  et_reina_valle: {
    id: 'et_reina_valle',
    kind: 'reina',
    label: 'Mountains',
    finalKind: 'valle_corto',
    meta: 'descenso_meta',
    metaParams: { cotaFinal: { km: [9, 17], g: [6, 9] } },
    slots: [{ motif: 'puerto', n: [3, 4], ventana: [0.2, 0.8] }],
    dPlus: [3200, 5000],
    km: [130, 210],
    requiere: { puerto: true, relieve: 'montana' },
    pesoBase: 10,
    canonico: CANONICO.et_reina_valle,
  },
  // Dolomitas, Pirineos encadenados: `alta` porque cuatro puertos pegados solo existen en cordillera.
  // Los puertos van pegados tras su bajada (`colocar`, §8.6 punto 3).
  et_reina_encadenada: {
    id: 'et_reina_encadenada',
    kind: 'reina',
    label: 'Summit finish',
    finalKind: 'alto',
    meta: 'alto_corto',
    metaParams: { cotaFinal: { km: [4, 7], g: [8, 11] } },
    slots: [{ motif: 'puerto', n: [3, 5], ventana: [0.05, 0.85] }],
    dPlus: [3800, 5500],
    km: [110, 160],
    requiere: { puerto: true, relieve: 'alta' },
    pesoBase: 6,
    canonico: CANONICO.et_reina_encadenada,
  },
  // Montaña corta de Vuelta y Tour desde 2018.
  et_montana_corta: {
    id: 'et_montana_corta',
    kind: 'reina',
    label: 'Summit finish',
    finalKind: 'alto',
    meta: 'alto_largo',
    metaParams: { cotaFinal: { km: [9, 22], g: [6, 9] } },
    slots: [{ motif: 'puerto', n: [2, 2], ventana: [0.08, 0.7] }],
    dPlus: [3000, 4200],
    km: [100, 140],
    requiere: { puerto: true, relieve: 'montana', finalesAlto: 'largo' },
    pesoBase: 6,
    canonico: CANONICO.et_montana_corta,
  },
  // Vuelta de una semana con un solo puerto (Fóia): la cola baja de desnivel (decisión 8). No entra
  // en el sorteo por peso: sale por `ARCH.reina.blandaShare` (§5.7 regla 1). Sin `relieve`.
  et_reina_blanda: {
    id: 'et_reina_blanda',
    kind: 'reina',
    label: 'Summit finish',
    finalKind: 'alto',
    meta: 'alto_largo',
    metaParams: { cotaFinal: { km: [9, 12], g: [6, 7] } },
    slots: [
      { motif: 'enlace', n: [1, 1], ventana: [0, 0.6] },
      {
        motif: 'cota',
        n: [1, 2],
        ventana: [0.15, 0.6],
        params: { kmRango: [5, 8], gRango: [4, 7] },
      },
    ],
    dPlus: [1500, 2500],
    km: [130, 180],
    requiere: { puerto: true, cota: true, finalesAlto: 'largo' },
    pesoBase: 1,
    canonico: CANONICO.et_reina_blanda,
  },
  // CRI de 14 a 26 km y de 30 a 35 (Dauphiné).
  et_crono: {
    id: 'et_crono',
    kind: 'cri',
    label: 'ITT',
    timeTrial: true,
    meta: 'esprint',
    slots: [
      {
        motif: 'cota',
        n: [0, 1],
        ventana: [0.3, 0.7],
        params: { kmRango: [2.5, 5], gRango: [4, 6] },
      },
    ],
    dPlus: [50, 400],
    km: [8, 45],
    pesoBase: 1,
    canonico: CANONICO.et_crono,
  },
  // Romandía, Dauphiné, Suiza (D3).
  et_prologo: {
    id: 'et_prologo',
    kind: 'cri',
    label: 'Prologue',
    timeTrial: true,
    meta: 'esprint',
    slots: [{ motif: 'enlace', n: [1, 1], ventana: TODA }],
    dPlus: [0, 100],
    km: [3, 8],
    pesoBase: 1,
    canonico: CANONICO.et_prologo,
  },
  // Peyragudes (Tour 2025 e13, 11 km); D3.
  et_cronoescalada: {
    id: 'et_cronoescalada',
    kind: 'cri',
    label: 'Hill climb',
    timeTrial: true,
    finalKind: 'alto',
    meta: 'alto_largo',
    metaParams: { cotaFinal: { km: [9, 15], g: [6, 9] } },
    slots: [{ motif: 'enlace', n: [0, 1], ventana: [0, 0.4], params: { kmRango: [3, 10] } }],
    dPlus: [500, 1200],
    km: [12, 25],
    requiere: { puerto: true, relieve: 'montana', finalesAlto: 'largo' },
    pesoBase: 1,
    canonico: CANONICO.et_cronoescalada,
  },
}

// ---------------------------------------------------------------------------------------------------
// La elección (§5.6 y §5.7): sesgo de terreno, escalones y candidatos.
// ---------------------------------------------------------------------------------------------------

/**
 * `RaceRow.terrain` traducido a candidatos de un día (§5.6): sesgo y nunca orden. Dice qué esqueletos
 * entran en el sorteo y con qué multiplicador; si la zona no admite ninguno, se baja un escalón por
 * `ESCALON_TERRENO`. Solo para `role: 'un_dia'` de carreras de equipos.
 */
export const SESGO_TERRENO: Record<RouteTerrain, Partial<Record<SkeletonId, number>>> = {
  flat: { ud_esprint: 1, ud_esprint_capi: 0.5, ud_adoquin_ligero: 0.5 },
  hilly: {
    ud_muros: 1,
    ud_circuito: 1,
    ud_muro_final: 1,
    ud_montana_media: 1,
    ud_repecho: 1,
    ud_esprint_capi: 0.5,
    ud_muros_adoquin: 1,
    ud_sterrato: 1,
  },
  classic: {
    ud_muros: 1,
    ud_muros_adoquin: 1,
    ud_circuito: 0.5,
    ud_muro_final: 1,
    ud_repecho: 0.5,
    ud_sterrato: 1,
  },
  cobbles: { ud_adoquin: 1, ud_adoquin_ligero: 1, ud_muros_adoquin: 1 },
  mountain: { ud_montana: 4, ud_montana_media: 1, ud_montana_alto: 1, ud_circuito: 0.25 },
  itt: { nc_crono: 1 },
}

/** Siempre hacia abajo: el destino nunca tiene un final en alto ni un puerto que el origen no tuviera (test de §5.9). Decisión 12: la ÚNICA tabla de degradación de papeles. */
export const ESCALON_ROLE: Record<StageRole, StageRole | null> = {
  reina_alto: 'media_alto',
  reina_valle: 'media',
  reina_encadenada: 'media_alto',
  montana_corta: 'media_alto',
  media_alto: 'media_muro',
  media_muro: 'media',
  media: 'llana',
  llana_viento: 'llana',
  cronoescalada: 'cri',
  llana: null,
  cri: null,
  prologo: null,
}

/** El escalón de `ESCALON_ROLE` de un papel; null si no baja. `degradar` (geo.ts) es la de relieve y `degradarMotivo` la de huecos. */
export function degradarPapel(role: StageRole): StageRole | null {
  return ESCALON_ROLE[role]
}

/** cobbles → classic → hilly → flat; mountain → hilly; flat e itt no bajan. */
export const ESCALON_TERRENO: Record<RouteTerrain, RouteTerrain | null> = {
  cobbles: 'classic',
  classic: 'hilly',
  hilly: 'flat',
  mountain: 'hilly',
  flat: null,
  itt: null,
}

/** Etapas de edición sin rasgos (§5.8): candidatos por `EditionTerrain`, y el papel al que se degrada si ninguno cabe. */
export const POR_TERRENO_EDICION: Record<EditionTerrain, { ids: SkeletonId[]; papel: StageRole }> =
  {
    flat: { ids: ['et_llana', 'et_llana_viento'], papel: 'llana' },
    hilly: {
      ids: ['et_media_valle', 'et_media_alto', 'et_media_muro', 'et_media_tendida'],
      papel: 'media',
    },
    mountain: {
      ids: [
        'et_reina_alto_largo',
        'et_reina_alto_corto',
        'et_reina_cima_cerca',
        'et_reina_valle',
        'et_montana_corta',
      ],
      papel: 'reina_alto',
    },
    itt: { ids: ['et_crono', 'et_prologo'], papel: 'cri' },
    cobbles: { ids: ['ud_adoquin_ligero'], papel: 'llana' },
  }

/** Los esqueletos de etapa de cada papel (columna «Papel» de §5.3). Privada: quien necesita el `kind` de un papel lo lee del esqueleto elegido (§8.2). */
const POR_PAPEL: Record<StageRole, SkeletonId[]> = {
  llana: ['et_llana'],
  llana_viento: ['et_llana_viento'],
  media: ['et_media_valle', 'et_media_tendida'],
  media_alto: ['et_media_alto'],
  media_muro: ['et_media_muro'],
  reina_alto: ['et_reina_alto_largo', 'et_reina_alto_corto'],
  reina_valle: ['et_reina_valle', 'et_reina_cima_cerca'],
  reina_encadenada: ['et_reina_encadenada'],
  montana_corta: ['et_montana_corta'],
  cri: ['et_crono'],
  prologo: ['et_prologo'],
  cronoescalada: ['et_cronoescalada'],
}

/** Los km de una etapa de edición que deciden entre esqueletos de su terreno (§5.8): el techo de `et_montana_corta` y el borde prólogo/crono son los `km` de esas filas del catálogo. */
const KM_MONTANA_CORTA_MAX = SKELETONS.et_montana_corta.km[1]
const KM_PROLOGO_MAX = SKELETONS.et_prologo.km[1]

/**
 * `nc_ruta` decide su `kind` por la zona (§5.7 regla 2): en una zona sin cota ≥ 3,3 km devuelve una
 * copia `clasica / Circuit` sin `finalKind`, con el hueco `cota` del circuito en `n: [0, 0]` y la
 * plantilla `NC_RUTA_CLASICA`. Cualquier otro id devuelve `SKELETONS[id]` tal cual.
 */
export function skeletonFor(id: SkeletonId, geo: GeoSignature): Skeleton {
  const sk = SKELETONS[id]
  if (id !== 'nc_ruta' || (geo.cota !== null && geo.cota.km[1] >= COTA_MEDIA_KM)) return sk
  const { finalKind: _sinFinal, ...resto } = sk
  void _sinFinal
  return {
    ...resto,
    kind: 'clasica',
    slots: sk.slots.map((s) =>
      s.hijos
        ? {
            ...s,
            hijos: s.hijos.map((h): Slot => (h.motif === 'cota' ? { ...h, n: [0, 0] } : h)),
          }
        : s,
    ),
    canonico: NC_RUTA_CLASICA,
  }
}

/** La fórmula de §5.6; `terrain` null en etapas de vuelta y de edición, donde el sesgo vale 1. Nunca devuelve 0 para un id que `cabe`: el sesgo solo se lee para ids de SESGO_TERRENO[terrain]. */
const peso = (id: SkeletonId, terrain: RouteTerrain | null, req: Peticion): number =>
  SKELETONS[id].pesoBase *
  (terrain === null ? 1 : (SESGO_TERRENO[terrain][id] ?? 0)) *
  ARCH.pesoPorClase[id][req.raceClass] *
  (req.geo.pesos[id] ?? 1)

/**
 * Las tres condiciones de candidato: la zona lo admite, la clase no lo veta y su `km[0]` cabe bajo el
 * techo de la clase. Exportada porque `elegirEsqueleto` (sección 8, §8.2 paso 1 bis) la usa para la
 * atadura de `RACE_REGION`: una sola definición para los dos.
 */
export function cabe(id: SkeletonId, req: Peticion): boolean {
  const sk = SKELETONS[id]
  return (
    admite(sk.requiere, req.geo) &&
    ARCH.pesoPorClase[id][req.raceClass] > 0 &&
    sk.km[0] <= ARCH.km.maxPorClase[req.raceClass]
  )
}

/**
 * Los candidatos de una petición con su peso (§5.7), en el orden de la tabla que los da. Nunca
 * devuelve vacío: los dos `throw` existen para que un catálogo mal editado sea un fallo de test con
 * mensaje y no un bucle sin fin (el test sobre todas las filas del calendario sella que no se alcanzan).
 */
export function candidatos(req: Peticion): { id: SkeletonId; peso: number }[] {
  const con = (ids: SkeletonId[], terrain: RouteTerrain | null) =>
    ids.filter((id) => cabe(id, req)).map((id) => ({ id, peso: peso(id, terrain, req) }))
  const porPapel = (role0: StageRole) => {
    let role: StageRole | null = role0
    while (role !== null) {
      const out = con(POR_PAPEL[role], null)
      if (out.length > 0) return out
      role = degradarPapel(role)
    }
    throw new Error(`candidatos: ningún esqueleto de etapa cabe para ${role0} en ${req.geo.zona}`) // imposible: et_llana no requiere nada
  }
  if (req.raceClass === 'NC')
    return [{ id: req.terrain === 'itt' ? 'nc_crono' : 'nc_ruta', peso: 1 }] // los nacionales, sin sorteo
  if (req.routeSource === 'edicion') {
    const fila = POR_TERRENO_EDICION[req.terrain as EditionTerrain]
    const ids = fila.ids.filter(
      (id) =>
        (id !== 'et_montana_corta' || req.km <= KM_MONTANA_CORTA_MAX) &&
        (id !== 'et_prologo' || req.km <= KM_PROLOGO_MAX) &&
        (id !== 'et_crono' || req.km > KM_PROLOGO_MAX),
    )
    const out = con(ids, null)
    return out.length > 0 ? out : porPapel(fila.papel) // mountain en flandes: reina_alto → media_alto → media_muro (§5.8)
  }
  if (req.role === 'un_dia') {
    let terrain: RouteTerrain | null = req.terrain
    while (terrain !== null) {
      const out = con(Object.keys(SESGO_TERRENO[terrain]) as SkeletonId[], terrain)
      if (out.length > 0) return out
      terrain = ESCALON_TERRENO[terrain]
    }
    throw new Error(
      `candidatos: ningún esqueleto de un día cabe en ${req.geo.zona} con clase ${req.raceClass}`,
    ) // imposible: ud_esprint no requiere nada y pesa > 0 en las cuatro clases de equipos
  }
  return porPapel(req.role)
}

// ---------------------------------------------------------------------------------------------------
// La cotaFinal de la meta (regla 2 de §5.1, paso 5): sale de ARCH ∩ lo declarado, nunca de la zona.
// Las lee `instanciarFirma` (motifs.ts) y las sella `skeletons.test.ts`.
// ---------------------------------------------------------------------------------------------------

type R = [number, number]
const corta = (a: readonly [number, number], b: readonly [number, number]): R => [
  Math.max(a[0], b[0]),
  Math.min(a[1], b[1]),
]
const vacio = (r: R): boolean => r[0] > r[1]
/** Techo redondeado hacia abajo al 0,1: el sorteo redondeado a 0,1 nunca lo pasa. */
const floor1 = (x: number): number => Math.floor(x * 10 + 1e-9) / 10
/** La resolución de la gramática (km y pendientes al 0,1): el techo de V4b es `puertoLargoKm − 0,1`. */
const DECIMA = 0.1
/** Las altitudes en las que existe un puerto de `ARCH.veto.puertoLargoKm` o más (V4(b)). */
const ALTITUD_DE_PUERTO_LARGO: readonly GeoSignature['altitud'][] = ['media', 'alta', 'altiplano']

/** Envolvente de la cotaFinal por MetaKind. Lee solo ARCH. null = MetaKind sin subida (esprint, sector_meta). */
export function envolventeCotaFinal(
  meta: MetaKind,
  unDia: boolean,
  kmDeclarado?: readonly [number, number],
): { km: R; g: R } | null {
  const A = ARCH.meta
  switch (meta) {
    case 'esprint':
    case 'sector_meta':
      return null
    case 'repecho':
      return {
        km: unDia ? corta(A.repecho.km, [0, A.muro.km[1]]) : [...A.repecho.km],
        g: [...A.repecho.g],
      } // un día: ≤ 2,2 (V5b)
    case 'muro_meta':
      return { km: [...A.muro.km], g: [...A.muro.g] }
    case 'alto_corto':
      return { km: [...A.altoCorto.km], g: [...A.altoCorto.g] }
    case 'alto_largo':
      return { km: [...A.altoLargo.km], g: [...A.altoLargo.g] } // gMaxSiMasDe17 se aplica tras sortear km (techoG)
    case 'cima_cerca':
    case 'descenso_meta':
    case 'valle': {
      if (unDia) return { km: [...A.unDiaUltimaCota.km], g: [...A.unDiaUltimaCota.g] }
      if (!kmDeclarado) throw new Error(`cotaFinal: ${meta} de etapa sin metaParams.cotaFinal`) // ARCH.meta.<clave> solo trae el valle
      const m = kmDeclarado[0] >= ARCH.motivo.puerto.km[0] ? ARCH.motivo.puerto : ARCH.motivo.cota
      return { km: [...m.km], g: [...m.g] }
    }
  }
}

/** Rango de la cotaFinal de la opción elegida: envolvente ∩ lo declarado, km y g por separado. Sin zona. */
export function rangoCotaFinal(sk: Skeleton, alt: Alternativa | null): { km: R; g: R } | null {
  const meta = alt?.meta ?? sk.meta
  const propio = meta === sk.meta ? sk.metaParams?.cotaFinal : undefined // si la opción cambia la meta, el rango del esqueleto no vale
  const kmDecl = alt?.metaParams?.kmRango ?? propio?.km
  const gDecl = alt?.metaParams?.gRango ?? propio?.g
  const env = envolventeCotaFinal(meta, !sk.id.startsWith('et_'), kmDecl)
  if (!env) return null
  const r = { km: corta(env.km, kmDecl ?? env.km), g: corta(env.g, gDecl ?? env.g) }
  if (vacio(r.km) || vacio(r.g))
    throw new Error(`cotaFinal: rango vacío en ${sk.id}${alt ? ` (${alt.nombre})` : ''}`)
  return r
}

/** Techo de km por altitud (V4b y V4c, este con el techo de dibujo), antes de sortear km: con g en su suelo, el producto tiene que caber. */
export function techoKmCotaFinal(r: { km: R; g: R }, altitud: GeoSignature['altitud']): R {
  let hi = r.km[1]
  if (!ALTITUD_DE_PUERTO_LARGO.includes(altitud))
    hi = Math.min(hi, ARCH.veto.puertoLargoKm - DECIMA) // V4b: < 15
  hi = Math.min(hi, techoDeDibujo(altitud) / (r.g[0] * 10)) // V4c con g = suelo (× 10: % a m/km)
  return [r.km[0], floor1(hi)]
}

/** Techo de g con el km ya sorteado: `gMaxSiMasDe17` de alto_largo y V4c. */
export function techoGCotaFinal(
  meta: MetaKind,
  r: { km: R; g: R },
  km: number,
  altitud: GeoSignature['altitud'],
): R {
  let hi = r.g[1]
  if (meta === 'alto_largo' && km > ARCH.meta.altoLargo.kmSuaveDesde)
    hi = Math.min(hi, ARCH.meta.altoLargo.gMaxSiMasDe17)
  hi = Math.min(hi, techoDeDibujo(altitud) / (km * 10))
  return [r.g[0], floor1(hi)]
}

/**
 * El techo de V4(c) con el que se sortea (paso 5): `puertoDplusMax × puertoDplusDibujo`, porque el
 * dibujo de `climb` sube los metros de lo sorteado hasta un 10-20 % (p95 1,06 a 1,17). Lo leen los dos
 * techos de la cotaFinal e `instanciar` para los puertos; V4(c) sigue midiendo contra el techo entero.
 */
export function techoDeDibujo(altitud: GeoSignature['altitud']): number {
  return ARCH.veto.puertoDplusMax[altitud] * ARCH.veto.puertoDplusDibujo
}
