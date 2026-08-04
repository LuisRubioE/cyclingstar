/**
 * Generador de perfiles de etapa realistas y deterministas (Paso 34+). Los constructores antiguos
 * daban un perfil tosco (relleno llano + uno o dos puertos de pendiente constante), que se dibujaba
 * como dos o tres triángulos. Aquí generamos terreno DETALLADO: el llano nunca es una línea recta
 * sino que ondula suavemente, y cada puerto se parte en varias rampas de pendiente variable (más
 * suave abajo, más dura arriba), con sus bajadas — como un perfil de etapa de verdad. Todo es puro y
 * determinista (semilla por etapa), así que la misma etapa dibuja siempre el mismo perfil, y el motor
 * corre exactamente lo que se ve (los tramos alimentan la física, SPEC 6.2/6.4).
 */
import type { Ramp, Segment } from '../stage/types.js'

/** Hash entero estable (FNV-1a) de una cadena, para sembrar de forma determinista. */
function hashInt(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** PRNG determinista (mulberry32). */
function rng(seed: string): () => number {
  let a = hashInt(seed) >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Número real en [min, max). */
function between(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min)
}

/** Reparte `total` km en `n` trozos positivos con algo de variación (suman exactamente `total`). */
function split(rand: () => number, total: number, n: number): number[] {
  if (n <= 1) return [total]
  const weights = Array.from({ length: n }, () => between(rand, 0.7, 1.3))
  const sum = weights.reduce((a, b) => a + b, 0)
  const parts = weights.map((w) => (w / sum) * total)
  // Redondea a 1 decimal y ajusta el último para cuadrar la suma exacta.
  const rounded = parts.map((p) => Math.max(0.5, Math.round(p * 10) / 10))
  const diff = Math.round((total - rounded.reduce((a, b) => a + b, 0)) * 10) / 10
  rounded[rounded.length - 1] = Math.max(
    0.5,
    Math.round((rounded[rounded.length - 1]! + diff) * 10) / 10,
  )
  return rounded
}

/**
 * Un puerto de `len` km a una pendiente media `avg`%: se parte en varias rampas de pendiente variable
 * alrededor de la media (nunca por debajo de 1%), más duras hacia la cima. Devuelve el segmento tipo
 * 'puerto' con sus tramos (de ahí sale la categoría de la cima y la física del motor).
 */
function climb(rand: () => number, len: number, avg: number): Segment {
  const n = Math.max(2, Math.round(len / 2.2))
  const lens = split(rand, len, n)
  const tramos: Ramp[] = lens.map((km, i) => {
    // Rampa más dura hacia el final del puerto (progresión típica) + ruido.
    const prog = (i / Math.max(1, n - 1) - 0.5) * 2 // -1..+1
    const g = Math.max(1, avg + prog * 1.6 + between(rand, -1.2, 1.2))
    return { km, g: Math.round(g * 10) / 10 }
  })
  return { km: Math.round(len * 10) / 10, tipo: 'puerto', tramos }
}

/** Una bajada de `len` km a una pendiente media `avg`% (negativa), en varias rampas. */
function descent(rand: () => number, len: number, avg: number): Segment {
  const n = Math.max(2, Math.round(len / 3))
  const lens = split(rand, len, n)
  const tramos: Ramp[] = lens.map((km) => ({
    km,
    g: -Math.round(Math.max(2, avg + between(rand, -1.5, 1.5)) * 10) / 10,
  }))
  return { km: Math.round(len * 10) / 10, tipo: 'descenso', tramos }
}

/**
 * Terreno ondulado suave a lo largo de `km`: una sucesión de tramos llanos con pendientes pequeñas
 * (±1..3%) que sube y baja, para que el perfil nunca sea una línea recta. Reparte en segmentos de
 * ~3-6 km. `bumpy` (media montaña) sube un poco la amplitud.
 */
function rolling(rand: () => number, km: number, bumpy = false): Segment[] {
  if (km <= 0.5) return []
  const chunk = between(rand, 3, 6)
  const n = Math.max(1, Math.round(km / chunk))
  const lens = split(rand, km, n)
  const amp = bumpy ? 3.2 : 1.8
  return lens.map((segKm, i): Segment => {
    const half = Math.round((segKm / 2) * 10) / 10
    const rest = Math.round((segKm - half) * 10) / 10
    const g = between(rand, 0.8, amp) * (i % 2 === 0 ? 1 : -1)
    const gg = Math.round(g * 10) / 10
    const tramos: Ramp[] =
      rest > 0.1
        ? [
            { km: half, g: gg },
            { km: rest, g: -Math.round(gg * between(rand, 0.6, 1) * 10) / 10 },
          ]
        : [{ km: segKm, g: gg }]
    // Algún repecho marcado como rompepiernas en media montaña, para dureza y variedad.
    const tipo: Segment['tipo'] = bumpy && rand() < 0.35 ? 'rompepiernas' : 'llano'
    return { km: Math.round(segKm * 10) / 10, tipo, tramos }
  })
}

/** Ajusta el último segmento para que la suma de km sea EXACTAMENTE `target` (etiqueta de km fiel). */
function normalize(segments: Segment[], target: number): Segment[] {
  const sum = segments.reduce((a, s) => a + s.km, 0)
  const diff = Math.round((target - sum) * 10) / 10
  if (Math.abs(diff) >= 0.1 && segments.length > 0) {
    const last = segments[segments.length - 1]!
    last.km = Math.max(0.5, Math.round((last.km + diff) * 10) / 10)
  }
  return segments
}

/** Etapa llana: ondula suavemente con algún repecho, final para esprínter. */
export function flatSegments(km: number, seed: string): Segment[] {
  const rand = rng(seed)
  const segs = rolling(rand, km, false)
  return normalize(segs, km)
}

/** Media montaña: base ondulada con 2-3 cotas (cat 3/2) y sus bajadas, final quebrado. */
export function hillySegments(km: number, seed: string): Segment[] {
  const rand = rng(seed)
  const nClimbs = km > 170 ? 3 : 2
  const climbs = Array.from({ length: nClimbs }, () => ({
    len: between(rand, 3, 7),
    g: between(rand, 4.5, 6.5),
  }))
  const used = climbs.reduce((a, c) => a + c.len, 0) + climbs.length * 4 // + bajadas ~4km
  const fill = Math.max(km * 0.35, km - used)
  const gaps = split(rand, fill, nClimbs + 1)
  const segs: Segment[] = []
  segs.push(...rolling(rand, gaps[0]!, true))
  climbs.forEach((c, i) => {
    segs.push(climb(rand, c.len, c.g))
    if (i < nClimbs - 1) segs.push(descent(rand, between(rand, 3, 5), 5))
    segs.push(...rolling(rand, gaps[i + 1]!, true))
  })
  return normalize(segs, km)
}

/** Etapa reina: aproximación ondulada, 2-3 puertos con bajadas y meta en alto (último puerto). */
export function mountainSegments(km: number, seed: string): Segment[] {
  const rand = rng(seed)
  const midClimbs = km > 165 ? 3 : 2
  const mids = Array.from({ length: midClimbs }, () => ({
    len: between(rand, 6, 11),
    g: between(rand, 5.5, 7.5),
  }))
  const finalLen = between(rand, 9, 15)
  const finalG = between(rand, 7.5, 9.5)
  const used = mids.reduce((a, c) => a + c.len, 0) + midClimbs * 6 + finalLen
  const fill = Math.max(km * 0.2, km - used)
  const gaps = split(rand, fill, midClimbs + 1)
  const segs: Segment[] = []
  segs.push(...rolling(rand, gaps[0]!, true))
  mids.forEach((c, i) => {
    segs.push(climb(rand, c.len, c.g))
    segs.push(descent(rand, between(rand, 5, 8), 6))
    segs.push(...rolling(rand, gaps[i + 1]!, true))
  })
  // Meta en alto: el último segmento es el puerto final (sin bajada después).
  segs.push(climb(rand, finalLen, finalG))
  return normalize(segs, km)
}

/** Clásica dura: ondulada con una sucesión de muros cortos y explosivos, final quebrado. */
export function classicSegments(km: number, seed: string): Segment[] {
  const rand = rng(seed)
  const nWalls = km > 200 ? 5 : 4
  const walls = Array.from({ length: nWalls }, () => ({
    len: between(rand, 1, 2.5),
    g: between(rand, 8, 12),
  }))
  const used = walls.reduce((a, w) => a + w.len, 0)
  const fill = Math.max(km * 0.5, km - used)
  const gaps = split(rand, fill, nWalls + 1)
  const segs: Segment[] = []
  segs.push(...rolling(rand, gaps[0]!, true))
  walls.forEach((w, i) => {
    segs.push(climb(rand, w.len, w.g))
    segs.push(...rolling(rand, gaps[i + 1]!, true))
  })
  return normalize(segs, km)
}

/** Etapa de pavé: llano ondulado con sectores de adoquines (dureza por estrellas). */
export function cobblesSegments(km: number, seed: string): Segment[] {
  const rand = rng(seed)
  const sectors = [3, 5, 4] // estrellas de dureza, hacia el final
  const sectorKm = sectors.map(() => between(rand, 2, 4))
  const used = sectorKm.reduce((a, b) => a + b, 0)
  const fill = Math.max(km * 0.5, km - used)
  const gaps = split(rand, fill, sectors.length + 1)
  const segs: Segment[] = []
  segs.push(...rolling(rand, gaps[0]!, false))
  sectors.forEach((estrellas, i) => {
    segs.push({ km: Math.round(sectorKm[i]! * 10) / 10, tipo: 'paves', estrellas })
    segs.push(...rolling(rand, gaps[i + 1]!, false))
  })
  return normalize(segs, km)
}

/** Contrarreloj: casi llana con leve ondulación (sin puertos categorizados). */
export function ittSegments(km: number, seed: string): Segment[] {
  const rand = rng(seed)
  const segs = rolling(rand, km, false)
  return normalize(segs, km)
}
