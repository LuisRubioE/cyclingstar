/**
 * Espacio de claves de los advisory locks de Postgres.
 *
 * Antes cada sitio inventaba su propia clave de UN argumento (migración 4785219, tick 4785220) y
 * el candado por carrera usaba `hashInt(raceKey)` en el rango 0..2^32, que puede colisionar con
 * cualquiera de las anteriores. Ahora todos usan la variante de DOS argumentos
 * `pg_advisory_lock(clase, clave)`: la CLASE separa los espacios de nombres, así que una carrera
 * cuyo hash valga 4785220 ya no bloquea al tick.
 *
 * Ambos argumentos son int4 (−2^31..2^31−1): las claves derivadas de un hash se pasan por
 * `toInt32` para que quepan.
 */

/** Clases de candado (espacios de nombres disjuntos). No reutilizar números retirados. */
export const LOCK_CLASS = {
  /** Migraciones al arrancar un servicio (uno migra, el resto espera). */
  migration: 1,
  /** El tick del mundo: solo un avance de días a la vez. */
  tick: 2,
  /** Congelado de la escuadra de UNA carrera (clave = hash de `${raceId}:s${season}`). */
  raceRoster: 3,
  /** Recálculo absoluto de los puntos de temporada de un mundo. */
  seasonPoints: 4,
} as const

export type LockClass = (typeof LOCK_CLASS)[keyof typeof LOCK_CLASS]

/** Hash entero estable de una cadena (FNV-1a de 32 bits, sin signo). */
export function hashInt(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Encaja un entero en el rango de int4 que exige `pg_advisory_lock` (complemento a dos). */
export function toInt32(n: number): number {
  return n | 0
}

/** Clave de candado de una carrera concreta (`${raceId}:s${season}`), en rango int4. */
export function raceLockKey(raceKey: string): number {
  return toInt32(hashInt(raceKey))
}
