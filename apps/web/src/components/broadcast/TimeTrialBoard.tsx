import type { BroadcastHead, RiderCard, TimeTrialInstant } from '@cyclingstar/shared'
import { useState } from 'react'
import {
  hotSeatText,
  latestCheckOf,
  ttBoardRows,
  ttOverlayText,
} from '../../domain/broadcast/screen'
import { Button } from '../ui/Button'
import { Flag } from '../ui/Flag'
import { WornJerseyIcon, wornTeamOf } from './WornJerseyIcon'

/**
 * LA CAPA FIJA DE LA CRONO (docs/retransmision.md §9.5; D-23): el reloj y las tres cuentas
 * (`2:55:00 · 22 on course · 66 finished · 88 to start`) y, en su renglón, el sillón
 * (`HOT SEAT · 71 Mads Olsen 38:04`). Permanente, como la de carretera; no es una región viva (§18.8).
 *
 * Desde el PR 20 (E3, docs/visual.md §14.3; Rcobertura-038), vestida como la de carretera: en el ámbito
 * oscuro, el reloj en `row` con `tabular-nums` en blanco y el sillón en `gold`. Y es la capa fija de la
 * crono, así que lleva su `data-ui` y es la respuesta de su pantalla (§7.3, la 38).
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
    <div
      data-ui="FixedOverlay"
      data-answer=""
      data-surface="dark"
      className="rounded-ui bg-surface px-3 py-2 text-ink"
      aria-live="off"
    >
      <p className="text-row tabular-nums">{ttOverlayText(tti)}</p>
      {seat !== null && (
        <p data-hot-seat="" className="text-row text-gold">
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
 *
 * Desde el PR 20 (E3, docs/visual.md §14.4; Ruso-018): sus dos botones, el del sillón y el del control,
 * de unos 16 y 20 px de alto, son `Button` `quiet` de 44 a todo lo ancho, con los mismos textos.
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
    <div className="space-y-2 text-meta text-ink" aria-live="off" data-tt-board="">
      <Button
        variant="quiet"
        layout="w-full"
        onClick={() => setOpen((o) => (o === 'arrivals' ? 'none' : 'arrivals'))}
      >
        {hotSeatText(tti, cast) ?? 'HOT SEAT · nobody home yet'}
      </Button>
      {(check !== null || open === 'arrivals') && (
        <div>
          <Button
            variant="quiet"
            layout="w-full"
            onClick={() => setOpen((o) => (o === 'check' ? 'none' : 'check'))}
          >
            {open === 'arrivals'
              ? `Finish · ${tti.arrivals.length} home`
              : `Split ${check! + 1} · km ${Math.round(tt.checksKm[check!] ?? 0)}`}
          </Button>
          <ol className="mt-1 max-h-72 space-y-0.5 overflow-y-auto" data-tt-rows={open}>
            {rows.map((r) => {
              const card = cast[r.rider]
              return (
                <li key={r.rider} className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-right text-caption tabular-nums text-ink-3">
                    {r.rank}
                  </span>
                  {card !== undefined && <Flag country={card.country} />}
                  <span className="min-w-0 flex-1 break-words">{r.name}</span>
                  {card !== undefined && (
                    <WornJerseyIcon worn={card.worn} team={wornTeamOf(card)} size={28} />
                  )}
                  <span className="shrink-0 tabular-nums text-ink-2">{r.time}</span>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}
