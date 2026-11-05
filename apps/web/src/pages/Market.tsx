import { COUNTRIES } from '@cyclingstar/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { type Offer, fetchMarket, respondToOffer } from '../api/market'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Flag } from '../components/ui/Flag'
import { InfoButton } from '../components/ui/InfoButton'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { QueryView } from '../components/ui/QueryView'
import { TextLink } from '../components/ui/TextLink'
import { roleLabel } from '../domain/labels'
import { plural } from '../domain/words'

/**
 * EL MERCADO, CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21l): la cabecera en `PageHeader`;
 * el contrato y cada oferta en su `Panel`, con su equipo en el título y su ficha en un `TextLink`, y lo que
 * ofrece en un `dl`, con la división en palabras; el porqué de la cláusula y de la casa, en un `InfoButton`,
 * donde iba un `title` que el dedo no abre (ui/4); y firmar y rechazar, `Button` del catálogo. Iban en los
 * paneles cian de antes, con la marca de la división en una pastilla de colores, `InfoRow` y botones a mano,
 * y la casa con su `🏠` (3-d). Responde (§7.3) el contrato, si lo hay; si no, la primera oferta; sin nada, su
 * vacío.
 */

const DIVISION_LABEL: Record<string, string> = {
  WT: 'World Tour',
  PRS: 'Pro Series',
  CON: 'Continental',
}

const division = (code: string): string => DIVISION_LABEL[code] ?? code

function money(n: number): string {
  return `${n.toLocaleString('en-US')}/wk`
}

/** Una fila del `dl`: su rótulo encima, en `meta` 600, y lo que dice debajo; el porqué, junto al rótulo. */
function Dato({
  label,
  why,
  children,
}: {
  readonly label: string
  readonly why?: { readonly about: string; readonly text: string }
  readonly children: ReactNode
}) {
  return (
    <div className="grid content-start gap-1">
      <dt className="flex flex-wrap items-center gap-x-1 text-meta font-semibold text-ink">
        {label}
        {why !== undefined && <InfoButton label={why.about}>{why.text}</InfoButton>}
      </dt>
      <dd className="text-body text-ink">{children}</dd>
    </div>
  )
}

/** Lo que está pasando con las ofertas: cuál y qué se contesta, y si falló. */
interface Respuesta {
  readonly pending: { readonly id: string; readonly action: 'accept' | 'reject' } | null
  readonly failedId: string | null
}

function OfferCard({
  offer,
  answer,
  respuesta,
  onRespond,
}: {
  readonly offer: Offer
  readonly answer: boolean
  readonly respuesta: Respuesta
  readonly onRespond: (id: string, action: 'accept' | 'reject') => void
}) {
  const ocupada = (action: 'accept' | 'reject') =>
    respuesta.pending?.id === offer.id && respuesta.pending.action === action
  return (
    <Panel
      title={offer.teamName}
      answer={answer}
      action={<TextLink to={`/world/teams/${offer.teamId}`}>Team page</TextLink>}
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Dato label="Division">{division(offer.division)}</Dato>
        <Dato label="Role">{roleLabel(offer.role)}</Dato>
        <Dato label="Salary">
          <span className="tabular-nums">{money(offer.salary)}</span>
        </Dato>
        <Dato label="Length">
          <span className="tabular-nums">{plural(offer.seasons, 'season')}</span>
        </Dato>
        <Dato
          label="Buyout"
          why={{
            about: 'About the buyout',
            text: "Release clause: what another team must pay this team to sign you before your contract ends. A higher buyout means you're harder to poach.",
          }}
        >
          <span className="tabular-nums">{offer.releaseClause.toLocaleString('en-US')}</span>
        </Dato>
        {offer.relocatesTo && (
          <Dato label="Relocate to">
            <span className="inline-flex items-center gap-2">
              {/* su nombre va al lado: la bandera, para el ojo */}
              <span aria-hidden="true">
                <Flag country={offer.relocatesTo} />
              </span>
              {COUNTRIES.find((c) => c.code === offer.relocatesTo)?.name ?? offer.relocatesTo}
            </span>
          </Dato>
        )}
        {offer.payHousing && (
          <Dato
            label="Housing"
            why={{
              about: 'About the housing',
              text: 'This is an overseas move. The team covers your housing rent abroad, so the salary is a little lower but you pay no rent — you keep the same cash and lose the housing cost.',
            }}
          >
            Team pays rent
          </Dato>
        )}
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="primary"
          busy={ocupada('accept')}
          busyLabel="Signing…"
          onClick={() => onRespond(offer.id, 'accept')}
        >
          Sign
        </Button>
        <Button
          variant="secondary"
          busy={ocupada('reject')}
          busyLabel="Declining…"
          onClick={() => onRespond(offer.id, 'reject')}
        >
          Decline
        </Button>
      </div>
      {respuesta.failedId === offer.id && (
        <p role="alert" className="mt-2 text-meta text-bad">
          Could not answer this offer. Try again.
        </p>
      )}
    </Panel>
  )
}

export function Market() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['market'], queryFn: fetchMarket })

  const respond = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'reject' }) =>
      respondToOffer(id, action),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['market'] })
      void queryClient.invalidateQueries({ queryKey: ['rider'] })
    },
  })

  // Los estados, con `QueryView` (E3, PR 10).
  if (query.data === undefined)
    return <QueryView query={query} label="the market" skeleton={{ kind: 'panel' }} />
  const data = query.data

  const respuesta: Respuesta = {
    pending: respond.isPending ? (respond.variables ?? null) : null,
    failedId: respond.isError ? (respond.variables?.id ?? null) : null,
  }
  // una sola respuesta a la vez, como cuando los botones se deshabilitaban mientras tanto
  const onRespond = (id: string, action: 'accept' | 'reject') => {
    if (!respond.isPending) respond.mutate({ id, action })
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Transfer market" />
      <p className="text-body text-ink-2">
        As a free agent you get offers regularly — sign the one that fits your ambitions. Salary,
        role and division all matter. You only join a team once you{' '}
        <strong className="font-semibold text-ink">sign</strong>; until then you stay a free agent.
      </p>

      {data.contract && (
        <Panel title="Current contract" answer>
          <p className="text-body text-ink">
            <TextLink to={`/world/teams/${data.contract.teamId}`} inline>
              {data.contract.teamName}
            </TextLink>
            {` · ${division(data.contract.division)} · ${roleLabel(data.contract.role)} · ${money(data.contract.salary)} · through season ${data.contract.endSeason + 1}`}
          </p>
        </Panel>
      )}

      {data.offers.length === 0 ? (
        <EmptyState
          text="No offers on the table right now. New ones arrive as the world advances."
          answer={!data.contract}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.offers.map((offer, i) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              answer={!data.contract && i === 0}
              respuesta={respuesta}
              onRespond={onRespond}
            />
          ))}
        </div>
      )}
    </section>
  )
}
