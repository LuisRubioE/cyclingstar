import { useState } from 'react'

/**
 * COMPARTIR UNA ETAPA (E2, docs/retransmision.md §11.10; D-36, DD-12; paso 9a). Dos botones que no son
 * lo mismo:
 *
 * - `Share to watch`, siempre: la página de la etapa, que abre en `Watch` a quien no la ha visto. No
 *   contiene nada, y su vista previa tampoco (`Stage 8 · Race France · Watch the race`, §14.10).
 * - `Share the report`, solo a quien la conoce (el botón no existe antes, así que compartir nunca obliga a
 *   revelar): el acta pública de `/report`. Su vista previa lleva el ganador, marcado `Spoiler` (DD-12).
 *
 * Los dos sin `diag` (§11.15). Con `navigator.share` donde lo hay (el móvil); si no, el enlace se copia.
 */

type Shared = 'idle' | 'copied' | 'failed'

/** Comparte o copia; nunca lanza. */
async function shareUrl(url: string, title: string): Promise<Shared> {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ url, title })
      return 'idle'
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard !== undefined) {
      await navigator.clipboard.writeText(url)
      return 'copied'
    }
  } catch {
    // cancelado o sin permiso: nada que decir más allá de que no se copió
  }
  return 'failed'
}

export function ShareStage({
  raceId,
  day,
  report,
}: {
  raceId: string
  day: number
  /** quien mira conoce la etapa: puede compartir el acta */
  report: boolean
}) {
  const [state, setState] = useState<Shared>('idle')
  const link = (path: string): string =>
    `${typeof window === 'undefined' ? '' : window.location.origin}/world/races/${raceId}/stages/${day}${path}`
  const button =
    'rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200'
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={button}
        onClick={() => void shareUrl(link(''), `Stage ${day}`).then(setState)}
      >
        Share to watch
      </button>
      {report && (
        <button
          type="button"
          className={button}
          onClick={() => void shareUrl(link('/report'), `Stage ${day} report`).then(setState)}
        >
          Share the report
        </button>
      )}
      {state === 'copied' && <span className="text-xs text-slate-500">Link copied</span>}
      {state === 'failed' && (
        <span className="text-xs text-slate-500">Could not copy the link</span>
      )}
    </div>
  )
}
