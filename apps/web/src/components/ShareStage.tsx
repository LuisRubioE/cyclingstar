import { useState } from 'react'
import { Button } from './ui/Button'

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
 *
 * Desde el PR 20 (E3, docs/visual.md §14.2): con el catálogo. En la cabeza de la etapa, `Share to watch` es
 * el icono `share` de 44 junto al `h1` (`ShareStageIcon`); `Share the report` pasa a la pestaña `Report`,
 * que es donde está lo que comparte. Donde no hay cabeza (el acta y la carrera de un día), los dos con su
 * texto (`ShareStage`).
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

/** Compartir los enlaces de una etapa, y lo que pasó la última vez. */
function useShare(raceId: string, day: number) {
  const [state, setState] = useState<Shared>('idle')
  const link = (path: string): string =>
    `${typeof window === 'undefined' ? '' : window.location.origin}/world/races/${raceId}/stages/${day}${path}`
  return {
    state,
    watch: () => void shareUrl(link(''), `Stage ${day}`).then(setState),
    report: () => void shareUrl(link('/report'), `Stage ${day} report`).then(setState),
  }
}

/** `Link copied` o `Could not copy the link`, que se anuncia; nada si se compartió. */
function SharedNote({ state }: { state: Shared }) {
  if (state === 'idle') return null
  return (
    <span role="status" className="text-caption text-ink-2">
      {state === 'copied' ? 'Link copied' : 'Could not copy the link'}
    </span>
  )
}

/** `Share to watch` en la cabeza de la etapa: el icono `share`, de 44, con su texto en `ariaLabel`. */
export function ShareStageIcon({ raceId, day }: { raceId: string; day: number }) {
  const share = useShare(raceId, day)
  return (
    <span className="inline-flex shrink-0 flex-col items-end">
      <Button variant="quiet" icon="share" ariaLabel="Share to watch" onClick={share.watch} />
      <SharedNote state={share.state} />
    </span>
  )
}

export function ShareStage({
  raceId,
  day,
  report,
  watch = true,
}: {
  raceId: string
  day: number
  /** quien mira conoce la etapa: puede compartir el acta */
  report: boolean
  /** `Share to watch`; sin él, solo el acta (la pestaña `Report`, cuya cabeza ya lo lleva) */
  watch?: boolean
}) {
  const share = useShare(raceId, day)
  return (
    <div className="flex flex-wrap items-center gap-2">
      {watch && (
        <Button variant="quiet" icon="share" onClick={share.watch}>
          Share to watch
        </Button>
      )}
      {report && (
        <Button variant="quiet" icon="share" onClick={share.report}>
          Share the report
        </Button>
      )}
      <SharedNote state={share.state} />
    </div>
  )
}
