import { useState } from 'react'
import type { TeamClassEntry } from '../api/race'
import { formatTime } from '../domain/format'
import { Flag } from './Flag'
import { ShowAllButton, TOP_ROWS } from './ShowAll'
import { TeamLink } from './TeamLink'

/**
 * Tabla de la clasificación POR EQUIPOS. La misma para la de una etapa y para la acumulada: las dos
 * tienen la misma forma (equipo, tiempo y diferencia con el líder), así que las dos páginas —ficha
 * de carrera y ficha de etapa— usan este componente y no dos copias que se desincronicen.
 *
 * Regla común de tablas: top 20 visible y "Show all" (docs/navegacion.md §7.3).
 *
 * Los equipos FUERA de clasificación —los que se quedaron sin tres corredores en alguna etapa— van
 * al final, atenuados y sin puesto, igual que los DNF en la general individual.
 */
export function TeamClassTable({ rows }: { rows: readonly TeamClassEntry[] }) {
  const [showAll, setShowAll] = useState(false)
  const leader = rows.find((r) => !r.out)?.tiempoS ?? 0
  const visible = showAll ? rows : rows.slice(0, TOP_ROWS)
  return (
    <>
      <table className="mt-2 w-full text-sm">
        <caption className="sr-only">
          Team classification: position, country, team and combined time
        </caption>
        <tbody>
          {visible.map((r, i) => (
            <tr
              key={r.teamId}
              className={`border-b border-slate-100 last:border-0${r.out ? ' text-slate-300' : ''}`}
            >
              <td className="w-7 py-1 tabular-nums text-slate-400">{r.out ? '' : i + 1}</td>
              <td className="w-6 py-1">{r.country && <Flag code={r.country} size={16} />}</td>
              <td className={`py-1 ${r.out ? 'text-slate-400' : 'text-slate-700'}`}>
                <TeamLink teamId={r.teamId} name={r.teamName} />
              </td>
              <td className="py-1 text-right tabular-nums text-slate-500">
                {r.out ? (
                  <span className="text-amber-500" title="Fewer than three riders left">
                    OUT
                  </span>
                ) : i === 0 ? (
                  formatTime(r.tiempoS)
                ) : (
                  `+${formatTime(r.tiempoS - leader)}`
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ShowAllButton total={rows.length} expanded={showAll} onToggle={() => setShowAll(!showAll)} />
    </>
  )
}

/** Explicación de la regla, para que nadie tenga que adivinar de dónde sale el tiempo. */
export function TeamClassNote() {
  return (
    <p className="mt-2 text-xs text-slate-400">
      Combined finishing times of the three best riders from each team on every stage. Time bonuses
      do not count. A team left with fewer than three riders drops out of the classification.
    </p>
  )
}
