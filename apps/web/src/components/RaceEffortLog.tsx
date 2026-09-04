import type { FormPoint } from '../api/form'

/**
 * DÓNDE SE FUE LA ENERGÍA DE UN DÍA DE CARRERA.
 *
 * El dueño, sobre dos etapas que ordenó correr «súper agresivo»: «no hay ni una sola mención en el
 * journal ni en la race radio… pero consumió un montón de energía; algo habrá hecho, digo yo». Y sí
 * había hecho: lo que pasa es que la crónica solo cuenta lo que es NOTICIA —un ataque que abre
 * hueco, una fuga, una pájara— y un día entero dando la cara en el pelotón no lo es, aunque sea
 * exactamente lo que te deja sin piernas mañana.
 *
 * Esto no narra: CONTABILIZA. Los cinco conceptos son los mismos cinco sitios en los que el motor
 * descuenta depósito, así que la barra y el total no pueden discrepar.
 */

const CONCEPTOS = [
  { key: 'rodar', label: 'Riding in the bunch', color: 'bg-slate-300' },
  { key: 'relevo', label: 'On the front', color: 'bg-indigo-500' },
  { key: 'cerillos', label: 'Attacks & jumps', color: 'bg-rose-500' },
  { key: 'reserva', label: 'Digging deep', color: 'bg-amber-500' },
  { key: 'banderas', label: 'Sprints & KOMs', color: 'bg-emerald-500' },
] as const

/** `carrera:race-italy:e9` → `Giro d'Italia stage 9` no lo sabemos aquí: se enseña la clave corta. */
function tituloDelDia(activity: string): string {
  const [, raceId, stage] = activity.split(':')
  if (!raceId) return activity
  const nombre = raceId.replace(/^race-/, '').replace(/-/g, ' ')
  const etapa = stage?.startsWith('e') ? ` · stage ${stage.slice(1)}` : ''
  return `${nombre}${etapa}`
}

const km = (v: number): string => `${v.toFixed(1)} km`

export function RaceEffortLog({ points, max = 8 }: { points: FormPoint[]; max?: number }) {
  const dias = points
    .filter((p) => p.parte != null)
    .slice(-max)
    .reverse()
  if (dias.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No race days logged yet — the breakdown appears once your rider races a stage.
      </p>
    )
  }
  return (
    <ul className="divide-y divide-slate-100">
      {dias.map((p) => {
        const parte = p.parte!
        const g = parte.gasto
        const total = CONCEPTOS.reduce((a, c) => a + g[c.key], 0)
        const notas: string[] = []
        if (parte.kmAlFrente > 0) notas.push(`${km(parte.kmAlFrente)} on the front`)
        if (parte.kmEnFuga > 0) notas.push(`${km(parte.kmEnFuga)} up the road`)
        if (parte.ataques > 0) notas.push(`${parte.ataques} attack${parte.ataques > 1 ? 's' : ''}`)
        if (parte.saltos > 0) notas.push(`${parte.saltos} jumped onto moves`)
        if (parte.cerillos > 0) notas.push(`${parte.cerillos} matches burned`)
        if (parte.reservaGastadaS > 0)
          notas.push(`${Math.round(parte.reservaGastadaS)}s over threshold`)
        if (parte.kmDescolgado > 0) notas.push(`${km(parte.kmDescolgado)} off the back`)
        if (parte.descuelgueKm != null)
          notas.push(`lost the bunch at km ${Math.round(parte.descuelgueKm)}`)
        if (parte.pajaraKm != null) notas.push(`ran empty at km ${Math.round(parte.pajaraKm)}`)
        return (
          <li key={p.gameDay} className="py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-slate-800 capitalize">
                {tituloDelDia(p.activity)}
              </span>
              <span className="text-xs text-slate-400 tabular-nums">
                day {p.gameDay} · TSS {Math.round(p.tss)}
              </span>
            </div>
            <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
              {total > 0 &&
                CONCEPTOS.map((c) =>
                  g[c.key] <= 0 ? null : (
                    <span
                      key={c.key}
                      className={c.color}
                      style={{ width: `${(100 * g[c.key]) / total}%` }}
                      title={`${c.label}: ${g[c.key].toFixed(1)}`}
                    />
                  ),
                )}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {notas.length > 0 ? notas.join(' · ') : 'Sat in the wheels all day.'}
            </p>
          </li>
        )
      })}
      <li className="flex flex-wrap gap-x-3 gap-y-1 pt-2 text-[11px] text-slate-400">
        {CONCEPTOS.map((c) => (
          <span key={c.key} className="flex items-center gap-1">
            <span className={`inline-block h-2 w-2 rounded-sm ${c.color}`} />
            {c.label}
          </span>
        ))}
      </li>
    </ul>
  )
}
