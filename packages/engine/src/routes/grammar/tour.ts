/**
 * COMPOSICIÓN DE UNA VUELTA (docs/generador.md §3.6 y sección 7).
 *
 * El papel de cada etapa es IDENTIDAD (decisión 20): lo decide `itinerarioDe` en el subflujo
 * `arch|raceId` sin `season`, y la edición no lo mueve.
 *
 * Paso 1: solo los tipos. Paso 5: `kmDe`; paso 7: `TOUR_SKELETONS`, `tourSkeletonDe`, `garantias`,
 * `itinerarioDe`, `DEFAULT_ROUTE_CONTEXT`, `ventanaReina` y `composeTour`, más `descansosDe` y los
 * predicados de papel que comparten V13 y V14 (`veto.ts`) y `tour.test.ts`. Desde el paso 8 (v87)
 * `stageMix` delega en `composeTour` y el calendario compone con ella sus vueltas generadas.
 *
 * Ciclo de importación declarado (§15.8): `tour.ts → generate.ts → veto.ts → tour.ts`. Es inocuo
 * porque ninguno de los tres lee un valor de los otros en el nivel superior del módulo, solo dentro
 * de funciones; el segundo `it` de `routes/arranque.test.ts` carga cada fuente el primero y lo sella.
 */
import { ARCH, ROUTE, type EdicionCfg } from '../../constants.js' // EdicionCfg: RouteContext.edicion (§15.8)
import type { RaceFormat, StageSpec } from '../calendar.js' // SOLO tipos, sentencia `import type` entera: se borra al compilar (§3.8)
import type { RouteTerrain } from '../featureProfile.js'
import { routeRng } from '../profileGen.js'
import type { RaceClass } from '../uci.js'
import { generateStage } from './generate.js'
import { ZONAS, admite, territorioDe, type GeoZone, type Relieve } from './geo.js'
import { RACE_REGION } from './regions.js'
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

// ---------------------------------------------------------------------------------------------------
// Predicados de papel y de zona (§7.2). Los exporta el paso 7 porque V13 y V14 (`veto.ts`) y
// `tour.test.ts` miden con ellos: una sola definición de «reina», «acaba arriba» o «crono».
// ---------------------------------------------------------------------------------------------------

/** Las cuatro formas de etapa reina. */
export const esReina = (r: StageRole): boolean =>
  r === 'reina_alto' || r === 'reina_valle' || r === 'reina_encadenada' || r === 'montana_corta'
/** Los papeles que mueren arriba: un final en alto de media montaña o de reina. */
export const acabaArriba = (r: StageRole): boolean =>
  r === 'media_alto' || r === 'reina_alto' || r === 'reina_encadenada' || r === 'montana_corta'
/** Etapa de montaña: toda reina y el final en alto de media montaña. Es lo que forma bloques. */
export const esMontana = (r: StageRole): boolean => esReina(r) || r === 'media_alto'
/** Las cronos, también la sub-23 de los nacionales: no se acortan en la última etapa y cuentan como general. */
export const esCrono = (r: KmRole): boolean =>
  r === 'cri' || r === 'cri_u23' || r === 'prologo' || r === 'cronoescalada'
export const esLlana = (r: StageRole): boolean => r === 'llana' || r === 'llana_viento'
/**
 * Una reina solo cabe en una meta de la cordillera del país o de una zona `montana`/`alta` (§7.1
 * paso 4), y NUNCA en un país con `cordillera: null`: es el veto estructural de §6.3 y D8 (DE y HU en
 * `centroeuropa`, KR, TH e IN en `asia_oriental` son zonas `montana` de países sin reina).
 */
export const admiteReina = (z: GeoZone, cordillera: GeoZone | null): boolean =>
  cordillera !== null &&
  (z === cordillera || ZONAS[z].relieve === 'montana' || ZONAS[z].relieve === 'alta')
/** La excepción de §7.1 paso 4 (`cono_sur`): sin cordillera, una reina blanda donde hay finales largos y puertos. */
const admiteReinaBlanda = (z: GeoZone, cordillera: GeoZone | null): boolean =>
  cordillera === null && ZONAS[z].finalesAlto === 'largo' && ZONAS[z].puerto !== null
/**
 * Lo mismo sin el territorio, para las reglas de bloque, que solo ven las zonas: la primera pasada de
 * «la reina en la cordillera» ya quitó toda reina de un país que no la admite, y la segunda lo repasa.
 */
const admiteReinaZona = (z: GeoZone): boolean =>
  ZONAS[z].relieve === 'montana' ||
  ZONAS[z].relieve === 'alta' ||
  (ZONAS[z].finalesAlto === 'largo' && ZONAS[z].puerto !== null)
/**
 * Lo que `et_media_alto` exige a la zona (sección 5), leído de su `requiere` y no reescrito: §7.2
 * escribía `cota !== null && finalesAlto !== 'ninguno'`, que no mira el `cotaKmMin` del esqueleto.
 */
const admiteFinalAlto = (z: GeoZone): boolean => admite(SKELETONS.et_media_alto.requiere, ZONAS[z])
/** Lo que `et_media_muro` exige. */
const admiteMuro = (z: GeoZone): boolean => admite(SKELETONS.et_media_muro.requiere, ZONAS[z])

/**
 * Ventana 0-based de la reina en `vu_gran_vuelta`: [14; 19] con n = 21 (la [15; 20] 1-based del mapa
 * 07 §2.1 regla 2), [10; 14] con 16 y [10; 13] con 15. Nunca incluye la última (la reserva `ultima`)
 * ni empieza antes del primer descanso.
 */
export const ventanaReina = (n: number): [number, number] => [
  Math.max(ARCH.bloques.gv.descansos[0], Math.floor((2 * n) / 3)),
  n - 2,
]

/**
 * Dónde puede caer la reina de cada esqueleto de composición (§7.2 `reinaTarde`), 0-based: en
 * `vu_semana` las tres últimas, en `vu_larga` el último tercio, en gran vuelta `ventanaReina(n)`; en
 * `vu_corta` cualquiera salvo la primera. La leen `reinaTarde`, la segunda pasada de la cordillera y
 * la reina de la vuelta de montaña.
 */
const VENTANA_REINA: Record<TourSkeletonId, (n: number) => [number, number]> = {
  vu_corta: (n) => [1, n - 1],
  vu_semana: (n) => [n - 3, n - 1],
  vu_larga: (n) => [Math.floor((2 * n) / 3), n - 1],
  vu_gran_vuelta: (n) => ventanaReina(n),
}

/** Los descansos de una vuelta generada (§7.2 `descansos`): tras las etapas 9 y 15 desde `ROUTE.grandTourStages`. */
export function descansosDe(n: number): number[] {
  return n >= ROUTE.grandTourStages ? ARCH.bloques.gv.descansos.filter((d) => d < n) : []
}

// ---------------------------------------------------------------------------------------------------
// Reglas de bloque (§7.2): reparaciones deterministas, de atrás hacia delante, que nunca endurecen.
// ---------------------------------------------------------------------------------------------------

/** Un escalón abajo en `reina_* → media_alto → media → llana`, hasta dejar de ser montaña. */
const fueraDeMontana = (r: StageRole): StageRole => (esMontana(r) ? 'media' : r)

/** Los índices de la última a la primera. */
const haciaAtras = (n: number): number[] => Array.from({ length: n }, (_, k) => n - 1 - k)

/**
 * `reinaTarde`: toda reina fuera de la ventana se intercambia con el hueco admisible más tardío dentro
 * de ella (no reina, no crono, no `roles[0]`); si no lo hay, se degrada a `media_alto`.
 */
function reinaTarde(ventana: (n: number) => [number, number]): BlockRule {
  return {
    id: 'reinaTarde',
    aplica: (n) => n >= 2,
    repara: (roles, zonas) => {
      const r = [...roles]
      const [a, b] = ventana(r.length)
      for (const i of haciaAtras(r.length)) {
        if (!esReina(r[i]!) || (i >= a && i <= b)) continue
        let j = -1
        for (let k = Math.min(b, r.length - 1); k >= Math.max(1, a); k--)
          if (!esReina(r[k]!) && !esCrono(r[k]!) && admiteReinaZona(zonas[k]!)) {
            j = k
            break
          }
        if (j >= 0) [r[i], r[j]] = [r[j]!, r[i]!]
        else r[i] = 'media_alto'
      }
      return r
    },
  }
}

/**
 * `bloqueMontana`: (b) dos etapas de montaña separadas por una sola que no lo es forman bloque si la
 * zona de destino admite la montaña que se mueve (la separadora cambia con la de antes); (a) una racha
 * de más de `rachaMax` (3) etapas de montaña se corta, sacando de la montaña la cuarta (o, si es una
 * reina, la primera etapa de la racha que no lo sea). Con `ultimaFija` no mueve la última etapa.
 */
function bloqueMontana(ultimaFija: boolean, rachaMax: number): BlockRule {
  return {
    id: 'bloqueMontana',
    aplica: (n) => n >= 4,
    repara: (roles, zonas) => {
      const r = [...roles]
      const n = r.length
      const tope = ultimaFija ? n - 2 : n - 1
      for (let i = tope - 1; i >= 2; i--) {
        const sep = r[i]!
        const m = r[i - 1]!
        if (esMontana(sep) || esCrono(sep) || !esMontana(m) || !esMontana(r[i + 1]!)) continue
        const admite = esReina(m) ? admiteReinaZona(zonas[i]!) : admiteFinalAlto(zonas[i]!)
        if (admite) [r[i - 1], r[i]] = [sep, m]
      }
      for (let vueltas = 0; vueltas < n; vueltas++) {
        const racha = rachaLarga(r, esMontana, rachaMax)
        if (racha === null) break
        const [ini, fin] = racha
        const cuarta = ini + rachaMax
        const victima = !esReina(r[cuarta]!)
          ? cuarta
          : (idx(ini, fin).find((k) => !esReina(r[k]!)) ?? cuarta)
        r[victima] = fueraDeMontana(r[victima]!)
      }
      return r
    },
  }
}

/** Los índices de `a` a `b`, ambos incluidos. */
const idx = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, k) => a + k)

/** La última racha de más de `max` papeles seguidos que cumplen `p`, como `[ini, fin]`; null si no hay. */
function rachaLarga(
  r: readonly StageRole[],
  p: (x: StageRole) => boolean,
  max: number,
): [number, number] | null {
  let fin = -1
  for (const i of haciaAtras(r.length)) {
    if (p(r[i]!)) {
      if (fin < 0) fin = i
      if (fin - i + 1 > max && (i === 0 || !p(r[i - 1]!))) return [i, fin]
    } else fin = -1
  }
  return null
}

/**
 * `llanasEntreBloques`: entre dos bloques de montaña, al menos `min` etapas que no lo son. La (b) de
 * `bloqueMontana` ya juntó los que podía; lo que queda se resuelve sacando de la montaña el extremo
 * del bloque anterior (o el del posterior si aquel es una reina y este no), así el hueco crece sin
 * abrir otro. Desviación del paso 7: §7.2 lo deja en (b), que puede no mover nada, y V14 lo exige.
 */
function llanasEntreBloques(min: number): BlockRule {
  return {
    id: 'llanasEntreBloques',
    aplica: (n) => n >= 4,
    repara: (roles) => {
      const r = [...roles]
      for (let vueltas = 0; vueltas < r.length; vueltas++) {
        const h = huecoCorto(r, min)
        if (h === null) break
        const [antes, despues] = h
        const k = esReina(r[antes]!) && !esReina(r[despues]!) ? despues : antes
        r[k] = fueraDeMontana(r[k]!)
      }
      return r
    },
  }
}

/** El último hueco de menos de `min` etapas entre dos de montaña, como `[montaña antes, montaña después]`. */
export function huecoCorto(r: readonly StageRole[], min: number): [number, number] | null {
  let despues = -1
  for (const i of haciaAtras(r.length)) {
    if (!esMontana(r[i]!)) continue
    if (despues >= 0 && despues - i - 1 > 0 && despues - i - 1 < min) return [i, despues]
    despues = i
  }
  return null
}

/** `maxCronos`: la crono sobrante pasa a `llana`, de atrás hacia delante entre las INTERIORES (1 ≤ i ≤ n − 2). */
function maxCronos(max: number): BlockRule {
  return {
    id: 'maxCronos',
    aplica: () => true,
    repara: (roles) => {
      const r = [...roles]
      for (const i of haciaAtras(r.length)) {
        if (r.filter(esCrono).length <= max) break
        if (i >= 1 && i <= r.length - 2 && esCrono(r[i]!)) r[i] = 'llana'
      }
      return r
    },
  }
}

/** Topes de `maxFinalesAlto` por esqueleto de composición (§7.2). */
interface TopesAlto {
  reinas?: number // vu_corta: ≤ 1 reina
  arriba?: number // vu_semana: ≤ 3 etapas que acaban arriba…
  seguidas?: number // …y ≤ 2 seguidas
  altaMontana?: number // vu_gran_vuelta: ≤ 7 reinas
  primeraSemana?: number // vu_gran_vuelta: ≤ 1 final en alto antes del primer descanso
}

/**
 * `maxFinalesAlto`: el sobrante pasa a `media`, sin tocar la última; entre los que sobran se quitan
 * antes los finales de media montaña que las reinas, y antes los tempranos que los tardíos (una vuelta
 * se endurece según avanza: quitando por detrás, la reina de una `vu_corta` se quedaba en la e2). En
 * la primera semana de una gran vuelta se conserva el primero y cae el segundo (§7.2 `descansos`), y
 * se repasa aquí porque `reinaTarde` puede haber dejado allí una reina degradada a `media_alto`.
 */
function maxFinalesAlto(t: TopesAlto): BlockRule {
  const quitaDe = (r: StageRole[], candidatos: number[]): boolean => {
    const k =
      candidatos.find((i) => i < r.length - 1 && !esReina(r[i]!)) ??
      candidatos.find((i) => i < r.length - 1)
    if (k === undefined) return false
    r[k] = 'media'
    return true
  }
  const tope = (
    r: StageRole[],
    p: (x: StageRole) => boolean,
    max: number,
    hasta: number,
    tempranosPrimero = true,
  ): void => {
    for (let v = 0; v < r.length; v++) {
      const orden = tempranosPrimero ? idx(0, hasta - 1) : haciaAtras(hasta)
      const hay = orden.filter((i) => p(r[i]!))
      if (hay.length <= max || !quitaDe(r, hay)) break
    }
  }
  return {
    id: 'maxFinalesAlto',
    aplica: () => true,
    repara: (roles) => {
      const r = [...roles]
      const n = r.length
      if (t.reinas !== undefined) tope(r, esReina, t.reinas, n)
      if (t.altaMontana !== undefined) tope(r, esReina, t.altaMontana, n)
      if (t.arriba !== undefined) tope(r, acabaArriba, t.arriba, n)
      if (t.primeraSemana !== undefined)
        tope(r, acabaArriba, t.primeraSemana, Math.min(n, ARCH.bloques.gv.descansos[0]), false)
      if (t.seguidas !== undefined)
        for (let v = 0; v < n; v++) {
          const racha = rachaLarga(r, acabaArriba, t.seguidas)
          if (
            racha === null ||
            !quitaDe(
              r,
              haciaAtras(racha[1] + 1).filter((i) => i >= racha[0]),
            )
          )
            break
        }
      return r
    },
  }
}

/**
 * `descansos` (solo gran vuelta): antes del primer descanso, a lo sumo `primeraSemanaFinalesAlto`
 * final en alto; el segundo y los siguientes pasan a `media`. La reina de la primera semana la mueve
 * `reinaTarde`, que va después.
 */
function descansos(): BlockRule {
  return {
    id: 'descansos',
    aplica: (n) => n >= ROUTE.grandTourStages,
    repara: (roles) => {
      const r = [...roles]
      let vistos = 0
      for (let i = 0; i < Math.min(r.length, ARCH.bloques.gv.descansos[0]); i++) {
        if (!acabaArriba(r[i]!) || esReina(r[i]!)) continue
        vistos++
        if (vistos > ARCH.bloques.gv.primeraSemanaFinalesAlto) r[i] = 'media'
      }
      return r
    },
  }
}

// ---------------------------------------------------------------------------------------------------
// Los cuatro esqueletos de composición (§7.2).
// ---------------------------------------------------------------------------------------------------

/**
 * El catálogo de composición, elegido sin dado por `n` y clase. Los pesos de las etapas de en medio
 * son `ARCH.pesosComposicion` en los cuatro; lo que cambia es la primera, la última y las reglas.
 */
export const TOUR_SKELETONS: Record<TourSkeletonId, TourSkeleton> = {
  vu_corta: {
    id: 'vu_corta',
    n: [2, 5],
    bloques: [maxFinalesAlto({ reinas: 1 }), maxCronos(1)],
    primera: { llana: 1 },
    ultima: 'ROUTE.lastDecisiveChance',
    pesos: ARCH.pesosComposicion,
  },
  vu_semana: {
    id: 'vu_semana',
    n: [5, 8],
    bloques: [
      reinaTarde(VENTANA_REINA.vu_semana),
      maxFinalesAlto({ arriba: 3, seguidas: 2 }),
      maxCronos(2),
    ],
    primera: { llana: 0.75, prologo: 0.25 },
    ultima: 'ROUTE.lastDecisiveChance',
    pesos: ARCH.pesosComposicion,
  },
  vu_larga: {
    id: 'vu_larga',
    n: [9, 14],
    bloques: [
      reinaTarde(VENTANA_REINA.vu_larga),
      bloqueMontana(false, 3),
      llanasEntreBloques(ARCH.bloques.gv.minLlanasEntreBloques),
      maxCronos(2),
    ],
    primera: { llana: 0.75, prologo: 0.25 },
    ultima: 'ROUTE.lastDecisiveChance',
    pesos: ARCH.pesosComposicion,
  },
  vu_gran_vuelta: {
    id: 'vu_gran_vuelta',
    n: [15, 21],
    bloques: [
      descansos(),
      reinaTarde(VENTANA_REINA.vu_gran_vuelta),
      bloqueMontana(true, 3),
      llanasEntreBloques(ARCH.bloques.gv.minLlanasEntreBloques),
      maxFinalesAlto({
        altaMontana: ARCH.bloques.gv.maxAltaMontana,
        primeraSemana: ARCH.bloques.gv.primeraSemanaFinalesAlto,
      }),
      maxCronos(3),
    ],
    primera: { llana: 0.7, prologo: 0.3 },
    ultima: { llana: 0.85, cri: 0.15 }, // Tour 2024 (mapa 07 §2.1 regla 3): paseo o, por excepción, crono
    pesos: ARCH.pesosComposicion,
  },
}

/** El esqueleto de composición por `n` y clase, sin dado (§7.2): la frontera de 5 etapas la decide la clase. */
export function tourSkeletonDe(n: number, raceClass: RaceClass): TourSkeleton {
  if (n >= TOUR_SKELETONS.vu_gran_vuelta.n[0]) return TOUR_SKELETONS.vu_gran_vuelta
  if (n >= TOUR_SKELETONS.vu_larga.n[0]) return TOUR_SKELETONS.vu_larga
  const semana =
    n > TOUR_SKELETONS.vu_corta.n[1] || (n === 5 && (raceClass === 'WT' || raceClass === 'Pro'))
  return semana ? TOUR_SKELETONS.vu_semana : TOUR_SKELETONS.vu_corta
}

// ---------------------------------------------------------------------------------------------------
// Los papeles: `mixRoles` conservado (calendar.ts) con los pesos por relieve y las garantías puras.
// ---------------------------------------------------------------------------------------------------

/** Las tres claves de las tablas de `ROUTE` que sobreviven como índice (`mixTerrain` de calendar.ts). */
type MixTerrain = keyof typeof ROUTE.lastDecisiveChance
const mixTerrain = (t: RouteTerrain): MixTerrain =>
  t === 'mountain' ? 'mountain' : t === 'hilly' || t === 'classic' ? 'hilly' : 'flat'

/** Lo que exige alguno de los esqueletos del papel `media` (`et_media_valle`, `et_media_tendida`). */
const admiteMedia = (z: GeoZone): boolean =>
  admite(SKELETONS.et_media_valle.requiere, ZONAS[z]) ||
  admite(SKELETONS.et_media_tendida.requiere, ZONAS[z])
/**
 * El papel con puertos que una garantía pone en una meta: `media`, o `media_muro` donde la zona no
 * tiene ninguna media pero sí muros (en `flandes` una `media` se degradaría a llana al dibujarse).
 */
const endurecida = (z: GeoZone): StageRole =>
  !admiteMedia(z) && admiteMuro(z) ? 'media_muro' : 'media'

/** Etapa con puertos, algo que morder: ni llana ni crono. */
const esSelectiva = (r: StageRole): boolean => !esLlana(r) && !esCrono(r)
/** Y que además se dibujará con puertos: una `media` en una zona sin ninguna media baja a llana. */
const selectivaEn = (r: StageRole, z: GeoZone): boolean =>
  esSelectiva(r) && (r !== 'media' || admiteMedia(z))

/** Los papeles en línea de la tabla de pesos, en su orden (§7.3). */
const EN_LINEA: readonly StageRole[] = [
  'llana',
  'llana_viento',
  'media',
  'media_alto',
  'media_muro',
  'reina_alto',
  'reina_valle',
  'reina_encadenada',
  'montana_corta',
]

/** Sorteo con pesos sobre una clave de `Weighted`: una tirada `u`, el primero cuyo tramo la contiene. */
function sortea<T extends string>(orden: readonly T[], pesos: Weighted<T>, u: number): T {
  const total = orden.reduce((a, k) => a + (pesos[k] ?? 0), 0)
  let acc = 0
  for (const k of orden) {
    acc += (pesos[k] ?? 0) / total
    if (u < acc) return k
  }
  return orden.find((k) => (pesos[k] ?? 0) > 0) ?? orden[0]!
}

/** La fila de pesos de una meta: `llana_viento` solo con `viento ≥ 2`; si no, su peso va a `llana` (§7.3). */
function pesosDe(sk: TourSkeleton, z: GeoZone): Weighted<StageRole> {
  const fila = { ...sk.pesos[ZONAS[z].relieve] }
  if (ZONAS[z].viento < 2) {
    fila.llana = (fila.llana ?? 0) + (fila.llana_viento ?? 0)
    delete fila.llana_viento
  }
  return fila
}

/**
 * Los pasos 1 a 3 de `mixRoles` (`calendar.ts`) con su orden y sus constantes: la crono, la última
 * (con `ultima` propia en gran vuelta: una sola tirada) y las de en medio sobre la fila de
 * `ARCH.pesosComposicion` del relieve de SU meta. El paso 4 son las `garantias`.
 */
function mixRoles(
  sk: TourSkeleton,
  n: number,
  terrain: MixTerrain,
  metas: readonly GeoZone[],
  rand: () => number,
): StageRole[] {
  const roles: StageRole[] = Array.from({ length: n }, () => 'llana')
  if (n <= 1) return roles

  // 1. Crono(s).
  const alwaysItt = terrain === 'flat' && n >= ROUTE.ittAlwaysFlatStages
  const ittChance = n >= ROUTE.ittWeekStages ? ROUTE.ittChanceWeek : ROUTE.ittChanceShort
  if (n >= ROUTE.ittMinStages && (alwaysItt || rand() < ittChance)) {
    const back = rand() < ROUTE.ittEarlierChance ? 2 : 1
    roles[Math.min(n - 2, Math.max(1, n - 1 - back))] = 'cri'
    if (n >= ROUTE.ittSecondStages) {
      const early = Math.min(n - 3, Math.max(1, Math.round(ROUTE.ittSecondPosition * n)))
      roles[early] = 'cri'
    }
  }

  // 2. La última etapa: decisiva o de trámite; en gran vuelta, paseo o crono.
  const lastIdx = n - 1
  if (roles[lastIdx] !== 'cri') {
    if (sk.ultima === 'ROUTE.lastDecisiveChance') {
      if (rand() < ROUTE.lastDecisiveChance[terrain])
        roles[lastIdx] = rand() < ROUTE.lastSummitShare[terrain] ? 'reina_alto' : 'media_alto'
    } else roles[lastIdx] = sortea<StageRole>(['llana', 'cri'], sk.ultima, rand())
  }

  // 3. Las de en medio, por sorteo con los pesos del relieve de su meta.
  for (let i = 1; i < lastIdx; i++) {
    if (roles[i] === 'cri') continue
    roles[i] = sortea(EN_LINEA, pesosDe(sk, metas[i]!), rand())
  }
  return roles
}

/**
 * Las garantías de `mixRoles` (`calendar.ts`, paso 4) como función pura, más la quinta de §7.3. Solo
 * endurecen y solo por la cola: los huecos son todos menos la primera y las cronos, de atrás hacia
 * delante, y la última al final de la cola. (1) Un mínimo de etapas con puertos
 * (`ROUTE.selectiveMinFraction`); (2) desde `ROUTE.uphillFinishMinStages`, un final en alto; (3) la de
 * fondo, crono o final en alto; (4) nunca ocho llanas seguidas. Lo que (1) y (4) ponen es `media`, o
 * `media_muro` donde la zona no tiene ninguna media y sí muros (desviación del paso 7: con `media` en
 * `flandes` la garantía se cumplía en el papel y no en la etiqueta). El final en alto garantizado salta los
 * huecos cuya zona no lo admite: `media_alto` si la zona tiene cota y finales, si no `media_muro` si
 * tiene muros; si ninguna zona de la vuelta admite ninguno, la garantía la cumple la crono. Nunca
 * convierte una reina.
 */
export function garantias(
  roles: StageRole[],
  terrain: RouteTerrain,
  n: number,
  zonas: GeoZone[],
): StageRole[] {
  const r = [...roles]
  if (n <= 1) return r
  const t = mixTerrain(terrain)
  const lastIdx = n - 1
  const slots: number[] = []
  for (let i = n - 2; i >= 1; i--) if (!esCrono(r[i]!)) slots.push(i)
  if (!esCrono(r[lastIdx]!)) slots.push(lastIdx)

  // (1) Mínimo de etapas con puertos.
  const minSelectivas = Math.min(Math.ceil(ROUTE.selectiveMinFraction[t] * n), slots.length)
  for (const i of slots) {
    if (r.filter((x, k) => selectivaEn(x, zonas[k]!)).length >= minSelectivas) break
    if (!selectivaEn(r[i]!, zonas[i]!)) r[i] = endurecida(zonas[i]!)
  }

  // El hueco que pasa a morir arriba: la más tardía de las que ya tienen puertos, si no cualquiera, y
  // entre ellas la primera cuya zona admite el final en alto (si no, un muro).
  const orden = [
    ...slots.filter((i) => esSelectiva(r[i]!)),
    ...slots.filter((i) => !esSelectiva(r[i]!)),
  ].filter((i) => !esReina(r[i]!))
  const muereArriba = (): void => {
    const alto = orden.find((i) => admiteFinalAlto(zonas[i]!))
    if (alto !== undefined) r[alto] = 'media_alto'
    else {
      const muro = orden.find((i) => admiteMuro(zonas[i]!))
      if (muro !== undefined) r[muro] = 'media_muro'
    }
  }
  const sinAltoPosible = !slots.some((i) => admiteFinalAlto(zonas[i]!))
  const decideArriba = (x: StageRole): boolean =>
    acabaArriba(x) || (sinAltoPosible && x === 'media_muro')

  // (2) Un final en alto desde 4 etapas.
  if (n >= ROUTE.uphillFinishMinStages && !r.some(decideArriba)) muereArriba()
  // (3) La de fondo: ninguna vuelta sin crono ni final en alto.
  if (!r.some((x) => esCrono(x) || decideArriba(x))) muereArriba()
  // (4) Nunca ocho llanas seguidas: la primera que sobra de la racha pasa a `media`.
  const max = ARCH.bloques.llanasSeguidasMax
  for (let v = 0; v < n; v++) {
    const racha = rachaLarga(r, esLlana, max)
    if (racha === null) break
    r[racha[0] + max] = endurecida(zonas[racha[0] + max]!)
  }
  return r
}

// ---------------------------------------------------------------------------------------------------
// El itinerario (§7.1) y la vuelta compuesta (§7.5).
// ---------------------------------------------------------------------------------------------------

/** La ventana de `w` zonas de la ruta desde `s`, hacia delante o hacia atrás (circular). */
const ventanaDe = (ruta: readonly GeoZone[], s: number, w: number, paso: 1 | -1): GeoZone[] =>
  Array.from(
    { length: w },
    (_, k) => ruta[(((s + paso * k) % ruta.length) + ruta.length) % ruta.length]!,
  )

/**
 * Primera y segunda pasada de «la reina en la cordillera» (§7.1 paso 4). Una reina en una meta que no
 * la admite se intercambia con la etapa admisible más tardía (no la primera, no una crono, no ya
 * reina; en la segunda pasada, dentro de `dentro`); si no hay, baja a `media_alto`. Sin cordillera, en
 * las zonas de la excepción `cono_sur` (y fuera de una gran vuelta) queda a lo sumo UNA, la más
 * tardía, como `reina_alto`.
 */
function reinaEnLaCordillera(
  roles: StageRole[],
  metas: readonly GeoZone[],
  cordillera: GeoZone | null,
  blanda: boolean,
  dentro: (i: number) => boolean,
): StageRole[] {
  const r = [...roles]
  let blandas = 0
  const admite = (i: number): boolean => admiteReina(metas[i]!, cordillera)
  for (const i of haciaAtras(r.length)) {
    if (!esReina(r[i]!)) continue
    if (admite(i)) continue
    if (blanda && admiteReinaBlanda(metas[i]!, cordillera) && blandas === 0) {
      blandas++
      r[i] = 'reina_alto'
      continue
    }
    const j = haciaAtras(r.length).find(
      (k) => k > 0 && dentro(k) && !esReina(r[k]!) && !esCrono(r[k]!) && admite(k),
    )
    if (j !== undefined) [r[i], r[j]] = [r[j]!, r[i]!]
    else r[i] = 'media_alto'
  }
  return r
}

/** Anota en `notas` cada papel que una reparación cambió: «e5: reina_alto → media_alto (reinaTarde)». */
function anota(
  notas: string[],
  antes: readonly StageRole[],
  despues: readonly StageRole[],
  por: string,
): void {
  despues.forEach((r, i) => {
    if (antes[i] !== r) notas.push(`e${i + 1}: ${antes[i]} → ${r} (${por})`)
  })
}

/**
 * El itinerario de una vuelta generada (§7.1): identidad, en el subflujo `arch|${raceId}` sin
 * temporada. En este orden de tiradas: las `n − 1` de metas, las de `mixRoles` (crono, última, las de
 * en medio), la del prólogo (si `n ≥ ROUTE.ittWeekStages`), la de la cronoescalada (si hay cordillera y
 * una `cri` admisible) y las `n` de km. Las reparaciones no tiran dados.
 */
export function itinerarioDe(
  raceId: string,
  country: string | null,
  n: number,
  terrain: RouteTerrain,
  raceClass: RaceClass,
  format: RaceFormat,
): Itinerario {
  const rand = routeRng(`arch|${raceId}`)
  const sk = tourSkeletonDe(n, raceClass)
  const T = territorioDe(country)
  const notas: string[] = []

  // 1. Ventana, sin dado: anclada en la zona curada de la carrera y elegida por el terreno.
  const ruta = T.ruta.map((z) => z.zona)
  const curada = RACE_REGION[raceId]?.default
  const s = curada !== undefined && ruta.includes(curada) ? ruta.indexOf(curada) : 0
  const w = Math.min(Math.max(1, n), ruta.length)
  const candidatas = [ventanaDe(ruta, s, w, 1), ventanaDe(ruta, s, w, -1)]
  const cord = T.cordillera
  const ventana =
    (terrain === 'mountain' && cord !== null
      ? candidatas.find((v) => v.includes(cord))
      : terrain === 'flat' || terrain === 'cobbles' || terrain === 'itt'
        ? candidatas.find((v) => cord === null || !v.includes(cord))
        : undefined) ?? candidatas[0]!

  // 2. Metas: una tirada por etapa tras la primera, avance con p `ARCH.itinerario.avance`.
  const metas: GeoZone[] = [ventana[0]!]
  let cursor = 0
  for (let i = 1; i < n; i++) {
    const u = rand()
    if (cursor < ventana.length - 1 && u < ARCH.itinerario.avance) cursor++
    metas.push(ventana[cursor]!)
  }
  const curadas = RACE_REGION[raceId]?.stages
  if (curadas)
    for (const [k, z] of Object.entries(curadas)) if (Number(k) - 1 < n) metas[Number(k) - 1] = z

  // 3. Papeles: `mixRoles` y sus garantías, y las dos tiradas nuevas.
  let roles = garantias(mixRoles(sk, n, mixTerrain(terrain), metas, rand), terrain, n, metas)
  if (n >= ROUTE.ittWeekStages && rand() < (sk.primera.prologo ?? 0)) roles[0] = 'prologo'
  if (cord !== null) {
    const cri = haciaAtras(n).find(
      (i) => i >= 1 && roles[i] === 'cri' && admiteReina(metas[i]!, cord),
    )
    if (cri !== undefined && rand() < ARCH.itinerario.cronoescaladaP) roles[cri] = 'cronoescalada'
  }

  // 4 y 5. La reina en la cordillera, las reglas de bloque, la segunda pasada y las garantías.
  const blanda = format !== 'gran-vuelta' // en gran vuelta la reina es de verdad (§7.2)
  let antes = roles
  roles = reinaEnLaCordillera(roles, metas, cord, blanda, () => true)
  anota(notas, antes, roles, cord === null ? 'sin cordillera' : 'ventana sin cordillera')
  for (const regla of sk.bloques) {
    if (!regla.aplica(n)) continue
    antes = roles
    roles = regla.repara(roles, metas)
    anota(notas, antes, roles, regla.id)
  }
  // La segunda pasada no saca una reina de la ventana de su esqueleto (V14 en gran vuelta).
  const [va, vb] = VENTANA_REINA[sk.id](n)
  antes = roles
  roles = reinaEnLaCordillera(roles, metas, cord, blanda, (i) => i >= va && i <= vb)
  anota(notas, antes, roles, 'reina en la cordillera, segunda pasada')
  antes = roles
  roles = garantias(roles, terrain, n, metas)
  anota(notas, antes, roles, 'garantías')
  // Una vuelta de terreno `mountain` con cordillera tiene su reina: si el sorteo y las reparaciones no
  // dejaron ninguna, el final en alto más tardío dentro de la ventana de la reina con meta admisible
  // pasa a `reina_alto`. Cambia un final en alto por otro: no mueve bloques, ni topes, ni garantías.
  if (terrain === 'mountain' && cord !== null && !roles.some(esReina)) {
    const k = haciaAtras(n).find(
      (i) => i >= va && i <= vb && roles[i] === 'media_alto' && admiteReina(metas[i]!, cord),
    )
    if (k !== undefined) {
      antes = roles
      roles = roles.map((r, i) => (i === k ? 'reina_alto' : r))
      anota(notas, antes, roles, 'vuelta de montaña sin reina')
    }
  }
  if (
    n >= ROUTE.uphillFinishMinStages &&
    !roles.some(acabaArriba) &&
    !roles.some((r) => r === 'media_muro')
  )
    notas.push(
      `sin final en alto posible en ${[...new Set(metas)].join(', ')}: la general es la crono`,
    )

  // 6. Kilómetros, por clase y papel.
  const km = roles.map((role, i) => kmDe(role, raceClass, n, i === n - 1, rand))

  // 7. Transición: la salida de cada etapa es la meta de la anterior.
  const desde = metas.map((z, i) => (i === 0 ? z : metas[i - 1]!))
  return { metas, papeles: roles, km, desde, notas }
}

/** El contexto de los tests y de `stageMix` sin contexto: país desconocido (`generico`), .2, una semana, temporada base. */
export const DEFAULT_ROUTE_CONTEXT: RouteContext = {
  country: null,
  raceClass: '2',
  format: 'una-semana',
  season: ARCH.edicion.baseSeason, // = BASE_SEASON; tour.ts no importa edition.ts (§3.6)
}

/**
 * Lo que `stageMix` hace por dentro desde el paso 8 (§7.5): el itinerario y una `generateStage` por
 * etapa con su papel, sus km, la zona de su meta y la de su salida si es de transición. `raceId` es la
 * identidad (`arch|raceId`), la clave de `itinerarioDe` y la de `RACE_REGION`. La llaman `stageMix` y
 * la rama de vuelta de `buildRace` (`routes/calendar.ts`).
 */
export function composeTour(
  raceId: string,
  n: number,
  terrain: RouteTerrain,
  ctx: RouteContext,
): StageSpec[] {
  const it = itinerarioDe(raceId, ctx.country, n, terrain, ctx.raceClass, ctx.format)
  return it.papeles.map((role, i) => {
    const meta = it.metas[i]!
    const desde = it.desde[i]!
    const g = generateStage({
      raceId,
      stageIndex: i + 1,
      season: ctx.season,
      km: it.km[i]!,
      role,
      terrain,
      geo: ZONAS[meta],
      ...(desde !== meta ? { desde } : {}),
      raceClass: ctx.raceClass,
      format: ctx.format,
      routeSource: 'generado',
      ...(ctx.edicion ? { edicion: ctx.edicion } : {}),
    })
    return {
      kind: g.kind,
      label: g.label,
      profile: g.profile,
      ...(g.timeTrial ? { timeTrial: true } : {}),
      routeSource: g.routeSource,
      arch: g.arch,
    }
  })
}

// ---------------------------------------------------------------------------------------------------
// Kilómetros (§7.4), del paso 5.
// ---------------------------------------------------------------------------------------------------

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
