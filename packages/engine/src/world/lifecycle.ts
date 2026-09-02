/**
 * Ciclo vital de los corredores entre temporadas (SPEC 2, 10, Paso 37). Reglas puras de retiro y
 * de generación de neoprofesionales, para que el rollover sea determinista y testeable en CI.
 */

/**
 * LA EDAD DEL RETIRO OBLIGATORIO. A los 39 se baja todo el mundo, haya declinado o no, y desde la
 * v47 eso incluye al corredor de un JUGADOR HUMANO: hasta entonces el rollover filtraba por
 * `isNull(riders.userId)` y un humano corría eternamente. Se exporta porque `packages/db` la
 * necesita para aplicarla al jugador, que no pasa por la curva de declive de los NPC.
 */
export const HARD_RETIRE_AGE = 39
const NEOPRO_AGE_MIN = 19
const NEOPRO_AGE_MAX = 23

/**
 * ¿Se retira el corredor al cerrar la temporada? Seguro a los 39; entre el declive y esa edad, con
 * probabilidad creciente. Antes del declive, no. Determinista desde `rng`.
 */
export function shouldRetire(age: number, declineAge: number, rng: () => number): boolean {
  if (age >= HARD_RETIRE_AGE) return true
  if (age < declineAge) return false
  // Rampa lineal de 0 en declineAge a ~1 al acercarse a la edad dura.
  const span = Math.max(1, HARD_RETIRE_AGE - declineAge)
  const p = (age - declineAge) / span
  return rng() < p
}

/** Edad de un neoprofesional (SPEC 10): joven, en [19,23]. */
export function neoproAge(rng: () => number): number {
  return NEOPRO_AGE_MIN + Math.floor(rng() * (NEOPRO_AGE_MAX - NEOPRO_AGE_MIN + 1))
}
