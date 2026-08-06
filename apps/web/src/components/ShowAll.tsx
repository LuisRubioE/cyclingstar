/**
 * Regla común de tablas del juego (docs/navegacion.md §7.3).
 *
 * Una sola convención en todo el juego: se ven las 20 primeras filas y SIEMPRE hay salida para ver
 * el resto. Ni truncar sin remedio —la página de etapa cortaba a 15/15/10 y no se podía consultar
 * un resultado completo— ni volcar las 176 filas de una gran vuelta encima del jugador.
 */

/** Filas visibles antes de pedir "Show all". */
export const TOP_ROWS = 20

/** Interruptor "Show all (N)" / "Show top 20" que acompaña a toda tabla larga. */
export function ShowAllButton({
  total,
  expanded,
  onToggle,
}: {
  total: number
  expanded: boolean
  onToggle: () => void
}) {
  if (total <= TOP_ROWS) return null
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="mt-2 text-sm font-medium text-brand-cyan hover:underline"
    >
      {expanded ? `Show top ${TOP_ROWS}` : `Show all ${total}`}
    </button>
  )
}
