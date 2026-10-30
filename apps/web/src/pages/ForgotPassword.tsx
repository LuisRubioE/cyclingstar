import { type FormEvent, useState } from 'react'
import { authClient } from '../auth/client'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { TextLink } from '../components/ui/TextLink'
import { type FieldProblem, emailProblem } from '../domain/entryForms'

/**
 * «He olvidado mi contraseña». Hasta ahora no existía: sin envío de correo no había a dónde
 * mandar el enlace, y quien perdía su contraseña perdía su equipo.
 *
 * La respuesta es SIEMPRE la misma, exista o no la cuenta. Un «no hay nadie con ese correo» sería
 * un oráculo para saber quién está registrado, y la API lo trata igual por el mismo motivo.
 *
 * Con el sistema desde el 21j (E3, docs/visual.md §17.21): la cabecera en `PageHeader`; el correo en su
 * `Field`, dentro del `Panel` que contesta, y pedirlo en un `Button` ocupado mientras pregunta; y pedido, lo que
 * pasa ahora, en una región de estado que está desde el principio, para que el lector la oiga.
 */

interface ForgotState {
  readonly email: string
  readonly problem: FieldProblem<'email'> | null
  readonly sent: boolean
}

export function ForgotPassword({ initial = {} }: { initial?: Partial<ForgotState> } = {}) {
  const [email, setEmail] = useState(initial.email ?? '')
  const [problem, setProblem] = useState(initial.problem ?? null)
  const [sent, setSent] = useState(initial.sent ?? false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (loading) return
    const falta = emailProblem(email)
    setProblem(falta)
    if (falta !== null) return
    setLoading(true)
    // redirectTo es la página de esta misma web donde el servidor deja al usuario con el token.
    await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' })
    setLoading(false)
    setSent(true)
  }

  return (
    <section className="mx-auto grid max-w-form gap-4">
      <PageHeader
        title="Forgot your password?"
        status="Give us your email and we will send you a link to set a new one."
      />
      <Panel ariaLabel="Forgot your password?" answer>
        <div className="grid gap-3">
          <div role="status" className="grid gap-2 empty:hidden">
            {sent && (
              <>
                <p className="text-body text-ink-2">
                  If there is an account for{' '}
                  <strong className="font-semibold text-ink">{email}</strong>, a link to choose a
                  new password is on its way. It expires in one hour.
                </p>
                <p className="text-meta text-ink-2">
                  Nothing in your inbox? Check the spam folder before asking for another one.
                </p>
              </>
            )}
          </div>
          {!sent && (
            <form onSubmit={onSubmit} className="grid gap-3">
              <Field
                kind="input"
                type="email"
                id="forgot-email"
                label="Email"
                autoComplete="email"
                value={email}
                onChange={(v) => {
                  setEmail(v)
                  setProblem(null)
                }}
                {...(problem !== null ? { error: problem.msg } : {})}
              />
              <Button variant="primary" type="submit" busy={loading} busyLabel="Sending…">
                Send me a link
              </Button>
            </form>
          )}
        </div>
      </Panel>
      <TextLink to="/login">Back to log in</TextLink>
    </section>
  )
}
