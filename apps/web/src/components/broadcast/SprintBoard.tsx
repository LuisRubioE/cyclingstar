import type { RiderCard } from '@cyclingstar/shared'
import { memo } from 'react'
import { SPRINT_ROLE_WORD, type SprintNow, sprintGapText } from '../../domain/broadcast/sprintView'
import { Flag } from '../ui/Flag'
import { WornJerseyIcon, wornTeamOf } from './WornJerseyIcon'

/** Filas del panel en el teléfono; el resto, en escritorio (como las filas plegadas de la barra, §6.2). */
const MOBILE_ROWS = 6
/** El ancho de la carretera dibujada, en unidades del dibujo, y dónde está la línea. */
const ROAD_W = 300
const LINE_X = 292
/** Los metros que caben en la carretera dibujada como mínimo: un grupo compacto no se pinta encima de la línea. */
const ROAD_MIN_M = 12

/**
 * EL ÚLTIMO KM COMO EN LA TELE (W5c, la revisión de `Watch`; docs/diseno/e3-visual/implementacion.md).
 * Sustituye a la barra de grupos en el último km de una etapa grabada con su final (W5a-2), como la crono
 * cambia la barra por su tabla: arriba, la carretera, con el grupo de cabeza hacia la línea (el primero,
 * en el acento, y los del espectador, en oro); debajo, los de delante en su orden, cada uno con su
 * bandera, su nombre, su maillot (el de líder, el de campeón o el de su equipo, D-00c), lo que hace
 * (tirando de su velocista, lanzado, cediendo o encerrado) y sus metros al primero. No es una región viva:
 * desde los 500 m solo habla la distancia (§6.2), y esto se mira. La línea la trae la meta (D-06).
 */
export const SprintBoard = memo(function SprintBoard({
  now,
  cast,
}: {
  now: SprintNow
  cast: readonly RiderCard[]
}) {
  const span = Math.max(ROAD_MIN_M, ...now.rows.map((r) => r.behindM))
  const xOf = (behindM: number): number => LINE_X - 8 - (behindM / span) * (LINE_X - 24)
  return (
    <div data-ui="SprintBoard" className="space-y-2 text-meta text-ink" aria-live="off">
      <p className="flex items-baseline justify-between gap-2">
        <span data-caps="" className="font-semibold uppercase tracking-caps">
          Final sprint
        </span>
        <span
          data-sprint-to-go=""
          className="tabular-nums text-ink-2"
        >{`${now.toGoM} m to go`}</span>
      </p>
      <svg
        data-sprint-road=""
        viewBox={`0 0 ${ROAD_W} 24`}
        className="block h-auto w-full"
        aria-hidden="true"
      >
        <line x1={LINE_X} y1="1" x2={LINE_X} y2="23" className="stroke-line-strong" />
        {now.rows.map((r, i) => (
          <circle
            key={r.rider}
            data-dot={r.rider}
            cx={xOf(r.behindM)}
            cy={6 + (i % 3) * 6}
            r="3"
            className={
              i === 0 ? 'fill-accent' : cast[r.rider]?.own ? 'fill-gold-ink' : 'fill-ink-3'
            }
          />
        ))}
      </svg>
      <ol className="space-y-0.5" data-sprint-rows="">
        {now.rows.map((r, i) => {
          const card = cast[r.rider]
          const word = SPRINT_ROLE_WORD[r.role]
          return (
            <li
              key={r.rider}
              data-sprint-row={r.role}
              className={`${i >= MOBILE_ROWS ? 'hidden sm:flex' : 'flex'} items-center gap-2${card?.own ? ' font-semibold' : ''}`}
            >
              <span className="w-6 shrink-0 text-right text-caption tabular-nums text-ink-3">
                {i + 1}
              </span>
              {card !== undefined && <Flag country={card.country} />}
              <span className="min-w-0 flex-1 break-words">{card?.name ?? `#${r.rider + 1}`}</span>
              {card !== undefined && (
                <WornJerseyIcon worn={card.worn} team={wornTeamOf(card)} size={28} />
              )}
              {word !== null && (
                <span className="shrink-0 text-caption font-semibold uppercase tracking-caps text-accent">
                  {word}
                </span>
              )}
              <span className="w-16 shrink-0 text-right tabular-nums text-ink-2">
                {sprintGapText(r.behindM)}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
})
