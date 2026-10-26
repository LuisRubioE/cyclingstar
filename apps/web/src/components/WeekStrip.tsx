import { type PlanPreviewDay, seasonPosition } from '@cyclingstar/shared'
import { type StripCell, stripCell, stripSummary } from '../domain/trainingPlan'
import { Icon } from './ui/Icon'
import { MeterSegments } from './ui/Meter'

/**
 * LA TIRA DE SIETE DÍAS (E3, docs/visual.md §10.6; PR 14; I-28). Bajo cada semana y sin abrir nada: una celda
 * por día, de 48 de alto y un séptimo del ancho (41 px a 360, 35 a 320), con su día en `caption` `ink-3` y
 * debajo una palabra o la carga: `Race` en `warn` sobre `warn-bg`; el viaje, el icono `travel` ENCIMA de `Out`
 * o `Back`, sobre `info-bg`, porque a su lado no cabe (46 px); un día de entrenamiento, los segmentos de su
 * carga (§10.7), sin palabra. No se pulsa: es una lista con su nombre, y cada día se lee en texto
 * (`Day 54: steady training`). Una semana del plan empezada antes de mañana pinta solo sus días del
 * horizonte, cada uno en su columna. Debajo, el resumen: cuántos días se entrenan.
 */

/** La columna del primer día de una semana empezada: clases enteras, para que Tailwind las vea. */
const COLUMNA = [
  '',
  'col-start-2',
  'col-start-3',
  'col-start-4',
  'col-start-5',
  'col-start-6',
  'col-start-7',
]

const FONDO: Readonly<Record<StripCell['kind'], string>> = {
  race: 'bg-warn-bg',
  travel: 'bg-info-bg',
  train: 'bg-surface-2',
}

/** El viaje va sin hueco: su día, el icono y la palabra son 48 justos. */
const HUECO: Readonly<Record<StripCell['kind'], string>> = {
  race: 'gap-1',
  travel: '',
  train: 'gap-1',
}

function Contenido({ cell }: { readonly cell: StripCell }) {
  if (cell.kind === 'race')
    return <span className="text-caption font-semibold text-warn">{cell.word}</span>
  if (cell.kind === 'travel')
    return (
      <span className="flex flex-col items-center text-caption text-accent">
        <Icon name="travel" size={16} />
        {cell.word}
      </span>
    )
  return (
    <span className="flex w-full px-1">
      <MeterSegments value={cell.load} fluid />
    </span>
  )
}

export function WeekStrip({
  label,
  days,
  direction,
  firstColumn = 0,
}: {
  /** `Week 1, days 51 to 57` */
  readonly label: string
  readonly days: readonly PlanPreviewDay[]
  /** el sentido de cada día de viaje (`travelDays[]`) */
  readonly direction: ReadonlyMap<number, 'out' | 'back'>
  /** la columna del primer día, de 0 a 6, en una semana empezada antes de mañana */
  readonly firstColumn?: number
}) {
  return (
    <div className="grid gap-1">
      <ol aria-label={label} className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const cell = stripCell(d, direction)
          return (
            <li
              key={d.gameDay}
              className={`flex min-h-12 min-w-0 flex-col items-center justify-center rounded-ui ${FONDO[cell.kind]} ${
                i === 0 ? (COLUMNA[firstColumn] ?? '') : ''
              }`}
            >
              <span className="sr-only">{cell.label}</span>
              <span
                aria-hidden="true"
                className={`flex w-full flex-col items-center ${HUECO[cell.kind]}`}
              >
                <span className="text-caption text-ink-3">
                  {seasonPosition(d.gameDay).dayOfSeason}
                </span>
                <Contenido cell={cell} />
              </span>
            </li>
          )
        })}
      </ol>
      <p className="text-meta text-ink-2">{stripSummary(days)}</p>
    </div>
  )
}
