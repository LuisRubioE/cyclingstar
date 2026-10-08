/**
 * LO QUE REVELA CADA SALIDA DE LA PUERTA (E2, docs/retransmision.md §10.3, §11.11 y §11.12; D-37, D-38;
 * paso 9a). Lógica pura, sin React: la puerta (`StageGateCard`) la pinta y la página llama a
 * `POST /api/me/reveal/:raceKey/:day`, que escribe `R` en la etapa y `A` en las anteriores que faltaran
 * (§10.3). Revelar no cuesta ni da nada (B20, D-38).
 */
import type { StageGate } from '@cyclingstar/shared'

/** Dónde sale la puerta: en `Watch` (la N+1 con la N sin ver) o en lo que enseña el resultado. */
export type GatePlace = 'watch' | 'result'

/** La etapa que pasa a `R` y las que arrastra con `A`. */
export interface RevealPlan {
  readonly stageDay: number
  readonly also: readonly number[]
}

const range = (from: number, to: number): number[] =>
  Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i)

/**
 * Qué revela `Show result` en cada puerta. En lo que enseña el resultado (`Report`, `Result`,
 * `Classifications`, `Race Radio` y `/report`), la etapa misma, con las anteriores que falten. En
 * `Watch`, la puerta `previous_unseen` de la N+1 revela la N (`Show result of stage 6 and continue`,
 * §11.12) y arrastra las de antes; la retransmisión de la N+1 empieza después.
 */
export function revealPlan(gate: StageGate, stageDay: number, place: GatePlace): RevealPlan {
  const first = gate.k === 'previous_unseen' ? gate.firstUnseen : null
  if (place === 'watch' && first !== null)
    return { stageDay: stageDay - 1, also: range(first, stageDay - 2) }
  return { stageDay, also: first === null ? [] : range(first, stageDay - 1) }
}

/** La pregunta de la confirmación (§11.11, DD-17). */
export function revealQuestion(stageDay: number): string {
  return `Show the result of Stage ${stageDay}? You won't be able to watch it without knowing.`
}

/** Lo que revelar arrastra, dicho antes de aceptar (§11.11); null si no arrastra nada. */
export function alsoRevealsText(also: readonly number[]): string | null {
  const [first] = also
  const last = also[also.length - 1]
  if (first === undefined || last === undefined) return null
  if (also.length === 1) return `This also reveals stage ${first}.`
  if (also.length === 2) return `This also reveals stages ${first} and ${last}.`
  return `This also reveals stages ${first} to ${last}.`
}
