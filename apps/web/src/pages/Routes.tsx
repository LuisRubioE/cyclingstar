import { TEST_TOUR, renderAltimetrySvg } from '@cyclingstar/engine'

const KIND_LABEL: Record<string, string> = {
  llana: 'Flat',
  media: 'Hilly',
  reina: 'Queen stage',
  cri: 'Time trial',
}

/** Vista de recorridos: las altimetrías de la vuelta de prueba de 5 etapas (Paso 28). */
export function RoutesPage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Test tour</h1>
        <p className="text-sm text-slate-500">Five stages, each profile sampled to 100 m blocks.</p>
      </header>

      <div className="space-y-4">
        {TEST_TOUR.map((stage) => {
          const totalKm = Math.round(stage.profile.segments.reduce((sum, s) => sum + s.km, 0))
          return (
            <article
              key={stage.day}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-slate-800">{stage.name}</h2>
                <span className="text-xs text-slate-500">
                  {KIND_LABEL[stage.kind] ?? stage.kind} · {totalKm} km
                </span>
              </div>
              <div
                className="w-full overflow-x-auto"
                role="img"
                aria-label={`Elevation profile of ${stage.name}, ${totalKm} km`}
                // El SVG lo genera nuestro propio motor (cadena de confianza, sin entrada externa).
                dangerouslySetInnerHTML={{ __html: renderAltimetrySvg(stage.profile) }}
              />
            </article>
          )
        })}
      </div>
    </section>
  )
}
