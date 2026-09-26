/**
 * Generador de perfiles de etapa realistas y deterministas (Paso 34+). Los constructores antiguos
 * daban un perfil tosco (relleno llano + uno o dos puertos de pendiente constante), que se dibujaba
 * como dos o tres triángulos. Aquí generamos terreno DETALLADO: el llano nunca es una línea recta
 * sino que ondula suavemente, y cada puerto se parte en varias rampas de pendiente variable (más
 * suave abajo, más dura arriba), con sus bajadas — como un perfil de etapa de verdad. Todo es puro y
 * determinista (semilla por etapa), así que la misma etapa dibuja siempre el mismo perfil, y el motor
 * corre exactamente lo que se ve (los tramos alimentan la física, SPEC 6.2/6.4).
 *
 * Desde la v87 este fichero son solo las PRIMITIVAS (el hash, el azar sembrado, `split`, `climb`,
 * `descent`, `rolling` y la huella) con que la gramática (`routes/grammar/`) dibuja cada motivo. Los
 * ocho generadores por terreno (`flatSegments` a `ittSegments`), `normalize` y `garantizaPuerto` se
 * fueron a `sim/legacy/profileGenLegacy.ts`, que vive hasta el paso 9 (docs/generador.md §15.10).
 */
import type { Ramp, Segment, StageProfile } from '../stage/types.js'

/** Hash entero estable (FNV-1a) de una cadena, para sembrar de forma determinista. */
export function hashInt(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Huella de perfil que sella lo real y lo congelado (docs/generador.md §3.12 y §11.3): FNV-1a de
 * `JSON.stringify(profile.segments)`, con las claves en el orden en que se escribieron, sin
 * reordenar (así detecta hasta un cambio de orden de claves). Las pancartas no entran.
 */
export function huellaFNV(profile: StageProfile): number {
  return hashInt(JSON.stringify(profile.segments))
}

/**
 * PRNG determinista (mulberry32). Se exporta porque la COMPOSICIÓN de una vuelta por etapas
 * (`routes/calendar.ts::stageMix`) necesita el mismo azar sembrado que los perfiles: qué etapas
 * tiene una carrera es tan de autoría como el dibujo de cada una, y las dos cosas deben salir
 * siempre iguales para la misma carrera.
 */
export function routeRng(seed: string): () => number {
  return rng(seed)
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
export function between(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min)
}

/** Reparte `total` km en `n` trozos positivos con algo de variación (suman exactamente `total`). */
export function split(rand: () => number, total: number, n: number): number[] {
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
 *
 * `opts` acota cada rampa a `[gMin, gMax]` (docs/generador.md §8.7): primero el suelo 1 de siempre,
 * después el recorte y por último el redondeo a 0,1. El recorte no consume tiradas, y sin `opts`
 * (`−Infinity`/`Infinity`) devuelve el valor exacto de antes: los generadores viejos no cambian.
 */
export function climb(
  rand: () => number,
  len: number,
  avg: number,
  opts: { gMin?: number; gMax?: number } = {},
): Segment {
  const n = Math.max(2, Math.round(len / 2.2))
  const lens = split(rand, len, n)
  const gMin = opts.gMin ?? -Infinity
  const gMax = opts.gMax ?? Infinity
  const tramos: Ramp[] = lens.map((km, i) => {
    // Rampa más dura hacia el final del puerto (progresión típica) + ruido.
    const prog = (i / Math.max(1, n - 1) - 0.5) * 2 // -1..+1
    const g = Math.max(1, avg + prog * 1.6 + between(rand, -1.2, 1.2))
    const recortada = Math.min(gMax, Math.max(gMin, g)) // tras el suelo 1, antes del redondeo
    return { km, g: Math.round(recortada * 10) / 10 }
  })
  return { km: Math.round(len * 10) / 10, tipo: 'puerto', tramos }
}

/** Una bajada de `len` km a una pendiente media `avg`% (negativa), en varias rampas. */
export function descent(rand: () => number, len: number, avg: number): Segment {
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
 * que sube y baja, para que el perfil nunca sea una línea recta. Reparte en segmentos de ~3-6 km.
 * `amp` es la amplitud máxima en % (los generadores viejos pasan 1,8, o 3,2 en media montaña) y
 * `pRompepiernas` la probabilidad de marcar un trozo como `rompepiernas` (0,35 en media montaña). Con
 * `pRompepiernas` 0 no se consume la tirada del tipo, igual que el `bumpy` false de antes
 * (docs/generador.md §8.7): los generadores viejos dibujan exactamente lo mismo.
 */
export function rolling(rand: () => number, km: number, amp: number, pRompepiernas = 0): Segment[] {
  if (km <= 0.5) return []
  const chunk = between(rand, 3, 6)
  const n = Math.max(1, Math.round(km / chunk))
  const lens = split(rand, km, n)
  // Con amp ≥ 1,78 vale 0,8, como siempre; con una amplitud de pólder (0,4) el rango no se invierte.
  const gMin = Math.min(0.8, 0.45 * amp)
  return lens.map((segKm, i): Segment => {
    const half = Math.round((segKm / 2) * 10) / 10
    const rest = Math.round((segKm - half) * 10) / 10
    const g = between(rand, gMin, amp) * (i % 2 === 0 ? 1 : -1)
    const gg = Math.round(g * 10) / 10
    const tramos: Ramp[] =
      rest > 0.1
        ? [
            { km: half, g: gg },
            { km: rest, g: -Math.round(gg * between(rand, 0.6, 1) * 10) / 10 },
          ]
        : [{ km: segKm, g: gg }]
    // Algún repecho marcado como rompepiernas en media montaña, para dureza y variedad.
    const tipo: Segment['tipo'] =
      pRompepiernas > 0 && rand() < pRompepiernas ? 'rompepiernas' : 'llano'
    return { km: Math.round(segKm * 10) / 10, tipo, tramos }
  })
}
