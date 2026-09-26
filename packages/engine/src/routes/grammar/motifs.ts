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
import type { GeoSignature } from './geo.js'

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
  nombre?: string // texto para la ficha ("Muro de 1,2 km al 11 %")
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
