import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authClient } from '../auth/client'
import { TextField } from '../components/TextField'
import { readResetLink } from '../domain/authLinks'

/**
 * Destino del enlace de recuperación: el servidor valida el token y redirige aquí con
 * `?token=…`, o con `?error=…` si el enlace ya no vale. Lo de leer eso está en `domain/authLinks`,
 * probado aparte; esta página sólo pinta el resultado.
 */
export function ResetPassword() {
  const navigate = useNavigate()
  const link = readResetLink(useLocation().search)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (link.kind !== 'token') return
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setError(null)
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

  return (
    <div className="mx-auto max-w-sm">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Choose a new password</h1>
        {link.kind === 'error' ? (
          <>
            <p className="mt-3 text-sm text-red-600">{link.message}</p>
            <Link
              to="/forgot-password"
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              Ask for a new link
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <TextField
              label="New password"
              value={password}
              onChange={setPassword}
              type="password"
              autoComplete="new-password"
              minLength={8}
              hint="At least 8 characters."
            />
            <TextField
              label="Repeat it"
              value={confirm}
              onChange={setConfirm}
              type="password"
              autoComplete="new-password"
              minLength={8}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save my new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
