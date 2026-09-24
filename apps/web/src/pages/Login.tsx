import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authClient } from '../auth/client'
import { TextField } from '../components/TextField'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [unverified, setUnverified] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setUnverified(false)
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

  return (
    <div className="mx-auto max-w-sm">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Log in</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <TextField
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
            autoComplete="email"
          />
          <TextField
            label="Password"
            value={password}
            onChange={setPassword}
            type="password"
            autoComplete="current-password"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {unverified && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">Confirm your email first</p>
              <p className="mt-1 text-xs text-amber-800">
                We have just sent a new link to {email}. Open it and you will be signed in. Check
                the spam folder if it does not show up.
              </p>
            </div>
          )}
          <p className="text-right text-sm">
            <Link
              to="/forgot-password"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Forgot your password?
            </Link>
          </p>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>
      </div>
      <p className="mt-4 text-center text-sm text-slate-500">
        No account yet?{' '}
        <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
          Sign up
        </Link>
      </p>
    </div>
  )
}
