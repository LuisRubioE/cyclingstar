import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { authClient } from '../auth/client'
import { TextField } from '../components/TextField'

/**
 * «He olvidado mi contraseña». Hasta ahora no existía: sin envío de correo no había a dónde
 * mandar el enlace, y quien perdía su contraseña perdía su equipo.
 *
 * La respuesta es SIEMPRE la misma, exista o no la cuenta. Un «no hay nadie con ese correo» sería
 * un oráculo para saber quién está registrado, y la API lo trata igual por el mismo motivo.
 */
export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    // redirectTo es la página de esta misma web donde el servidor deja al usuario con el token.
    await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' })
    setLoading(false)
    setSent(true)
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Forgot your password?</h1>
        {sent ? (
          <>
            <p className="mt-3 text-sm text-slate-600">
              If there is an account for <span className="font-medium">{email}</span>, a link to
              choose a new password is on its way. It expires in one hour.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Nothing in your inbox? Check the spam folder before asking for another one.
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-500">
              Give us your email and we will send you a link to set a new one.
            </p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <TextField
                label="Email"
                value={email}
                onChange={setEmail}
                type="email"
                autoComplete="email"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send me a link'}
              </button>
            </form>
          </>
        )}
      </div>
      <p className="mt-4 text-center text-sm text-slate-500">
        <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          Back to log in
        </Link>
      </p>
    </div>
  )
}
