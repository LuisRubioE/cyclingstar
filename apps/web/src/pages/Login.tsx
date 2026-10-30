import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authClient } from '../auth/client'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Notice } from '../components/ui/Notice'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { TextLink } from '../components/ui/TextLink'
import { type FieldProblem, loginProblem } from '../domain/entryForms'

/**
 * ENTRAR, CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21j): la cabecera en `PageHeader`; el
 * formulario en el `Panel` que contesta a la 31 (§7.3), con cada campo en su `Field`, el rótulo a la vista y en
 * 16 px, y entrar en un `Button` ocupado mientras pregunta. Lo que falta lo dice su campo (`loginProblem`), no el
 * globo del navegador; lo que dice el servidor, debajo, en `role="alert"`; y el correo sin confirmar, un
 * `Notice` `warn`.
 */

interface LoginState {
  readonly email: string
  readonly problem: FieldProblem<'email' | 'password'> | null
  readonly error: string | null
  readonly unverified: boolean
}

export function Login({ initial = {} }: { initial?: Partial<LoginState> } = {}) {
  const navigate = useNavigate()
  const [email, setEmail] = useState(initial.email ?? '')
  const [password, setPassword] = useState('')
  const [problem, setProblem] = useState(initial.problem ?? null)
  const [error, setError] = useState<string | null>(initial.error ?? null)
  const [unverified, setUnverified] = useState(initial.unverified ?? false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (loading) return
    setError(null)
    setUnverified(false)
    const falta = loginProblem(email, password)
    setProblem(falta)
    if (falta !== null) return
    setLoading(true)
    const result = await authClient.signIn.email({ email, password })
    setLoading(false)
    if (result.error) {
      // Sin correo confirmado no se entra. El servidor ya ha mandado un enlace nuevo al rechazar
      // el intento (`sendOnSignIn`), así que aquí sólo hay que decirlo.
      if (result.error.code === 'EMAIL_NOT_VERIFIED') {
        setUnverified(true)
        return
      }
      setError(result.error.message ?? 'Wrong email or password.')
      return
    }
    navigate('/me/profile')
  }

  const errorOf = (field: 'email' | 'password') =>
    problem?.field === field ? { error: problem.msg } : {}

  return (
    <section className="mx-auto grid max-w-form gap-4">
      <PageHeader title="Log in" status="Welcome back." />
      <Panel ariaLabel="Log in" answer>
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
          {unverified && (
            <Notice tone="warn" title="Confirm your email first" role="alert">
              {`We have just sent a new link to ${email}. Open it and you will be signed in. Check the spam folder if it does not show up.`}
            </Notice>
          )}
          <TextLink to="/forgot-password" layout="justify-self-end">
            Forgot your password?
          </TextLink>
          <Button variant="primary" type="submit" busy={loading} busyLabel="Logging in…">
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
