import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authClient } from '../auth/client'
import { TextField } from '../components/TextField'

export function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    // No se pide el nombre: better-auth requiere el campo, así que lo derivamos del email.
    const name = email.split('@')[0] ?? email
    const result = await authClient.signUp.email({ name, email, password })
    setLoading(false)
    if (result.error) {
      setError(result.error.message ?? 'Could not create your account.')
      return
    }
    navigate('/me/profile')
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">Start building your rider.</p>
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
            autoComplete="new-password"
            minLength={8}
            hint="At least 8 characters."
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>
      </div>
      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          Log in
        </Link>
      </p>
    </div>
  )
}
