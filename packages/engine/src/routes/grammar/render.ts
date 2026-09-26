/**
 * RENDIDO DE UN ESQUELETO COLOCADO (docs/generador.md §3.9 y §8.7 a §8.10).
 *
 * Paso 4. Cuatro funciones puras que van en este orden detrás de `colocar`: `renderSkeleton` dibuja
 * los huecos entre colocados como `enlace` (con la corriente `dib`) y cada motivo con `renderMotif`;
 * `normalizeEnlaces` cuadra `Σ km` tocando SOLO enlaces; `garantizaClase` es la red de seguridad de
 * la clasificación (reglas 1 a 5 de §8.9); `emitirPancartas` pone las `cima`. Ninguna llama al motor
 * (`sampleProfile`, `finishType`): leen `climbSize` y `climbMetres` de `stageKind.ts`, como `verify`.
 *
 * QUÉ SEGMENTO ES QUÉ. Las firmas de §3.9 pasan `Segment[]` y `Placed[]`, y sobre un perfil un
 * enlace, una `tendida`, el llano de un valle y la aproximación de un `muro_meta` son todos `llano`.
 * Para que `normalizeEnlaces` y `garantizaClase` toquen solo enlaces, y `emitirPancartas` sepa qué
 * `puerto` es el último paso de un circuito, `renderSkeleton` anota el ORIGEN de cada segmento que
 * crea en un `WeakMap` privado del módulo (enlace, o el `Placed` y la vuelta de que sale), y las otras
 * tres lo leen y lo heredan en los segmentos que reescriben. La anotación no cambia ningún valor del
 * perfil (es identidad de objeto, no un campo del `Segment`) y no rompe la pureza: misma entrada,
 * misma salida. Con segmentos que no vengan de `renderSkeleton`, `emitirPancartas` cae a la posición
 * de los `Placed` («recorre colocados en paralelo a segs», §8.10) y las otras dos no ven enlaces.
 *
 * Paso 5: la regla 4 persigue también el `aMeta` del esqueleto (estrechado medio km por lado, porque
 * la pancarta se lee al km entero) y puede quitar segmentos enteros del enlace final; si el valle no
 * se puede mover y ya está en la ventana sin estrechar, se queda como está (la canónica del Poggio).
 */
import { ARCH } from '../../constants.js'
import type { Banner, Segment } from '../../stage/types.js'
import { FINAL_KIND_CUTS, type FinalKind } from '../finalKind.js'
import { descent, rolling } from '../profileGen.js'
import {
  climbMetres,
  climbSize,
  PASS_MIN_KM,
  QUEEN_MIN_CLIMB_METRES,
  WALL_MAX_KM,
} from '../stageKind.js'
import type { GeoSignature } from './geo.js'
import { renderMotif, type RngFactory } from './motifs.js'
import type { Placed } from './place.js'
import type { Skeleton } from './skeletons.js'

/** De dónde sale un segmento rendido: un enlace (hueco entre colocados, o un `enlace`/`expuesto` colocado), o un `Placed` y, en un circuito, su vuelta. */
interface Origen {
  enlace: boolean
  p: Placed | null
  vuelta: number | null
}
const ORIGEN = new WeakMap<Segment, Origen>()

const r1 = (x: number): number => Math.round(x * 10) / 10
const suma = (segs: readonly Segment[]): number => segs.reduce((a, s) => a + s.km, 0)
const EPS = 1e-9

/**
 * El suelo de un segmento de enlace: `rolling` no dibuja nada con `km <= 0,5` (profileGen.ts), así que
 * un enlace que quedara por debajo al cuadrar no existiría (V10(b) mide lo mismo sobre el perfil).
 */
const ENLACE_MIN_KM = 0.5
/**
 * El margen de desnivel sobre `QUEEN_MIN_CLIMB_METRES` con el que la regla 1 de `garantizaClase` da una
 * reina por buena sin puerto largo: `+ 100` (§8.9 regla 1), la mitad del margen de `reina.verdad`.
 */
const MARGEN_METROS_REINA = 100
/** La resolución de la gramática: km y pendientes van al 0,1, y el borde de la regla 3 es `WALL_MAX_KM − 0,1`. */
const DECIMA = 0.1

function anota(segs: Segment[], o: Origen): Segment[] {
  for (const s of segs) ORIGEN.set(s, o)
  return segs
}
const origen = (s: Segment): Origen | undefined => ORIGEN.get(s)
const esEnlace = (s: Segment): boolean => origen(s)?.enlace === true

/** Reescribe un segmento a `km`, escalando sus tramos y cuadrando el último (guarda `Σ tramos === km`). Hereda el origen. */
function reescala(s: Segment, km: number): Segment {
  const nuevo: Segment = { ...s, km: r1(km) }
  if (s.tramos && s.tramos.length > 0) {
    const total = s.tramos.reduce((a, t) => a + t.km, 0)
    const k = total > 0 ? nuevo.km / total : 1
    nuevo.tramos = s.tramos.map((t) => ({ ...t, km: r1(t.km * k) }))
    cuadraTramos(nuevo)
  }
  const o = origen(s)
  if (o) ORIGEN.set(nuevo, o)
  return nuevo
}

/** Guarda `Σ tramos === segment.km` al 0,1: el último tramo absorbe la diferencia (el mecanismo de `normalize`). Muta `s`. */
function cuadraTramos(s: Segment): boolean {
  const t = s.tramos
  if (!t || t.length === 0) return false
  const diff = r1(s.km - t.reduce((a, x) => a + x.km, 0))
  if (diff === 0) return false
  const ultimo = t[t.length - 1]!
  if (r1(ultimo.km + diff) > 0) {
    t[t.length - 1] = { ...ultimo, km: r1(ultimo.km + diff) }
    return true
  }
  const total = t.reduce((a, x) => a + x.km, 0)
  s.tramos = t.map((x) => ({ ...x, km: r1((x.km * s.km) / total) }))
  const d2 = r1(s.km - s.tramos.reduce((a, x) => a + x.km, 0))
  const u = s.tramos[s.tramos.length - 1]!
  s.tramos[s.tramos.length - 1] = { ...u, km: r1(u.km + d2) }
  return true
}

/**
 * Paso 6 (§8.7): dibuja la etapa. Recorre los `Placed` en orden de `inicioKm`: el hueco desde el
 * cursor, si mide más de 0,5 km, es un `enlace` (`rolling` con la amplitud de la zona, o la de
 * `desde` en el primer 40 % de una etapa de transición, con `pRompepiernas` 0, corriente `e${k}`); si
 * mide 0,5 o menos no se rinde y lo repone `normalizeEnlaces`. Después el motivo con `renderMotif`
 * (corriente `${slot}` y `${slot}|${sub}`) y su bajada con `descent` (corriente `${slot}`). La cola
 * hasta `km`, igual que un hueco.
 */
export function renderSkeleton(
  colocados: Placed[],
  km: number,
  geo: GeoSignature,
  rng: RngFactory,
  desde?: GeoSignature,
): Segment[] {
  const ampMax = ARCH.motivo.enlace.ampMax
  const finTransicion = ARCH.itinerario.transicion * km
  const segs: Segment[] = []
  let cursor = 0
  let k = 0
  const enlaceHasta = (hasta: number): void => {
    const hueco = r1(hasta - cursor)
    if (hueco <= ENLACE_MIN_KM) return
    const amp = Math.min(desde && cursor < finTransicion ? desde.amplitud : geo.amplitud, ampMax)
    segs.push(
      ...anota(rolling(rng(`e${k}`), hueco, amp, 0), { enlace: true, p: null, vuelta: null }),
    )
    k += 1
  }
  const orden = [...colocados].sort((a, b) => a.inicioKm - b.inicioKm)
  for (const p of orden) {
    enlaceHasta(p.inicioKm)
    const fab: RngFactory = (sub) => rng(sub === '' ? `${p.slot}` : `${p.slot}|${sub}`)
    const dibujo = renderMotif(p.motif, fab, geo)
    const esEnlaceColocado = p.motif.kind === 'enlace' || p.motif.kind === 'expuesto'
    const porVuelta = p.motif.kind === 'circuito' ? dibujo.length / (p.motif.vueltas ?? 1) : 0
    dibujo.forEach((s, i) =>
      ORIGEN.set(s, {
        enlace: esEnlaceColocado,
        p,
        vuelta: porVuelta > 0 ? Math.floor(i / porVuelta) : null,
      }),
    )
    segs.push(...dibujo)
    if (p.bajada) {
      const b = descent(rng(`${p.slot}`), p.bajada.km, Math.abs(p.bajada.g ?? 0))
      ORIGEN.set(b, { enlace: false, p, vuelta: null })
      segs.push(b)
    }
    cursor = p.finKm + (p.bajada?.km ?? 0)
  }
  enlaceHasta(km)
  return segs
}

/**
 * §8.8: cuadra `Σ km` a `km` tocando solo los enlaces (los huecos de `renderSkeleton` y los `enlace` o
 * `expuesto` colocados; nunca `tendida`, dificultades, bajadas, sectores, meta ni lo que está dentro
 * de un compuesto). El `delta` se reparte proporcionalmente a su km, con los tramos reescalados, y el
 * residuo del redondeo va al enlace más largo. `null` si algún enlace quedaría por debajo de 0,5 km o
 * si no hay enlaces y `delta ≠ 0` (V10: el bucle reintenta). Salida: `Σ km === km` al 0,1.
 */
export function normalizeEnlaces(
  segs: Segment[],
  km: number,
  colocados: Placed[],
): Segment[] | null {
  void colocados // la firma de §3.9 los pasa; el origen de cada segmento ya lo dice (cabecera)
  const delta = r1(km - suma(segs))
  if (Math.abs(delta) < EPS) return [...segs]
  const idx = segs.flatMap((s, i) => (esEnlace(s) ? [i] : []))
  if (idx.length === 0) return null
  const total = idx.reduce((a, i) => a + segs[i]!.km, 0)
  const nuevos = new Map<number, number>()
  for (const i of idx) nuevos.set(i, r1(segs[i]!.km + (delta * segs[i]!.km) / total))
  const repartido = r1([...nuevos.entries()].reduce((a, [i, v]) => a + v - segs[i]!.km, 0))
  const residuo = r1(delta - repartido)
  if (residuo !== 0) {
    const largo = idx.reduce((a, i) => (segs[i]!.km > segs[a]!.km ? i : a), idx[0]!)
    nuevos.set(largo, r1(nuevos.get(largo)! + residuo))
  }
  for (const v of nuevos.values()) if (v < ENLACE_MIN_KM - EPS) return null
  return segs.map((s, i) => (nuevos.has(i) ? reescala(s, nuevos.get(i)!) : s))
}

/** El valle de cada `FinalKind` con la holgura `margenValleKm` sobre los cortes de `FINAL_KIND_CUTS` (§8.9 regla 4). */
function ventanaDeValle(fk: FinalKind): [number, number] | null {
  const m = ARCH.veto.margenValleKm
  const C = FINAL_KIND_CUTS
  switch (fk) {
    case 'alto':
      return null // el valle es 0 por construcción: la cota es el último segmento
    case 'cima_cerca':
      return [C.alto + m, C.cimaCerca - m]
    case 'valle_corto':
      return [C.cimaCerca + m, C.valleCorto - m]
    case 'valle_largo':
      return [C.valleCorto + m, Infinity]
  }
}

/** La distancia leída en una pancarta se mueve hasta medio km: `emitirPancartas` la escribe al km entero. */
const REDONDEO_PANCARTA_KM = 0.5

/** Las ventanas del valle de la regla 4: la del `finalKind` declarado ∩ el `aMeta` (la holgada) y la
 * misma con el `aMeta` estrechado medio km por lado (la estricta, la que se persigue); `null` si no hay
 * ninguna o si la etapa muere arriba. */
function ventanasDeLaEtapa(
  sk: Skeleton,
): { estricta: [number, number]; holgada: [number, number] } | null {
  if (sk.finalKind === 'alto') return null
  const fk = sk.finalKind ? ventanaDeValle(sk.finalKind) : null
  const a = sk.metaParams?.aMeta
  if (!a) return fk ? { estricta: fk, holgada: fk } : null
  const corta = (lo: number, hi: number): [number, number] => {
    if (!fk) return [lo, hi]
    const r: [number, number] = [Math.max(fk[0], lo), Math.min(fk[1], hi)]
    return r[0] <= r[1] ? r : fk
  }
  return {
    estricta: corta(r1(a[0] + REDONDEO_PANCARTA_KM), r1(a[1] - REDONDEO_PANCARTA_KM)),
    holgada: corta(a[0], a[1]),
  }
}

/**
 * La regla 4 sobre `out`: el enlace final (los segmentos de enlace tras el último puerto, del último
 * hacia atrás) se alarga o se recorta, sin bajar ninguno de 0,5 km, hasta que el valle cae en
 * `ventana`; lo que cambia lo paga el enlace más largo ANTERIOR al último puerto, y Σ km no se mueve.
 * Devuelve `out` tal cual si el valle ya está dentro, y `null` si no se puede mover.
 */
function valleA(
  out: Segment[],
  ultimo: number,
  valle: number,
  ventana: [number, number],
): Segment[] | null {
  const objetivo = valle < ventana[0] ? ventana[0] : valle > ventana[1] ? ventana[1] : valle
  if (Math.abs(objetivo - valle) <= EPS) return out
  const finales = out.flatMap((s, j) => (j > ultimo && esEnlace(s) ? [j] : [])).reverse()
  if (finales.length === 0) return null
  const nuevos = new Map<number, number>()
  const quitados = new Set<number>()
  let resto = r1(objetivo - valle)
  for (const j of finales) {
    if (Math.abs(resto) < EPS) break
    const km = out[j]!.km
    if (resto > 0) {
      nuevos.set(j, r1(km + resto))
      resto = 0
      break
    }
    // Paso 5: un enlace largo son varios segmentos de `rolling`, y cada uno baja como mucho a 0,5;
    // si hay que quitar más, el segmento sale entero (su km lo paga el enlace de antes, como el
    // resto) y lo que se quita de más se le devuelve al siguiente final que quede.
    if (km + resto >= ENLACE_MIN_KM - EPS) {
      nuevos.set(j, r1(km + resto))
      resto = 0
      break
    }
    quitados.add(j)
    resto = r1(resto + km)
  }
  if (resto > EPS) {
    const queda = finales.find((j) => !quitados.has(j))
    if (queda === undefined) return null
    nuevos.set(queda, r1((nuevos.get(queda) ?? out[queda]!.km) + resto))
    resto = 0
  }
  if (Math.abs(resto) > EPS) return null
  const delta = r1(objetivo - valle)
  const anteriores = out.flatMap((s, j) => (j < ultimo && esEnlace(s) ? [j] : []))
  if (anteriores.length === 0) return null
  const largo = anteriores.reduce((a, j) => (out[j]!.km > out[a]!.km ? j : a), anteriores[0]!)
  const compensado = r1(out[largo]!.km - delta)
  if (compensado < ENLACE_MIN_KM - EPS) return null
  nuevos.set(largo, compensado)
  return out
    .map((s, j) => (nuevos.has(j) ? reescala(s, nuevos.get(j)!) : s))
    .filter((_, j) => !quitados.has(j))
}

/** El `km` mínimo de una subida que `garantizaClase` recorta: el del motivo del que sale en `ARCH.motivo`. */
function kmMinimoDe(o: Origen | undefined): number {
  const kind = o?.p?.motif.kind
  if (kind === 'cota') return ARCH.motivo.cota.km[0]
  if (kind === 'puerto') return ARCH.motivo.puerto.km[0]
  return ARCH.motivo.muro.km[0]
}

/**
 * §8.9, la red de seguridad: se aplica tras cuadrar y antes de las pancartas, y lee solo `climbSize` y
 * `climbMetres`. Reglas, con `margenClaseKm` 0,3, `margenClaseMetros` 300 y `margenValleKm` 0,7:
 * (1) una reina sin puerto ≥ 8,8 km ni 3.300 m alarga su puerto más largo a 8,8; (2) una media no
 * tiene puertos de más de 8,2 km, y (2b) una media, o una clásica que muere arriba, no llega a 2.900
 * m: se recortan las cotas no firma más largas; (3) en una clásica ninguna subida pasa de 2,9 km (2b
 * y 3 no se aplican con `paves`, que ya es clásica por sí solo); (4)
 * con `finalKind` declarado, el valle tras el último puerto queda dentro de su corte con 0,7 de
 * holgura, moviendo el enlace final; (5) guarda `Σ tramos === km` en todo segmento. Toda compensación
 * va al enlace más largo; si lo dejaría bajo 0,5 km, `null` (se reintenta). `reglas` cuenta las
 * reglas 1 a 4 que cambiaron algo (la 2b cuenta como la 2).
 */
export function garantizaClase(
  segs: Segment[],
  sk: Skeleton,
  colocados: Placed[],
): { segs: Segment[]; reglas: number } | null {
  void colocados // el origen de cada segmento ya dice de qué `Placed` sale (cabecera)
  let out = segs.map((s) => reescala(s, s.km)) // copia con la guarda de tramos (regla 5) antes de medir
  const tocadas = new Set<number>()
  const { margenClaseKm, margenClaseMetros } = ARCH.veto

  /** Pone el segmento `i` a `km` y compensa la diferencia en el enlace más largo. */
  const ajusta = (i: number, km: number): boolean => {
    const delta = r1(km - out[i]!.km)
    if (delta === 0) return true
    const enlaces = out.flatMap((s, j) => (esEnlace(s) && j !== i ? [j] : []))
    if (enlaces.length === 0) return false
    const largo = enlaces.reduce((a, j) => (out[j]!.km > out[a]!.km ? j : a), enlaces[0]!)
    const compensado = r1(out[largo]!.km - delta)
    if (compensado < ENLACE_MIN_KM - EPS) return false
    out = out.map((s, j) => (j === i ? reescala(s, km) : j === largo ? reescala(s, compensado) : s))
    return true
  }
  const puertos = (): number[] => out.flatMap((s, i) => (s.tipo === 'puerto' ? [i] : []))
  const metros = (): number => out.reduce((a, s) => a + climbMetres(s), 0)
  /** Lleva la subida del segmento `i` a `objetivo` km de `climbSize` escalando el segmento entero. */
  const subidaA = (i: number, objetivo: number): boolean => {
    const s = out[i]!
    const c = climbSize(s).km
    if (c <= 0) return true
    return ajusta(i, r1((s.km * objetivo) / c))
  }

  // Regla 1: la reina es reina.
  if (sk.kind === 'reina') {
    const ps = puertos()
    const largo = PASS_MIN_KM + margenClaseKm
    const hayLargo = ps.some((i) => climbSize(out[i]!).km >= largo - EPS)
    if (ps.length > 0 && !hayLargo && metros() < QUEEN_MIN_CLIMB_METRES + MARGEN_METROS_REINA) {
      const i = ps.reduce((a, j) => (climbSize(out[j]!).km > climbSize(out[a]!).km ? j : a), ps[0]!)
      if (!subidaA(i, largo)) return null
      tocadas.add(1)
    }
  }
  // Regla 2: ningún puerto de una media llega a la puerta de la reina.
  if (sk.kind === 'media') {
    const techo = PASS_MIN_KM - margenClaseKm
    for (const i of puertos())
      if (climbSize(out[i]!).km > techo + EPS) {
        if (!subidaA(i, techo)) return null
        tocadas.add(2)
      }
  }
  // Con `paves`, `stageKindOf` dice clásica antes de mirar ninguna subida (stageKind.ts): las reglas
  // 2b y 3 no tienen nada que proteger en una clásica de adoquín o de tierra (las cotas de 4 a 5 km de
  // `ud_sterrato` son parte de su forma, §5.2), y no se aplican.
  const conPaves = out.some((s) => s.tipo === 'paves')
  // Regla 2b: ni por desnivel (Σ climbMetres, relleno incluido: stageKind.ts).
  const muereArriba = out.at(-1)?.tipo === 'puerto'
  if (sk.kind === 'media' || (sk.kind === 'clasica' && muereArriba && !conPaves)) {
    const techo = QUEEN_MIN_CLIMB_METRES - margenClaseMetros
    const recortables = (): number[] =>
      puertos()
        .filter((i) => {
          const o = origen(out[i]!)
          const m = o?.p?.motif
          return (
            m !== undefined &&
            o?.p?.slot !== 'meta' &&
            !m.firma &&
            (m.kind === 'cota' || m.kind === 'puerto')
          )
        })
        .sort((a, b) => climbSize(out[b]!).km - climbSize(out[a]!).km)
    for (let vuelta = 0; metros() >= techo - EPS && vuelta < 50; vuelta++) {
      const candidatas = recortables().filter((i) => out[i]!.km > kmMinimoDe(origen(out[i]!)) + EPS)
      const i = candidatas[0]
      if (i === undefined) return null
      const s = out[i]!
      const exceso = metros() - techo + 1
      const f = Math.max(0, 1 - exceso / Math.max(EPS, climbMetres(s)))
      const km = Math.max(kmMinimoDe(origen(s)), Math.floor(s.km * f * 10) / 10)
      if (!ajusta(i, km)) return null
      tocadas.add(2)
    }
    if (metros() >= techo - EPS) return null
  }
  // Regla 3: en una clásica ninguna subida pasa de WALL_MAX_KM − 0,1.
  if (sk.kind === 'clasica' && !conPaves) {
    const techo = r1(WALL_MAX_KM - DECIMA)
    for (const i of puertos())
      if (climbSize(out[i]!).km > techo + EPS) {
        if (!subidaA(i, techo)) return null
        tocadas.add(3)
      }
  }
  // Regla 4: el valle declarado, con holgura sobre los cortes. Paso 5: y dentro del `aMeta` que el
  // esqueleto de un día declara para V5(c), estrechado medio km por lado porque la pancarta se lee al km
  // entero (un valle de 4,3 puede leerse 4,8); sin `finalKind`, solo el `aMeta` (`ud_muros`). Si el
  // valle no se puede mover (no hay enlace tras el último puerto, como en la canónica del Poggio) y ya
  // está en la ventana sin estrechar, se queda como está.
  const ventanas = ventanasDeLaEtapa(sk)
  const ps = puertos()
  if (ventanas && ps.length > 0) {
    const ultimo = ps[ps.length - 1]!
    const valle = r1(suma(out.slice(ultimo + 1)))
    const movido = valleA(out, ultimo, valle, ventanas.estricta)
    if (movido === null) {
      const [lo, hi] = ventanas.holgada
      if (valle < lo - EPS || valle > hi + EPS) return null
    } else if (movido !== out) {
      out = movido
      tocadas.add(4)
    }
  }
  // Regla 5: la guarda, otra vez, sobre lo que las reglas hayan reescrito.
  for (const s of out) cuadraTramos(s)
  return { segs: out, reglas: tocadas.size }
}

/**
 * §8.10: `cima` al final de todo `puerto` con `climbSize ≥ ARCH.pancarta.cimaMinKm` fuera de un
 * circuito; SIEMPRE en el último `puerto` de la etapa, mida lo que mida (el muro de meta de 0,5 km
 * tiene pancarta y `lastClimbKm` lo ve, decisión 25); dentro de un circuito, UNA por subida ≥ 1,5 km,
 * en su último paso. Al `Math.round` del km acumulado, como `auto()`, sin `cat` y sin `meta_volante`.
 */
export function emitirPancartas(segs: Segment[], colocados: Placed[]): Banner[] {
  const circuitos = colocados.filter((p) => p.motif.kind === 'circuito')
  const ultimoPuerto = segs.reduce((a, s, i) => (s.tipo === 'puerto' ? i : a), -1)
  const banners: Banner[] = []
  let cum = 0
  segs.forEach((s, i) => {
    const inicio = cum
    cum += s.km
    if (s.tipo !== 'puerto') return
    const larga = climbSize(s).km >= ARCH.pancarta.cimaMinKm - EPS
    let pone: boolean
    if (i === ultimoPuerto) pone = true
    else {
      const o = origen(s)
      if (o?.p) {
        pone =
          o.p.motif.kind === 'circuito' ? larga && o.vuelta === (o.p.motif.vueltas ?? 1) - 1 : larga
      } else {
        // Sin origen anotado: la posición de los `Placed` (§8.10).
        const c = circuitos.find((p) => inicio >= p.inicioKm - EPS && cum <= p.finKm + EPS)
        pone = c ? larga && inicio >= c.finKm - c.motif.km - EPS : larga
      }
    }
    if (pone) banners.push({ km: Math.round(cum), tipo: 'cima' })
  })
  return banners.sort((a, b) => a.km - b.km)
}
