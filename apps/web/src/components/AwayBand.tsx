import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AWAY_KEY, WELCOME_BACK_KEY, deleteAway, getAway } from '../api/away'
import { useSessionState } from '../auth/useSessionState'
import { shortDate } from '../domain/accountDates'
import { apiFailureText } from '../pages/account/AccountSubpage'
import { Notice } from './ui/Notice'

/**
 * `AwayBand` (docs/cuenta.md §14.3; DD-05 A; PR 13 de E4): un `Notice` `info` bajo la cabecera, en toda
 * pantalla con sesión mientras `awayUntil > now`, con `You're away until 3 Dec` y `End now`. Lo pinta el
 * marco (`App`) con `GET /api/me/away`, una vez por carga con la sesión. No se cierra: es la única señal de
 * que la ausencia sigue. `End now` va sin confirmación (se deshace declarándola otra vez) y deja el `Notice`
 * `good` de la vuelta; la frase de los avisos llega con el PR 14 (18-c).
 */

/** La banda sin datos, para `/_ui` y sus tests. */
export function AwayBandView({
  awayUntil,
  now,
  busy = false,
  error = null,
  onEnd,
}: {
  readonly awayUntil: string
  readonly now: Date
  readonly busy?: boolean
  readonly error?: string | null
  readonly onEnd: () => void
}) {
  return (
    <div data-ui="AwayBand" className="grid gap-2">
      <Notice
        tone="info"
        title={`You're away until ${shortDate(awayUntil, now)}`}
        action={{ label: 'End now', onClick: onEnd, busy }}
      />
      {error !== null && (
        <p role="alert" className="text-meta text-bad">
          {error}
        </p>
      )}
    </div>
  )
}

/** El `Notice` de la vuelta (§14.3): `Welcome back.`, que se cierra. */
export function BackNotice({ onDismiss }: { readonly onDismiss: () => void }) {
  return <Notice tone="good" role="status" title="Welcome back." onDismiss={onDismiss} />
}

/** Termina la ausencia y pone al día lo que depende de ella; `end` dice si fue bien, `error` por qué no. */
export function useEndAway(): {
  readonly end: () => Promise<boolean>
  readonly busy: boolean
  readonly error: string | null
} {
  const client = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function end(): Promise<boolean> {
    if (busy) return false
    setBusy(true)
    setError(null)
    try {
      await deleteAway()
    } catch (err) {
      setError(apiFailureText(err))
      setBusy(false)
      return false
    }
    await Promise.all([
      client.invalidateQueries({ queryKey: AWAY_KEY }),
      client.invalidateQueries({ queryKey: WELCOME_BACK_KEY }),
    ])
    setBusy(false)
    return true
  }
  return { end, busy, error }
}

export function AwayBand() {
  const { state } = useSessionState()
  const away = useQuery({
    queryKey: AWAY_KEY,
    queryFn: getAway,
    enabled: state === 'signed-in',
    staleTime: Infinity,
    retry: false,
  })
  const { end, busy, error } = useEndAway()
  const [vuelto, setVuelto] = useState(false)
  const now = new Date()
  // las dos van juntas (`users_away_pair`): sin la salida no hay ausencia que enseñar
  const hasta = away.data && away.data.awaySince !== null ? away.data.awayUntil : null
  if (vuelto)
    return (
      <div className="mb-4">
        <BackNotice onDismiss={() => setVuelto(false)} />
      </div>
    )
  if (state !== 'signed-in' || hasta === null || new Date(hasta) <= now) return null
  return (
    <div className="mb-4">
      <AwayBandView
        awayUntil={hasta}
        now={now}
        busy={busy}
        error={error}
        onEnd={() => void end().then((ok) => setVuelto(ok))}
      />
    </div>
  )
}
