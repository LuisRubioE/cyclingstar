/**
 * RNG determinista y sembrado (SPEC 3.6, 6.1). Puro: sin Date.now ni Math.random.
 * mulberry32 con semilla derivada de una cadena; reutilizable por el servicio de nombres
 * y, más adelante, por el motor con sus subflujos nominales.
 */

/** Hash de una cadena a un entero de 32 bits sin signo (variante cyrb53 reducida). */
export function hashSeed(seed: string): number {
  let h1 = 0xdeadbeef ^ seed.length
  let h2 = 0x41c6ce57 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h1 ^ h2) >>> 0
}

/** Generador mulberry32: dado un entero semilla, devuelve una función que produce [0, 1). */
export function mulberry32(seedInt: number): () => number {
  let a = seedInt >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Atajo: RNG sembrado a partir de una cadena. */
export function seededRng(seed: string): () => number {
  return mulberry32(hashSeed(seed))
}
