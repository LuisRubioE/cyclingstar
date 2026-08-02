import { COUNTRIES } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { fetchHallOfFame } from '../api/rankings'
import { RiderName } from '../components/RiderName'
import { RiderPortrait } from '../components/RiderPortrait'

function flag(country: string): string {
  return COUNTRIES.find((c) => c.code === country)?.flag ?? '🏳️'
}

/** Salón de la fama (#58/#62): corredores por palmarés total de todas las temporadas. */
export function HallOfFame() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['hall-of-fame'],
    queryFn: fetchHallOfFame,
  })

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the hall of fame.</p>

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hall of Fame</h1>
        <p className="mt-1 text-sm text-slate-500">
          The most decorated riders of the world, by all-time wins across every season.
        </p>
      </div>

      {data.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          No honours yet — win a race and you'll be the first name here.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pl-4 text-left font-semibold">#</th>
                <th className="py-2 text-left font-semibold">Rider</th>
                <th className="py-2 text-right font-semibold">Overall</th>
                <th className="py-2 text-right font-semibold">Stages</th>
                <th className="py-2 text-right font-semibold">Mtn</th>
                <th className="py-2 text-right font-semibold">Pts</th>
                <th className="py-2 pr-4 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={r.riderId} className="border-b border-slate-100 last:border-0">
                  <td className="w-8 py-1.5 pl-4 tabular-nums text-slate-400">{i + 1}</td>
                  <td className="py-1.5">
                    <span className="flex items-center gap-2">
                      <RiderPortrait seed={r.riderId} size={24} />
                      <span aria-hidden>{flag(r.country)}</span>
                      <RiderName riderId={r.riderId} name={r.name} isBot={r.isBot} />
                    </span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-slate-600">{r.gc || '—'}</td>
                  <td className="py-1.5 text-right tabular-nums text-slate-600">
                    {r.stage || '—'}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-slate-600">{r.kom || '—'}</td>
                  <td className="py-1.5 text-right tabular-nums text-slate-600">
                    {r.points || '—'}
                  </td>
                  <td className="py-1.5 pr-4 text-right font-bold tabular-nums text-slate-800">
                    {r.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
