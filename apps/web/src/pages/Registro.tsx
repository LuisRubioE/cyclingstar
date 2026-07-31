import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authClient } from '../auth/client'
import { TextField } from '../components/TextField'

export function Registro() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    const result = await authClient.signUp.email({ name, email, password })
    setLoading(false)
    if (result.error) {
      setError(result.error.message ?? 'No se pudo crear la cuenta')
      return
    }
    navigate('/cuenta')
  }

  return (
    <section className="mx-auto max-w-sm space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Crear cuenta</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField label="Nombre" value={name} onChange={setName} type="text" autoComplete="name" />
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
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Creando…' : 'Crear cuenta'}
        </button>
      </form>
      <p className="text-sm text-slate-600">
        ¿Ya tienes cuenta?{' '}
        <Link to="/acceso" className="font-medium text-slate-900 underline">
          Entra
        </Link>
      </p>
    </section>
  )
}
