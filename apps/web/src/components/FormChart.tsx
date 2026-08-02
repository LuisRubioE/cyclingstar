import type { FormPoint } from '../api/form'

/**
 * Gráfica de CTL (fitness) y ATL (fatiga) del log diario (SPEC 4.1, Paso 20). Con escala en el eje
 * Y, rango de días y valores actuales, para que se entienda qué muestra y en qué unidades.
 */
export function FormChart({ points }: { points: FormPoint[] }) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-slate-400">
        Not enough training data yet — race and train a few days.
      </p>
    )
  }

  const width = 600
  const height = 180
  const padL = 28
  const padR = 10
  const padY = 12
  const days = points.map((p) => p.gameDay)
  const values = points.flatMap((p) => [p.ctl, p.atl])
  const minX = Math.min(...days)
  const maxX = Math.max(...days)
  const maxY = Math.max(10, Math.ceil(Math.max(...values) / 10) * 10)
  const minY = 0

  const toX = (day: number) =>
    padL + ((day - minX) / Math.max(1, maxX - minX)) * (width - padL - padR)
  const toY = (value: number) =>
    height - padY - ((value - minY) / Math.max(1, maxY - minY)) * (height - 2 * padY)

  const polyline = (pick: (p: FormPoint) => number) =>
    points.map((p) => `${toX(p.gameDay).toFixed(1)},${toY(pick(p)).toFixed(1)}`).join(' ')

  const last = points[points.length - 1]!
  const gridY = [0, maxY / 2, maxY]

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Last {points.length} days</span>
        <span className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-indigo-600" /> Fitness{' '}
            <span className="font-semibold text-slate-700">{Math.round(last.ctl)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-amber-500" /> Fatigue{' '}
            <span className="font-semibold text-slate-700">{Math.round(last.atl)}</span>
          </span>
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Form chart">
        {gridY.map((v) => (
          <g key={v}>
            <line
              x1={padL}
              x2={width - padR}
              y1={toY(v)}
              y2={toY(v)}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text x={0} y={toY(v) + 3} fontSize="10" fill="#94a3b8">
              {Math.round(v)}
            </text>
          </g>
        ))}
        <polyline fill="none" stroke="#4f46e5" strokeWidth="2" points={polyline((p) => p.ctl)} />
        <polyline fill="none" stroke="#f59e0b" strokeWidth="2" points={polyline((p) => p.atl)} />
      </svg>
      <p className="text-xs text-slate-400">
        Fitness (blue) is your built-up condition; fatigue (amber) is recent tiredness. You feel
        best when fitness is high and fatigue has dropped.
      </p>
    </div>
  )
}
