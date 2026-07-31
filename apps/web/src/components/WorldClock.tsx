import { formatCountdown, nextTickAt, seasonPosition } from '@cyclingstar/shared'
import { useEffect, useState } from 'react'

/** Fecha del mundo ("Day 37 · Season 1") y cuenta atrás al próximo tick (SPEC 2, Paso 12). */
export function WorldClock({
  gameDay,
  tickIntervalMinutes,
}: {
  gameDay: number | null
  tickIntervalMinutes: number
}) {
  const [remainingMs, setRemainingMs] = useState(
    () => nextTickAt(new Date(), tickIntervalMinutes).getTime() - Date.now(),
  )

  useEffect(() => {
    const tick = () => {
      setRemainingMs(nextTickAt(new Date(), tickIntervalMinutes).getTime() - Date.now())
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => {
      window.clearInterval(id)
    }
  }, [tickIntervalMinutes])

  const dateLabel =
    gameDay !== null && gameDay >= 1
      ? `Day ${seasonPosition(gameDay).dayOfSeason} · Season ${seasonPosition(gameDay).season}`
      : 'Not started'

  return (
    <div className="text-xs text-slate-500">
      <span className="font-medium text-slate-700">{dateLabel}</span>
      <span className="mx-1.5 text-slate-300">·</span>
      <span>next tick in {formatCountdown(remainingMs)}</span>
    </div>
  )
}
