import { useNavigate } from 'react-router-dom'
import { authClient } from '../auth/client'

/** Página protegida de prueba: solo visible con sesión iniciada (Paso 9). */
export function Account() {
  const navigate = useNavigate()
  const { data } = authClient.useSession()

  async function onLogout() {
    await authClient.signOut()
    navigate('/login')
  }

  return (
    <section className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Your account</h1>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Signed in as</p>
        <p className="mt-1 font-medium text-slate-900">{data?.user.email}</p>
      </div>
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
