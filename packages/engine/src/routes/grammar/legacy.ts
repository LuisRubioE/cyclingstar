/**
 * LOS OCHO GENERADORES DE HOY ESCRITOS CON LA GRAMÁTICA (docs/generador.md §3.12 y §15.3; I-42).
 *
 * Es la prueba de que la gramática puede expresar las formas de hoy antes de sustituirlas: cada
 * `xxxSegments` de `profileGen.ts` tiene aquí su `LegacySkeleton` (con los rangos de hoy, mapa 01 §8)
 * y `legacyMotivos` reproduce su secuencia de piezas como `Motif[]`. `legacy.test.ts` exige el mismo
 * número y orden de dificultades que la función vieja; en el paso 4, `colocarLegado` +
 * `renderSkeleton` contra los viejos dan la tabla pareada "igual dentro del ruido".
 *
 * `LegacySkeleton` NO es un `Skeleton` (su `id` no es un `SkeletonId`): el compilador impide que un
 * legado se cuele en `SKELETONS`, en `candidatos` o en la galería. El fichero se borra en el paso 8.
 *
 * Cómo se escribe cada forma vieja, decidido aquí porque las secciones no lo fijan pieza a pieza:
 *
 * - `legacyMotivos` REPRODUCE LAS TIRADAS del generador viejo con las mismas primitivas en el mismo
 *   orden (los `rolling`, `climb` y `descent` se llaman y su dibujo se descarta, solo para dejar la
 *   corriente donde la deja el viejo). Así cada km y cada pendiente del motivo es el que el viejo
 *   sorteó, antes de `normalize` (que reescala) y de `garantizaPuerto` (que recorta el puerto más
 *   largo): esas dos son fontanería del viejo, no forma.
 * - Cada relleno es un `enlace`, cada bajada un `descenso` (con `g` negativa, la media del viejo) y
 *   cada subida una dificultad: `muro` en la clásica de muros; `puerto` si mide ≥ `PASS_MIN_KM` y
 *   `cota` si no, en el resto; cada sector de pavé, un `sector` de adoquín.
 * - La `meta` es siempre el último motivo. Cuando el viejo sortea un puerto FINAL propio (`finalLen`
 *   y `finalG`: final en alto, reina y clásica de montaña), ese puerto es la `cotaFinal` de la meta y
 *   `Motif.km` suma subida, bajada y valle, como manda §4.3. Cuando no lo sortea (llana, crono,
 *   media, clásica y pavé), la meta es `esprint` de 0 km: el último enlace ya es la llegada.
 */
import { ROUTE } from '../../constants.js'
import type { FinalKind } from '../finalKind.js'
import { between, climb, descent, rolling, routeRng, split } from '../profileGen.js'
import { PASS_MIN_KM } from '../stageKind.js'
import type { MetaKind, Motif } from './motifs.js'
import type { Placed } from './place.js'
import type { Skeleton } from './skeletons.js'

export type LegacyId =
  | 'lg_flat'
  | 'lg_hilly'
  | 'lg_hilly_uphill'
  | 'lg_mountain'
  | 'lg_mountain_classic'
  | 'lg_classic'
  | 'lg_cobbles'
  | 'lg_itt'

/** NO es un Skeleton: no entra en SKELETONS, candidatos ni la galería. */
export type LegacySkeleton = Omit<Skeleton, 'id'> & { id: LegacyId }

const r1 = (x: number): number => Math.round(x * 10) / 10

/** Relleno de hoy: amplitud 1,8 (llano) o 3,2 con rompepiernas al 35 % (media montaña, `bumpy`). */
const PLANO = [1.8, 0] as const
const BUMPY = [3.2, 0.35] as const

/** Un relleno del viejo: consume sus tiradas con `rolling` y devuelve el `enlace` (nada si `rolling` no dibuja). */
function enlace(rand: () => number, km: number, [amp, p]: readonly [number, number]): Motif[] {
  return rolling(rand, km, amp, p).length > 0 ? [{ kind: 'enlace', km: r1(km) }] : []
}

/** Una subida del viejo: consume las tiradas de `climb` y devuelve la dificultad. */
function subida(rand: () => number, len: number, g: number, muro = false): Motif {
  climb(rand, len, g)
  const kind = muro ? 'muro' : len >= PASS_MIN_KM ? 'puerto' : 'cota'
  return { kind, km: r1(len), g: r1(g) }
}

/** Una bajada del viejo (`avg` positiva, como la recibe `descent`). */
function bajada(rand: () => number, len: number, avg: number): Motif {
  descent(rand, len, avg)
  return { kind: 'descenso', km: r1(len), g: -avg }
}

/** Meta de esprint: 0 km, el último enlace ya es la llegada. */
const esprint = (): Motif => ({ kind: 'meta', meta: 'esprint', km: 0 })

/** La meta con el puerto final del viejo como `cotaFinal`; `valle` = km de bajada y llano detrás. */
function metaCon(meta: MetaKind, len: number, g: number, valle: number): Motif {
  return { kind: 'meta', meta, km: r1(len + valle), cotaFinal: { km: r1(len), g: r1(g) } }
}

/** Copia de `profileGen.ts::sampleFinalKind` (privada allí): una tirada contra `ROUTE.queenFinalMix`. */
function finalKindViejo(rand: () => number): FinalKind {
  const m = ROUTE.queenFinalMix
  const x = rand()
  if (x < m.alto) return 'alto'
  if (x < m.alto + m.cima_cerca) return 'cima_cerca'
  if (x < m.alto + m.cima_cerca + m.valle_corto) return 'valle_corto'
  return 'valle_largo'
}

/** Copia de `profileGen.ts::valleyKmFor` (privada allí). */
function valleViejo(kind: FinalKind, rand: () => number): number {
  if (kind === 'alto') return 0
  if (kind === 'cima_cerca') return between(rand, 1.5, 5)
  if (kind === 'valle_corto') return between(rand, 6, 20)
  return between(rand, 22, 45)
}

/** El `MetaKind` de la gramática que corresponde a cada final de la reina vieja (§4.3). */
const META_DE_FINAL: Record<FinalKind, MetaKind> = {
  alto: 'alto_largo',
  cima_cerca: 'cima_cerca',
  valle_corto: 'descenso_meta',
  valle_largo: 'valle',
}

/** `flatSegments` (y `ittSegments`, que es la misma función). */
function llana(rand: () => number, km: number): Motif[] {
  return [...enlace(rand, km, PLANO), esprint()]
}

/** `hillySegments`: 2 cotas (≤ 170 km) o 3, bajada solo entre cotas, relleno tras la última. */
function media(rand: () => number, km: number): Motif[] {
  const nClimbs = km > 170 ? 3 : 2
  const climbs = Array.from({ length: nClimbs }, () => ({
    len: between(rand, 3, 7),
    g: between(rand, 4.5, 6.5),
  }))
  const used = climbs.reduce((a, c) => a + c.len, 0) + climbs.length * 4
  const fill = Math.max(km * 0.35, km - used)
  const gaps = split(rand, fill, nClimbs + 1)
  const out: Motif[] = [...enlace(rand, gaps[0]!, BUMPY)]
  climbs.forEach((c, i) => {
    out.push(subida(rand, c.len, c.g))
    if (i < nClimbs - 1) out.push(bajada(rand, between(rand, 3, 5), 5))
    out.push(...enlace(rand, gaps[i + 1]!, BUMPY))
  })
  return [...out, esprint()]
}

/** `hillyUphillSegments`: 1 (≤ 170 km) o 2 cotas con su bajada y la cota final en la línea. */
function mediaEnAlto(rand: () => number, km: number): Motif[] {
  const nClimbs = km > 170 ? 2 : 1
  const climbs = Array.from({ length: nClimbs }, () => ({
    len: between(rand, 3, 7),
    g: between(rand, 4.5, 6.5),
  }))
  const finalLen = between(rand, 4, 7.5)
  const finalG = between(rand, 5, 7.5)
  const used = climbs.reduce((a, c) => a + c.len, 0) + nClimbs * 4 + finalLen
  const fill = Math.max(km * 0.3, km - used)
  const gaps = split(rand, fill, nClimbs + 1)
  const out: Motif[] = [...enlace(rand, gaps[0]!, BUMPY)]
  climbs.forEach((c, i) => {
    out.push(subida(rand, c.len, c.g))
    out.push(bajada(rand, between(rand, 3, 5), 5))
    out.push(...enlace(rand, gaps[i + 1]!, BUMPY))
  })
  climb(rand, finalLen, finalG)
  return [...out, metaCon('alto_corto', finalLen, finalG, 0)]
}

/** `mountainSegments` sin `opts`: brazo de desnivel, final sorteado, puertos escalados y valle. */
function reina(rand: () => number, km: number): Motif[] {
  const midClimbs = km > 165 ? 3 : 2
  const alto = rand() < ROUTE.queenHighDplusShare
  const dPlusTarget = alto
    ? Math.exp(
        between(rand, Math.log(ROUTE.queenDplusRange.min), Math.log(ROUTE.queenDplusRange.max)),
      )
    : between(rand, ROUTE.queenLowDplusRange.min, ROUTE.queenLowDplusRange.max)
  const finalKind = finalKindViejo(rand)
  const valleKm = valleViejo(finalKind, rand)
  const mids = Array.from({ length: midClimbs }, () => ({
    len: between(rand, 6, 11),
    g: between(rand, 5.5, 7.5),
  }))
  const finalLen = between(rand, 9, 15)
  const finalG = between(rand, 7.5, 9.5)
  const dPlusDe = (len: number, g: number): number => len * 1000 * (g / 100)
  const dPlusBase = mids.reduce((a, c) => a + dPlusDe(c.len, c.g), 0) + dPlusDe(finalLen, finalG)
  const escala = Math.min(1.8, Math.max(0.55, dPlusTarget / Math.max(1, dPlusBase)))
  const midsEsc = mids.map((c) => ({ len: c.len * escala, g: c.g }))
  const finalLenEsc = Math.max(8.6, finalLen * escala)
  const used = midsEsc.reduce((a, c) => a + c.len, 0) + midClimbs * 6 + finalLenEsc + valleKm
  const fill = Math.max(km * 0.15, km - used)
  const gaps = split(rand, fill, midClimbs + 1)
  const out: Motif[] = [...enlace(rand, gaps[0]!, BUMPY)]
  midsEsc.forEach((c, i) => {
    out.push(subida(rand, c.len, c.g))
    out.push(bajada(rand, between(rand, 5, 8), 6))
    out.push(...enlace(rand, gaps[i + 1]!, BUMPY))
  })
  climb(rand, finalLenEsc, finalG)
  if (valleKm > 0.5) {
    const km1 = Math.min(valleKm, between(rand, 4, 10))
    descent(rand, km1, 6)
    if (valleKm - km1 > 0.5) rolling(rand, valleKm - km1, ...PLANO)
  }
  return [...out, metaCon(META_DE_FINAL[finalKind], finalLenEsc, finalG, valleKm)]
}

/** `mountainClassicSegments`: 2 (≤ 165 km) o 3 puertos y el último, corto, a 13-22 km de meta. */
function clasicaDeMontana(rand: () => number, km: number): Motif[] {
  const midClimbs = km > 165 ? 3 : 2
  const mids = Array.from({ length: midClimbs }, () => ({
    len: between(rand, 6, 11),
    g: between(rand, 5.5, 7.5),
  }))
  const finalLen = between(rand, 4, 8)
  const finalG = between(rand, 7.5, 10)
  const runIn = between(rand, 13, 22)
  const used = mids.reduce((a, c) => a + c.len, 0) + midClimbs * 6 + finalLen + runIn
  const fill = Math.max(km * 0.2, km - used)
  const gaps = split(rand, fill, midClimbs + 1)
  const out: Motif[] = [...enlace(rand, gaps[0]!, BUMPY)]
  mids.forEach((c, i) => {
    out.push(subida(rand, c.len, c.g))
    out.push(bajada(rand, between(rand, 5, 8), 6))
    out.push(...enlace(rand, gaps[i + 1]!, BUMPY))
  })
  climb(rand, finalLen, finalG)
  const km1 = Math.min(runIn * 0.6, Math.max(2, (finalLen * finalG * 10) / 55))
  descent(rand, km1, 6)
  rolling(rand, runIn - km1, ...PLANO)
  // El corte de 20 km de `FINAL_KIND_CUTS` separa `valle_corto` de `valle_largo`.
  const meta: MetaKind = runIn < 20 ? 'descenso_meta' : 'valle'
  return [...out, metaCon(meta, finalLen, finalG, runIn)]
}

/** `classicSegments`: 4 muros (≤ 200 km) o 5, sin bajadas, relleno tras cada uno. */
function clasica(rand: () => number, km: number): Motif[] {
  const nWalls = km > 200 ? 5 : 4
  const walls = Array.from({ length: nWalls }, () => ({
    len: between(rand, 1, 2.5),
    g: between(rand, 8, 12),
  }))
  const used = walls.reduce((a, w) => a + w.len, 0)
  const fill = Math.max(km * 0.5, km - used)
  const gaps = split(rand, fill, nWalls + 1)
  const out: Motif[] = [...enlace(rand, gaps[0]!, BUMPY)]
  walls.forEach((w, i) => {
    out.push(subida(rand, w.len, w.g, true))
    out.push(...enlace(rand, gaps[i + 1]!, BUMPY))
  })
  return [...out, esprint()]
}

/** `cobblesSegments`: tres sectores de 3, 5 y 4 estrellas, siempre en ese orden, relleno llano. */
function pave(rand: () => number, km: number): Motif[] {
  const sectors = [3, 5, 4]
  const sectorKm = sectors.map(() => between(rand, 2, 4))
  const used = sectorKm.reduce((a, b) => a + b, 0)
  const fill = Math.max(km * 0.5, km - used)
  const gaps = split(rand, fill, sectors.length + 1)
  const out: Motif[] = [...enlace(rand, gaps[0]!, PLANO)]
  sectors.forEach((estrellas, i) => {
    out.push({ kind: 'sector', km: r1(sectorKm[i]!), firme: 'adoquin', estrellas })
    out.push(...enlace(rand, gaps[i + 1]!, PLANO))
  })
  return [...out, esprint()]
}

const CONSTRUCTORES: Record<LegacyId, (rand: () => number, km: number) => Motif[]> = {
  lg_flat: llana,
  lg_hilly: media,
  lg_hilly_uphill: mediaEnAlto,
  lg_mountain: reina,
  lg_mountain_classic: clasicaDeMontana,
  lg_classic: clasica,
  lg_cobbles: pave,
  lg_itt: llana, // `ittSegments === flatSegments` (mapa 01 §2.1)
}

/**
 * La secuencia COMPLETA del generador viejo para (id, km, seed): dificultades, bajadas y enlaces con
 * su km, en su orden fijo, con la cardinalidad por umbral de km de hoy. Pura: la semilla es la misma
 * cadena que recibe el `xxxSegments` viejo (`routeRng(seed)`).
 */
export function legacyMotivos(id: LegacyId, km: number, seed: string): Motif[] {
  return CONSTRUCTORES[id](routeRng(seed), km)
}

/**
 * Pone los motivos uno detrás de otro en el orden de legacyMotivos (inicioKm = Σ km anteriores), sin
 * ventanas ni tirada `pos`; `slot` = índice en esa lista, 'meta' el último. Es lo que la tabla
 * pareada del paso 4 pasa a renderSkeleton.
 */
export function colocarLegado(motivos: readonly Motif[]): Placed[] {
  let cursor = 0
  return motivos.map((motif, i): Placed => {
    const inicio = cursor
    cursor += motif.km
    return {
      motif,
      slot: i === motivos.length - 1 ? 'meta' : i,
      inicioKm: r1(inicio),
      finKm: r1(cursor),
    }
  })
}

// --- El catálogo legado: rangos de hoy (mapa 01 §8). ---
// `km` es el barrido de `stageKind.test.ts` (KM_ROAD [130; 215], KM_ITT [8; 45]); `dPlus` es el
// rango medido en 1.500 etapas por forma (total, relleno incluido). Las ventanas son [0; 1] porque el
// viejo no coloca por ventanas: reparte el relleno con `split` y el orden lo fija `legacyMotivos`.
// `canonico` es la instancia de 175 km con semilla `canonico`.
const TODA: [number, number] = [0, 1]
const KM_RUTA: [number, number] = [130, 215]

const LG_FLAT: LegacySkeleton = {
  id: 'lg_flat',
  kind: 'llana',
  label: 'Flat',
  meta: 'esprint',
  slots: [],
  dPlus: [661, 1413],
  km: KM_RUTA,
  pesoBase: 1,
  canonico: legacyMotivos('lg_flat', 175, 'canonico'),
}

export const LEGACY: Record<LegacyId, LegacySkeleton> = {
  lg_flat: LG_FLAT,
  lg_hilly: {
    id: 'lg_hilly',
    kind: 'media',
    label: 'Hills',
    meta: 'esprint',
    slots: [
      { motif: 'cota', n: [2, 3], ventana: TODA, params: { kmRango: [3, 7], gRango: [4.5, 6.5] } },
      { motif: 'descenso', n: [1, 2], ventana: TODA, params: { kmRango: [3, 5], g: -5 } },
    ],
    dPlus: [1297, 3054],
    km: KM_RUTA,
    pesoBase: 1,
    canonico: legacyMotivos('lg_hilly', 175, 'canonico'),
  },
  lg_hilly_uphill: {
    id: 'lg_hilly_uphill',
    kind: 'media',
    label: 'Uphill finish',
    finalKind: 'alto',
    meta: 'alto_corto',
    metaParams: { aMeta: [0, 0], cotaFinal: { km: [4, 7.5], g: [5, 7.5] } },
    slots: [
      { motif: 'cota', n: [1, 2], ventana: TODA, params: { kmRango: [3, 7], gRango: [4.5, 6.5] } },
      { motif: 'descenso', n: [1, 2], ventana: TODA, params: { kmRango: [3, 5], g: -5 } },
    ],
    dPlus: [1272, 3055],
    km: KM_RUTA,
    pesoBase: 1,
    canonico: legacyMotivos('lg_hilly_uphill', 175, 'canonico'),
  },
  lg_mountain: {
    id: 'lg_mountain',
    kind: 'reina',
    label: 'Summit finish',
    meta: 'alto_largo', // el 45 %; los otros tres finales salen de ROUTE.queenFinalMix
    metaParams: { aMeta: [0, 45], cotaFinal: { km: [8.6, 27], g: [7.5, 9.5] } },
    slots: [
      // intermedios 6-11 km × escala [0,55; 1,8]: `cota` o `puerto` según crucen PASS_MIN_KM
      {
        motif: 'puerto',
        n: [2, 3],
        ventana: TODA,
        params: { kmRango: [3.3, 19.8], gRango: [5.5, 7.5] },
      },
      { motif: 'descenso', n: [2, 3], ventana: TODA, params: { kmRango: [5, 8], g: -6 } },
    ],
    dPlus: [1908, 5906],
    km: KM_RUTA,
    pesoBase: 1,
    canonico: legacyMotivos('lg_mountain', 175, 'canonico'),
  },
  lg_mountain_classic: {
    id: 'lg_mountain_classic',
    kind: 'reina',
    label: 'Mountains',
    meta: 'descenso_meta', // el 80 %; con runIn ≥ 20 km, `valle`
    metaParams: { aMeta: [13, 22], cotaFinal: { km: [4, 8], g: [7.5, 10] } },
    slots: [
      {
        motif: 'puerto',
        n: [2, 3],
        ventana: TODA,
        params: { kmRango: [6, 11], gRango: [5.5, 7.5] },
      },
      { motif: 'descenso', n: [2, 3], ventana: TODA, params: { kmRango: [5, 8], g: -6 } },
    ],
    dPlus: [1903, 4133],
    km: KM_RUTA,
    pesoBase: 1,
    canonico: legacyMotivos('lg_mountain_classic', 175, 'canonico'),
  },
  lg_classic: {
    id: 'lg_classic',
    kind: 'clasica',
    label: 'Classic',
    meta: 'esprint',
    slots: [
      { motif: 'muro', n: [4, 5], ventana: TODA, params: { kmRango: [1, 2.5], gRango: [8, 12] } },
    ],
    dPlus: [1541, 3151],
    km: KM_RUTA,
    pesoBase: 1,
    canonico: legacyMotivos('lg_classic', 175, 'canonico'),
  },
  lg_cobbles: {
    id: 'lg_cobbles',
    kind: 'clasica',
    label: 'Cobbles',
    meta: 'esprint',
    slots: [
      {
        motif: 'sector',
        n: [3, 3],
        ventana: TODA,
        params: { kmRango: [2, 4], estrellasRango: [3, 5], firme: 'adoquin' },
      },
    ],
    dPlus: [605, 1332],
    km: KM_RUTA,
    pesoBase: 1,
    canonico: legacyMotivos('lg_cobbles', 175, 'canonico'),
  },
  lg_itt: {
    ...LG_FLAT,
    id: 'lg_itt',
    kind: 'cri',
    label: 'ITT',
    timeTrial: true,
    km: [8, 45],
    canonico: legacyMotivos('lg_itt', 30, 'canonico'),
  },
}
