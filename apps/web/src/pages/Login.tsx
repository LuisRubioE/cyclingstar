import { type FormEvent, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { authCall, useRetryWait } from '../auth/authCall'
import { authClient } from '../auth/client'
import { clearPendingEmail } from '../auth/pendingEmail'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Notice } from '../components/ui/Notice'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { TextLink } from '../components/ui/TextLink'
import { type Arrival, arrivalOf } from '../domain/arrivals'
import { type FieldProblem, loginProblem } from '../domain/entryForms'

/**
 * ENTRAR, CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21j): la cabecera en `PageHeader`; el
 * formulario en el `Panel` que contesta a la 31 (§7.3), con cada campo en su `Field`, el rótulo a la vista y en
 * 16 px, y entrar en un `Button` ocupado mientras pregunta. Lo que falta lo dice su campo (`loginProblem`), que
 * recibe el foco, y no el globo del navegador, salvo el del formato del correo (`type="email"`); lo que dice el
 * servidor, debajo, en `role="alert"`; y el correo sin confirmar, un `Notice` `warn` con la dirección del envío,
 * que no cambia mientras se escribe otra (la revisión del 21j).
 */

interface LoginState {
  readonly email: string
  readonly problem: FieldProblem<'email' | 'password'> | null
  readonly error: string | null
  /** el correo al que fue el enlace nuevo, el del envío; null, sin aviso */
  readonly unverified: string | null
  /** la cuenta espera que un administrador la apruebe (403 `ACCOUNT_PENDING`, docs/cuenta.md §4.9) */
  readonly pending: boolean
  /** el aviso de llegada (docs/cuenta.md §12.4): el de la contraseña nueva; si no, el del estado del router */
  readonly arrival: Arrival | null
  /** los segundos que quedan tras un 429 */
  readonly waitS: number
}

export function Login({ initial = {} }: { initial?: Partial<LoginState> } = {}) {
  const navigate = useNavigate()
  const location = useLocation()
  const arrival = initial.arrival ?? arrivalOf(location.state)
  const espera = useRetryWait(initial.waitS)
  const [email, setEmail] = useState(initial.email ?? '')
  const [password, setPassword] = useState('')
  const [problem, setProblem] = useState(initial.problem ?? null)
  const [error, setError] = useState<string | null>(initial.error ?? null)
  const [unverified, setUnverified] = useState<string | null>(initial.unverified ?? null)
  const [pending, setPending] = useState(initial.pending ?? false)
  const [loading, setLoading] = useState(false)

  // el foco, al campo que falta: su error se oye con él
  useEffect(() => {
    if (problem !== null) document.getElementById(`login-${problem.field}`)?.focus()
  }, [problem])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (loading) return
    setError(null)
    setUnverified(null)
    setPending(false)
    const falta = loginProblem(email, password)
    setProblem(falta)
    if (falta !== null) return
    setLoading(true)
    const fallo = await authCall(() => authClient.signIn.email({ email, password }))
    setLoading(false)
    if (fallo !== null) {
      // Sin correo confirmado no se entra. El servidor ya ha mandado un enlace nuevo al rechazar
      // el intento (`sendOnSignIn`), así que aquí sólo hay que decirlo.
      if (fallo.code === 'EMAIL_NOT_VERIFIED') {
        setUnverified(email)
        return
      }
      // La contraseña era buena, pero nadie la ha aprobado todavía: no sale ningún correo (§4.9).
      if (fallo.code === 'ACCOUNT_PENDING') {
        setPending(true)
        return
      }
      // un 429 dice cuánto esperar, nunca «contraseña mala» (§12.3, captura 35)
      setError(fallo.text)
      if (fallo.retryAfterS !== null) espera.start(fallo.retryAfterS, () => setError(null))
      return
    }
    // ya entró: el correo que esperaba confirmación deja de esperar (CheckInbox)
    clearPendingEmail()
    navigate('/me/profile')
  }

  const errorOf = (field: 'email' | 'password') =>
    problem?.field === field ? { error: problem.msg } : {}

  return (
    <section className="mx-auto grid max-w-form gap-4">
      <PageHeader title="Log in" status="Welcome back." />
      {arrival !== null && (
        <Notice tone={arrival.tone ?? 'good'} title={arrival.title} role="status">
          {arrival.body}
        </Notice>
      )}
      <Panel ariaLabel="Your email and password" answer>
        <form onSubmit={onSubmit} className="grid gap-3">
          <Field
            kind="input"
            type="email"
            id="login-email"
            label="Email"
            autoComplete="email"
            value={email}
            onChange={(v) => {
              setEmail(v)
              setProblem(null)
            }}
            {...errorOf('email')}
          />
          <Field
            kind="input"
            type="password"
            id="login-password"
            label="Password"
            autoComplete="current-password"
            reveal
            value={password}
            onChange={(v) => {
              setPassword(v)
              setProblem(null)
            }}
            {...errorOf('password')}
          />
          {error !== null && (
            <p role="alert" className="text-meta text-bad">
              {error}
            </p>
          )}
          {pending && (
            <Notice tone="info" title="Your account is waiting for approval" role="alert">
              An administrator reviews new accounts by hand. When yours is approved, we&apos;ll
              email you a link to finish signing up.
            </Notice>
          )}
          {unverified !== null && (
            <Notice tone="warn" title="Confirm your email first" role="alert">
              {`We have just sent a new link to ${unverified}. Open it and you will be signed in. Check the spam folder if it does not show up.`}
            </Notice>
          )}
          <TextLink to="/forgot-password" layout="justify-self-end">
            Forgot your password?
          </TextLink>
          <Button
            variant="primary"
            type="submit"
            busy={loading}
            busyLabel="Logging in…"
            {...espera.button}
          >
            Log in
          </Button>
        </form>
      </Panel>
      <p className="text-meta text-ink-2">
        No account yet?{' '}
        <TextLink to="/register" inline>
          Sign up
        </TextLink>
      </p>
    </section>
  )
}
