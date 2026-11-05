import { authClient } from '../auth/client'
import { aggregateNotice, hiddenStageCount } from '../domain/veil'
import { useHorizon, useHorizonRev, veilApplies } from '../queryClient'
import { Notice } from './ui/Notice'

/**
 * EL AVISO DE LOS AGREGADOS (E2, docs/retransmision.md §11.5 y §11.6; I-39, 11-m; paso 9b). Un agregado a
 * horizonte incluye todo lo que quien mira conoce y le quita solo lo que su velo esconde; la cabecera lo
 * dice con un texto que depende SOLO del horizonte: `World ranking · as you know it · 3 stages hidden` en el
 * ranking y `Results from 3 stages you haven't watched are hidden` en los demás (los premios, el salón, los
 * récords, las naciones, los equipos, las fichas y el libro de cuentas). El número es el del velo de quien
 * mira, el mismo en todas las páginas, salga o no ese corredor en esas etapas. `Manage` lleva a los ajustes
 * del alcance (`/account#spoilers`).
 *
 * Sin velo (`SPOILER_MODE` apagado, o en `admins` para un jugador), nada: la página es la de hoy. Quien lee
 * con `cs_viewer` sin sesión no recibe la lista de lo que tiene por ver (14-i), así que su aviso no lleva
 * número, y su salida es `Sign in`.
 */
export function VeilNotice({ kind }: { kind: 'ranking' | 'results' }) {
  const rev = useHorizonRev()
  const horizon = useHorizon()
  const session = authClient.useSession()
  if (!veilApplies(rev)) return null
  const text = aggregateNotice(kind, hiddenStageCount(horizon.data))
  const readingWithCookie = !session.isPending && session.data == null
  if (text === null && !readingWithCookie) return null
  return <VeilNoticeView kind={kind} text={text} />
}

/**
 * Su aspecto, con el sistema (E3, docs/visual.md §4.7; PR 21l): un `Notice` `info` fijo (`note`), con lo que
 * dice en su título y su salida en la acción; iba en una caja `amber` a mano, con un `·` antes del enlace.
 * Sin número (`text` nulo), lo que dice cada página a quien lee sin sesión.
 */
export function VeilNoticeView({
  kind,
  text,
}: {
  readonly kind: 'ranking' | 'results'
  readonly text: string | null
}) {
  if (text !== null)
    return (
      <Notice
        tone="info"
        title={text}
        role="note"
        action={{ label: 'Manage', to: '/account#spoilers' }}
      />
    )
  return (
    <Notice
      tone="info"
      title={
        kind === 'ranking'
          ? 'World ranking · as you know it'
          : "Results from stages you haven't watched are hidden"
      }
      role="note"
      action={{ label: 'Sign in', to: '/login' }}
    />
  )
}
