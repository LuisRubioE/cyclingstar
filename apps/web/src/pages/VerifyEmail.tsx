import { type FormEvent, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { authCall, useRetryWait } from '../auth/authCall'
import { authClient } from '../auth/client'
import { confirmEmail } from '../auth/confirmEmail'
import { useSessionState } from '../auth/useSessionState'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Notice } from '../components/ui/Notice'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { LoadingState } from '../components/ui/QueryView'
import { authErrorText } from '../domain/authErrors'
import { forgetLinkToken, readEmailLink } from '../domain/authLinks'
import { emailProblem } from '../domain/entryForms'

/**
 * LA PÁGINA DE BOTÓN DE CONFIRMAR EL CORREO (docs/cuenta.md §5.2; D-12, I-04, 5-h; PR 8 de E4).
 *
 * El correo trae `/verify-email#token=…`. Abrirlo no cambia nada: la página lee el token del fragmento, lo
 * borra de la barra y espera a que se pulse `Confirm my email`, que manda el token en el cuerpo de
 * `POST /api/account/verify-email`. Un escáner de enlaces que siga el correo carga la página y no pulsa.
 * Al 200 la API deja la sesión en este navegador, y la página pregunta por ella antes de hablar: no dice
 * `You're in` a quien no lo está (mapa 05 §5, captura 22).
 *
 * El caducado o malo, y el enlace sin token, piden el correo y mandan otro con `send-verification-email`
 * sin sesión, que responde siempre lo mismo. Los enlaces viejos (`LEGACY_LINK_GRACE_DAYS`, hasta el PR 19)
 * pasan por la API y llegan con `?error=…` o, confirmados, sin nada y con la sesión puesta.
 *
 * Es una página PÚBLICA a propósito: el enlace se abre a menudo desde el móvil o desde otro navegador.
 */

/** Dónde está la página: antes de pulsar, pulsado, confirmado, el enlace gastado o el incompleto. */
export type VerifyPhase = 'ready' | 'busy' | 'confirmed' | 'expired' | 'incomplete'

interface VerifyState {
  readonly phase: VerifyPhase
  /** tras confirmar: si `get-session` trajo la sesión */
  readonly signedIn: boolean
  /** el fallo que no es del enlace (sin red, 429…), en `role="alert"` */
  readonly error: string | null
  /** `Send me a new link` ya pedido */
  readonly sent: boolean
}

const PEDIDO =
  'If that address has an approved account waiting for confirmation, a new link is on its way.'

export function VerifyEmail({ initial = {} }: { initial?: Partial<VerifyState> } = {}) {
  const location = useLocation()
  // el token se lee una vez: la barra lo pierde enseguida (`forgetLinkToken`)
  const [link] = useState(() => readEmailLink(location.hash, location.search))
  const { state, isPending } = useSessionState()
  const [phase, setPhase] = useState<VerifyPhase | null>(
    initial.phase ?? (link.kind === 'token' ? 'ready' : link.kind === 'error' ? 'expired' : null),
  )
  const [signedInAfter, setSignedInAfter] = useState<boolean | null>(initial.signedIn ?? null)
  const [error, setError] = useState<string | null>(initial.error ?? null)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(initial.sent ?? false)
  const espera = useRetryWait()

  useEffect(() => {
    forgetLinkToken(window.location, window.history)
  }, [])

  // sin token ni error: el enlace viejo confirmado deja la sesión puesta; sin ella, el enlace está incompleto
  const fase: VerifyPhase | null =
    phase ?? (isPending ? null : state === 'signed-in' ? 'confirmed' : 'incomplete')
  if (fase === null) return <LoadingState label="your session" />
  const dentro = signedInAfter ?? state === 'signed-in'

  async function onConfirm() {
    if (link.kind !== 'token' || fase !== 'ready') return
    setError(null)
    setPhase('busy')
    const fallo = await confirmEmail(link.token)
    if (fallo === null) {
      // la sesión, antes de hablar (§5.2): la que la API acaba de dejar, o ninguna si ya estaba confirmada
      const { data } = await authClient.getSession()
      authClient.$store.notify('$sessionSignal')
      setSignedInAfter(data !== null && data !== undefined)
      setPhase('confirmed')
      return
    }
    if (fallo.code === 'TOKEN_EXPIRED' || fallo.code === 'INVALID_TOKEN') {
      setPhase('expired')
      return
    }
    setError(fallo.text)
    setPhase('ready')
    if (fallo.retryAfterS !== null) espera.start(fallo.retryAfterS, () => setError(null))
  }

  async function onResend(event: FormEvent) {
    event.preventDefault()
    if (sending) return
    setError(null)
    const falta = emailProblem(email)
    setEmailError(falta?.msg ?? null)
    if (falta !== null) return
    setSending(true)
    const fallo = await authCall(() =>
      authClient.sendVerificationEmail({ email, callbackURL: '/verify-email' }),
    )
    setSending(false)
    if (fallo !== null) {
      setError(fallo.text)
      if (fallo.retryAfterS !== null) espera.start(fallo.retryAfterS, () => setError(null))
      return
    }
    setSent(true)
  }

  const alerta =
    error !== null ? (
      <p role="alert" className="text-meta text-bad">
        {error}
      </p>
    ) : null

  const pedirOtro = (
    <form onSubmit={onResend} className="grid gap-3">
      <Field
        kind="input"
        type="email"
        id="verify-email-address"
        label="Email"
        autoComplete="email"
        value={email}
        onChange={(v) => {
          setEmail(v)
          setEmailError(null)
        }}
        {...(emailError !== null ? { error: emailError } : {})}
      />
      <div role="status">{sent && <p className="text-meta text-ink-2">{PEDIDO}</p>}</div>
      {alerta}
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" type="submit" busy={sending} {...espera.button}>
          Send me a new link
        </Button>
        {fase === 'expired' && <Button to="/login">Log in</Button>}
      </div>
    </form>
  )

  return (
    <section className="mx-auto grid max-w-form gap-4">
      <PageHeader title="Confirm your email" />
      <Panel ariaLabel="The link from your email" answer>
        <div className="grid gap-3">
          {fase === 'ready' || fase === 'busy' ? (
            <>
              <p className="text-body text-ink-2">
                Tap the button to finish creating your account.
              </p>
              {alerta}
              <Button
                variant="primary"
                layout="justify-self-start"
                busy={fase === 'busy'}
                busyLabel="Confirming…"
                onClick={() => void onConfirm()}
                {...espera.button}
              >
                Confirm my email
              </Button>
            </>
          ) : fase === 'confirmed' ? (
            <>
              <Notice tone="good" title="Email confirmed" role="status">
                {dentro ? "You're in. Let's create your rider." : 'Log in to start playing.'}
              </Notice>
              {dentro ? (
                <Button to="/me/profile" variant="primary" layout="justify-self-start">
                  Continue
                </Button>
              ) : (
                <Button to="/login" variant="primary" layout="justify-self-start">
                  Log in
                </Button>
              )}
            </>
          ) : (
            <>
              <p role="alert" className="text-body text-bad">
                {fase === 'expired'
                  ? authErrorText({ code: 'INVALID_TOKEN' }, 401, null)
                  : 'This link is incomplete.'}
              </p>
              <p className="text-meta text-ink-2">
                {fase === 'expired'
                  ? "Enter your email and we'll send you a new one."
                  : 'Open it again from the email, or ask for a new one.'}
              </p>
              {pedirOtro}
            </>
          )}
        </div>
      </Panel>
    </section>
  )
}
