import { useQuery } from '@tanstack/react-query'
import { fetchRiderBadges } from '../api/browse'
import { horizonKey, useHorizonRev } from '../queryClient'

/** Logros del corredor (#95): medallas ganadas por su palmarés. Nada si aún no tiene ninguna. */
export function Badges({ riderId }: { riderId: string }) {
  const rev = useHorizonRev()
  const { data } = useQuery({
    queryKey: horizonKey(['badges', riderId], rev),
    queryFn: () => fetchRiderBadges(riderId),
    enabled: rev !== undefined,
  })
  if (!data || data.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {data.map((b) => (
        <span
          key={b.id}
          title={b.desc}
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
        >
          <span aria-hidden>{b.icon}</span>
          {b.label}
        </span>
      ))}
    </div>
  )
}
