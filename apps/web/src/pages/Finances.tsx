import { COUNTRIES, HOUSING_RENT_PER_WEEK, seasonPosition } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { type LedgerEntry, fetchLedger } from '../api/finances'
import { fetchRiderSummary } from '../api/rider'
import { VeilNotice } from '../components/VeilNotice'
import { EmptyState } from '../components/ui/EmptyState'
import { Flag } from '../components/ui/Flag'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { QueryView } from '../components/ui/QueryView'
import { RankTable, type RankTableColumn } from '../components/ui/RankTable'
import { Stat, statFigure } from '../components/ui/Stat'
import { ledgerKindLabel } from '../domain/labels'
import { formatGameDay, plural } from '../domain/words'
import { horizonKey, useHorizonRev } from '../queryClient'

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

/**
 * LA CASA (E3, docs/visual.md §17.21; PR 21l): en casa (gratis), fuera pagando alquiler, o cubierto por el
 * equipo, en su `Panel`; sin el `🏠` de antes (3-d), que ya dicen su título y `Lives in`, y la bandera del
 * catálogo, para el ojo, porque su nombre va al lado.
 */
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
      <p className="flex flex-wrap items-center gap-x-2 text-body text-ink">
        <span className="text-ink-2">Lives in</span>
        <span aria-hidden="true">
          <Flag country={data.residence} />
        </span>
        {countryName(data.residence)}
      </p>
      <p className="mt-2 text-body text-ink-2">
        {atHome ? (
          <>You live in your home country — the family home is free, no rent.</>
        ) : data.housingCovered ? (
          <>
            You live abroad, but your team covers your rent as a contract extra — you pay{' '}
            <span className="font-semibold text-ink">nothing</span>.
          </>
        ) : (
          <>
            You live away from home, so you pay{' '}
            <span className="font-semibold text-ink">{HOUSING_RENT_PER_WEEK}/week</span> in rent
            (shown as Housing in the ledger).
          </>
        )}
      </p>
    </Panel>
  )
}

/**
 * EL DÍA DE PAGO: la nómina cae cada día de juego múltiplo de 7, atada al reloj del mundo y no a la fecha de
 * fichaje; el siguiente es el primer múltiplo de 7 por delante del de hoy, que ya está procesado. Su día, en
 * palabras de la temporada (`Day 43`, con la suya si cae en la siguiente), y nunca `GD` (§4.10).
 */
function nextPayday(gameDay: number): { readonly day: number; readonly text: string } {
  const day = (Math.floor(gameDay / 7) + 1) * 7
  const hoy = seasonPosition(gameDay)
  const cae = seasonPosition(day)
  const temporada = cae.season === hoy.season ? '' : ` · Season ${cae.season}`
  return { day, text: `Day ${cae.dayOfSeason}${temporada} · in ${plural(day - gameDay, 'day')}` }
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
  const pago =
    data.salary != null && data.gameDay != null
      ? { salary: data.salary, ...nextPayday(data.gameDay) }
      : null

  // Con el sistema (E3, §17.21; PR 21l): la cabecera en `PageHeader`; el saldo, un `Stat`, la respuesta de
  // la 27 (§7.3), y a su lado el próximo sueldo, otro, con su signo; donde iban la barra dorada, los
  // paneles cian y las cifras a mano en `emerald` y `slate`.
  return (
    <section className="space-y-4">
      <PageHeader
        title="Finances"
        status="Every salary payment and race prize is logged here. Your balance is the sum of the ledger."
      />
      <VeilNotice kind="results" />

      <Panel ariaLabel={pago === null ? 'Balance' : 'Balance and next salary'}>
        <div className="flex flex-wrap gap-x-8 gap-y-4">
          <Stat label="Balance" value={data.balance} answer />
          {pago !== null && <Stat label="Next salary" value={pago.salary} signed />}
        </div>
        {pago !== null && (
          <p className="mt-3 text-meta text-ink-2">
            Next payday: {pago.text}. Salaries are paid weekly on the world clock, not counted from
            your signing date.
          </p>
        )}
      </Panel>

      <HousingCard />

      {data.entries.length === 0 ? (
        <EmptyState text="No transactions yet. Salary lands weekly once you have a contract; prizes come from racing." />
      ) : (
        <Panel ariaLabel="Transactions" variant="bleed">
          <LedgerTable entries={data.entries} />
        </Panel>
      )}
    </section>
  )
}
