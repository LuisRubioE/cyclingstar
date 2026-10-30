import { Notice } from '../ui/Notice'

/**
 * EL AVISO DE LO ESTIMADO (docs/retransmision.md §3.8 y §6.2; D-07): una etapa sin línea grabada se
 * retransmite con el adaptador de la radio, con el reloj de la cabeza estimado y los grupos de detrás
 * situados por su posición. Se dice, para que el dueño no tome por un defecto del motor el error de
 * una pieza provisional (§17.6, riesgo del 3a). Con la línea grabada (`clock: 'exact'`), nada.
 *
 * Desde el PR 20 (E3, docs/visual.md §14.6; Rcobertura-038), un `Notice` `info` con su texto de hoy.
 */
export function ClockNotice({ clock }: { clock: 'exact' | 'estimated' }) {
  if (clock === 'exact') return null
  return (
    <Notice tone="info" title="Recorded before full race data">
      Positions of the groups behind are estimated
    </Notice>
  )
}
