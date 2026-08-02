import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TeamLink } from '../components/TeamLink'
import { type Offer, fetchMarket, respondToOffer, roleLabel } from '../api/market'

const DIVISION_BADGE: Record<string, string> = {
  WT: 'bg-indigo-100 text-indigo-700',
  PRS: 'bg-sky-100 text-sky-700',
  CON: 'bg-slate-100 text-slate-600',
}

function money(n: number): string {
  return `${n.toLocaleString('en-US')}/wk`
}

function OfferCard({
  offer,
  onRespond,
  busy,
}: {
  offer: Offer
  onRespond: (id: string, action: 'accept' | 'reject') => void
  busy: boolean
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <TeamLink
          teamId={offer.teamId}
          name={offer.teamName}
          className="text-sm font-semibold text-slate-800"
        />
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIVISION_BADGE[offer.division] ?? ''}`}
        >
          {offer.division}
        </span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600">
        <div className="flex justify-between">
          <dt className="text-slate-400">Role</dt>
          <dd>{roleLabel(offer.role)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-400">Salary</dt>
          <dd className="tabular-nums">{money(offer.salary)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-400">Length</dt>
          <dd className="tabular-nums">
            {offer.seasons} {offer.seasons === 1 ? 'season' : 'seasons'}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt
            className="cursor-help text-slate-400 underline decoration-dotted underline-offset-2"
            title="Release clause: what another team must pay this team to sign you before your contract ends. A higher buyout means you're harder to poach."
          >
            Buyout
          </dt>
          <dd className="tabular-nums">{offer.releaseClause.toLocaleString('en-US')}</dd>
        </div>
      </dl>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onRespond(offer.id, 'accept')}
          disabled={busy}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          Sign
        </button>
        <button
          onClick={() => onRespond(offer.id, 'reject')}
          disabled={busy}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          Decline
        </button>
      </div>
    </article>
  )
}

export function Market() {
  const queryClient = useQueryClient()
  const { data, isPending, isError } = useQuery({ queryKey: ['market'], queryFn: fetchMarket })

  const respond = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'reject' }) =>
      respondToOffer(id, action),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['market'] })
      void queryClient.invalidateQueries({ queryKey: ['rider'] })
    },
  })

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the market.</p>

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transfer market</h1>
        <p className="mt-1 text-sm text-slate-500">
          As a free agent you get offers regularly — sign the one that fits your ambitions. Salary,
          role and division all matter. You only join a team once you <strong>sign</strong>; until
          then you stay a free agent.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          <strong>Buyout</strong> (release clause) is the fee another team must pay to sign you away
          before your contract ends — the higher it is, the harder you are to poach.
        </p>
      </div>

      {data.contract && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Current contract
          </h2>
          <p className="text-sm text-slate-700">
            <TeamLink
              teamId={data.contract.teamId}
              name={data.contract.teamName}
              className="font-semibold"
            />{' '}
            ({data.contract.division}) · {roleLabel(data.contract.role)} ·{' '}
            {money(data.contract.salary)} · through season {data.contract.endSeason + 1}
          </p>
        </div>
      )}

      {data.offers.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          No offers on the table right now. New ones arrive as the world advances.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.offers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              busy={respond.isPending}
              onRespond={(id, action) => respond.mutate({ id, action })}
            />
          ))}
        </div>
      )}
    </section>
  )
}
