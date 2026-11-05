import { type FormEvent, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { authClient } from '../auth/client'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { readResetLink } from '../domain/authLinks'
import { type FieldProblem, newPasswordProblem } from '../domain/entryForms'

/**
 * Destino del enlace de recuperación: el servidor valida el token y redirige aquí con
 * `?token=…`, o con `?error=…` si el enlace ya no vale. Lo de leer eso está en `domain/authLinks`,
 * probado aparte; esta página sólo pinta el resultado.
 *
 * Con el sistema desde el 21j (E3, docs/visual.md §17.21): la cabecera en `PageHeader`; las dos contraseñas en
 * su `Field`, dentro del `Panel` que contesta, y guardarla en un `Button` ocupado mientras pregunta; lo que
 * falta lo dice su campo (`newPasswordProblem`), y lo que dice el servidor, en `role="alert"`; y el enlace que
 * ya no vale, lo que pasó y pedir otro, un `Button` primario.
 */

interface ResetState {
  readonly problem: FieldProblem<'password' | 'confirm'> | null
  readonly error: string | null
}

export function ResetPassword({ initial = {} }: { initial?: Partial<ResetState> } = {}) {
  const navigate = useNavigate()
  const link = readResetLink(useLocation().search)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [problem, setProblem] = useState(initial.problem ?? null)
  const [error, setError] = useState<string | null>(initial.error ?? null)
  const [loading, setLoading] = useState(false)

  // el foco, al campo que falta: su error se oye con él
  useEffect(() => {
    if (problem !== null) document.getElementById(`reset-${problem.field}`)?.focus()
  }, [problem])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (link.kind !== 'token' || loading) return
    setError(null)
    const falta = newPasswordProblem(password, confirm)
    setProblem(falta)
    if (falta !== null) return
    setLoading(true)
    const result = await authClient.resetPassword({ newPassword: password, token: link.token })
    setLoading(false)
    if (result.error) {
      setError(result.error.message ?? 'Could not change your password.')
      return
    }
    // Sin sesión automática a propósito: se acaba de cambiar la contraseña, que la estrene.
    navigate('/login')
  }

  const errorOf = (field: 'password' | 'confirm') =>
    problem?.field === field ? { error: problem.msg } : {}

  return (
    <section className="mx-auto grid max-w-form gap-4">
      <PageHeader title="Choose a new password" />
      <Panel ariaLabel="Your new password" answer>
        {link.kind === 'error' ? (
          <div className="grid gap-3">
            <p role="alert" className="text-body text-bad">
              {link.message}
            </p>
            <Button to="/forgot-password" variant="primary" layout="justify-self-start">
              Ask for a new link
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-3">
            <Field
              kind="input"
              type="password"
              id="reset-password"
              label="New password"
              autoComplete="new-password"
              help="At least 8 characters."
              value={password}
              onChange={(v) => {
                setPassword(v)
                setProblem(null)
              }}
              {...errorOf('password')}
            />
            <Field
              kind="input"
              type="password"
              id="reset-confirm"
              label="Repeat it"
              autoComplete="new-password"
              value={confirm}
              onChange={(v) => {
                setConfirm(v)
                setProblem(null)
              }}
              {...errorOf('confirm')}
            />
            {error !== null && (
              <p role="alert" className="text-meta text-bad">
                {error}
              </p>
            )}
            <Button variant="primary" type="submit" busy={loading} busyLabel="Saving…">
              Save my new password
            </Button>
          </form>
        )}
      </Panel>
    </section>
  )
}
