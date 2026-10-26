import { COUNTRIES, HOUSING_RENT_PER_WEEK, seasonPosition } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { Flag } from '../components/Flag'
import { Panel, SectionBar } from '../components/Panel'
import { type LedgerEntry, fetchLedger } from '../api/finances'
import { fetchRiderSummary } from '../api/rider'
import { ledgerKindLabel } from '../domain/labels'
import { formatGameDay } from '../domain/words'
import { horizonKey, useHorizonRev } from '../queryClient'
import { VeilNotice } from '../components/VeilNotice'
import { EmptyState } from '../components/ui/EmptyState'
import { Panel as UiPanel } from '../components/ui/Panel'
import { QueryView } from '../components/ui/QueryView'
import { RankTable, type RankTableColumn } from '../components/ui/RankTable'
import { statFigure } from '../components/ui/Stat'

/** Un movimiento con su clave: no traen id, y su orden (el más reciente primero) no cambia. */
interface Movimiento {
  readonly e: LedgerEntry
  readonly clave: string
}

/** Lo que dice el movimiento: su nota o, si no la tiene, su clase (`Salary`). */
const concepto = (e: LedgerEntry): string =>
  e.note.trim() === '' ? ledgerKindLabel(e.kind) : e.note

/**
 * El día (`Day 42`, el de la temporada) debajo del concepto hasta 640 y la clase hasta 1.024; el importe
 * con su signo, siempre: `+780` en `good`, `−80` en `bad` y el cero en `ink`, como `Stat` (§6.1).
 */
const COLUMNAS: readonly RankTableColumn<Movimiento>[] = [
  {
    key: 'day',
    header: 'Day',
    priority: 'secondary',
    render: ({ e }) => formatGameDay(seasonPosition(e.gameDay).dayOfSeason, null),
  },
  { key: 'kind', header: 'Kind', priority: 'optional', render: ({ e }) => ledgerKindLabel(e.kind) },
  {
    key: 'amount',
    header: 'Amount',
    priority: 'primary',
    numeric: true,
    render: ({ e }) => {
      const { text, tone } = statFigure(e.amount, true)
      return <span className={tone}>{text}</span>
    },
  },
]

/**
 * LOS MOVIMIENTOS (E3, docs/visual.md §6.1; PR 12b). En `RankTable` sin puesto y sin enlace: no llevan a
 * ningún sitio, ni fila propia (§6.2), porque todos son del jugador. Las 20 primeras y `Show all`.
 */
function LedgerTable({ entries }: { readonly entries: readonly LedgerEntry[] }) {
  return (
    <RankTable
      caption="Transactions: description, game day, kind and amount"
      rows={entries.map((e, i) => ({ e, clave: String(i) }))}
      rowKey={({ clave }) => clave}
      identity={({ e }) => <span className="text-row text-ink">{concepto(e)}</span>}
      identityHeader="Description"
      columns={COLUMNAS}
    />
  )
}

function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code
}

/** Situación de vivienda del corredor: en casa (gratis), fuera pagando alquiler, o cubierto por el equipo. */
function HousingCard() {
  const rev = useHorizonRev()
  const { data } = useQuery({
    queryKey: horizonKey(['rider-summary'], rev),
    queryFn: fetchRiderSummary,
    enabled: rev !== undefined,
  })
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

/**
 * Aviso de próximo día de pago: la nómina cae cada día de juego múltiplo de 7 (GD7, GD14, GD21…),
 * atada al reloj del mundo, no a tu fecha de fichaje. El siguiente pago es el primer múltiplo de 7
 * por delante del día actual (el día en curso ya está procesado).
 */
function NextSalaryCard({ gameDay, salary }: { gameDay: number; salary: number }) {
  const nextPayday = (Math.floor(gameDay / 7) + 1) * 7
  const daysUntil = nextPayday - gameDay
  return (
    <Panel title="Next salary">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span className="text-lg font-bold tabular-nums text-emerald-600">
          +{salary.toLocaleString('en-US')}
        </span>
        <span className="text-slate-500">
          on <span className="font-semibold text-slate-700">GD{nextPayday}</span> ·{' '}
          {daysUntil === 1 ? 'in 1 day' : `in ${daysUntil} days`}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Salaries are paid weekly, on every game day that is a multiple of 7 (GD7, GD14, GD21…) —
        tied to the world clock, not to your signing date.
      </p>
    </Panel>
  )
}

export function Finances() {
  const rev = useHorizonRev()
  const query = useQuery({
    queryKey: horizonKey(['ledger'], rev),
    queryFn: fetchLedger,
    enabled: rev !== undefined,
  })

  // Los estados, con `QueryView` (E3, PR 10).
  if (query.data === undefined)
    return <QueryView query={query} label="your finances" skeleton={{ kind: 'stat' }} />
  const data = query.data

  return (
    <section className="space-y-4">
      <SectionBar>Finances</SectionBar>
      <VeilNotice kind="results" />
      <p className="text-sm text-slate-500">
        Every salary payment and race prize is logged here. Your balance is the sum of the ledger.
      </p>

      <Panel title="Balance">
        <p className="text-3xl font-bold tabular-nums text-slate-800">
          {data.balance.toLocaleString('en-US')}
        </p>
      </Panel>

      {data.salary != null && data.gameDay != null && (
        <NextSalaryCard gameDay={data.gameDay} salary={data.salary} />
      )}

      <HousingCard />

      {data.entries.length === 0 ? (
        <EmptyState text="No transactions yet. Salary lands weekly once you have a contract; prizes come from racing." />
      ) : (
        <UiPanel ariaLabel="Transactions" variant="bleed">
          <LedgerTable entries={data.entries} />
        </UiPanel>
      )}
    </section>
  )
}
