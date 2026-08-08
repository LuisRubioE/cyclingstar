import type { FormPoint } from '../api/form'
import { conditionLabel, conditionSeries } from '../domain/condition'

/**
 * Cómo evoluciona la condición del corredor (SPEC 4.1, Paso 20). Antes pintaba CTL y ATL en crudo,
 * con el eje en unidades del Banister y rótulos del tipo «Fatigue 118»: números internos que no
 * significan nada para el jugador y que ni siquiera viven en una escala 0-100.
 *
 * Ahora dibuja las MISMAS dos magnitudes que la ficha —fondo y frescura—, ambas 0-100 y acotadas
 * por el motor, que es lo que cuenta la historia útil: se construye fondo, se afloja antes del
 * objetivo y sube la frescura. El eje se rotula con la escala, no con unidades del modelo.
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
  const series = conditionSeries(points)
  const days = series.map((p) => p.gameDay)
  const minX = Math.min(...days)
  const maxX = Math.max(...days)

  const toX = (day: number) =>
    padL + ((day - minX) / Math.max(1, maxX - minX)) * (width - padL - padR)
  const toY = (value: number) => height - padY - (value / 100) * (height - 2 * padY)

  const polyline = (pick: (p: (typeof series)[number]) => number) =>
    series.map((p) => `${toX(p.gameDay).toFixed(1)},${toY(pick(p)).toFixed(1)}`).join(' ')

  const last = series[series.length - 1]!

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Last {series.length} days</span>
        <span className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-indigo-600" /> Fitness{' '}
            <span className="font-semibold text-slate-700">{conditionLabel(last.fitness)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-emerald-500" /> Freshness{' '}
            <span className="font-semibold text-slate-700">{conditionLabel(last.freshness)}</span>
          </span>
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Form chart">
        {[0, 50, 100].map((v) => (
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
              {v}
            </text>
          </g>
        ))}
        <polyline
          fill="none"
          stroke="#4f46e5"
          strokeWidth="2"
          points={polyline((p) => p.fitness)}
        />
        <polyline
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          points={polyline((p) => p.freshness)}
        />
      </svg>
      <p className="text-xs text-slate-400">
        Fitness (blue) is the base you have built up; freshness (green) is how rested you are. You
        race best when both are high — build the base, then ease off before your goal.
      </p>
    </div>
  )
}
