/**
 * MOTIVOS DE LA GRAMÁTICA DE RECORRIDOS (docs/generador.md §3.2).
 *
 * Un motivo es una pieza de carretera con significado ciclista (un enlace, una cota, un muro, un
 * racimo de sectores, la meta): la unidad que la semilla decide primero. Todo en km y % redondeados
 * a 0,1.
 *
 * Paso 0: nació `MetaKind`, porque `RouteStats` del censo (`sim/routeCensus.ts`) la cita. Paso 1: el
 * resto de tipos (`MotifKind`, `Motif`, `RngFactory`, `Instancia`), sin lógica. Paso 3:
 * `validateMotif` y `renderMotif` (sección 4 §4.5), sin llamadores hasta el paso 4; paso 5:
 * `instanciarFirma` e `instanciar`.
 */
import { ARCH, STAGE } from '../../constants.js'
import type { Ramp, Segment } from '../../stage/types.js'
import { between, climb, descent, rolling, split } from '../profileGen.js'
import { QUEEN_MIN_CLIMB_METRES, WALL_MAX_KM } from '../stageKind.js'
import type { EditionPlan } from './edition.js'
import type { StageRequest } from './generate.js'
import { firmeDe, type GeoSignature } from './geo.js'
import { conVentanasDe, llevaBajadas } from './place.js'
import {
  rangoCotaFinal,
  techoDeDibujo,
  techoGCotaFinal,
  techoKmCotaFinal,
  type Skeleton,
  type SkeletonId,
  type Slot,
  type SlotParams,
} from './skeletons.js'

export type MotifKind =
  | 'enlace'
  | 'expuesto'
  | 'tendida'
  | 'descenso' // enlaces
  | 'cota'
  | 'puerto'
  | 'muro'
  | 'cadena'
  | 'sector'
  | 'racimo'
  | 'circuito' // dificultades
  | 'meta' // siempre el último

/** Cómo acaba una etapa: la meta instanciada, siempre el último motivo. */
export type MetaKind =
  | 'esprint'
  | 'repecho'
  | 'muro_meta'
  | 'alto_corto'
  | 'alto_largo'
  | 'cima_cerca'
  | 'descenso_meta'
  | 'valle'
  | 'sector_meta'

export interface Motif {
  kind: MotifKind
  km: number // total del motivo; en `circuito`, el de una vuelta
  g?: number // dificultades y `tendida`: pendiente media en %
  forma?: 'regular' | 'progresiva' | 'irregular'
  adoquin?: boolean // `muro` adoquinado (sigue siendo `puerto`) o `sector` de adoquín (frente a tierra)
  firme?: 'adoquin' | 'tierra' // solo `sector`; tierra se rinde como `paves` 2-3★
  estrellas?: number // solo `sector`: 1..5
  hijos?: Motif[] // `cadena`, `racimo`, `circuito`: SOLO dificultades, nunca enlaces
  separaciones?: number[] // km de enlace interno: hijos.length − 1 en `cadena` y `racimo`; hijos.length en `circuito`
  vueltas?: number // solo `circuito`
  meta?: MetaKind // solo `meta`
  cotaFinal?: { km: number; g: number } // `meta` con cota
  firma?: boolean // motivo de FIRMA: no cambia entre ediciones
  nombre?: string // texto para la ficha, en inglés ("no pass here")
}

/** Fábrica de corrientes de azar por subflujo nominal, al estilo de `stageRng` (stage/rng.ts l. 26-29). */
export type RngFactory = (sub: string) => () => number

/** Un motivo instanciado y el hueco del que sale (índice en `sk.slots`, o 'meta'): `colocar` lo necesita para la ventana y `Motif` no lo lleva. */
export interface Instancia {
  slot: number | 'meta'
  j: number
  motif: Motif
}

// ---------------------------------------------------------------------------------------------------
// validateMotif (§4.5): cinco reglas en orden, y el primer fallo se devuelve como texto que empieza por
// el nombre del campo o de la constante que falla (los tests lo buscan con `toMatch`).
// ---------------------------------------------------------------------------------------------------

type Rango = readonly [number, number]

/** Redondeo a 0,1 km o 0,1 %: la resolución de toda la gramática (V10 cuadra Σ km al 0,1). */
const r1 = (x: number): number => Math.round(x * 10) / 10

/** `x` redondeado a 0,1 dentro de `[lo; hi]`, o de `[lo; hi)` si el techo está excluido (`cota.g`). */
function dentro(x: number, [lo, hi]: Rango, techoExcluido = false): boolean {
  const v = r1(x)
  return Number.isFinite(v) && v >= lo && (techoExcluido ? v < hi : v <= hi)
}

const entero = (x: number, [lo, hi]: Rango): boolean => Number.isInteger(x) && x >= lo && x <= hi
const txt = ([lo, hi]: Rango): string => `[${lo}; ${hi}]`
const suma = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0)
const kmDe = (ms: readonly Motif[]): number => suma(ms.map((h) => h.km))

/** Las altitudes en las que existe un puerto de `veto.puertoLargoKm` o más (V4(b), §4.5 regla 4). */
const ALTITUD_DE_PUERTO_LARGO: readonly GeoSignature['altitud'][] = ['media', 'alta', 'altiplano']

/** Los hijos que admite una vuelta de circuito (§4.2). */
const HIJOS_DE_CIRCUITO: readonly MotifKind[] = ['cota', 'muro', 'sector', 'tendida']

/** Regla 1: `km` y `g` dentro de `ARCH.motivo[kind]`; `estrellas` y `vueltas` enteros en su rango. */
function reglaRango(m: Motif): string | null {
  const M = ARCH.motivo
  const km = (r: Rango): string | null =>
    dentro(m.km, r) ? null : `km: ${m.km} fuera de ${txt(r)} (${m.kind})`
  const g = (r: Rango, techoExcluido = false): string | null => {
    if (m.g === undefined) return `g: falta en ${m.kind}`
    if (dentro(m.g, r, techoExcluido)) return null
    return `g: ${m.g} fuera de ${techoExcluido ? `[${r[0]}; ${r[1]})` : txt(r)} (${m.kind})`
  }
  switch (m.kind) {
    case 'enlace':
      return km(M.enlace.km)
    case 'expuesto':
      return km(M.expuesto.km)
    case 'tendida':
      return km(M.tendida.km) ?? g(M.tendida.g)
    case 'descenso':
      return km(M.descenso.km) ?? g(M.descenso.g)
    case 'cota':
      return km(M.cota.km) ?? g(M.cota.g, true) // g < 8 estricto: al 8 % empieza el muro
    case 'puerto':
      return km(M.puerto.km) ?? g(M.puerto.g)
    case 'muro':
      return km(M.muro.km) ?? g(M.muro.g)
    case 'sector':
      if (m.estrellas === undefined) return 'estrellas: falta en sector'
      return (
        km(M.sector.km) ??
        (entero(m.estrellas, M.sector.estrellas)
          ? null
          : `estrellas: ${m.estrellas} no es un entero de ${txt(M.sector.estrellas)}`)
      )
    case 'racimo':
      return km(M.racimo.km)
    case 'circuito':
      if (m.vueltas === undefined) return 'vueltas: falta en circuito'
      return (
        km(M.circuito.kmVuelta) ??
        (entero(m.vueltas, M.circuito.vueltas)
          ? null
          : `vueltas: ${m.vueltas} no es un entero de ${txt(M.circuito.vueltas)}`)
      )
    case 'cadena': // su km lo fija la regla 3
    case 'meta': // su km lo fija la regla 5
      return null
  }
}

/** Regla 2: campos que no pertenecen al tipo. */
function reglaAjenos(m: Motif): string | null {
  const k = m.kind
  const compuesto = k === 'cadena' || k === 'racimo' || k === 'circuito'
  if (m.estrellas !== undefined && k !== 'sector') return `estrellas: solo en sector, no en ${k}`
  if (m.firme !== undefined && k !== 'sector') return `firme: solo en sector, no en ${k}`
  if (m.vueltas !== undefined && k !== 'circuito') return `vueltas: solo en circuito, no en ${k}`
  if (m.hijos !== undefined && !compuesto && !(k === 'meta' && m.meta === 'sector_meta'))
    return `hijos: solo en cadena, racimo, circuito y sector_meta, no en ${k}`
  if (m.separaciones !== undefined && !compuesto)
    return `separaciones: solo en cadena, racimo y circuito, no en ${k}`
  if (m.meta !== undefined && k !== 'meta') return `meta: solo en meta, no en ${k}`
  if (m.cotaFinal !== undefined && k !== 'meta') return `cotaFinal: solo en meta, no en ${k}`
  if (m.g !== undefined && (k === 'enlace' || k === 'expuesto' || k === 'sector'))
    return `g: ${k} no lleva pendiente`
  if (m.adoquin !== undefined && k !== 'muro' && k !== 'sector')
    return `adoquin: solo en muro y sector, no en ${k}`
  return null
}

/** Regla 4: los mismos hechos que V1 a V4, sobre el motivo y no sobre el perfil. */
function reglaGeo(m: Motif, geo: GeoSignature | undefined): string | null {
  if (geo === undefined) return null
  switch (m.kind) {
    case 'puerto':
      if (geo.puerto === null) return `puerto: la zona ${geo.zona} no tiene puertos`
      if (r1(m.km) >= ARCH.veto.puertoLargoKm && !ALTITUD_DE_PUERTO_LARGO.includes(geo.altitud))
        return `puerto: uno de ${m.km} km exige altitud media, alta o altiplano (${geo.zona} es ${geo.altitud})`
      return null
    case 'cota':
      return geo.cota === null ? `cota: la zona ${geo.zona} no tiene cotas` : null
    case 'muro':
      if (geo.muro === null) return `muro: la zona ${geo.zona} no tiene muros`
      if (m.adoquin === true && !geo.muro.adoquin)
        return `adoquin: la zona ${geo.zona} no tiene muros adoquinados`
      return null
    case 'sector':
      if ((m.firme ?? 'adoquin') === 'adoquin')
        return geo.adoquin >= 2 ? null : `firme: la zona ${geo.zona} no tiene sectores de adoquín`
      return geo.sterrato ? null : `firme: la zona ${geo.zona} no tiene tierra`
    case 'meta':
      if (m.meta === 'alto_largo' && geo.finalesAlto !== 'largo')
        return `meta: alto_largo exige finalesAlto 'largo' (${geo.zona} es '${geo.finalesAlto}')`
      return null
    default:
      return null
  }
}

/** Un hijo de un compuesto, o el sector de `sector_meta`: reglas 1, 2 y 4, uno a uno. */
function validaHijo(h: Motif, i: number, geo: GeoSignature | undefined): string | null {
  const e = reglaRango(h) ?? reglaAjenos(h) ?? reglaGeo(h, geo)
  return e === null ? null : `hijos[${i}] ${e}`
}

/** Regla 3: compuestos (`hijos` y `separaciones`, §4.2). */
function reglaCompuesto(m: Motif, geo: GeoSignature | undefined): string | null {
  if (m.kind !== 'cadena' && m.kind !== 'racimo' && m.kind !== 'circuito') return null
  const { hijos, separaciones } = m
  if (hijos === undefined) return `hijos: falta en ${m.kind}`
  if (separaciones === undefined) return `separaciones: falta en ${m.kind}`
  const M = ARCH.motivo
  const n = hijos.length

  if (m.kind === 'circuito') {
    for (const [i, h] of hijos.entries())
      if (!HIJOS_DE_CIRCUITO.includes(h.kind))
        return `hijos: un circuito admite cota, muro, sector y tendida, no ${h.kind} (hijos[${i}])`
  } else {
    const [lo, hi] = m.kind === 'cadena' ? M.cadena.hijos : M.racimo.sectores
    if (n < lo || n > hi) return `hijos: ${n} en ${m.kind}, fuera de ${txt([lo, hi])}`
    const admitido = (h: Motif): boolean =>
      m.kind === 'cadena' ? h.kind === 'cota' || h.kind === 'muro' : h.kind === 'sector'
    for (const [i, h] of hijos.entries())
      if (!admitido(h)) return `hijos: ${h.kind} no cabe en ${m.kind} (hijos[${i}])`
  }
  for (const [i, h] of hijos.entries()) {
    const e = validaHijo(h, i, geo)
    if (e !== null) return e
  }

  const esperadas = m.kind === 'circuito' ? n : n - 1
  if (separaciones.length !== esperadas)
    return `separaciones: ${separaciones.length} en ${m.kind} con ${n} hijos, deben ser ${esperadas}`
  const minimo = ARCH.colocacion.enlaceMinimo
  const rangoSep: Rango =
    m.kind === 'cadena'
      ? M.cadena.enlace
      : m.kind === 'racimo'
        ? M.racimo.separacion
        : [minimo, Infinity]
  for (const s of separaciones)
    if (!dentro(s, rangoSep))
      return m.kind === 'circuito'
        ? `separaciones: ${s} km por debajo del enlaceMinimo ${minimo}`
        : `separaciones: ${s} km fuera de ${txt(rangoSep)} en ${m.kind}`

  const sumaTotal = kmDe(hijos) + suma(separaciones)
  if (m.kind !== 'circuito') {
    if (r1(m.km) !== r1(sumaTotal))
      return `km: ${m.km} en ${m.kind}, pero hijos y separaciones suman ${r1(sumaTotal)}`
    return null
  }
  const cierre = r1(m.km - sumaTotal)
  if (cierre < minimo)
    return `cierre: ${cierre} km de enlace al cerrar la vuelta, menos que el enlaceMinimo ${minimo}`
  const kmHijos = r1(kmDe(hijos))
  if (kmHijos > r1(M.circuito.maxHijosShare * m.km))
    return `hijos: ${kmHijos} km de dificultades en una vuelta de ${m.km}, más del maxHijosShare ${M.circuito.maxHijosShare}`
  return null
}

/** Los MetaKind cuya subida vive en `cotaFinal` y que bajan de ella a meta por un valle. */
type MetaConValle = 'cima_cerca' | 'descenso_meta' | 'valle'
const VALLE_DE: Record<MetaConValle, Rango> = {
  cima_cerca: ARCH.meta.cimaCerca.valle,
  descenso_meta: ARCH.meta.descensoMeta.valle,
  valle: ARCH.meta.valle.valle,
}

/**
 * La `cotaFinal` de una meta con valle no tiene rango propio en `ARCH.meta` (§12.1 solo da el valle):
 * sale de `unDiaUltimaCota` en un día y de la columna Meta del esqueleto en etapa, que es una `cota` o
 * un `puerto` (§4.3, nota 3). `validateMotif` no sabe si el motivo es de un día, así que valida contra
 * la envolvente de los tres rangos; el rango estrecho lo aplica `place` al instanciar (sección 8).
 */
const COTA_FINAL_CON_VALLE: { km: Rango; g: Rango } = {
  km: [ARCH.meta.unDiaUltimaCota.km[0], ARCH.motivo.puerto.km[1]],
  g: [ARCH.motivo.cota.g[0], ARCH.motivo.puerto.g[1]],
}

/** Regla 5: la meta. */
function reglaMeta(m: Motif, geo: GeoSignature | undefined): string | null {
  if (m.kind !== 'meta') return null
  const meta = m.meta
  if (meta === undefined) return 'meta: falta el MetaKind'
  if (m.g !== undefined) return 'g: una meta nunca lleva g (la subida va en cotaFinal)'
  const cf = m.cotaFinal
  if (meta === 'esprint') {
    if (cf !== undefined) return 'cotaFinal: esprint no lleva cotaFinal'
    return dentro(m.km, ARCH.motivo.enlace.km)
      ? null
      : `km: ${m.km} fuera de ${txt(ARCH.motivo.enlace.km)} (esprint)`
  }
  if (meta === 'sector_meta') {
    if (cf !== undefined) return 'cotaFinal: sector_meta no lleva cotaFinal'
    const sector = m.hijos?.length === 1 ? m.hijos[0] : undefined
    if (sector === undefined || sector.kind !== 'sector')
      return 'hijos: sector_meta lleva exactamente un hijo, un sector'
    const e = validaHijo(sector, 0, geo)
    if (e !== null) return e
    const aMeta = r1(m.km - sector.km)
    return dentro(aMeta, ARCH.meta.sectorMeta.aMeta)
      ? null
      : `aMeta: ${aMeta} km del sector a meta, fuera de ${txt(ARCH.meta.sectorMeta.aMeta)}`
  }

  if (cf === undefined) return `cotaFinal: falta en ${meta}`
  const rango = (km: Rango, g: Rango): string | null =>
    dentro(cf.km, km) && dentro(cf.g, g)
      ? null
      : `cotaFinal: ${cf.km} km al ${cf.g} % fuera de ${txt(km)} × ${txt(g)} (${meta})`
  const kmIgual = (esperado: number, que: string): string | null =>
    r1(m.km) === r1(esperado) ? null : `km: ${m.km} en ${meta}, debe ser ${que} = ${r1(esperado)}`
  const A = ARCH.meta
  switch (meta) {
    case 'repecho':
      return (
        rango(A.repecho.km, A.repecho.g) ??
        kmIgual(cf.km, 'cotaFinal.km') ??
        (cf.km * cf.g * cf.g >= STAGE.finishPuncheurScore
          ? null
          : `cotaFinal: km·g² = ${r1(cf.km * cf.g * cf.g)} bajo el finishPuncheurScore ${STAGE.finishPuncheurScore}`)
      )
    case 'muro_meta':
      return rango(A.muro.km, A.muro.g) ?? kmIgual(A.muro.aproxKm + cf.km, 'aproxKm + cotaFinal.km')
    case 'alto_corto':
      return rango(A.altoCorto.km, A.altoCorto.g) ?? kmIgual(cf.km, 'cotaFinal.km')
    case 'alto_largo':
      return (
        rango(A.altoLargo.km, A.altoLargo.g) ??
        (r1(cf.km) > A.altoLargo.kmSuaveDesde && r1(cf.g) > A.altoLargo.gMaxSiMasDe17
          ? `cotaFinal: un alto_largo de más de ${A.altoLargo.kmSuaveDesde} km va como mucho al gMaxSiMasDe17 ${A.altoLargo.gMaxSiMasDe17} %`
          : null) ??
        kmIgual(cf.km, 'cotaFinal.km')
      )
    case 'cima_cerca':
    case 'descenso_meta':
    case 'valle': {
      const e = rango(COTA_FINAL_CON_VALLE.km, COTA_FINAL_CON_VALLE.g)
      if (e !== null) return e
      const valle = r1(m.km - cf.km)
      return dentro(valle, VALLE_DE[meta])
        ? null
        : `valle: ${valle} km de la cima a meta, fuera de ${txt(VALLE_DE[meta])} (${meta})`
    }
  }
}

/**
 * null = válido; texto = por qué no (se guarda en arch para el censo y para el test). Puro.
 *
 * Comprueba, en este orden y devolviendo el primer fallo (§4.5): 1) rangos de `ARCH.motivo`; 2)
 * campos que no pertenecen al tipo; 3) compuestos (`hijos`, `separaciones`, cierre de la vuelta); 4)
 * la geografía, si se pasa `geo`; 5) la meta. Cada hijo de un compuesto y el sector de `sector_meta`
 * pasan 1, 2 y 4 uno a uno. Los rangos estrechos de un esqueleto (`Slot.params`) los aplica `place` al
 * instanciar, no esta función.
 */
export function validateMotif(m: Motif, geo?: GeoSignature): string | null {
  return (
    reglaRango(m) ??
    reglaAjenos(m) ??
    reglaCompuesto(m, geo) ??
    reglaGeo(m, geo) ??
    reglaMeta(m, geo)
  )
}

// ---------------------------------------------------------------------------------------------------
// renderMotif (§4.2, §4.3 y §4.5): un motivo a `Segment[]` con las primitivas de profileGen.ts.
// ---------------------------------------------------------------------------------------------------

/** Falla alto: un motivo sin un campo que su tipo exige no se rinde (validateMotif lo diría antes). */
function exige<T>(x: T | undefined, campo: string, m: Motif): T {
  if (x === undefined) throw new Error(`renderMotif: ${m.kind} sin ${campo}`)
  return x
}

/**
 * LA GUARDA `segment.km === Σ tramos` (I-8, §4.4). `split` pone un suelo de 0,5 por trozo, así que con
 * menos de 1,0 km dos trozos pueden sumar más que el total; si el redondeo la rompe, el último tramo
 * absorbe la diferencia y, si con eso se quedara sin longitud, todos se reescalan. El segmento sale
 * siempre cuadrado: si los tramos suman más, `sampleProfile` no muestrea nunca la cola.
 */
function cuadra(seg: Segment): Segment {
  const tramos = seg.tramos
  if (tramos === undefined || tramos.length === 0) return seg
  const total = suma(tramos.map((t) => t.km))
  const diff = r1(seg.km - total)
  if (diff === 0) return seg
  const ultimo = tramos[tramos.length - 1]!
  if (r1(ultimo.km + diff) > 0)
    return { ...seg, tramos: [...tramos.slice(0, -1), { ...ultimo, km: r1(ultimo.km + diff) }] }
  const k = seg.km / total
  return cuadra({ ...seg, tramos: tramos.map((t) => ({ ...t, km: r1(t.km * k) })) })
}

/** Un `muro` (§4.2): con menos de 1,0 km UNA rampa al `g` declarado; si no, `climb` con `gMin` y `gMax`. */
function renderMuro(rand: () => number, km: number, g: number): Segment {
  const { gMin, gMax } = ARCH.motivo.muro
  const len = r1(km)
  if (len < 1)
    return {
      km: len,
      tipo: 'puerto',
      tramos: [{ km: len, g: r1(Math.min(gMax, Math.max(gMin, g))) }],
    }
  return cuadra(climb(rand, len, g, { gMin, gMax }))
}

/**
 * Una `cota` o un `puerto` (§4.2): UN segmento `puerto`. `progresiva` (o sin forma) es `climb` tal
 * cual; `regular`, sus rampas barajadas con el mismo `rand`; `irregular`, en un puerto, una rampa de
 * `puerto.rampaIrregular` que sustituye el final de un tramo sorteado de la mitad alta.
 */
function renderSubida(
  rand: () => number,
  km: number,
  g: number,
  forma: Motif['forma'],
  conRampa: boolean,
): Segment {
  const seg = climb(rand, r1(km), g)
  const tramos = [...(seg.tramos ?? [])]
  if (forma === 'regular') {
    for (let i = tramos.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      const t = tramos[i]!
      tramos[i] = tramos[j]!
      tramos[j] = t
    }
  } else if (forma === 'irregular' && conRampa) {
    const { km: rk, g: rg } = ARCH.motivo.puerto.rampaIrregular
    const mitad = Math.floor(tramos.length / 2)
    const i = mitad + Math.floor(rand() * (tramos.length - mitad))
    const rampa: Ramp = { km: r1(between(rand, rk[0], rk[1])), g: r1(between(rand, rg[0], rg[1])) }
    const t = tramos[i]!
    const resto = r1(t.km - rampa.km)
    tramos.splice(
      i,
      1,
      ...(resto > 0 ? [{ km: resto, g: t.g }, rampa] : [{ km: t.km, g: rampa.g }]),
    )
  }
  return cuadra({ ...seg, tramos })
}

/** Una `tendida` (§4.2): UN `llano` de 2 a 4 tramos a `g ± ruido`, que la física lee y `kmSubida` no. */
function renderTendida(rand: () => number, km: number, g: number): Segment {
  const { tramos: nRango, ruido } = ARCH.motivo.tendida
  const n = nRango[0] + Math.floor(rand() * (nRango[1] - nRango[0] + 1))
  const len = r1(km)
  const tramos: Ramp[] = split(rand, len, n).map((k) => ({
    km: k,
    g: r1(g + between(rand, -ruido, ruido)),
  }))
  return cuadra({ km: len, tipo: 'llano', tramos })
}

/** Un `sector` (§4.2): el literal `paves` con estrellas; de tierra, con las estrellas en `estrellasTierra`. */
function renderSector(m: Motif): Segment {
  let estrellas = exige(m.estrellas, 'estrellas', m)
  if (m.firme === 'tierra') {
    const [lo, hi] = ARCH.motivo.sector.estrellasTierra
    estrellas = Math.min(hi, Math.max(lo, estrellas))
  }
  return { km: r1(m.km), tipo: 'paves', estrellas }
}

/** La fábrica del hijo h de un compuesto: su `rng('')` es el `rng(`hijo${h}`)` del padre. */
const fabricaHijo =
  (rng: RngFactory, h: number): RngFactory =>
  (sub) =>
    rng(sub === '' ? `hijo${h}` : `hijo${h}|${sub}`)

const copia = (s: Segment): Segment =>
  s.tramos === undefined ? { ...s } : { ...s, tramos: s.tramos.map((t) => ({ ...t })) }

/** `cadena` y `racimo`: el hijo 0 y, para cada h ≥ 1, la separación h − 1 y el hijo h. */
function renderLineal(m: Motif, rng: RngFactory, geo: GeoSignature, amp: number): Segment[] {
  const hijos = exige(m.hijos, 'hijos', m)
  const separaciones = exige(m.separaciones, 'separaciones', m)
  const out: Segment[] = []
  for (const [h, hijo] of hijos.entries()) {
    if (h > 0) {
      const sep = exige(separaciones[h - 1], `separaciones[${h - 1}]`, m)
      out.push(...rolling(rng(`sep${h - 1}`), r1(sep), amp, 0))
    }
    out.push(...renderMotif(hijo, fabricaHijo(rng, h), geo))
  }
  return out
}

/** `circuito`: la vuelta una vez (separación h y hijo h; al final, el cierre) y `vueltas` copias profundas. */
function renderCircuito(m: Motif, rng: RngFactory, geo: GeoSignature): Segment[] {
  const hijos = exige(m.hijos, 'hijos', m)
  const separaciones = exige(m.separaciones, 'separaciones', m)
  const vueltas = exige(m.vueltas, 'vueltas', m)
  const amp = Math.min(geo.amplitud, ARCH.motivo.enlace.ampMax)
  const vuelta: Segment[] = []
  for (const [h, hijo] of hijos.entries()) {
    const sep = exige(separaciones[h], `separaciones[${h}]`, m)
    vuelta.push(...rolling(rng(`sep${h}`), r1(sep), amp, 0))
    vuelta.push(...renderMotif(hijo, fabricaHijo(rng, h), geo))
  }
  const cierre = r1(m.km - suma(vuelta.map((s) => s.km)))
  vuelta.push(...rolling(rng('cierre'), cierre, amp, 0))
  return Array.from({ length: vueltas }, () => vuelta.map(copia)).flat()
}

/** La subida de una meta que no es muro ni repecho: `climb` sin recorte (sus rampas pasan del 3 %). */
const subidaDeMeta = (rng: RngFactory, cf: { km: number; g: number }): Segment =>
  cuadra(climb(rng(''), r1(cf.km), cf.g))

/**
 * `cima_cerca`, `descenso_meta` y `valle` (§4.3, nota 3): la subida, su bajada canónica
 * (`clamp(km·g·10 / perdidaPorKm, kmMin, kmMax)` a `perdidaPorKm / 10` % de media) recortada al valle,
 * y el llano que resta rendido con `rolling`; si el llano no llega a un segmento, lo absorbe la bajada.
 */
function renderMetaConValle(
  m: Motif,
  rng: RngFactory,
  geo: GeoSignature,
  cf: { km: number; g: number },
): Segment[] {
  const { perdidaPorKm, kmMin, kmMax } = ARCH.motivo.descenso.kmPorDesnivel
  const subida = subidaDeMeta(rng, cf)
  const valle = r1(m.km - subida.km)
  const canonica = Math.min(kmMax, Math.max(kmMin, r1((cf.km * cf.g * 10) / perdidaPorKm)))
  let bajada = Math.min(valle, canonica)
  const llanoKm = r1(valle - bajada)
  const llano = llanoKm > 0 ? rolling(rng('llano'), llanoKm, geo.amplitud, 0) : []
  if (llano.length === 0) bajada = valle
  return [subida, cuadra(descent(rng('bajada'), bajada, perdidaPorKm / 10)), ...llano]
}

/** La `meta` (§4.3): siempre el último motivo. */
function renderMeta(m: Motif, rng: RngFactory, geo: GeoSignature): Segment[] {
  const meta = exige(m.meta, 'meta', m)
  const A = ARCH.meta
  switch (meta) {
    case 'esprint':
      return rolling(rng(''), r1(m.km), Math.min(geo.amplitud, A.esprint.ampMax), 0)
    case 'sector_meta': {
      const sector = exige(m.hijos?.[0], 'hijos[0]', m)
      return [renderSector(sector), ...rolling(rng(''), r1(m.km - sector.km), geo.amplitud, 0)]
    }
    case 'repecho': {
      const cf = exige(m.cotaFinal, 'cotaFinal', m)
      const { gMin, gMax } = A.repecho
      return [cuadra(climb(rng(''), r1(cf.km), cf.g, { gMin, gMax }))]
    }
    case 'muro_meta': {
      // La aproximación a amplitud ≤ aproxAmp no tiene ningún bloque al 3 %: la racha de subida que
      // mide deriveFinishTerrain empieza exactamente al pie del muro (§4.3, primera nota).
      const cf = exige(m.cotaFinal, 'cotaFinal', m)
      const aprox = r1(m.km - cf.km)
      return [
        ...rolling(rng('aprox'), aprox, Math.min(geo.amplitud, A.muro.aproxAmp), 0),
        renderMuro(rng(''), cf.km, cf.g),
      ]
    }
    case 'alto_corto':
    case 'alto_largo':
      return [subidaDeMeta(rng, exige(m.cotaFinal, 'cotaFinal', m))]
    case 'cima_cerca':
    case 'descenso_meta':
    case 'valle':
      return renderMetaConValle(m, rng, geo, exige(m.cotaFinal, 'cotaFinal', m))
  }
}

/**
 * Rinde UN motivo a segmentos con las primitivas de profileGen.ts. Puro: misma fábrica, mismos
 * segmentos. El motivo tira de rng(''); en cadena, racimo y circuito el hijo h tira de rng(`hijo${h}`),
 * la separación h de rng(`sep${h}`) y el cierre de la vuelta de rng('cierre'), así cambiar un hijo o
 * una separación no mueve el dibujo de los demás. No cuadra km (normalizeEnlaces, sección 8), no
 * emite pancartas (emitirPancartas), no verifica (verify). Nunca emite `rompepiernas` (decisión 2):
 * lo que ondula es `llano` con tramos.
 */
export function renderMotif(m: Motif, rng: RngFactory, geo: GeoSignature): Segment[] {
  const M = ARCH.motivo
  switch (m.kind) {
    case 'enlace':
      return rolling(rng(''), r1(m.km), Math.min(geo.amplitud, M.enlace.ampMax), 0)
    case 'expuesto':
      return rolling(rng(''), r1(m.km), Math.min(M.expuesto.amp, geo.amplitud), 0)
    case 'tendida':
      return [renderTendida(rng(''), m.km, exige(m.g, 'g', m))]
    case 'descenso':
      return [cuadra(descent(rng(''), r1(m.km), Math.abs(exige(m.g, 'g', m))))]
    case 'cota':
      return [renderSubida(rng(''), m.km, exige(m.g, 'g', m), m.forma, false)]
    case 'puerto':
      return [renderSubida(rng(''), m.km, exige(m.g, 'g', m), m.forma, true)]
    case 'muro': // adoquinado o no, es `puerto`: el adoquín del muro es de la ficha y de V2
      return [renderMuro(rng(''), m.km, exige(m.g, 'g', m))]
    case 'sector':
      return [renderSector(m)]
    case 'cadena':
      return renderLineal(m, rng, geo, Math.min(geo.amplitud, M.enlace.ampMax))
    case 'racimo':
      return renderLineal(m, rng, geo, M.racimo.amp)
    case 'circuito':
      return renderCircuito(m, rng, geo)
    case 'meta':
      return renderMeta(m, rng, geo)
  }
}

// ---------------------------------------------------------------------------------------------------
// instanciarFirma (§8.3) e instanciar (§8.5): los pasos 2 y 4 de `generateStage` (paso 5 del plan).
//
// Cada parámetro se sortea uniforme en la intersección de tres rangos: el del motivo en `ARCH.motivo`,
// el del hueco (`Slot.params`, o el de la alternativa en la firma) y el de la zona (`geo.puerto`,
// `geo.cota`, `geo.muro`). En este orden: `km`, `g`, `forma`, `estrellas`, `adoquin`; un campo que el
// motivo no usa no consume tirada. `g` se sortea DESPUÉS de `km`, con el techo de V4(c):
// `puertoDplusMax[altitud] / (km · 10)`. Lecturas de §8.3 y §8.5 que el texto deja abiertas y se
// deciden aquí (anotadas en la nota del paso 5 de docs/balance.md):
//  - un hueco que la zona no admite, o cuya intersección queda vacía, baja por la cadena de
//    `degradarMotivo` (puerto → cota → muro; cota → muro; muro → cota) con los rangos del motivo nuevo
//    y sin los del hueco, que eran del otro; sin nada debajo, es un `enlace` con `nombre`
//    `sin <motivo> aquí`, que no se coloca y la frase cita;
//  - `expuesto` y `tendida` se acotan además a lo que cabe en su ventana (`km × (b − a) / n`), porque
//    sus rangos globales ([5; 120] y [5; 30]) no saben cuánto mide la etapa;
//  - «la primera cota mide [3,3; 8,0]» y «la última [3,3; 4,2]» de las tablas de §5.2 y §5.3 son la
//    instancia `j = 0` y la `j = n − 1` del primer hueco `cota` (colocar las pone en ese orden);
//  - en una `cadena` con `adoquinShare`, la fracción de muros adoquinados se sortea una vez por cadena,
//    antes de los hijos, y cada muro tira su `adoquin` contra ella;
//  - en un `circuito`, los hijos que no caben en la vuelta (`maxHijosShare` y un `enlaceMinimo` antes
//    de cada uno y al cerrar) se descartan empezando por el último opcional; un circuito de un
//    esqueleto que no es `llana` lleva al menos una subida; y en un circuito de firma con meta
//    `esprint` y `aMeta` (Montréal, los nacionales), la última subida es el último hijo de la vuelta y
//    cierra a no más de lo que el `aMeta` deja, para que el final sea `cima_cerca` por construcción y
//    no por reintento (la vuelta es firma: un reintento no la cambia).
// ---------------------------------------------------------------------------------------------------

type Rand = () => number
type R2 = [number, number]

/** La distancia leída en una pancarta se mueve hasta medio km: `emitirPancartas` la escribe al km entero. */
const REDONDEO_PANCARTA_KM = 0.5
const EPS = 1e-9

/** Intersección de rangos (los `undefined` no cuentan); `null` si queda vacía. */
function cortaR(...rs: (Rango | undefined)[]): R2 | null {
  let lo = -Infinity
  let hi = Infinity
  for (const r of rs) {
    if (r === undefined) continue
    lo = Math.max(lo, r[0])
    hi = Math.min(hi, r[1])
  }
  return lo <= hi + EPS ? [lo, Math.max(lo, hi)] : null
}
const techo1 = (x: number): number => Math.floor(x * 10 + EPS) / 10
const suelo1 = (x: number): number => Math.ceil(x * 10 - EPS) / 10
/** Uniforme en `[a; b]` redondeado al 0,1 sin salirse del rango por el redondeo (una tirada). */
function U1(rand: Rand, [a, b]: Rango): number {
  const v = r1(a + rand() * (b - a))
  const lo = suelo1(a)
  const hi = techo1(b)
  return lo <= hi ? Math.min(hi, Math.max(lo, v)) : r1(a)
}
/** Entero uniforme en `[a; b]` (una tirada, ninguna si el rango es un punto). */
function enteroEn(rand: Rand, [a, b]: Rango): number {
  const lo = Math.ceil(a)
  const hi = Math.floor(b)
  if (hi <= lo) return lo
  return Math.min(hi, lo + Math.floor(rand() * (hi - lo + 1)))
}

/** `cota.g` es semiabierto, `[4; 8)`: al 8 % empieza el muro. Al 0,1, su techo es 7,9. */
const COTA_G: Rango = [ARCH.motivo.cota.g[0], r1(ARCH.motivo.cota.g[1] - 0.1)]
/** La cota más corta que saca una etapa de `clasica` (3 + 0,3): la «primera cota» de las medias sin final en alto. */
const COTA_MEDIA_KM = r1(WALL_MAX_KM + ARCH.veto.margenClaseKm)
/** Las altitudes en las que existe un puerto de `puertoLargoKm` o más (V4(b)). */
const ALTITUD_LARGA: readonly GeoSignature['altitud'][] = ['media', 'alta', 'altiplano']

/** Los esqueletos cuya PRIMERA cota mide [3,3; 8,0] (§5.2 y §5.3), para no ser `clasica`. */
const PRIMERA_COTA_MEDIA: ReadonlySet<SkeletonId> = new Set([
  'ud_montana_media',
  'ud_repecho',
  'et_media_valle',
])
/** Los esqueletos cuya ÚLTIMA cota mide como mucho `unDiaUltimaCota.km[1]` 4,2 (V5(a); §5.2). */
const ULTIMA_COTA_CORTA: ReadonlySet<SkeletonId> = new Set(['ud_esprint_capi'])

/** Por dónde baja un hueco que la zona no admite (§8.5), empezando por él mismo. */
const CADENA_DE: Partial<Record<MotifKind, MotifKind[]>> = {
  puerto: ['puerto', 'cota', 'muro'],
  cota: ['cota', 'muro'],
  muro: ['muro', 'cota'],
}
/** El sufijo de la frase (§8.13) cuando un hueco se quedó sin motivo: en inglés, como la frase entera. */
const NOMBRE_SIN: Partial<Record<MotifKind, string>> = {
  puerto: 'no pass here',
  cota: 'no hill here',
  muro: 'no wall here',
  sector: 'no sector here',
  racimo: 'no sectors here',
  cadena: 'no walls here',
}

interface Ctx {
  sk: Skeleton
  geo: GeoSignature
  km: number // de la etapa: acota `expuesto` y `tendida` a su ventana
  rangos: Map<Motif, R2> // el rango de km con que se sorteó cada dificultad: la persecución del desnivel vuelve a él
}

interface Opciones {
  params?: SlotParams | undefined
  ventana?: Rango | undefined
  n?: number | undefined
  kmExtra?: Rango | undefined // «la primera» / «la última»: solo si el motivo no se degrada
  adoquinP?: number | undefined // fracción de muros adoquinados de la cadena
  disponible?: number | undefined // km de carretera que cabe una instancia (con su bajada) entre su ventana y la meta
  obligatorio?: boolean | undefined // una instancia `j < n[0]`: si no cabe, se queda en su suelo en vez de degradarse
}

/**
 * El km más largo de una subida que, con su bajada canónica (`clamp(km·g·10 / 55, 2, 10)` a la
 * pendiente `g` más alta del rango), cabe en `disponible` km: la bajada es monótona en `km`, así que se
 * resuelve por tramos. Sin bajada, `disponible`.
 */
function kmQueCabe(disponible: number, g: number, conBajada: boolean): number {
  if (!conBajada) return disponible
  const { perdidaPorKm, kmMin, kmMax } = ARCH.motivo.descenso.kmPorDesnivel
  const porKm = (g * 10) / perdidaPorKm // km de bajada por km de subida
  if (disponible - kmMin <= kmMin / porKm) return disponible - kmMin
  const medio = disponible / (1 + porKm)
  return medio < kmMax / porKm ? medio : disponible - kmMax
}

/** `cota`, `puerto` y `muro` en un kind concreto; `null` si el rango queda vacío en la zona. */
function subida(
  kind: 'cota' | 'puerto' | 'muro',
  propio: boolean,
  rand: Rand,
  ctx: Ctx,
  o: Opciones,
): Motif | null {
  const z = ctx.geo[kind]
  if (z === null) return null
  const A = ARCH.motivo[kind]
  const p = propio ? o.params : undefined
  // La pendiente del hueco manda salvo contra la zona: si no se cruzan (las cotas al 4-5 % de los capi
  // en una zona de cotas al 6-7 %), la pendiente es la de la zona y el motivo no se degrada por ello.
  const gBase =
    cortaR(kind === 'cota' ? COTA_G : A.g, p?.gRango, z.g) ??
    cortaR(kind === 'cota' ? COTA_G : A.g, z.g)
  if (gBase === null) return null
  const techo = techoDeDibujo(ctx.geo.altitud)
  const conBajada = llevaBajadas(ctx.sk) && kind !== 'muro'
  const cabeEnEtapa: Rango | undefined =
    o.disponible === undefined
      ? undefined
      : [0, techo1(kmQueCabe(o.disponible, gBase[0], conBajada))]
  const largo: Rango | undefined =
    kind === 'puerto' && !ALTITUD_LARGA.includes(ctx.geo.altitud)
      ? [0, r1(ARCH.veto.puertoLargoKm - 0.1)]
      : undefined
  // Una cota que sale de un muro en una clásica sigue siendo clásica: ≤ WALL_MAX_KM − 0,1 (regla 3 de §8.9).
  const clasica: Rango | undefined =
    kind === 'cota' && ctx.sk.kind === 'clasica' ? [0, r1(WALL_MAX_KM - 0.1)] : undefined
  const sinTope = cortaR(A.km, p?.kmRango, z.km, largo, clasica, propio ? o.kmExtra : undefined, [
    0,
    techo1(techo / (gBase[0] * 10)),
  ])
  if (sinTope === null) {
    // Los rangos del hueco (o de la alternativa: la Valcava de Bergamo, 11,6 × 8) contra el techo de
    // una zona baja: el motivo se queda en su kind con los rangos del motivo y de la zona.
    if (propio && p !== undefined) return subida(kind, false, rand, ctx, o)
    return null
  }
  // Lo que no cabe en la etapa: una instancia obligatoria del motivo que el esqueleto pide se queda
  // en su suelo (la colocación dirá si cabe); una opcional, o una degradada, baja de motivo.
  const kmR: R2 | null =
    cortaR(sinTope, cabeEnEtapa) ?? (o.obligatorio && propio ? [sinTope[0], sinTope[0]] : null)
  if (kmR === null) return null
  const km = U1(rand, kmR)
  const g = U1(rand, cortaR(gBase, [0, techo1(techo / (km * 10))]) ?? gBase)
  const m: Motif = { kind, km, g }
  if (kind === 'puerto') {
    const zp = ctx.geo.puerto
    const formas = ['regular', 'progresiva', 'irregular'] as const
    m.forma = zp?.forma ?? formas[Math.min(2, Math.floor(rand() * 3))]!
  }
  if (kind === 'muro') {
    if (p?.adoquin !== undefined) m.adoquin = p.adoquin && ctx.geo.muro?.adoquin === true
    else if (o.adoquinP !== undefined)
      m.adoquin = rand() < o.adoquinP && ctx.geo.muro?.adoquin === true
    else m.adoquin = false
  }
  ctx.rangos.set(m, [kmR[0], Math.min(kmR[1], techo1(techo / (g * 10)))])
  return m
}

/** Lo que cabe de un motivo lineal de enlace en su ventana: `km × (b − a) / n`. */
function capDeVentana(ctx: Ctx, o: Opciones): Rango | undefined {
  if (o.ventana === undefined) return undefined
  return [0, r1((ctx.km * (o.ventana[1] - o.ventana[0])) / Math.max(1, o.n ?? 1))]
}

/**
 * Una instancia simple de un hueco (cualquier kind salvo los compuestos y la meta). Devuelve `null`
 * si el hueco no se instancia en la zona (`expuesto` sin viento, que rinde enlace sin nombrarse) y un
 * `enlace` con `nombre` si se degradó hasta desaparecer.
 */
function simple(kind0: MotifKind, rand: Rand, ctx: Ctx, o: Opciones): Motif | null {
  const p = o.params
  switch (kind0) {
    case 'cota':
    case 'puerto':
    case 'muro': {
      for (const k of CADENA_DE[kind0] ?? []) {
        const m = subida(k as 'cota' | 'puerto' | 'muro', k === kind0, rand, ctx, o)
        if (m !== null) return m
      }
      return { kind: 'enlace', km: ARCH.motivo.enlace.km[0], nombre: NOMBRE_SIN[kind0]! }
    }
    case 'sector': {
      // Un `paves` hace `clasica` a toda la etapa (`stageKindOf`, regla 1 de §5.1): un sector solo se
      // instancia en un esqueleto `clasica` (los de `nc_ruta`, en su variante clásica).
      if (ctx.sk.kind !== 'clasica') return null
      const firme = p?.firme ?? firmeDe(ctx.geo)
      if (firme === null)
        return { kind: 'enlace', km: ARCH.motivo.enlace.km[0], nombre: NOMBRE_SIN.sector! }
      const tope: Rango | undefined = o.disponible === undefined ? undefined : [0, o.disponible]
      const km = U1(rand, cortaR(ARCH.motivo.sector.km, p?.kmRango, tope) ?? ARCH.motivo.sector.km)
      const estrellas =
        p?.estrellas ??
        enteroEn(
          rand,
          cortaR(ARCH.motivo.sector.estrellas, p?.estrellasRango) ?? ARCH.motivo.sector.estrellas,
        )
      return { kind: 'sector', km, estrellas, firme }
    }
    case 'tendida': {
      const A = ARCH.motivo.tendida
      const kmR = cortaR(A.km, p?.kmRango, capDeVentana(ctx, o)) ?? [A.km[0], A.km[0]]
      const km = U1(rand, kmR)
      const g = U1(rand, cortaR(A.g, p?.gRango) ?? A.g)
      return { kind: 'tendida', km, g }
    }
    case 'expuesto': {
      if (ctx.geo.viento < 2) return null // §4.2: solo con viento; si no, rinde enlace
      const A = ARCH.motivo.expuesto
      // Con `disponible` (lo lineal de firma delante de un circuito, paso 9) no se estira por encima de
      // lo que cabe: si no cabe ni el suelo del hueco, no hay llano abierto (rinde enlace).
      if (o.disponible !== undefined && cortaR(A.km, p?.kmRango, [0, o.disponible]) === null)
        return null
      const tope: Rango | undefined = o.disponible === undefined ? undefined : [0, o.disponible]
      const kmR = cortaR(A.km, p?.kmRango, capDeVentana(ctx, o), tope) ?? [A.km[0], A.km[0]]
      return { kind: 'expuesto', km: U1(rand, kmR) }
    }
    default:
      return null // `enlace` y `descenso` no se instancian como hueco: son lo que queda entre colocables
  }
}

/** Una subida de un compuesto: lo que cuenta para la última de la vuelta y para «al menos una subida». */
const sube = (m: Motif): boolean => m.kind === 'cota' || m.kind === 'muro' || m.kind === 'puerto'

/** Los hijos sorteados de un compuesto, con la ventana y si son obligatorios (índice < `n[0]`). */
interface Hijo {
  m: Motif
  ventana: Rango
  obligatorio: boolean
}

/**
 * Los hijos de un compuesto, en orden fijo: (b) el número de cada `Slot` hijo, (c) cada hijo con sus
 * campos. `copiaDeMeta` es la subida de la meta, para el hijo `firma: true` de un compuesto que no lo
 * es (el muro de Huy de la vuelta de `ud_muro_final`: mismo km y g que el de la meta).
 */
function hijosDe(
  slot: Slot,
  rand: Rand,
  ctx: Ctx,
  copiaDeMeta: Motif['cotaFinal'],
  adoquinP: number | undefined,
): Hijo[] {
  const declarados = slot.hijos ?? []
  const porDefecto: Slot | null =
    declarados.length > 0
      ? null
      : slot.motif === 'racimo'
        ? {
            motif: 'sector',
            n: [ARCH.motivo.racimo.sectores[0], ARCH.motivo.racimo.sectores[1]],
            ventana: [0, 1],
          }
        : slot.motif === 'cadena'
          ? {
              motif: ctx.geo.muro ? 'muro' : 'cota',
              n: [ARCH.motivo.cadena.hijos[0], ARCH.motivo.cadena.hijos[1]],
              ventana: [0, 1],
            }
          : null
  const slots = porDefecto ? [porDefecto] : declarados
  const cuantos = slots.map((h) => enteroEn(rand, h.n))
  const out: Hijo[] = []
  slots.forEach((h, s) => {
    for (let j = 0; j < cuantos[s]!; j++) {
      const obligatorio = j < h.n[0]
      if (h.firma && !slot.firma && copiaDeMeta && (h.motif === 'muro' || h.motif === 'cota')) {
        out.push({
          m: { kind: h.motif, km: copiaDeMeta.km, g: copiaDeMeta.g, adoquin: false },
          ventana: h.ventana,
          obligatorio,
        })
        continue
      }
      // Los sectores de la vuelta de un nacional, solo donde hay adoquín de verdad (`adoquin ≥ 2`, §5.2).
      if (h.motif === 'sector' && slot.motif === 'circuito' && ctx.geo.adoquin < 2) continue
      const m = simple(h.motif, rand, ctx, { params: h.params, adoquinP })
      if (m === null || m.kind === 'enlace') continue
      out.push({ m, ventana: h.ventana, obligatorio })
    }
  })
  // Un circuito de un esqueleto que no es llana lleva al menos una subida: si el sorteo no dio
  // ninguna, el primer hueco hijo de subida toma una (sin tirada nueva de cuántos).
  if (slot.motif === 'circuito' && ctx.sk.kind !== 'llana' && !out.some((h) => sube(h.m))) {
    const h = slots.find((x) => x.motif === 'cota' || x.motif === 'muro')
    const m = h ? simple(h.motif, rand, ctx, { params: h.params, adoquinP }) : null
    if (h && m && m.kind !== 'enlace') out.push({ m, ventana: h.ventana, obligatorio: true })
  }
  return out
}

/**
 * La vuelta de un circuito (§8.5 (d)): una tirada por hijo, `ini_h = kmVuelta × U(a_h, b_h)`, en el
 * orden de los hijos; en carretera van por `ini`, a `enlaceMinimo` como poco uno de otro y del inicio
 * de la vuelta, y si el cierre queda bajo `enlaceMinimo` se empujan hacia atrás en cascada. Con
 * `cierreMax`, la última subida va la última y cierra a no más de `cierreMax`.
 */
function vueltaDe(
  kmVuelta: number,
  hijos: Hijo[],
  rand: Rand,
  cierreMax: number | null,
  quien: string,
): { hijos: Motif[]; separaciones: number[] } {
  const min = ARCH.colocacion.enlaceMinimo
  const hs = [...hijos]
  const kmH = (): number => hs.reduce((a, h) => a + h.m.km, 0)
  const cabe = (): boolean =>
    kmH() <= ARCH.motivo.circuito.maxHijosShare * kmVuelta + EPS &&
    kmH() + (hs.length + 1) * min <= kmVuelta + EPS
  while (!cabe()) {
    let i = -1
    hs.forEach((h, k) => {
      if (!h.obligatorio) i = k
    })
    if (i < 0) break
    hs.splice(i, 1)
  }
  if (!cabe()) throw new Error(`circuito sin sitio: ${quien}, vuelta de ${kmVuelta} km`)
  const inis = hs.map((h) => r1(kmVuelta * (h.ventana[0] + rand() * (h.ventana[1] - h.ventana[0]))))
  const orden = hs.map((_, i) => i).sort((a, b) => inis[a]! - inis[b]! || a - b)
  if (cierreMax !== null) {
    const ult = [...orden].reverse().find((i) => sube(hs[i]!.m))
    if (ult !== undefined) {
      orden.splice(orden.indexOf(ult), 1)
      orden.push(ult)
      // Y esa última subida es la «última cota» de V5(a): como mucho `unDiaUltimaCota.km[1]` 4,2
      // (la cota de un nacional mide [3,3; 6]: la que cierra la vuelta se queda en [3,3; 4,2]).
      const m = hs[ult]!.m
      const tope = ARCH.meta.unDiaUltimaCota.km[1]
      if (m.km > tope) hs[ult] = { ...hs[ult]!, m: { ...m, km: tope } }
    }
  }
  const pos: number[] = []
  let fin = 0
  for (const i of orden) {
    pos[i] = r1(Math.max(inis[i]!, fin + min))
    fin = r1(pos[i]! + hs[i]!.m.km)
  }
  if (orden.length > 0 && kmVuelta - fin < min - EPS) {
    let tope = r1(kmVuelta - min)
    for (let k = orden.length - 1; k >= 0; k--) {
      const i = orden[k]!
      if (pos[i]! + hs[i]!.m.km > tope + EPS) pos[i] = r1(tope - hs[i]!.m.km)
      tope = r1(pos[i]! - min)
    }
    if (pos[orden[0]!]! < min - EPS)
      throw new Error(`circuito sin sitio: ${quien}, los hijos no caben en ${kmVuelta} km`)
  }
  if (cierreMax !== null && orden.length > 0) {
    const i = orden.at(-1)!
    const cierre = r1(kmVuelta - pos[i]! - hs[i]!.m.km)
    if (cierre > cierreMax + EPS) pos[i] = r1(kmVuelta - cierreMax - hs[i]!.m.km)
  }
  const separaciones: number[] = []
  fin = 0
  for (const i of orden) {
    separaciones.push(r1(pos[i]! - fin))
    fin = pos[i]! + hs[i]!.m.km
  }
  return { hijos: orden.map((i) => hs[i]!.m), separaciones }
}

/** `cadena` o `racimo`: hijos y una separación entre cada dos (§8.5 (b), (c) y (d)); km = Σ hijos + Σ separaciones. */
function lineal(
  slot: Slot,
  params: SlotParams | undefined,
  rand: Rand,
  ctx: Ctx,
  disponible?: number,
): Motif | null {
  let adoquinP: number | undefined
  if (slot.motif === 'cadena' && params?.adoquinShare && ctx.geo.muro?.adoquin)
    adoquinP = params.adoquinShare[0] + rand() * (params.adoquinShare[1] - params.adoquinShare[0])
  const hijos = hijosDe(slot, rand, ctx, undefined, adoquinP).map((h) => h.m)
  if (hijos.length === 0) return null
  if (hijos.length === 1) return hijos[0]! // una cadena de uno es su muro
  const sep =
    params?.separacionRango ??
    (slot.motif === 'cadena' ? ARCH.motivo.cadena.enlace : ARCH.motivo.racimo.separacion)
  const separaciones = hijos.slice(1).map(() => U1(rand, sep))
  const kmDe = (): number =>
    r1(hijos.reduce((a, h) => a + h.km, 0) + separaciones.reduce((a, s) => a + s, 0))
  // Lo que no cabe entre su ventana y la meta se recorta sin dados (paso 5): primero los hijos del
  // final, sin bajar del mínimo del compuesto; después las separaciones, a su suelo.
  if (disponible !== undefined) {
    const minHijos =
      slot.motif === 'cadena' ? ARCH.motivo.cadena.hijos[0] : ARCH.motivo.racimo.sectores[0]
    while (kmDe() > disponible + EPS && hijos.length > minHijos) {
      hijos.pop()
      separaciones.pop()
    }
    if (kmDe() > disponible + EPS) separaciones.fill(suelo1(sep[0]))
  }
  return { kind: slot.motif, km: kmDe(), hijos, separaciones }
}

/** Los km de la meta con su subida, para acotar la aproximación de un circuito de firma. */
interface Esprint {
  lo: number
  hi: number
}

/**
 * Qué valle admite la última subida de un esqueleto de un día que declara `aMeta` (V5(c)): su
 * ventana, estrechada medio km por cada lado porque la pancarta se lee al km entero; `null` si no la
 * declara.
 */
function valleDeAMeta(sk: Skeleton): R2 | null {
  const a = sk.metaParams?.aMeta
  if (!a) return null
  return [r1(a[0] + REDONDEO_PANCARTA_KM), r1(a[1] - REDONDEO_PANCARTA_KM)]
}

/**
 * Paso 2 (§8.3): los huecos de firma y la meta, con la corriente `firma|${id}` (sin temporada ni
 * intento), en el orden de `sk.slots` y la meta al final. Un hueco de firma con `n = [a, b]` instancia
 * `a` copias. La opción de nivel 2 (`opcion > 0`) sustituye los rangos de sus huecos (`alt.slots`) y
 * los de la subida de meta (`alt.metaParams`), y puede cambiar la meta. Los motivos salen con
 * `firma: true`, y la edición, el reintento y `garantizaClase` no los tocan.
 */
export function instanciarFirma(
  skCatalogo: Skeleton,
  opcion: number,
  req: StageRequest,
  rand: Rand,
): Instancia[] {
  const sk = conVentanasDe(skCatalogo, req) // en una transición, las ventanas con que se colocará
  const alt = opcion === 0 ? null : (sk.alternativas?.[opcion - 1] ?? null)
  const ctx: Ctx = { sk, geo: req.geo, km: req.km, rangos: new Map() }
  const meta: MetaKind = alt?.meta ?? sk.meta
  const aMetaValle = valleDeAMeta(sk)
  const conAMeta = meta === 'esprint' && aMetaValle !== null // la meta esprint con V5(c) declarado
  const E = ARCH.meta.esprint.km
  // El llano de la meta esprint tras un circuito: lo que el valle deja tras un cierre de al menos enlaceMinimo.
  const esprintTrasCircuito: Esprint =
    conAMeta && aMetaValle !== null
      ? { lo: E[0], hi: Math.max(E[0], r1(aMetaValle[1] - ARCH.colocacion.enlaceMinimo)) }
      : { lo: E[0], hi: E[1] }
  const out: Instancia[] = []
  let cierre: number | null = null
  const cfg = req.edicion ?? ARCH.edicion
  const { enlaceMinimo, enlaceMinimoTotal } = ARCH.colocacion
  /** El km más corto que la edición puede dar a la etapa: el jitter solo recorta por arriba (§8.4). */
  const kmMinimoEtapa = req.km * (1 - cfg.kmJitter)

  // Lo lineal de firma delante de un circuito de firma (paso 9: el `expuesto` de `nc_ruta`) cabe si el
  // circuito aún puede empezar dentro de su ventana con la vuelta más larga: su aproximación máxima
  // menos un enlace mínimo a cada lado, lo que puede variar el llano de la meta y el redondeo de la
  // vuelta al 0,1 en todas las vueltas.
  const circ = sk.slots.find((sl) => sl.firma && sl.motif === 'circuito')
  const kvCirc = cortaR(ARCH.motivo.circuito.kmVuelta, circ?.params?.kmRango)
  const antesDelCircuito =
    circ === undefined || kvCirc === null
      ? Infinity
      : Math.max(enlaceMinimo, circ.ventana[1] * (req.km - kvCirc[1])) -
        2 * enlaceMinimo -
        (esprintTrasCircuito.hi - esprintTrasCircuito.lo) -
        0.1 * (circ.params?.vueltasRango?.[1] ?? ARCH.motivo.circuito.vueltas[1]) // la vuelta va al 0,1
  // Lo lineal de firma: los huecos simples y compuestos que no son circuito (L de §8.3).
  sk.slots.forEach((sl, k) => {
    if (!sl.firma || sl.motif === 'circuito') return
    const params = alt?.slots?.[k] ?? sl.params
    const n = Math.max(1, sl.n[0])
    const disponible = Math.min(
      antesDelCircuito,
      Math.min(
        (kmMinimoEtapa * (1 - sl.ventana[0]) - enlaceMinimo) / n,
        n > 1 ? (kmMinimoEtapa * (sl.ventana[1] - sl.ventana[0])) / (n - 1) : Infinity,
      ) - enlaceMinimo,
    )
    for (let j = 0; j < sl.n[0]; j++) {
      const m =
        sl.motif === 'cadena' || sl.motif === 'racimo'
          ? lineal(sl, params, rand, ctx)
          : simple(sl.motif, rand, ctx, {
              params,
              ventana: sl.ventana,
              n: sl.n[0],
              disponible,
              obligatorio: true,
            })
      if (m === null) continue
      out.push({ slot: k, j, motif: { ...m, firma: true } })
    }
  })
  const lineales = out.reduce(
    (a, x) => a + (x.motif.kind === 'enlace' ? 0 : x.motif.km * (x.motif.vueltas ?? 1)),
    0,
  )
  // El llano de la meta esprint no puede comerse la etapa (un prólogo de 3 km): deja dos enlaces mínimos.
  const esprint: Rango = [
    E[0],
    Math.max(E[0], Math.min(E[1], techo1(kmMinimoEtapa - lineales - 2 * enlaceMinimo))),
  ]
  // Con un circuito de firma y sin `aMeta`, el llano de la meta se tira ANTES que el circuito, porque su
  // km entra en la aproximación que acota la vuelta (un critérium de 45 km no tiene sitio para las dos
  // incertidumbres a la vez); con `aMeta` depende del cierre de la vuelta y va después.
  const hayCircuito = sk.slots.some((sl) => sl.firma && sl.motif === 'circuito')
  const esprintPrevio = meta === 'esprint' && !conAMeta && hayCircuito ? U1(rand, esprint) : null

  // El circuito de firma: vueltas base, km de la vuelta acotado por la aproximación, hijos y vuelta.
  for (const [k, sl] of sk.slots.entries()) {
    if (!sl.firma || sl.motif !== 'circuito') continue
    const params = alt?.slots?.[k] ?? sl.params
    const C = ARCH.motivo.circuito
    const vR = cortaR(C.vueltas, params?.vueltasRango) ?? [...C.vueltas]
    const kvR = cortaR(C.kmVuelta, params?.kmRango) ?? [...C.kmVuelta]
    const vueltasBase = enteroEn(rand, vR)
    const minAprox = ARCH.colocacion.enlaceMinimo
    const maxAprox = Math.max(minAprox, sl.ventana[1] * (req.km - kvR[1]))
    // Lo lineal de firma va DELANTE del circuito (el circuito acaba en la meta, §8.4): cuenta en el
    // techo de la vuelta, con su enlace de aproximación, pero no en el suelo, que solo pide que el
    // circuito empiece dentro de su ventana (`maxAprox`). Paso 9: `nc_ruta` es el único esqueleto con
    // lineal de firma y circuito (su `expuesto`); con el suelo de antes el circuito podía empezar
    // fuera de la ventana y `colocar` no llegaba en ningún intento.
    const nLineales = out.filter((x) => x.motif.kind !== 'enlace').length
    const Lmin = esprintPrevio ?? esprintTrasCircuito.lo
    const Lmax = lineales + nLineales * minAprox + (esprintPrevio ?? esprintTrasCircuito.hi)
    const rangoKv = (v: number): R2 | null =>
      cortaR(kvR, [suelo1((req.km - maxAprox - Lmin) / v), techo1((req.km - minAprox - Lmax) / v)])
    // Sin tirada nueva: si el rango queda vacío, una vuelta menos (sin bajar del rango) y, si no, una más.
    let v = vueltasBase
    let r = rangoKv(v)
    for (let d = 1; r === null && d <= vR[1] - vR[0]; d++) {
      for (const cand of [vueltasBase - d, vueltasBase + d]) {
        if (cand < vR[0] || cand > vR[1] || r !== null) continue
        const rc = rangoKv(cand)
        if (rc !== null) {
          v = cand
          r = rc
        }
      }
    }
    if (r === null) throw new Error(`circuito sin sitio: ${sk.id} con ${req.km} km`)
    const kmVuelta = U1(rand, r)
    const hijos = hijosDe(sl, rand, ctx, undefined, undefined)
    // v + 1: el jitter de edición puede sumar una vuelta. Si ni con los hijos en su suelo cabe en el
    // techo, la vuelta pierde pasos (sin dados) y se alarga lo que haga falta para conservar la
    // aproximación: un nacional de 16 vueltas con una cota de 4 km al 5 % son 3.200 m de subida.
    let km = kmVuelta
    // Paso 9: primero las vueltas y después los hijos. Una vuelta menos quita más desnivel que un muro
    // y conserva lo que la zona pone en el circuito (§6.5: el nacional genérico o el italiano llevan
    // cota Y muro); quitando el muro antes, 260 de los 266 nacionales en ruta salían con la misma firma
    // (`nacionales.firmas`, balance v87 §1). Sin dados: se pregunta sobre una copia de los hijos.
    const copia = (): Hijo[] => hijos.map((h) => ({ ...h, m: { ...h.m } }))
    while (
      v > vR[0] &&
      !ajustaAlTecho(copia(), Math.min(vR[1], v + 1), req.km, ctx, techoDeDesnivel(sk), true)
    ) {
      const r2 = rangoKv(v - 1)
      if (r2 === null) break
      v--
      km = Math.min(r2[1], Math.max(r2[0], r1((km * (v + 1)) / v)))
    }
    while (
      !ajustaAlTecho(hijos, Math.min(vR[1], v + 1), req.km, ctx, techoDeDesnivel(sk)) &&
      v > vR[0]
    ) {
      const r2 = rangoKv(v - 1)
      if (r2 === null) break
      v--
      km = Math.min(r2[1], Math.max(r2[0], r1((km * (v + 1)) / v)))
    }
    const cierreMax =
      conAMeta && aMetaValle !== null
        ? Math.max(ARCH.colocacion.enlaceMinimo, r1(aMetaValle[1] - E[0]))
        : null
    const vuelta = vueltaDe(km, hijos, rand, cierreMax, sk.id)
    const ultimoHijo = vuelta.hijos.length
    const finUltimo =
      vuelta.separaciones.reduce((a, s) => a + s, 0) + vuelta.hijos.reduce((a, h) => a + h.km, 0)
    cierre = ultimoHijo > 0 ? r1(km - finUltimo) : null
    out.push({
      slot: k,
      j: 0,
      motif: { kind: 'circuito', km, vueltas: v, ...vuelta, firma: true },
    })
  }
  out.sort((a, b) => (a.slot as number) - (b.slot as number) || a.j - b.j)

  // Lo más largo que puede medir la meta para que quepan los huecos obligatorios no firma en su suelo
  // (paso 5): una reina de valle de 130 km con tres puertos de 11 km y sus bajadas no tiene sitio para
  // una subida de meta de 16 km y 19 de valle, y la firma no se reintenta.
  const metaMaxima = kmMinimoEtapa - lineales - espacioObligatorio(sk, req.geo, kmMinimoEtapa)

  // La meta, siempre de firma: la subida en ARCH ∩ lo declarado con los techos de altitud (regla 2 de
  // §5.1), y después el valle, el llano o el sector.
  const r = rangoCotaFinal(sk, alt)
  let cotaFinal: { km: number; g: number } | undefined
  if (r !== null) {
    // La subida de meta deja el 12 % de enlace de V10(a) aunque la edición acorte la etapa (paso 5):
    // sin esto una cronoescalada de 12 km con 11 de subida es una firma que ningún reintento arregla.
    const topeV10 = techo1(Math.min(kmMinimoEtapa * (1 - enlaceMinimoTotal) - lineales, metaMaxima))
    const kr0 = techoKmCotaFinal(r, req.geo.altitud)
    const kr: R2 = [kr0[0], Math.max(kr0[0], Math.min(kr0[1], topeV10))]
    const km = Math.min(kr[1], Math.max(kr[0], r1(kr[0] + rand() * (kr[1] - kr[0]))))
    const gr0 = techoGCotaFinal(meta, r, km, req.geo.altitud)
    // Y la subida de meta no se come sola el techo del esqueleto (paso 5): una cronoescalada de 15 km
    // al 9 % son 1.350 m sobre un techo de 1.200. Solo baja el techo de g, nunca de su suelo.
    const relleno = ARCH.reina.rellenoDplusPorKm * Math.max(0, kmMinimoEtapa - lineales - km)
    const techoSk = sk.dPlus[1] * ARCH.veto.puertoDplusDibujo - relleno
    const gr: R2 = [gr0[0], Math.max(gr0[0], Math.min(gr0[1], techo1(techoSk / (km * 10))))]
    const g = Math.min(gr[1], Math.max(gr[0], r1(gr[0] + rand() * (gr[1] - gr[0]))))
    cotaFinal = { km, g }
  }
  const mm: Motif = { kind: 'meta', meta, km: 0, firma: true }
  if (cotaFinal) mm.cotaFinal = cotaFinal
  const A = ARCH.meta
  switch (meta) {
    case 'esprint': {
      if (cierre !== null && aMetaValle !== null) {
        const lo = Math.max(E[0], r1(aMetaValle[0] - cierre))
        const hi = Math.max(lo, r1(aMetaValle[1] - cierre))
        mm.km = U1(rand, [lo, hi])
      } else mm.km = esprintPrevio ?? U1(rand, esprint)
      break
    }
    case 'repecho':
    case 'alto_corto':
    case 'alto_largo':
      mm.km = cotaFinal!.km
      break
    case 'muro_meta':
      mm.km = r1(A.muro.aproxKm + cotaFinal!.km)
      break
    case 'cima_cerca':
    case 'descenso_meta':
    case 'valle': {
      const clave =
        meta === 'cima_cerca' ? 'cimaCerca' : meta === 'descenso_meta' ? 'descensoMeta' : 'valle'
      const unDia = !sk.id.startsWith('et_')
      // En una etapa de vuelta el valle solo se acota si el esqueleto declara `aMeta` (paso 9: el final
      // largo de `et_reina_valle`); en un día, V5(c) lo acota siempre.
      const aMeta = unDia ? (aMetaValle ?? valleDeAMetaPorDefecto()) : aMetaValle
      const vR = cortaR(A[clave].valle, aMeta ?? undefined) ?? [...A[clave].valle]
      // Y el valle, lo que deje la subida de meta dentro de lo que cabe (sin bajar de su suelo).
      const tope = Math.max(vR[0], techo1(metaMaxima - cotaFinal!.km))
      const valle = U1(rand, [vR[0], Math.min(vR[1], tope)])
      mm.km = r1(cotaFinal!.km + valle)
      break
    }
    case 'sector_meta': {
      const firme = firmeDe(req.geo) ?? 'adoquin'
      const km = U1(rand, ARCH.motivo.sector.km)
      const estrellas = enteroEn(rand, ARCH.motivo.sector.estrellas)
      const aMeta = U1(rand, cortaR(A.sectorMeta.aMeta, sk.metaParams?.aMeta) ?? A.sectorMeta.aMeta)
      mm.hijos = [{ kind: 'sector', km, estrellas, firme }]
      mm.km = r1(km + aMeta)
      break
    }
  }
  out.push({ slot: 'meta', j: 0, motif: mm })
  return out
}

/**
 * Lo que sube un km de enlace en la zona: el mayor entre la mediana medida (`rellenoDplusPorKm`) y lo
 * que da `rolling` a la amplitud de la zona, que sube en la mitad de cada trozo a una pendiente media
 * `(gMin + amp) / 2` (`profileGen.ts`: `gMin = min(0,8; 0,45·amp)`): 1,45 m/km en el golfo, 4,2 en
 * los Alpes (medidos 1,32 y 3,77, paso 3). Solo lo usa `ajustaAlTecho`, que no puede equivocarse por
 * abajo porque la firma no se reintenta.
 */
function rellenoPorKm(geo: GeoSignature): number {
  const amp = Math.min(geo.amplitud, ARCH.motivo.enlace.ampMax)
  const gMin = Math.min(0.8, 0.45 * amp) // los de `rolling` (profileGen.ts), no perillas
  return Math.max(ARCH.reina.rellenoDplusPorKm, 0.5 * ((gMin + amp) / 2) * 10)
}

/** El techo de desnivel de un esqueleto: `dPlus[1]` y, en una `media`, además los 2.900 m de la red de reina. */
function techoDeDesnivel(sk: Skeleton): number {
  const techoMedia = QUEEN_MIN_CLIMB_METRES - ARCH.veto.margenClaseMetros
  return sk.kind === 'media' ? Math.min(sk.dPlus[1], techoMedia) : sk.dPlus[1]
}

/**
 * Un circuito de firma sube lo mismo en cada vuelta y sus hijos no se escalan nunca (§8.5), así que
 * el techo de desnivel del esqueleto (en una `media`, la red de los 2.900 m que `garantizaClase` no
 * puede aplicar a la firma) se aplica aquí, sin dados: si `vueltas × metros por vuelta` más el relleno
 * estimado pasa del techo, baja la pendiente de las subidas hacia el suelo del motivo y la zona; si no
 * basta, quita los hijos opcionales empezando por el último; y si aún no basta, lleva el km de las
 * subidas hacia el suelo de su rango.
 */
function ajustaAlTecho(
  hijos: Hijo[],
  vueltas: number,
  kmEtapa: number,
  ctx: Ctx,
  techo: number,
  soloPendiente = false,
): boolean {
  // Se persigue el techo con la misma holgura de dibujo que V4(c): el ruido de `climb` y el relleno
  // de la zona real (la mediana es 3 m/km, pero varía de 1,3 a 3,8) mueven los metros dibujados.
  const objetivo = techo * ARCH.veto.puertoDplusDibujo
  const subidas = (): Hijo[] => hijos.filter((h) => sube(h.m))
  const total = (): number => {
    const kmHijos = hijos.reduce((a, h) => a + h.m.km, 0)
    const relleno = rellenoPorKm(ctx.geo) * Math.max(0, kmEtapa - vueltas * kmHijos)
    return vueltas * subidas().reduce((a, h) => a + metros(h.m), 0) + relleno
  }
  if (total() <= objetivo) return true
  const suelo = (m: Motif): number => {
    const z = m.kind === 'muro' ? ctx.geo.muro?.g : ctx.geo.cota?.g
    const A = m.kind === 'muro' ? ARCH.motivo.muro.g : COTA_G
    return Math.max(A[0], z?.[0] ?? A[0])
  }
  // 1) la pendiente, hacia el suelo del motivo y de la zona
  for (const h of subidas()) h.m.g = suelo(h.m)
  // Con `soloPendiente` (sobre una copia) solo se pregunta si basta con la pendiente: es lo que decide
  // si el circuito pierde una vuelta antes de perder un hijo (paso 9, `instanciarFirma`).
  if (soloPendiente) return total() <= objetivo
  // 2) los hijos opcionales, del último hacia atrás, sin quitar la última subida de la vuelta
  while (total() > objetivo && subidas().length > 1) {
    let i = -1
    hijos.forEach((h, k) => {
      if (!h.obligatorio && sube(h.m)) i = k
    })
    if (i < 0) break
    hijos.splice(i, 1)
  }
  // 3) el km de las subidas que quedan, de décima en décima hacia el suelo de su rango
  for (let paso = 0; total() > objetivo && paso < 200; paso++) {
    const recortable = subidas().filter(
      (h) => h.m.km > suelo1(ctx.rangos.get(h.m)?.[0] ?? h.m.km) + EPS,
    )
    if (recortable.length === 0) break
    for (const h of recortable) h.m.km = r1(h.m.km - 0.1)
  }
  // Cabe si queda bajo el techo de verdad: la holgura de dibujo es a lo que se apunta, no el veto.
  return total() <= techo
}

/**
 * ¿Cabe la meta de `sk` en esta etapa con su subida y su valle en el suelo? Es la cuenta de
 * `metaMaxima` de `instanciarFirma` (los huecos obligatorios no firma en su suelo, desde su ventana). La usa `esqueletoDeCarrera` (paso 9) para
 * no sortear el final largo de `et_reina_valle` donde no hay carretera para él. Sin dados.
 */
export function cabeLaMeta(sk: Skeleton, req: StageRequest): boolean {
  const kmMin = req.km * (1 - (req.edicion ?? ARCH.edicion).kmJitter)
  const r = rangoCotaFinal(sk, null)
  const A = ARCH.meta
  const valle =
    sk.meta === 'cima_cerca'
      ? A.cimaCerca.valle[0]
      : sk.meta === 'descenso_meta'
        ? A.descensoMeta.valle[0]
        : sk.meta === 'valle'
          ? A.valle.valle[0]
          : 0
  return kmMin - espacioObligatorio(sk, req.geo, kmMin) >= (r?.km[0] ?? 0) + valle
}

/**
 * Los km de carretera que piden los huecos obligatorios NO firma en su suelo (su km más corto en el
 * motivo, la zona y el hueco, con su bajada y un `enlaceMinimo` detrás), desde el inicio de la
 * ventana más temprana, más el `enlaceMinimo` antes de la meta. Sin dados.
 */
function espacioObligatorio(sk: Skeleton, geo: GeoSignature, km: number): number {
  const { perdidaPorKm, kmMin, kmMax } = ARCH.motivo.descenso.kmPorDesnivel
  const min = ARCH.colocacion.enlaceMinimo
  let total = 0
  let inicio = Infinity
  for (const sl of sk.slots) {
    if (sl.firma || sl.n[0] < 1) continue
    if (sl.motif !== 'puerto' && sl.motif !== 'cota' && sl.motif !== 'muro') continue
    const z = geo[sl.motif]
    if (z === null) continue
    const A = ARCH.motivo[sl.motif]
    const kmLo = Math.max(A.km[0], z.km[0], sl.params?.kmRango?.[0] ?? -Infinity)
    const gLo = Math.max(A.g[0], z.g[0], sl.params?.gRango?.[0] ?? -Infinity)
    const bajada =
      llevaBajadas(sk) && sl.motif !== 'muro'
        ? Math.min(kmMax, Math.max(kmMin, (kmLo * gLo * 10) / perdidaPorKm))
        : 0
    total += sl.n[0] * (kmLo + bajada + min)
    inicio = Math.min(inicio, sl.ventana[0])
  }
  return total === 0 ? min : inicio * km + total + min
}

/** La ventana de V5(c) de un día que no declara `aMeta` (`ARCH.meta.unDiaUltimaCota.aMeta`, la de `ud_montana`), con el redondeo de la pancarta. */
function valleDeAMetaPorDefecto(): R2 {
  const a = ARCH.meta.unDiaUltimaCota.aMeta
  return [r1(a[0] + REDONDEO_PANCARTA_KM), r1(a[1] - REDONDEO_PANCARTA_KM)]
}

/** Los metros que sube una dificultad dibujada a su pendiente media (km · g · 10), 0 si baja o no tiene. */
const metros = (m: Motif): number => ((m.g ?? 0) > 0 ? m.km * m.g! * 10 : 0)

/**
 * Los km de carretera de UNA instancia del hueco con su bajada, si el hueco tiene `n`: lo que cabe
 * entre el inicio de su ventana y la meta (de `metaKm`), repartido entre las `n`, y lo que deja el
 * final de la ventana a las `n − 1` primeras (la última tiene que EMPEZAR dentro de ella, §8.6).
 */
function disponibleEnHueco(sl: Slot, n: number, km: number, metaKm: number): number {
  const min = ARCH.colocacion.enlaceMinimo
  const hastaMeta = (km * (1 - sl.ventana[0]) - metaKm - min) / Math.max(1, n)
  const enVentana = n > 1 ? (km * (sl.ventana[1] - sl.ventana[0])) / (n - 1) : Infinity
  return Math.min(hastaMeta, enVentana) - min
}

/**
 * La cardinalidad que cabe (paso 5): el plan decide cuántas instancias pide un hueco, pero si la
 * etapa no tiene sitio ni para las más cortas, las opcionales sobrantes no se instancian (una reina
 * de 130 km no lleva cuatro puertos con sus bajadas). Nunca baja de `n[0]`: una obligatoria que no
 * cabe se degrada, como en la zona.
 */
function cabenEnHueco(
  sk: Skeleton,
  sl: Slot,
  pedidas: number,
  km: number,
  metaKm: number,
  geo: GeoSignature,
): number {
  if (sl.motif !== 'puerto' && sl.motif !== 'cota' && sl.motif !== 'muro') return pedidas
  const z = geo[sl.motif]
  if (z === null) return pedidas
  const A = ARCH.motivo[sl.motif]
  const kmLo = Math.max(A.km[0], z.km[0], sl.params?.kmRango?.[0] ?? -Infinity)
  const gLo = Math.max(A.g[0], z.g[0], sl.params?.gRango?.[0] ?? -Infinity)
  const conBajada = llevaBajadas(sk) && sl.motif !== 'muro'
  let n = pedidas
  while (
    n > sl.n[0] &&
    kmQueCabe(disponibleEnHueco(sl, n, km, metaKm), gLo, conBajada) < kmLo - EPS
  )
    n--
  return n
}

/**
 * Paso 4 (§8.5): los huecos no firma con `plan.n[slot]` instancias, cada una con su corriente
 * `mot|…|${slot}|${j}|i${intento}` (`rngDe(slot, j)`), más la firma (el circuito con las vueltas del
 * plan) y la meta al final; orden: hueco, `j`. Después, en una sola pasada y sin iterar, la persecución
 * del desnivel: escala la LONGITUD de las dificultades no firma (en una `cadena`, la de cada hijo) por
 * `clamp((objetivo − R − D_firma − D_meta) / D_noFirma, 0,7, 1,4)`, con `R` el relleno de la zona
 * (`rellenoPorAmplitud` × amplitud por km de enlace) y, en una `media`, con el techo de 2.900 m; cada
 * km vuelve a su rango.
 */
export function instanciar(
  skCatalogo: Skeleton,
  firma: readonly Instancia[],
  plan: EditionPlan,
  req: StageRequest,
  rngDe: (slot: number, j: number) => Rand,
): Instancia[] {
  const sk = conVentanasDe(skCatalogo, req) // en una transición, las ventanas con que se colocará
  const ctx: Ctx = { sk, geo: req.geo, km: plan.km, rangos: new Map() }
  const metaFirma = firma.find((f) => f.slot === 'meta')
  const out: Instancia[] = []
  const primeraCota = sk.slots.findIndex((s) => s.motif === 'cota' && !s.firma)
  const metaKm = metaFirma?.motif.km ?? 0
  const disponibleDe = (sl: Slot, n: number): number => disponibleEnHueco(sl, n, plan.km, metaKm)
  const cabenDe = (sl: Slot, pedidas: number): number =>
    cabenEnHueco(sk, sl, pedidas, plan.km, metaKm, req.geo)
  sk.slots.forEach((sl, k) => {
    if (sl.firma) {
      for (const f of firma)
        if (f.slot === k)
          out.push(
            f.motif.kind === 'circuito' && plan.vueltas !== undefined
              ? { ...f, motif: { ...f.motif, vueltas: plan.vueltas } }
              : f,
          )
      return
    }
    const n = cabenDe(sl, plan.n[k] ?? 0)
    for (let j = 0; j < n; j++) {
      const rand = rngDe(k, j)
      let m: Motif | null
      if (sl.motif === 'cadena' || sl.motif === 'racimo') {
        m = lineal(sl, sl.params, rand, ctx, disponibleDe(sl, n) + ARCH.colocacion.enlaceMinimo)
        const fc = sl.params?.firmaCount ?? 0
        if (m?.kind === 'racimo' && j < fc && m.hijos && m.hijos.length > 0) {
          const i = Math.min(m.hijos.length - 1, Math.floor(rand() * m.hijos.length))
          m.hijos[i] = { ...m.hijos[i]!, estrellas: ARCH.motivo.sector.estrellas[1], firma: true }
        }
        if (m === null)
          m = { kind: 'enlace', km: ARCH.motivo.enlace.km[0], nombre: NOMBRE_SIN[sl.motif]! }
      } else if (sl.motif === 'circuito') {
        const params = sl.params
        const C = ARCH.motivo.circuito
        const kvR = cortaR(C.kmVuelta, params?.kmRango) ?? [...C.kmVuelta]
        const vR = cortaR(C.vueltas, params?.vueltasRango) ?? [...C.vueltas]
        let kmVuelta = U1(rand, kvR)
        let vueltas = enteroEn(rand, vR)
        // Un circuito que no cabe entre su ventana y la meta pierde vueltas y, si no basta, km de vuelta
        // (sin dados; la vuelta de Huy de 30 km × 3 no cabe en una Flèche de 180).
        const disp = disponibleDe(sl, n) + ARCH.colocacion.enlaceMinimo
        while (kmVuelta * vueltas > disp + EPS && vueltas > Math.ceil(vR[0])) vueltas--
        if (kmVuelta * vueltas > disp + EPS)
          kmVuelta = Math.max(suelo1(kvR[0]), techo1(disp / vueltas))
        const hijos = hijosDe(sl, rand, ctx, metaFirma?.motif.cotaFinal, undefined)
        const vuelta = vueltaDe(kmVuelta, hijos, rand, null, sk.id)
        m = { kind: 'circuito', km: kmVuelta, vueltas, ...vuelta }
      } else {
        let kmExtra: Rango | undefined
        if (k === primeraCota && j === 0 && PRIMERA_COTA_MEDIA.has(sk.id))
          kmExtra = [COTA_MEDIA_KM, ARCH.motivo.cota.km[1]]
        if (k === primeraCota && j === n - 1 && ULTIMA_COTA_CORTA.has(sk.id))
          kmExtra = [ARCH.motivo.cota.km[0], ARCH.meta.unDiaUltimaCota.km[1]]
        const disponible = disponibleDe(sl, n)
        m = simple(sl.motif, rand, ctx, {
          params: sl.params,
          ventana: sl.ventana,
          n,
          kmExtra,
          disponible,
          obligatorio: j < sl.n[0],
        })
      }
      if (m === null) continue
      out.push({ slot: k, j, motif: m })
    }
  })
  if (metaFirma) out.push(metaFirma)
  persigueDesnivel(sk, plan, out, ctx)
  return quitaLoQueNoCabe(sk, plan, out, req.geo)
}

/**
 * La etapa entera tiene que caber en carretera (paso 5): desde el inicio de la ventana más temprana,
 * cada colocable con su bajada estimada y un `enlaceMinimo` detrás, y la meta al final. Y, ya
 * perseguido el desnivel, no pasar del techo del esqueleto (cuatro puertos alpinos de 12 km en su
 * suelo son una reina de valle de 5.600 m sobre un techo de 5.000). Si no, salen las instancias
 * opcionales (`j ≥ n[0]`) empezando por el último hueco y la última `j`; las obligatorias se quedan y
 * la colocación y los vetos dirán. Sin dados.
 */
function quitaLoQueNoCabe(
  sk: Skeleton,
  plan: EditionPlan,
  ms: Instancia[],
  geo: GeoSignature,
): Instancia[] {
  const { perdidaPorKm, kmMin, kmMax } = ARCH.motivo.descenso.kmPorDesnivel
  const conBajada = llevaBajadas(sk)
  const colocable = (x: Instancia): boolean =>
    x.slot !== 'meta' && x.motif.kind !== 'enlace' && x.motif.kind !== 'meta'
  const carretera = (m: Motif): number => {
    const bajada =
      conBajada && (m.kind === 'cota' || m.kind === 'puerto')
        ? Math.min(kmMax, Math.max(kmMin, (m.km * (m.g ?? 0) * 10) / perdidaPorKm))
        : 0
    return m.km * (m.vueltas ?? 1) + bajada + ARCH.colocacion.enlaceMinimo
  }
  const out = [...ms]
  const meta = out.find((x) => x.slot === 'meta')?.motif.km ?? 0
  const cabe = (): boolean => {
    const cs = out.filter(colocable)
    if (cs.length === 0) return true
    const a = Math.min(...cs.map((x) => sk.slots[x.slot as number]?.ventana[0] ?? 0))
    return cs.reduce((t, x) => t + carretera(x.motif), 0) <= plan.km * (1 - a) - meta + EPS
  }
  const pasaDelTecho = (): boolean => {
    const d = medidas(sk, plan.km, geo, out)
    return d.R + d.dFirma + d.dMeta + d.dNoFirma + d.dFijo > techoDeDesnivel(sk)
  }
  while (!cabe() || pasaDelTecho()) {
    let quitar = -1
    out.forEach((x, i) => {
      if (!colocable(x) || x.motif.firma) return
      const sl = sk.slots[x.slot as number]
      if (sl && x.j >= sl.n[0]) quitar = i
    })
    if (quitar < 0) break
    out.splice(quitar, 1)
  }
  return out
}

/**
 * Lo que sube un km de enlace en la zona, para las cuentas del desnivel (§8.5): `rolling` sube en la
 * mitad de cada trozo a una pendiente media lineal en la amplitud mientras `0,45 · amp < 0,8` (todas
 * las zonas: la mayor es 1,15), así que el relleno es `ARCH.reina.rellenoPorAmplitud × amplitud`.
 * `rellenoDplusPorKm` sigue siendo la mediana de todas las zonas juntas (lo que mide el censo).
 */
function rellenoDeZona(amplitud: number): number {
  return ARCH.reina.rellenoPorAmplitud * Math.min(amplitud, ARCH.motivo.enlace.ampMax)
}

/** Los km de la bajada canónica de una subida de `km` × `g` (`motivo.descenso.kmPorDesnivel`), sin tirada. */
function kmDeBajada(km: number, g: number): number {
  const { perdidaPorKm, kmMin, kmMax } = ARCH.motivo.descenso.kmPorDesnivel
  return Math.min(kmMax, Math.max(kmMin, (km * g * 10) / perdidaPorKm))
}

/** Las cuentas de la persecución del desnivel (§8.5): metros de firma, de meta, no firma y fijos, y el relleno estimado. */
interface Medidas {
  dFirma: number
  dMeta: number
  dNoFirma: number
  dFijo: number // las `tendida` y los `expuesto`: suben por su pendiente o su amplitud, no a la de la zona
  R: number // el relleno de la zona sobre los km que no son dificultad
  kmLibre: number // esos km: los de enlace
}
function medidas(sk: Skeleton, km: number, geo: GeoSignature, ms: readonly Instancia[]): Medidas {
  const conBajada = llevaBajadas(sk)
  let dFirma = 0
  let dMeta = 0
  let dNoFirma = 0
  let dFijo = 0
  let kmDif = 0
  let kmFijo = 0
  for (const { slot, motif: m } of ms) {
    switch (m.kind) {
      case 'meta':
        if (m.cotaFinal) {
          dMeta += m.cotaFinal.km * m.cotaFinal.g * 10
          kmDif += m.cotaFinal.km
          // En una meta con valle, la bajada canónica tampoco es relleno; el llano que resta, sí.
          if (m.meta === 'cima_cerca' || m.meta === 'descenso_meta' || m.meta === 'valle')
            kmDif += Math.min(
              Math.max(0, m.km - m.cotaFinal.km),
              kmDeBajada(m.cotaFinal.km, m.cotaFinal.g),
            )
        } else kmDif += m.hijos?.[0]?.km ?? 0
        break
      case 'cota':
      case 'puerto':
      case 'muro':
        if (m.firma) dFirma += metros(m)
        else dNoFirma += metros(m)
        kmDif += m.km
        if (conBajada && m.kind !== 'muro' && slot !== 'meta') kmDif += kmDeBajada(m.km, m.g ?? 0)
        break
      case 'cadena':
        for (const h of m.hijos ?? []) {
          if (m.firma) dFirma += metros(h)
          else dNoFirma += metros(h)
        }
        kmDif += m.km
        break
      case 'circuito':
        dFirma += (m.vueltas ?? 1) * (m.hijos ?? []).reduce((a, h) => a + metros(h), 0)
        kmDif += m.km * (m.vueltas ?? 1)
        break
      case 'racimo':
      case 'sector':
        kmDif += m.km
        break
      case 'tendida':
        dFijo += metros(m)
        kmFijo += m.km
        break
      case 'expuesto':
        dFijo += rellenoDeZona(Math.min(ARCH.motivo.expuesto.amp, geo.amplitud)) * m.km
        kmFijo += m.km
        break
      default:
        break
    }
  }
  const kmLibre = Math.max(0, km - kmDif - kmFijo)
  return { dFirma, dMeta, dNoFirma, dFijo, R: rellenoDeZona(geo.amplitud) * kmLibre, kmLibre }
}

/** §8.5, la persecución del desnivel total: una sola pasada sobre las longitudes no firma. */
function persigueDesnivel(sk: Skeleton, plan: EditionPlan, ms: Instancia[], ctx: Ctx): void {
  const { dFirma, dMeta, dNoFirma, dFijo, R } = medidas(sk, plan.km, ctx.geo, ms)
  if (dNoFirma <= 0) return
  const [lo, hi] = ARCH.reina.escalaDificultades
  const fijo = R + dFirma + dMeta + dFijo
  let escala = Math.min(hi, Math.max(lo, (plan.dPlusObjetivo - fijo) / dNoFirma))
  // El techo: el de una media (2.900 m, §8.5) y, en todo esqueleto, su `dPlus[1]` con la holgura de
  // dibujo (paso 5): el objetivo ya está bajo el techo, pero la estimación del relleno y el ruido de
  // `climb` pueden pasarlo (una reina de valle de 5.900 m sobre un techo de 5.000).
  const techo = techoDeDesnivel(sk) * (sk.kind === 'media' ? 1 : ARCH.veto.puertoDplusDibujo)
  if (fijo + escala * dNoFirma > techo) escala = Math.max(lo, (techo - fijo) / dNoFirma)
  if (Math.abs(escala - 1) < EPS) return
  const escalaUna = (m: Motif): void => {
    const r = ctx.rangos.get(m)
    const km = r1(m.km * escala)
    m.km = r ? Math.min(techo1(r[1]), Math.max(suelo1(r[0]), km)) : km
  }
  for (const { motif: m } of ms) {
    if (m.firma) continue
    if (m.kind === 'cota' || m.kind === 'puerto' || m.kind === 'muro') escalaUna(m)
    else if (m.kind === 'cadena' && m.hijos) {
      m.hijos.forEach(escalaUna)
      m.km = r1(
        m.hijos.reduce((a, h) => a + h.km, 0) + (m.separaciones ?? []).reduce((a, s) => a + s, 0),
      )
    }
  }
}

// ---------------------------------------------------------------------------------------------------
// El desnivel que la instancia puede dar (§8.4 punto 4): lo lee `planDeEdicion` para sortear un
// objetivo alcanzable, sin dados y sin mirar el intento.
// ---------------------------------------------------------------------------------------------------

/** Lo que aporta un hueco no firma a las cuentas de §8.5, en el suelo y en el techo de la escala. */
interface Aporte {
  dLo: number // metros escalables con toda longitud a `escalaDificultades[0]` (sin bajar de su rango)
  dHi: number // y a `escalaDificultades[1]` (sin pasar de su rango)
  kmLo: number // sus km de carretera que no son relleno (bajadas incluidas) en el suelo de la escala
  kmHi: number // y en el techo
  dFijo: number // metros que la escala no toca (tendida, expuesto, hijos de circuito)
  kmFijo: number // y sus km
}
const NADA: Aporte = { dLo: 0, dHi: 0, kmLo: 0, kmHi: 0, dFijo: 0, kmFijo: 0 }
const medio = ([a, b]: Rango): number => (a + b) / 2
const sumaAporte = (x: Aporte, y: Aporte, k: number): Aporte => ({
  dLo: x.dLo + k * y.dLo,
  dHi: x.dHi + k * y.dHi,
  kmLo: x.kmLo + k * y.kmLo,
  kmHi: x.kmHi + k * y.kmHi,
  dFijo: x.dFijo + k * y.dFijo,
  kmFijo: x.kmFijo + k * y.kmFijo,
})

/** `E[min(b, e·x)]` con `x` uniforme en `[a; b]` y `e ≥ 1`: la longitud media tras escalar hacia arriba. */
function mediaEscaladaArriba([a, b]: Rango, e: number): number {
  if (b - a < EPS) return Math.min(b, e * a)
  const t = b / e
  if (t <= a) return b
  return ((e * (t * t - a * a)) / 2 + b * (b - t)) / (b - a)
}
/** `E[max(a, e·x)]` con `x` uniforme en `[a; b]` y `e ≤ 1`: la longitud media tras escalar hacia abajo. */
function mediaEscaladaAbajo([a, b]: Rango, e: number): number {
  if (b - a < EPS) return Math.max(a, e * b)
  const t = a / e
  if (t >= b) return a
  return (a * (t - a) + (e * (b * b - t * t)) / 2) / (b - a)
}

/**
 * Los rangos de km y pendiente con que `subida` sortearía un hueco en la zona, siguiendo la cadena de
 * degradación de §8.5 (`puerto → cota → muro`) y con lo que cabe en la etapa (`disponible`, si se da:
 * lo que no cabe se queda en su suelo); `null` si baja a enlace. Sin `kmExtra`: es la estimación del
 * plan, no la instancia.
 */
function rangosDeSubida(
  kind0: MotifKind,
  params: SlotParams | undefined,
  sk: Skeleton,
  geo: GeoSignature,
  disponible?: number,
): { kind: 'cota' | 'puerto' | 'muro'; km: R2; g: R2 } | null {
  const techo = techoDeDibujo(geo.altitud)
  for (const k of CADENA_DE[kind0] ?? []) {
    const kind = k as 'cota' | 'puerto' | 'muro'
    const z = geo[kind]
    if (z === null) continue
    const A = ARCH.motivo[kind]
    const gA = kind === 'cota' ? COTA_G : A.g
    const largo: Rango | undefined =
      kind === 'puerto' && !ALTITUD_LARGA.includes(geo.altitud)
        ? [0, r1(ARCH.veto.puertoLargoKm - 0.1)]
        : undefined
    const clasica: Rango | undefined =
      kind === 'cota' && sk.kind === 'clasica' ? [0, r1(WALL_MAX_KM - 0.1)] : undefined
    for (const p of kind === kind0 && params !== undefined ? [params, undefined] : [undefined]) {
      const g = cortaR(gA, p?.gRango, z.g) ?? cortaR(gA, z.g)
      if (g === null) break
      const km = cortaR(A.km, p?.kmRango, z.km, largo, clasica, [0, techo1(techo / (g[0] * 10))])
      if (km === null) continue
      if (disponible === undefined) return { kind, km, g }
      const cabe = techo1(kmQueCabe(disponible, g[0], llevaBajadas(sk) && kind !== 'muro'))
      return { kind, km: cortaR(km, [0, cabe]) ?? [km[0], km[0]], g }
    }
  }
  return null
}

/** Una subida no firma: longitud media escalada al suelo y al techo de `escalaDificultades`, a su pendiente media. */
function aporteDeSubida(
  kind0: MotifKind,
  params: SlotParams | undefined,
  sk: Skeleton,
  geo: GeoSignature,
  conBajada: boolean,
  disponible?: number,
): Aporte {
  const r = rangosDeSubida(kind0, params, sk, geo, disponible)
  if (r === null) return NADA
  const [eLo, eHi] = ARCH.reina.escalaDificultades
  const g = Math.min(medio(r.g), techoDeDibujo(geo.altitud) / (medio(r.km) * 10))
  const lo = mediaEscaladaAbajo(r.km, eLo)
  const hi = mediaEscaladaArriba(r.km, eHi)
  const baja = conBajada && r.kind !== 'muro'
  return {
    ...NADA,
    dLo: lo * g * 10,
    dHi: hi * g * 10,
    kmLo: lo + (baja ? kmDeBajada(lo, g) : 0),
    kmHi: hi + (baja ? kmDeBajada(hi, g) : 0),
  }
}

/**
 * Lo que aporta UNA instancia de un hueco no firma con `n` instancias (la media de lo que
 * `instanciar` sortea en él), con `metaKm` los km de la meta de firma.
 */
function aporteDeHueco(
  sk: Skeleton,
  sl: Slot,
  geo: GeoSignature,
  km: number,
  n: number,
  metaKm: number,
): Aporte {
  const p = sl.params
  switch (sl.motif) {
    case 'cota':
    case 'puerto':
    case 'muro':
      return aporteDeSubida(
        sl.motif,
        p,
        sk,
        geo,
        llevaBajadas(sk),
        disponibleEnHueco(sl, n, km, metaKm),
      )
    case 'cadena': {
      // Los hijos se escalan (§8.5); las separaciones no.
      const hijos: Slot[] = sl.hijos?.length
        ? sl.hijos
        : [
            {
              motif: geo.muro ? 'muro' : 'cota',
              n: [ARCH.motivo.cadena.hijos[0], ARCH.motivo.cadena.hijos[1]],
              ventana: [0, 1],
            },
          ]
      let a = NADA
      let cuantos = 0
      for (const h of hijos) {
        a = sumaAporte(a, aporteDeSubida(h.motif, h.params, sk, geo, false), medio(h.n))
        cuantos += medio(h.n)
      }
      const sep = medio(p?.separacionRango ?? ARCH.motivo.cadena.enlace)
      return { ...a, kmFijo: a.kmFijo + Math.max(0, cuantos - 1) * sep }
    }
    case 'racimo':
    case 'sector': {
      if (sk.kind !== 'clasica' || firmeDe(geo) === null) return NADA
      const sector = medio(cortaR(ARCH.motivo.sector.km, p?.kmRango) ?? ARCH.motivo.sector.km)
      if (sl.motif === 'sector') return { ...NADA, kmFijo: sector }
      const cuantos = medio(ARCH.motivo.racimo.sectores)
      const sep = medio(p?.separacionRango ?? ARCH.motivo.racimo.separacion)
      return { ...NADA, kmFijo: cuantos * sector + (cuantos - 1) * sep }
    }
    case 'tendida': {
      const A = ARCH.motivo.tendida
      const tope: Rango = [0, (km * (sl.ventana[1] - sl.ventana[0])) / Math.max(1, n)]
      const kmT = medio(cortaR(A.km, p?.kmRango, tope) ?? [A.km[0], A.km[0]])
      return { ...NADA, dFijo: kmT * medio(cortaR(A.g, p?.gRango) ?? A.g) * 10, kmFijo: kmT }
    }
    case 'expuesto': {
      if (geo.viento < 2) return NADA
      const A = ARCH.motivo.expuesto
      const tope: Rango = [0, (km * (sl.ventana[1] - sl.ventana[0])) / Math.max(1, n)]
      const kmX = medio(cortaR(A.km, p?.kmRango, tope) ?? [A.km[0], A.km[0]])
      return { ...NADA, dFijo: rellenoDeZona(Math.min(A.amp, geo.amplitud)) * kmX, kmFijo: kmX }
    }
    case 'circuito': {
      // Los hijos de un circuito no se escalan nunca (§8.5): suben lo mismo en cada vuelta.
      const C = ARCH.motivo.circuito
      const vueltas = medio(cortaR(C.vueltas, p?.vueltasRango) ?? C.vueltas)
      const kmVuelta = medio(cortaR(C.kmVuelta, p?.kmRango) ?? C.kmVuelta)
      let d = 0
      for (const h of sl.hijos ?? []) {
        const a = aporteDeSubida(h.motif, h.params, sk, geo, false)
        d += (medio(h.n) * (a.dLo + a.dHi)) / 2
      }
      return { ...NADA, dFijo: vueltas * d, kmFijo: vueltas * kmVuelta }
    }
    default:
      return NADA
  }
}

/**
 * El intervalo de desnivel TOTAL (relleno incluido, el de `dPlusDe`) que la instancia puede dar en
 * esta zona y a estos km (§8.4 punto 4): la firma y la meta tal cual, cada hueco no firma con su
 * cardinalidad del plan y sus longitudes llevadas al suelo y al techo de `escalaDificultades` (la
 * persecución de §8.5 no puede ir más allá), y el relleno de la zona sobre los km que quedan de
 * enlace. Es una estimación en media, sin dados: la instancia concreta cae alrededor. `planDeEdicion`
 * sortea el objetivo dentro de su cruce con `sk.dPlus`.
 */
export function desnivelFactible(
  sk: Skeleton,
  firma: readonly Motif[],
  plan: Pick<EditionPlan, 'km' | 'n' | 'vueltas'>,
  geo: GeoSignature,
): R2 {
  const fijas: Instancia[] = firma.map((m) => ({
    slot: m.kind === 'meta' ? 'meta' : 0,
    j: 0,
    motif:
      m.kind === 'circuito' && plan.vueltas !== undefined ? { ...m, vueltas: plan.vueltas } : m,
  }))
  // Las cuentas de la firma sobre una etapa sin huecos: su relleno dice qué km deja libres.
  const f = medidas(sk, plan.km, geo, fijas)
  const relleno = rellenoDeZona(geo.amplitud)
  const metaKm = firma.find((m) => m.kind === 'meta')?.km ?? 0
  let a = NADA
  sk.slots.forEach((sl, k) => {
    if (sl.firma) return
    const n = cabenEnHueco(sk, sl, plan.n[k] ?? 0, plan.km, metaKm, geo)
    if (n > 0) a = sumaAporte(a, aporteDeHueco(sk, sl, geo, plan.km, n, metaKm), n)
  })
  const base = f.dFirma + f.dMeta + f.dNoFirma + f.dFijo + a.dFijo
  const lo = base + a.dLo + relleno * Math.max(0, f.kmLibre - a.kmFijo - a.kmLo)
  const hi = base + a.dHi + relleno * Math.max(0, f.kmLibre - a.kmFijo - a.kmHi)
  return [Math.min(lo, hi), Math.max(lo, hi)]
}
