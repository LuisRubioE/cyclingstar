import { useNavigate } from 'react-router-dom'
import { authClient } from '../auth/client'

/** Página protegida de prueba: solo visible con sesión iniciada (Paso 9). */
export function Cuenta() {
  const navigate = useNavigate()
  const { data } = authClient.useSession()

  async function onLogout() {
    await authClient.signOut()
    navigate('/acceso')
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Mi cuenta</h1>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-slate-600">
          Has iniciado sesión como{' '}
          <span className="font-medium text-slate-900">{data?.user.email}</span>.
        </p>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700"
      >
        Cerrar sesión
      </button>
    </section>
  )
}
