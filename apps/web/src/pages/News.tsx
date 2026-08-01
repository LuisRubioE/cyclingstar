import { useQuery } from '@tanstack/react-query'
import { fetchNews, newsIcon } from '../api/news'

export function News() {
  const { data, isPending, isError } = useQuery({ queryKey: ['news'], queryFn: fetchNews })

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the news feed.</p>

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">News</h1>
        <p className="mt-1 text-sm text-slate-500">
          What the world is talking about — stage wins, breakaways, the mountains battle, transfers.
        </p>
      </div>

      {data.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          Nothing has happened yet. Advance the world and the headlines will roll in.
        </p>
      ) : (
        <ol className="space-y-2">
          {data.map((item, i) => (
            <li
              key={i}
              className={`flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm ${
                item.personal ? 'border-indigo-200' : 'border-slate-200'
              }`}
            >
              <span className="text-lg leading-none" aria-hidden>
                {newsIcon(item.kind)}
              </span>
              <div className="min-w-0">
                <p className="text-sm text-slate-700">{item.text}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Day {item.gameDay}
                  {item.personal && <span className="ml-2 text-indigo-500">· about you</span>}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
