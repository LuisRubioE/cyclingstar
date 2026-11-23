import { type FormEvent, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { authCall, useRetryWait } from '../auth/authCall'
import { authClient } from '../auth/client'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { authErrorText } from '../domain/authErrors'
import { forgetLinkToken, readEmailLink } from '../domain/authLinks'
import { type FieldProblem, newPasswordProblem } from '../domain/entryForms'

/**
 * LA PÁGINA DE BOTÓN DE RECUPERAR LA CONTRASEÑA (docs/cuenta.md §5.2 y §5.4; D-12, I-04; PR 8 de E4).
 *
 * El correo trae `/reset-password#token=…`. La página lee el token del fragmento, lo borra de la barra y no
 * cambia nada hasta que se guarda: `Save my new password` manda el token en el cuerpo de
 * `POST /api/auth/reset-password`, nunca en la URL. Un solo campo con `Show` (sin `Repeat it`, principio 6).
 * Al 200, `/login` con su final (`Password saved`). El token caducado o usado (`INVALID_TOKEN`) cambia la
 * página a lo que pasó y sus dos salidas; sin token, la de pedir otro.
 *
 * El enlace viejo (`LEGACY_LINK_GRACE_DAYS`, hasta el PR 19) pasa por la API, que redirige aquí con
 * `?token=…` o con `?error=…`: lo lee `readEmailLink`, como el nuevo.
 */

/** Con el token, el enlace gastado (`INVALID_TOKEN`) o el incompleto (sin token). */
export type ResetPhase = 'form' | 'expired' | 'incomplete'

interface ResetState {
  readonly phase: ResetPhase
  readonly problem: FieldProblem<'password'> | null
  readonly error: string | null
  /** los segundos que quedan tras un 429 */
  readonly waitS: number
}

export function ResetPassword({ initial = {} }: { initial?: Partial<ResetState> } = {}) {
  const navigate = useNavigate()
  const location = useLocation()
  // el token se lee una vez: la barra lo pierde enseguida (`forgetLinkToken`)
  const [link] = useState(() => readEmailLink(location.hash, location.search))
  const [phase, setPhase] = useState<ResetPhase>(
    initial.phase ??
      (link.kind === 'token' ? 'form' : link.kind === 'error' ? 'expired' : 'incomplete'),
  )
  const [password, setPassword] = useState('')
  const [problem, setProblem] = useState(initial.problem ?? null)
  const [error, setError] = useState<string | null>(initial.error ?? null)
  const [loading, setLoading] = useState(false)
  const espera = useRetryWait(initial.waitS)

  useEffect(() => {
    forgetLinkToken(window.location, window.history)
  }, [])

  // el foco, al campo que falta: su error se oye con él
  useEffect(() => {
    if (problem !== null) document.getElementById('reset-password')?.focus()
  }, [problem])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (link.kind !== 'token' || loading) return
    setError(null)
    // un solo campo: la repetida es la misma
    const falta = newPasswordProblem(password, password)
    setProblem(falta === null ? null : { field: 'password', msg: falta.msg })
    if (falta !== null) return
    setLoading(true)
    const fallo = await authCall(() =>
      authClient.resetPassword({ newPassword: password, token: link.token }),
    )
    setLoading(false)
    if (fallo !== null) {
      if (fallo.code === 'INVALID_TOKEN' || fallo.code === 'TOKEN_EXPIRED') {
        setPhase('expired')
        return
      }
      setError(fallo.text)
      if (fallo.retryAfterS !== null) espera.start(fallo.retryAfterS, () => setError(null))
      return
    }
    // Sin sesión automática a propósito: se acaba de cambiar la contraseña, que la estrene. `Login`
    // lo dice con su final (docs/cuenta.md §12.4).
    navigate('/login', { state: { arrival: 'password-saved' } })
  }

  return (
    <section className="mx-auto grid max-w-form gap-4">
      <PageHeader title="Choose a new password" />
      <Panel ariaLabel="Your new password" answer>
        {phase !== 'form' ? (
          <div className="grid gap-3">
            <p role="alert" className="text-body text-bad">
              {phase === 'expired'
                ? authErrorText({ code: 'INVALID_TOKEN' }, 400, null)
                : 'This link is incomplete.'}
            </p>
            <p className="text-meta text-ink-2">
              {phase === 'expired'
                ? 'If you just set a new password, log in with it.'
                : 'Open it again from the email, or ask for a new one.'}
            </p>
            <div className="flex flex-wrap gap-3">
              {phase === 'expired' && (
                <Button to="/login" variant="primary">
                  Log in
                </Button>
              )}
              <Button to="/forgot-password" variant={phase === 'expired' ? 'secondary' : 'primary'}>
                Ask for a new link
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-3">
            <Field
              kind="input"
              type="password"
              id="reset-password"
              label="New password"
              autoComplete="new-password"
              reveal
              help="At least 8 characters."
              value={password}
              onChange={(v) => {
                setPassword(v)
                setProblem(null)
              }}
              {...(problem !== null ? { error: problem.msg } : {})}
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
              busyLabel="Saving…"
              {...espera.button}
            >
              Save my new password
            </Button>
          </form>
        )}
      </Panel>
    </section>
  )
}
