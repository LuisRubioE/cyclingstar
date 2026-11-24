/**
 * LA INACTIVIDAD Y LA AUSENCIA (docs/cuenta.md §14.4; D-54, I-19; PR 13 de E4): el contrato con E7. Con una
 * ausencia viva, `inactiveSince` está en el futuro y ningún reloj de inactividad corre; al volver, cuenta
 * desde `away_until`: la ausencia congela, no rellena. Qué hace cada reloj y cuánto mide es de E7 (la regla
 * del mes llega con el PR 15).
 */

/** El contrato con E7: desde cuándo cuenta la inactividad. Nula si no hay ni visita ni ausencia. */
export function inactiveSince(lastSeenAt: Date | null, awayUntil: Date | null): Date | null {
  if (lastSeenAt === null) return awayUntil
  if (awayUntil === null) return lastSeenAt
  return lastSeenAt > awayUntil ? lastSeenAt : awayUntil
}

/** Ausente es `away_until > now` (§14.2): en el borde exacto ya ha vuelto. */
export function isAway(user: { readonly awayUntil: Date | null }, now: Date): boolean {
  return user.awayUntil !== null && user.awayUntil > now
}
