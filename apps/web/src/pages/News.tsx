import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchNews } from '../api/news'
import { newsIcon } from '../domain/labels'
import { Flag } from '../components/Flag'
import { Panel, SectionBar } from '../components/Panel'

export function News() {
  const { data, isPending, isError } = useQuery({ queryKey: ['news'], queryFn: fetchNews })

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the news feed.</p>

  return (
    <section className="space-y-4">
      <SectionBar>News</SectionBar>
      <p className="text-sm text-slate-500">
        What the world is talking about — stage wins, breakaways, the mountains battle, transfers.
      </p>

      <Panel title="Headlines" bodyClassName="p-0">
        {data.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">
            Nothing has happened yet. Advance the world and the headlines will roll in.
          </p>
        ) : (
          <ol className="divide-y divide-slate-100">
            {data.map((item, i) => (
              <li
                key={i}
                className={`flex items-start gap-3 px-4 py-3 ${
                  item.personal ? 'border-l-2 border-indigo-300 bg-indigo-50/40' : ''
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {newsIcon(item.kind)}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm text-slate-700">
                    {item.country && <Flag code={item.country} size={16} />}
                    {item.riderId ? (
                      <Link to={`/riders/${item.riderId}`} className="hover:underline">
                        {item.text}
                      </Link>
                    ) : (
                      item.text
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Day {item.gameDay}
                    {item.personal && <span className="ml-2 text-indigo-500">· about you</span>}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </section>
  )
}
