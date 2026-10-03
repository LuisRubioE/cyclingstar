import type { RiderCard } from '@cyclingstar/shared'
import { Jersey, LeaderJersey } from '../Jersey'

/**
 * EL MAILLOT QUE LLEVA UN CORREDOR en la retransmisión (docs/retransmision.md §6.2 y §7.4): el de líder
 * (`LeaderJersey`, que distingue por forma además de por color) o la equipación de su equipo
 * (`Jersey`, de su `jerseySeed`), leídos de su `RiderCard.worn` en el reparto de la cabecera. Son los
 * componentes de hoy, los que ya usa la radio.
 *
 * Nace en el 3c con el reparto provisional del adaptador, que no trae títulos: el de campeón
 * (`ChampionMark`) llega en el 6b con el reparto congelado, y hasta entonces un campeón lleva la
 * equipación de su equipo. Un corredor sin equipo no lleva icono, y deja su hueco.
 */
export function WornJerseyIcon({ card, size = 14 }: { card: RiderCard; size?: number }) {
  if (card.worn.kind === 'leader') return <LeaderJersey kind={card.worn.jersey} size={size} />
  if (card.team === null)
    return <span className="inline-block shrink-0" style={{ width: size }} aria-hidden />
  return <Jersey seed={card.team.jerseySeed} size={size} />
}
