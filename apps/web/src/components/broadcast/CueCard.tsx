import type { CueClass } from '@cyclingstar/shared'
import type { CueText } from '../../domain/broadcast/screen'

/** El rótulo que está en pantalla: su texto, fijado al salir, y su clase. */
export interface ShownCueCard {
  readonly text: CueText
  readonly cls: CueClass
  /** cambia con cada rótulo que sale, aunque el texto se repita */
  readonly seq: number
}

/**
 * EL PLANO (docs/retransmision.md §6.1 y §6.5; D-21, D-57). El rótulo del momento, uno a la vez, el
 * que la cola del reproductor tiene en pantalla (`CueDeck`, `player.ts`): la palabra de arriba en
 * mayúsculas (`ATTACK`, `CRASH`, `KOM`) y lo que la sigue. Su texto se fija cuando sale, con el
 * instante de ese momento, para que no cambie mientras se lee.
 *
 * La región está siempre, vacía entre rótulo y rótulo, y es `aria-live="polite"` (D-57, §18.8): un
 * lector de pantalla dice cada rótulo al salir sin cortar lo que estaba diciendo. Ocupa su sitio
 * aunque esté vacía (72 px en el teléfono, §6.1), para que la voz no salte de sitio con cada rótulo.
 * La clase pinta el fondo: la 3 (la meta, la caza, el corte) de rojo; la 2, de oscuro; el resto, más
 * claro.
 */
export function CueCard({ cue }: { cue: ShownCueCard | null }) {
  const tone =
    cue === null
      ? ''
      : cue.cls >= 3
        ? 'bg-red-700 text-white'
        : cue.cls === 2
          ? 'bg-slate-900 text-white'
          : 'bg-slate-700 text-white'
  return (
    <div aria-live="polite" aria-atomic="true" className="min-h-[72px]" data-cue-card="">
      {cue !== null && (
        <div key={cue.seq} data-cue-class={cue.cls} className={`rounded-2xl px-3 py-2 ${tone}`}>
          <p className="text-xs font-bold uppercase tracking-wide">{cue.text.title}</p>
          {cue.text.detail !== null && <p className="text-sm">{cue.text.detail}</p>}
        </div>
      )}
    </div>
  )
}
