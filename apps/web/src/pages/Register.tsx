import { type FormEvent, useEffect, useState } from 'react'
import { authCall, useRetryWait } from '../auth/authCall'
import { authClient } from '../auth/client'
import { clearPendingEmail, readPendingEmail, writePendingEmail } from '../auth/pendingEmail'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { TextLink } from '../components/ui/TextLink'
import { type FieldProblem, registerProblem } from '../domain/entryForms'

/**
 * CREAR LA CUENTA, CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21j): la cabecera en
 * `PageHeader`; el formulario en el `Panel` que contesta a la 32 (§7.3), con cada campo en su `Field` y crearla
 * en un `Button` ocupado mientras pregunta; lo que falta lo dice su campo (`registerProblem`), y lo que dice el
 * servidor, debajo, en `role="alert"`.
 */

type Resend = 'idle' | 'sending' | 'sent' | 'failed'

const SIN_REENVIO = 'Could not send it again. Try again in a few minutes.'

/**
 * Después de registrarse: la cuenta existe pero NO hay sesión hasta confirmar el correo. Se dice
 * a qué dirección ha ido el enlace (una errata en el correo es la causa más común de «no me
 * llega») y se ofrece reenviarlo. Desde el 21j, reenviado lo dice su región de estado, que está desde el
 * principio para que el lector la oiga, y el botón sigue donde estaba: deshabilitado, el catálogo lo pinta de
 * nuevo y el foco se perdería. Si el servidor no lo manda (un límite de diez cada cinco minutos), lo dice, en
 * `role="alert"` (la revisión del 21j).
 */
export function CheckInbox({
  email,
  initialResend = 'idle',
  initialWaitS,
  onStartAgain,
}: {
  email: string
  initialResend?: Resend
  /** los segundos que quedan tras un 429: para los tests */
  initialWaitS?: number
  /** `Start again`: el correo deja de esperar y vuelve el formulario */
  onStartAgain?: () => void
}) {
  const [resend, setResend] = useState<Resend>(initialResend)
  const [fallo, setFallo] = useState(SIN_REENVIO)
  const espera = useRetryWait(initialWaitS)

  async function onResend() {
    if (resend === 'sending') return
    setResend('sending')
    const res = await authCall(() =>
      authClient.sendVerificationEmail({ email, callbackURL: '/verify-email' }),
    )
    if (res !== null) {
      // traducido por la tabla única, y tras un 429 el botón espera (docs/cuenta.md §12.3)
      setFallo(res.text ?? SIN_REENVIO)
      setResend('failed')
      if (res.retryAfterS !== null) espera.start(res.retryAfterS, () => setResend('idle'))
    } else setResend('sent')
  }

  return (
    <section className="mx-auto grid max-w-form gap-4">
      <PageHeader title="Check your inbox" />
      <Panel ariaLabel="The link we sent" answer>
        <div className="grid gap-3">
          <p className="text-body text-ink-2">
            We have sent a link to <strong className="font-semibold text-ink">{email}</strong>. Open
            it to confirm your email and start playing. It expires in one hour.
          </p>
          <p className="text-meta text-ink-2">
            Nothing there? Check the spam folder, or make sure the address above is right.
          </p>
          <Button
            onClick={() => void onResend()}
            busy={resend === 'sending'}
            busyLabel="Sending…"
            layout="justify-self-start"
            {...espera.button}
          >
            Send it again
          </Button>
          <p role="status" className="text-meta text-good empty:sr-only">
            {resend === 'sent' ? 'Sent again. Give it a minute to arrive.' : ''}
          </p>
          {resend === 'failed' && (
            <p role="alert" className="text-meta text-bad">
              {fallo}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-2">
            <p className="text-meta text-ink-2">Wrong address?</p>
            <Button
              variant="quiet"
              size="sm"
              onClick={() => {
                clearPendingEmail()
                onStartAgain?.()
              }}
            >
              Start again
            </Button>
          </div>
          <p className="text-meta text-ink-2">
            Already have an account with this email? Nothing is sent: log in or reset your password.
          </p>
        </div>
      </Panel>
      <p className="text-meta text-ink-2">
        Already confirmed?{' '}
        <TextLink to="/login" inline>
          Log in
        </TextLink>
      </p>
    </section>
  )
}

interface RegisterState {
  readonly problem: FieldProblem<'email' | 'password'> | null
  readonly error: string | null
  /** el correo que espera confirmación: con él, `CheckInbox` */
  readonly pending: string | null
  /** los segundos que quedan tras un 429 */
  readonly waitS: number
}

export function Register({ initial = {} }: { initial?: Partial<RegisterState> } = {}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [problem, setProblem] = useState(initial.problem ?? null)
  const [error, setError] = useState<string | null>(initial.error ?? null)
  const [loading, setLoading] = useState(false)
  // sobrevive a recargar y a volver atrás: el correo, en `cs.pendingEmail` (docs/cuenta.md §5.3)
  const [pending, setPending] = useState<string | null>(() =>
    initial.pending !== undefined ? initial.pending : readPendingEmail(),
  )
  const espera = useRetryWait(initial.waitS)

  // el foco, al campo que falta: su error se oye con él
  useEffect(() => {
    if (problem !== null) document.getElementById(`register-${problem.field}`)?.focus()
  }, [problem])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (loading) return
    setError(null)
    const falta = registerProblem(email, password)
    setProblem(falta)
    if (falta !== null) return
    setLoading(true)
    // No se pide el nombre: better-auth requiere el campo, así que lo derivamos del email.
    const name = email.split('@')[0] ?? email
    // Confirmar el correo es OBLIGATORIO: el registro no abre sesión, la abre el enlace del correo.
    // (El servidor fija a dónde vuelve ese enlace; el callbackURL va por coherencia.)
    const fallo = await authCall(() =>
      authClient.signUp.email({
        name,
        email,
        password,
        callbackURL: '/verify-email',
      }),
    )
    setLoading(false)
    if (fallo !== null) {
      setError(fallo.text)
      if (fallo.retryAfterS !== null) espera.start(fallo.retryAfterS, () => setError(null))
      return
    }
    // Aunque el correo ya tuviera cuenta, better-auth responde igual (para no revelar quién está
    // registrado), así que la pantalla también es la misma.
    writePendingEmail(email)
    setPending(email)
  }

  if (pending !== null)
    return (
      <CheckInbox
        email={pending}
        onStartAgain={() => {
          // el formulario vuelve con la dirección de antes, para corregirla
          setEmail(pending)
          setPending(null)
        }}
      />
    )

  const errorOf = (field: 'email' | 'password') =>
    problem?.field === field ? { error: problem.msg } : {}

  return (
    <section className="mx-auto grid max-w-form gap-4">
      <PageHeader title="Create your account" status="Start building your rider." />
      <Panel ariaLabel="Your email and password" answer>
        <form onSubmit={onSubmit} className="grid gap-3">
          <Field
            kind="input"
            type="email"
            id="register-email"
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
            id="register-password"
            label="Password"
            autoComplete="new-password"
            reveal
            help="At least 8 characters."
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
          <Button
            variant="primary"
            type="submit"
            busy={loading}
            busyLabel="Creating…"
            {...espera.button}
          >
            Create account
          </Button>
        </form>
      </Panel>
      <p className="text-meta text-ink-2">
        Already have an account?{' '}
        <TextLink to="/login" inline>
          Log in
        </TextLink>
      </p>
    </section>
  )
}
