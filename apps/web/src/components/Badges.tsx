import { useQuery } from '@tanstack/react-query'
import { fetchRiderBadges } from '../api/browse'
import { horizonKey, useHorizonRev } from '../queryClient'
import { Panel } from './ui/Panel'

/**
 * Logros del corredor (#95): medallas ganadas por su palmarés. Nada si aún no tiene ninguna.
 *
 * Con el sistema desde el 21h de E3 (docs/visual.md §4.6): su `Panel`, y cada logro con su emoji, que es
 * contenido (§3.7), su nombre y su porqué a la vista, que antes vivía en un `title` que el dedo no abre (ui/4).
 */
export function Badges({ riderId }: { riderId: string }) {
  const rev = useHorizonRev()
  const { data } = useQuery({
    queryKey: horizonKey(['badges', riderId], rev),
    queryFn: () => fetchRiderBadges(riderId),
    enabled: rev !== undefined,
  })
  if (!data || data.length === 0) return null
  return (
    <Panel title="Badges">
      <ul className="grid gap-3 sm:grid-cols-2">
        {data.map((b) => (
          <li key={b.id} className="flex items-start gap-2">
            <span aria-hidden="true" className="text-title">
              {b.icon}
            </span>
            <span className="grid">
              <span className="text-row font-semibold text-ink">{b.label}</span>
              <span className="text-meta text-ink-2">{b.desc}</span>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
