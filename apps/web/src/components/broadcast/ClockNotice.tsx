/**
 * EL AVISO DE LO ESTIMADO (docs/retransmision.md §3.8 y §6.2; D-07): una etapa sin línea grabada se
 * retransmite con el adaptador de la radio, con el reloj de la cabeza estimado y los grupos de detrás
 * situados por su posición. Se dice, para que el dueño no tome por un defecto del motor el error de
 * una pieza provisional (§17.6, riesgo del 3a). Con la línea grabada (`clock: 'exact'`), nada.
 */
export function ClockNotice({ clock }: { clock: 'exact' | 'estimated' }) {
  if (clock === 'exact') return null
  return (
    <div className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800 ring-1 ring-amber-200">
      <p className="font-medium">Recorded before full race data</p>
      <p>Positions of the groups behind are estimated</p>
    </div>
  )
}
