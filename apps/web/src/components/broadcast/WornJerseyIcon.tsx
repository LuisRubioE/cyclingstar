import { COUNTRY_NAMES, type RiderCard, championTitleText } from '@cyclingstar/shared'
import { memo } from 'react'
import { ChampionMark, Jersey, LeaderJersey } from '../Jersey'

/**
 * EL MAILLOT QUE LLEVA UN CORREDOR en la retransmisión (docs/retransmision.md §6.2, §7.1 y §7.4): el de
 * líder (`LeaderJersey`, que distingue por forma además de por color), el de campeón (`ChampionMark`,
 * provisional hasta E3, con el texto de su título, 7-h) o la equipación de su equipo (`Jersey`, de su
 * `jerseySeed`), leídos de su `RiderCard.worn` en el reparto de la cabecera. Es el único sitio que elige
 * el dibujo por `WornJersey`. Un corredor sin equipo no lleva icono, y deja su hueco.
 */
export const WornJerseyIcon = memo(function WornJerseyIcon({
  card,
  size = 14,
}: {
  card: RiderCard
  size?: number
}) {
  if (card.worn.kind === 'leader') return <LeaderJersey kind={card.worn.jersey} size={size} />
  if (card.worn.kind === 'champion')
    return (
      <ChampionMark
        country={card.worn.title.country}
        label={championTitleText('en', card.worn.title, COUNTRY_NAMES)}
        size={size}
      />
    )
  if (card.team === null)
    return <span className="inline-block shrink-0" style={{ width: size }} aria-hidden />
  return <Jersey seed={card.team.jerseySeed} size={size} />
})
