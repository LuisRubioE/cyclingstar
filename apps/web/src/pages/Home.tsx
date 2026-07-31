import { useQuery } from '@tanstack/react-query'
import { fetchHealth } from '../api/health'

export function Home() {
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth })

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bienvenido a Cycling Star</h1>
        <p className="mt-1 text-slate-600">
          Un mundo ciclista persistente. Todavía estamos construyendo los cimientos.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Estado del sistema
        </h2>

        {health.isPending && <p className="mt-2 text-slate-500">Consultando…</p>}

        {health.isError && (
          <p className="mt-2 text-red-600">No se pudo contactar con el servidor.</p>
        )}

        {health.data && (
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-500">Servidor</dt>
            <dd className="font-medium">{health.data.ok ? 'En línea' : 'Con problemas'}</dd>

            <dt className="text-slate-500">Versión del motor</dt>
            <dd className="font-medium">{health.data.engineVersion}</dd>

            <dt className="text-slate-500">Día del mundo</dt>
            <dd className="font-medium">{health.data.gameDay ?? 'el mundo aún no ha empezado'}</dd>

            <dt className="text-slate-500">Base de datos</dt>
            <dd className="font-medium">
              {health.data.migrationsApplied ? 'lista' : 'sin migrar'}
            </dd>
          </dl>
        )}
      </div>
    </section>
  )
}
