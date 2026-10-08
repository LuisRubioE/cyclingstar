import { Link } from 'react-router-dom'
import { authClient } from '../auth/client'
import { aggregateNotice, hiddenStageCount } from '../domain/veil'
import { useHorizon, useHorizonRev, veilApplies } from '../queryClient'

/**
 * EL AVISO DE LOS AGREGADOS (E2, docs/retransmision.md §11.5 y §11.6; I-39, 11-m; paso 9b). Un agregado a
 * horizonte incluye todo lo que quien mira conoce y le quita solo lo que su velo esconde; la cabecera lo
 * dice con un texto que depende SOLO del horizonte: `World ranking · as you know it · 3 stages hidden ·
 * Manage` en el ranking y `Results from 3 stages you haven't watched are hidden · Manage` en los demás (los
 * premios, el salón, los récords, las naciones, los equipos, las fichas y el libro de cuentas). El número es
 * el del velo de quien mira, el mismo en todas las páginas, salga o no ese corredor en esas etapas.
 * `Manage` lleva a los ajustes del alcance (`/account#spoilers`).
 *
 * Sin velo (`SPOILER_MODE` apagado, o en `admins` para un jugador), nada: la página es la de hoy. Quien lee
 * con `cs_viewer` sin sesión no recibe la lista de lo que tiene por ver (14-i), así que su aviso no lleva
 * número: `… as you know it · Sign in`.
 */
export function VeilNotice({ kind }: { kind: 'ranking' | 'results' }) {
  const rev = useHorizonRev()
  const horizon = useHorizon()
  const session = authClient.useSession()
  if (!veilApplies(rev)) return null
  const text = aggregateNotice(kind, hiddenStageCount(horizon.data))
  const readingWithCookie = !session.isPending && session.data == null
  if (text === null && !readingWithCookie) return null
  return (
    <p
      role="note"
      className="flex flex-wrap items-center gap-x-1.5 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200"
    >
      {text !== null ? (
        <>
          <span>{text}</span>
          <span aria-hidden>·</span>
          <Link to="/account#spoilers" className="font-medium underline">
            Manage
          </Link>
        </>
      ) : (
        <>
          <span>
            {kind === 'ranking'
              ? 'World ranking · as you know it'
              : "Results from stages you haven't watched are hidden"}
          </span>
          <span aria-hidden>·</span>
          <Link to="/login" className="font-medium underline">
            Sign in
          </Link>
        </>
      )}
    </p>
  )
}
