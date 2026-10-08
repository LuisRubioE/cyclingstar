import type { BroadcastHead, RiderCard, TimeTrialInstant } from '@cyclingstar/shared'
import { useState } from 'react'
import {
  hotSeatText,
  latestCheckOf,
  ttBoardRows,
  ttOverlayText,
} from '../../domain/broadcast/screen'
import { WornJerseyIcon } from './WornJerseyIcon'

/**
 * LA CAPA FIJA DE LA CRONO (docs/retransmision.md §9.5; D-23): el reloj y las tres cuentas
 * (`2:55:00 · 22 on course · 66 finished · 88 to start`) y, en su renglón, el sillón
 * (`HOT SEAT · 71 Mads Olsen 38:04`). Permanente, como la de carretera; no es una región viva (§18.8).
 */
export function TimeTrialOverlay({
  tti,
  cast,
}: {
  tti: TimeTrialInstant
  cast: readonly RiderCard[]
}) {
  const seat = hotSeatText(tti, cast)
  return (
    <div className="rounded-xl bg-slate-900 px-3 py-2 text-white" aria-live="off">
      <p className="text-sm font-semibold tabular-nums">{ttOverlayText(tti)}</p>
      {seat !== null && (
        <p data-hot-seat="" className="text-sm font-bold text-amber-300">
          {seat}
        </p>
      )}
    </div>
  )
}

/**
 * EL TABLERO DE LA CRONO (§9.5): sustituye a la barra de grupos. Arriba el sillón; debajo, el control
 * más reciente con sus tres primeros (`SPLIT 1 · km 9 · 1. Mads Olsen 18:03 · 2. … +0:13`); al tocarlo,
 * la tabla entera de ese control, o la de llegados (`arrivals`). Todo tiempo relativo con signo además
 * de color (D-57).
 */
export function TimeTrialBoard({
  tti,
  cast,
  tt,
}: {
  tti: TimeTrialInstant
  cast: readonly RiderCard[]
  tt: NonNullable<BroadcastHead['tt']>
}) {
  const [open, setOpen] = useState<'none' | 'check' | 'arrivals'>('none')
  const check = latestCheckOf(tti)
  const checkBoard = check === null ? [] : tti.splits[check]!.board
  const rows =
    open === 'arrivals'
      ? ttBoardRows(tti.arrivals, cast)
      : ttBoardRows(checkBoard, cast, open === 'check' ? Number.POSITIVE_INFINITY : 3)
  return (
    <div className="space-y-2 text-sm" aria-live="off" data-tt-board="">
      <button
        type="button"
        className="w-full text-left font-semibold text-slate-800"
        onClick={() => setOpen((o) => (o === 'arrivals' ? 'none' : 'arrivals'))}
      >
        {hotSeatText(tti, cast) ?? 'HOT SEAT · nobody home yet'}
      </button>
      {(check !== null || open === 'arrivals') && (
        <div>
          <button
            type="button"
            className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            onClick={() => setOpen((o) => (o === 'check' ? 'none' : 'check'))}
          >
            {open === 'arrivals'
              ? `Finish · ${tti.arrivals.length} home`
              : `Split ${check! + 1} · km ${Math.round(tt.checksKm[check!] ?? 0)}`}
          </button>
          <ol className="mt-1 max-h-72 space-y-0.5 overflow-y-auto" data-tt-rows={open}>
            {rows.map((r) => {
              const card = cast[r.rider]
              return (
                <li key={r.rider} className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-right text-xs tabular-nums text-slate-400">
                    {r.rank}
                  </span>
                  {card !== undefined && <WornJerseyIcon card={card} size={13} />}
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  <span className="shrink-0 tabular-nums text-slate-700">{r.time}</span>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}
