import { formatCountdown, seasonPosition } from '@cyclingstar/shared'
import { useWorldCountdown } from './useWorldCountdown'

/**
 * Fecha del juego ("GD 37 · Season 1") y cuenta atrás al próximo avance (SPEC 2, Paso 12). Si el
 * servidor da `nextTickAtMs` (anclado a la creación del mundo) lo usa: es exacto. Si no, cae en la
 * aproximación alineada al epoch. Al llegar a cero refresca /health para retomar el nuevo objetivo
 * (`useWorldCountdown`, la misma cuenta que el reloj de la cabecera desde el PR 11 de E3).
 */
export function WorldClock({
  gameDay,
  tickIntervalMinutes,
  nextTickAtMs,
}: {
  gameDay: number | null
  tickIntervalMinutes: number
  nextTickAtMs?: number | null
}) {
  const remainingMs = useWorldCountdown({ tickIntervalMinutes, nextTickAtMs })

  const dateLabel =
    gameDay !== null && gameDay >= 1
      ? `GD ${seasonPosition(gameDay).dayOfSeason} · Season ${seasonPosition(gameDay).season}`
      : 'Not started'

  const countdown = remainingMs > 1000 ? formatCountdown(remainingMs) : 'moments'

  return (
    <div className="text-xs text-slate-500">
      <span className="font-medium text-slate-700">{dateLabel}</span>
      <span className="mx-1.5 text-slate-300">·</span>
      <span>next update in {countdown}</span>
    </div>
  )
}
