import { type WelcomeBack as WelcomeBackData, welcomeBackLines } from '@cyclingstar/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { WELCOME_BACK_KEY, deleteWelcomeBack, getWelcomeBack } from '../api/away'
import { useSessionState } from '../auth/useSessionState'
import { shortDate } from '../domain/accountDates'
import { Notice } from './ui/Notice'

/**
 * `Welcome back` (docs/cuenta.md §14.5; D-55; PR 13 de E4): un `Notice` `info` que se cierra, en la portada,
 * encima de `While you were away` de E2 y sin repetirlo. Sale tras una ausencia declarada que ha terminado,
 * o tras `RETURN_NOTICE_AFTER_DAYS` días o más sin visita (`welcome_back_from`, 14-d). Las cifras salen del
 * diario del corredor y de sus ofertas; sin corredor, solo los días. Cerrarlo llama a
 * `DELETE /api/me/welcome-back`. Las frases de la regla del mes llegan con el PR 15.
 */

/** El aviso sin datos de la red, para `/_ui` y sus tests. */
export function WelcomeBackView({
  data,
  now,
  onDismiss,
}: {
  readonly data: WelcomeBackData
  readonly now: Date
  readonly onDismiss: () => void
}) {
  const lineas = welcomeBackLines(data, (iso) => shortDate(iso, now))
  return (
    <div data-ui="WelcomeBack" data-variant={data.rider === null ? 'no-rider' : 'rider'}>
      <Notice
        tone="info"
        title="Welcome back"
        onDismiss={onDismiss}
        {...(data.rider !== null ? { action: { label: 'See your rider', to: '/me/profile' } } : {})}
      >
        {lineas.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </Notice>
    </div>
  )
}

export function WelcomeBack() {
  const { state } = useSessionState()
  const client = useQueryClient()
  const q = useQuery({
    queryKey: WELCOME_BACK_KEY,
    queryFn: getWelcomeBack,
    enabled: state === 'signed-in',
    retry: false,
  })
  const data = q.data?.welcomeBack ?? null
  if (data === null) return null
  return (
    <WelcomeBackView
      data={data}
      now={new Date()}
      onDismiss={() => {
        // se va al momento; si el DELETE falla, vuelve en la próxima carga, que no es grave
        client.setQueryData(WELCOME_BACK_KEY, { ok: true as const, welcomeBack: null })
        deleteWelcomeBack().catch(() => undefined)
      }}
    />
  )
}
