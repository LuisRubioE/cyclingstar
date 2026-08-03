import { COUNTRIES, HOUSING_RENT_PER_WEEK } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { Flag } from '../components/Flag'
import { Panel, SectionBar } from '../components/Panel'
import { fetchLedger, kindLabel, money } from '../api/finances'
import { fetchRiderSummary } from '../api/rider'

const KIND_TONE: Record<string, string> = {
  salario: 'text-emerald-600',
  premio: 'text-emerald-600',
  patrocinador: 'text-emerald-600',
  staff: 'text-rose-600',
  viaje: 'text-rose-600',
  vivienda: 'text-rose-600',
  otro: 'text-slate-600',
}

function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code
}

/** Situación de vivienda del corredor: en casa (gratis), fuera pagando alquiler, o cubierto por el equipo. */
function HousingCard() {
  const { data } = useQuery({ queryKey: ['rider-summary'], queryFn: fetchRiderSummary })
  if (!data) return null
  const atHome = data.residence === data.nationality
  return (
    <Panel title="Housing">
      <div className="flex items-center gap-2 text-sm">
        <span>🏠</span>
        <span className="text-slate-500">Lives in</span>
        <Flag code={data.residence} size={16} />
        <span className="font-medium text-slate-800">{countryName(data.residence)}</span>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        {atHome ? (
          <>You live in your home country — the family home is free, no rent.</>
        ) : data.housingCovered ? (
          <>
            You live abroad, but your team covers your rent as a contract extra — you pay{' '}
            <span className="font-medium text-emerald-600">nothing</span>.
          </>
        ) : (
          <>
            You live away from home, so you pay{' '}
            <span className="font-medium text-rose-600">{HOUSING_RENT_PER_WEEK}/week</span> in rent
            (shown as Housing in the ledger).
          </>
        )}
      </p>
    </Panel>
  )
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

      <HousingCard />

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
