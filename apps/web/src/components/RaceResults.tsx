import type { RiderRaceResult } from '@cyclingstar/shared'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  hasStageBreakdown,
  ordinal,
  placeTone,
  raceResultKey,
  raceResultKind,
  raceResultPlace,
  stagesSummary,
} from '../domain/riderResults'
// El tope de filas visibles es el común del juego (§7.3); el rótulo del interruptor cambia porque
// aquí se cuentan CARRERAS ("Show all 31"), no filas de una clasificación.
import { TOP_ROWS } from './ShowAll'

/**
 * Los resultados de un corredor, tal como se leen en su ficha (docs/navegacion.md §3.6).
 *
 * Una línea POR CARRERA, no por etapa: el titular es lo que hizo el corredor en la carrera —su
 * puesto en la general si es por etapas, se gane o no— y las etapas cuelgan debajo, plegadas. Antes
 * se listaban las etapas sueltas y la general no salía en ningún sitio: quien acababa 3.º de una
 * gran vuelta no lo veía ni aquí ni en el palmarés (que solo registra la general si se gana).
 *
 * El desglose es un `<details>`: se pliega sin JavaScript, es accesible con teclado y no obliga a
 * gestionar estado por fila.
 */

/** Una carrera del historial: puesto, nombre, contexto y (si procede) el desglose de etapas. */
export function RaceResultRow({
  result,
  showStages = true,
}: {
  result: RiderRaceResult
  showStages?: boolean
}) {
  const place = raceResultPlace(result)
  return (
    <li className="py-2 first:pt-0 last:pb-0">
      <div className="flex items-baseline gap-3 text-sm">
        <span
          className={`w-10 shrink-0 text-right font-bold tabular-nums ${placeTone(result)}`}
          // "3rd" ya se lee bien, pero DNF y el guion necesitan contexto al oírse.
          title={result.dnf ? 'Did not finish' : undefined}
        >
          {place}
        </span>
        <div className="min-w-0 flex-1">
          <Link
            to={`/world/races/${result.raceId}`}
            className="font-medium text-slate-800 hover:text-brand-cyan hover:underline"
          >
            {result.raceName}
          </Link>
          <p className="text-xs text-slate-400">
            {raceResultKind(result)} · Season {result.season + 1}
          </p>
        </div>
      </div>

      {showStages && hasStageBreakdown(result) && (
        <details className="ml-[3.25rem] mt-1">
          <summary className="cursor-pointer list-none text-xs [&::-webkit-details-marker]:hidden text-slate-400 hover:text-brand-cyan">
            <span className="underline decoration-dotted underline-offset-2">
              {stagesSummary(result)}
            </span>
          </summary>
          <ul className="mt-1 space-y-0.5">
            {result.stages.map((s) => (
              <li key={s.stageDay} className="flex items-baseline gap-3 text-xs">
                <span
                  className={`w-10 shrink-0 text-right font-semibold tabular-nums ${
                    s.puesto === 1 ? 'text-amber-500' : 'text-slate-500'
                  }`}
                >
                  {ordinal(s.puesto)}
                </span>
                <Link
                  to={`/world/races/${result.raceId}/stages/${s.stageDay}`}
                  className="text-slate-500 hover:text-brand-cyan hover:underline"
                >
                  Stage {s.stageDay} of {result.stageCount}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  )
}

/**
 * La lista completa, con la regla común de tablas del juego: 20 visibles y salida para ver el resto
 * (§7.3). `limit` la recorta más aún donde solo se quiere un vistazo (la ficha de un compañero).
 */
export function RaceResultList({
  results,
  limit,
  showStages = true,
}: {
  results: readonly RiderRaceResult[]
  limit?: number
  showStages?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const tope = limit ?? TOP_ROWS
  const visible = expanded ? results : results.slice(0, tope)
  return (
    <>
      <ul className="divide-y divide-slate-100">
        {visible.map((r) => (
          <RaceResultRow key={raceResultKey(r)} result={r} showStages={showStages} />
        ))}
      </ul>
      {results.length > tope && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-2 text-sm font-medium text-brand-cyan hover:underline"
        >
          {expanded ? `Show last ${tope}` : `Show all ${results.length}`}
        </button>
      )}
    </>
  )
}
