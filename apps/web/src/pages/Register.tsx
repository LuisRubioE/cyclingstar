import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { authClient } from '../auth/client'
import { TextField } from '../components/TextField'

/**
 * Después de registrarse: la cuenta existe pero NO hay sesión hasta confirmar el correo. Se dice
 * a qué dirección ha ido el enlace (una errata en el correo es la causa más común de «no me
 * llega») y se ofrece reenviarlo.
 */
function CheckInbox({ email }: { email: string }) {
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function onResend() {
    setResend('sending')
    await authClient.sendVerificationEmail({ email, callbackURL: '/verify-email' })
    setResend('sent')
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Check your inbox</h1>
        <p className="mt-3 text-sm text-slate-600">
          We have sent a link to <span className="font-medium">{email}</span>. Open it to confirm
          your email and start playing. It expires in one hour.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Nothing there? Check the spam folder, or make sure the address above is right.
        </p>
        <button
          type="button"
          onClick={onResend}
          disabled={resend !== 'idle'}
          className="mt-5 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
        >
          {resend === 'sent' ? 'Sent again' : resend === 'sending' ? 'Sending…' : 'Send it again'}
        </button>
      </div>
      <p className="mt-4 text-center text-sm text-slate-500">
        Already confirmed?{' '}
        <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          Log in
        </Link>
      </p>
    </div>
  )
}

export function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    // No se pide el nombre: better-auth requiere el campo, así que lo derivamos del email.
    const name = email.split('@')[0] ?? email
    // Confirmar el correo es OBLIGATORIO: el registro no abre sesión, la abre el enlace del correo.
    // (El servidor fija a dónde vuelve ese enlace; el callbackURL va por coherencia.)
    const result = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: '/verify-email',
    })
    setLoading(false)
    if (result.error) {
      setError(result.error.message ?? 'Could not create your account.')
      return
    }
    // Aunque el correo ya tuviera cuenta, better-auth responde igual (para no revelar quién está
    // registrado), así que la pantalla también es la misma.
    setDone(true)
  }

  if (done) return <CheckInbox email={email} />

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
