import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authClient } from '../auth/client'

/** Estado de un formulario de ajustes: mensaje de éxito o de error, más "enviando". */
type Status =
  { kind: 'idle' } | { kind: 'saving' } | { kind: 'ok'; msg: string } | { kind: 'err'; msg: string }

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
const labelClass = 'block text-xs font-medium text-slate-500'

function Notice({ status }: { status: Status }) {
  if (status.kind === 'ok') return <p className="text-sm text-emerald-600">{status.msg}</p>
  if (status.kind === 'err') return <p className="text-sm text-red-600">{status.msg}</p>
  return null
}

function ChangeEmail({ current }: { current: string }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email || email === current) {
      setStatus({ kind: 'err', msg: 'Enter a new, different email.' })
      return
    }
    setStatus({ kind: 'saving' })
    const res = await authClient.changeEmail({ newEmail: email })
    if (res.error) {
      setStatus({ kind: 'err', msg: res.error.message ?? 'Could not change your email.' })
    } else {
      setStatus({ kind: 'ok', msg: 'Email updated.' })
      setEmail('')
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-sm font-semibold text-slate-800">Email</h2>
      <p className="mt-1 text-xs text-slate-400">
        Signed in as <span className="font-medium text-slate-600">{current}</span>
      </p>
      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="new-email" className={labelClass}>
            New email
          </label>
          <input
            id="new-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`mt-1 ${inputClass}`}
            placeholder="you@example.com"
          />
        </div>
        <Notice status={status} />
        <button
          type="submit"
          disabled={status.kind === 'saving'}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          Update email
        </button>
      </div>
    </form>
  )
}

function ChangePassword() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (next.length < 8) {
      setStatus({ kind: 'err', msg: 'New password must be at least 8 characters.' })
      return
    }
    if (next !== confirm) {
      setStatus({ kind: 'err', msg: 'The new passwords do not match.' })
      return
    }
    setStatus({ kind: 'saving' })
    const res = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    })
    if (res.error) {
      setStatus({ kind: 'err', msg: res.error.message ?? 'Could not change your password.' })
    } else {
      setStatus({ kind: 'ok', msg: 'Password updated.' })
      setCurrent('')
      setNext('')
      setConfirm('')
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-sm font-semibold text-slate-800">Password</h2>
      <p className="mt-1 text-xs text-slate-400">
        Changing your password signs you out of other devices.
      </p>
      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="cur-pw" className={labelClass}>
            Current password
          </label>
          <input
            id="cur-pw"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <div>
          <label htmlFor="new-pw" className={labelClass}>
            New password
          </label>
          <input
            id="new-pw"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <div>
          <label htmlFor="confirm-pw" className={labelClass}>
            Confirm new password
          </label>
          <input
            id="confirm-pw"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <Notice status={status} />
        <button
          type="submit"
          disabled={status.kind === 'saving'}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          Update password
        </button>
      </div>
    </form>
  )
}

/** Ajustes de la cuenta (SPEC 7): ver/cambiar correo, cambiar contraseña y cerrar sesión. */
export function Account() {
  const navigate = useNavigate()
  const { data } = authClient.useSession()

  async function onLogout() {
    await authClient.signOut()
    navigate('/login')
  }

  const email = data?.user.email ?? ''

  return (
    <section className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Account settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your login details.</p>
      </div>

      {email && <ChangeEmail current={email} />}
      <ChangePassword />

      <button
        type="button"
        onClick={onLogout}
        className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-100"
      >
        Sign out
      </button>
    </section>
  )
}
