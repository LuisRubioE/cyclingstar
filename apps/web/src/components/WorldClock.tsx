import { formatCountdown, nextTickAt, seasonPosition } from '@cyclingstar/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

/**
 * Fecha del juego ("GD 37 · Season 1") y cuenta atrás al próximo avance (SPEC 2, Paso 12). Si el
 * servidor da `nextTickAtMs` (anclado a la creación del mundo) lo usa: es exacto. Si no, cae en la
 * aproximación alineada al epoch. Al llegar a cero refresca /health para retomar el nuevo objetivo.
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
  const qc = useQueryClient()
  const refetched = useRef(false)
  const target = () =>
    nextTickAtMs != null ? nextTickAtMs : nextTickAt(new Date(), tickIntervalMinutes).getTime()
  const [remainingMs, setRemainingMs] = useState(() => target() - Date.now())

  useEffect(() => {
    refetched.current = false
    // El temporizador diferido también se limpia al desmontar: si no, quedaba huérfano e invalidaba
    // consultas de un componente que ya no existe.
    let refetchTimer: number | undefined
    const update = () => {
      const ms = target() - Date.now()
      setRemainingMs(ms)
      // Al vencer, pide /health una vez para obtener el nuevo día y el siguiente objetivo.
      if (ms <= 0 && !refetched.current) {
        refetched.current = true
        refetchTimer = window.setTimeout(
          () => void qc.invalidateQueries({ queryKey: ['health'] }),
          2000,
        )
      }
    }
    update()
    const id = window.setInterval(update, 1000)
    return () => {
      window.clearInterval(id)
      if (refetchTimer !== undefined) window.clearTimeout(refetchTimer)
    }
  }, [tickIntervalMinutes, nextTickAtMs])

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
