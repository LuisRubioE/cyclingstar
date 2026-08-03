import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Panel, SectionBar, InfoRow } from '../components/Panel'
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
    <Panel
      title={
        <TeamLink
          teamId={offer.teamId}
          name={offer.teamName}
          className="text-sm font-semibold text-white"
        />
      }
      action={
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIVISION_BADGE[offer.division] ?? ''}`}
        >
          {offer.division}
        </span>
      }
    >
      <div className="text-sm">
        <InfoRow label="Role">{roleLabel(offer.role)}</InfoRow>
        <InfoRow label="Salary">
          <span className="tabular-nums">{money(offer.salary)}</span>
        </InfoRow>
        <InfoRow label="Length">
          <span className="tabular-nums">
            {offer.seasons} {offer.seasons === 1 ? 'season' : 'seasons'}
          </span>
        </InfoRow>
        <InfoRow
          label={
            <span
              className="cursor-help underline decoration-dotted underline-offset-2"
              title="Release clause: what another team must pay this team to sign you before your contract ends. A higher buyout means you're harder to poach."
            >
              Buyout
            </span>
          }
        >
          <span className="tabular-nums">{offer.releaseClause.toLocaleString('en-US')}</span>
        </InfoRow>
        {offer.payHousing && (
          <InfoRow
            label={
              <span
                className="cursor-help underline decoration-dotted underline-offset-2"
                title="This is an overseas move. The team covers your housing rent abroad, so the salary is a little lower but you pay no rent — you keep the same cash and lose the housing cost."
              >
                Housing
              </span>
            }
          >
            <span className="font-medium text-emerald-600">🏠 Team pays rent</span>
          </InfoRow>
        )}
      </div>
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
    </Panel>
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
    <section className="space-y-4">
      <SectionBar>Transfer market</SectionBar>
      <div>
        <p className="text-sm text-slate-500">
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
        <Panel title="Current contract">
          <p className="text-sm text-slate-700">
            <TeamLink
              teamId={data.contract.teamId}
              name={data.contract.teamName}
              className="font-semibold"
            />{' '}
            ({data.contract.division}) · {roleLabel(data.contract.role)} ·{' '}
            {money(data.contract.salary)} · through season {data.contract.endSeason + 1}
          </p>
        </Panel>
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
