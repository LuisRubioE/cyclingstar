import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type RacePref, fetchRacePrefs, setRacePref } from '../api/objectives'

const LEVEL_BADGE: Record<string, string> = {
  WT: 'bg-indigo-100 text-indigo-700',
  PRS: 'bg-sky-100 text-sky-700',
  CON: 'bg-slate-100 text-slate-600',
}

const FORMAT_LABEL: Record<string, string> = {
  'gran-vuelta': 'Grand tour',
  'una-semana': 'Stage race',
  'un-dia': 'One-day',
}

function CallupBadge({ callup }: { callup: RacePref['callup'] }) {
  if (callup === 'selected') {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
        Called up
      </span>
    )
  }
  if (callup === 'not-selected') {
    return (
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
        Not selected
      </span>
    )
  }
  return null
}

export function Objectives() {
  const queryClient = useQueryClient()
  const { data, isPending, isError } = useQuery({
    queryKey: ['race-prefs'],
    queryFn: fetchRacePrefs,
  })

  const toggle = useMutation({
    mutationFn: ({ raceId, wanted }: { raceId: string; wanted: boolean }) =>
      setRacePref(raceId, wanted),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['race-prefs'] }),
  })

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load your objectives.</p>

  const targets = data.filter((r) => r.wanted).length

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Season objectives</h1>
        <p className="mt-1 text-sm text-slate-500">
          Star the races you want to target. Your team weighs your wishes when picking squads — but
          a wish is no guarantee, and missing a targeted race stings your morale.
        </p>
        <p className="mt-1 text-xs text-slate-400">{targets} races targeted</p>
      </div>
      <div className="space-y-2.5">
        {data.map((race) => (
          <article
            key={race.raceId}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <button
              onClick={() => toggle.mutate({ raceId: race.raceId, wanted: !race.wanted })}
              disabled={toggle.isPending}
              aria-label={race.wanted ? 'Remove target' : 'Add target'}
              className={`text-xl leading-none transition disabled:opacity-50 ${
                race.wanted ? 'text-amber-400' : 'text-slate-300 hover:text-slate-400'
              }`}
            >
              {race.wanted ? '★' : '☆'}
            </button>
            <span className="w-14 shrink-0 text-xs tabular-nums text-slate-400">
              Day {race.startDay}
            </span>
            <span className="text-sm font-semibold text-slate-800">{race.name}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_BADGE[race.level] ?? ''}`}
            >
              {race.level}
            </span>
            <span className="ml-auto flex items-center gap-3 text-xs text-slate-500">
              <CallupBadge callup={race.callup} />
              {FORMAT_LABEL[race.format] ?? race.format}
            </span>
          </article>
        ))}
      </div>
    </section>
  )
}
