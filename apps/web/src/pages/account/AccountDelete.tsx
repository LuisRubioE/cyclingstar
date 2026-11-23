import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authCall, useRetryWait } from '../../auth/authCall'
import { authClient } from '../../auth/client'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Panel } from '../../components/ui/Panel'
import { TextLink } from '../../components/ui/TextLink'
import { storeArrival } from '../../domain/arrivals'
import { AccountSubpage, Resultado, type Status, fallar } from './AccountSubpage'

interface DeleteState {
  readonly status: Status
  readonly fieldError: string | null
}

/**
 * `Account › Delete account` (docs/cuenta.md §12.2; 12-d): la subpágina ya es el paso de confirmar, así que el
 * formulario está abierto desde el principio, sin `Delete my account…`. Dice qué pasa con el corredor y el
 * equipo (se quedan en el mundo), ofrece la copia antes y pide la contraseña, que el servidor exige siempre.
 * Vacía, `Enter your password to delete your account.` (lo mismo que dice el gancho); mala, L3 y la red, con
 * la tabla única (§12.3). Hecho, la portada lo dice con su final (§12.4). `initial`, para sus tests.
 */
export function AccountDelete({ initial = {} }: { initial?: Partial<DeleteState> } = {}) {
  const navigate = useNavigate()
  const espera = useRetryWait()
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<Status>(initial.status ?? { kind: 'idle' })
  const [fieldError, setFieldError] = useState<string | null>(initial.fieldError ?? null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (status.kind === 'saving') return
    if (!password) {
      setStatus({ kind: 'idle' })
      setFieldError('Enter your password to delete your account.')
      return
    }
    setFieldError(null)
    setStatus({ kind: 'saving' })
    const res = await authCall(() => authClient.deleteUser({ password }))
    if (res?.signedOut === true) {
      void navigate('/login', { state: { arrival: 'signed-out-passwords' } })
      return
    }
    if (res !== null) {
      fallar(res, setStatus, espera)
      return
    }
    // Recarga completa: la sesión ya no existe y ninguna caché de la SPA debe sobrevivirla. La portada
    // lo dice con su final, que cruza la recarga en `sessionStorage` (docs/cuenta.md §12.4).
    storeArrival('account-deleted')
    window.location.assign('/')
  }

  return (
    <AccountSubpage title="Delete account">
      <Panel ariaLabel="Delete your account" answer>
        <form onSubmit={onSubmit} className="grid gap-3">
          <p className="text-meta text-ink-2">
            This cannot be undone. Your rider and your team stay in the world, run by the game, and
            your email becomes free to use on another account.
          </p>
          <p className="text-meta text-ink-2">
            Want a copy first?{' '}
            <TextLink to="/account/data" inline>
              Download my data
            </TextLink>
          </p>
          <Field
            kind="input"
            type="password"
            id="delete-pw"
            label="Password"
            autoComplete="current-password"
            reveal
            value={password}
            onChange={(v) => {
              setPassword(v)
              setFieldError(null)
            }}
            {...(fieldError !== null ? { error: fieldError } : {})}
          />
          <Resultado status={status} />
          <div className="flex flex-wrap gap-3">
            <Button
              variant="danger"
              type="submit"
              busy={status.kind === 'saving'}
              {...espera.button}
            >
              {/* «for good» sobraba: a 320 px el botón, que no encoge, pasaba 12 px del panel */}
              Delete my account
            </Button>
            <Button variant="quiet" to="/account">
              Cancel
            </Button>
          </div>
        </form>
      </Panel>
    </AccountSubpage>
  )
}
