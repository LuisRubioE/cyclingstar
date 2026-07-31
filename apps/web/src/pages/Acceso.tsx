import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authClient } from '../auth/client'
import { TextField } from '../components/TextField'

export function Acceso() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    const result = await authClient.signIn.email({ email, password })
    setLoading(false)
    if (result.error) {
      setError(result.error.message ?? 'Correo o contraseña incorrectos')
      return
    }
    navigate('/cuenta')
  }

  return (
    <section className="mx-auto max-w-sm space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Entrar</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField
          label="Correo"
          value={email}
          onChange={setEmail}
          type="email"
          autoComplete="email"
        />
        <TextField
          label="Contraseña"
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete="current-password"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <p className="text-sm text-slate-600">
        ¿No tienes cuenta?{' '}
        <Link to="/registro" className="font-medium text-slate-900 underline">
          Regístrate
        </Link>
      </p>
    </section>
  )
}
