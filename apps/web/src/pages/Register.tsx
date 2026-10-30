import { type FormEvent, useState } from 'react'
import { authClient } from '../auth/client'
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

type Resend = 'idle' | 'sending' | 'sent'

/**
 * Después de registrarse: la cuenta existe pero NO hay sesión hasta confirmar el correo. Se dice
 * a qué dirección ha ido el enlace (una errata en el correo es la causa más común de «no me
 * llega») y se ofrece reenviarlo. Desde el 21j, reenviado lo dice su región de estado, que está desde el
 * principio para que el lector la oiga, y el botón sigue donde estaba: deshabilitado, el catálogo lo pinta de
 * nuevo y el foco se perdería.
 */
export function CheckInbox({
  email,
  initialResend = 'idle',
}: {
  email: string
  initialResend?: Resend
}) {
  const [resend, setResend] = useState<Resend>(initialResend)

  async function onResend() {
    setResend('sending')
    await authClient.sendVerificationEmail({ email, callbackURL: '/verify-email' })
    setResend('sent')
  }

  return (
    <section className="mx-auto grid max-w-form gap-4">
      <PageHeader title="Check your inbox" />
      <Panel ariaLabel="Check your inbox" answer>
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
          >
            Send it again
          </Button>
          <p role="status" className="text-meta text-good empty:hidden">
            {resend === 'sent' ? 'Sent again. Give it a minute to arrive.' : ''}
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
}

export function Register({ initial = {} }: { initial?: Partial<RegisterState> } = {}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [problem, setProblem] = useState(initial.problem ?? null)
  const [error, setError] = useState<string | null>(initial.error ?? null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

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
    const result = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: '/verify-email',
    })
    setLoading(false)
    if (result.error) {
      setError(result.error.message ?? 'Could not create your account.')
      return
    }
    // Aunque el correo ya tuviera cuenta, better-auth responde igual (para no revelar quién está
    // registrado), así que la pantalla también es la misma.
    setDone(true)
  }

  if (done) return <CheckInbox email={email} />

  const errorOf = (field: 'email' | 'password') =>
    problem?.field === field ? { error: problem.msg } : {}

  return (
    <section className="mx-auto grid max-w-form gap-4">
      <PageHeader title="Create your account" status="Start building your rider." />
      <Panel ariaLabel="Create your account" answer>
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
          <Button variant="primary" type="submit" busy={loading} busyLabel="Creating…">
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
