import { useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authCall, useRetryWait } from '../../auth/authCall'
import { authClient } from '../../auth/client'
import { ME_ACCOUNT_KEY } from '../../components/ProtectedRoute'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Notice } from '../../components/ui/Notice'
import { Panel } from '../../components/ui/Panel'
import { AccountSubpage, Resultado, type Status, fallar } from './AccountSubpage'
import { DEVICES_KEY } from './AccountDevices'

/** Lo que falta en el formulario antes de llamar a la API (docs/cuenta.md §12.2): un campo y su texto. */
export function passwordFormProblem(
  current: string,
  next: string,
): { readonly field: 'current' | 'next'; readonly msg: string } | null {
  if (current === '') return { field: 'current', msg: 'Enter your current password.' }
  if (next.length < 8) return { field: 'next', msg: 'Use at least 8 characters.' }
  if (next.length > 128)
    return { field: 'next', msg: 'Your password can be at most 128 characters.' }
  return null
}

interface PasswordState {
  readonly status: Status
  readonly fieldError: { readonly field: 'current' | 'next'; readonly msg: string } | null
  /** guardada: el `Notice` `good` (12-c) */
  readonly saved: boolean
}

/**
 * `Account › Password` (docs/cuenta.md §12.2; 12-c): la actual y la nueva, con `Show` y sin `Confirm new
 * password`. La actual vacía se dice sin llamar a la API; la mala, L3 y la red, con la tabla única (§12.3).
 * Guardada, un `Notice` `good` y los campos vacíos; las otras sesiones se cierran (`revokeOtherSessions`).
 * `initial`, para sus tests.
 */
export function AccountPassword({ initial = {} }: { initial?: Partial<PasswordState> } = {}) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [status, setStatus] = useState<Status>(initial.status ?? { kind: 'idle' })
  const [fieldError, setFieldError] = useState(initial.fieldError ?? null)
  const [saved, setSaved] = useState(initial.saved ?? false)
  const espera = useRetryWait()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (status.kind === 'saving') return
    setSaved(false)
    const problema = passwordFormProblem(current, next)
    if (problema !== null) {
      setStatus({ kind: 'idle' })
      setFieldError(problema)
      return
    }
    setFieldError(null)
    setStatus({ kind: 'saving' })
    const res = await authCall(() =>
      authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: true,
      }),
    )
    if (res?.signedOut === true) {
      void navigate('/login', { state: { arrival: 'signed-out-passwords' } })
    } else if (res !== null) {
      fallar(res, setStatus, espera)
    } else {
      setStatus({ kind: 'idle' })
      setSaved(true)
      setCurrent('')
      setNext('')
      void queryClient.invalidateQueries({ queryKey: ME_ACCOUNT_KEY })
      void queryClient.invalidateQueries({ queryKey: DEVICES_KEY })
    }
  }

  const errorOf = (field: 'current' | 'next') =>
    fieldError?.field === field ? { error: fieldError.msg } : {}

  return (
    <AccountSubpage title="Password">
      {saved && (
        <Notice tone="good" role="status" title="Password updated">
          You&apos;ve been signed out of your other devices.
        </Notice>
      )}
      <Panel ariaLabel="Change your password" answer>
        <form onSubmit={onSubmit} className="grid gap-3">
          <p className="text-meta text-ink-2">
            Changing your password signs you out of your other devices.
          </p>
          <Field
            kind="input"
            type="password"
            id="cur-pw"
            label="Current password"
            autoComplete="current-password"
            reveal
            value={current}
            onChange={(v) => {
              setCurrent(v)
              setFieldError(null)
            }}
            {...errorOf('current')}
          />
          <Field
            kind="input"
            type="password"
            id="new-pw"
            label="New password"
            autoComplete="new-password"
            reveal
            help="At least 8 characters."
            value={next}
            onChange={(v) => {
              setNext(v)
              setFieldError(null)
            }}
            {...errorOf('next')}
          />
          <Resultado status={status} />
          <Button
            variant="primary"
            type="submit"
            busy={status.kind === 'saving'}
            layout="justify-self-start"
            {...espera.button}
          >
            Update password
          </Button>
        </form>
      </Panel>
    </AccountSubpage>
  )
}
