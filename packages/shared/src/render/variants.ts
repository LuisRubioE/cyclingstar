/**
 * LAS VARIANTES DE UNA FRASE Y EL PASADO ESTABLE (docs/retransmision.md §12.7, D-46).
 *
 * Una frase puede tener varias redacciones y se elige una con una semilla. Hoy (la voz y el acta de
 * `apps/web/src/domain/stageJournal.ts`) la elección es `hash % n`, y eso tiene un defecto que aquí
 * se cierra: añadir una redacción cambia `n` y re-sortea el pasado, de modo que una etapa vista
 * ayer se leería hoy con otras palabras. Cada redacción lleva la revisión desde la que existe
 * (`since`) y se elige solo entre las que ya existían en la revisión con que se escribió lo leído.
 *
 * Nace en el paso 1a con las noticias (`renderNews`); la voz y el acta la usan desde el paso 12.
 */
import type { NameResolver } from '../news.js'

/** Una redacción y la revisión desde la que existe: pickVariant solo elige entre las de since ≤ rev (D-46), y añadir una no re-sortea el pasado. */
export interface Variant<D> {
  readonly since: number
  readonly render: (d: D, n: NameResolver) => string
}

/** La revisión de las plantillas. Sube en uno cuando un PR añade una redacción con `since` nuevo; nunca baja. Vale 0 al cerrar el paso 12. */
export const TEMPLATE_REV = 0

/** FNV-1a de 32 bits: la de variantIndex (stageJournal.ts l. 111-115), movida aquí sin cambiar un bit. */
export function fnv1a(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0
  return h
}

/** Elige SOLO entre las redacciones que ya existían en la revisión `rev` (D-46): añadir una no re-sortea el pasado. */
export function pickVariant<D>(
  seed: string,
  variants: readonly Variant<D>[],
  rev: number,
): Variant<D> {
  const alive = variants.filter((v) => v.since <= rev)
  const chosen = alive[fnv1a(seed) % alive.length]
  if (chosen === undefined) throw new Error(`pickVariant: ninguna redacción con since <= ${rev}`)
  return chosen
}
