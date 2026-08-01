import type { FormPoint } from '../api/form'

/** Gráfica de CTL (condición) y ATL (fatiga) desde el log diario (SPEC 4.1, Paso 20). */
export function FormChart({ points }: { points: FormPoint[] }) {
  if (points.length < 2) {
    return <p className="text-sm text-slate-400">Not enough training data yet.</p>
  }

  const width = 600
  const height = 180
  const pad = 10
  const days = points.map((p) => p.gameDay)
  const values = points.flatMap((p) => [p.ctl, p.atl])
  const minX = Math.min(...days)
  const maxX = Math.max(...days)
  const minY = Math.min(...values)
  const maxY = Math.max(...values)

  const toX = (day: number) => pad + ((day - minX) / Math.max(1, maxX - minX)) * (width - 2 * pad)
  const toY = (value: number) =>
    height - pad - ((value - minY) / Math.max(1, maxY - minY)) * (height - 2 * pad)

  const polyline = (pick: (p: FormPoint) => number) =>
    points.map((p) => `${toX(p.gameDay).toFixed(1)},${toY(pick(p)).toFixed(1)}`).join(' ')

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Form chart">
        <polyline fill="none" stroke="#4f46e5" strokeWidth="2" points={polyline((p) => p.ctl)} />
        <polyline fill="none" stroke="#f59e0b" strokeWidth="2" points={polyline((p) => p.atl)} />
      </svg>
      <div className="flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-indigo-600" /> Fitness
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-amber-500" /> Fatigue
        </span>
      </div>
    </div>
  )
}
