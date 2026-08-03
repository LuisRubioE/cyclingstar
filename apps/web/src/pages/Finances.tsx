import { useQuery } from '@tanstack/react-query'
import { Panel, SectionBar } from '../components/Panel'
import { fetchLedger, kindLabel, money } from '../api/finances'

const KIND_TONE: Record<string, string> = {
  salario: 'text-emerald-600',
  premio: 'text-emerald-600',
  patrocinador: 'text-emerald-600',
  staff: 'text-rose-600',
  viaje: 'text-rose-600',
  vivienda: 'text-rose-600',
  otro: 'text-slate-600',
}

export function Finances() {
  const { data, isPending, isError } = useQuery({ queryKey: ['ledger'], queryFn: fetchLedger })

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load your finances.</p>

  return (
    <section className="space-y-4">
      <SectionBar>Finances</SectionBar>
      <p className="text-sm text-slate-500">
        Every salary payment and race prize is logged here. Your balance is the sum of the ledger.
      </p>

      <Panel title="Balance">
        <p className="text-3xl font-bold tabular-nums text-slate-800">
          {data.balance.toLocaleString('en-US')}
        </p>
      </Panel>

      {data.entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          No transactions yet. Salary lands weekly once you have a contract; prizes come from
          racing.
        </p>
      ) : (
        <Panel bodyClassName="p-0">
          <table className="w-full text-sm">
            <tbody>
              {data.entries.map((e, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="w-16 px-4 py-2 text-slate-400 tabular-nums">Day {e.gameDay}</td>
                  <td className="w-20 px-2 py-2 text-slate-500">{kindLabel(e.kind)}</td>
                  <td className="px-2 py-2 text-slate-700">{e.note}</td>
                  <td
                    className={`px-4 py-2 text-right tabular-nums font-medium ${KIND_TONE[e.kind] ?? 'text-slate-600'}`}
                  >
                    {money(e.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </section>
  )
}
