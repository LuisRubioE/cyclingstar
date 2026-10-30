import type { CalendarStageSummary } from '@cyclingstar/shared'
import { StageRoute } from './StageRoute'

/**
 * UNA ETAPA EN UNA LÍNEA, y el descanso entre dos (E3, docs/visual.md §17.21; desde el PR 21a en la ficha de
 * la carrera, y desde el 21e también en el desglose del índice, que antes pintaba la suya con el tipo en
 * solo el color de su punto). Se pinta dentro de un contenedor `flex flex-wrap items-center gap-x-2
 * text-meta`, que pone quien la usa: un `div` en las pestañas de la ficha, un `li` en el índice.
 */

/**
 * El punto del tipo de etapa, junto a su palabra, que es la que lo dice (desde el PR 21a, con tokens): la
 * llana en `good`, la media en `warn`, la reina en `bad`, la crono en `accent` y la clásica en `gold`.
 */
const KIND_DOT: Record<string, string> = {
  llana: 'bg-good',
  media: 'bg-warn',
  reina: 'bg-bad',
  cri: 'bg-accent',
  clasica: 'bg-gold',
}

/** Recorrido de una etapa en una línea: tipo, salida → meta y kilómetros. */
export function StageLine({ stage, oneDay }: { stage: CalendarStageSummary; oneDay: boolean }) {
  return (
    <>
      {/* redondo con el radio del tema, que en 8 px es un círculo: `rounded-full` es solo de `Chip` (D-07) */}
      <span
        className={`inline-block h-2 w-2 shrink-0 rounded-ui ${KIND_DOT[stage.kind] ?? 'bg-line-strong'}`}
        aria-hidden
      />
      {/*
        En una carrera de un día no hay «Stage 1» que numerar: la etapa ES la carrera, y su nombre
        del calendario («Stage 1 · Classic») no dice nada que no diga ya la ficha de arriba. Se deja
        solo la etiqueta.
      */}
      <span className="font-semibold text-ink">
        {oneDay ? stage.label : `Stage ${stage.index}`}
      </span>
      {/*
        La ETIQUETA del calendario, no el tipo. Son dos vocabularios para lo mismo —«Summit finish»
        contra «Mountain», «Uphill finish» contra «Hilly»— y el del calendario es el preciso: sabe
        distinguir la reina que muere arriba de la que baja a meta. El tipo sigue mandando en el
        color del punto, que es para lo que sirve. A todo ancho desde la revisión del 21a: en el
        teléfono iba en `hidden`, y el tipo lo decía solo el color del punto (D-13); la línea parte.
      */}
      {!oneDay && <span className="text-caption text-ink-3">{stage.label}</span>}
      <StageRoute from={stage.from} to={stage.to} className="min-w-0 text-ink-2" />
      {stage.timeTrial && <span className="text-caption font-semibold text-accent">ITT</span>}
      <span className="ml-auto shrink-0 tabular-nums text-ink-3">{stage.km} km</span>
    </>
  )
}

/** El día de descanso tras una etapa (grandes vueltas y alguna vuelta por etapas), entre dos filetes. */
export function RestDay() {
  return (
    <li className="flex items-center gap-2 py-1 text-caption font-semibold uppercase tracking-caps text-ink-3">
      <span className="h-px flex-1 bg-line" />
      Rest day
      <span className="h-px flex-1 bg-line" />
    </li>
  )
}
